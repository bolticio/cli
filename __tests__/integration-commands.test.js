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
	});
});
