import { jest } from "@jest/globals";

// Mock all dependencies before importing the module
const mockConfirm = jest.fn();
const mockInput = jest.fn();
const mockSearch = jest.fn();
const mockGetCurrentEnv = jest.fn();
const mockPickSvgFile = jest.fn();

// Mock file system
const mockExists = jest.fn();
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();
const mockReaddir = jest.fn();
const mockMkdir = jest.fn();

// Mock API functions
const mockGetIntegrationGroups = jest.fn();
const mockListAllIntegrations = jest.fn();
const mockSaveIntegration = jest.fn();
const mockUpdateIntegration = jest.fn();
const mockSyncIntegration = jest.fn();
const mockSendIntegrationForReview = jest.fn();
const mockEditIntegration = jest.fn();
const mockGetIntegrationById = jest.fn();
const mockPullIntegration = jest.fn();
const mockPurgeCache = jest.fn();
const mockUploadFileToCloud = jest.fn();

// Mock validation functions
const mockValidateIntegrationSchemas = jest.fn();

// Mock helper functions
const mockCreateIntegrationFolderStructure = jest.fn();
const mockCreateExistingIntegrationsFolder = jest.fn();

jest.mock("@inquirer/prompts", () => ({
	confirm: mockConfirm,
	input: mockInput,
	search: mockSearch,
}));

const mockChalk = {
	red: jest.fn((str) => str),
	green: jest.fn((str) => str),
	cyan: jest.fn((str) => str),
	yellow: jest.fn((str) => str),
	blue: jest.fn((str) => str),
	bold: jest.fn((str) => str),
	dim: jest.fn((str) => str),
	underline: {
		blue: jest.fn((str) => str),
	},
	bgGreen: {
		black: jest.fn((str) => str),
	},
	bgRed: {
		white: jest.fn((str) => str),
	},
};
mockChalk.cyan.bold = jest.fn((str) => str);
mockChalk.green.bold = jest.fn((str) => str);
mockChalk.red.bold = jest.fn((str) => str);

jest.mock("chalk", () => mockChalk);

jest.mock("fs", () => ({
	existsSync: mockExists,
	readFileSync: mockReadFile,
	writeFileSync: mockWriteFile,
	readdirSync: mockReaddir,
	mkdirSync: mockMkdir,
}));

jest.mock("path", () => ({
	join: jest.fn((...args) => args.join("/")),
	basename: jest.fn((filePath, ext) => {
		const name = filePath.split("/").pop();
		return ext ? name.replace(ext, "") : name;
	}),
}));

jest.mock("../api/integration.js", () => ({
	getIntegrationGroups: mockGetIntegrationGroups,
	listAllIntegrations: mockListAllIntegrations,
	saveIntegration: mockSaveIntegration,
	updateIntegration: mockUpdateIntegration,
	syncIntegration: mockSyncIntegration,
	sendIntegrationForReview: mockSendIntegrationForReview,
	editIntegration: mockEditIntegration,
	getIntegrationById: mockGetIntegrationById,
	pullIntegration: mockPullIntegration,
	purgeCache: mockPurgeCache,
	uploadFileToCloud: mockUploadFileToCloud,
}));

jest.mock("../helper/folder.js", () => ({
	createIntegrationFolderStructure: mockCreateIntegrationFolderStructure,
	createExistingIntegrationsFolder: mockCreateExistingIntegrationsFolder,
}));

jest.mock("../helper/env.js", () => ({
	getCurrentEnv: mockGetCurrentEnv,
}));

jest.mock("../utils/integration.js", () => ({
	pickSvgFile: mockPickSvgFile,
}));

jest.mock("../helper/validation.js", () => ({
	validateIntegrationSchemas: mockValidateIntegrationSchemas,
}));

// Import the module after mocking
let IntegrationCommands;

describe("Integration Commands", () => {
	let consoleSpy;
	let consoleErrorSpy;
	let processExitSpy;
	let processCwdSpy;

	beforeAll(async () => {
		IntegrationCommands = await import("../commands/integration.js");
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
		processCwdSpy = jest.spyOn(process, "cwd").mockReturnValue("/test/dir");

		// Default mocks
		mockGetCurrentEnv.mockResolvedValue({
			apiUrl: "https://api.test.com",
			token: "test-token",
			accountId: "test-account",
			session: "test-session",
			frontendUrl: "https://frontend.test.com",
		});

		// Default validation mock
		mockValidateIntegrationSchemas.mockReturnValue({
			success: true,
			errors: [],
		});

		// Default file system mocks
		mockReaddir.mockReturnValue(["resource1.json", "resource2.json"]);
	});

	afterEach(() => {
		consoleSpy.mockRestore();
		consoleErrorSpy.mockRestore();
		processExitSpy.mockRestore();
		processCwdSpy.mockRestore();
	});

	describe("execute", () => {
		it("should show help when no subcommand is provided", async () => {
			await IntegrationCommands.default.execute([]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("Integration Commands:")
			);
		});

		it("should show help when invalid subcommand is provided", async () => {
			await IntegrationCommands.default.execute(["invalid"]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("Integration Commands:")
			);
		});

		it("should execute create command", async () => {
			mockGetIntegrationGroups.mockResolvedValue([
				{ id: 1, name: "Test Group" },
			]);
			mockInput.mockResolvedValue("Test Integration");
			mockPickSvgFile.mockResolvedValue("/path/to/icon.svg");
			mockUploadFileToCloud.mockResolvedValue({
				url: "https://example.com/icon.svg",
			});
			mockSearch.mockResolvedValue("Test Group");
			mockConfirm.mockResolvedValue(true);
			mockSaveIntegration.mockResolvedValue({ id: 123 });
			mockCreateIntegrationFolderStructure.mockResolvedValue();

			await IntegrationCommands.default.execute(["create"]);

			expect(mockGetIntegrationGroups).toHaveBeenCalled();
		});

		it("should execute sync command", async () => {
			mockExists.mockReturnValue(true);
			mockReadFile.mockReturnValue('{"name": "test", "id": 123}');
			mockSyncIntegration.mockResolvedValue(true);
			mockUpdateIntegration.mockResolvedValue(true);
			mockPurgeCache.mockResolvedValue();

			await IntegrationCommands.default.execute(["sync"]);

			expect(mockExists).toHaveBeenCalled();
			expect(mockValidateIntegrationSchemas).toHaveBeenCalled();
		});

		it("should execute publish command", async () => {
			mockExists.mockReturnValue(true);
			mockReadFile.mockReturnValue('{"name": "test", "id": 123}');
			mockSyncIntegration.mockResolvedValue(true);
			mockUpdateIntegration.mockResolvedValue(true);
			mockSendIntegrationForReview.mockResolvedValue(true);

			await IntegrationCommands.default.execute(["publish"]);

			expect(mockExists).toHaveBeenCalled();
			expect(mockValidateIntegrationSchemas).toHaveBeenCalled();
		});

		it("should execute edit command", async () => {
			mockListAllIntegrations.mockResolvedValue([
				{ id: 1, name: "Test Integration" },
			]);
			mockSearch.mockResolvedValue("Test Integration");
			mockCreateExistingIntegrationsFolder.mockResolvedValue();

			await IntegrationCommands.default.execute(["edit"]);

			expect(mockListAllIntegrations).toHaveBeenCalled();
		});

		it("should execute pull command", async () => {
			mockExists.mockReturnValue(true);
			mockReadFile.mockReturnValue('{"id": 123, "name": "test"}');
			mockPullIntegration.mockResolvedValue({ name: "test" });
			mockCreateExistingIntegrationsFolder.mockResolvedValue(true);

			await IntegrationCommands.default.execute(["pull"]);

			expect(mockPullIntegration).toHaveBeenCalled();
		});

		it("should execute status command", async () => {
			mockListAllIntegrations.mockResolvedValue([
				{
					id: 1,
					name: "Test Integration",
					activity_type: "customActivity",
				},
			]);
			mockSearch.mockResolvedValue(1);
			mockGetIntegrationById.mockResolvedValue({
				id: 123,
				name: "Test Integration",
				status: "active",
				created_at: "2023-01-01T00:00:00Z",
				updated_at: "2023-01-02T00:00:00Z",
			});

			await IntegrationCommands.default.execute(["status"]);

			expect(mockGetIntegrationById).toHaveBeenCalled();
		});

		it("should execute help command", async () => {
			await IntegrationCommands.default.execute(["help"]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("Integration Commands:")
			);
		});
	});

	describe("handleCreate", () => {
		beforeEach(() => {
			mockGetIntegrationGroups.mockResolvedValue([
				{ id: 1, name: "Analytics" },
				{ id: 2, name: "CRM" },
			]);
		});

		it("should create integration successfully", async () => {
			mockInput
				.mockResolvedValueOnce("Test_Integration") // name
				.mockResolvedValueOnce("Activity description") // activity description
				.mockResolvedValueOnce("AI activity description"); // activity ai description
			mockPickSvgFile.mockResolvedValue("/path/to/icon.svg");
			mockUploadFileToCloud.mockResolvedValue({
				url: "https://example.com/icon.svg",
			});
			mockSearch.mockResolvedValue(1); // integration group id
			mockConfirm
				.mockResolvedValueOnce(true) // activity
				.mockResolvedValueOnce(false) // trigger
				.mockResolvedValueOnce(true); // create catalogue
			mockSaveIntegration.mockResolvedValue({ id: 123 });
			mockCreateIntegrationFolderStructure.mockResolvedValue();

			// Simulate calling handleCreate directly
			await IntegrationCommands.default.execute(["create"]);

			expect(mockInput).toHaveBeenCalledWith({
				message: "Integration name (e.g., My_Integration):",
				validate: expect.any(Function),
				transform: expect.any(Function),
			});
			expect(mockSaveIntegration).toHaveBeenCalled();
		});

		it("should handle integration group fetch failure", async () => {
			mockGetIntegrationGroups.mockRejectedValue(new Error("API Error"));

			await IntegrationCommands.default.execute(["create"]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("❌ Failed to fetch integration groups")
			);
		});

		it("should handle empty integration groups", async () => {
			mockGetIntegrationGroups.mockResolvedValue([]);

			await IntegrationCommands.default.execute(["create"]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("No integration groups available")
			);
		});

		it("should validate integration name", async () => {
			mockInput
				.mockResolvedValueOnce("Valid_Name") // Valid name
				.mockResolvedValueOnce("Activity description") // Activity description
				.mockResolvedValueOnce("AI activity description"); // Activity AI description
			mockPickSvgFile.mockResolvedValue("/path/to/icon.svg");
			mockUploadFileToCloud.mockResolvedValue({
				url: "https://example.com/icon.svg",
			});
			mockSearch.mockResolvedValue(1);
			mockConfirm
				.mockResolvedValueOnce(true) // activity
				.mockResolvedValueOnce(false) // trigger
				.mockResolvedValueOnce(true); // create catalogue
			mockSaveIntegration.mockResolvedValue({ id: 123 });
			mockCreateIntegrationFolderStructure.mockResolvedValue();

			await IntegrationCommands.default.execute(["create"]);

			// Verify validation was called
			expect(mockInput).toHaveBeenCalledWith({
				message: "Integration name (e.g., My_Integration):",
				validate: expect.any(Function),
				transform: expect.any(Function),
			});
		});

		it("should handle invalid SVG file", async () => {
			mockInput.mockResolvedValue("Test_Integration");
			mockPickSvgFile.mockResolvedValue(null); // User cancelled or invalid file

			await IntegrationCommands.default.execute(["create"]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("⚠️  File selection was cancelled")
			);
		});

		it("should handle icon upload failure", async () => {
			mockInput.mockResolvedValue("Test_Integration");
			mockPickSvgFile.mockResolvedValue("/path/to/icon.svg");
			mockUploadFileToCloud.mockRejectedValue(new Error("Upload failed"));

			await IntegrationCommands.default.execute(["create"]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("❌ Could not upload icon")
			);
		});

		it("should require at least one activity type", async () => {
			mockInput.mockResolvedValue("Test_Integration");
			mockPickSvgFile.mockResolvedValue("/path/to/icon.svg");
			mockUploadFileToCloud.mockResolvedValue({
				url: "https://example.com/icon.svg",
			});
			mockSearch.mockResolvedValue(1);
			mockConfirm
				.mockResolvedValueOnce(false) // activity
				.mockResolvedValueOnce(false); // trigger

			await IntegrationCommands.default.execute(["create"]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					"❌ Both activity and trigger cannot be false"
				)
			);
		});

		it("should handle integration creation failure", async () => {
			mockInput
				.mockResolvedValueOnce("Test_Integration")
				.mockResolvedValueOnce("Activity description")
				.mockResolvedValueOnce("AI activity description");
			mockPickSvgFile.mockResolvedValue("/path/to/icon.svg");
			mockUploadFileToCloud.mockResolvedValue({
				url: "https://example.com/icon.svg",
			});
			mockSearch.mockResolvedValue(1);
			mockConfirm
				.mockResolvedValueOnce(true) // activity
				.mockResolvedValueOnce(false) // trigger
				.mockResolvedValueOnce(true); // create catalogue
			mockSaveIntegration.mockRejectedValue(new Error("Save failed"));

			await IntegrationCommands.default.execute(["create"]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("❌ Failed to create integration")
			);
		});

		it("should handle user cancellation", async () => {
			mockInput.mockResolvedValue("Test_Integration");
			mockPickSvgFile.mockResolvedValue(null); // User cancelled file selection

			await IntegrationCommands.default.execute(["create"]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("⚠️  File selection was cancelled")
			);
		});
	});

	describe("handleSync", () => {
		it("should sync integration successfully", async () => {
			mockExists.mockReturnValue(true);
			mockReadFile.mockReturnValue('{"name": "test", "id": 123}');
			mockSyncIntegration.mockResolvedValue(true);
			mockUpdateIntegration.mockResolvedValue(true);
			mockPurgeCache.mockResolvedValue();

			await IntegrationCommands.default.execute(["sync"]);

			expect(mockSyncIntegration).toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("• Integration synced successfully")
			);
		});

		it("should handle validation failure", async () => {
			mockExists.mockReturnValue(true);
			mockReadFile.mockReturnValue('{"name": "test", "id": 123}');
			mockValidateIntegrationSchemas.mockReturnValue({
				success: false,
				errors: ["Validation error 1", "Validation error 2"],
			});
			mockUpdateIntegration.mockResolvedValue(true);

			await IntegrationCommands.default.execute(["sync"]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("❌ Validation error 1")
			);
		});

		it("should handle custom path", async () => {
			mockExists.mockReturnValue(true);
			mockReadFile.mockReturnValue('{"name": "test", "id": 123}');
			mockSyncIntegration.mockResolvedValue(true);
			mockUpdateIntegration.mockResolvedValue(true);
			mockPurgeCache.mockResolvedValue();

			await IntegrationCommands.default.execute([
				"sync",
				"--path",
				"/custom/path",
			]);

			expect(mockSyncIntegration).toHaveBeenCalled();
		});

		it("should handle invalid path", async () => {
			mockExists.mockReturnValueOnce(false); // Custom path doesn't exist

			await IntegrationCommands.default.execute([
				"sync",
				"--path",
				"/invalid/path",
			]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					"Error: The specified path does not exist"
				)
			);
		});

		it("should handle sync failure", async () => {
			mockExists.mockReturnValue(true);
			mockReadFile.mockReturnValue('{"name": "test", "id": 123}');
			mockUpdateIntegration.mockResolvedValue(true);
			mockSyncIntegration.mockRejectedValue(new Error("Sync failed"));

			// The sync function doesn't handle errors, so it will throw
			await expect(
				IntegrationCommands.default.execute(["sync"])
			).rejects.toThrow("Sync failed");
		});
	});

	describe("handlePublish", () => {
		it("should publish integration successfully", async () => {
			mockExists.mockReturnValue(true);
			mockReadFile.mockReturnValue('{"name": "test", "id": 123}');
			mockUpdateIntegration.mockResolvedValue(true);
			mockSyncIntegration.mockResolvedValue(true);
			mockSendIntegrationForReview.mockResolvedValue(true);

			await IntegrationCommands.default.execute(["publish"]);

			expect(mockSendIntegrationForReview).toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					"✅ Integration sent to review successfully"
				)
			);
		});

		it("should handle publish failure", async () => {
			mockExists.mockReturnValue(true);
			mockReadFile.mockReturnValue('{"name": "test", "id": 123}');
			mockUpdateIntegration.mockResolvedValue(true);
			mockSyncIntegration.mockResolvedValue(false); // sync fails

			await IntegrationCommands.default.execute(["publish"]);

			expect(mockSyncIntegration).toHaveBeenCalled();
			// The publish should not proceed if sync fails
		});
	});

	describe("handleEdit", () => {
		it("should edit integration successfully", async () => {
			mockListAllIntegrations.mockResolvedValue([
				{
					id: 1,
					name: "Integration 1",
					activity_type: "customActivity",
				},
				{ id: 2, name: "Integration 2", trigger_type: "CloudTrigger" },
			]);
			mockSearch.mockResolvedValue({
				id: 1,
				name: "Integration 1",
				activity_type: "customActivity",
			});
			mockEditIntegration.mockResolvedValue({
				id: 1,
				name: "Integration 1",
			});
			mockCreateExistingIntegrationsFolder.mockResolvedValue(true);

			await IntegrationCommands.default.execute(["edit"]);

			expect(mockListAllIntegrations).toHaveBeenCalled();
			expect(mockCreateExistingIntegrationsFolder).toHaveBeenCalled();
		});

		it("should handle no integrations found", async () => {
			mockListAllIntegrations.mockResolvedValue([]);

			await IntegrationCommands.default.execute(["edit"]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("No integrations found")
			);
		});

		it("should handle integration list fetch failure", async () => {
			mockListAllIntegrations.mockRejectedValue(new Error("API Error"));

			await IntegrationCommands.default.execute(["edit"]);

			// The actual error message from the implementation
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("❌ An error occurred:"),
				"API Error"
			);
		});
	});

	describe("handlePull", () => {
		it("should pull integration with spec.json", async () => {
			mockExists.mockReturnValue(true);
			mockMkdir.mockImplementation(() => {});
			mockReadFile.mockReturnValue(
				'{"id": 123, "name": "Test Integration"}'
			);
			mockPullIntegration.mockResolvedValue({
				name: "Test Integration",
				schemas: {},
			});
			mockCreateExistingIntegrationsFolder.mockResolvedValue(true);

			await IntegrationCommands.default.execute(["pull"]);

			expect(mockPullIntegration).toHaveBeenCalledWith(
				"https://api.test.com",
				"test-token",
				"test-account",
				"test-session",
				123
			);
		});

		it("should handle pull without spec.json", async () => {
			mockExists.mockReturnValue(false);
			mockListAllIntegrations.mockResolvedValue([
				{
					id: 1,
					name: "Test Integration",
					activity_type: "customActivity",
				},
			]);
			mockSearch.mockResolvedValue({ id: 1, name: "Test Integration" });
			mockPullIntegration.mockResolvedValue({ name: "Test Integration" });
			mockCreateExistingIntegrationsFolder.mockResolvedValue(true);

			await IntegrationCommands.default.execute(["pull"]);

			expect(mockListAllIntegrations).toHaveBeenCalled();
			expect(mockPullIntegration).toHaveBeenCalled();
		});

		it("should handle pull failure", async () => {
			mockExists.mockReturnValue(true);
			mockReadFile.mockReturnValue(
				'{"id": 123, "name": "Test Integration"}'
			);
			mockPullIntegration.mockResolvedValue(null); // Pull returns null on failure

			await IntegrationCommands.default.execute(["pull"]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					"❌ Failed to fetch integration details"
				)
			);
		});
	});

	describe("handleStatus", () => {
		it("should show integration status", async () => {
			mockListAllIntegrations.mockResolvedValue([
				{
					id: 123,
					name: "Test Integration",
					activity_type: "customActivity",
				},
			]);
			mockSearch.mockResolvedValue(123);
			mockGetIntegrationById.mockResolvedValue({
				id: 123,
				name: "Test Integration",
				status: "active",
				created_at: "2023-01-01T00:00:00Z",
				updated_at: "2023-01-02T00:00:00Z",
				created_by: "user1",
				modified_by: "user2",
				documentation: "Test docs",
			});

			await IntegrationCommands.default.execute(["status"]);

			expect(mockGetIntegrationById).toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("=== Integration Details ===")
			);
		});

		it("should handle integration not found", async () => {
			mockListAllIntegrations.mockResolvedValue([
				{
					id: 123,
					name: "Test Integration",
					activity_type: "customActivity",
				},
			]);
			mockSearch.mockResolvedValue(123);
			mockGetIntegrationById.mockResolvedValue(null);

			await IntegrationCommands.default.execute(["status"]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("Integration not found")
			);
		});

		it("should handle no integrations", async () => {
			mockListAllIntegrations.mockResolvedValue([]);

			await IntegrationCommands.default.execute(["status"]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("No integrations found")
			);
		});
	});

	describe("readSchemaFiles", () => {
		it("should read all schema files correctly", async () => {
			// Mock file system for readSchemaFiles
			mockExists.mockImplementation((filePath) => {
				return (
					filePath.includes("authentication.json") ||
					filePath.includes("base.json") ||
					filePath.includes("webhook.json") ||
					filePath.includes("resources") ||
					filePath.includes("Authentication.mdx") ||
					filePath.includes("Documentation.mdx") ||
					filePath.includes("spec.json")
				);
			});

			mockReadFile.mockImplementation((filePath) => {
				if (filePath.includes("spec.json")) {
					return '{"id": 123, "name": "test"}';
				}
				if (filePath.includes(".json")) {
					return '{"test": "data"}';
				}
				return "Test documentation";
			});

			mockReaddir.mockReturnValue(["resource1.json", "resource2.json"]);

			// Test by calling sync which uses readSchemaFiles
			mockSyncIntegration.mockResolvedValue(true);
			mockUpdateIntegration.mockResolvedValue(true);
			mockPurgeCache.mockResolvedValue();

			await IntegrationCommands.default.execute(["sync"]);

			expect(mockExists).toHaveBeenCalled();
			expect(mockReadFile).toHaveBeenCalled();
			expect(mockReaddir).toHaveBeenCalled();
		});
	});

	describe("Validation helper functions", () => {
		it("should validate integration name correctly", async () => {
			mockInput.mockImplementation(async ({ validate }) => {
				// Test the validation function
				expect(validate("")).toBe("Integration name is required");
				expect(validate("Valid Name")).toBe(true);
				return "Valid Name";
			});

			mockGetIntegrationGroups.mockResolvedValue([
				{ id: 1, name: "Test Group" },
			]);
			mockPickSvgFile.mockResolvedValue("/path/to/icon.svg");
			mockUploadFileToCloud.mockResolvedValue({
				url: "https://example.com/icon.svg",
			});
			mockSearch.mockResolvedValue("Test Group");
			mockConfirm.mockResolvedValue(true);
			mockSaveIntegration.mockResolvedValue({ id: 123 });
			mockCreateIntegrationFolderStructure.mockResolvedValue();

			await IntegrationCommands.default.execute(["create"]);

			expect(mockInput).toHaveBeenCalled();
		});
	});

	describe("Error handling edge cases", () => {
		it("should handle unexpected errors gracefully", async () => {
			mockGetCurrentEnv.mockRejectedValue(new Error("Environment error"));

			// The error will propagate since most commands don't have try-catch
			await expect(
				IntegrationCommands.default.execute(["sync"])
			).rejects.toThrow("Environment error");
		});

		it("should handle malformed spec.json", async () => {
			mockExists.mockReturnValue(true);
			mockReadFile.mockReturnValue("invalid json");

			// JSON.parse will throw a SyntaxError for invalid JSON
			await expect(
				IntegrationCommands.default.execute(["sync"])
			).rejects.toThrow();
		});

		it("should handle invalid trigger_type in sync", async () => {
			mockExists.mockReturnValue(true);
			mockReadFile.mockReturnValue(
				'{"name": "test", "id": 123, "trigger_type": "InvalidTrigger"}'
			);

			await IntegrationCommands.default.execute(["sync"]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('Invalid trigger_type "InvalidTrigger"')
			);
		});

		it("should handle invalid trigger_type in publish", async () => {
			mockExists.mockReturnValue(true);
			mockReadFile.mockReturnValue(
				'{"name": "test", "id": 123, "trigger_type": "InvalidTrigger"}'
			);

			await IntegrationCommands.default.execute(["publish"]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('Invalid trigger_type "InvalidTrigger"')
			);
		});

		it("should handle no spec.json in sync", async () => {
			mockExists.mockReturnValue(false);

			await IntegrationCommands.default.execute(["sync"]);

			// Should exit early without error since no spec.json exists
			expect(mockSyncIntegration).not.toHaveBeenCalled();
		});

		it("should handle no spec.json in publish", async () => {
			mockExists.mockReturnValue(false);

			await IntegrationCommands.default.execute(["publish"]);

			// Should exit early without error since no spec.json exists
			expect(mockSyncIntegration).not.toHaveBeenCalled();
		});

		it("should handle sync integration failure", async () => {
			mockExists.mockReturnValue(true);
			mockReadFile.mockReturnValue('{"name": "test", "id": 123}');
			mockUpdateIntegration.mockResolvedValue(true);
			mockSyncIntegration.mockResolvedValue(false);

			await IntegrationCommands.default.execute(["sync"]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("Failed to syncing integration")
			);
		});

		it("should handle sync integration returning data with message", async () => {
			mockExists.mockReturnValue(true);
			mockReadFile.mockReturnValue('{"name": "test", "id": 123}');
			mockUpdateIntegration.mockResolvedValue(true);
			mockSyncIntegration.mockResolvedValue(null);

			await IntegrationCommands.default.execute(["sync"]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("API Error: Integration syncing failed")
			);
		});

		it("should handle publish sync failure", async () => {
			mockExists.mockReturnValue(true);
			mockReadFile.mockReturnValue('{"name": "test", "id": 123}');
			mockUpdateIntegration.mockResolvedValue(true);
			mockSyncIntegration.mockResolvedValue(false);

			await IntegrationCommands.default.execute(["publish"]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("❌ Error publishing integration")
			);
		});

		it("should handle integration group invalid response", async () => {
			mockGetIntegrationGroups.mockResolvedValue("invalid response");

			await IntegrationCommands.default.execute(["create"]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("Invalid response format")
			);
		});

		it("should handle integration group null response", async () => {
			mockGetIntegrationGroups.mockResolvedValue(null);

			await IntegrationCommands.default.execute(["create"]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("Invalid response format")
			);
		});

		it("should handle edit integration invalid response", async () => {
			mockListAllIntegrations.mockResolvedValue("invalid response");

			await IntegrationCommands.default.execute(["edit"]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("Invalid response format")
			);
		});

		it("should handle edit integration null response", async () => {
			mockListAllIntegrations.mockResolvedValue(null);

			await IntegrationCommands.default.execute(["edit"]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("Invalid response format")
			);
		});

		it("should handle user force closed prompt in create", async () => {
			mockGetIntegrationGroups.mockResolvedValue([
				{ id: 1, name: "Test" },
			]);
			mockInput.mockRejectedValue(
				new Error("User force closed the prompt")
			);

			await IntegrationCommands.default.execute(["create"]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("⚠️ Operation cancelled by user")
			);
		});

		it("should handle user force closed prompt in edit", async () => {
			mockListAllIntegrations.mockRejectedValue(
				new Error("User force closed the prompt")
			);

			await IntegrationCommands.default.execute(["edit"]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("⚠️ Operation cancelled by user")
			);
		});

		it("should handle user force closed prompt in pull", async () => {
			mockExists.mockReturnValue(false);
			mockListAllIntegrations.mockRejectedValue(
				new Error("User force closed the prompt")
			);

			await IntegrationCommands.default.execute(["pull"]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("⚠️ Operation cancelled by user")
			);
		});

		it("should handle non-svg file in create", async () => {
			mockGetIntegrationGroups.mockResolvedValue([
				{ id: 1, name: "Test" },
			]);
			mockInput.mockResolvedValue("Test_Integration");
			mockPickSvgFile.mockResolvedValue("/path/to/icon.png");

			await IntegrationCommands.default.execute(["create"]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("⚠️  File selection was cancelled")
			);
		});

		it("should handle invalid SVG file path in create", async () => {
			mockGetIntegrationGroups.mockResolvedValue([
				{ id: 1, name: "Test" },
			]);
			mockInput.mockResolvedValue("Test_Integration");
			mockPickSvgFile.mockResolvedValue("/path/to/icon.txt");

			await IntegrationCommands.default.execute(["create"]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("⚠️  File selection was cancelled")
			);
		});

		it("should handle missing environment credentials in status", async () => {
			mockGetCurrentEnv.mockResolvedValue({
				token: null,
				session: null,
			});

			await IntegrationCommands.default.execute(["status"]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("❌ Authentication required")
			);
		});

		it("should handle missing directory in pull with spec.json", async () => {
			mockExists.mockReturnValueOnce(true).mockReturnValueOnce(false);
			mockReadFile.mockReturnValue(
				'{"id": 123, "name": "Test Integration"}'
			);
			mockPullIntegration.mockResolvedValue({ name: "Test Integration" });
			mockMkdir.mockImplementation(() => {});
			mockCreateExistingIntegrationsFolder.mockResolvedValue(true);

			await IntegrationCommands.default.execute(["pull"]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("Warning: Directory")
			);
			expect(mockMkdir).toHaveBeenCalled();
		});

		it("should handle pull without spec.json and invalid integrations response", async () => {
			mockExists.mockReturnValue(false);
			mockListAllIntegrations.mockResolvedValue("invalid response");

			await IntegrationCommands.default.execute(["pull"]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("Invalid response format")
			);
		});

		it("should handle pull without spec.json and null integrations response", async () => {
			mockExists.mockReturnValue(false);
			mockListAllIntegrations.mockResolvedValue(null);

			await IntegrationCommands.default.execute(["pull"]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("Invalid response format")
			);
		});

		it("should handle pull without spec.json and empty integrations", async () => {
			mockExists.mockReturnValue(false);
			mockListAllIntegrations.mockResolvedValue([]);

			await IntegrationCommands.default.execute(["pull"]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("❌ No integrations found")
			);
		});

		it("should handle pull failure in pull command", async () => {
			mockExists.mockReturnValue(false);
			mockListAllIntegrations.mockResolvedValue([
				{
					id: 1,
					name: "Test Integration",
					activity_type: "customActivity",
				},
			]);
			mockSearch.mockResolvedValue({ id: 1, name: "Test Integration" });
			mockPullIntegration.mockResolvedValue(null);

			await IntegrationCommands.default.execute(["pull"]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					"❌ Failed to fetch integration details"
				)
			);
		});

		it("should handle trigger description validation", async () => {
			mockGetIntegrationGroups.mockResolvedValue([
				{ id: 1, name: "Test" },
			]);
			mockInput
				.mockResolvedValueOnce("Test_Integration") // name
				.mockResolvedValueOnce("Activity description") // activity description
				.mockResolvedValueOnce("AI activity description") // activity ai description
				.mockResolvedValueOnce("Trigger description") // trigger description
				.mockResolvedValueOnce("AI trigger description"); // trigger ai description
			mockPickSvgFile.mockResolvedValue("/path/to/icon.svg");
			mockUploadFileToCloud.mockResolvedValue({
				url: "https://example.com/icon.svg",
			});
			mockSearch.mockResolvedValue(1);
			mockConfirm
				.mockResolvedValueOnce(true) // activity
				.mockResolvedValueOnce(true) // trigger
				.mockResolvedValueOnce(true); // create catalogue
			mockSaveIntegration.mockResolvedValue({ id: 123 });
			mockCreateIntegrationFolderStructure.mockResolvedValue();

			await IntegrationCommands.default.execute(["create"]);

			expect(mockSaveIntegration).toHaveBeenCalled();
		});

		it("should handle handleTest with various scenarios", async () => {
			const mockSpawn = jest.fn();
			const mockChildProcess = {
				spawn: mockSpawn,
			};

			jest.doMock("child_process", () => mockChildProcess);

			mockExists.mockReturnValue(true);

			// Mock fs.existsSync to return false for all test directories initially
			mockExists.mockImplementation((path) => {
				if (path.includes("test")) return true;
				return false;
			});

			// Mock readFileSync for package.json
			mockReadFile.mockReturnValue(
				'{"devDependencies": {"jest": "^29.0.0"}}'
			);

			// Mock spawn to simulate successful test run
			const mockProcess = {
				on: jest.fn((event, callback) => {
					if (event === "close") {
						callback(0); // Success
					}
				}),
			};
			mockSpawn.mockReturnValue(mockProcess);

			await IntegrationCommands.default.execute(["test"]);

			expect(mockSpawn).toHaveBeenCalledWith(
				"npx",
				["jest", "test", "--verbose"],
				{
					stdio: "inherit",
					shell: true,
				}
			);
		});

		it("should handle handleTest without test directory", async () => {
			mockExists.mockReturnValue(false);

			await IntegrationCommands.default.execute(["test"]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("No test directory found")
			);
		});

		it("should handle handleTest without Jest", async () => {
			mockExists.mockReturnValue(true);
			mockReadFile.mockReturnValue('{"devDependencies": {}}');

			await IntegrationCommands.default.execute(["test"]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("Jest is not installed")
			);
		});

		it("should handle handleTest with malformed package.json", async () => {
			mockExists.mockReturnValue(true);
			mockReadFile.mockReturnValue("invalid json");

			await IntegrationCommands.default.execute(["test"]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("Could not read package.json")
			);
		});

		it("should handle handleTest with missing package.json", async () => {
			mockExists.mockImplementation((path) => {
				if (path.includes("test")) return true;
				if (path.includes("package.json")) return false;
				return false;
			});

			await IntegrationCommands.default.execute(["test"]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("Jest is not installed")
			);
		});

		it("should handle validation errors array", async () => {
			mockExists.mockReturnValue(true);
			mockReadFile.mockReturnValue('{"name": "test", "id": 123}');
			mockValidateIntegrationSchemas.mockReturnValue({
				success: false,
				errors: null, // null instead of array
			});
			mockUpdateIntegration.mockResolvedValue(true);

			await IntegrationCommands.default.execute(["sync"]);

			// Should not crash when errors is null
			expect(mockValidateIntegrationSchemas).toHaveBeenCalled();
		});

		it("should handle undefined validation errors", async () => {
			mockExists.mockReturnValue(true);
			mockReadFile.mockReturnValue('{"name": "test", "id": 123}');
			mockValidateIntegrationSchemas.mockReturnValue({
				success: false,
				errors: undefined, // undefined instead of array
			});
			mockUpdateIntegration.mockResolvedValue(true);

			await IntegrationCommands.default.execute(["sync"]);

			// Should not crash when errors is undefined
			expect(mockValidateIntegrationSchemas).toHaveBeenCalled();
		});

		it("should handle input validation with too long names", async () => {
			mockGetIntegrationGroups.mockResolvedValue([
				{ id: 1, name: "Test" },
			]);
			mockInput.mockImplementation(async ({ validate }) => {
				// Test the validation function with long name
				expect(validate("a".repeat(51))).toBe(
					"Name cannot exceed 50 characters"
				);
				// Test with invalid characters
				expect(validate("test123")).toBe(
					"Name can only contain letters and underscores (no numbers or hyphens)"
				);
				// Test with empty name
				expect(validate("")).toBe("Name is required");
				// Test with name that has spaces (should be transformed)
				expect(validate("Test Name")).toBe(true);
				return "Valid_Name";
			});
			mockPickSvgFile.mockResolvedValue("/path/to/icon.svg");
			mockUploadFileToCloud.mockResolvedValue({
				url: "https://example.com/icon.svg",
			});
			mockSearch.mockResolvedValue(1);
			mockConfirm.mockResolvedValue(true);
			mockSaveIntegration.mockResolvedValue({ id: 123 });
			mockCreateIntegrationFolderStructure.mockResolvedValue();

			await IntegrationCommands.default.execute(["create"]);

			expect(mockInput).toHaveBeenCalled();
		});

		it("should handle activity description validation", async () => {
			mockGetIntegrationGroups.mockResolvedValue([
				{ id: 1, name: "Test" },
			]);
			mockInput
				.mockResolvedValueOnce("Test_Integration")
				.mockImplementation(async ({ validate }) => {
					// Test activity description validation
					expect(validate("")).toBe(
						"Workflow Activity Description is required"
					);
					expect(validate("a".repeat(301))).toBe(
						"Workflow Activity Description must not exceed 300 characters"
					);
					return "Valid description";
				});
			mockPickSvgFile.mockResolvedValue("/path/to/icon.svg");
			mockUploadFileToCloud.mockResolvedValue({
				url: "https://example.com/icon.svg",
			});
			mockSearch.mockResolvedValue(1);
			mockConfirm
				.mockResolvedValueOnce(true) // activity
				.mockResolvedValueOnce(false) // trigger
				.mockResolvedValueOnce(true); // create catalogue
			mockSaveIntegration.mockResolvedValue({ id: 123 });
			mockCreateIntegrationFolderStructure.mockResolvedValue();

			await IntegrationCommands.default.execute(["create"]);

			expect(mockInput).toHaveBeenCalled();
		});

		it("should handle trigger description validation", async () => {
			mockGetIntegrationGroups.mockResolvedValue([
				{ id: 1, name: "Test" },
			]);
			mockInput
				.mockResolvedValueOnce("Test_Integration")
				.mockResolvedValueOnce("Activity description")
				.mockResolvedValueOnce("Activity AI description")
				.mockImplementation(async ({ validate }) => {
					// Test trigger description validation
					expect(validate("")).toBe(
						"Workflow Trigger Description is required"
					);
					expect(validate("a".repeat(301))).toBe(
						"Workflow Description must not exceed 300 characters"
					);
					return "Valid trigger description";
				});
			mockPickSvgFile.mockResolvedValue("/path/to/icon.svg");
			mockUploadFileToCloud.mockResolvedValue({
				url: "https://example.com/icon.svg",
			});
			mockSearch.mockResolvedValue(1);
			mockConfirm
				.mockResolvedValueOnce(true) // activity
				.mockResolvedValueOnce(true) // trigger
				.mockResolvedValueOnce(true); // create catalogue
			mockSaveIntegration.mockResolvedValue({ id: 123 });
			mockCreateIntegrationFolderStructure.mockResolvedValue();

			await IntegrationCommands.default.execute(["create"]);

			expect(mockInput).toHaveBeenCalled();
		});

		it("should handle AI description validation", async () => {
			mockGetIntegrationGroups.mockResolvedValue([
				{ id: 1, name: "Test" },
			]);
			mockInput
				.mockResolvedValueOnce("Test_Integration")
				.mockResolvedValueOnce("Activity description")
				.mockImplementation(async ({ validate }) => {
					// Test AI description validation
					expect(validate("")).toBe(
						"Workflow Activity AI Description is required"
					);
					expect(validate("a".repeat(301))).toBe(
						"Workflow Activity AI Description must not exceed 300 characters"
					);
					return "Valid AI description";
				});
			mockPickSvgFile.mockResolvedValue("/path/to/icon.svg");
			mockUploadFileToCloud.mockResolvedValue({
				url: "https://example.com/icon.svg",
			});
			mockSearch.mockResolvedValue(1);
			mockConfirm
				.mockResolvedValueOnce(true) // activity
				.mockResolvedValueOnce(false) // trigger
				.mockResolvedValueOnce(true); // create catalogue
			mockSaveIntegration.mockResolvedValue({ id: 123 });
			mockCreateIntegrationFolderStructure.mockResolvedValue();

			await IntegrationCommands.default.execute(["create"]);

			expect(mockInput).toHaveBeenCalled();
		});

		it("should handle trigger AI description validation", async () => {
			mockGetIntegrationGroups.mockResolvedValue([
				{ id: 1, name: "Test" },
			]);
			mockInput
				.mockResolvedValueOnce("Test_Integration")
				.mockResolvedValueOnce("Activity description")
				.mockResolvedValueOnce("Activity AI description")
				.mockResolvedValueOnce("Trigger description")
				.mockImplementation(async ({ validate }) => {
					// Test trigger AI description validation
					expect(validate("")).toBe(
						"Workflow Trigger AI Description is required"
					);
					expect(validate("a".repeat(301))).toBe(
						"Workflow Trigger AI Description must not exceed 300 characters"
					);
					return "Valid trigger AI description";
				});
			mockPickSvgFile.mockResolvedValue("/path/to/icon.svg");
			mockUploadFileToCloud.mockResolvedValue({
				url: "https://example.com/icon.svg",
			});
			mockSearch.mockResolvedValue(1);
			mockConfirm
				.mockResolvedValueOnce(true) // activity
				.mockResolvedValueOnce(true) // trigger
				.mockResolvedValueOnce(true); // create catalogue
			mockSaveIntegration.mockResolvedValue({ id: 123 });
			mockCreateIntegrationFolderStructure.mockResolvedValue();

			await IntegrationCommands.default.execute(["create"]);

			expect(mockInput).toHaveBeenCalled();
		});

		it("should handle publish with missing sync data", async () => {
			mockExists.mockReturnValue(true);
			mockReadFile.mockReturnValue('{"name": "test", "id": 123}');
			mockUpdateIntegration.mockResolvedValue(true);
			mockSyncIntegration.mockResolvedValue(false);

			await IntegrationCommands.default.execute(["publish"]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("❌ Error publishing integration")
			);
		});

		it("should handle publish with sync data containing message", async () => {
			mockExists.mockReturnValue(true);
			mockReadFile.mockReturnValue('{"name": "test", "id": 123}');
			mockUpdateIntegration.mockResolvedValue(true);
			mockSyncIntegration.mockResolvedValue({
				message: "Custom sync error",
			});
			mockSendIntegrationForReview.mockResolvedValue(true);

			await IntegrationCommands.default.execute(["publish"]);

			// When sync returns an object with message, it's truthy so it goes to review
			expect(mockSendIntegrationForReview).toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					"✅ Integration sent to review successfully"
				)
			);
		});

		it("should handle readSchemaFiles with non-JSON files", async () => {
			mockExists.mockReturnValue(true);
			mockReadFile.mockReturnValue('{"name": "test", "id": 123}');
			mockReaddir.mockReturnValue([
				"resource1.json",
				"resource2.txt",
				"resource3.json",
			]);
			mockSyncIntegration.mockResolvedValue(true);
			mockUpdateIntegration.mockResolvedValue(true);
			mockPurgeCache.mockResolvedValue();

			await IntegrationCommands.default.execute(["sync"]);

			expect(mockReaddir).toHaveBeenCalled();
		});

		it("should handle readSchemaFiles with missing authentication docs", async () => {
			mockExists.mockImplementation((path) => {
				if (path.includes("spec.json")) return true;
				if (path.includes("base.json")) return true;
				if (path.includes("webhook.json")) return true;
				if (path.includes("resources")) return true;
				if (path.includes("Authentication.mdx")) return false;
				if (path.includes("Documentation.mdx")) return true;
				return false;
			});
			mockReadFile.mockImplementation((path) => {
				if (path.includes("spec.json"))
					return '{"name": "test", "id": 123}';
				if (path.includes("Documentation.mdx")) return "General docs";
				return '{"test": "data"}';
			});
			mockReaddir.mockReturnValue(["resource1.json"]);
			mockSyncIntegration.mockResolvedValue(true);
			mockUpdateIntegration.mockResolvedValue(true);
			mockPurgeCache.mockResolvedValue();

			await IntegrationCommands.default.execute(["sync"]);

			expect(mockExists).toHaveBeenCalled();
		});

		it("should handle readSchemaFiles with missing documentation", async () => {
			mockExists.mockImplementation((path) => {
				if (path.includes("spec.json")) return true;
				if (path.includes("base.json")) return true;
				if (path.includes("webhook.json")) return true;
				if (path.includes("resources")) return true;
				if (path.includes("Authentication.mdx")) return true;
				if (path.includes("Documentation.mdx")) return false;
				return false;
			});
			mockReadFile.mockImplementation((path) => {
				if (path.includes("spec.json"))
					return '{"name": "test", "id": 123}';
				if (path.includes("Authentication.mdx")) return "Auth docs";
				return '{"test": "data"}';
			});
			mockReaddir.mockReturnValue(["resource1.json"]);
			mockSyncIntegration.mockResolvedValue(true);
			mockUpdateIntegration.mockResolvedValue(true);
			mockPurgeCache.mockResolvedValue();

			await IntegrationCommands.default.execute(["sync"]);

			expect(mockExists).toHaveBeenCalled();
		});

		it("should handle readSchemaFiles with missing resources directory", async () => {
			mockExists.mockImplementation((path) => {
				if (path.includes("spec.json")) return true;
				if (path.includes("base.json")) return true;
				if (path.includes("webhook.json")) return true;
				if (path.includes("resources")) return false;
				if (path.includes("Authentication.mdx")) return true;
				if (path.includes("Documentation.mdx")) return true;
				return false;
			});
			mockReadFile.mockImplementation((path) => {
				if (path.includes("spec.json"))
					return '{"name": "test", "id": 123}';
				if (path.includes("Authentication.mdx")) return "Auth docs";
				if (path.includes("Documentation.mdx")) return "General docs";
				return '{"test": "data"}';
			});
			mockSyncIntegration.mockResolvedValue(true);
			mockUpdateIntegration.mockResolvedValue(true);
			mockPurgeCache.mockResolvedValue();

			await IntegrationCommands.default.execute(["sync"]);

			expect(mockExists).toHaveBeenCalled();
		});

		it("should handle readSchemaFiles with missing authentication.json", async () => {
			mockExists.mockImplementation((path) => {
				if (path.includes("spec.json")) return true;
				if (path.includes("base.json")) return true;
				if (path.includes("webhook.json")) return true;
				if (path.includes("resources")) return true;
				if (path.includes("authentication.json")) return false;
				if (path.includes("Authentication.mdx")) return true;
				if (path.includes("Documentation.mdx")) return true;
				return false;
			});
			mockReadFile.mockImplementation((path) => {
				if (path.includes("spec.json"))
					return '{"name": "test", "id": 123}';
				if (path.includes("Authentication.mdx")) return "Auth docs";
				if (path.includes("Documentation.mdx")) return "General docs";
				return '{"test": "data"}';
			});
			mockReaddir.mockReturnValue(["resource1.json"]);
			mockSyncIntegration.mockResolvedValue(true);
			mockUpdateIntegration.mockResolvedValue(true);
			mockPurgeCache.mockResolvedValue();

			await IntegrationCommands.default.execute(["sync"]);

			expect(mockExists).toHaveBeenCalled();
		});

		it("should handle readSchemaFiles with missing base.json", async () => {
			mockExists.mockImplementation((path) => {
				if (path.includes("spec.json")) return true;
				if (path.includes("base.json")) return false;
				if (path.includes("webhook.json")) return true;
				if (path.includes("resources")) return true;
				if (path.includes("authentication.json")) return true;
				if (path.includes("Authentication.mdx")) return true;
				if (path.includes("Documentation.mdx")) return true;
				return false;
			});
			mockReadFile.mockImplementation((path) => {
				if (path.includes("spec.json"))
					return '{"name": "test", "id": 123}';
				if (path.includes("Authentication.mdx")) return "Auth docs";
				if (path.includes("Documentation.mdx")) return "General docs";
				return '{"test": "data"}';
			});
			mockReaddir.mockReturnValue(["resource1.json"]);
			mockSyncIntegration.mockResolvedValue(true);
			mockUpdateIntegration.mockResolvedValue(true);
			mockPurgeCache.mockResolvedValue();

			await IntegrationCommands.default.execute(["sync"]);

			expect(mockExists).toHaveBeenCalled();
		});

		it("should handle readSchemaFiles with missing webhook.json", async () => {
			mockExists.mockImplementation((path) => {
				if (path.includes("spec.json")) return true;
				if (path.includes("base.json")) return true;
				if (path.includes("webhook.json")) return false;
				if (path.includes("resources")) return true;
				if (path.includes("authentication.json")) return true;
				if (path.includes("Authentication.mdx")) return true;
				if (path.includes("Documentation.mdx")) return true;
				return false;
			});
			mockReadFile.mockImplementation((path) => {
				if (path.includes("spec.json"))
					return '{"name": "test", "id": 123}';
				if (path.includes("Authentication.mdx")) return "Auth docs";
				if (path.includes("Documentation.mdx")) return "General docs";
				return '{"test": "data"}';
			});
			mockReaddir.mockReturnValue(["resource1.json"]);
			mockSyncIntegration.mockResolvedValue(true);
			mockUpdateIntegration.mockResolvedValue(true);
			mockPurgeCache.mockResolvedValue();

			await IntegrationCommands.default.execute(["sync"]);

			expect(mockExists).toHaveBeenCalled();
		});

		it("should handle name transformation", async () => {
			mockGetIntegrationGroups.mockResolvedValue([
				{ id: 1, name: "Test" },
			]);
			mockInput.mockImplementation(async ({ transform }) => {
				// Test the transform function
				expect(transform("Test Name")).toBe("Test_Name");
				expect(transform("  Test   Name  ")).toBe("Test_Name");
				expect(transform("Test-Name")).toBe("Test-Name");
				return "Valid_Name";
			});
			mockPickSvgFile.mockResolvedValue("/path/to/icon.svg");
			mockUploadFileToCloud.mockResolvedValue({
				url: "https://example.com/icon.svg",
			});
			mockSearch.mockResolvedValue(1);
			mockConfirm.mockResolvedValue(true);
			mockSaveIntegration.mockResolvedValue({ id: 123 });
			mockCreateIntegrationFolderStructure.mockResolvedValue();

			await IntegrationCommands.default.execute(["create"]);

			expect(mockInput).toHaveBeenCalled();
		});

		it("should handle status command with integration metadata", async () => {
			mockListAllIntegrations.mockResolvedValue([
				{
					id: 123,
					name: "Test Integration",
					activity_type: "customActivity",
				},
			]);
			mockSearch.mockResolvedValue(123);
			mockGetIntegrationById.mockResolvedValue({
				id: 123,
				name: "Test Integration",
				slug: "test-integration",
				activity_type: "customActivity",
				trigger_type: "CloudTrigger",
				description: "Test description",
				status: "published",
				active: true,
				created_at: "2023-01-01T00:00:00Z",
				updated_at: "2023-01-02T00:00:00Z",
				created_by: "user1",
				modified_by: "user2",
				documentation: "Test docs",
				meta: {
					ai_description: "AI description",
					is_trigger: true,
				},
			});

			await IntegrationCommands.default.execute(["status"]);

			expect(mockGetIntegrationById).toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("=== Integration Details ===")
			);
		});

		it("should handle test command with invalid custom path", async () => {
			mockExists.mockImplementation((path) => {
				if (path.includes("--path")) return false;
				return false;
			});

			await IntegrationCommands.default.execute([
				"test",
				"--path",
				"/invalid/path",
			]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					"Error: The specified path does not exist"
				)
			);
		});

		it("should handle publish review failure", async () => {
			mockExists.mockReturnValue(true);
			mockReadFile.mockReturnValue('{"name": "test", "id": 123}');
			mockUpdateIntegration.mockResolvedValue(true);
			mockSyncIntegration.mockResolvedValue(true);
			mockSendIntegrationForReview.mockResolvedValue(false);

			await IntegrationCommands.default.execute(["publish"]);

			expect(mockSendIntegrationForReview).toHaveBeenCalled();
			// Should not show success message when review fails
			expect(consoleSpy).not.toHaveBeenCalledWith(
				expect.stringContaining(
					"✅ Integration sent to review successfully"
				)
			);
		});

		it("should handle edit with folder creation failure", async () => {
			mockListAllIntegrations.mockResolvedValue([
				{
					id: 1,
					name: "Test Integration",
					activity_type: "customActivity",
				},
			]);
			mockSearch.mockResolvedValue({
				id: 1,
				name: "Test Integration",
				activity_type: "customActivity",
			});
			mockEditIntegration.mockResolvedValue({
				id: 1,
				name: "Test Integration",
			});
			mockCreateExistingIntegrationsFolder.mockResolvedValue(false);

			await IntegrationCommands.default.execute(["edit"]);

			expect(mockCreateExistingIntegrationsFolder).toHaveBeenCalled();
			// Should not show success message when folder creation fails
			expect(consoleSpy).not.toHaveBeenCalledWith(
				expect.stringContaining(
					"✅ Integration folder structure created successfully"
				)
			);
		});

		it("should handle status with inactive integration", async () => {
			mockListAllIntegrations.mockResolvedValue([
				{
					id: 123,
					name: "Test Integration",
					activity_type: "customActivity",
				},
			]);
			mockSearch.mockResolvedValue(123);
			mockGetIntegrationById.mockResolvedValue({
				id: 123,
				name: "Test Integration",
				status: "draft",
				active: false,
				created_at: "2023-01-01T00:00:00Z",
				updated_at: "2023-01-02T00:00:00Z",
				created_by: "user1",
				modified_by: "user2",
				meta: {
					ai_description: null,
					is_trigger: false,
				},
			});

			await IntegrationCommands.default.execute(["status"]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("Active: No")
			);
		});

		it("should handle status with missing meta", async () => {
			mockListAllIntegrations.mockResolvedValue([
				{
					id: 123,
					name: "Test Integration",
					activity_type: "customActivity",
				},
			]);
			mockSearch.mockResolvedValue(123);
			mockGetIntegrationById.mockResolvedValue({
				id: 123,
				name: "Test Integration",
				status: "draft",
				active: false,
				created_at: "2023-01-01T00:00:00Z",
				updated_at: "2023-01-02T00:00:00Z",
				created_by: "user1",
				modified_by: "user2",
				meta: null,
			});

			await IntegrationCommands.default.execute(["status"]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("AI Description: N/A")
			);
		});

		it("should handle pull with custom path validation error", async () => {
			mockExists.mockImplementation((path) => {
				if (path === "/invalid/path") return false;
				return true;
			});

			await IntegrationCommands.default.execute([
				"pull",
				"--path",
				"/invalid/path",
			]);

			expect(mockExists).toHaveBeenCalledWith("/invalid/path");
		});

		it("should handle create with icon file validation - both checks", async () => {
			mockGetIntegrationGroups.mockResolvedValue([
				{ id: 1, name: "Test" },
			]);
			mockInput.mockResolvedValue("Test_Integration");
			mockPickSvgFile.mockResolvedValue("/path/to/icon.txt"); // Not SVG
			mockUploadFileToCloud.mockResolvedValue({
				url: "https://example.com/icon.svg",
			});
			mockSearch.mockResolvedValue(1);
			mockConfirm
				.mockResolvedValueOnce(true) // activity
				.mockResolvedValueOnce(false) // trigger
				.mockResolvedValueOnce(false); // create catalogue

			await IntegrationCommands.default.execute(["create"]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					"File selection was cancelled or not a valid SVG"
				)
			);
		});

		it("should handle edit with search filter for integration choices", async () => {
			mockListAllIntegrations.mockResolvedValue([
				{
					id: 1,
					name: "Test Integration",
					status: "draft",
					activity_type: "customActivity",
				},
				{
					id: 2,
					name: "Another Integration",
					status: "published",
					trigger_type: "CloudTrigger",
				},
			]);
			mockSearch.mockImplementation(async ({ source }) => {
				const choices = await source("test");
				return choices[0];
			});
			mockEditIntegration.mockResolvedValue({
				integration: { id: 1, name: "Test Integration" },
			});
			mockCreateExistingIntegrationsFolder.mockResolvedValue(true);

			await IntegrationCommands.default.execute(["edit"]);

			expect(mockEditIntegration).toHaveBeenCalled();
		});

		it("should handle pull with search filter for integration choices", async () => {
			mockExists.mockImplementation((path) => {
				if (path.includes("spec.json")) return false;
				return true;
			});
			mockListAllIntegrations.mockResolvedValue([
				{
					id: 1,
					name: "Test Integration",
					status: "draft",
					activity_type: "customActivity",
				},
				{
					id: 2,
					name: "Another Integration",
					status: "published",
					trigger_type: "CloudTrigger",
				},
			]);
			mockSearch.mockImplementation(async ({ source }) => {
				const choices = await source("test");
				return choices[0];
			});
			mockPullIntegration.mockResolvedValue({
				integration: { id: 1, name: "Test Integration" },
			});
			mockCreateExistingIntegrationsFolder.mockResolvedValue(true);

			await IntegrationCommands.default.execute(["pull"]);

			expect(mockPullIntegration).toHaveBeenCalled();
		});

		it("should handle status with search filter for integration choices", async () => {
			mockListAllIntegrations.mockResolvedValue([
				{
					id: 1,
					name: "Test Integration",
					status: "draft",
					activity_type: "customActivity",
				},
				{
					id: 2,
					name: "Another Integration",
					status: "published",
					trigger_type: "CloudTrigger",
				},
			]);
			mockSearch.mockImplementation(async ({ source }) => {
				const choices = await source("test");
				return choices[0].value;
			});
			mockGetIntegrationById.mockResolvedValue({
				id: 1,
				name: "Test Integration",
				status: "draft",
				active: true,
				created_at: "2023-01-01T00:00:00Z",
				updated_at: "2023-01-02T00:00:00Z",
				created_by: "user1",
				modified_by: "user2",
				meta: { ai_description: "Test AI description" },
			});

			await IntegrationCommands.default.execute(["status"]);

			expect(mockGetIntegrationById).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.any(String),
				expect.any(String),
				1
			);
		});
	});
});
