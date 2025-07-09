import { jest } from "@jest/globals";

// Mock axios as a function with methods
const mockAxios = jest.fn();
mockAxios.get = jest.fn();
mockAxios.post = jest.fn();
mockAxios.patch = jest.fn();
mockAxios.put = jest.fn();
mockAxios.delete = jest.fn();

// Mock file system
const mockExists = jest.fn();
const mockCreateReadStream = jest.fn();

// Mock FormData
const mockFormData = {
	append: jest.fn(),
	getHeaders: jest.fn(() => ({ "content-type": "multipart/form-data" })),
};

const MockFormDataClass = jest.fn(() => mockFormData);

// Mock error handler
const mockHandleError = jest.fn();

// Mock verbose logger
const mockLogApi = jest.fn();

jest.mock("axios", () => mockAxios);
jest.mock("form-data", () => MockFormDataClass);
jest.mock("fs", () => ({
	existsSync: mockExists,
	createReadStream: mockCreateReadStream,
}));
jest.mock("../helper/error.js", () => ({
	handleError: mockHandleError,
}));
jest.mock("../helper/verbose.js", () => ({
	logApi: mockLogApi,
}));

// Import the module after mocking
let integrationApi;

describe("Integration API", () => {
	let consoleSpy;
	let consoleErrorSpy;
	let processExitSpy;

	beforeAll(async () => {
		integrationApi = await import("../api/integration.js");
	});

	beforeEach(() => {
		jest.clearAllMocks();
		consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
		consoleErrorSpy = jest
			.spyOn(console, "error")
			.mockImplementation(() => {});
		processExitSpy = jest
			.spyOn(process, "exit")
			.mockImplementation(() => {});

		// Default successful response
		const defaultResponse = {
			data: { data: { id: 1, name: "test" } },
			status: 200,
		};

		// Set axios mock as the main function call
		mockAxios.mockResolvedValue(defaultResponse);
		mockAxios.post.mockResolvedValue(defaultResponse);
	});

	afterEach(() => {
		consoleSpy.mockRestore();
		consoleErrorSpy.mockRestore();
		processExitSpy.mockRestore();
	});

	describe("getIntegrationGroups", () => {
		const validParams = {
			apiUrl: "https://api.test.com",
			accountId: "account123",
			token: "token123",
			session: "session123",
		};

		it("should fetch integration groups successfully", async () => {
			const mockResponse = {
				data: { data: [{ id: 1, name: "Group 1" }] },
				status: 200,
			};
			mockAxios.mockResolvedValue(mockResponse);

			const result = await integrationApi.getIntegrationGroups(
				validParams.apiUrl,
				validParams.accountId,
				validParams.token,
				validParams.session
			);

			expect(mockAxios).toHaveBeenCalledWith({
				method: "get",
				url: "https://api.test.com/service/panel/temporal/v1.0/account123/integration-groups",
				params: { page: 1, per_page: 999 },
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer token123",
					Cookie: "session123",
				},
			});
			expect(mockLogApi).toHaveBeenCalledWith(
				"get",
				expect.any(String),
				200
			);
			expect(result).toEqual([{ id: 1, name: "Group 1" }]);
		});

		it("should handle missing token", async () => {
			await integrationApi.getIntegrationGroups(
				validParams.apiUrl,
				validParams.accountId,
				null,
				validParams.session
			);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"\x1b[31mError:\x1b[0m Authentication credentials are required."
			);
			expect(processExitSpy).toHaveBeenCalledWith(1);
		});

		it("should handle missing session", async () => {
			await integrationApi.getIntegrationGroups(
				validParams.apiUrl,
				validParams.accountId,
				validParams.token,
				null
			);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"\x1b[31mError:\x1b[0m Authentication credentials are required."
			);
			expect(processExitSpy).toHaveBeenCalledWith(1);
		});

		it("should handle missing accountId", async () => {
			await integrationApi.getIntegrationGroups(
				validParams.apiUrl,
				null,
				validParams.token,
				validParams.session
			);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"\x1b[31mError:\x1b[0m Authentication credentials are required."
			);
			expect(processExitSpy).toHaveBeenCalledWith(1);
		});

		it("should handle API error", async () => {
			const error = new Error("API Error");
			mockAxios.mockRejectedValue(error);

			await integrationApi.getIntegrationGroups(
				validParams.apiUrl,
				validParams.accountId,
				validParams.token,
				validParams.session
			);

			expect(mockHandleError).toHaveBeenCalledWith(error);
		});
	});

	describe("listAllIntegrations", () => {
		const validParams = {
			apiUrl: "https://api.test.com",
			token: "token123",
			accountId: "account123",
			session: "session123",
		};

		it("should fetch all integrations successfully", async () => {
			const mockResponse = {
				data: { data: [{ id: 1, name: "Integration 1" }] },
				status: 200,
			};
			mockAxios.mockResolvedValue(mockResponse);

			const result = await integrationApi.listAllIntegrations(
				validParams.apiUrl,
				validParams.token,
				validParams.accountId,
				validParams.session
			);

			expect(mockAxios).toHaveBeenCalledWith({
				method: "get",
				url: "https://api.test.com/service/panel/temporal/v1.0/account123/integrations",
				params: { page: 1, per_page: 999 },
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer token123",
					Cookie: "session123",
				},
			});
			expect(result).toEqual([{ id: 1, name: "Integration 1" }]);
		});

		it("should handle authentication errors", async () => {
			await integrationApi.listAllIntegrations(
				validParams.apiUrl,
				null,
				validParams.accountId,
				validParams.session
			);

			expect(processExitSpy).toHaveBeenCalledWith(1);
		});
	});

	describe("saveIntegration", () => {
		const validParams = {
			apiUrl: "https://api.test.com",
			token: "token123",
			accountId: "account123",
			session: "session123",
			integration: { name: "Test Integration" },
		};

		it("should save integration successfully", async () => {
			const mockResponse = {
				data: { data: { id: 1, name: "Test Integration" } },
			};
			mockAxios.mockResolvedValue(mockResponse);

			const result = await integrationApi.saveIntegration(
				validParams.apiUrl,
				validParams.token,
				validParams.accountId,
				validParams.session,
				validParams.integration
			);

			expect(mockAxios).toHaveBeenCalledWith({
				method: "post",
				url: "https://api.test.com/service/panel/temporal/v1.0/account123/integrations",
				data: validParams.integration,
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer token123",
					Cookie: "session123",
				},
			});
			expect(result).toEqual({ id: 1, name: "Test Integration" });
		});

		it("should handle missing credentials", async () => {
			await integrationApi.saveIntegration(
				validParams.apiUrl,
				null,
				validParams.accountId,
				validParams.session,
				validParams.integration
			);

			expect(processExitSpy).toHaveBeenCalledWith(1);
		});
	});

	describe("editIntegration", () => {
		const validParams = {
			apiUrl: "https://api.test.com",
			token: "token123",
			accountId: "account123",
			session: "session123",
			payload: { id: 1, name: "Updated Integration" },
		};

		it("should edit integration successfully", async () => {
			const mockResponse = {
				data: { data: { id: 1, name: "Updated Integration" } },
			};
			mockAxios.mockResolvedValue(mockResponse);

			const result = await integrationApi.editIntegration(
				validParams.apiUrl,
				validParams.token,
				validParams.accountId,
				validParams.session,
				validParams.payload
			);

			expect(mockAxios).toHaveBeenCalledWith({
				method: "post",
				url: "https://api.test.com/service/panel/temporal/v1.0/account123/integrations/1/edit",
				data: validParams.payload,
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer token123",
					Cookie: "session123",
				},
			});
			expect(result).toEqual({ id: 1, name: "Updated Integration" });
		});

		it("should handle authentication errors", async () => {
			await integrationApi.editIntegration(
				validParams.apiUrl,
				null,
				validParams.accountId,
				validParams.session,
				validParams.payload
			);

			expect(processExitSpy).toHaveBeenCalledWith(1);
		});
	});

	describe("updateIntegration", () => {
		const validParams = {
			apiUrl: "https://api.test.com",
			token: "token123",
			accountId: "account123",
			session: "session123",
			integration: {
				id: 1,
				name: "Updated Integration",
				description: "Test",
			},
		};

		it("should update integration successfully", async () => {
			const mockResponse = {
				data: { data: { id: 1, name: "Updated Integration" } },
			};
			mockAxios.mockResolvedValue(mockResponse);

			const result = await integrationApi.updateIntegration(
				validParams.apiUrl,
				validParams.token,
				validParams.accountId,
				validParams.session,
				validParams.integration
			);

			expect(mockAxios).toHaveBeenCalledWith({
				method: "patch",
				url: "https://api.test.com/service/panel/temporal/v1.0/account123/integrations/1",
				data: { name: "Updated Integration", description: "Test" }, // id should be excluded
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer token123",
					Cookie: "session123",
				},
			});
			expect(result).toEqual({ id: 1, name: "Updated Integration" });
		});

		it("should handle missing credentials", async () => {
			await integrationApi.updateIntegration(
				validParams.apiUrl,
				null,
				validParams.accountId,
				validParams.session,
				validParams.integration
			);

			expect(processExitSpy).toHaveBeenCalledWith(1);
		});
	});

	describe("getIntegrationById", () => {
		const validParams = {
			apiUrl: "https://api.test.com",
			token: "token123",
			accountId: "account123",
			session: "session123",
			integrationId: 1,
		};

		it("should fetch integration by ID successfully", async () => {
			const mockResponse = {
				data: { data: { id: 1, name: "Test Integration" } },
			};
			mockAxios.mockResolvedValue(mockResponse);

			const result = await integrationApi.getIntegrationById(
				validParams.apiUrl,
				validParams.token,
				validParams.accountId,
				validParams.session,
				validParams.integrationId
			);

			expect(mockAxios).toHaveBeenCalledWith({
				method: "get",
				url: "https://api.test.com/service/panel/temporal/v1.0/account123/integrations/1",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer token123",
					Cookie: "session123",
				},
			});
			expect(result).toEqual({ id: 1, name: "Test Integration" });
		});

		it("should handle authentication errors", async () => {
			await integrationApi.getIntegrationById(
				validParams.apiUrl,
				null,
				validParams.accountId,
				validParams.session,
				validParams.integrationId
			);

			expect(processExitSpy).toHaveBeenCalledWith(1);
		});
	});

	describe("syncIntegration", () => {
		const validParams = {
			apiUrl: "https://api.test.com",
			token: "token123",
			accountId: "account123",
			session: "session123",
			integration: { integration_id: 1, schemas: {} },
		};

		it("should sync integration successfully", async () => {
			const mockResponse = {
				data: { data: { success: true } },
			};
			mockAxios.mockResolvedValue(mockResponse);

			const result = await integrationApi.syncIntegration(
				validParams.apiUrl,
				validParams.token,
				validParams.accountId,
				validParams.session,
				validParams.integration
			);

			expect(mockAxios).toHaveBeenCalledWith({
				method: "post",
				url: "https://api.test.com/service/panel/temporal/v1.0/account123/integrations/1/deploy",
				data: validParams.integration,
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer token123",
					Cookie: "session123",
				},
			});
			expect(result).toEqual({ success: true });
		});

		it("should handle authentication errors", async () => {
			await integrationApi.syncIntegration(
				validParams.apiUrl,
				null,
				validParams.accountId,
				validParams.session,
				validParams.integration
			);

			expect(processExitSpy).toHaveBeenCalledWith(1);
		});
	});

	describe("sendIntegrationForReview", () => {
		const validParams = {
			apiUrl: "https://api.test.com",
			token: "token123",
			accountId: "account123",
			session: "session123",
			integration: { id: 1, name: "Test Integration" },
		};

		it("should send integration for review successfully", async () => {
			const mockResponse = {
				data: { data: { success: true } },
			};
			mockAxios.mockResolvedValue(mockResponse);

			const result = await integrationApi.sendIntegrationForReview(
				validParams.apiUrl,
				validParams.token,
				validParams.accountId,
				validParams.session,
				validParams.integration
			);

			expect(mockAxios).toHaveBeenCalledWith({
				method: "post",
				url: "https://api.test.com/service/panel/temporal/v1.0/account123/integration-reviews",
				data: validParams.integration,
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer token123",
					Cookie: "session123",
				},
			});
			expect(result).toEqual({ success: true });
		});

		it("should handle authentication errors", async () => {
			await integrationApi.sendIntegrationForReview(
				validParams.apiUrl,
				null,
				validParams.accountId,
				validParams.session,
				validParams.integration
			);

			expect(processExitSpy).toHaveBeenCalledWith(1);
		});
	});

	describe("purgeCache", () => {
		const validParams = {
			apiUrl: "https://api.test.com",
			token: "token123",
			accountId: "account123",
			session: "session123",
			integration: { integration_id: 1 },
		};

		it("should purge cache successfully", async () => {
			const mockResponse = {
				data: { success: true },
			};
			mockAxios.mockResolvedValue(mockResponse);

			const result = await integrationApi.purgeCache(
				validParams.apiUrl,
				validParams.token,
				validParams.accountId,
				validParams.session,
				validParams.integration
			);

			expect(mockAxios).toHaveBeenCalledWith({
				method: "post",
				url: "https://api.test.com/service/panel/temporal/v1.0/account123/integrations/1/cache",
				data: {},
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer token123",
					Cookie: "session123",
				},
			});
			expect(result).toEqual({ success: true });
		});

		it("should handle authentication errors", async () => {
			await integrationApi.purgeCache(
				validParams.apiUrl,
				null,
				validParams.accountId,
				validParams.session,
				validParams.integration
			);

			expect(processExitSpy).toHaveBeenCalledWith(1);
		});
	});

	describe("pullIntegration", () => {
		const validParams = {
			apiUrl: "https://api.test.com",
			token: "token123",
			accountId: "account123",
			session: "session123",
			id: 1,
		};

		it("should pull integration successfully", async () => {
			const mockResponse = {
				data: { data: { id: 1, name: "Test Integration" } },
			};
			mockAxios.mockResolvedValue(mockResponse);

			const result = await integrationApi.pullIntegration(
				validParams.apiUrl,
				validParams.token,
				validParams.accountId,
				validParams.session,
				validParams.id
			);

			expect(mockAxios).toHaveBeenCalledWith({
				method: "get",
				url: "https://api.test.com/service/panel/temporal/v1.0/account123/integrations/1/pull",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer token123",
					Cookie: "session123",
				},
			});
			expect(result).toEqual({ id: 1, name: "Test Integration" });
		});

		it("should handle authentication errors", async () => {
			await integrationApi.pullIntegration(
				validParams.apiUrl,
				null,
				validParams.accountId,
				validParams.session,
				validParams.id
			);

			expect(processExitSpy).toHaveBeenCalledWith(1);
		});
	});

	describe("uploadFileToCloud", () => {
		const validParams = {
			apiUrl: "https://api.test.com",
			token: "token123",
			accountId: "account123",
			session: "session123",
			filePath: "/path/to/file.svg",
		};

		beforeEach(() => {
			mockExists.mockReturnValue(true);
			mockCreateReadStream.mockReturnValue({});
		});

		it("should upload file successfully", async () => {
			const mockResponse = {
				data: { data: [{ url: "https://cdn.example.com/file.svg" }] },
			};
			mockAxios.post.mockResolvedValue(mockResponse);

			const result = await integrationApi.uploadFileToCloud(
				validParams.apiUrl,
				validParams.token,
				validParams.accountId,
				validParams.session,
				validParams.filePath
			);

			expect(mockExists).toHaveBeenCalledWith(validParams.filePath);
			expect(MockFormDataClass).toHaveBeenCalled();
			expect(mockFormData.append).toHaveBeenCalledWith("files", {});
			expect(mockAxios.post).toHaveBeenCalledWith(
				"https://api.test.com/service/panel/temporal/v1.0/account123/utility/upload",
				mockFormData,
				{
					headers: {
						"content-type": "multipart/form-data",
						Authorization: "Bearer token123",
						Cookie: "session123",
					},
				}
			);
			expect(result).toEqual({ url: "https://cdn.example.com/file.svg" });
		});

		it("should handle authentication errors", async () => {
			await integrationApi.uploadFileToCloud(
				validParams.apiUrl,
				null,
				validParams.accountId,
				validParams.session,
				validParams.filePath
			);

			expect(processExitSpy).toHaveBeenCalledWith(1);
		});

		it("should handle missing file", async () => {
			mockExists.mockReturnValue(false);

			await expect(
				integrationApi.uploadFileToCloud(
					validParams.apiUrl,
					validParams.token,
					validParams.accountId,
					validParams.session,
					validParams.filePath
				)
			).rejects.toThrow("File does not exist: /path/to/file.svg");
		});

		it("should handle upload error", async () => {
			const error = {
				response: { data: "Upload failed" },
				message: "Network error",
			};
			mockAxios.post.mockRejectedValue(error);

			try {
				await integrationApi.uploadFileToCloud(
					validParams.apiUrl,
					validParams.token,
					validParams.accountId,
					validParams.session,
					validParams.filePath
				);
			} catch {
				// Expected to throw
			}

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"❌ Upload failed:",
				"Upload failed"
			);
		});
	});

	describe("getAuthenticationByIntegrationId", () => {
		const validParams = {
			apiUrl: "https://api.test.com",
			token: "token123",
			accountId: "account123",
			session: "session123",
			integrationId: 1,
		};

		it("should fetch authentication by integration ID successfully", async () => {
			const mockResponse = {
				data: { data: { auth_type: "oauth2" } },
			};
			mockAxios.mockResolvedValue(mockResponse);

			const result =
				await integrationApi.getAuthenticationByIntegrationId(
					validParams.apiUrl,
					validParams.token,
					validParams.accountId,
					validParams.session,
					validParams.integrationId
				);

			expect(mockAxios).toHaveBeenCalledWith({
				method: "get",
				url: "https://api.test.com/service/panel/temporal/v1.0/account123integrations/1/authentication",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer token123",
					Cookie: "session123",
				},
			});
			expect(result).toEqual({ auth_type: "oauth2" });
		});

		it("should handle authentication errors", async () => {
			await integrationApi.getAuthenticationByIntegrationId(
				validParams.apiUrl,
				null,
				validParams.accountId,
				validParams.session,
				validParams.integrationId
			);

			expect(processExitSpy).toHaveBeenCalledWith(1);
		});
	});

	describe("getWebhooksByIntegrationId", () => {
		const validParams = {
			apiUrl: "https://api.test.com",
			token: "token123",
			accountId: "account123",
			session: "session123",
			integrationId: 1,
		};

		it("should fetch webhooks by integration ID successfully", async () => {
			const mockResponse = {
				data: { data: [{ id: 1, url: "https://webhook.example.com" }] },
			};
			mockAxios.mockResolvedValue(mockResponse);

			const result = await integrationApi.getWebhooksByIntegrationId(
				validParams.apiUrl,
				validParams.token,
				validParams.accountId,
				validParams.session,
				validParams.integrationId
			);

			expect(mockAxios).toHaveBeenCalledWith({
				method: "get",
				url: "https://api.test.com/service/panel/temporal/v1.0/account123integrations/1/webhooks",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer token123",
					Cookie: "session123",
				},
			});
			expect(result).toEqual([
				{ id: 1, url: "https://webhook.example.com" },
			]);
		});

		it("should handle authentication errors", async () => {
			await integrationApi.getWebhooksByIntegrationId(
				validParams.apiUrl,
				null,
				validParams.accountId,
				validParams.session,
				validParams.integrationId
			);

			expect(processExitSpy).toHaveBeenCalledWith(1);
		});
	});

	describe("getConfigurationByIntegrationId", () => {
		const validParams = {
			apiUrl: "https://api.test.com",
			token: "token123",
			session: "session123",
			accountId: "account123",
			integrationId: 1,
		};

		it("should fetch configuration by integration ID successfully", async () => {
			const mockResponse = {
				data: { data: { config: "value" } },
			};
			mockAxios.mockResolvedValue(mockResponse);

			const result = await integrationApi.getConfigurationByIntegrationId(
				validParams.apiUrl,
				validParams.token,
				validParams.session,
				validParams.accountId,
				validParams.integrationId
			);

			expect(mockAxios).toHaveBeenCalledWith({
				method: "get",
				url: "https://api.test.com/service/panel/temporal/v1.0/account123integrations/1/configuration",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer token123",
					Cookie: "session123",
				},
			});
			expect(result).toEqual({ config: "value" });
		});

		it("should handle authentication errors", async () => {
			await integrationApi.getConfigurationByIntegrationId(
				validParams.apiUrl,
				null,
				validParams.session,
				validParams.accountId,
				validParams.integrationId
			);

			expect(processExitSpy).toHaveBeenCalledWith(1);
		});
	});
});
