// Write test cases for base.json file present inside the schemas folder.

import { describe, expect, test } from "@jest/globals";
import baseSchema from "../schemas/base.json";

describe("Base Schema Tests", () => {
	test("should have a valid schema structure", () => {
		expect(baseSchema).toBeDefined();
		expect(typeof baseSchema).toBe("object");
	});

	test("should contain required base fields", () => {
		expect(baseSchema).toHaveProperty("parameters");
		expect(Array.isArray(baseSchema.parameters)).toBe(true);
		expect(baseSchema.parameters.length).toBe(2);
	});

	test("should have valid parameters array", () => {
		const { parameters } = baseSchema;
		expect(parameters).toBeDefined();
		expect(Array.isArray(parameters)).toBe(true);
		expect(parameters.length).toBeGreaterThan(0);

		// Check that each parameter has required properties
		parameters.forEach((param) => {
			expect(param).toHaveProperty("name");
			expect(param).toHaveProperty("meta");
			expect(typeof param.name).toBe("string");
			expect(typeof param.meta).toBe("object");
		});
	});

	test("should have valid secret parameter", () => {
		const secretParam = baseSchema.parameters.find(
			(p) => p.name === "secret"
		);
		expect(secretParam).toBeDefined();
		expect(secretParam.name).toBe("secret");

		const { meta } = secretParam;
		expect(meta).toHaveProperty("displayName");
		expect(meta).toHaveProperty("displayType");
		expect(meta).toHaveProperty("placeholder");
		expect(meta).toHaveProperty("description");
		expect(meta.displayType).toBe("autocomplete");
		expect(typeof meta.displayName).toBe("string");
		expect(typeof meta.placeholder).toBe("string");
		expect(typeof meta.description).toBe("string");
	});

	test("should have valid resource parameter", () => {
		const resourceParam = baseSchema.parameters.find(
			(p) => p.name === "resource"
		);
		expect(resourceParam).toBeDefined();
		expect(resourceParam.name).toBe("resource");

		const { meta } = resourceParam;
		expect(meta).toHaveProperty("displayName");
		expect(meta).toHaveProperty("displayType");
		expect(meta).toHaveProperty("placeholder");
		expect(meta).toHaveProperty("description");
		expect(meta.displayType).toBe("select");
		expect(typeof meta.displayName).toBe("string");
		expect(typeof meta.placeholder).toBe("string");
		expect(typeof meta.description).toBe("string");
	});

	test("should have valid config for secret parameter", () => {
		const secretParam = baseSchema.parameters.find(
			(p) => p.name === "secret"
		);
		const { meta } = secretParam;

		expect(meta).toHaveProperty("config");
		expect(typeof meta.config).toBe("object");

		const { config } = meta;
		expect(config).toHaveProperty("urlType");
		expect(config).toHaveProperty("method");
		expect(config).toHaveProperty("url");
		expect(config).toHaveProperty("labelKey");
		expect(config).toHaveProperty("valueKey");

		expect(config.urlType).toBe("secret");
		expect(config.method).toBe("get");
		expect(typeof config.url).toBe("string");
		expect(typeof config.labelKey).toBe("string");
		expect(typeof config.valueKey).toBe("string");
	});

	test("should have valid htmlProps for secret parameter", () => {
		const secretParam = baseSchema.parameters.find(
			(p) => p.name === "secret"
		);
		const { meta } = secretParam;

		expect(meta).toHaveProperty("htmlProps");
		expect(typeof meta.htmlProps).toBe("object");

		const { htmlProps } = meta;
		expect(htmlProps).toHaveProperty("showAddNew");
		expect(typeof htmlProps.showAddNew).toBe("boolean");
		expect(htmlProps.showAddNew).toBe(true);
	});

	test("should have valid options for parameters", () => {
		const secretParam = baseSchema.parameters.find(
			(p) => p.name === "secret"
		);
		const resourceParam = baseSchema.parameters.find(
			(p) => p.name === "resource"
		);

		// Secret parameter should have empty options array
		expect(secretParam.meta).toHaveProperty("options");
		expect(Array.isArray(secretParam.meta.options)).toBe(true);
		expect(secretParam.meta.options.length).toBe(0);

		// Resource parameter should have options with proper structure
		expect(resourceParam.meta).toHaveProperty("options");
		expect(Array.isArray(resourceParam.meta.options)).toBe(true);
		expect(resourceParam.meta.options.length).toBeGreaterThan(0);

		const firstOption = resourceParam.meta.options[0];
		expect(firstOption).toHaveProperty("label");
		expect(firstOption).toHaveProperty("value");
		expect(firstOption).toHaveProperty("description");
		expect(typeof firstOption.label).toBe("string");
		expect(typeof firstOption.value).toBe("string");
		expect(typeof firstOption.description).toBe("string");
	});

	test("should have valid validation rules", () => {
		const { parameters } = baseSchema;

		parameters.forEach((param) => {
			const { meta } = param;
			expect(meta).toHaveProperty("validation");
			expect(typeof meta.validation).toBe("object");

			const { validation } = meta;
			expect(validation).toHaveProperty("required");
			expect(typeof validation.required).toBe("boolean");
			expect(validation.required).toBe(true);
		});
	});

	test("should have valid dependencies for resource parameter", () => {
		const resourceParam = baseSchema.parameters.find(
			(p) => p.name === "resource"
		);
		const { meta } = resourceParam;

		expect(meta).toHaveProperty("dependencies");
		expect(typeof meta.dependencies).toBe("object");

		const { dependencies } = meta;
		expect(dependencies).toHaveProperty("conditions");
		expect(Array.isArray(dependencies.conditions)).toBe(true);
		expect(dependencies.conditions.length).toBeGreaterThan(0);

		const firstCondition = dependencies.conditions[0];
		expect(firstCondition).toHaveProperty("field");
		expect(firstCondition).toHaveProperty("operator");
		expect(firstCondition.field).toBe("secret");
		expect(firstCondition.operator).toBe("NOT_EMPTY");
	});

	test("should have valid value properties", () => {
		const { parameters } = baseSchema;

		parameters.forEach((param) => {
			const { meta } = param;
			expect(meta).toHaveProperty("value");
			expect(typeof meta.value).toBe("string");
			expect(meta.value).toBe("");
		});
	});

	test("should match expected base schema format", () => {
		// Test secret parameter
		const secretParam = baseSchema.parameters.find(
			(p) => p.name === "secret"
		);
		expect(secretParam.name).toBeTruthy();
		expect(secretParam.meta.displayName).toBeTruthy();
		expect(secretParam.meta.displayType).toBeTruthy();
		expect(secretParam.meta.config.urlType).toBeTruthy();

		// Test resource parameter
		const resourceParam = baseSchema.parameters.find(
			(p) => p.name === "resource"
		);
		expect(resourceParam.name).toBeTruthy();
		expect(resourceParam.meta.displayName).toBeTruthy();
		expect(resourceParam.meta.displayType).toBeTruthy();
		expect(
			resourceParam.meta.dependencies.conditions.length
		).toBeGreaterThan(0);
	});

	test("should have proper parameter order", () => {
		const { parameters } = baseSchema;
		expect(parameters[0].name).toBe("secret");
		expect(parameters[1].name).toBe("resource");
	});
});
