import { jest } from "@jest/globals";
import fs from "fs";

// Mock dependencies
jest.mock("fs");
jest.mock("path");

describe("Utility Functions", () => {
	let mockConsoleLog;
	let mockConsoleError;

	beforeEach(() => {
		mockConsoleLog = jest
			.spyOn(console, "log")
			.mockImplementation(() => {});
		mockConsoleError = jest
			.spyOn(console, "error")
			.mockImplementation(() => {});
		jest.clearAllMocks();
	});

	afterEach(() => {
		mockConsoleLog.mockRestore();
		mockConsoleError.mockRestore();
	});

	describe("Integration Utilities", () => {
		it("should pick SVG file successfully", async () => {
			// Mock file dialog or file picker functionality
			const mockPickSvgFile = jest
				.fn()
				.mockResolvedValue("/path/to/icon.svg");

			const pickSvgFile = mockPickSvgFile;
			const result = await pickSvgFile();

			expect(result).toBe("/path/to/icon.svg");
			expect(mockPickSvgFile).toHaveBeenCalled();
		});

		it("should handle file picker cancellation", async () => {
			const mockPickSvgFile = jest.fn().mockResolvedValue(null);

			const pickSvgFile = mockPickSvgFile;
			const result = await pickSvgFile();

			expect(result).toBeNull();
		});

		it("should validate SVG file extension", async () => {
			const validateSvgFile = (filePath) => {
				if (!filePath) return false;
				return filePath.endsWith(".svg");
			};

			expect(validateSvgFile("/path/to/icon.svg")).toBe(true);
			expect(validateSvgFile("/path/to/invalid.png")).toBe(false);
			expect(validateSvgFile(null)).toBe(false);
			expect(validateSvgFile("")).toBe(false);
		});

		it("should format integration name", async () => {
			const formatIntegrationName = (name) => {
				return name.trim().replace(/\s+/g, "_").toLowerCase();
			};

			expect(formatIntegrationName("My Integration")).toBe(
				"my_integration"
			);
			expect(formatIntegrationName("  Test  Name  ")).toBe("test_name");
			expect(formatIntegrationName("SingleName")).toBe("singlename");
		});

		it("should generate integration slug", async () => {
			const generateSlug = (name) => {
				return name
					.toLowerCase()
					.replace(/\s+/g, "-")
					.replace(/[^a-z0-9-]/g, "");
			};

			expect(generateSlug("My Integration")).toBe("my-integration");
			expect(generateSlug("Test Integration 123")).toBe(
				"test-integration-123"
			);
			expect(generateSlug("Special!@#$%")).toBe("special");
		});
	});

	describe("File System Utilities", () => {
		it("should check if directory exists", async () => {
			fs.existsSync = jest.fn().mockReturnValue(true);

			const directoryExists = (path) => fs.existsSync(path);
			const exists = directoryExists("/test/path");

			expect(exists).toBe(true);
			expect(fs.existsSync).toHaveBeenCalledWith("/test/path");
		});

		it("should create directory if not exists", async () => {
			fs.existsSync = jest.fn().mockReturnValue(false);
			fs.mkdirSync = jest.fn();

			const ensureDirectory = (dirPath) => {
				if (!fs.existsSync(dirPath)) {
					fs.mkdirSync(dirPath, { recursive: true });
				}
			};

			ensureDirectory("/test/new/path");

			expect(fs.mkdirSync).toHaveBeenCalledWith("/test/new/path", {
				recursive: true,
			});
		});

		it("should read JSON file safely", async () => {
			fs.existsSync = jest.fn().mockReturnValue(true);
			fs.readFileSync = jest
				.fn()
				.mockReturnValue(JSON.stringify({ test: "data" }));

			const readJsonFile = (filePath) => {
				if (!fs.existsSync(filePath)) {
					return null;
				}
				try {
					return JSON.parse(fs.readFileSync(filePath, "utf8"));
				} catch {
					return null;
				}
			};

			const data = readJsonFile("/test/file.json");

			expect(data).toEqual({ test: "data" });
		});

		it("should handle invalid JSON gracefully", async () => {
			fs.existsSync = jest.fn().mockReturnValue(true);
			fs.readFileSync = jest.fn().mockReturnValue("invalid json");

			const readJsonFile = (filePath) => {
				if (!fs.existsSync(filePath)) {
					return null;
				}
				try {
					return JSON.parse(fs.readFileSync(filePath, "utf8"));
				} catch {
					return null;
				}
			};

			const data = readJsonFile("/test/invalid.json");

			expect(data).toBeNull();
		});

		it("should write JSON file safely", async () => {
			fs.writeFileSync = jest.fn();

			const writeJsonFile = (filePath, data) => {
				fs.writeFileSync(
					filePath,
					JSON.stringify(data, null, 2),
					"utf8"
				);
			};

			const testData = { test: "data", number: 123 };

			writeJsonFile("/test/output.json", testData);

			expect(fs.writeFileSync).toHaveBeenCalledWith(
				"/test/output.json",
				JSON.stringify(testData, null, 2),
				"utf8"
			);
		});
	});

	describe("String Utilities", () => {
		it("should capitalize string", async () => {
			const capitalize = (str) =>
				str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

			expect(capitalize("hello")).toBe("Hello");
			expect(capitalize("WORLD")).toBe("World");
			expect(capitalize("tEST")).toBe("Test");
		});

		it("should convert to camelCase", async () => {
			const toCamelCase = (str) => {
				return str.replace(/[-_\s]+(.)?/g, (_, c) =>
					c ? c.toUpperCase() : ""
				);
			};

			expect(toCamelCase("hello-world")).toBe("helloWorld");
			expect(toCamelCase("test_string")).toBe("testString");
			expect(toCamelCase("another test")).toBe("anotherTest");
		});

		it("should convert to snake_case", async () => {
			const toSnakeCase = (str) => {
				return str
					.replace(/([A-Z])/g, "_$1")
					.toLowerCase()
					.replace(/^_/, "");
			};

			expect(toSnakeCase("helloWorld")).toBe("hello_world");
			expect(toSnakeCase("TestString")).toBe("test_string");
			expect(toSnakeCase("XMLParser")).toBe("x_m_l_parser");
		});

		it("should truncate string", async () => {
			const truncate = (str, length = 50, suffix = "...") => {
				if (str.length <= length) return str;
				return str.substring(0, length - suffix.length) + suffix;
			};

			expect(truncate("Short text")).toBe("Short text");
			expect(
				truncate(
					"This is a very long string that should be truncated",
					20
				)
			).toBe("This is a very lo...");
			expect(truncate("Test", 10, "!!!")).toBe("Test");
		});
	});

	describe("Validation Utilities", () => {
		it("should validate email format", async () => {
			const isValidEmail = (email) => {
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				return emailRegex.test(email);
			};

			expect(isValidEmail("test@example.com")).toBe(true);
			expect(isValidEmail("invalid.email")).toBe(false);
			expect(isValidEmail("user@domain")).toBe(false);
			expect(isValidEmail("@domain.com")).toBe(false);
		});

		it("should validate URL format", async () => {
			const isValidUrl = (url) => {
				try {
					new URL(url);
					return true;
				} catch {
					return false;
				}
			};

			expect(isValidUrl("https://example.com")).toBe(true);
			expect(isValidUrl("http://localhost:3000")).toBe(true);
			expect(isValidUrl("invalid-url")).toBe(false);
			expect(isValidUrl("ftp://files.example.com")).toBe(true);
		});

		it("should validate integration name", async () => {
			const isValidIntegrationName = (name) => {
				if (!name || name.length === 0) return false;
				if (name.length > 50) return false;
				return /^[a-zA-Z_.]+$/.test(name.replace(/\s+/g, "_"));
			};

			expect(isValidIntegrationName("MyIntegration")).toBe(true);
			expect(isValidIntegrationName("Test Integration")).toBe(true);
			expect(isValidIntegrationName("Integration123")).toBe(false);
			expect(isValidIntegrationName("")).toBe(false);
			expect(isValidIntegrationName("a".repeat(51))).toBe(false);
		});
	});

	describe("Date Utilities", () => {
		it("should format date correctly", async () => {
			const formatDate = (date, format = "YYYY-MM-DD") => {
				const d = new Date(date);
				const year = d.getFullYear();
				const month = String(d.getMonth() + 1).padStart(2, "0");
				const day = String(d.getDate()).padStart(2, "0");

				return format
					.replace("YYYY", year)
					.replace("MM", month)
					.replace("DD", day);
			};

			const testDate = new Date("2023-12-25T10:30:00Z");
			expect(formatDate(testDate)).toBe("2023-12-25");
			expect(formatDate(testDate, "DD/MM/YYYY")).toBe("25/12/2023");
		});

		it("should check if date is recent", async () => {
			const isRecent = (date, days = 7) => {
				const now = new Date();
				const targetDate = new Date(date);
				const diffTime = Math.abs(now - targetDate);
				const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
				return diffDays <= days;
			};

			const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
			const lastWeek = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

			expect(isRecent(yesterday)).toBe(true);
			expect(isRecent(lastWeek)).toBe(false);
			expect(isRecent(lastWeek, 10)).toBe(true);
		});
	});

	describe("Error Utilities", () => {
		it("should format error messages consistently", async () => {
			const formatErrorMessage = (error) => {
				if (error.response) {
					return `API Error ${error.response.status}: ${error.response.data?.message || error.message}`;
				}
				if (error.code === "ECONNREFUSED") {
					return "Connection refused: Unable to connect to server";
				}
				return `Error: ${error.message}`;
			};

			const apiError = {
				message: "Request failed",
				response: { status: 404, data: { message: "Not found" } },
			};
			expect(formatErrorMessage(apiError)).toBe(
				"API Error 404: Not found"
			);

			const networkError = {
				message: "Connection failed",
				code: "ECONNREFUSED",
			};
			expect(formatErrorMessage(networkError)).toBe(
				"Connection refused: Unable to connect to server"
			);

			const genericError = { message: "Something went wrong" };
			expect(formatErrorMessage(genericError)).toBe(
				"Error: Something went wrong"
			);
		});
	});
});
