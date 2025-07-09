import { jest } from "@jest/globals";

// Mock dependencies
const mockExists = jest.fn();
const mockReadFileSync = jest.fn();
const mockReaddirSync = jest.fn();

jest.mock("fs", () => ({
	existsSync: mockExists,
	readFileSync: mockReadFileSync,
	readdirSync: mockReaddirSync,
}));

// Mock lodash
const mockIsEmpty = jest.fn();
jest.mock("lodash.isempty", () => mockIsEmpty);

// Import the module after mocking
let validation;

describe("Validation", () => {
	beforeAll(async () => {
		validation = await import("../helper/validation.js");
	});

	beforeEach(() => {
		jest.clearAllMocks();

		// Set up isEmpty mock to behave like lodash.isEmpty
		mockIsEmpty.mockImplementation((value) => {
			if (value === null || value === undefined) return true;
			if (typeof value === "string" && value.length === 0) return true;
			if (Array.isArray(value) && value.length === 0) return true;
			if (typeof value === "object" && Object.keys(value).length === 0)
				return true;
			return false;
		});
	});

	describe("validateIntegrationSchemas", () => {
		const testDir = "/test/dir";

		beforeEach(() => {
			// Default mocks for successful validation
			mockExists.mockImplementation((filePath) => {
				// Only allow specific files to exist, not webhook.json by default
				return (
					filePath.includes("Documentation.mdx") ||
					filePath.includes("spec.json") ||
					filePath.includes("base.json") ||
					filePath.includes("resources")
				);
			});
			mockReadFileSync.mockImplementation((filePath) => {
				if (filePath.includes("spec.json")) {
					return JSON.stringify({
						name: "Test Integration",
						activity_type: "customActivity",
					});
				}
				if (filePath.includes("base.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "resource",
								meta: {
									options: [
										{ value: "users" },
										{ value: "posts" },
									],
								},
							},
						],
					});
				}
				if (filePath.includes("users.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "operation",
								meta: {
									options: [
										{ value: "users.list" },
										{ value: "users.get" },
									],
								},
							},
						],
						list: {
							parameters: [],
							definition: {},
						},
						get: {
							parameters: [],
							definition: {},
						},
					});
				}
				if (filePath.includes("posts.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "operation",
								meta: {
									options: [{ value: "posts.create" }],
								},
							},
						],
						create: {
							parameters: [],
							definition: {},
						},
					});
				}
				return "{}";
			});
			mockReaddirSync.mockReturnValue(["users.json", "posts.json"]);
		});

		it("should validate successfully with all required files", () => {
			const result = validation.validateIntegrationSchemas(testDir);

			expect(result).toEqual({ success: true });
		});

		it("should fail when Documentation.mdx is missing", () => {
			mockExists.mockImplementation((filePath) => {
				return !filePath.includes("Documentation.mdx");
			});

			const result = validation.validateIntegrationSchemas(testDir);

			expect(result.success).toBe(false);
			expect(result.errors).toContain(
				'"Documentation.mdx" not found in the root directory.'
			);
		});

		it("should fail when spec.json is missing", () => {
			mockExists.mockImplementation((filePath) => {
				return !filePath.includes("spec.json");
			});

			const result = validation.validateIntegrationSchemas(testDir);

			expect(result.success).toBe(false);
			expect(result.errors).toContain(
				'"spec.json" not found in the root directory.'
			);
		});

		it("should fail when spec.json is empty", () => {
			mockReadFileSync.mockImplementation((filePath) => {
				if (filePath.includes("spec.json")) {
					return "   "; // Empty content
				}
				return "{}";
			});

			const result = validation.validateIntegrationSchemas(testDir);

			expect(result.success).toBe(false);
			expect(result.errors).toContain('"spec.json" is empty.');
		});

		it("should fail when spec.json has invalid JSON", () => {
			mockReadFileSync.mockImplementation((filePath) => {
				if (filePath.includes("spec.json")) {
					return "invalid json";
				}
				return "{}";
			});

			const result = validation.validateIntegrationSchemas(testDir);

			expect(result.success).toBe(false);
			expect(
				result.errors.some((error) =>
					error.includes('Failed to read or parse "spec.json"')
				)
			).toBe(true);
		});

		it("should fail when base.json is missing", () => {
			mockExists.mockImplementation((filePath) => {
				return !filePath.includes("base.json");
			});

			const result = validation.validateIntegrationSchemas(testDir);

			expect(result.success).toBe(false);
			expect(result.errors).toContain(
				'"base.json" not found in the "schemas" directory.'
			);
		});

		it("should fail when base.json is empty", () => {
			mockReadFileSync.mockImplementation((filePath) => {
				if (filePath.includes("base.json")) {
					return "";
				}
				if (filePath.includes("spec.json")) {
					return JSON.stringify({ name: "Test Integration" });
				}
				return "{}";
			});

			const result = validation.validateIntegrationSchemas(testDir);

			expect(result.success).toBe(false);
			expect(result.errors).toContain('"base.json" is empty.');
		});

		it("should fail when resources directory is missing", () => {
			mockExists.mockImplementation((filePath) => {
				return !filePath.includes("resources");
			});

			const result = validation.validateIntegrationSchemas(testDir);

			expect(result.success).toBe(false);
			expect(result.errors).toContain(
				'"resources" directory not found in "schemas".'
			);
		});

		it("should fail when required resource files are missing", () => {
			mockReaddirSync.mockReturnValue(["users.json"]); // Missing posts.json

			const result = validation.validateIntegrationSchemas(testDir);

			expect(result.success).toBe(false);
			expect(result.errors).toContain(
				'Resource file: "posts.json" is missing.'
			);
		});

		it("should handle trigger_type validation with webhook.json", () => {
			// Mock spec with trigger_type
			mockReadFileSync.mockImplementation((filePath) => {
				if (filePath.includes("spec.json")) {
					return JSON.stringify({
						name: "Test Integration",
						trigger_type: "CloudTrigger",
					});
				}
				if (filePath.includes("base.json")) {
					return JSON.stringify({ parameters: [] });
				}
				return "{}";
			});

			// Webhook exists
			mockExists.mockImplementation(() => {
				return true; // All files exist including webhook.json
			});

			const result = validation.validateIntegrationSchemas(testDir);

			expect(result.success).toBe(true);
		});

		it("should fail when trigger_type exists but webhook.json is missing", () => {
			// Mock spec with trigger_type
			mockReadFileSync.mockImplementation((filePath) => {
				if (filePath.includes("spec.json")) {
					return JSON.stringify({
						name: "Test Integration",
						trigger_type: "CloudTrigger",
					});
				}
				if (filePath.includes("base.json")) {
					return JSON.stringify({ parameters: [] });
				}
				return "{}";
			});

			// Webhook doesn't exist
			mockExists.mockImplementation((filePath) => {
				return !filePath.includes("webhook.json");
			});

			const result = validation.validateIntegrationSchemas(testDir);

			expect(result.success).toBe(false);
			expect(result.errors).toContain(
				'"webhook.json" not found, but trigger_type is defined in spec.json.'
			);
		});

		it("should fail when webhook.json exists but trigger_type is not defined", () => {
			// Mock spec without trigger_type
			mockReadFileSync.mockImplementation((filePath) => {
				if (filePath.includes("spec.json")) {
					return JSON.stringify({
						name: "Test Integration",
						activity_type: "customActivity",
					});
				}
				if (filePath.includes("base.json")) {
					return JSON.stringify({ parameters: [] });
				}
				return "{}";
			});

			// Webhook exists
			mockExists.mockImplementation(() => {
				return true; // All files exist including webhook.json
			});

			const result = validation.validateIntegrationSchemas(testDir);

			expect(result.success).toBe(false);
			expect(result.errors).toContain(
				'"webhook.json" exists but trigger_type is not defined in spec.json.'
			);
		});

		it("should validate operation methods in resource files", () => {
			mockReadFileSync.mockImplementation((filePath) => {
				if (filePath.includes("spec.json")) {
					return JSON.stringify({ name: "Test Integration" });
				}
				if (filePath.includes("base.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "resource",
								meta: {
									options: [{ value: "users" }],
								},
							},
						],
					});
				}
				if (filePath.includes("users.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "operation",
								meta: {
									options: [
										{ value: "users.list" },
										{ value: "users.get" },
									],
								},
							},
						],
						list: {
							parameters: [],
							definition: {},
						},
						get: {
							parameters: [],
							definition: {},
						},
					});
				}
				return "{}";
			});

			const result = validation.validateIntegrationSchemas(testDir);

			expect(result.success).toBe(true);
		});

		it("should fail when operation has invalid format", () => {
			mockReadFileSync.mockImplementation((filePath) => {
				if (filePath.includes("spec.json")) {
					return JSON.stringify({ name: "Test Integration" });
				}
				if (filePath.includes("base.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "resource",
								meta: {
									options: [{ value: "users" }],
								},
							},
						],
					});
				}
				if (filePath.includes("users.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "operation",
								meta: {
									options: [
										{ value: "invalidoperation" }, // Missing dot notation
									],
								},
							},
						],
					});
				}
				return "{}";
			});

			const result = validation.validateIntegrationSchemas(testDir);

			expect(result.success).toBe(false);
			expect(result.errors).toContain(
				'Invalid format for operation "invalidoperation" in "users.json". Use "resource.operation".'
			);
		});

		it("should fail when operation method is missing from resource file", () => {
			mockReadFileSync.mockImplementation((filePath) => {
				if (filePath.includes("spec.json")) {
					return JSON.stringify({ name: "Test Integration" });
				}
				if (filePath.includes("base.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "resource",
								meta: {
									options: [{ value: "users" }],
								},
							},
						],
					});
				}
				if (filePath.includes("users.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "operation",
								meta: {
									options: [{ value: "users.list" }],
								},
							},
						],
						// Missing list method definition
					});
				}
				return "{}";
			});

			const result = validation.validateIntegrationSchemas(testDir);

			expect(result.success).toBe(false);
			expect(result.errors).toContain(
				'Operation "list" missing in "users.json".'
			);
		});

		it("should fail when operation method is missing parameters", () => {
			mockReadFileSync.mockImplementation((filePath) => {
				if (filePath.includes("spec.json")) {
					return JSON.stringify({ name: "Test Integration" });
				}
				if (filePath.includes("base.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "resource",
								meta: {
									options: [{ value: "users" }],
								},
							},
						],
					});
				}
				if (filePath.includes("users.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "operation",
								meta: {
									options: [{ value: "users.list" }],
								},
							},
						],
						list: {
							// Missing parameters
							definition: {},
						},
					});
				}
				return "{}";
			});

			const result = validation.validateIntegrationSchemas(testDir);

			expect(result.success).toBe(false);
			expect(result.errors).toContain(
				'Operation "list" in "users.json" is missing parameters.'
			);
		});

		it("should fail when operation method is missing definition", () => {
			mockReadFileSync.mockImplementation((filePath) => {
				if (filePath.includes("spec.json")) {
					return JSON.stringify({ name: "Test Integration" });
				}
				if (filePath.includes("base.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "resource",
								meta: {
									options: [{ value: "users" }],
								},
							},
						],
					});
				}
				if (filePath.includes("users.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "operation",
								meta: {
									options: [{ value: "users.list" }],
								},
							},
						],
						list: {
							parameters: [],
							// Missing definition
						},
					});
				}
				return "{}";
			});

			const result = validation.validateIntegrationSchemas(testDir);

			expect(result.success).toBe(false);
			expect(result.errors).toContain(
				'Operation "list" in "users.json" is missing definition.'
			);
		});

		it("should handle resource files with invalid JSON", () => {
			mockReadFileSync.mockImplementation((filePath) => {
				if (filePath.includes("spec.json")) {
					return JSON.stringify({ name: "Test Integration" });
				}
				if (filePath.includes("base.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "resource",
								meta: {
									options: [{ value: "users" }],
								},
							},
						],
					});
				}
				if (filePath.includes("users.json")) {
					return "invalid json";
				}
				return "{}";
			});

			const result = validation.validateIntegrationSchemas(testDir);

			expect(result.success).toBe(false);
			expect(
				result.errors.some((error) =>
					error.includes('Failed to read or parse "users.json"')
				)
			).toBe(true);
		});

		it("should handle empty base.json parameters", () => {
			mockReadFileSync.mockImplementation((filePath) => {
				if (filePath.includes("spec.json")) {
					return JSON.stringify({ name: "Test Integration" });
				}
				if (filePath.includes("base.json")) {
					return JSON.stringify({ parameters: [] }); // Empty parameters
				}
				return "{}";
			});
			mockReaddirSync.mockReturnValue([]);

			const result = validation.validateIntegrationSchemas(testDir);

			expect(result.success).toBe(true);
		});

		it("should handle base.json without parameters", () => {
			mockReadFileSync.mockImplementation((filePath) => {
				if (filePath.includes("spec.json")) {
					return JSON.stringify({ name: "Test Integration" });
				}
				if (filePath.includes("base.json")) {
					return JSON.stringify({}); // No parameters field
				}
				return "{}";
			});
			mockReaddirSync.mockReturnValue([]);

			const result = validation.validateIntegrationSchemas(testDir);

			expect(result.success).toBe(true);
		});

		it("should handle resource files without operation fields", () => {
			mockReadFileSync.mockImplementation((filePath) => {
				if (filePath.includes("spec.json")) {
					return JSON.stringify({ name: "Test Integration" });
				}
				if (filePath.includes("base.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "resource",
								meta: {
									options: [{ value: "users" }],
								},
							},
						],
					});
				}
				if (filePath.includes("users.json")) {
					return JSON.stringify({
						parameters: [], // No operation parameter
					});
				}
				return "{}";
			});

			const result = validation.validateIntegrationSchemas(testDir);

			expect(result.success).toBe(true);
		});

		it("should skip validation when resource file cannot be parsed", () => {
			mockReadFileSync.mockImplementation((filePath) => {
				if (filePath.includes("spec.json")) {
					return JSON.stringify({ name: "Test Integration" });
				}
				if (filePath.includes("base.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "resource",
								meta: {
									options: [
										{ value: "users" },
										{ value: "posts" },
									],
								},
							},
						],
					});
				}
				if (filePath.includes("users.json")) {
					return "invalid json"; // Will fail to parse
				}
				if (filePath.includes("posts.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "operation",
								meta: {
									options: [{ value: "posts.create" }],
								},
							},
						],
						create: {
							parameters: [],
							definition: {},
						},
					});
				}
				return "{}";
			});

			const result = validation.validateIntegrationSchemas(testDir);

			// Should have error for users.json but still validate posts.json
			expect(result.success).toBe(false);
			expect(
				result.errors.some((error) =>
					error.includes('Failed to read or parse "users.json"')
				)
			).toBe(true);
		});
	});
});
