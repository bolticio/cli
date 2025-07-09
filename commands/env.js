import { select } from "@inquirer/prompts";
import chalk from "chalk";
import { environments } from "../config/environments.js";
import { getSecret, storeSecret } from "../helper/secure-storage.js";

// Define commands and their descriptions
const commands = {
	list: {
		description: "List available environments",
		action: handleList,
	},
	set: {
		description: "Set the active environment",
		action: handleSet,
	},
	show: {
		description: "Show the current environment",
		action: handleShow,
	},
};

// Execute the environment command
const execute = async (args) => {
	const subCommand = args[0];

	if (!subCommand) {
		showHelp();
		return;
	}

	if (!commands[subCommand]) {
		console.log(chalk.red("Unknown or missing environment sub-command.\n"));
		showHelp();
		return;
	}

	const commandObj = commands[subCommand];
	await commandObj.action(args.slice(1));
};

// List available environments
async function handleList() {
	console.log(chalk.bgCyan.black("\n 📋 Available Environments \n"));
	Object.entries(environments).forEach(([key, env]) => {
		console.log(
			chalk.blue.bold(`🔹 ${key}`) +
				chalk.gray(` - ${env.name}`) +
				chalk.dim(` (${env.loginUrl})`)
		);
	});
}

// Set the active environment
async function handleSet(args) {
	const currentEnv = await getSecret("environment");
	let selectedEnv;

	if (args[0]) {
		if (environments[args[0]]) {
			selectedEnv = args[0];
		} else {
			console.log(
				chalk.yellow(
					`\nInvalid environment '${args[0]}', please select from available options.\n`
				)
			);
			selectedEnv = await select({
				message: "Select environment:",
				choices: Object.entries(environments).map(([key, env]) => ({
					name: `${env.name} (${env.loginUrl})`,
					value: key,
				})),
				default: currentEnv,
			});
		}
	} else {
		selectedEnv = await select({
			message: "Select environment:",
			choices: Object.entries(environments).map(([key, env]) => ({
				name: `${env.name} (${env.loginUrl})`,
				value: key,
			})),
			default: currentEnv,
		});
	}

	await storeSecret("environment", selectedEnv);

	if (environments[selectedEnv]) {
		console.log(
			chalk.bgGreen.black("\n ✅ Success! ") +
				chalk.green(
					` Environment set to ${chalk.bold.white(environments[selectedEnv].name)} ${chalk.dim(`(${environments[selectedEnv].loginUrl})`)}\n`
				)
		);
	}
}

// Show the current environment
async function handleShow() {
	const currentEnv = (await getSecret("environment")) || "bolt";
	const env = environments[currentEnv];

	console.log(chalk.bgCyan.black("\n 🌍 Current Environment \n"));
	if (env) {
		console.log(chalk.blue.bold("📝 Name: ") + chalk.white(env.name));
		console.log(
			chalk.blue.bold("🔑 Login URL: ") + chalk.white(env.loginUrl)
		);
		console.log(
			chalk.blue.bold("🖥️  Console URL: ") + chalk.white(env.consoleUrl)
		);
		console.log(chalk.blue.bold("🔌 API URL: ") + chalk.white(env.apiUrl));
	} else {
		console.log(chalk.bold("Name: ") + environments.bolt.name);
	}
}

// Show help for environment commands
function showHelp() {
	console.log(chalk.bgCyan.black("\n ⚡ Environment Commands \n"));
	Object.entries(commands).forEach(([cmd, details]) => {
		console.log(
			chalk.blue.bold(`🔸 ${cmd}`) +
				chalk.gray(` - ${details.description}`)
		);
	});
}

export default {
	execute,
	handleSet,
};
