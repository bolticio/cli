import { jest } from "@jest/globals";
import { execSync } from "child_process";

// Mock child_process
jest.mock("child_process");

describe("Utils Integration", () => {
	let utils;
	let mockExecSync;

	beforeAll(async () => {
		utils = await import("../utils/integration.js");
	});

	beforeEach(() => {
		mockExecSync = jest.mocked(execSync);
		jest.clearAllMocks();
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
			Object.defineProperty(process, "platform", {
				value: "win32",
				writable: true,
			});

			mockExecSync.mockReturnValue(
				Buffer.from("C:\\path\\to\\file.svg\n")
			);

			const result = await utils.pickSvgFile();

			expect(result).toBe("C:\\path\\to\\file.svg");
			expect(mockExecSync).toHaveBeenCalledWith(
				expect.stringContaining("powershell -Command")
			);

			// Restore platform
			Object.defineProperty(process, "platform", {
				value: originalPlatform,
				writable: true,
			});
		});

		it("should handle Linux file picking", async () => {
			const originalPlatform = process.platform;
			Object.defineProperty(process, "platform", {
				value: "linux",
				writable: true,
			});

			mockExecSync.mockReturnValue(Buffer.from("/path/to/file.svg\n"));

			const result = await utils.pickSvgFile();

			expect(result).toBe("/path/to/file.svg");
			expect(mockExecSync).toHaveBeenCalledWith(
				expect.stringContaining("zenity --file-selection")
			);

			// Restore platform
			Object.defineProperty(process, "platform", {
				value: originalPlatform,
				writable: true,
			});
		});

		it("should handle unsupported platform", async () => {
			const originalPlatform = process.platform;
			const mockConsoleError = jest
				.spyOn(console, "error")
				.mockImplementation(() => {});

			Object.defineProperty(process, "platform", {
				value: "unsupported",
				writable: true,
			});

			const result = await utils.pickSvgFile();

			expect(result).toBeNull();
			expect(mockConsoleError).toHaveBeenCalledWith(
				"Unsupported platform for file picker"
			);

			// Restore platform and console
			Object.defineProperty(process, "platform", {
				value: originalPlatform,
				writable: true,
			});
			mockConsoleError.mockRestore();
		});

		it("should handle execution errors", async () => {
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

			// Restore platform
			Object.defineProperty(process, "platform", {
				value: originalPlatform,
				writable: true,
			});
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
	});
});
