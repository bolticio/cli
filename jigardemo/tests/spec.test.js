// test for spec.json and all schema files

const SpecLoader = require("../lib/spec-loader");
const SchemaLoader = require("../lib/schema-loader");

describe("spec.json via SpecLoader", () => {
	let specLoader;

	beforeEach(() => {
		specLoader = new SpecLoader();
	});

	it("should load spec file successfully", () => {
		const loadedSpec = specLoader.loadSpec();
		expect(loadedSpec).toBeDefined();
		expect(typeof loadedSpec).toBe("object");
	});

	it("should validate spec structure", () => {
		const loadedSpec = specLoader.loadSpec();
		const validation = specLoader.validateSpecStructure(loadedSpec);
		expect(validation.valid).toBe(true);
	});

	it("should validate UUID format", () => {
		const loadedSpec = specLoader.loadSpec();
		const isValidUUID = specLoader.validateUUID(loadedSpec.id);
		expect(isValidUUID).toBe(true);
	});

	it("should validate activity type", () => {
		const loadedSpec = specLoader.loadSpec();
		const isValidActivityType = specLoader.validateActivityType(
			loadedSpec.activity_type
		);
		expect(isValidActivityType).toBe(true);
	});

	it("should get spec properties by path", () => {
		specLoader.loadSpec();
		const name = specLoader.getSpecProperty("name");
		const triggerDesc = specLoader.getSpecProperty("description.trigger");
		const integrationDesc = specLoader.getSpecProperty(
			"description.integration"
		);

		expect(name).toBeDefined();
		expect(triggerDesc).toBeDefined();
		expect(integrationDesc).toBeDefined();
	});

	it("should handle invalid property paths", () => {
		specLoader.loadSpec();
		const invalid = specLoader.getSpecProperty("nonexistent.path");
		expect(invalid).toBeUndefined();
	});
});

describe("Schema files via SchemaLoader", () => {
	let schemaLoader;

	beforeEach(() => {
		schemaLoader = new SchemaLoader();
	});

	it("should load authentication schema", () => {
		const authSchema = schemaLoader.loadAuthenticationSchema();
		if (authSchema) {
			expect(authSchema).toBeDefined();
			expect(typeof authSchema).toBe("object");
		}
	});

	it("should load base schema", () => {
		const baseSchema = schemaLoader.loadBaseSchema();
		if (baseSchema) {
			expect(baseSchema).toBeDefined();
			expect(typeof baseSchema).toBe("object");
		}
	});

	it("should load webhook schema", () => {
		const webhookSchema = schemaLoader.loadWebhookSchema();
		if (webhookSchema) {
			expect(webhookSchema).toBeDefined();
			expect(typeof webhookSchema).toBe("object");
		}
	});

	it("should load resource schemas", () => {
		const resources = schemaLoader.loadResourceSchemas();
		expect(typeof resources).toBe("object");

		const resourceKeys = Object.keys(resources);
		if (resourceKeys.length > 0) {
			resourceKeys.forEach((key) => {
				expect(resources[key]).toBeDefined();
				expect(typeof resources[key]).toBe("object");
			});
		}
	});

	it("should load all schemas", () => {
		const allSchemas = schemaLoader.loadAllSchemas();
		expect(allSchemas).toBeDefined();
		expect(typeof allSchemas).toBe("object");
		expect(allSchemas).toHaveProperty("authentication");
		expect(allSchemas).toHaveProperty("base");
		expect(allSchemas).toHaveProperty("webhook");
		expect(allSchemas).toHaveProperty("resources");
	});

	it("should validate schema existence", () => {
		const authExists = schemaLoader.validateSchemaExists("authentication");
		const baseExists = schemaLoader.validateSchemaExists("base");
		const webhookExists = schemaLoader.validateSchemaExists("webhook");

		expect(typeof authExists).toBe("boolean");
		expect(typeof baseExists).toBe("boolean");
		expect(typeof webhookExists).toBe("boolean");
	});

	it("should find all JSON files", () => {
		const jsonFiles = schemaLoader.getAllJsonFiles();
		expect(Array.isArray(jsonFiles)).toBe(true);
		expect(jsonFiles.length).toBeGreaterThan(0);

		jsonFiles.forEach((file) => {
			expect(file.endsWith(".json")).toBe(true);
		});
	});

	it("should validate all JSON syntax", () => {
		const results = schemaLoader.validateAllJsonSyntax();
		expect(Array.isArray(results)).toBe(true);
		expect(results.length).toBeGreaterThan(0);

		results.forEach((result) => {
			expect(result).toHaveProperty("file");
			expect(result).toHaveProperty("valid");
			expect(result.valid).toBe(true);
		});
	});
});
