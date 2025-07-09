import { confirm, input, search } from "@inquirer/prompts";
import chalk from "chalk";
import fs from "fs";
import path from "path";

import {
	editIntegration,
	getIntegrationById,
	getIntegrationGroups,
	listAllIntegrations,
	pullIntegration,
	purgeCache,
	saveIntegration,
	sendIntegrationForReview,
	syncIntegration,
	updateIntegration,
	uploadFileToCloud,
} from "../api/integration.js";
import {
	createExistingIntegrationsFolder,
	createIntegrationFolderStructure,
} from "../helper/folder.js";

import { getCurrentEnv } from "../helper/env.js";
import { pickSvgFile } from "../utils/integration.js";

// Define commands and their descriptions
const commands = {
	create: {
		description: "Create a new integration",
		action: handleCreate,
	},
	edit: {
		description: "Edit an existing integration",
		action: handleEdit,
	},
	publish: {
		description: "Publish an integration",
		action: handlePublish,
	},
	sync: {
		description: "Sync a draft integration",
		action: handleSync,
	},
	pull: {
		description: "Pull an integration",
		action: handlePull,
	},
	status: {
		description: "Show detailed information about an integration",
		action: handleStatus,
	},
	test: {
		description: "Run tests for the integration",
		action: handleTest,
	},
	help: {
		description: "Show help for integration commands",
		action: showHelp,
	},
};

// Common function to read and parse schema files
async function readSchemaFiles(currentDir) {
	const schemas = {};
	const schemasDir = path.join(currentDir, "schemas");
	const resourcesDir = path.join(schemasDir, "resources");

	// Read authentication schema
	const authSchemaPath = path.join(schemasDir, "authentication.json");
	if (fs.existsSync(authSchemaPath)) {
		schemas.authentication = JSON.parse(
			fs.readFileSync(authSchemaPath, "utf8")
		);
	}

	// Read base schema
	const baseSchemaPath = path.join(schemasDir, "base.json");
	if (fs.existsSync(baseSchemaPath)) {
		schemas.configuration = JSON.parse(
			fs.readFileSync(baseSchemaPath, "utf8")
		);
	}

	// Read webhook schema
	const webhookSchemaPath = path.join(schemasDir, "webhook.json");
	if (fs.existsSync(webhookSchemaPath)) {
		schemas.webhook = JSON.parse(
			fs.readFileSync(webhookSchemaPath, "utf8")
		);
	}

	// Read resource schemas
	if (fs.existsSync(resourcesDir)) {
		schemas.resources = {};
		const resourceFiles = fs.readdirSync(resourcesDir);
		for (const file of resourceFiles) {
			if (file.endsWith(".json")) {
				const resourceName = path.basename(file, ".json");
				const resourcePath = path.join(resourcesDir, file);
				const resourceSchema = JSON.parse(
					fs.readFileSync(resourcePath, "utf8")
				);
				schemas.resources[resourceName] = resourceSchema;
			}
		}
	}

	// Read documentation files
	const authDocPath = path.join(currentDir, "Authentication.mdx");
	const generalDocPath = path.join(currentDir, "Documentation.mdx");

	if (fs.existsSync(authDocPath)) {
		schemas.authentication_documentation = fs.readFileSync(
			authDocPath,
			"utf8"
		);
	}

	if (fs.existsSync(generalDocPath)) {
		schemas.documentation = fs.readFileSync(generalDocPath, "utf8");
	}

	return schemas;
}

// Sync an integration
async function handleSync(args) {
	// Parse command line arguments
	let currentDir = process.cwd();
	const pathIndex = args.indexOf("--path");

	if (pathIndex !== -1 && args[pathIndex + 1]) {
		currentDir = args[pathIndex + 1];
		// Validate the provided path
		if (!fs.existsSync(currentDir)) {
			console.error(
				chalk.red(
					`Error: The specified path does not exist: ${currentDir}`
				)
			);
			return;
		}
	}

	const { apiUrl, token, accountId, session, frontendUrl } =
		await getCurrentEnv();

	// Read spec.json to get updated integration configuration
	const specPath = path.join(currentDir, "spec.json");
	if (fs.existsSync(specPath)) {
		const specContent = JSON.parse(fs.readFileSync(specPath, "utf8"));
		// Update integration with spec.json content

		if (
			specContent.trigger_type &&
			specContent.trigger_type !== "CloudTrigger"
		) {
			console.error(
				chalk.red(
					`Error: Invalid trigger_type "${specContent.trigger_type}". It should be "CloudTrigger" or null.`
				)
			);
			return;
		}

		const updatedIntegration = await updateIntegration(
			apiUrl,
			token,
			accountId,
			session,
			{
				id: specContent.id,
				name: specContent.name,
				description: specContent.description,
				icon: specContent.icon,
				activity_type: specContent.activity_type,
				trigger_type: specContent.trigger_type,
				meta: specContent.meta,
			}
		);
		if (updatedIntegration) {
			console.log(
				chalk.green(
					"• Integration configuration updated from spec.json"
				)
			);
		}

		console.log(chalk.cyan(`\nSyncing integration: ${specContent.name}`));

		console.log("Validating schemas...");

		// Validate resources
		const { validateIntegrationSchemas } = await import(
			"../helper/validation.js"
		);
		const validationResult = validateIntegrationSchemas(currentDir);
		if (!validationResult.success) {
			if (Array.isArray(validationResult.errors)) {
				validationResult.errors.forEach((error) => {
					console.error(chalk.red(`\n❌ ${error}`));
				});
			}
			return;
		}

		const schemas = await readSchemaFiles(currentDir);
		schemas.status = "draft";

		console.log(chalk.green("Schemas validated successfully"));

		const data = await syncIntegration(apiUrl, token, accountId, session, {
			integration_id: specContent.id,
			...schemas,
		});

		await purgeCache(apiUrl, token, accountId, session, {
			integration_id: specContent.id,
		});

		if (data) {
			console.log(chalk.green("• Integration synced successfully"));
			// Get environment name from consoleUrl
			const workflowUrl = `${frontendUrl}/accounts/${accountId}/workflow/workflow-builder`;
			console.log(chalk.cyan("\nWorkflow URL:"));
			console.log(chalk.underline.blue(workflowUrl));
		} else {
			const errorMessage =
				data?.message || "API Error: Integration syncing failed";
			console.error(
				chalk.red(`• Failed to syncing integration: ${errorMessage}`)
			);
		}
	}
}

// Publish an integration
async function handlePublish(args) {
	console.log(chalk.green("Publishing integration...\n"));
	// Parse command line arguments
	let currentDir = process.cwd();
	const pathIndex = args.indexOf("--path");

	if (pathIndex !== -1 && args[pathIndex + 1]) {
		currentDir = args[pathIndex + 1];
		// Validate the provided path
		if (!fs.existsSync(currentDir)) {
			console.error(
				chalk.red(
					`Error: The specified path does not exist: ${currentDir}`
				)
			);
			return;
		}
	}

	const { apiUrl, token, accountId, session } = await getCurrentEnv();

	// Read spec.json to get updated integration configuration
	const specPath = path.join(currentDir, "spec.json");
	if (fs.existsSync(specPath)) {
		const specContent = JSON.parse(fs.readFileSync(specPath, "utf8"));
		// Update integration with spec.json content

		if (
			specContent.trigger_type &&
			specContent.trigger_type !== "CloudTrigger"
		) {
			console.error(
				chalk.red(
					`Error: Invalid trigger_type "${specContent.trigger_type}". It should be "CloudTrigger" or null.`
				)
			);
			return;
		}

		const updatedIntegration = await updateIntegration(
			apiUrl,
			token,
			accountId,
			session,
			{
				id: specContent.id,
				name: specContent.name,
				description: specContent.description,
				icon: specContent.icon,
				activity_type: specContent.activity_type,
				trigger_type: specContent.trigger_type,
				meta: specContent.meta,
			}
		);
		if (updatedIntegration) {
			console.log(
				chalk.green(
					"• Integration configuration updated from spec.json"
				)
			);
		}

		console.log(chalk.cyan(`\nSyncing integration: ${specContent.name}`));

		console.log("Validating schemas...");

		// Validate resources
		const { validateIntegrationSchemas } = await import(
			"../helper/validation.js"
		);
		const validationResult = validateIntegrationSchemas(currentDir);
		if (!validationResult.success) {
			if (Array.isArray(validationResult.errors)) {
				validationResult.errors.forEach((error) => {
					console.error(chalk.red(`\n❌ ${error}`));
				});
			}

			return;
		}

		const schemas = await readSchemaFiles(currentDir);
		schemas.status = "draft";

		console.log(chalk.green("Schemas validated successfully"));

		const data = await syncIntegration(apiUrl, token, accountId, session, {
			integration_id: specContent.id,
			...schemas,
		});

		if (data) {
			const review_payload = {
				integration_id: specContent.id,
				name: specContent.name,
				description: specContent.description?.integration || "",
				icon: specContent.icon,
				status: "in-review",
			};

			const review = await sendIntegrationForReview(
				apiUrl,
				token,
				accountId,
				session,
				review_payload
			);

			if (review) {
				console.log(
					chalk.green(
						"\n✅ Integration sent to review successfully!\n"
					)
				);
			}
		} else {
			console.error(
				chalk.red("\n❌ Error publishing integration:", data.message)
			);
		}
	}
}

// Execute the integration command
const execute = async (args) => {
	const subCommand = args[0];

	if (!subCommand) {
		showHelp();
		return;
	}

	if (!commands[subCommand]) {
		console.log(chalk.red("Unknown or missing integration sub-command.\n"));
		showHelp();
		return;
	}

	const commandObj = commands[subCommand];
	await commandObj.action(args.slice(1));
};

// Create a new integration
async function handleCreate() {
	try {
		// Fetch integration groups from API
		const { apiUrl, token, session, accountId } = await getCurrentEnv();
		let integrationGroupsChoices = [];
		try {
			const integrationGroups = await getIntegrationGroups(
				apiUrl,
				accountId,
				token,
				session
			);

			if (!integrationGroups || !Array.isArray(integrationGroups)) {
				console.error(
					chalk.red(
						"\n❌ Failed to fetch integration groups: Invalid response format"
					)
				);
				return;
			}

			integrationGroupsChoices = integrationGroups.map((group) => ({
				name: group.name,
				value: group.id,
			}));

			if (integrationGroupsChoices.length === 0) {
				console.error(
					chalk.red(
						"\n❌ No integration groups available. Please create an integration group first."
					)
				);
				return;
			}
		} catch (error) {
			console.error(
				chalk.red("\n❌ Failed to fetch integration groups: ") +
					(error.message || "Unknown error")
			);
			return;
		}

		console.log(
			chalk.green(
				"Please provide the following details for the integration:\n"
			)
		);

		// Prompt for integration details
		const name = await input({
			message: "Integration name (e.g., My_Integration):",
			validate: (input) => {
				const formattedInput = input.trim().replace(/\s+/g, "_");

				if (!formattedInput) return "Name is required";
				if (formattedInput.length > 50)
					return "Name cannot exceed 50 characters";
				if (!/^[a-zA-Z_]+$/.test(formattedInput)) {
					return "Name can only contain letters and underscores (no numbers or hyphens)";
				}
				return true;
			},
			transform: (input) => input.trim().replace(/\s+/g, "_"),
		});

		const iconPath = await pickSvgFile();

		if (!iconPath || !iconPath?.endsWith(".svg")) {
			console.log(
				chalk.yellow(
					"⚠️  File selection was cancelled or not a valid SVG."
				)
			);
			return;
		}

		if (!iconPath || !iconPath.endsWith(".svg")) {
			console.error(chalk.red("❌ Invalid or no SVG file selected."));
			return;
		}
		let icon = "";
		try {
			const iconData = await uploadFileToCloud(
				apiUrl,
				token,
				accountId,
				session,
				iconPath
			);
			icon = iconData.url;
			console.log(chalk.cyan(`\nIcon: ${icon}`));
		} catch (e) {
			console.error(chalk.red("❌ Could not upload icon: " + e.message));
			return;
		}

		// Add boolean prompts for activity and trigger with updated terminology
		const isActivity = await confirm({
			message:
				"Would you like to create this integration as a workflow activity? (Activities are reusable components that perform specific tasks in your workflow)",
			default: true,
		});

		let integration_ai_description = "";
		let trigger_ai_description = "";
		let integration_description = "";
		let trigger_description = "";

		if (isActivity) {
			integration_description = await input({
				message: "Workflow Activity Description:",
				validate: (input) => {
					if (!input.trim())
						return "Workflow Activity Description is required";
					if (input.length > 300) {
						return "Workflow Activity Description must not exceed 300 characters";
					}
					return true;
				},
			});

			integration_ai_description = await input({
				message: "Workflow Activity AI Description:",
				validate: (input) => {
					if (!input.trim())
						return "Workflow Activity AI Description is required";
					if (input.length > 300) {
						return "Workflow Activity AI Description must not exceed 300 characters";
					}
					return true;
				},
			});
		}

		const isTrigger = await confirm({
			message:
				"Would you like to create this integration as a workflow trigger? (Triggers start your workflow based on external events)",
			default: false,
		});

		if (isTrigger) {
			trigger_description = await input({
				message: "Workflow Trigger Description:",
				validate: (input) => {
					if (!input.trim())
						return "Workflow Trigger Description is required";
					if (input.length > 300) {
						return "Workflow Description must not exceed 300 characters";
					}
					return true;
				},
			});

			trigger_ai_description = await input({
				message: "Workflow Trigger AI Description:",
				validate: (input) => {
					if (!input.trim())
						return "Workflow Trigger AI Description is required";
					if (input.length > 300) {
						return "Workflow Trigger AI Description must not exceed 300 characters";
					}
					return true;
				},
			});
		}

		const integrationGroup = await search({
			message: "Search and select an integration group:",
			source: async (term) => {
				if (!term) return integrationGroupsChoices;
				return integrationGroupsChoices.filter((group) =>
					group.name.toLowerCase().includes(term.toLowerCase())
				);
			},
		});

		if (!isActivity && !isTrigger) {
			console.log(
				chalk.red(
					"\n❌ Both activity and trigger cannot be false. Please select at least one."
				)
			);
			return;
		}

		const create_catalogue = await confirm({
			message:
				"Would you like to create authentication form for this integration?",
			default: true,
		});

		// Create the integration
		try {
			const integration = await saveIntegration(
				apiUrl,
				token,
				accountId,
				session,
				{
					name,
					icon,
					activity_type: isActivity ? "customActivity" : null,
					trigger_type: isTrigger ? "CloudTrigger" : null,
					integration_group_id: integrationGroup,
					description: {
						integration: integration_description || "",
						trigger: trigger_description || "",
					},
					meta: {
						ai_description: {
							integration: integration_ai_description || "",
							trigger: trigger_ai_description || "",
						},
					},
					create_catalogue: create_catalogue,
				}
			);

			if (integration) {
				console.log(
					chalk.green("\n✅ Integration created successfully!")
				);

				// Create folder structure with the integration name
				await createIntegrationFolderStructure(
					integration,
					create_catalogue
				);

				const documentationUrl =
					"https://docs.boltic.io/docs/integration-builder/develop/boilerplate";

				console.log(
					chalk.cyan(
						`📄 For detailed instructions on next steps, refer to the official documentation:`
					)
				);
				console.log(chalk.underline.blue(documentationUrl));
			}
		} catch (error) {
			console.error(
				chalk.red("\n❌ Failed to create integration: ") +
					(error.message || "Unknown error")
			);
		}
	} catch (error) {
		if (
			error.message &&
			error.message.includes("User force closed the prompt")
		) {
			console.log(chalk.yellow("\n⚠️ Operation cancelled by user"));
			return;
		}
		// Handle other errors
		console.error(
			chalk.red("\n❌ An error occurred:"),
			error.message || "Unknown error"
		);
	}
}

// Handle edit integration command
async function handleEdit() {
	console.log(chalk.green("Please select the integration to edit...\n"));
	try {
		const { apiUrl, token, session, accountId } = await getCurrentEnv();
		const integrations = await listAllIntegrations(
			apiUrl,
			token,
			accountId,
			session
		);

		if (!integrations || !Array.isArray(integrations)) {
			console.error(
				chalk.red(
					"\n❌ Failed to fetch integrations: Invalid response format"
				)
			);
			return;
		}

		if (integrations.length === 0) {
			console.error(chalk.red("\n❌ No integrations found to edit."));
			return;
		}

		// Let user select an integration
		const choices =
			integrations
				.filter((integration) =>
					[
						"customActivity",
						"CloudTrigger",
						"applicationFdkActivity",
						"platformFdkActivity",
					].includes(
						integration.activity_type || integration.trigger_type
					)
				)
				.map((integration) => ({
					name: `${integration.name} - ${integration.status} - ${integration.activity_type ? `(activity_type: ${integration.activity_type})` : ""} ${integration.trigger_type ? `(trigger_type: ${integration.trigger_type})` : ""}`,
					value: integration,
				})) || [];

		const selectedIntegration = await search({
			message: "Search and select an integration to edit:",
			source: async (term) => {
				if (!term) return choices;
				return choices?.filter((choice) =>
					choice.name.toLowerCase().includes(term.toLowerCase())
				);
			},
		});

		console.log(
			chalk.cyan("\nSelected integration:"),
			selectedIntegration.name
		);

		const draftIntegration = await editIntegration(
			apiUrl,
			token,
			accountId,
			session,
			{
				id: selectedIntegration.id,
				parent_id: selectedIntegration.parent_id,
				status: selectedIntegration.status,
			}
		);

		if (draftIntegration) {
			const isFolderCreated =
				await createExistingIntegrationsFolder(draftIntegration);
			if (isFolderCreated) {
				console.log(
					chalk.green(
						"\n✅ Integration folder structure created successfully!"
					)
				);
			}
		}
	} catch (error) {
		if (
			error.message &&
			error.message.includes("User force closed the prompt")
		) {
			console.log(chalk.yellow("\n⚠️ Operation cancelled by user"));
			return;
		}
		// Handle other errors
		console.error(
			chalk.red("\n❌ An error occurred:"),
			error.message || "Unknown error"
		);
	}
}

// Pull the latest content of a particular integration. It will pull the latest content from the API and update the local integration folder with the latest content. Don't create a folder this time but update the contents of the integration
async function handlePull(args) {
	console.log(chalk.green("Pulling integration...\n"));
	try {
		// Parse command line arguments
		let currentDir = process.cwd();
		const pathIndex = args.indexOf("--path");

		if (pathIndex !== -1 && args[pathIndex + 1]) {
			currentDir = args[pathIndex + 1];
			// Validate the provided path
			if (!fs.existsSync(currentDir)) {
				console.error(
					chalk.red(
						`Error: The specified path does not exist: ${currentDir}`
					)
				);
				return;
			}
		}

		const { apiUrl, token, accountId, session } = await getCurrentEnv();

		const specPath = path.join(currentDir, "spec.json");
		if (fs.existsSync(specPath)) {
			const specContent = JSON.parse(fs.readFileSync(specPath, "utf8"));
			const integration = await pullIntegration(
				apiUrl,
				token,
				accountId,
				session,
				specContent.id
			);
			if (!integration) {
				console.error(
					chalk.red(
						"\n❌ Failed to fetch integration details. Please try again later."
					)
				);
				return;
			}
			const integrationName = specContent.name
				.toLowerCase()
				.replace(/\s+/g, "-");

			const integrationDir = path.join(process.cwd(), integrationName);

			if (!fs.existsSync(integrationDir)) {
				console.log(
					chalk.yellow(
						`\nWarning: Directory ${integrationDir} does not exist. Creating it now...`
					)
				);
				fs.mkdirSync(integrationDir, { recursive: true });
			}

			// Now, replace all the files and content with the latest content and everthing
			const isFolderCreated =
				await createExistingIntegrationsFolder(integration);
			if (isFolderCreated) {
				console.log(
					chalk.green("\n✅ Integration folder updated successfully!")
				);
			}
		} else {
			console.log("No spec.json file found in the current directory.");
			console.log(
				chalk.green(
					"Please select the integration to pull from the list below:"
				)
			);
			const integrations = await listAllIntegrations(
				apiUrl,
				token,
				accountId,
				session
			);
			if (!integrations || !Array.isArray(integrations)) {
				console.error(
					chalk.red(
						"\n❌ Failed to fetch integrations: Invalid response format"
					)
				);
			}
			if (integrations.length === 0) {
				console.error(chalk.red("\n❌ No integrations found."));
				return;
			}
			// Let user select an integration
			const choices =
				integrations
					.filter((integration) =>
						[
							"customActivity",
							"CloudTrigger",
							"applicationFdkActivity",
							"platformFdkActivity",
						].includes(
							integration.activity_type ||
								integration.trigger_type
						)
					)
					.map((integration) => ({
						name: `${integration.name} - ${integration.status} - ${integration.activity_type ? `(activity_type: ${integration.activity_type})` : ""} ${integration.trigger_type ? `(trigger_type: ${integration.trigger_type})` : ""}`,
						value: integration,
					})) || [];

			const selectedIntegration = await search({
				message: "Search and select an integration to edit:",
				source: async (term) => {
					if (!term) return choices;
					return choices?.filter((choice) =>
						choice.name.toLowerCase().includes(term.toLowerCase())
					);
				},
			});

			console.log(
				chalk.cyan("\nSelected integration:"),
				selectedIntegration.name
			);
			const pulledIntegration = await pullIntegration(
				apiUrl,
				token,
				accountId,
				session,
				selectedIntegration.id
			);
			if (!pulledIntegration) {
				console.error(
					chalk.red(
						"\n❌ Failed to fetch integration details. Please try again later."
					)
				);
				return;
			}
			// Update the integration folder with the latest content

			const isFolderCreated =
				await createExistingIntegrationsFolder(pulledIntegration);
			if (isFolderCreated) {
				console.log(
					chalk.green(
						"\n✅ Integration folder structure created successfully!"
					)
				);
			}
		}
	} catch (error) {
		if (
			error.message &&
			error.message.includes("User force closed the prompt")
		) {
			console.log(chalk.yellow("\n⚠️ Operation cancelled by user"));
			return;
		}
		// Handle other errors
		console.error(
			chalk.red("\n❌ An error occurred:"),
			error.message || "Unknown error"
		);
	}
}

// Show help for integration commands
function showHelp() {
	console.log(chalk.cyan("\nIntegration Commands:\n"));
	Object.entries(commands).forEach(([cmd, details]) => {
		console.log(chalk.bold(`${cmd}`) + ` - ${details.description}`);
	});
}

// Show detailed information about an integration
async function handleStatus() {
	console.log(chalk.green("Fetching integration information...\n"));

	try {
		const env = await getCurrentEnv();
		if (!env || !env.token || !env.session) {
			console.error(
				chalk.red("\n❌ Authentication required. Please login first.")
			);
			return;
		}
		const { apiUrl, token, session, accountId } = env;

		// Fetch all integrations
		const integrations = await listAllIntegrations(
			apiUrl,
			token,
			accountId,
			session
		);

		if (!integrations || integrations.length === 0) {
			console.log(chalk.yellow("No integrations found."));
			return;
		}

		// Let user select an integration
		const choices =
			integrations
				.filter((integration) =>
					[
						"customActivity",
						"CloudTrigger",
						"applicationFdkActivity",
						"platformFdkActivity",
					].includes(
						integration.activity_type || integration.trigger_type
					)
				)
				.map((integration) => ({
					name: `${integration.name} ${integration.activity_type ? `(activity_type: ${integration.activity_type})` : ""} ${integration.trigger_type ? `(trigger_type: ${integration.trigger_type})` : ""}`,
					value: integration.id,
				})) || [];

		const selectedIntegration = await search({
			message: "Search and select an integration to edit:",
			source: async (term) => {
				if (!term) return choices;
				return choices?.filter((choice) =>
					choice.name.toLowerCase().includes(term.toLowerCase())
				);
			},
		});

		// Use this selected integration and do an API call using it's value. There is already an API named getIntegrationById. Use it.
		const integration = await getIntegrationById(
			apiUrl,
			token,
			accountId,
			session,
			selectedIntegration
		);

		if (!integration) {
			console.log(chalk.yellow("Integration not found."));
			return;
		}

		// Display integration details
		console.log(chalk.cyan.bold("\n=== Integration Details ==="));
		console.log(chalk.cyan("\nBasic Information:"));
		console.log(`${chalk.dim("ID:")} ${integration.id}`);
		console.log(`${chalk.dim("Name:")} ${integration.name}`);
		console.log(`${chalk.dim("Slug:")} ${integration.slug}`);
		console.log(
			`${chalk.dim("Activity Type:")} ${integration.activity_type}`
		);
		console.log(
			`${chalk.dim("Trigger Type:")} ${integration.trigger_type}`
		);

		console.log(`${chalk.dim("Description:")} ${integration.description}`);

		console.log(chalk.cyan("\nStatus Information:"));
		console.log(
			`${chalk.dim("Status:")} ${integration.status === "published" ? chalk.green(integration.status) : chalk.yellow(integration.status)}`
		);
		console.log(
			`${chalk.dim("Active:")} ${integration.active ? chalk.green("Yes") : chalk.red("No")}`
		);

		console.log(chalk.cyan("\nMeta Information:"));
		console.log(
			`${chalk.dim("AI Description:")} ${integration.meta?.ai_description || "N/A"}`
		);
		console.log(
			`${chalk.dim("Is Trigger:")} ${integration.meta?.is_trigger ? "Yes" : "No"}`
		);

		console.log(chalk.cyan("\nTimestamps:"));
		console.log(
			`${chalk.dim("Created At:")} ${new Date(integration.created_at).toLocaleString()}`
		);
		console.log(
			`${chalk.dim("Updated At:")} ${new Date(integration.updated_at).toLocaleString()}`
		);
		console.log(`${chalk.dim("Created By:")} ${integration.created_by}`);
		console.log(`${chalk.dim("Modified By:")} ${integration.modified_by}`);

		if (integration.documentation) {
			console.log(chalk.cyan("\nDocumentation:"));
			console.log(integration.documentation);
		}
	} catch (error) {
		console.error(
			chalk.red("\n❌ Error fetching integration status:"),
			error.message || "Unknown error"
		);
	}
}

async function handleTest(args) {
	// Parse command line arguments
	let currentDir = process.cwd();
	const pathIndex = args.indexOf("--path");

	if (pathIndex !== -1 && args[pathIndex + 1]) {
		currentDir = args[pathIndex + 1];
		// Validate the provided path
		if (!fs.existsSync(currentDir)) {
			console.error(
				chalk.red(
					`Error: The specified path does not exist: ${currentDir}`
				)
			);
			return;
		}
	}

	const { spawn } = await import("child_process");

	console.log(chalk.cyan.bold("\n🧪 Running integration tests...\n"));

	// Look for test directory
	const testDirs = ["test", "tests", "__tests__"];
	let testDir = null;

	for (const dir of testDirs) {
		if (fs.existsSync(dir)) {
			testDir = dir;
			break;
		}
	}

	if (!testDir) {
		console.log(
			chalk.yellow(
				"⚠️  No test directory found. Looked for: test, tests, __tests__"
			)
		);
		return;
	}

	console.log(chalk.dim(`📁 Found test directory: ${testDir}`));

	// Check if Jest is available
	const packageJsonPath = path.join(process.cwd(), "package.json");
	let hasJest = false;

	if (fs.existsSync(packageJsonPath)) {
		try {
			const packageJson = JSON.parse(
				fs.readFileSync(packageJsonPath, "utf-8")
			);
			hasJest = !!(
				packageJson.devDependencies?.jest ||
				packageJson.dependencies?.jest
			);
		} catch (error) {
			console.log(chalk.yellow("⚠️  Could not read package.json"));
		}
	}

	if (!hasJest) {
		console.log(
			chalk.red(
				"❌ Jest is not installed. Please install Jest to run tests."
			)
		);
		return;
	}

	// Run Jest with the test directory
	return new Promise((resolve, reject) => {
		const jestProcess = spawn("npx", ["jest", testDir, "--verbose"], {
			stdio: "inherit",
			shell: true,
		});

		jestProcess.on("close", (code) => {
			if (code === 0) {
				console.log(chalk.green.bold("\n✅ All tests passed!"));
			} else {
				console.log(chalk.red.bold("\n❌ Some tests failed."));
			}
			resolve(code);
		});

		jestProcess.on("error", (error) => {
			console.error(chalk.red("❌ Error running tests:"), error.message);
			reject(error);
		});
	});
}

export default {
	execute,
};
