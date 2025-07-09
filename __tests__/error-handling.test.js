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
			// This covers line 16 - unknown error when no error passed
			errorHandler.handleError(null);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ Error:"),
				"An unknown error occurred"
			);
			expect(process.exit).toHaveBeenCalledWith(1);
		});

		it("should handle validation errors (400 status)", () => {
			// This covers lines 36-42 - validation error handling
			const error = {
				response: {
					status: 400,
					data: { message: "Invalid input data" },
				},
			};

			errorHandler.handleError(error);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ Validation Error:"),
				"Invalid input data"
			);
			expect(process.exit).toHaveBeenCalledWith(1);
		});

		it("should handle validation errors without message", () => {
			// This covers the default validation error message
			const error = {
				response: {
					status: 400,
					data: {},
				},
			};

			errorHandler.handleError(error);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ Validation Error:"),
				"Invalid request. Please check your input."
			);
		});

		it("should handle server errors (>= 500)", () => {
			// This covers lines 45-52 - server error handling
			const error = {
				response: {
					status: 500,
					data: {
						error: {
							message: "Internal server error",
						},
					},
				},
			};

			errorHandler.handleError(error);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ API Error:"),
				"Internal server error"
			);
		});

		it("should handle server errors without detailed message", () => {
			// This covers the default server error message
			const error = {
				response: {
					status: 503,
					data: {},
				},
			};

			errorHandler.handleError(error);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ API Error:"),
				"Server error occurred. Please try again later."
			);
		});

		it("should handle ENOENT errors (config file not found)", () => {
			// This covers line 72 - config error handling
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

		it("should handle API errors with default message", () => {
			const error = {
				response: {
					status: 404,
					data: {},
				},
			};

			errorHandler.handleError(error);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ API Error:"),
				"API Error: 404"
			);
		});

		it("should handle auth errors without data message", () => {
			// This covers line 30 - the fallback message for auth errors
			const error = {
				response: {
					status: 401,
					data: {}, // No message property
				},
			};

			errorHandler.handleError(error);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ Authentication Error:"),
				"Authentication failed. Please login again."
			);
		});

		it("should handle unknown errors without message property", () => {
			// This covers line 81 - the fallback message for unknown errors
			const error = {}; // No message property

			errorHandler.handleError(error);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("❌ Error:"),
				"An unexpected error occurred"
			);
		});
	});
});
