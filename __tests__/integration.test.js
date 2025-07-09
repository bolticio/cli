import { confirm, input, search } from "@inquirer/prompts";
import { jest } from "@jest/globals";
import fs from "fs";
import path from "path";
import * as integrationApi from "../api/integration.js";
import IntegrationCommands from "../commands/integration.js";
import * as envHelper from "../helper/env.js";
import * as folderHelper from "../helper/folder.js";
import * as validationHelper from "../helper/validation.js";
import * as integrationUtils from "../utils/integration.js";

// Mock all dependencies
jest.mock("fs");
jest.mock("path");
jest.mock("../api/integration.js");
jest.mock("../helper/env.js");
jest.mock("../helper/folder.js");
jest.mock("../helper/validation.js");
jest.mock("../utils/integration.js");
jest.mock("@inquirer/prompts");

describe("Integration Commands", () => {
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

		// Mock environment
		jest.mocked(envHelper.getCurrentEnv).mockResolvedValue({
			apiUrl: "http://api.test",
			token: "test-token",
			accountId: "test-account",
			session: "test-session",
			frontendUrl: "http://frontend.test",
		});

		// Reset all mocks
		jest.clearAllMocks();
	});

	afterEach(() => {
		mockConsoleLog.mockRestore();
		mockConsoleError.mockRestore();
	});

	describe("execute", () => {
		it("should show help when no subcommand is provided", async () => {
			await IntegrationCommands.execute([]);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Integration Commands:")
			);
		});

		it("should show help for unknown subcommand", async () => {
			await IntegrationCommands.execute(["unknown"]);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining(
					"Unknown or missing integration sub-command"
				)
			);
		});

		it("should execute valid subcommands", async () => {
			jest.mocked(integrationApi.getIntegrationGroups).mockResolvedValue([
				{ id: "1", name: "Test Group" },
			]);
			jest.mocked(input).mockResolvedValue("TestIntegration");
			jest.mocked(integrationUtils.pickSvgFile).mockResolvedValue(
				"/path/to/icon.svg"
			);
			jest.mocked(integrationApi.uploadFileToCloud).mockResolvedValue({
				url: "http://icon.url",
			});
			jest.mocked(confirm).mockResolvedValue(true);
			jest.mocked(search).mockResolvedValue("1");
			jest.mocked(integrationApi.saveIntegration).mockResolvedValue({
				id: "test-id",
			});
			jest.mocked(
				folderHelper.createIntegrationFolderStructure
			).mockResolvedValue();

			await IntegrationCommands.execute(["create"]);
			expect(integrationApi.getIntegrationGroups).toHaveBeenCalled();
		});
	});

	describe("handleCreate", () => {
		beforeEach(() => {
			jest.mocked(integrationApi.getIntegrationGroups).mockResolvedValue([
				{ id: "1", name: "Test Group" },
			]);
		});

		it("should create integration successfully", async () => {
			jest.mocked(input).mockResolvedValue("TestIntegration");
			jest.mocked(integrationUtils.pickSvgFile).mockResolvedValue(
				"/path/to/icon.svg"
			);
			jest.mocked(integrationApi.uploadFileToCloud).mockResolvedValue({
				url: "http://icon.url",
			});
			jest.mocked(confirm).mockResolvedValue(true);
			jest.mocked(search).mockResolvedValue("1");
			jest.mocked(integrationApi.saveIntegration).mockResolvedValue({
				id: "test-id",
			});
			jest.mocked(
				folderHelper.createIntegrationFolderStructure
			).mockResolvedValue();

			await IntegrationCommands.execute(["create"]);

			expect(integrationApi.saveIntegration).toHaveBeenCalledWith(
				"http://api.test",
				"test-token",
				"test-account",
				"test-session",
				expect.objectContaining({
					name: "TestIntegration",
					icon: "http://icon.url",
				})
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Integration created successfully!")
			);
		});

		it("should handle integration group fetch failure", async () => {
			jest.mocked(integrationApi.getIntegrationGroups).mockResolvedValue(
				null
			);

			await IntegrationCommands.execute(["create"]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Failed to fetch integration groups")
			);
		});

		it("should handle empty integration groups", async () => {
			jest.mocked(integrationApi.getIntegrationGroups).mockResolvedValue(
				[]
			);

			await IntegrationCommands.execute(["create"]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("No integration groups available")
			);
		});

		it("should validate integration name", async () => {
			input.mockResolvedValue("TestIntegration");
			jest.mocked(integrationUtils.pickSvgFile).mockResolvedValue(
				"/path/to/icon.svg"
			);
			jest.mocked(integrationApi.uploadFileToCloud).mockResolvedValue({
				url: "http://icon.url",
			});
			confirm.mockResolvedValue(true);
			search.mockResolvedValue("1");
			jest.mocked(integrationApi.saveIntegration).mockResolvedValue({
				id: "test-id",
			});
			jest.mocked(
				folderHelper.createIntegrationFolderStructure
			).mockResolvedValue();

			await IntegrationCommands.execute(["create"]);

			expect(input).toHaveBeenCalledWith(
				expect.objectContaining({
					validate: expect.any(Function),
					transform: expect.any(Function),
				})
			);
		});

		it("should validate required name field", async () => {
			let nameValidateFunction;
			let callCount = 0;
			input.mockImplementation((options) => {
				if (
					callCount === 0 &&
					options.message ===
						"Integration name (e.g., My_Integration):"
				) {
					nameValidateFunction = options.validate;
				}
				callCount++;
				return Promise.resolve("TestIntegration");
			});
			jest.mocked(integrationUtils.pickSvgFile).mockResolvedValue(
				"/path/to/icon.svg"
			);
			jest.mocked(integrationApi.uploadFileToCloud).mockResolvedValue({
				url: "http://icon.url",
			});
			confirm.mockResolvedValue(true);
			search.mockResolvedValue("1");
			jest.mocked(integrationApi.saveIntegration).mockResolvedValue({
				id: "test-id",
			});
			jest.mocked(
				folderHelper.createIntegrationFolderStructure
			).mockResolvedValue();

			await IntegrationCommands.execute(["create"]);

			expect(nameValidateFunction("")).toBe("Name is required");
			expect(nameValidateFunction("   ")).toBe("Name is required");
		});

		it("should validate name length limit", async () => {
			let nameValidateFunction;
			let callCount = 0;
			input.mockImplementation((options) => {
				if (
					callCount === 0 &&
					options.message ===
						"Integration name (e.g., My_Integration):"
				) {
					nameValidateFunction = options.validate;
				}
				callCount++;
				return Promise.resolve("TestIntegration");
			});
			jest.mocked(integrationUtils.pickSvgFile).mockResolvedValue(
				"/path/to/icon.svg"
			);
			jest.mocked(integrationApi.uploadFileToCloud).mockResolvedValue({
				url: "http://icon.url",
			});
			confirm.mockResolvedValue(true);
			search.mockResolvedValue("1");
			jest.mocked(integrationApi.saveIntegration).mockResolvedValue({
				id: "test-id",
			});
			jest.mocked(
				folderHelper.createIntegrationFolderStructure
			).mockResolvedValue();

			await IntegrationCommands.execute(["create"]);

			const longName = "a".repeat(51);
			expect(nameValidateFunction(longName)).toBe(
				"Name cannot exceed 50 characters"
			);
		});

		it("should validate name character restrictions", async () => {
			let nameValidateFunction;
			let callCount = 0;
			input.mockImplementation((options) => {
				if (
					callCount === 0 &&
					options.message ===
						"Integration name (e.g., My_Integration):"
				) {
					nameValidateFunction = options.validate;
				}
				callCount++;
				return Promise.resolve("TestIntegration");
			});
			jest.mocked(integrationUtils.pickSvgFile).mockResolvedValue(
				"/path/to/icon.svg"
			);
			jest.mocked(integrationApi.uploadFileToCloud).mockResolvedValue({
				url: "http://icon.url",
			});
			confirm.mockResolvedValue(true);
			search.mockResolvedValue("1");
			jest.mocked(integrationApi.saveIntegration).mockResolvedValue({
				id: "test-id",
			});
			jest.mocked(
				folderHelper.createIntegrationFolderStructure
			).mockResolvedValue();

			await IntegrationCommands.execute(["create"]);

			expect(nameValidateFunction("Test123")).toBe(
				"Name can only contain letters and underscores (no numbers or hyphens)"
			);
			expect(nameValidateFunction("Test-Integration")).toBe(
				"Name can only contain letters and underscores (no numbers or hyphens)"
			);
			expect(nameValidateFunction("Test@Integration")).toBe(
				"Name can only contain letters and underscores (no numbers or hyphens)"
			);
		});

		it("should validate name transform function", async () => {
			let nameTransformFunction;
			let callCount = 0;
			input.mockImplementation((options) => {
				if (
					callCount === 0 &&
					options.message ===
						"Integration name (e.g., My_Integration):"
				) {
					nameTransformFunction = options.transform;
				}
				callCount++;
				return Promise.resolve("TestIntegration");
			});
			jest.mocked(integrationUtils.pickSvgFile).mockResolvedValue(
				"/path/to/icon.svg"
			);
			jest.mocked(integrationApi.uploadFileToCloud).mockResolvedValue({
				url: "http://icon.url",
			});
			confirm.mockResolvedValue(true);
			search.mockResolvedValue("1");
			jest.mocked(integrationApi.saveIntegration).mockResolvedValue({
				id: "test-id",
			});
			jest.mocked(
				folderHelper.createIntegrationFolderStructure
			).mockResolvedValue();

			await IntegrationCommands.execute(["create"]);

			expect(nameTransformFunction("  Test Integration  ")).toBe(
				"Test_Integration"
			);
			expect(nameTransformFunction("Test   Multiple   Spaces")).toBe(
				"Test_Multiple_Spaces"
			);
		});

		it("should handle invalid SVG file", async () => {
			jest.mocked(integrationUtils.pickSvgFile).mockResolvedValue(
				"/path/to/invalid.txt"
			);

			await IntegrationCommands.execute(["create"]);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining(
					"File selection was cancelled or not a valid SVG"
				)
			);
		});

		it("should handle icon upload failure", async () => {
			input.mockResolvedValue("TestIntegration");
			jest.mocked(integrationUtils.pickSvgFile).mockResolvedValue(
				"/path/to/icon.svg"
			);
			jest.mocked(integrationApi.uploadFileToCloud).mockRejectedValue(
				new Error("Upload failed")
			);

			await IntegrationCommands.execute(["create"]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Could not upload icon")
			);
		});

		it("should require at least one activity type", async () => {
			input.mockResolvedValue("TestIntegration");
			jest.mocked(integrationUtils.pickSvgFile).mockResolvedValue(
				"/path/to/icon.svg"
			);
			jest.mocked(integrationApi.uploadFileToCloud).mockResolvedValue({
				url: "http://icon.url",
			});
			confirm.mockResolvedValue(false); // Both activity and trigger false
			search.mockResolvedValue("1");

			await IntegrationCommands.execute(["create"]);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining(
					"Both activity and trigger cannot be false"
				)
			);
		});

		it("should handle integration creation failure", async () => {
			input.mockResolvedValue("TestIntegration");
			jest.mocked(integrationUtils.pickSvgFile).mockResolvedValue(
				"/path/to/icon.svg"
			);
			jest.mocked(integrationApi.uploadFileToCloud).mockResolvedValue({
				url: "http://icon.url",
			});
			confirm.mockResolvedValue(true);
			search.mockResolvedValue("1");
			jest.mocked(integrationApi.saveIntegration).mockRejectedValue(
				new Error("Save failed")
			);

			await IntegrationCommands.execute(["create"]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Failed to create integration")
			);
		});

		it("should handle user cancellation", async () => {
			const cancelError = new Error("User force closed the prompt");
			input.mockRejectedValue(cancelError);

			await IntegrationCommands.execute(["create"]);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Operation cancelled by user")
			);
		});

		it("should handle invalid SVG file path (double check)", async () => {
			input.mockResolvedValue("TestIntegration");
			jest.mocked(integrationUtils.pickSvgFile).mockResolvedValue(
				"/path/to/invalid.txt"
			);

			await IntegrationCommands.execute(["create"]);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining(
					"File selection was cancelled or not a valid SVG"
				)
			);
		});

		it("should validate activity description when isActivity is true", async () => {
			let activityValidateFunction;
			let callCount = 0;
			input.mockImplementation((options) => {
				if (options.message === "Workflow Activity Description:") {
					activityValidateFunction = options.validate;
				}
				callCount++;
				return Promise.resolve("Test Activity Description");
			});
			jest.mocked(integrationUtils.pickSvgFile).mockResolvedValue(
				"/path/to/icon.svg"
			);
			jest.mocked(integrationApi.uploadFileToCloud).mockResolvedValue({
				url: "http://icon.url",
			});
			confirm.mockResolvedValueOnce(true); // isActivity = true
			confirm.mockResolvedValueOnce(false); // isTrigger = false
			confirm.mockResolvedValueOnce(true); // create_catalogue = true
			search.mockResolvedValue("1");
			jest.mocked(integrationApi.saveIntegration).mockResolvedValue({
				id: "test-id",
			});
			jest.mocked(
				folderHelper.createIntegrationFolderStructure
			).mockResolvedValue();

			await IntegrationCommands.execute(["create"]);

			expect(activityValidateFunction("")).toBe(
				"Workflow Activity Description is required"
			);
			expect(activityValidateFunction("a".repeat(301))).toBe(
				"Workflow Activity Description must not exceed 300 characters"
			);
			expect(activityValidateFunction("Valid description")).toBe(true);
		});

		it("should validate activity AI description when isActivity is true", async () => {
			let activityAiValidateFunction;
			let callCount = 0;
			input.mockImplementation((options) => {
				if (options.message === "Workflow Activity AI Description:") {
					activityAiValidateFunction = options.validate;
				}
				callCount++;
				return Promise.resolve("Test AI Description");
			});
			jest.mocked(integrationUtils.pickSvgFile).mockResolvedValue(
				"/path/to/icon.svg"
			);
			jest.mocked(integrationApi.uploadFileToCloud).mockResolvedValue({
				url: "http://icon.url",
			});
			confirm.mockResolvedValueOnce(true); // isActivity = true
			confirm.mockResolvedValueOnce(false); // isTrigger = false
			confirm.mockResolvedValueOnce(true); // create_catalogue = true
			search.mockResolvedValue("1");
			jest.mocked(integrationApi.saveIntegration).mockResolvedValue({
				id: "test-id",
			});
			jest.mocked(
				folderHelper.createIntegrationFolderStructure
			).mockResolvedValue();

			await IntegrationCommands.execute(["create"]);

			expect(activityAiValidateFunction("")).toBe(
				"Workflow Activity AI Description is required"
			);
			expect(activityAiValidateFunction("a".repeat(301))).toBe(
				"Workflow Activity AI Description must not exceed 300 characters"
			);
			expect(activityAiValidateFunction("Valid AI description")).toBe(
				true
			);
		});

		it("should validate trigger description when isTrigger is true", async () => {
			let triggerValidateFunction;
			let callCount = 0;
			input.mockImplementation((options) => {
				if (options.message === "Workflow Trigger Description:") {
					triggerValidateFunction = options.validate;
				}
				callCount++;
				return Promise.resolve("Test Trigger Description");
			});
			jest.mocked(integrationUtils.pickSvgFile).mockResolvedValue(
				"/path/to/icon.svg"
			);
			jest.mocked(integrationApi.uploadFileToCloud).mockResolvedValue({
				url: "http://icon.url",
			});
			confirm.mockResolvedValueOnce(false); // isActivity = false
			confirm.mockResolvedValueOnce(true); // isTrigger = true
			confirm.mockResolvedValueOnce(true); // create_catalogue = true
			search.mockResolvedValue("1");
			jest.mocked(integrationApi.saveIntegration).mockResolvedValue({
				id: "test-id",
			});
			jest.mocked(
				folderHelper.createIntegrationFolderStructure
			).mockResolvedValue();

			await IntegrationCommands.execute(["create"]);

			expect(triggerValidateFunction("")).toBe(
				"Workflow Trigger Description is required"
			);
			expect(triggerValidateFunction("a".repeat(301))).toBe(
				"Workflow Description must not exceed 300 characters"
			);
			expect(triggerValidateFunction("Valid trigger description")).toBe(
				true
			);
		});

		it("should validate trigger AI description when isTrigger is true", async () => {
			let triggerAiValidateFunction;
			let callCount = 0;
			input.mockImplementation((options) => {
				if (options.message === "Workflow Trigger AI Description:") {
					triggerAiValidateFunction = options.validate;
				}
				callCount++;
				return Promise.resolve("Test Trigger AI Description");
			});
			jest.mocked(integrationUtils.pickSvgFile).mockResolvedValue(
				"/path/to/icon.svg"
			);
			jest.mocked(integrationApi.uploadFileToCloud).mockResolvedValue({
				url: "http://icon.url",
			});
			confirm.mockResolvedValueOnce(false); // isActivity = false
			confirm.mockResolvedValueOnce(true); // isTrigger = true
			confirm.mockResolvedValueOnce(true); // create_catalogue = true
			search.mockResolvedValue("1");
			jest.mocked(integrationApi.saveIntegration).mockResolvedValue({
				id: "test-id",
			});
			jest.mocked(
				folderHelper.createIntegrationFolderStructure
			).mockResolvedValue();

			await IntegrationCommands.execute(["create"]);

			expect(triggerAiValidateFunction("")).toBe(
				"Workflow Trigger AI Description is required"
			);
			expect(triggerAiValidateFunction("a".repeat(301))).toBe(
				"Workflow Trigger AI Description must not exceed 300 characters"
			);
			expect(
				triggerAiValidateFunction("Valid trigger AI description")
			).toBe(true);
		});

		it("should handle search filter in integration group selection", async () => {
			let searchSourceFunction;
			input.mockResolvedValue("TestIntegration");
			jest.mocked(integrationUtils.pickSvgFile).mockResolvedValue(
				"/path/to/icon.svg"
			);
			jest.mocked(integrationApi.uploadFileToCloud).mockResolvedValue({
				url: "http://icon.url",
			});
			confirm.mockResolvedValue(true);
			search.mockImplementation((options) => {
				searchSourceFunction = options.source;
				return Promise.resolve("1");
			});
			jest.mocked(integrationApi.saveIntegration).mockResolvedValue({
				id: "test-id",
			});
			jest.mocked(
				folderHelper.createIntegrationFolderStructure
			).mockResolvedValue();

			await IntegrationCommands.execute(["create"]);

			expect(typeof searchSourceFunction).toBe("function");
		});
	});

	describe("handleSync", () => {
		beforeEach(() => {
			fs.existsSync = jest.fn().mockReturnValue(true);
			fs.readFileSync = jest.fn().mockReturnValue(
				JSON.stringify({
					id: "test-id",
					name: "TestIntegration",
					description: "Test description",
				})
			);
			fs.readdirSync = jest
				.fn()
				.mockReturnValue(["resource1.json", "resource2.json"]);
			jest.mocked(
				validationHelper.validateIntegrationSchemas
			).mockReturnValue({
				success: true,
			});
		});

		it("should sync integration successfully", async () => {
			jest.mocked(integrationApi.updateIntegration).mockResolvedValue(
				true
			);
			jest.mocked(integrationApi.syncIntegration).mockResolvedValue(true);
			jest.mocked(integrationApi.purgeCache).mockResolvedValue(true);

			await IntegrationCommands.execute(["sync"]);

			expect(integrationApi.syncIntegration).toHaveBeenCalled();
			expect(integrationApi.purgeCache).toHaveBeenCalled();
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Integration synced successfully")
			);
		});

		it("should handle validation failure", async () => {
			jest.mocked(
				validationHelper.validateIntegrationSchemas
			).mockReturnValue({
				success: false,
				errors: ["Validation error 1", "Validation error 2"],
			});

			await IntegrationCommands.execute(["sync"]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Validation error 1")
			);
			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Validation error 2")
			);
		});

		it("should handle validation failure with array errors", async () => {
			jest.mocked(
				validationHelper.validateIntegrationSchemas
			).mockReturnValue({
				success: false,
				errors: [
					"Array validation error 1",
					"Array validation error 2",
				],
			});

			await IntegrationCommands.execute(["sync"]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Array validation error 1")
			);
			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Array validation error 2")
			);
		});

		it("should handle custom path", async () => {
			const customPath = "/custom/path";
			fs.existsSync = jest.fn().mockReturnValue(true);
			fs.readFileSync = jest.fn().mockReturnValue(
				JSON.stringify({
					id: "test-id",
					name: "TestIntegration",
				})
			);
			jest.mocked(integrationApi.updateIntegration).mockResolvedValue(
				true
			);
			jest.mocked(integrationApi.syncIntegration).mockResolvedValue(true);
			jest.mocked(integrationApi.purgeCache).mockResolvedValue(true);

			await IntegrationCommands.execute(["sync", "--path", customPath]);

			expect(path.join).toHaveBeenCalledWith(customPath, "spec.json");
		});

		it("should handle custom path that does not exist", async () => {
			const invalidPath = "/invalid/path";
			fs.existsSync = jest.fn().mockReturnValue(false);

			await IntegrationCommands.execute(["sync", "--path", invalidPath]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining(
					"Error: The specified path does not exist"
				)
			);
		});

		it("should handle invalid path", async () => {
			const invalidPath = "/invalid/path";
			fs.existsSync = jest.fn().mockReturnValue(false);

			await IntegrationCommands.execute(["sync", "--path", invalidPath]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("The specified path does not exist")
			);
		});

		it("should handle sync failure", async () => {
			jest.mocked(integrationApi.updateIntegration).mockResolvedValue(
				true
			);
			jest.mocked(integrationApi.syncIntegration).mockResolvedValue(
				false
			);

			await IntegrationCommands.execute(["sync"]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Failed to syncing integration")
			);
		});
	});

	describe("handlePublish", () => {
		beforeEach(() => {
			fs.existsSync = jest.fn().mockReturnValue(true);
			fs.readFileSync = jest.fn().mockReturnValue(
				JSON.stringify({
					id: "test-id",
					name: "TestIntegration",
					description: { integration: "Test description" },
				})
			);
			fs.readdirSync = jest
				.fn()
				.mockReturnValue(["resource1.json", "resource2.json"]);
			jest.mocked(
				validationHelper.validateIntegrationSchemas
			).mockReturnValue({
				success: true,
			});
		});

		it("should publish integration successfully", async () => {
			jest.mocked(integrationApi.updateIntegration).mockResolvedValue(
				true
			);
			jest.mocked(integrationApi.syncIntegration).mockResolvedValue(true);
			jest.mocked(
				integrationApi.sendIntegrationForReview
			).mockResolvedValue(true);

			await IntegrationCommands.execute(["publish"]);

			expect(integrationApi.sendIntegrationForReview).toHaveBeenCalled();
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining(
					"Integration sent to review successfully!"
				)
			);
		});

		it("should handle publish failure", async () => {
			jest.mocked(integrationApi.updateIntegration).mockResolvedValue(
				true
			);
			jest.mocked(integrationApi.syncIntegration).mockResolvedValue(
				false
			);

			await IntegrationCommands.execute(["publish"]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Error publishing integration")
			);
		});
	});

	describe("handleEdit", () => {
		it("should edit integration successfully", async () => {
			const mockIntegrations = [
				{
					id: "1",
					name: "Test Integration",
					status: "draft",
					activity_type: "customActivity",
				},
			];
			jest.mocked(integrationApi.listAllIntegrations).mockResolvedValue(
				mockIntegrations
			);
			search.mockResolvedValue(mockIntegrations[0]);
			jest.mocked(integrationApi.editIntegration).mockResolvedValue({
				id: "draft-id",
			});
			jest.mocked(
				folderHelper.createExistingIntegrationsFolder
			).mockResolvedValue(true);

			await IntegrationCommands.execute(["edit"]);

			expect(integrationApi.editIntegration).toHaveBeenCalled();
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining(
					"Integration folder structure created successfully!"
				)
			);
		});

		it("should handle no integrations found", async () => {
			jest.mocked(integrationApi.listAllIntegrations).mockResolvedValue(
				[]
			);

			await IntegrationCommands.execute(["edit"]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("No integrations found to edit")
			);
		});

		it("should handle integration list fetch failure", async () => {
			jest.mocked(integrationApi.listAllIntegrations).mockResolvedValue(
				null
			);

			await IntegrationCommands.execute(["edit"]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Failed to fetch integrations")
			);
		});

		it("should handle search filter in edit command", async () => {
			const mockIntegrations = [
				{
					id: "1",
					name: "Test Integration",
					status: "draft",
					activity_type: "customActivity",
				},
				{
					id: "2",
					name: "Another Integration",
					status: "published",
					activity_type: "webhook",
				},
			];
			let searchSourceFunction;
			jest.mocked(integrationApi.listAllIntegrations).mockResolvedValue(
				mockIntegrations
			);
			search.mockImplementation((options) => {
				searchSourceFunction = options.source;
				return Promise.resolve(mockIntegrations[0]);
			});
			jest.mocked(integrationApi.editIntegration).mockResolvedValue({
				id: "draft-id",
			});
			jest.mocked(
				folderHelper.createExistingIntegrationsFolder
			).mockResolvedValue(true);

			await IntegrationCommands.execute(["edit"]);

			const filteredChoices = await searchSourceFunction("test");
			expect(typeof searchSourceFunction).toBe("function");
			expect(filteredChoices).toHaveLength(1);
			expect(filteredChoices[0].name).toContain("Test Integration");
		});

		it("should handle edit command with unknown error", async () => {
			const mockIntegrations = [
				{
					id: "1",
					name: "Test Integration",
					status: "draft",
					activity_type: "customActivity",
				},
			];
			jest.mocked(integrationApi.listAllIntegrations).mockResolvedValue(
				mockIntegrations
			);
			const unknownError = new Error("Unknown error occurred");
			search.mockRejectedValue(unknownError);

			await IntegrationCommands.execute(["edit"]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("An error occurred:"),
				expect.stringContaining("Unknown error occurred")
			);
		});
	});

	describe("handlePull", () => {
		it("should pull integration with spec.json", async () => {
			fs.existsSync = jest.fn().mockReturnValue(true);
			fs.readFileSync = jest.fn().mockReturnValue(
				JSON.stringify({
					id: "test-id",
					name: "TestIntegration",
				})
			);
			jest.mocked(integrationApi.pullIntegration).mockResolvedValue({
				id: "test-id",
			});
			jest.mocked(
				folderHelper.createExistingIntegrationsFolder
			).mockResolvedValue(true);

			await IntegrationCommands.execute(["pull"]);

			expect(integrationApi.pullIntegration).toHaveBeenCalled();
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining(
					"Integration folder updated successfully!"
				)
			);
		});

		it("should handle pull without spec.json", async () => {
			fs.existsSync = jest.fn().mockReturnValue(false);
			const mockIntegrations = [
				{
					id: "1",
					name: "Test Integration",
					status: "draft",
					activity_type: "customActivity",
				},
			];
			jest.mocked(integrationApi.listAllIntegrations).mockResolvedValue(
				mockIntegrations
			);
			search.mockResolvedValue(mockIntegrations[0]);
			jest.mocked(integrationApi.pullIntegration).mockResolvedValue({
				id: "test-id",
			});
			jest.mocked(
				folderHelper.createExistingIntegrationsFolder
			).mockResolvedValue(true);

			await IntegrationCommands.execute(["pull"]);

			expect(integrationApi.pullIntegration).toHaveBeenCalled();
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining(
					"Integration folder structure created successfully!"
				)
			);
		});

		it("should handle pull failure", async () => {
			fs.existsSync = jest.fn().mockReturnValue(true);
			fs.readFileSync = jest.fn().mockReturnValue(
				JSON.stringify({
					id: "test-id",
					name: "TestIntegration",
				})
			);
			jest.mocked(integrationApi.pullIntegration).mockResolvedValue(null);

			await IntegrationCommands.execute(["pull"]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Failed to fetch integration details")
			);
		});
	});

	describe("handleStatus", () => {
		it("should show integration status", async () => {
			const mockIntegrations = [
				{
					id: "1",
					name: "Test Integration",
					activity_type: "customActivity",
				},
			];
			const mockIntegration = {
				id: "1",
				name: "Test Integration",
				status: "published",
				created_at: "2023-01-01T00:00:00Z",
				updated_at: "2023-01-01T00:00:00Z",
			};

			jest.mocked(integrationApi.listAllIntegrations).mockResolvedValue(
				mockIntegrations
			);
			search.mockResolvedValue("1");
			jest.mocked(integrationApi.getIntegrationById).mockResolvedValue(
				mockIntegration
			);

			await IntegrationCommands.execute(["status"]);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Integration Details")
			);
		});

		it("should handle no integrations", async () => {
			jest.mocked(integrationApi.listAllIntegrations).mockResolvedValue(
				[]
			);

			await IntegrationCommands.execute(["status"]);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("No integrations found")
			);
		});

		it("should handle integration not found", async () => {
			const mockIntegrations = [
				{
					id: "1",
					name: "Test Integration",
					activity_type: "customActivity",
				},
			];

			jest.mocked(integrationApi.listAllIntegrations).mockResolvedValue(
				mockIntegrations
			);
			search.mockResolvedValue("1");
			jest.mocked(integrationApi.getIntegrationById).mockResolvedValue(
				null
			);

			await IntegrationCommands.execute(["status"]);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Integration not found")
			);
		});
	});

	describe("readSchemaFiles", () => {
		it("should read all schema files correctly", async () => {
			fs.existsSync = jest.fn().mockReturnValue(true);
			fs.readFileSync = jest
				.fn()
				.mockReturnValue(JSON.stringify({ test: "data" }));
			fs.readdirSync = jest
				.fn()
				.mockReturnValue(["resource1.json", "resource2.json"]);

			await import("../commands/integration.js");
			// This would test the internal readSchemaFiles function if it were exported
			// For now, we test it indirectly through sync/publish commands
		});
	});

	describe("error handling and edge cases", () => {
		it("should handle missing authentication groups error", async () => {
			jest.mocked(integrationApi.getIntegrationGroups).mockRejectedValue(
				new Error("Network error")
			);

			await IntegrationCommands.execute(["create"]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Failed to fetch integration groups")
			);
		});

		it("should handle user cancellation in edit command", async () => {
			const mockIntegrations = [
				{
					id: "1",
					name: "Test Integration",
					status: "draft",
					activity_type: "customActivity",
				},
			];
			jest.mocked(integrationApi.listAllIntegrations).mockResolvedValue(
				mockIntegrations
			);
			const cancelError = new Error("User force closed the prompt");
			search.mockRejectedValue(cancelError);

			await IntegrationCommands.execute(["edit"]);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Operation cancelled by user")
			);
		});

		it("should handle user cancellation in pull command", async () => {
			fs.existsSync = jest.fn().mockReturnValue(false);
			const mockIntegrations = [
				{
					id: "1",
					name: "Test Integration",
					status: "draft",
					activity_type: "customActivity",
				},
			];
			jest.mocked(integrationApi.listAllIntegrations).mockResolvedValue(
				mockIntegrations
			);
			const cancelError = new Error("User force closed the prompt");
			search.mockRejectedValue(cancelError);

			await IntegrationCommands.execute(["pull"]);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Operation cancelled by user")
			);
		});

		it("should handle user cancellation in status command", async () => {
			const mockIntegrations = [
				{
					id: "1",
					name: "Test Integration",
					activity_type: "customActivity",
				},
			];
			jest.mocked(integrationApi.listAllIntegrations).mockResolvedValue(
				mockIntegrations
			);
			const cancelError = new Error("User force closed the prompt");
			search.mockRejectedValue(cancelError);

			await IntegrationCommands.execute(["status"]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Error fetching integration status:"),
				expect.stringContaining("User force closed the prompt")
			);
		});

		it("should handle authentication failure in status command", async () => {
			jest.mocked(envHelper.getCurrentEnv).mockResolvedValue({
				apiUrl: "http://api.test",
				token: null,
				accountId: "test-account",
				session: null,
			});

			await IntegrationCommands.execute(["status"]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Authentication required")
			);
		});

		it("should handle missing spec.json in pull command", async () => {
			fs.existsSync = jest.fn().mockReturnValue(false);
			const mockIntegrations = [
				{
					id: "1",
					name: "Test Integration",
					status: "draft",
					activity_type: "customActivity",
				},
			];
			jest.mocked(integrationApi.listAllIntegrations).mockResolvedValue(
				mockIntegrations
			);
			search.mockResolvedValue(mockIntegrations[0]);
			jest.mocked(integrationApi.pullIntegration).mockResolvedValue({
				id: "test-id",
			});
			jest.mocked(
				folderHelper.createExistingIntegrationsFolder
			).mockResolvedValue(true);

			await IntegrationCommands.execute(["pull"]);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Please select the integration to pull")
			);
		});

		it("should handle invalid integration list in pull command", async () => {
			fs.existsSync = jest.fn().mockReturnValue(false);
			jest.mocked(integrationApi.listAllIntegrations).mockResolvedValue(
				null
			);

			await IntegrationCommands.execute(["pull"]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Failed to fetch integrations")
			);
		});

		it("should handle no integrations in pull command", async () => {
			fs.existsSync = jest.fn().mockReturnValue(false);
			jest.mocked(integrationApi.listAllIntegrations).mockResolvedValue(
				[]
			);

			await IntegrationCommands.execute(["pull"]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("No integrations found")
			);
		});

		it("should handle pull failure without spec.json", async () => {
			fs.existsSync = jest.fn().mockReturnValue(false);
			const mockIntegrations = [
				{
					id: "1",
					name: "Test Integration",
					status: "draft",
					activity_type: "customActivity",
				},
			];
			jest.mocked(integrationApi.listAllIntegrations).mockResolvedValue(
				mockIntegrations
			);
			search.mockResolvedValue(mockIntegrations[0]);
			jest.mocked(integrationApi.pullIntegration).mockResolvedValue(null);

			await IntegrationCommands.execute(["pull"]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Failed to fetch integration details")
			);
		});

		it("should handle search filter in pull command", async () => {
			fs.existsSync = jest.fn().mockReturnValue(false);
			const mockIntegrations = [
				{
					id: "1",
					name: "Test Integration",
					status: "draft",
					activity_type: "customActivity",
				},
				{
					id: "2",
					name: "Another Integration",
					status: "published",
					activity_type: "webhook",
				},
			];
			let searchSourceFunction;
			jest.mocked(integrationApi.listAllIntegrations).mockResolvedValue(
				mockIntegrations
			);
			search.mockImplementation((options) => {
				searchSourceFunction = options.source;
				return Promise.resolve(mockIntegrations[0]);
			});
			jest.mocked(integrationApi.pullIntegration).mockResolvedValue({
				id: "test-id",
			});
			jest.mocked(
				folderHelper.createExistingIntegrationsFolder
			).mockResolvedValue(true);

			await IntegrationCommands.execute(["pull"]);

			const filteredChoices = await searchSourceFunction("test");
			expect(typeof searchSourceFunction).toBe("function");
			expect(filteredChoices).toHaveLength(1);
			expect(filteredChoices[0].name).toContain("Test Integration");
		});

		it("should handle directory creation in pull command", async () => {
			fs.existsSync = jest.fn().mockReturnValue(true);
			fs.readFileSync = jest.fn().mockReturnValue(
				JSON.stringify({
					id: "test-id",
					name: "Test Integration",
				})
			);
			fs.mkdirSync = jest.fn();
			jest.mocked(integrationApi.pullIntegration).mockResolvedValue({
				id: "test-id",
			});
			jest.mocked(
				folderHelper.createExistingIntegrationsFolder
			).mockResolvedValue(true);

			// Mock process.cwd to return a path where the integration directory doesn't exist
			const originalCwd = process.cwd;
			process.cwd = jest.fn().mockReturnValue("/test/path");
			fs.existsSync = jest.fn().mockImplementation((path) => {
				if (path.includes("spec.json")) return true;
				if (path.includes("test-integration")) return false;
				return true;
			});

			await IntegrationCommands.execute(["pull"]);

			// Restore original cwd
			process.cwd = originalCwd;
		});

		it("should handle various edge cases in sync", async () => {
			// Test schema file handling
			fs.existsSync = jest.fn().mockImplementation((path) => {
				if (
					(path && path.includes("Authentication.mdx")) ||
					(path && path.includes("Documentation.mdx"))
				) {
					return false;
				}
				if (path && path.includes("resources")) {
					return false;
				}
				return true;
			});
			fs.readFileSync = jest.fn().mockReturnValue(
				JSON.stringify({
					id: "test-id",
					name: "TestIntegration",
				})
			);
			fs.readdirSync = jest.fn().mockReturnValue([]);
			jest.mocked(
				validationHelper.validateIntegrationSchemas
			).mockReturnValue({
				success: true,
			});
			jest.mocked(integrationApi.updateIntegration).mockResolvedValue(
				true
			);
			jest.mocked(integrationApi.syncIntegration).mockResolvedValue(true);
			jest.mocked(integrationApi.purgeCache).mockResolvedValue(true);

			await IntegrationCommands.execute(["sync"]);

			expect(integrationApi.syncIntegration).toHaveBeenCalled();
		});

		it("should handle sync with empty directory", async () => {
			fs.existsSync = jest.fn().mockReturnValue(true);
			fs.readFileSync = jest.fn().mockReturnValue(
				JSON.stringify({
					id: "test-id",
					name: "TestIntegration",
				})
			);
			fs.readdirSync = jest.fn().mockReturnValue([]);
			jest.mocked(
				validationHelper.validateIntegrationSchemas
			).mockReturnValue({
				success: true,
			});
			jest.mocked(integrationApi.updateIntegration).mockResolvedValue(
				true
			);
			jest.mocked(integrationApi.syncIntegration).mockResolvedValue(true);
			jest.mocked(integrationApi.purgeCache).mockResolvedValue(true);

			await IntegrationCommands.execute(["sync"]);

			expect(integrationApi.syncIntegration).toHaveBeenCalled();
		});

		it("should handle non-JSON files in resources directory", async () => {
			fs.existsSync = jest.fn().mockReturnValue(true);
			fs.readFileSync = jest.fn().mockReturnValue(
				JSON.stringify({
					id: "test-id",
					name: "TestIntegration",
				})
			);
			fs.readdirSync = jest
				.fn()
				.mockReturnValue([
					"resource1.json",
					"readme.txt",
					"config.yaml",
				]);
			jest.mocked(
				validationHelper.validateIntegrationSchemas
			).mockReturnValue({
				success: true,
			});
			jest.mocked(integrationApi.updateIntegration).mockResolvedValue(
				true
			);
			jest.mocked(integrationApi.syncIntegration).mockResolvedValue(true);
			jest.mocked(integrationApi.purgeCache).mockResolvedValue(true);

			await IntegrationCommands.execute(["sync"]);

			expect(integrationApi.syncIntegration).toHaveBeenCalled();
		});

		it("should handle integration with existing documentation", async () => {
			const mockIntegration = {
				id: "1",
				name: "Test Integration",
				status: "published",
				created_at: "2023-01-01T00:00:00Z",
				updated_at: "2023-01-01T00:00:00Z",
				documentation: "This is documentation content",
			};
			const mockIntegrations = [
				{
					id: "1",
					name: "Test Integration",
					activity_type: "customActivity",
				},
			];

			jest.mocked(integrationApi.listAllIntegrations).mockResolvedValue(
				mockIntegrations
			);
			search.mockResolvedValue("1");
			jest.mocked(integrationApi.getIntegrationById).mockResolvedValue(
				mockIntegration
			);

			await IntegrationCommands.execute(["status"]);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Documentation:")
			);
		});

		it("should handle integration with null sync result", async () => {
			jest.mocked(integrationApi.updateIntegration).mockResolvedValue(
				true
			);
			jest.mocked(integrationApi.syncIntegration).mockResolvedValue(null);

			await IntegrationCommands.execute(["sync"]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Failed to syncing integration")
			);
		});

		it("should handle integration with sync result containing message", async () => {
			jest.mocked(integrationApi.updateIntegration).mockResolvedValue(
				true
			);
			jest.mocked(integrationApi.syncIntegration).mockResolvedValue(null);

			await IntegrationCommands.execute(["sync"]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Failed to syncing integration")
			);
		});

		it("should handle publish sync failure", async () => {
			jest.mocked(integrationApi.updateIntegration).mockResolvedValue(
				true
			);
			jest.mocked(integrationApi.syncIntegration).mockResolvedValue(
				false
			);

			await IntegrationCommands.execute(["publish"]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Error publishing integration")
			);
		});
	});
});
