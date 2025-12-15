import { confirm, input, search } from "@inquirer/prompts";
import chalk from "chalk";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

import { getCurrentEnv } from "../helper/env.js";
import { listAllServerless, pullServerless } from "../api/serverless.js";

// Define commands and their descriptions
const commands = {
	create: {
		description: "Create a new serverless",
		action: handleCreate,
	},
	// edit: {
	// 	description: "Edit an existing serverless",
	// 	action: handleEdit,
	// },
	// publish: {
	// 	description: "Publish a serverless",
	// 	action: handlePublish,
	// },
	pull: {
		description: "Pull a serverless",
		action: handlePull,
	},
	// test: {
	// 	description: "Test an serverless",
	// 	action: handleTest,
	// },
	help: {
		description: "Show help for serverless commands",
		action: showHelp,
	},
};
// Create a new integration
async function handleCreate() {
	console.log(chalk.green("Creating a new serverless..."));
}

async function handlePull(args) {
	console.log(chalk.green("Pulling serverless..."));
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

		console.log(
			chalk.green(
				"Please select the serverless to pull from the list below:"
			)
		);

		const allServerless = await listAllServerless(
			apiUrl,
			token,
			accountId,
			session
		);
		if (!allServerless || !Array.isArray(allServerless)) {
			console.error(
				chalk.red(
					"\n❌ Failed to fetch serverless: Invalid response format"
				)
			);
		}
		if (allServerless.length === 0) {
			console.error(chalk.red("\n❌ No serverless found."));
			return;
		}
		// Let user select an integration
		const choices =
			allServerless.map((serverless) => ({
				name: `${serverless.Config.Name}: Status - ${serverless.Status} ${serverless.Config?.CodeOpts?.Language ? `( - language: ${serverless.Config.CodeOpts.Language})` : ""}`,
				value: serverless,
			})) || [];

		const selectedServerless = await search({
			message: "Search and select an serverless to edit:",
			source: async (term) => {
				if (!term) return choices;
				return choices?.filter((choice) =>
					choice.name.toLowerCase().includes(term.toLowerCase())
				);
			},
		});

		console.log(
			chalk.cyan("\nSelected serverless:"),
			selectedServerless.Config.Name
		);
		const pulledServerless = await pullServerless(
			apiUrl,
			token,
			accountId,
			session,
			selectedServerless.ID
		);
		if (!pulledServerless) {
			console.error(
				chalk.red(
					"\n❌ Failed to fetch serverless details. Please try again later."
				)
			);
			return;
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

function showHelp() {
	console.log(chalk.cyan("\nServerless Commands:\n"));
	Object.entries(commands).forEach(([cmd, details]) => {
		console.log(chalk.bold(`${cmd}`) + ` - ${details.description}`);
	});
}

// Execute the serverless command
const execute = async (args) => {
	const subCommand = args[0];

	if (!subCommand) {
		showHelp();
		return;
	}

	if (!commands[subCommand]) {
		console.log(chalk.red("Unknown or missing serverless sub-command.\n"));
		showHelp();
		return;
	}

	const commandObj = commands[subCommand];
	await commandObj.action(args.slice(1));
};

export default {
	execute,
};
