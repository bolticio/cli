import fs from "fs";
import isEmpty from "lodash.isempty";
import path from "path";

const readAndParseJson = (filePath, fileLabel, errors) => {
	try {
		const content = fs.readFileSync(filePath, "utf8");
		if (!content.trim()) {
			errors.add(`"${fileLabel}" is empty.`);
			return null;
		}
		return JSON.parse(content);
	} catch (e) {
		errors.add(`Failed to read or parse "${fileLabel}": ${e.message}`);
		return null;
	}
};

const findResourceFieldsWithOptions = (schema) => {
	const resourceFields = [];
	if (Array.isArray(schema?.parameters)) {
		schema.parameters.forEach((param) => {
			if (
				param.name === "resource" &&
				Array.isArray(param.meta?.options)
			) {
				resourceFields.push(
					...param.meta.options.map((opt) => opt.value)
				);
			}
		});
	}
	return resourceFields;
};

const findOperationFieldsWithOptions = (schema) => {
	const operationFields = [];
	if (Array.isArray(schema?.parameters)) {
		schema.parameters.forEach((param) => {
			if (
				param.name === "operation" &&
				Array.isArray(param.meta?.options)
			) {
				operationFields.push(
					...param.meta.options.map((opt) => opt.value)
				);
			}
		});
	}
	return operationFields;
};

// ─────────────────────────────────────────────────────────────────────────────
// INDIVIDUAL VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

const validateDocumentation = (docPath, errors) => {
	if (!fs.existsSync(docPath)) {
		errors.add(`"Documentation.mdx" not found in the root directory.`);
	}
};

const validateSpec = (specPath, errors) => {
	if (!fs.existsSync(specPath)) {
		errors.add(`"spec.json" not found in the root directory.`);
		return null;
	}
	const spec = readAndParseJson(specPath, "spec.json", errors);
	return spec;
};

const validateWebhook = (webhookPath, spec, errors) => {
	const hasTrigger = spec && !isEmpty(spec.trigger_type);
	const hasWebhook = fs.existsSync(webhookPath);

	if (hasTrigger && !hasWebhook) {
		errors.add(
			`"webhook.json" not found, but trigger_type is defined in spec.json.`
		);
	}
	if (!hasTrigger && hasWebhook) {
		errors.add(
			`"webhook.json" exists but trigger_type is not defined in spec.json.`
		);
	}
};

const validateBaseSchema = (baseSchemaPath, errors) => {
	if (!fs.existsSync(baseSchemaPath)) {
		errors.add(`"base.json" not found in the "schemas" directory.`);
		return null;
	}
	return readAndParseJson(baseSchemaPath, "base.json", errors);
};

const validateResources = (resourcesDir, resourceFields, errors) => {
	if (!fs.existsSync(resourcesDir)) {
		errors.add(`"resources" directory not found in "schemas".`);
		return;
	}

	const resourceFiles = fs
		.readdirSync(resourcesDir)
		.filter((f) => f.endsWith(".json"))
		.map((f) => path.basename(f, ".json"));

	// Check for missing resource files
	resourceFields.forEach((field) => {
		if (!resourceFiles.includes(field)) {
			errors.add(`Resource file: "${field}.json" is missing.`);
		}
	});

	// Validate each resource file
	resourceFiles.forEach((resourceFile) => {
		const filePath = path.join(resourcesDir, `${resourceFile}.json`);
		const schema = readAndParseJson(
			filePath,
			`${resourceFile}.json`,
			errors
		);
		if (!schema) return;

		const operationFields = findOperationFieldsWithOptions(schema);

		operationFields.forEach((operation) => {
			const operationMethod = operation.split(".")[1];

			if (!operationMethod) {
				errors.add(
					`Invalid format for operation "${operation}" in "${resourceFile}.json". Use "resource.operation".`
				);
				return;
			}

			const methodDef = schema[operationMethod];
			if (!methodDef) {
				errors.add(
					`Operation "${operationMethod}" missing in "${resourceFile}.json".`
				);
				return;
			}
			if (!methodDef.parameters) {
				errors.add(
					`Operation "${operationMethod}" in "${resourceFile}.json" is missing parameters.`
				);
			}
			if (!methodDef.definition) {
				errors.add(
					`Operation "${operationMethod}" in "${resourceFile}.json" is missing definition.`
				);
			}
		});
	});
};

// const validateParametersScema = (schema, errors) => {
// 	if (!schema || !Array.isArray(schema.parameters)) {
// 		errors.add(
// 			`Schema is missing or parameters are not defined as an array.`
// 		);
// 		return;
// 	}
// 	schema.parameters.forEach((param) => {
// 		const { meta } = param;
// 		if (!param.name) {
// 			errors.add(
// 				`Parameter in schema is missing a name. Ensure all parameters have a "name" field.`
// 			);
// 		}
// 	});
// };

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

export const validateIntegrationSchemas = (currentDir) => {
	const errors = new Set();

	// Define file paths
	const paths = {
		base: path.join(currentDir, "schemas", "base.json"),
		resources: path.join(currentDir, "schemas", "resources"),
		spec: path.join(currentDir, "spec.json"),
		webhook: path.join(currentDir, "schemas", "webhook.json"),
		documentation: path.join(currentDir, "Documentation.mdx"),
	};

	// Step-by-step validation
	validateDocumentation(paths.documentation, errors);

	const spec = validateSpec(paths.spec, errors);
	validateWebhook(paths.webhook, spec, errors);

	const baseSchema = validateBaseSchema(paths.base, errors);
	const resourceFields = baseSchema
		? findResourceFieldsWithOptions(baseSchema)
		: [];

	validateResources(paths.resources, resourceFields, errors);

	// Return results
	if (errors.size > 0) {
		return {
			success: false,
			errors: Array.from(errors),
		};
	}

	return { success: true };
};
