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

		it("should handle createIntegrationFolderStructure with create_catalogue=false", async () => {
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
				mockIntegration,
				false
			);

			expect(fs.mkdirSync).toHaveBeenCalled();
			expect(fs.writeFileSync).toHaveBeenCalled();
		});

		it("should handle createIntegrationFolderStructure with null trigger_type", async () => {
			fs.existsSync.mockReturnValue(false);
			fs.mkdirSync.mockReturnValue(undefined);
			fs.writeFileSync.mockReturnValue(undefined);

			const mockIntegration = {
				id: "test-id",
				name: "Test Integration",
				description: "Test description",
				icon: "test-icon",
				activity_type: ["test"],
				trigger_type: null,
				meta: {},
			};

			await folderHelper.createIntegrationFolderStructure(
				mockIntegration,
				true
			);

			expect(fs.mkdirSync).toHaveBeenCalled();
			expect(fs.writeFileSync).toHaveBeenCalled();
		});

		it("should handle createIntegrationFolderStructure with empty trigger_type", async () => {
			fs.existsSync.mockReturnValue(false);
			fs.mkdirSync.mockReturnValue(undefined);
			fs.writeFileSync.mockReturnValue(undefined);

			const mockIntegration = {
				id: "test-id",
				name: "Test Integration",
				description: "Test description",
				icon: "test-icon",
				activity_type: ["test"],
				trigger_type: "",
				meta: {},
			};

			await folderHelper.createIntegrationFolderStructure(
				mockIntegration,
				true
			);

			expect(fs.mkdirSync).toHaveBeenCalled();
			expect(fs.writeFileSync).toHaveBeenCalled();
		});

		it("should handle createExistingIntegrationsFolder with new directory", async () => {
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

			expect(console.log).toHaveBeenCalledWith(
				expect.stringContaining("Creating integration directory")
			);
			expect(result).toBe(true);
		});

		it("should handle createExistingIntegrationsFolder with empty resources", async () => {
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
				resources: [],
				operations: [],
			};

			const result =
				await folderHelper.createExistingIntegrationsFolder(
					mockPayload
				);

			expect(result).toBe(true);
		});

		it("should handle createExistingIntegrationsFolder with multiple resources", async () => {
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
				resources: [
					{ id: "r1", name: "Resource 1", content: {} },
					{ id: "r2", name: "Resource 2", content: {} },
				],
				operations: [
					{ resource_id: "r1", name: "Create", content: {} },
					{ resource_id: "r2", name: "Delete", content: {} },
				],
			};

			const result =
				await folderHelper.createExistingIntegrationsFolder(
					mockPayload
				);

			expect(result).toBe(true);
		});

		it("should handle createExistingIntegrationsFolder with missing authentication documentation", async () => {
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
				authentication: { content: {} },
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

			expect(result).toBe(true);
		});

		it("should handle createExistingIntegrationsFolder with no documentation", async () => {
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
					documentation: null,
					meta: {},
				},
				authentication: { content: {}, documentation: null },
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

			expect(result).toBe(true);
		});

		it("should handle createExistingIntegrationsFolder with operations filtering", async () => {
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
				resources: [
					{ id: "r1", name: "Resource 1", content: {} },
					{ id: "r2", name: "Resource 2", content: {} },
				],
				operations: [
					{ resource_id: "r1", name: "Create", content: {} },
					{ resource_id: "r2", name: "Update", content: {} },
					{ resource_id: "r3", name: "Delete", content: {} }, // This won't match any resource
				],
			};

			const result =
				await folderHelper.createExistingIntegrationsFolder(
					mockPayload
				);

			expect(result).toBe(true);
		});

		it("should handle operations with different resource IDs", async () => {
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
				resources: [
					{ id: "r1", name: "Resource 1", content: {} },
					{ id: "r2", name: "Resource 2", content: {} },
				],
				operations: [
					{ resource_id: "r1", name: "Create Item", content: {} },
					{ resource_id: "r2", name: "Update Item", content: {} },
					{ resource_id: "r1", name: "Delete Item", content: {} },
					{ resource_id: "r3", name: "Some Other", content: {} }, // Won't match any resource
				],
			};

			const result =
				await folderHelper.createExistingIntegrationsFolder(
					mockPayload
				);

			expect(result).toBe(true);
		});

		it("should handle resources with spaces in names", async () => {
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
				resources: [
					{ id: "r1", name: "Resource With Spaces", content: {} },
					{ id: "r2", name: "Another Resource", content: {} },
				],
				operations: [
					{ resource_id: "r1", name: "Create Item", content: {} },
					{ resource_id: "r2", name: "Update Item", content: {} },
				],
			};

			const result =
				await folderHelper.createExistingIntegrationsFolder(
					mockPayload
				);

			expect(result).toBe(true);
		});

		it("should handle operations with spaces in names", async () => {
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
				resources: [{ id: "r1", name: "Resource1", content: {} }],
				operations: [
					{ resource_id: "r1", name: "Create New Item", content: {} },
					{
						resource_id: "r1",
						name: "Update Existing Item",
						content: {},
					},
				],
			};

			const result =
				await folderHelper.createExistingIntegrationsFolder(
					mockPayload
				);

			expect(result).toBe(true);
		});
	});
});
