import fs from "fs";
import isEmpty from "lodash.isempty";
import path from "path";
import * as componentSchemas from "../templates/component-schemas.js";

const validateOptionObject = (options, fieldName, fileLabel, errors) => {
	options.forEach((opt, index) => {
		const missingKeys = ["label", "value", "description"].filter(
			(key) => !(key in opt)
		);

		if (missingKeys.length > 0) {
			errors.add(
				`"${fieldName}" field in "${fileLabel}" has an option at index ${index} missing keys: ${missingKeys.join(", ")}.`
			);
		}
	});
};

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
const findResourceFieldsWithOptions = (schema, fileLabel, errors) => {
	const resourceFields = [];
	if (Array.isArray(schema?.parameters)) {
		schema.parameters.forEach((param) => {
			if (
				param.name === "resource" &&
				Array.isArray(param.meta?.options)
			) {
				validateOptionObject(
					param.meta.options,
					"resource",
					fileLabel,
					errors
				);
				resourceFields.push(
					...param.meta.options.map((opt) => opt.value)
				);
			}
		});
	}
	return resourceFields;
};
const findOperationFieldsWithOptions = (schema, fileLabel, errors) => {
	const operationFields = [];
	if (Array.isArray(schema?.parameters)) {
		schema.parameters.forEach((param) => {
			if (
				param.name === "operation" &&
				Array.isArray(param.meta?.options)
			) {
				validateOptionObject(
					param.meta.options,
					"operation",
					fileLabel,
					errors
				);
				operationFields.push(
					...param.meta.options.map((opt) => opt.value)
				);
			}
		});
	}
	return operationFields;
};

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATE COMPONENT SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract all possible keys from a component schema structure recursively
 * @param {Object} obj - The object to extract keys from
 * @param {string} prefix - Current key prefix for nested objects
 * @returns {Set<string>} Set of all allowed keys with dot notation for nested paths
 */
const extractAllowedKeys = (obj, prefix = "") => {
	const allowedKeys = new Set();

	Object.keys(obj).forEach((key) => {
		const fullKey = prefix ? `${prefix}.${key}` : key;
		allowedKeys.add(fullKey);

		if (
			typeof obj[key] === "object" &&
			obj[key] !== null &&
			!Array.isArray(obj[key])
		) {
			const nestedKeys = extractAllowedKeys(obj[key], fullKey);
			nestedKeys.forEach((nestedKey) => allowedKeys.add(nestedKey));
		}
	});

	return allowedKeys;
};

/**
 * Validate that a schema object doesn't contain any extra keys
 * @param {Object} schemaObj - The schema object to validate
 * @param {Set<string>} allowedKeys - Set of allowed keys
 * @param {string} schemaName - Name of the schema for error messages
 * @param {string} displayType - The display type for error messages
 * @param {Set} errors - Error collection
 * @param {string} prefix - Current key prefix for nested objects
 */
const validateSchemaKeys = (
	schemaObj,
	allowedKeys,
	schemaName,
	displayType,
	errors,
	prefix = ""
) => {
	Object.keys(schemaObj).forEach((key) => {
		const fullKey = prefix ? `${prefix}.${key}` : key;

		if (!allowedKeys.has(fullKey)) {
			errors.add(
				`"${schemaName}" has an invalid key "${fullKey}" for displayType "${displayType}".`
			);
		}

		if (
			typeof schemaObj[key] === "object" &&
			schemaObj[key] !== null &&
			!Array.isArray(schemaObj[key])
		) {
			validateSchemaKeys(
				schemaObj[key],
				allowedKeys,
				schemaName,
				displayType,
				errors,
				fullKey
			);
		}
	});
};

/**
 * Validate a single component schema against its component type definition
 * @param {Object} schema - The schema to validate
 * @param {string} displayType - The display type to validate against
 * @param {Set} errors - Error collection
 */
const validateComponentByType = (schema, displayType, errors) => {
	// Get the component schema definition for this display type
	const componentSchema = componentSchemas[displayType];

	if (!componentSchema) {
		errors.add(
			`"${schema.name}" has an unsupported displayType "${displayType}".`
		);
		return;
	}

	if (!componentSchema.meta) {
		errors.add(
			`Component schema for "${displayType}" is missing meta definition.`
		);
		return;
	}

	// Extract allowed keys from the component schema
	const allowedKeys = extractAllowedKeys(componentSchema.meta);

	// Validate the schema meta object (excluding displayType which we already handled)
	const { displayType: currentDisplayType, ...restMeta } = schema.meta;
	validateSchemaKeys(
		restMeta,
		allowedKeys,
		schema.name,
		currentDisplayType,
		errors
	);
};

const validateComponentSchemas = (schemas, errors) => {
	schemas.forEach((schema) => {
		// Basic required field validation
		if (!schema.name) {
			errors.add(`Schema is missing a name.`);
			return; // Can't continue without a name
		}
		if (!schema.meta) {
			errors.add(`"${schema.name}" is missing a meta object.`);
			return; // Can't continue without meta
		}
		if (!schema.meta.displayType) {
			errors.add(`"${schema.name}" is missing a displayType.`);
			return; // Can't continue without displayType
		}

		// Optional field validation (these are warnings, not blocking)
		if (!schema.meta.displayName) {
			errors.add(`"${schema.name}" is missing a displayName.`);
		}

		// Only require placeholder if the component schema defines it
		const componentSchema = componentSchemas[schema.meta.displayType];
		if (
			componentSchema &&
			componentSchema.meta &&
			"placeholder" in componentSchema.meta &&
			!schema.meta.placeholder
		) {
			errors.add(`"${schema.name}" is missing a placeholder.`);
		}

		if (!schema.meta.description) {
			errors.add(`"${schema.name}" is missing a description.`);
		}

		// Validate against the specific component type schema
		validateComponentByType(schema, schema.meta.displayType, errors);
	});
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

	// Validate webhook schema parameters if webhook exists
	if (hasWebhook) {
		const webhookSchema = readAndParseJson(
			webhookPath,
			"webhook.json",
			errors
		);
		if (webhookSchema && Array.isArray(webhookSchema.parameters)) {
			validateComponentSchemas(webhookSchema.parameters, errors);
		}
	}
};

const validateBaseSchema = (baseSchemaPath, errors) => {
	if (!fs.existsSync(baseSchemaPath)) {
		errors.add(`"base.json" not found in the "schemas" directory.`);
		return null;
	}

	const baseSchema = readAndParseJson(baseSchemaPath, "base.json", errors);

	// Validate base schema parameters
	if (baseSchema && Array.isArray(baseSchema.parameters)) {
		validateComponentSchemas(baseSchema.parameters, errors);
	}

	return baseSchema;
};

const validateAuthentication = (authPath, errors) => {
	// Authentication is optional, so only validate if it exists
	if (fs.existsSync(authPath)) {
		const authSchema = readAndParseJson(
			authPath,
			"authentication.json",
			errors
		);

		// Validate authentication schema parameters
		if (authSchema && Array.isArray(authSchema.parameters)) {
			validateComponentSchemas(authSchema.parameters, errors);
		}

		// Validate authentication type-specific parameters (like api_key, oauth, etc.)
		if (authSchema) {
			Object.keys(authSchema).forEach((key) => {
				if (
					key !== "parameters" &&
					typeof authSchema[key] === "object" &&
					authSchema[key] !== null
				) {
					if (Array.isArray(authSchema[key].parameters)) {
						validateComponentSchemas(
							authSchema[key].parameters,
							errors
						);
					}
				}
			});
		}
	}
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

		// Validate resource file parameters
		if (Array.isArray(schema.parameters)) {
			validateComponentSchemas(schema.parameters, errors);
		}

		const operationFields = findOperationFieldsWithOptions(
			schema,
			`${resourceFile}.json`,
			errors
		);

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
			} else {
				// Validate operation parameters using component schemas
				if (Array.isArray(methodDef.parameters)) {
					validateComponentSchemas(methodDef.parameters, errors);
				}
			}
			if (!methodDef.definition) {
				errors.add(
					`Operation "${operationMethod}" in "${resourceFile}.json" is missing definition.`
				);
			}
		});
	});
};

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
		authentication: path.join(currentDir, "schemas", "authentication.json"),
		documentation: path.join(currentDir, "Documentation.mdx"),
	};

	// Step-by-step validation
	validateDocumentation(paths.documentation, errors);

	const spec = validateSpec(paths.spec, errors);
	validateWebhook(paths.webhook, spec, errors);
	validateAuthentication(paths.authentication, errors);

	const baseSchema = validateBaseSchema(paths.base, errors);
	const resourceFields = baseSchema
		? findResourceFieldsWithOptions(baseSchema, "base.json", errors)
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
