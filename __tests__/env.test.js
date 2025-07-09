import { select } from "@inquirer/prompts";
import { jest } from "@jest/globals";
import EnvironmentCommands from "../commands/env.js";
import { environments } from "../config/environments.js";
import * as secureStorage from "../helper/secure-storage.js";

// Mock all dependencies
jest.mock("../config/environments.js", () => ({
	environments: {
		bolt: {
			name: "Bolt Environment",
			loginUrl: "http://bolt.login.test",
			consoleUrl: "http://bolt.console.test",
			apiUrl: "http://bolt.api.test",
		},
		dev: {
			name: "Development Environment",
			loginUrl: "http://dev.login.test",
			consoleUrl: "http://dev.console.test",
			apiUrl: "http://dev.api.test",
		},
	},
}));
jest.mock("../helper/secure-storage.js");
jest.mock("@inquirer/prompts");

describe("Environment Commands", () => {
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

		jest.clearAllMocks();
	});

	afterEach(() => {
		mockConsoleLog.mockRestore();
		mockConsoleError.mockRestore();
	});

	describe("execute", () => {
		it("should show help when no subcommand is provided", async () => {
			await EnvironmentCommands.execute([]);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Environment Commands")
			);
		});

		it("should show help for unknown subcommand", async () => {
			await EnvironmentCommands.execute(["unknown"]);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining(
					"Unknown or missing environment sub-command"
				)
			);
		});

		it("should execute valid subcommands", async () => {
			jest.mocked(secureStorage.getSecret).mockResolvedValue("bolt");

			await EnvironmentCommands.execute(["show"]);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Current Environment")
			);
		});
	});

	describe("handleList", () => {
		it("should list all available environments", async () => {
			await EnvironmentCommands.execute(["list"]);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Available Environments")
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("bolt")
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("dev")
			);
		});

		it("should display environment details", async () => {
			await EnvironmentCommands.execute(["list"]);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Bolt Environment")
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Development Environment")
			);
		});
	});

	describe("handleShow", () => {
		it("should show current environment with default bolt", async () => {
			jest.mocked(secureStorage.getSecret).mockResolvedValue(null);

			await EnvironmentCommands.execute(["show"]);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Current Environment")
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Bolt Environment")
			);
		});

		it("should show current environment from storage", async () => {
			jest.mocked(secureStorage.getSecret).mockResolvedValue("dev");

			await EnvironmentCommands.execute(["show"]);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Development Environment")
			);
		});

		it("should handle invalid environment gracefully", async () => {
			jest.mocked(secureStorage.getSecret).mockResolvedValue("invalid");

			await EnvironmentCommands.execute(["show"]);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Bolt Environment")
			);
		});
	});

	describe("handleSet", () => {
		it("should set environment from command line argument", async () => {
			jest.mocked(secureStorage.getSecret).mockResolvedValue("bolt");
			jest.mocked(secureStorage.storeSecret).mockResolvedValue();

			await EnvironmentCommands.execute(["set", "dev"]);

			expect(secureStorage.storeSecret).toHaveBeenCalledWith(
				"environment",
				"dev"
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Success!")
			);
		});

		it("should handle invalid environment from command line", async () => {
			jest.mocked(secureStorage.getSecret).mockResolvedValue("bolt");
			jest.mocked(secureStorage.storeSecret).mockResolvedValue();
			select.mockResolvedValue("dev");

			await EnvironmentCommands.execute(["set", "invalid"]);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Invalid environment 'invalid'")
			);
			expect(select).toHaveBeenCalled();
			expect(secureStorage.storeSecret).toHaveBeenCalledWith(
				"environment",
				"dev"
			);
		});

		it("should prompt for environment selection when no argument provided", async () => {
			jest.mocked(secureStorage.getSecret).mockResolvedValue("bolt");
			jest.mocked(secureStorage.storeSecret).mockResolvedValue();
			select.mockResolvedValue("dev");

			await EnvironmentCommands.execute(["set"]);

			expect(select).toHaveBeenCalledWith(
				expect.objectContaining({
					message: "Select environment:",
					choices: expect.arrayContaining([
						expect.objectContaining({
							name: expect.stringContaining("Bolt Environment"),
							value: "bolt",
						}),
						expect.objectContaining({
							name: expect.stringContaining(
								"Development Environment"
							),
							value: "dev",
						}),
					]),
					default: "bolt",
				})
			);
			expect(secureStorage.storeSecret).toHaveBeenCalledWith(
				"environment",
				"dev"
			);
		});

		it("should use current environment as default in prompt", async () => {
			jest.mocked(secureStorage.getSecret).mockResolvedValue("dev");
			jest.mocked(secureStorage.storeSecret).mockResolvedValue();
			select.mockResolvedValue("bolt");

			await EnvironmentCommands.execute(["set"]);

			expect(select).toHaveBeenCalledWith(
				expect.objectContaining({
					default: "dev",
				})
			);
		});

		it("should handle storage errors gracefully", async () => {
			jest.mocked(secureStorage.getSecret).mockResolvedValue("bolt");
			jest.mocked(secureStorage.storeSecret).mockRejectedValue(
				new Error("Storage failed")
			);

			await expect(
				EnvironmentCommands.execute(["set", "dev"])
			).rejects.toThrow("Storage failed");
		});
	});

	describe("Environment Configuration", () => {
		it("should have correct environment structure", () => {
			expect(environments.bolt).toBeDefined();
			expect(environments.bolt.name).toBe("Bolt Environment");
			expect(environments.bolt.loginUrl).toBe("http://bolt.login.test");
			expect(environments.bolt.consoleUrl).toBe(
				"http://bolt.console.test"
			);
			expect(environments.bolt.apiUrl).toBe("http://bolt.api.test");

			expect(environments.dev).toBeDefined();
			expect(environments.dev.name).toBe("Development Environment");
			expect(environments.dev.loginUrl).toBe("http://dev.login.test");
			expect(environments.dev.consoleUrl).toBe("http://dev.console.test");
			expect(environments.dev.apiUrl).toBe("http://dev.api.test");
		});
	});

	describe("Error Handling", () => {
		it("should handle secure storage errors", async () => {
			jest.mocked(secureStorage.getSecret).mockRejectedValue(
				new Error("Storage error")
			);

			await expect(EnvironmentCommands.execute(["show"])).rejects.toThrow(
				"Storage error"
			);
		});

		it("should handle prompt cancellation", async () => {
			jest.mocked(secureStorage.getSecret).mockResolvedValue("bolt");
			select.mockRejectedValue(new Error("User cancelled"));

			await expect(EnvironmentCommands.execute(["set"])).rejects.toThrow(
				"User cancelled"
			);
		});
	});

	describe("Environment URLs", () => {
		it("should display correct URLs in list", async () => {
			await EnvironmentCommands.execute(["list"]);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("http://bolt.login.test")
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("http://dev.login.test")
			);
		});

		it("should display correct URLs in show", async () => {
			jest.mocked(secureStorage.getSecret).mockResolvedValue("bolt");

			await EnvironmentCommands.execute(["show"]);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("http://bolt.login.test")
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("http://bolt.console.test")
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("http://bolt.api.test")
			);
		});
	});

	describe("Success Messages", () => {
		it("should show success message after setting environment", async () => {
			jest.mocked(secureStorage.getSecret).mockResolvedValue("bolt");
			jest.mocked(secureStorage.storeSecret).mockResolvedValue();

			await EnvironmentCommands.execute(["set", "dev"]);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Success!")
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Success!")
			);
		});
	});
});
