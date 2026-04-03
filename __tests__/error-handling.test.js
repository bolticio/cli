import { jest } from "@jest/globals";

describe("Error Handling", () => {
	let errorHandler;

	beforeAll(async () => {
		errorHandler = await import("../helper/error.js");
	});

	beforeEach(() => {
		jest.clearAllMocks();
		console.error = jest.fn();
		// Mock process.exit to prevent actual exit
		process.exit = jest.fn();
	});

	describe("Error Types", () => {
		it("should have defined error types", () => {
			expect(errorHandler.ErrorType).toBeDefined();
			expect(errorHandler.ErrorType.NETWORK_ERROR).toBeDefined();
			expect(errorHandler.ErrorType.VALIDATION_ERROR).toBeDefined();
			expect(errorHandler.ErrorType.AUTH_ERROR).toBeDefined();
			expect(errorHandler.ErrorType.API_ERROR).toBeDefined();
			expect(errorHandler.ErrorType.CONFIG_ERROR).toBeDefined();
			expect(errorHandler.ErrorType.UNKNOWN_ERROR).toBeDefined();
		});
	});

	describe("formatErrorMessage", () => {
		it("should handle null/undefined errors", () => {
			errorHandler.handleError(null);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ Error:"),
				"An unknown error occurred"
			);
			expect(process.exit).toHaveBeenCalledWith(1);
		});

		it("should handle validation errors with flat message format", () => {
			const error = {
				response: {
					status: 400,
					data: { message: "Invalid input data" },
					config: { method: "post", url: "/test" },
				},
			};

			errorHandler.handleError(error);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ Validation Error:"),
				"Invalid input data"
			);
			expect(process.exit).toHaveBeenCalledWith(1);
		});

		it("should handle validation errors with backend error format", () => {
			const error = {
				response: {
					status: 400,
					data: {
						error: {
							code: 400,
							message: "name is required",
							meta: { errors: [] },
						},
					},
					config: { method: "post", url: "/test" },
				},
			};

			errorHandler.handleError(error);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ Validation Error:"),
				"name is required"
			);
		});

		it("should handle validation errors without message", () => {
			const error = {
				response: {
					status: 400,
					data: {},
					config: { method: "post", url: "/test" },
				},
			};

			errorHandler.handleError(error);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ Validation Error:"),
				"Invalid request. Please check your input."
			);
		});

		it("should handle server errors (>= 500)", () => {
			const error = {
				response: {
					status: 500,
					data: {
						error: {
							message: "Internal server error",
						},
					},
					config: { method: "get", url: "/test" },
				},
			};

			errorHandler.handleError(error);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ API Error:"),
				"Internal server error"
			);
		});

		it("should handle server errors without detailed message", () => {
			const error = {
				response: {
					status: 503,
					data: {},
					config: { method: "get", url: "/test" },
				},
			};

			errorHandler.handleError(error);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ API Error:"),
				"Server error occurred. Please try again later."
			);
		});

		it("should handle ENOENT errors (config file not found)", () => {
			const error = {
				code: "ENOENT",
				message: "File not found",
			};

			errorHandler.handleError(error);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ Configuration Error:"),
				"Configuration file not found. Please run setup again."
			);
		});

		it("should handle ENOTFOUND network errors", () => {
			const error = {
				code: "ENOTFOUND",
				message: "Host not found",
			};

			errorHandler.handleError(error);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ Network Error:"),
				"Unable to connect to the server. Please check your internet connection."
			);
		});
	});

	describe("handleError", () => {
		it("should handle network errors", () => {
			const error = new Error("Network failed");
			error.code = "ECONNREFUSED";

			errorHandler.handleError(error);

			expect(console.error).toHaveBeenCalled();
			expect(process.exit).toHaveBeenCalledWith(1);
		});

		it("should handle authentication errors with response", () => {
			const error = {
				response: {
					status: 401,
					data: { message: "Unauthorized access" },
					config: { method: "get", url: "/test" },
				},
			};

			errorHandler.handleError(error);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ Authentication Error:"),
				"Unauthorized access"
			);
			expect(process.exit).toHaveBeenCalledWith(1);
		});

		it("should handle 403 forbidden errors", () => {
			const error = {
				response: {
					status: 403,
					data: { message: "Access forbidden" },
					config: { method: "get", url: "/test" },
				},
			};

			errorHandler.handleError(error);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ Authentication Error:"),
				"Access forbidden"
			);
		});

		it("should handle unknown errors with custom message", () => {
			const error = new Error("Custom error message");

			errorHandler.handleError(error);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ Error:"),
				"Custom error message"
			);
			expect(process.exit).toHaveBeenCalledWith(1);
		});

		it("should handle not found errors with default message", () => {
			const error = {
				response: {
					status: 404,
					data: {},
					config: { method: "get", url: "/test" },
				},
			};

			errorHandler.handleError(error);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ Not Found:"),
				"The requested resource was not found."
			);
		});

		it("should handle not found errors with backend message", () => {
			const error = {
				response: {
					status: 404,
					data: {
						error: {
							code: 404,
							message: "Integration not found with id: abc-123",
							meta: { errors: [] },
						},
					},
					config: { method: "post", url: "/test" },
				},
			};

			errorHandler.handleError(error);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ Not Found:"),
				"Integration not found with id: abc-123"
			);
		});

		it("should handle auth errors without data message", () => {
			const error = {
				response: {
					status: 401,
					data: {},
					config: { method: "get", url: "/test" },
				},
			};

			errorHandler.handleError(error);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ Authentication Error:"),
				"Authentication failed. Please login again."
			);
		});

		it("should handle unknown errors without message property", () => {
			const error = {};

			errorHandler.handleError(error);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ Error:"),
				"An unexpected error occurred"
			);
		});

		it("should always log API response details for API errors", () => {
			const error = {
				response: {
					status: 400,
					data: {
						error: {
							code: 400,
							message: "parent_id is required",
							meta: { errors: [] },
						},
					},
					config: { method: "post", url: "/integrations/123/edit" },
				},
			};

			errorHandler.handleError(error);

			// Should log the main error message
			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ Validation Error:"),
				"parent_id is required"
			);
			// Should also log the debug line with method, url, status
			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("POST /integrations/123/edit → 400")
			);
			// Should also log the raw response
			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("Response:")
			);
		});

		it("should handle validation errors from meta.errors array", () => {
			const error = {
				response: {
					status: 400,
					data: {
						error: {
							code: 400,
							meta: {
								errors: [
									"field 'name' is required",
									"field 'status' must be draft or published",
								],
							},
						},
					},
					config: { method: "post", url: "/test" },
				},
			};

			errorHandler.handleError(error);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ Validation Error:"),
				"field 'name' is required; field 'status' must be draft or published"
			);
		});
	});
});
