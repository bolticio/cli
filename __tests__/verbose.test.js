import { jest } from "@jest/globals";

// Mock chalk before importing verbose
jest.unstable_mockModule("chalk", () => {
	const createChalk = (str) => str;
	createChalk.red = (str) => str;
	createChalk.cyan = (str) => str;
	createChalk.green = (str) => str;
	createChalk.yellow = (str) => str;
	createChalk.white = (str) => str;
	createChalk.dim = (str) => str;
	createChalk.gray = (str) => str;
	return { default: createChalk };
});

describe("Verbose Helper Functions", () => {
	let mockConsoleLog;
	let setVerboseMode;
	let getVerboseMode;
	let logApi;
	let logApiRequest;
	let logApiResponse;

	beforeAll(async () => {
		const verboseModule = await import("../helper/verbose.js");
		setVerboseMode = verboseModule.setVerboseMode;
		getVerboseMode = verboseModule.getVerboseMode;
		logApi = verboseModule.logApi;
		logApiRequest = verboseModule.logApiRequest;
		logApiResponse = verboseModule.logApiResponse;
	});

	beforeEach(() => {
		mockConsoleLog = jest
			.spyOn(console, "log")
			.mockImplementation(() => {});
		// Reset verbose mode before each test
		setVerboseMode(false);
	});

	afterEach(() => {
		mockConsoleLog.mockRestore();
		jest.clearAllMocks();
	});

	describe("setVerboseMode and getVerboseMode", () => {
		it("should set verbose mode to true", () => {
			setVerboseMode(true);
			expect(getVerboseMode()).toBe(true);
		});

		it("should set verbose mode to false", () => {
			setVerboseMode(true);
			setVerboseMode(false);
			expect(getVerboseMode()).toBe(false);
		});

		it("should default to false", () => {
			setVerboseMode(false);
			expect(getVerboseMode()).toBe(false);
		});
	});

	describe("logApi", () => {
		it("should not log when verbose mode is off", () => {
			setVerboseMode(false);
			logApi("GET", "https://api.example.com", 200);
			expect(mockConsoleLog).not.toHaveBeenCalled();
		});

		it("should log when verbose mode is on", () => {
			setVerboseMode(true);
			logApi("GET", "https://api.example.com", 200);
			expect(mockConsoleLog).toHaveBeenCalled();
		});

		it("should log method, url and status", () => {
			setVerboseMode(true);
			logApi("post", "https://api.example.com/test", 201);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("POST")
			);
		});
	});

	describe("logApiRequest", () => {
		it("should not log when verbose mode is off", () => {
			setVerboseMode(false);
			logApiRequest("GET", "https://api.example.com");
			expect(mockConsoleLog).not.toHaveBeenCalled();
		});

		it("should log request details when verbose mode is on", () => {
			setVerboseMode(true);
			logApiRequest("GET", "https://api.example.com");
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("REQUEST")
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Method:")
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("URL:")
			);
		});

		it("should log method in uppercase", () => {
			setVerboseMode(true);
			logApiRequest("post", "https://api.example.com");
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("POST")
			);
		});

		it("should log payload when provided", () => {
			setVerboseMode(true);
			const payload = { name: "test", value: 123 };
			logApiRequest("POST", "https://api.example.com", payload);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Payload:")
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("test")
			);
		});

		it("should handle complex payload with nested objects", () => {
			setVerboseMode(true);
			const payload = {
				name: "test",
				nested: {
					key: "value",
					array: [1, 2, 3],
				},
			};
			logApiRequest("POST", "https://api.example.com", payload);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Payload:")
			);
		});

		it("should not log payload section when payload is null", () => {
			setVerboseMode(true);
			mockConsoleLog.mockClear();
			logApiRequest("GET", "https://api.example.com", null);

			const calls = mockConsoleLog.mock.calls.map((c) => c[0]);
			const hasPayload = calls.some(
				(call) => typeof call === "string" && call.includes("Payload:")
			);
			expect(hasPayload).toBe(false);
		});
	});

	describe("logApiResponse", () => {
		it("should not log when verbose mode is off", () => {
			setVerboseMode(false);
			logApiResponse(200, { success: true });
			expect(mockConsoleLog).not.toHaveBeenCalled();
		});

		it("should log response details when verbose mode is on", () => {
			setVerboseMode(true);
			logApiResponse(200, { success: true });
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("RESPONSE")
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Status:")
			);
		});

		it("should log success status codes (2xx)", () => {
			setVerboseMode(true);
			logApiResponse(200, { data: "test" });
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("200")
			);
		});

		it("should log error status codes (4xx/5xx)", () => {
			setVerboseMode(true);
			logApiResponse(404, { error: "Not found" });
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("404")
			);
		});

		it("should log 500 error status", () => {
			setVerboseMode(true);
			logApiResponse(500, { error: "Server error" });
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("500")
			);
		});

		it("should log data when provided", () => {
			setVerboseMode(true);
			const data = { id: 1, name: "test" };
			logApiResponse(200, data);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Data:")
			);
		});

		it("should handle complex response data", () => {
			setVerboseMode(true);
			const data = {
				items: [
					{ id: 1, name: "item1" },
					{ id: 2, name: "item2" },
				],
				meta: {
					total: 2,
					page: 1,
				},
			};
			logApiResponse(200, data);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Data:")
			);
		});

		it("should not log data section when data is null", () => {
			setVerboseMode(true);
			mockConsoleLog.mockClear();
			logApiResponse(204, null);

			const calls = mockConsoleLog.mock.calls.map((c) => c[0]);
			const hasData = calls.some(
				(call) => typeof call === "string" && call.includes("Data:")
			);
			expect(hasData).toBe(false);
		});

		it("should handle 201 created status", () => {
			setVerboseMode(true);
			logApiResponse(201, { id: "new-id" });
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("201")
			);
		});

		it("should handle 299 edge case (still success)", () => {
			setVerboseMode(true);
			logApiResponse(299, { data: "edge" });
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("299")
			);
		});

		it("should handle 300 status (not success)", () => {
			setVerboseMode(true);
			logApiResponse(300, { redirect: true });
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("300")
			);
		});
	});

	describe("Integration tests", () => {
		it("should work with full request-response cycle", () => {
			setVerboseMode(true);

			logApiRequest("POST", "https://api.example.com/users", {
				name: "John",
				email: "john@example.com",
			});

			logApiResponse(201, {
				id: "user-123",
				name: "John",
				email: "john@example.com",
			});

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("REQUEST")
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("RESPONSE")
			);
		});

		it("should handle error response in full cycle", () => {
			setVerboseMode(true);

			logApiRequest("DELETE", "https://api.example.com/users/123");
			logApiResponse(403, { error: "Forbidden" });

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("403")
			);
		});
	});
});
