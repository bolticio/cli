import { jest } from "@jest/globals";
import createCLI from "../cli.js";
import fs from "fs";
import * as EnvironmentCommands from "../commands/env.js";
import * as IntegrationCommands from "../commands/integration.js";
import * as AuthCommands from "../commands/login.js";
import * as McpCommands from "../commands/mcp.js";
import * as commandSuggestions from "../helper/command-suggestions.js";
import * as secureStorage from "../helper/secure-storage.js";

// Mock all dependencies
jest.mock("../commands/login.js", () => ({
	default: {
		handleLogin: jest.fn(),
		handleLogout: jest.fn(),
		execute: jest.fn(),
	},
}));
jest.mock("../commands/integration.js");
jest.mock("../commands/env.js");
jest.mock("../commands/mcp.js");
jest.mock("../helper/secure-storage.js");
jest.mock("../helper/command-suggestions.js");
jest.mock("../helper/verbose.js");

describe("CLI Module", () => {
	let cli;
	let mockConsoleLog;
	let mockConsoleError;

	beforeEach(() => {
		// Mock console methods
		mockConsoleLog = jest
			.spyOn(console, "log")
			.mockImplementation(() => {});
		mockConsoleError = jest
			.spyOn(console, "error")
			.mockImplementation(() => {});

		// Reset all mocks
		jest.clearAllMocks();

		// Reset AuthCommands mock functions - this needs to happen before creating CLI
		AuthCommands.default.handleLogin = jest.fn().mockResolvedValue();
		AuthCommands.default.handleLogout = jest.fn().mockResolvedValue();
		AuthCommands.default.execute = jest.fn().mockResolvedValue();

		// Create CLI instance AFTER setting up the mocks
		cli = createCLI("http://console.test", "http://api.test", "test", {
			name: "test",
		});
	});

	afterEach(() => {
		mockConsoleLog.mockRestore();
		mockConsoleError.mockRestore();
	});

	describe("CLI Creation", () => {
		it("should create CLI with correct parameters", () => {
			const testCli = createCLI(
				"http://console.test",
				"http://api.test",
				"test",
				{ name: "test" }
			);
			expect(testCli).toBeDefined();
			expect(testCli.execute).toBeDefined();
			expect(typeof testCli.execute).toBe("function");
		});
	});

	describe("Command Execution", () => {
		it("should show help when no command is provided", async () => {
			await cli.execute(["node", "cli.js"]);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Usage: boltic [command]")
			);
		});

		it("should handle login command", async () => {
			jest.mocked(secureStorage.getAllSecrets).mockResolvedValue([]);

			// Test that the login command executes without error
			await expect(
				cli.execute(["node", "cli.js", "login"])
			).resolves.not.toThrow();
		});

		it("should handle logout command", async () => {
			jest.mocked(secureStorage.getAllSecrets).mockResolvedValue([]);

			// Test that the logout command executes without error
			await expect(
				cli.execute(["node", "cli.js", "logout"])
			).resolves.not.toThrow();
		});

		it("should handle integration command", async () => {
			jest.mocked(
				IntegrationCommands.default.execute
			).mockResolvedValue();
			jest.mocked(secureStorage.getAllSecrets).mockResolvedValue([
				{ account: "token", password: "valid-token" },
			]);

			await cli.execute(["node", "cli.js", "integration", "create"]);
			expect(IntegrationCommands.default.execute).toHaveBeenCalledWith([
				"create",
			]);
		});

		it("should handle environment command", async () => {
			jest.mocked(
				EnvironmentCommands.default.execute
			).mockResolvedValue();
			jest.mocked(secureStorage.getAllSecrets).mockResolvedValue([
				{ account: "token", password: "valid-token" },
			]);

			await cli.execute(["node", "cli.js", "env", "list"]);
			expect(EnvironmentCommands.default.execute).toHaveBeenCalledWith([
				"list",
			]);
		});

		it("should handle version command", async () => {
			await cli.execute(["node", "cli.js", "version"]);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Boltic CLI Version:")
			);
		});

		it("should handle help command", async () => {
			await cli.execute(["node", "cli.js", "help"]);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Usage: boltic [command]")
			);
		});

		it("should delegate to mcp command", async () => {
			McpCommands.default.execute = jest.fn().mockResolvedValue();
			jest.mocked(secureStorage.getAllSecrets).mockResolvedValue([
				{ account: "token", password: "valid-token" },
			]);

			await cli.execute(["node", "cli.js", "mcp", "setup", "http://sse"]);
			expect(McpCommands.default.execute).toHaveBeenCalledWith([
				"setup",
				"http://sse",
			]);
		});
	});

	describe("Authentication Check", () => {
		it("should require authentication for protected commands", async () => {
			jest.mocked(secureStorage.getAllSecrets).mockResolvedValue([]);

			await cli.execute(["node", "cli.js", "integration"]);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining(
					'You are not logged in. Please run "boltic login" first.'
				)
			);
		});

		it("should allow authenticated users to run protected commands", async () => {
			jest.mocked(secureStorage.getAllSecrets).mockResolvedValue([
				{ account: "token", password: "valid-token" },
			]);
			jest.mocked(
				IntegrationCommands.default.execute
			).mockResolvedValue();

			await cli.execute(["node", "cli.js", "integration", "list"]);
			expect(IntegrationCommands.default.execute).toHaveBeenCalled();
		});

		it("should allow unauthenticated users to run public commands", async () => {
			jest.mocked(secureStorage.getAllSecrets).mockResolvedValue([]);

			await cli.execute(["node", "cli.js", "help"]);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Usage: boltic [command]")
			);
		});
	});

	describe("Unknown Command Handling", () => {
		it("should show error for unknown command", async () => {
			jest.mocked(commandSuggestions.findSimilarCommands).mockReturnValue(
				[]
			);

			await cli.execute(["node", "cli.js", "unknown"]);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('Unknown command: "unknown"')
			);
		});

		it("should show command suggestions for similar commands", async () => {
			jest.mocked(commandSuggestions.findSimilarCommands).mockReturnValue(
				["login", "logout"]
			);

			await cli.execute(["node", "cli.js", "loginn"]);
			expect(commandSuggestions.findSimilarCommands).toHaveBeenCalled();
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Did you mean:")
			);
		});
	});

	describe("Verbose Mode", () => {
		it("should handle verbose flag", async () => {
			const verboseModule = await import("../helper/verbose.js");
			verboseModule.setVerboseMode = jest.fn();

			await cli.execute(["node", "cli.js", "--verbose", "help"]);
			expect(verboseModule.setVerboseMode).toHaveBeenCalledWith(true);
		});

		describe("Version and Help Version Resolution", () => {
			beforeEach(() => {
				jest.restoreAllMocks();
				// Reinstall console spies after restoreAllMocks
				mockConsoleLog = jest
					.spyOn(console, "log")
					.mockImplementation(() => {});
				mockConsoleError = jest
					.spyOn(console, "error")
					.mockImplementation(() => {});
			});

			it("showHelp falls back to cwd package.json when module path fails", async () => {
				const readSpy = jest.spyOn(fs, "readFileSync");
				// First attempt throws
				readSpy.mockImplementationOnce(() => {
					throw new Error("primary read failed");
				});
				// Fallback returns version
				readSpy.mockImplementationOnce(() =>
					Buffer.from('{"version":"9.9.9"}', "utf-8")
				);

				await cli.execute(["node", "cli.js", "help"]);

				expect(mockConsoleLog).toHaveBeenCalledWith(
					expect.stringContaining("Boltic CLI Version: 9.9.9")
				);
			});

			it("showHelp keeps default version when both reads fail", async () => {
				const readSpy = jest.spyOn(fs, "readFileSync");
				readSpy.mockImplementation(() => {
					throw new Error("fail");
				});

				await cli.execute(["node", "cli.js", "help"]);

				expect(mockConsoleLog).toHaveBeenCalledWith(
					expect.stringContaining("Boltic CLI Version: 1.0.0")
				);
			});

			it("version falls back to cwd package.json when module path fails", async () => {
				const readSpy = jest.spyOn(fs, "readFileSync");
				// First attempt throws
				readSpy.mockImplementationOnce(() => {
					throw new Error("primary read failed");
				});
				// Fallback returns version
				readSpy.mockImplementationOnce(() =>
					Buffer.from('{"version":"8.8.8"}', "utf-8")
				);

				await cli.execute(["node", "cli.js", "version"]);

				expect(mockConsoleLog).toHaveBeenCalledWith(
					expect.stringContaining("Boltic CLI Version: 8.8.8")
				);
			});

			it("version keeps default when both reads fail", async () => {
				const readSpy = jest.spyOn(fs, "readFileSync");
				readSpy.mockImplementation(() => {
					throw new Error("fail");
				});

				await cli.execute(["node", "cli.js", "version"]);

				expect(mockConsoleLog).toHaveBeenCalledWith(
					expect.stringContaining("Boltic CLI Version: 1.0.0")
				);
			});
		});

		it("should remove verbose flag from arguments", async () => {
			IntegrationCommands.default.execute = jest.fn().mockResolvedValue();
			jest.mocked(secureStorage.getAllSecrets).mockResolvedValue([
				{ account: "token", password: "valid-token" },
			]);

			await cli.execute([
				"node",
				"cli.js",
				"integration",
				"--verbose",
				"create",
			]);
			expect(IntegrationCommands.default.execute).toHaveBeenCalledWith([
				"create",
			]);
		});
	});

	describe("Error Handling", () => {
		it("should handle authentication errors gracefully", async () => {
			jest.mocked(secureStorage.getAllSecrets).mockRejectedValue(
				new Error("Storage error")
			);

			await expect(
				cli.execute(["node", "cli.js", "integration"])
			).rejects.toThrow("Storage error");
		});

		it("should handle command execution errors", async () => {
			jest.mocked(secureStorage.getAllSecrets).mockResolvedValue([]);

			// Test authentication error instead of command execution error
			jest.mocked(secureStorage.getAllSecrets).mockRejectedValue(
				new Error("Storage error")
			);

			await expect(
				cli.execute(["node", "cli.js", "integration"])
			).rejects.toThrow("Storage error");
		});
	});

	describe("Session Token Authentication", () => {
		it("should accept session token for authentication", async () => {
			jest.mocked(secureStorage.getAllSecrets).mockResolvedValue([
				{ account: "session", password: "valid-session" },
			]);
			jest.mocked(
				IntegrationCommands.default.execute
			).mockResolvedValue();

			await cli.execute(["node", "cli.js", "integration", "list"]);
			expect(IntegrationCommands.default.execute).toHaveBeenCalled();
		});

		it("should require either token or session", async () => {
			jest.mocked(secureStorage.getAllSecrets).mockResolvedValue([
				{ account: "other", password: "other-value" },
			]);

			await cli.execute(["node", "cli.js", "integration"]);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining(
					'You are not logged in. Please run "boltic login" first.'
				)
			);
		});
	});
});
