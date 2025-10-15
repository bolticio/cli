import { jest } from "@jest/globals";
import { execSync } from "child_process";
import fs from "fs";

// Mock child_process and fs
jest.mock("child_process");
jest.mock("fs");

describe("Utils Integration", () => {
	let utils;
	let mockExecSync;
	let mockFs;

	beforeAll(async () => {
		utils = await import("../utils/integration.js");
	});

	beforeEach(() => {
		mockExecSync = jest.mocked(execSync);
		mockFs = jest.mocked(fs);
		jest.clearAllMocks();

		// Default mocks for fs operations
		mockFs.writeFileSync = jest.fn();
		mockFs.unlinkSync = jest.fn();
		mockFs.existsSync = jest.fn().mockReturnValue(true);
	});

	describe("pickSvgFile", () => {
		it("should handle macOS file picking", async () => {
			const originalPlatform = process.platform;
			Object.defineProperty(process, "platform", {
				value: "darwin",
				writable: true,
			});

			mockExecSync.mockReturnValue(Buffer.from("/path/to/file.svg\n"));

			const result = await utils.pickSvgFile();

			expect(result).toBe("/path/to/file.svg");
			expect(mockExecSync).toHaveBeenCalledWith(
				expect.stringContaining("osascript -e")
			);

			// Restore platform
			Object.defineProperty(process, "platform", {
				value: originalPlatform,
				writable: true,
			});
		});

		it("should handle Windows file picking", async () => {
			const originalPlatform = process.platform;
			const originalEnv = process.env;

			Object.defineProperty(process, "platform", {
				value: "win32",
				writable: true,
			});

			// Mock environment variables for temp directory
			process.env = { ...originalEnv, TEMP: "C:\\temp" };

			// Mock successful PowerShell execution
			mockExecSync.mockReturnValue("C:\\path\\to\\file.svg\n");

			// Mock file exists for the expected path
			mockFs.existsSync.mockImplementation(
				(path) => path === "C:\\path\\to\\file.svg"
			);

			const result = await utils.pickSvgFile();

			expect(result).toBe("C:\\path\\to\\file.svg");
			// Check that a PowerShell script file was created
			expect(mockFs.writeFileSync).toHaveBeenCalledWith(
				expect.stringContaining(".ps1"),
				expect.stringContaining("System.Windows.Forms"),
				"utf8"
			);
			// Check that PowerShell was executed with the script file
			expect(mockExecSync).toHaveBeenCalledWith(
				expect.stringContaining(
					"powershell.exe -ExecutionPolicy Bypass"
				),
				expect.any(Object)
			);

			// Restore platform and environment
			Object.defineProperty(process, "platform", {
				value: originalPlatform,
				writable: true,
			});
			process.env = originalEnv;
		});

		it("should handle Linux file picking", async () => {
			const originalPlatform = process.platform;
			Object.defineProperty(process, "platform", {
				value: "linux",
				writable: true,
			});

			mockExecSync.mockReturnValue("/path/to/file.svg\n");

			// Mock file exists for the expected path
			mockFs.existsSync.mockImplementation(
				(path) => path === "/path/to/file.svg"
			);

			const result = await utils.pickSvgFile();

			expect(result).toBe("/path/to/file.svg");
			expect(mockExecSync).toHaveBeenCalledWith(
				expect.stringContaining("zenity --file-selection"),
				expect.any(Object)
			);

			// Restore platform
			Object.defineProperty(process, "platform", {
				value: originalPlatform,
				writable: true,
			});
		});

		it("should handle Windows fallback methods", async () => {
			const originalPlatform = process.platform;
			const originalEnv = process.env;

			Object.defineProperty(process, "platform", {
				value: "win32",
				writable: true,
			});

			process.env = { ...originalEnv, TEMP: "C:\\temp" };

			// Mock PowerShell failure, then VBScript success
			mockExecSync
				.mockImplementationOnce(() => {
					throw new Error("PowerShell failed");
				})
				.mockReturnValueOnce("C:\\path\\to\\file.svg\n");

			// Mock file exists for the expected path
			mockFs.existsSync.mockImplementation(
				(path) => path === "C:\\path\\to\\file.svg"
			);

			const result = await utils.pickSvgFile();

			expect(result).toBe("C:\\path\\to\\file.svg");
			// Should have tried PowerShell first, then VBScript
			expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2); // .ps1 and .vbs files

			// Restore platform and environment
			Object.defineProperty(process, "platform", {
				value: originalPlatform,
				writable: true,
			});
			process.env = originalEnv;
		});

		it("should handle Linux fallback methods", async () => {
			const originalPlatform = process.platform;
			Object.defineProperty(process, "platform", {
				value: "linux",
				writable: true,
			});

			// Mock zenity failure, then kdialog success
			mockExecSync
				.mockImplementationOnce(() => {
					throw new Error("zenity failed");
				})
				.mockReturnValueOnce("/path/to/file.svg\n");

			// Mock file exists for the expected path
			mockFs.existsSync.mockImplementation(
				(path) => path === "/path/to/file.svg"
			);

			const result = await utils.pickSvgFile();

			expect(result).toBe("/path/to/file.svg");
			// Verify that both zenity and kdialog were tried
			expect(mockExecSync).toHaveBeenCalledTimes(2);

			// Restore platform
			Object.defineProperty(process, "platform", {
				value: originalPlatform,
				writable: true,
			});
		});

		it("should handle unsupported platform", async () => {
			const originalPlatform = process.platform;

			Object.defineProperty(process, "platform", {
				value: "unsupported",
				writable: true,
			});

			const result = await utils.pickSvgFile();

			expect(result).toBeNull();
			// The actual implementation just returns null for unsupported platforms
			// without logging any error messages

			// Restore platform
			Object.defineProperty(process, "platform", {
				value: originalPlatform,
				writable: true,
			});
		});

		it("should handle execution errors and return null", async () => {
			const originalPlatform = process.platform;
			Object.defineProperty(process, "platform", {
				value: "darwin",
				writable: true,
			});

			mockExecSync.mockImplementation(() => {
				throw new Error("Command failed");
			});

			const result = await utils.pickSvgFile();

			expect(result).toBeNull();
			// The actual implementation catches errors and returns null
			// without logging error messages

			// Restore platform
			Object.defineProperty(process, "platform", {
				value: originalPlatform,
				writable: true,
			});
		});

		it("should handle all Windows methods failing", async () => {
			const originalPlatform = process.platform;
			const originalEnv = process.env;

			Object.defineProperty(process, "platform", {
				value: "win32",
				writable: true,
			});

			process.env = { ...originalEnv, TEMP: "C:\\temp" };

			// Mock all methods failing
			mockExecSync.mockImplementation(() => {
				throw new Error("All methods failed");
			});

			const result = await utils.pickSvgFile();

			expect(result).toBeNull();
			// Verify that multiple methods were attempted
			expect(mockExecSync).toHaveBeenCalled();
			// The actual implementation opens file explorer but doesn't log messages

			// Restore platform and environment
			Object.defineProperty(process, "platform", {
				value: originalPlatform,
				writable: true,
			});
			process.env = originalEnv;
		});

		it("should trim whitespace from file paths", async () => {
			const originalPlatform = process.platform;
			Object.defineProperty(process, "platform", {
				value: "darwin",
				writable: true,
			});

			mockExecSync.mockReturnValue(
				Buffer.from("  /path/to/file.svg  \n")
			);

			const result = await utils.pickSvgFile();

			expect(result).toBe("/path/to/file.svg");

			// Restore platform
			Object.defineProperty(process, "platform", {
				value: originalPlatform,
				writable: true,
			});
		});

		it("should handle empty file paths", async () => {
			const originalPlatform = process.platform;
			Object.defineProperty(process, "platform", {
				value: "darwin",
				writable: true,
			});

			mockExecSync.mockReturnValue(Buffer.from(""));

			const result = await utils.pickSvgFile();

			expect(result).toBeNull();

			// Restore platform
			Object.defineProperty(process, "platform", {
				value: originalPlatform,
				writable: true,
			});
		});

		it("should handle non-existent files", async () => {
			const originalPlatform = process.platform;
			Object.defineProperty(process, "platform", {
				value: "darwin",
				writable: true,
			});

			mockExecSync.mockReturnValue(
				Buffer.from("/path/to/nonexistent.svg")
			);
			mockFs.existsSync.mockReturnValue(false);

			const result = await utils.pickSvgFile();

			expect(result).toBeNull();

			// Restore platform
			Object.defineProperty(process, "platform", {
				value: originalPlatform,
				writable: true,
			});
		});
	});

	describe("getSvgFilePath", () => {
		it("should return file path when picker succeeds", async () => {
			const originalPlatform = process.platform;
			Object.defineProperty(process, "platform", {
				value: "darwin",
				writable: true,
			});

			mockExecSync.mockReturnValue(Buffer.from("/path/to/file.svg"));

			const result = await utils.getSvgFilePath();

			expect(result).toBe("/path/to/file.svg");
			// The getSvgFilePath function doesn't log messages when successful

			// Restore platform
			Object.defineProperty(process, "platform", {
				value: originalPlatform,
				writable: true,
			});
		});

		it("should return null when picker returns invalid path", async () => {
			const originalPlatform = process.platform;
			Object.defineProperty(process, "platform", {
				value: "darwin",
				writable: true,
			});

			// Simulate osascript returns a path but fs.existsSync returns false
			mockExecSync.mockReturnValue(Buffer.from("/missing/file.svg"));
			mockFs.existsSync.mockReturnValue(false);

			const result = await utils.getSvgFilePath();

			expect(result).toBeUndefined(); // function returns nothing when file invalid

			Object.defineProperty(process, "platform", {
				value: originalPlatform,
				writable: true,
			});
		});
	});
});
