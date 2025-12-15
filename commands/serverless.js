import { confirm, input, search } from "@inquirer/prompts";
import chalk from "chalk";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

import { getCurrentEnv } from "../helper/env.js";

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
	// list: {
	// 	description: "List all serverless",
	// 	action: handleStatus,
	// },
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
