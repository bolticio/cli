import { jest } from "@jest/globals";
import fs from "fs";

// Mock fs operations
jest.mock("fs");

describe("Folder Operations", () => {
	let folderHelper;

	beforeAll(async () => {
		folderHelper = await import("../helper/folder.js");
	});

	beforeEach(() => {
		jest.clearAllMocks();
		console.log = jest.fn();
		// Mock process.cwd
		process.cwd = jest.fn(() => "/test/path");
	});

	describe("createIntegrationFolderStructure", () => {
		it("should create integration folder structure", async () => {
			fs.existsSync.mockReturnValue(false);
			fs.mkdirSync.mockReturnValue(undefined);
			fs.writeFileSync.mockReturnValue(undefined);

			const mockIntegration = {
				id: "test-id",
				name: "Test Integration",
				description: "Test description",
				icon: "test-icon",
				activity_type: ["test"],
				trigger_type: ["webhook"],
				meta: {},
			};

			await folderHelper.createIntegrationFolderStructure(
				mockIntegration
			);

			expect(fs.mkdirSync).toHaveBeenCalled();
			expect(fs.writeFileSync).toHaveBeenCalled();
		});

		it("should handle existing folder", async () => {
			fs.existsSync.mockReturnValue(true);

			const mockIntegration = {
				id: "test-id",
				name: "Test Integration",
				description: "Test description",
				icon: "test-icon",
				activity_type: ["test"],
				trigger_type: ["webhook"],
				meta: {},
			};

			await folderHelper.createIntegrationFolderStructure(
				mockIntegration
			);

			expect(console.log).toHaveBeenCalledWith(
				expect.stringContaining("already exists")
			);
		});
	});

	describe("createExistingIntegrationsFolder", () => {
		it("should create existing integrations folder", async () => {
			fs.existsSync.mockReturnValue(false);
			fs.mkdirSync.mockReturnValue(undefined);
			fs.writeFileSync.mockReturnValue(undefined);

			const mockPayload = {
				integration: {
					id: "test-id",
					name: "Test Integration",
					description: "Test description",
					icon: "test-icon",
					activity_type: ["test"],
					trigger_type: ["webhook"],
					documentation: "Test docs",
					meta: {},
				},
				authentication: { content: {}, documentation: "Auth docs" },
				webhook: { content: {} },
				configuration: { content: {} },
				resources: [{ id: "r1", name: "Resource 1", content: {} }],
				operations: [
					{ resource_id: "r1", name: "Create", content: {} },
				],
			};

			const result =
				await folderHelper.createExistingIntegrationsFolder(
					mockPayload
				);

			expect(fs.mkdirSync).toHaveBeenCalled();
			expect(fs.writeFileSync).toHaveBeenCalled();
			expect(result).toBe(true);
		});

		it("should handle existing folder", async () => {
			fs.existsSync.mockReturnValue(true);
			fs.mkdirSync.mockReturnValue(undefined);
			fs.writeFileSync.mockReturnValue(undefined);

			const mockPayload = {
				integration: {
					id: "test-id",
					name: "Test Integration",
					description: "Test description",
					icon: "test-icon",
					activity_type: ["test"],
					trigger_type: ["webhook"],
					documentation: "Test docs",
					meta: {},
				},
				authentication: { content: {}, documentation: "Auth docs" },
				webhook: { content: {} },
				configuration: { content: {} },
				resources: [{ id: "r1", name: "Resource 1", content: {} }],
				operations: [
					{ resource_id: "r1", name: "Create", content: {} },
				],
			};

			const result =
				await folderHelper.createExistingIntegrationsFolder(
					mockPayload
				);

			expect(console.log).toHaveBeenCalledWith(
				expect.stringContaining("already exists")
			);
			expect(result).toBe(true);
		});
	});
});
