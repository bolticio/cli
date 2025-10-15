import fs from "fs";
import isEmpty from "lodash.isempty";
import path from "path";
import * as componentSchemas from "../templates/component-schemas.js";
import { validateMarkdownFile } from "./markdown.js";

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
const findOperationFieldsWithOptions = (
	schema,
	fileLabel,
	errors,
	expectedResourceName
) => {
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
				param.meta.options.forEach((opt, index) => {
					if (typeof opt.value === "string") {
						const parts = opt.value.split(".");
						if (parts.length < 2) {
							errors.add(
								`"operation" field in "${fileLabel}" has an invalid option at index ${index} with value "${opt.value}". Expected format "resource.operation".`
							);
						} else {
							const resource = parts[0];
							if (resource !== expectedResourceName) {
								errors.add(
									`"operation" field in "${fileLabel}" has an inconsistent resource prefix at index ${index}. Found "${resource}" but expected "${expectedResourceName}".`
								);
							}
							operationFields.push(opt.value);
						}
					}
				});
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
	prefix = "",
	filename = ""
) => {
	const fileLabel = filename ? ` in "${filename}"` : "";

	Object.keys(schemaObj).forEach((key) => {
		const fullKey = prefix ? `${prefix}.${key}` : key;

		// Special handling for config.body - skip validation for select, autocomplete, and multiselect
		if (
			fullKey === "config.body" &&
			(displayType === "select" ||
				displayType === "autocomplete" ||
				displayType === "multiselect")
		) {
			// For these display types, config.body can contain any keys, so we skip validation
			return;
		}

		if (!allowedKeys.has(fullKey)) {
			errors.add(
				`"${schemaName}" has an invalid key "${fullKey}" for displayType "${displayType}"${fileLabel}.`
			);
		}

		if (
			typeof schemaObj[key] === "object" &&
			schemaObj[key] !== null &&
			!Array.isArray(schemaObj[key]) &&
			// Skip recursion for config.body of select/autocomplete/multiselect
			!(
				fullKey === "config.body" &&
				(displayType === "select" ||
					displayType === "autocomplete" ||
					displayType === "multiselect")
			)
		) {
			validateSchemaKeys(
				schemaObj[key],
				allowedKeys,
				schemaName,
				displayType,
				errors,
				fullKey,
				filename
			);
		}
	});
};

/**
 * Validate a single component schema against its component type definition
 * @param {Object} schema - The schema to validate
 * @param {string} displayType - The display type to validate against
 * @param {Set} errors - Error collection
 * @param {string} filename - The filename for error messages
 */
const validateComponentByType = (
	schema,
	displayType,
	errors,
	filename = ""
) => {
	const fileLabel = filename ? ` in "${filename}"` : "";

	// Get the component schema definition for this display type
	const componentSchema = componentSchemas[displayType];

	if (!componentSchema) {
		errors.add(
			`"${schema.name}" has an unsupported displayType "${displayType}"${fileLabel}.`
		);
		return;
	}

	if (!componentSchema.meta) {
		errors.add(
			`Component schema for "${displayType}" is missing meta definition${fileLabel}.`
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
		errors,
		"",
		filename
	);
};

const validateComponentSchemas = (schemas, errors, filename = "") => {
	const fileLabel = filename ? ` in "${filename}"` : "";

	schemas.forEach((schema) => {
		// Basic required field validation
		if (!schema.name) {
			errors.add(`Schema is missing a name${fileLabel}.`);
			return; // Can't continue without a name
		}
		if (!schema.meta) {
			errors.add(
				`"${schema.name}" is missing a meta object${fileLabel}.`
			);
			return; // Can't continue without meta
		}
		if (!schema.meta.displayType) {
			errors.add(
				`"${schema.name}" is missing a displayType${fileLabel}.`
			);
			return; // Can't continue without displayType
		}

		// Optional field validation (these are warnings, not blocking)
		if (!schema.meta.displayName) {
			errors.add(
				`"${schema.name}" is missing a displayName${fileLabel}.`
			);
		}

		// Only require placeholder if the component schema defines it
		const componentSchema = componentSchemas[schema.meta.displayType];
		if (
			componentSchema &&
			componentSchema.meta &&
			"placeholder" in componentSchema.meta &&
			!schema.meta.placeholder
		) {
			errors.add(
				`"${schema.name}" is missing a placeholder${fileLabel}.`
			);
		}

		// Only require description if the component schema defines it
		if (
			componentSchema &&
			componentSchema.meta &&
			"description" in componentSchema.meta &&
			!schema.meta.description
		) {
			errors.add(
				`"${schema.name}" is missing a description${fileLabel}.`
			);
		}

		// 🚨 Validate for duplicate options with same label and value
		if (Array.isArray(schema.meta.options)) {
			const seen = new Set();
			schema.meta.options.forEach((option, index) => {
				if (option && typeof option === "object") {
					const key = `${option.label}::${option.value}`;
					if (seen.has(key)) {
						errors.add(
							`"${schema.name}" contains duplicate option at index ${index} with label "${option.label}" and value "${option.value}"${fileLabel}.`
						);
					} else {
						seen.add(key);
					}
				}
			});
		}

		// Validate against the specific component type schema
		validateComponentByType(
			schema,
			schema.meta.displayType,
			errors,
			filename
		);
	});
};

// ─────────────────────────────────────────────────────────────────────────────
// INDIVIDUAL VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

const validateDocumentation = (currentDir, spec, errors) => {
	const docsIntegrationPath = path.join(
		currentDir,
		"documentation",
		"integration.mdx"
	);
	const docsTriggerPath = path.join(
		currentDir,
		"documentation",
		"trigger.mdx"
	);
	const legacyDocPath = path.join(currentDir, "Documentation.mdx");

	const requiresIntegrationDoc = spec && !isEmpty(spec.activity_type);
	const requiresTriggerDoc = spec && spec.trigger_type === "CloudTrigger";

	// Backward-compatibility: if nothing specific is required by spec,
	// ensure at least legacy Documentation.mdx or new docs exist
	const hasLegacy = fs.existsSync(legacyDocPath);
	const hasNewIntegration = fs.existsSync(docsIntegrationPath);
	const hasNewTrigger = fs.existsSync(docsTriggerPath);

	if (!requiresIntegrationDoc && !requiresTriggerDoc) {
		if (!hasLegacy && !hasNewIntegration && !hasNewTrigger) {
			errors.add('"Documentation.mdx" not found in the root directory.');
			return; // No further checks needed
		}
		// If files exist, validate whatever is present
		if (hasLegacy) {
			validateMarkdownFile(legacyDocPath, errors, "Documentation.mdx");
		}
		if (hasNewIntegration) {
			validateMarkdownFile(
				docsIntegrationPath,
				errors,
				"documentation/integration.mdx"
			);
		}
		if (hasNewTrigger) {
			validateMarkdownFile(
				docsTriggerPath,
				errors,
				"documentation/trigger.mdx"
			);
		}
		return;
	}

	if (requiresIntegrationDoc) {
		const hasNew = validateMarkdownFile(
			docsIntegrationPath,
			errors,
			"documentation/integration.mdx"
		);
		const hasLegacyValidated = validateMarkdownFile(
			legacyDocPath,
			errors,
			"Documentation.mdx"
		);
		if (!hasNew && !hasLegacyValidated) {
			// Maintain backward-compatible error message expected by tests
			errors.add('"Documentation.mdx" not found in the root directory.');
		}
	}

	if (requiresTriggerDoc) {
		const hasTrigger = validateMarkdownFile(
			docsTriggerPath,
			errors,
			"documentation/trigger.mdx"
		);
		if (!hasTrigger) {
			errors.add(
				'"documentation/trigger.mdx" not found when trigger_type is "CloudTrigger".'
			);
		}
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
			validateComponentSchemas(
				webhookSchema.parameters,
				errors,
				"webhook.json"
			);
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
		validateComponentSchemas(baseSchema.parameters, errors, "base.json");
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
			validateComponentSchemas(
				authSchema.parameters,
				errors,
				"authentication.json"
			);
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
							errors,
							"authentication.json"
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
			validateComponentSchemas(
				schema.parameters,
				errors,
				`${resourceFile}.json`
			);
		}

		const operationFields = findOperationFieldsWithOptions(
			schema,
			`${resourceFile}.json`,
			errors,
			resourceFile
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
					validateComponentSchemas(
						methodDef.parameters,
						errors,
						`${resourceFile}.json`
					);
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
	};

	// Step-by-step validation
	const spec = validateSpec(paths.spec, errors);
	validateDocumentation(currentDir, spec, errors);
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
