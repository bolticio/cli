// Write test cases for authentication.json file present inside the schemas folder.
import { describe, expect, test } from "@jest/globals";
import authenticationSchema from "../schemas/authentication.json";

describe("Authentication Schema Tests", () => {
	test("should have a valid schema structure", () => {
		expect(authenticationSchema).toBeDefined();
		expect(typeof authenticationSchema).toBe("object");
	});

	test("should contain required authentication fields", () => {
		expect(authenticationSchema).toHaveProperty("parameters");
		expect(authenticationSchema).toHaveProperty("api_key");
		expect(Array.isArray(authenticationSchema.parameters)).toBe(true);
	});

	test("should have valid parameters array", () => {
		const { parameters } = authenticationSchema;
		expect(parameters).toBeDefined();
		expect(Array.isArray(parameters)).toBe(true);
		expect(parameters.length).toBeGreaterThan(0);

		// Check first parameter (type selection)
		const typeParam = parameters[0];
		expect(typeParam).toHaveProperty("name");
		expect(typeParam).toHaveProperty("meta");
		expect(typeParam.name).toBe("type");
	});

	test("should have valid meta properties for type parameter", () => {
		const typeParam = authenticationSchema.parameters[0];
		const { meta } = typeParam;
		expect(meta).toBeDefined();
		expect(meta).toHaveProperty("displayName");
		expect(meta).toHaveProperty("displayType");
		expect(typeof meta.displayName).toBe("string");
		expect(typeof meta.displayType).toBe("string");
		expect(meta.displayType).toBe("select");
	});

	test("should have proper validation rules if present", () => {
		const typeParam = authenticationSchema.parameters[0];
		const { meta } = typeParam;
		if (meta.validation) {
			expect(typeof meta.validation).toBe("object");
			if (meta.validation.required !== undefined) {
				expect(typeof meta.validation.required).toBe("boolean");
			}
		}
	});

	test("should have valid options for select type", () => {
		const typeParam = authenticationSchema.parameters[0];
		const { meta } = typeParam;
		expect(meta).toHaveProperty("options");
		expect(Array.isArray(meta.options)).toBe(true);
		expect(meta.options.length).toBeGreaterThan(0);

		// Check option structure
		const firstOption = meta.options[0];
		expect(firstOption).toHaveProperty("label");
		expect(firstOption).toHaveProperty("value");
		expect(typeof firstOption.label).toBe("string");
		expect(typeof firstOption.value).toBe("string");
	});

	test("should have valid api_key configuration", () => {
		const { api_key } = authenticationSchema;
		expect(api_key).toBeDefined();
		expect(api_key).toHaveProperty("parameters");
		expect(Array.isArray(api_key.parameters)).toBe(true);
		expect(api_key.parameters.length).toBeGreaterThan(0);

		// Check api_key parameter
		const apiKeyParam = api_key.parameters[0];
		expect(apiKeyParam).toHaveProperty("name");
		expect(apiKeyParam).toHaveProperty("meta");
		expect(apiKeyParam.name).toBe("api_key");
	});

	test("should have valid api_key meta properties", () => {
		const apiKeyParam = authenticationSchema.api_key.parameters[0];
		const { meta } = apiKeyParam;
		expect(meta).toBeDefined();
		expect(meta).toHaveProperty("displayName");
		expect(meta).toHaveProperty("displayType");
		expect(meta.displayType).toBe("password");
		expect(typeof meta.displayName).toBe("string");
		expect(typeof meta.displayType).toBe("string");
	});

	test("should have proper validation for api_key", () => {
		const apiKeyParam = authenticationSchema.api_key.parameters[0];
		const { meta } = apiKeyParam;
		expect(meta).toHaveProperty("validation");
		expect(typeof meta.validation).toBe("object");
		expect(meta.validation).toHaveProperty("required");
		expect(typeof meta.validation.required).toBe("boolean");
		expect(meta.validation.required).toBe(true);
	});

	test("should match expected authentication schema format", () => {
		// Test type parameter
		const typeParam = authenticationSchema.parameters[0];
		expect(typeParam.name).toBeTruthy();
		expect(typeParam.meta.displayName).toBeTruthy();
		expect(typeParam.meta.displayType).toBeTruthy();

		// Test api_key parameter
		const apiKeyParam = authenticationSchema.api_key.parameters[0];
		expect(apiKeyParam.name).toBeTruthy();
		expect(apiKeyParam.meta.displayName).toBeTruthy();
		expect(apiKeyParam.meta.displayType).toBeTruthy();
	});
});
