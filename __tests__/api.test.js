import { jest } from "@jest/globals";

// Mock dependencies
const mockHandleError = jest.fn();
const mockLogApi = jest.fn();
const mockAxios = jest.fn();

jest.mock("../helper/error.js", () => ({
	handleError: mockHandleError,
}));

jest.mock("../helper/verbose.js", () => ({
	logApi: mockLogApi,
}));

jest.mock("../config/environments.js", () => ({
	environments: {
		bolt: { name: "bolt", apiUrl: "test-api" },
		test: { name: "test", apiUrl: "test-api" },
	},
}));

jest.mock("axios", () => mockAxios);
jest.mock("form-data");
jest.mock("fs");

describe("API Tests", () => {
	let environmentAPI;
	let integrationAPI;
	let loginAPI;
	let mockExit;

	beforeAll(async () => {
		environmentAPI = await import("../api/environment.js");
		integrationAPI = await import("../api/integration.js");
		loginAPI = await import("../api/login.js");
	});

	beforeEach(() => {
		jest.clearAllMocks();
		mockExit = jest.spyOn(process, "exit").mockImplementation(() => {});
		console.error = jest.fn();
		console.log = jest.fn();

		// Reset axios mock
		mockAxios.mockReset();
	});

	afterEach(() => {
		mockExit.mockRestore();
	});

	describe("Environment API", () => {
		it("should get environments", () => {
			const result = environmentAPI.getEnvironments();
			expect(result).toBeDefined();
			expect(typeof result).toBe("object");
		});

		it("should set environment", async () => {
			const result = await environmentAPI.setEnvironment("bolt");
			expect(result).toBeDefined();
		});

		it("should get environment with config data", async () => {
			const result = await environmentAPI.getEnvironment({
				environment: "test",
			});
			expect(result).toBe("test");
		});

		it("should get default environment", async () => {
			const result = await environmentAPI.getEnvironment({});
			expect(result).toBe("bolt");
		});

		it("should handle null config data", async () => {
			const result = await environmentAPI.getEnvironment(null);
			expect(result).toBe("bolt");
		});

		// Tests to cover error handling lines 8, 16, 24
		it("should handle errors in getEnvironments", () => {
			// Mock the environments import to throw an error
			const originalLog = console.log;
			const originalError = console.error;
			console.log = jest.fn();
			console.error = jest.fn();

			// Temporarily replace the environments object with a getter that throws
			const environmentsModule = require("../config/environments.js");
			const originalEnvironments = environmentsModule.environments;

			Object.defineProperty(environmentsModule, "environments", {
				get() {
					throw new Error("Config error");
				},
				configurable: true,
			});

			// This should trigger the catch block on line 8
			const result = environmentAPI.getEnvironments();

			// Verify handleError was called
			expect(mockHandleError).toHaveBeenCalledWith(expect.any(Error));

			// Restore
			Object.defineProperty(environmentsModule, "environments", {
				value: originalEnvironments,
				configurable: true,
			});
			console.log = originalLog;
			console.error = originalError;
		});

		it("should handle errors in setEnvironment", async () => {
			// Mock the environments object to throw when accessed
			const environmentsModule = require("../config/environments.js");
			const originalEnvironments = environmentsModule.environments;

			Object.defineProperty(environmentsModule, "environments", {
				get() {
					throw new Error("Environment access error");
				},
				configurable: true,
			});

			// This should trigger the catch block on line 16
			const result = await environmentAPI.setEnvironment("invalid");

			// Verify handleError was called
			expect(mockHandleError).toHaveBeenCalledWith(expect.any(Error));

			// Restore
			Object.defineProperty(environmentsModule, "environments", {
				value: originalEnvironments,
				configurable: true,
			});
		});

		it("should handle errors in getEnvironment", async () => {
			// Create a proxy that throws when accessing the environment property
			const mockConfigData = new Proxy(
				{},
				{
					get(target, prop) {
						if (prop === "environment") {
							throw new Error("Config data access error");
						}
						return target[prop];
					},
				}
			);

			// This should trigger the catch block on line 24
			const result = await environmentAPI.getEnvironment(mockConfigData);

			// Verify handleError was called
			expect(mockHandleError).toHaveBeenCalledWith(expect.any(Error));
		});
	});

	describe("Integration API", () => {
		const mockCredentials = {
			apiUrl: "https://api.test.com",
			token: "test-token",
			accountId: "test-account",
			session: "test-session",
		};

		it("should handle missing credentials in getIntegrationGroups", async () => {
			// This covers lines 8-15 - authentication check
			await integrationAPI.getIntegrationGroups("url", null, null, null);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining(
					"Authentication credentials are required"
				)
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should successfully get integration groups", async () => {
			// This covers lines 16-36 - successful API call
			const mockResponse = {
				data: { data: [{ id: 1, name: "test-group" }] },
				status: 200,
			};

			mockAxios.mockResolvedValue(mockResponse);

			const result = await integrationAPI.getIntegrationGroups(
				mockCredentials.apiUrl,
				mockCredentials.accountId,
				mockCredentials.token,
				mockCredentials.session
			);

			expect(mockAxios).toHaveBeenCalledWith(
				expect.objectContaining({
					method: "get",
					url: expect.stringContaining("/integration-groups"),
					headers: expect.objectContaining({
						Authorization: `Bearer ${mockCredentials.token}`,
						Cookie: mockCredentials.session,
					}),
				})
			);
			expect(mockLogApi).toHaveBeenCalledWith(
				"get",
				expect.stringContaining("/integration-groups"),
				200
			);
			expect(result).toEqual(mockResponse.data.data);
		});

		it("should handle API errors in getIntegrationGroups", async () => {
			// This covers line 35 - error handling
			const error = new Error("API Error");
			mockAxios.mockRejectedValue(error);

			await integrationAPI.getIntegrationGroups(
				mockCredentials.apiUrl,
				mockCredentials.accountId,
				mockCredentials.token,
				mockCredentials.session
			);

			expect(mockHandleError).toHaveBeenCalledWith(error);
		});

		it("should handle missing credentials in listAllIntegrations", async () => {
			// This covers lines 40-47 - authentication check
			await integrationAPI.listAllIntegrations("url", null, null, null);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining(
					"Authentication credentials are required"
				)
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});
	});

	describe("Login API", () => {
		const mockCredentials = {
			consoleUrl: "https://console.test.com",
			apiUrl: "https://api.test.com",
			token: "test-token",
			orgId: "test-org",
			accountId: "test-account",
			session: "test-session",
			requestCode: "test-code",
		};

		it("should successfully get product accounts", async () => {
			// This covers lines 5-16 - successful API call
			const mockResponse = {
				data: [{ id: 1, name: "test-account" }],
				status: 200,
			};

			mockAxios.mockResolvedValue(mockResponse);

			const result = await loginAPI.getProductAccounts(
				mockCredentials.consoleUrl,
				mockCredentials.token,
				mockCredentials.orgId
			);

			expect(mockAxios).toHaveBeenCalledWith(
				expect.objectContaining({
					method: "get",
					url: expect.stringContaining("/productAccounts"),
					headers: expect.objectContaining({
						Cookie: `fc.session=${mockCredentials.token}`,
					}),
				})
			);
			expect(result).toEqual(mockResponse);
		});

		it("should handle errors in getProductAccounts", async () => {
			// This covers line 15 - error handling
			const error = new Error("API Error");
			mockAxios.mockRejectedValue(error);

			await loginAPI.getProductAccounts(
				mockCredentials.consoleUrl,
				mockCredentials.token,
				mockCredentials.orgId
			);

			expect(mockHandleError).toHaveBeenCalledWith(error);
		});

		it("should successfully get CLI session", async () => {
			// This covers lines 20-31 - successful API call
			const mockResponse = {
				data: { session: "test-session" },
				status: 200,
			};

			mockAxios.mockResolvedValue(mockResponse);

			const result = await loginAPI.getCliSession(
				mockCredentials.apiUrl,
				mockCredentials.requestCode
			);

			expect(mockAxios).toHaveBeenCalledWith(
				expect.objectContaining({
					method: "get",
					url: expect.stringContaining("/authentication/cli/"),
					headers: expect.objectContaining({
						"Content-Type": "application/json",
					}),
				})
			);
			expect(result).toEqual(mockResponse);
		});

		it("should handle errors in getCliSession", async () => {
			// This covers line 30 - error handling
			const error = new Error("API Error");
			mockAxios.mockRejectedValue(error);

			await loginAPI.getCliSession(
				mockCredentials.apiUrl,
				mockCredentials.requestCode
			);

			expect(mockHandleError).toHaveBeenCalledWith(error);
		});

		it("should successfully get CLI bearer token", async () => {
			// This covers lines 35-47 - successful API call
			const mockResponse = {
				data: { token: "bearer-token" },
				status: 200,
			};

			mockAxios.mockResolvedValue(mockResponse);

			const result = await loginAPI.getCliBearerToken(
				"test-app",
				mockCredentials.apiUrl,
				mockCredentials.accountId,
				mockCredentials.session
			);

			expect(mockAxios).toHaveBeenCalledWith(
				expect.objectContaining({
					method: "get",
					url: expect.stringContaining("/token/"),
					headers: expect.objectContaining({
						"Content-Type": "application/json",
						Cookie: `test-app.session=${mockCredentials.session}`,
					}),
				})
			);
			expect(result).toEqual(mockResponse);
		});

		it("should handle errors in getCliBearerToken", async () => {
			// This covers line 46 - error handling
			const error = new Error("API Error");
			mockAxios.mockRejectedValue(error);

			await loginAPI.getCliBearerToken(
				"test-app",
				mockCredentials.apiUrl,
				mockCredentials.accountId,
				mockCredentials.session
			);

			expect(mockHandleError).toHaveBeenCalledWith(error);
		});
	});
});
