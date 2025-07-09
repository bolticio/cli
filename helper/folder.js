import chalk from "chalk";
import fs from "fs";
import isEmpty from "lodash.isempty";
import path from "path";
import {
	authentication,
	base,
	resource1,
	webhook,
} from "../templates/schemas.js";

export const createIntegrationFolderStructure = async (
	integration,
	create_catalogue
) => {
	const { id, name, description, icon, activity_type, trigger_type, meta } =
		integration;

	const spec = {
		id,
		name,
		description,
		icon,
		activity_type,
		trigger_type,
		meta,
	};
	// Create integration folder structure
	const integrationName = name.toLowerCase().replace(/\s+/g, "-");
	const integrationDir = path.join(process.cwd(), integrationName);

	// Ensure the integration directory doesn't exist
	if (fs.existsSync(integrationDir)) {
		console.log(
			chalk.yellow(
				`\nWarning: Directory ${integrationDir} already exists!`
			)
		);
		return integrationDir;
	}

	// Create main directory
	fs.mkdirSync(integrationDir, { recursive: true });

	// Create schemas directory and its subdirectories
	const schemasDir = path.join(integrationDir, "schemas");
	const resourcesDir = path.join(schemasDir, "resources");
	fs.mkdirSync(resourcesDir, { recursive: true });

	// Create template files
	const files = {
		"schemas/resources/resource1.json": JSON.stringify(resource1, null, 4),
		...(create_catalogue && {
			"schemas/authentication.json": JSON.stringify(
				authentication,
				null,
				4
			),
		}),
		"schemas/base.json": JSON.stringify(
			base(name, create_catalogue),
			null,
			4
		),
		...(!isEmpty(trigger_type) && {
			"schemas/webhook.json": JSON.stringify(webhook(name), null, 4),
		}),
		"spec.json": JSON.stringify(spec, null, 4),
		...(create_catalogue && {
			"Authentication.mdx": `# ${name} Authentication`,
		}),
		"Documentation.mdx": `# ${name} Documentation`,
	};

	// Create all files
	for (const [filePath, content] of Object.entries(files)) {
		const fullPath = path.join(integrationDir, filePath);
		fs.mkdirSync(path.dirname(fullPath), { recursive: true });
		fs.writeFileSync(fullPath, content);
	}

	console.log(chalk.cyan(`To navigate to your integration folder, run:\n`));
	console.log(chalk.white(`  cd ${integrationName}\n`));
};

export const createExistingIntegrationsFolder = async (payload) => {
	const {
		integration,
		authentication,
		webhook,
		configuration,
		resources,
		operations,
	} = payload;

	const {
		id,
		name,
		description,
		icon,
		activity_type,
		trigger_type,
		documentation,
		meta,
	} = integration;

	const spec = {
		id,
		name,
		description,
		icon,
		activity_type,
		trigger_type,
		meta,
	};

	const integrationName = name.toLowerCase().replace(/\s+/g, "-");
	const integrationDir = path.join(process.cwd(), integrationName);

	// Log if the directory already exists
	if (fs.existsSync(integrationDir)) {
		console.log(
			chalk.yellow(
				`\nNotice: Directory ${integrationDir} already exists. Updating contents...\n`
			)
		);
	} else {
		console.log(
			chalk.green(`\nCreating integration directory: ${integrationDir}\n`)
		);
	}

	// Ensure all necessary folders exist
	fs.mkdirSync(integrationDir, { recursive: true });

	const schemasDir = path.join(integrationDir, "schemas");
	const resourcesDir = path.join(schemasDir, "resources");
	fs.mkdirSync(resourcesDir, { recursive: true });

	const authentication_documentation = authentication.documentation;

	// Define files and content
	const files = {
		"schemas/authentication.json": JSON.stringify(
			authentication.content || {},
			null,
			4
		),
		"schemas/base.json": JSON.stringify(
			configuration?.content || {},
			null,
			4
		),
		"schemas/webhook.json": JSON.stringify(webhook?.content || {}, null, 4),
		"spec.json": JSON.stringify(spec, null, 4),
		"Authentication.mdx": authentication_documentation || "",
		"Documentation.mdx": documentation || "",
	};

	// Write resource files
	resources.forEach((resource) => {
		const resource_id = resource.id;
		const resourceName = resource.name.toLowerCase().replace(/\s+/g, "-");
		const resourcePath = path.join(resourcesDir, `${resourceName}.json`);

		const resourceOperations = operations.filter(
			(operation) => operation.resource_id === resource_id
		);

		const operationsContent = resourceOperations.reduce(
			(acc, operation) => {
				const operationName = operation.name
					.toLowerCase()
					.replace(/\s+/g, "-");
				acc[operationName] = operation.content;
				return acc;
			},
			{}
		);

		const resourceFileContent = {
			...resource.content,
			...operationsContent,
		};

		fs.writeFileSync(
			resourcePath,
			JSON.stringify(resourceFileContent, null, 4)
		);
	});

	// Write or overwrite all defined files
	for (const [filePath, content] of Object.entries(files)) {
		const fullPath = path.join(integrationDir, filePath);
		fs.mkdirSync(path.dirname(fullPath), { recursive: true });
		fs.writeFileSync(fullPath, content);
	}

	console.log(chalk.cyan(`\nIntegration folder is ready at:`));
	console.log(chalk.white(`  ${integrationDir}\n`));
	return true;
};
