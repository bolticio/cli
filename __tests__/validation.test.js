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
									displayType: "select",
									displayName: "Resource",
									placeholder: "Select a resource",
									description:
										"Choose the resource to work with",
									options: [
										{
											value: "users",
											label: "Users",
											description: "Manage users",
										},
										{
											value: "posts",
											label: "Posts",
											description: "Manage posts",
										},
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
									displayType: "select",
									displayName: "Operation",
									placeholder: "Select an operation",
									description:
										"Choose the operation to perform",
									options: [
										{
											value: "users.list",
											label: "List Users",
											description: "List all users",
										},
										{
											value: "users.get",
											label: "Get User",
											description: "Get a specific user",
										},
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
									displayType: "select",
									displayName: "Operation",
									placeholder: "Select an operation",
									description:
										"Choose the operation to perform",
									options: [
										{
											value: "posts.create",
											label: "Create Post",
											description: "Create a new post",
										},
									],
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
									displayType: "select",
									displayName: "Resource",
									placeholder: "Select a resource",
									description:
										"Choose the resource to work with",
									options: [
										{
											value: "users",
											label: "Users",
											description: "Manage users",
										},
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
									displayType: "select",
									displayName: "Operation",
									placeholder: "Select an operation",
									description:
										"Choose the operation to perform",
									options: [
										{
											value: "users.list",
											label: "List Users",
											description: "List all users",
										},
										{
											value: "users.get",
											label: "Get User",
											description: "Get a specific user",
										},
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
									displayType: "select",
									displayName: "Resource",
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
									displayType: "select",
									displayName: "Operation",
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
				`"operation" field in "users.json" has an invalid option at index 0 with value "invalidoperation". Expected format "resource.operation".`
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
									displayType: "select",
									displayName: "Resource",
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
									displayType: "select",
									displayName: "Operation",
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
									displayType: "select",
									displayName: "Resource",
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
									displayType: "select",
									displayName: "Operation",
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
									displayType: "select",
									displayName: "Resource",
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
									displayType: "select",
									displayName: "Operation",
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
									displayType: "select",
									displayName: "Resource",
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
									displayType: "select",
									displayName: "Resource",
									placeholder: "Select a resource",
									description:
										"Choose the resource to work with",
									options: [
										{
											value: "users",
											label: "Users",
											description: "Manage users",
										},
									],
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
									displayType: "select",
									displayName: "Resource",
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
									displayType: "select",
									displayName: "Operation",
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

		// Component validation tests
		it("should test component validation functions", () => {
			// Test with authentication.json having component validation
			mockExists.mockImplementation((filePath) => {
				return (
					filePath.includes("Documentation.mdx") ||
					filePath.includes("spec.json") ||
					filePath.includes("base.json") ||
					filePath.includes("resources") ||
					filePath.includes("authentication.json")
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
									displayType: "select",
									displayName: "Resource",
									placeholder: "Select an option",
									description:
										"Select from available options",
									options: [
										{
											value: "users",
											label: "Users",
											description: "Manage users",
										},
									],
								},
							},
						],
					});
				}
				if (filePath.includes("authentication.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "auth_param",
								meta: {
									displayType: "text",
									displayName: "Auth Parameter",
									placeholder: "Enter auth parameter",
									description: "Authentication parameter",
								},
							},
						],
						api_key: {
							parameters: [
								{
									name: "api_key",
									meta: {
										displayType: "password",
										displayName: "API Key",
										placeholder: "Enter API key",
										description: "Your API key",
									},
								},
							],
						},
					});
				}
				if (filePath.includes("users.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "operation",
								meta: {
									displayType: "select",
									displayName: "Operation",
									placeholder: "Select an option",
									description:
										"Select from available options",
									options: [
										{
											value: "users.list",
											label: "List Users",
											description: "List all users",
										},
									],
								},
							},
						],
						list: {
							parameters: [
								{
									name: "limit",
									meta: {
										displayType: "number",
										displayName: "Limit",
										placeholder: "Enter a number",
										description:
											"Number of items to return",
									},
								},
							],
							definition: {},
						},
					});
				}
				return "{}";
			});

			const result = validation.validateIntegrationSchemas(testDir);
			expect(result.success).toBe(true);
		});

		it("should validate component schemas with invalid displayType", () => {
			mockExists.mockImplementation((filePath) => {
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
								name: "test_param",
								meta: {
									displayType: "invalid_type",
									displayName: "Test Parameter",
								},
							},
						],
					});
				}
				if (filePath.includes("users.json")) {
					return JSON.stringify({
						parameters: [],
						list: { parameters: [], definition: {} },
					});
				}
				return "{}";
			});

			const result = validation.validateIntegrationSchemas(testDir);
			expect(result.success).toBe(false);
			expect(
				result.errors.some((error) =>
					error.includes(
						'has an unsupported displayType "invalid_type"'
					)
				)
			).toBe(true);
		});

		it("should validate component schemas with extra keys", () => {
			mockExists.mockImplementation((filePath) => {
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
								name: "test_param",
								meta: {
									displayType: "text",
									displayName: "Test Parameter",
									placeholder: "Enter text",
									description: "Test description",
									invalidKey: "This should cause an error",
									validation: {
										required: true,
										extraValidationKey:
											"This should also cause an error",
									},
								},
							},
						],
					});
				}
				if (filePath.includes("users.json")) {
					return JSON.stringify({
						parameters: [],
						list: { parameters: [], definition: {} },
					});
				}
				return "{}";
			});

			const result = validation.validateIntegrationSchemas(testDir);
			expect(result.success).toBe(false);
			expect(
				result.errors.some((error) =>
					error.includes('has an invalid key "invalidKey"')
				)
			).toBe(true);
			expect(
				result.errors.some((error) =>
					error.includes(
						'has an invalid key "validation.extraValidationKey"'
					)
				)
			).toBe(true);
		});

		it("should validate component schemas with missing required fields", () => {
			mockExists.mockImplementation((filePath) => {
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
								// Missing name
								meta: {
									displayType: "text",
									displayName: "Test Parameter",
								},
							},
							{
								name: "param2",
								// Missing meta
							},
							{
								name: "param3",
								meta: {
									// Missing displayType
									displayName: "Test Parameter",
								},
							},
						],
					});
				}
				if (filePath.includes("users.json")) {
					return JSON.stringify({
						parameters: [],
						list: { parameters: [], definition: {} },
					});
				}
				return "{}";
			});

			const result = validation.validateIntegrationSchemas(testDir);
			expect(result.success).toBe(false);
			expect(
				result.errors.some((error) =>
					error.includes("Schema is missing a name")
				)
			).toBe(true);
			expect(
				result.errors.some((error) =>
					error.includes("is missing a meta object")
				)
			).toBe(true);
			expect(
				result.errors.some((error) =>
					error.includes("is missing a displayType")
				)
			).toBe(true);
		});

		it("should validate webhook parameters with component schemas", () => {
			mockExists.mockImplementation((filePath) => {
				return (
					filePath.includes("Documentation.mdx") ||
					filePath.includes("spec.json") ||
					filePath.includes("base.json") ||
					filePath.includes("resources") ||
					filePath.includes("webhook.json")
				);
			});
			mockReadFileSync.mockImplementation((filePath) => {
				if (filePath.includes("spec.json")) {
					return JSON.stringify({
						name: "Test Integration",
						activity_type: "customActivity",
						trigger_type: "webhook",
					});
				}
				if (filePath.includes("base.json")) {
					return JSON.stringify({
						parameters: [],
					});
				}
				if (filePath.includes("webhook.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "webhook_url",
								meta: {
									displayType: "url",
									displayName: "Webhook URL",
									placeholder: "Enter webhook URL",
									description: "The webhook URL",
								},
							},
						],
					});
				}
				if (filePath.includes("users.json")) {
					return JSON.stringify({
						parameters: [],
						list: { parameters: [], definition: {} },
					});
				}
				return "{}";
			});

			const result = validation.validateIntegrationSchemas(testDir);
			expect(result.success).toBe(true);
		});

		it("should test extractAllowedKeys and validateSchemaKeys functions with nested objects", () => {
			mockExists.mockImplementation((filePath) => {
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
								name: "complex_param",
								meta: {
									displayType: "text",
									displayName: "Complex Parameter",
									placeholder: "Enter text",
									description: "Test description",
									validation: {
										required: true,
										min: 1,
										max: 100,
										pattern: "^[a-zA-Z]+$",
										requiredDetail: {
											errorMsg: "Value is required",
										},
										patternDetail: {
											errorMsg: "Value must be valid",
										},
										minDetail: {
											errorMsg: "Value too short",
										},
										maxDetail: {
											errorMsg: "Value too long",
										},
									},
									dependencies: {
										conditions: [
											{
												field: "name",
												operator: "eq",
												value: "test",
											},
										],
									},
								},
							},
						],
					});
				}
				if (filePath.includes("users.json")) {
					return JSON.stringify({
						parameters: [],
						list: { parameters: [], definition: {} },
					});
				}
				return "{}";
			});

			const result = validation.validateIntegrationSchemas(testDir);
			expect(result.success).toBe(true);
		});

		it("should handle component schema with missing meta definition", () => {
			// Create a custom component schema module mock
			const mockComponentSchemas = {
				text: {
					name: "name",
					// Missing meta definition - this should trigger the error
				},
				select: {
					name: "name",
					meta: {
						displayName: "Display Name",
						displayType: "select",
						placeholder: "Select an option",
						description: "Select from available options",
						options: [],
					},
				},
			};

			// Mock the component schemas module
			jest.doMock(
				"../templates/component-schemas.js",
				() => mockComponentSchemas
			);

			// Clear the module cache and re-import
			delete require.cache[require.resolve("../helper/validation.js")];
			const validationWithMockedSchema = require("../helper/validation.js");

			mockExists.mockImplementation((filePath) => {
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
								name: "test_param",
								meta: {
									displayType: "text",
									displayName: "Test Parameter",
								},
							},
						],
					});
				}
				if (filePath.includes("users.json")) {
					return JSON.stringify({
						parameters: [],
						list: { parameters: [], definition: {} },
					});
				}
				return "{}";
			});

			const result =
				validationWithMockedSchema.validateIntegrationSchemas(testDir);
			expect(result.success).toBe(false);
			// The test should fail because of missing placeholder and description, not missing meta
			expect(
				result.errors.some(
					(error) =>
						error.includes("is missing a placeholder") ||
						error.includes("is missing a description")
				)
			).toBe(true);

			// Restore the original module
			jest.dontMock("../templates/component-schemas.js");
			delete require.cache[require.resolve("../helper/validation.js")];
		});

		it("should handle inconsistent resource prefix in operation fields", () => {
			mockExists.mockReturnValue(true);
			mockReaddirSync.mockReturnValue(["resource1.json"]);

			mockReadFileSync.mockImplementation((filePath) => {
				if (filePath.includes("spec.json")) {
					return JSON.stringify({
						name: "Test Integration",
						description: "Test",
						activity_type: ["customActivity"],
					});
				}
				if (filePath.includes("base.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "resource",
								meta: {
									displayType: "select",
									placeholder: "Select resource",
									description: "Choose resource",
									options: [
										{
											value: "resource1",
											label: "Resource 1",
											description: "First resource",
										},
									],
								},
							},
						],
					});
				}
				if (filePath.includes("Documentation.mdx")) {
					return "# Documentation";
				}
				if (filePath.includes("resource1.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "operation",
								meta: {
									displayType: "select",
									placeholder: "Select operation",
									description: "Choose operation",
									options: [
										{
											value: "wrongresource.create",
											label: "Create",
											description: "Create resource",
										},
									],
								},
							},
						],
						create: { parameters: [], definition: {} },
					});
				}
				return "{}";
			});

			const result = validation.validateIntegrationSchemas(testDir);
			expect(result.success).toBe(false);
			expect(
				result.errors.some((error) =>
					error.includes("inconsistent resource prefix")
				)
			).toBe(true);
		});

		it("should handle unsupported displayType in component schema", () => {
			mockExists.mockReturnValue(true);
			mockReaddirSync.mockReturnValue([]);

			mockReadFileSync.mockImplementation((filePath) => {
				if (filePath.includes("spec.json")) {
					return JSON.stringify({
						name: "Test Integration",
						description: "Test",
						activity_type: ["customActivity"],
					});
				}
				if (filePath.includes("base.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "test_field",
								meta: {
									displayType: "unsupported_type",
								},
							},
						],
					});
				}
				if (filePath.includes("Documentation.mdx")) {
					return "# Documentation";
				}
				return "{}";
			});

			const result = validation.validateIntegrationSchemas(testDir);
			expect(result.success).toBe(false);
			expect(
				result.errors.some((error) =>
					error.includes("unsupported displayType")
				)
			).toBe(true);
		});

		it("should handle operation field validation with invalid format", () => {
			mockExists.mockReturnValue(true);
			mockReaddirSync.mockReturnValue(["resource1.json"]);

			mockReadFileSync.mockImplementation((filePath) => {
				if (filePath.includes("spec.json")) {
					return JSON.stringify({
						name: "Test Integration",
						description: "Test",
						activity_type: ["customActivity"],
					});
				}
				if (filePath.includes("base.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "resource",
								meta: {
									displayType: "select",
									placeholder: "Select resource",
									description: "Choose resource",
									options: [
										{
											value: "resource1",
											label: "Resource 1",
											description: "First resource",
										},
									],
								},
							},
						],
					});
				}
				if (filePath.includes("Documentation.mdx")) {
					return "# Documentation";
				}
				if (filePath.includes("resource1.json")) {
					return JSON.stringify({
						parameters: [
							{
								name: "operation",
								meta: {
									displayType: "select",
									placeholder: "Select operation",
									description: "Choose operation",
									options: [
										{
											value: "invalid_format",
											label: "Invalid",
											description: "Invalid format",
										},
									],
								},
							},
						],
						create: { parameters: [], definition: {} },
					});
				}
				return "{}";
			});

			const result = validation.validateIntegrationSchemas(testDir);
			expect(result.success).toBe(false);
			expect(
				result.errors.some((error) => error.includes("invalid option"))
			).toBe(true);
		});
	});
});
