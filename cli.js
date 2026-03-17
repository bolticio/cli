import chalk from "chalk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import EnvironmentCommands from "./commands/env.js";
import IntegrationCommands from "./commands/integration.js";
import AuthCommands from "./commands/login.js";
import McpCommands from "./commands/mcp.js";
import ServerlessCommands from "./commands/serverless.js";

// Create a CLI module with functional approach
import { findSimilarCommands } from "./helper/command-suggestions.js";
import { getAllSecrets } from "./helper/secure-storage.js";
import { setVerboseMode } from "./helper/verbose.js";

const createCLI = (consoleUrl, apiUrl, serviceName, env) => {
	const commands = {
		login: {
			description: "Authenticate the user and save access token",
			action: async (args) => {
				// Support PAT-based login via flags, e.g.:
				//   boltic login --token XXXXX --account-id YYYYYY
				//   boltic login --token=XXXXX --acc-id=YYYYYY
				let tokenFromArg;
				let orgIdFromArg;
				let hasTokenFlag = false;
				let hasOrgIdFlag = false;

				for (let i = 0; i < args.length; i++) {
					const arg = args[i];

					if (arg === "--token") {
						hasTokenFlag = true;
						if (
							i + 1 < args.length &&
							!args[i + 1].startsWith("--")
						) {
							tokenFromArg = args[i + 1];
							i++;
						}
						continue;
					}

					if (
						arg === "--account_id" ||
						arg === "--account-id" ||
						arg === "--acc_id" ||
						arg === "--acc-id"
					) {
						hasOrgIdFlag = true;
						if (
							i + 1 < args.length &&
							!args[i + 1].startsWith("--")
						) {
							orgIdFromArg = args[i + 1];
							i++;
						}
						continue;
					}

					if (arg.startsWith("--token=")) {
						hasTokenFlag = true;
						tokenFromArg = arg.split("=")[1];
						continue;
					}

					if (
						arg.startsWith("--account_id=") ||
						arg.startsWith("--account-id=") ||
						arg.startsWith("--acc_id=") ||
						arg.startsWith("--acc-id=")
					) {
						hasOrgIdFlag = true;
						orgIdFromArg = arg.split("=")[1];
						continue;
					}
				}

				// If any token-related flag is present, delegate to PAT login handler.
				// `handlePatLogin` will decide whether to prompt based on which values are provided.
				if (
					hasTokenFlag ||
					hasOrgIdFlag ||
					tokenFromArg ||
					orgIdFromArg
				) {
					await AuthCommands.handlePatLogin(
						tokenFromArg,
						orgIdFromArg
					);
					return;
				}

				await AuthCommands.handleLogin(consoleUrl, apiUrl, env);
			},
		},
		integration: {
			description: "Manage integrations (create, list)",
			action: (args) => handleIntegration(args),
		},
		mcp: {
			description: "Manage MCPs clients and servers",
			action: (args) => handleMcp(args),
		},
		logout: {
			description: "Logout and clear access token",
			action: AuthCommands.handleLogout,
		},
		env: {
			description: "Manage environment settings (list, set, show)",
			action: (args) => handleEnvironment(args),
		},
		help: {
			description: "Display this help guide.",
			action: () => showHelp(commands),
		},
		version: {
			description: "Display the version of the CLI.",
			action: () => showVersion(),
		},
		serverless: {
			description: "Manage serverless (create, list, test)",
			action: (args) => handleServerless(args),
		},
	};

	return {
		execute: async (args) => {
			// Check for verbose flag
			const verboseIndex = args.indexOf("--verbose");
			if (verboseIndex !== -1) {
				setVerboseMode(true);
				// Remove the verbose flag from args
				args.splice(verboseIndex, 1);
			}

			const command = args[2];

			// Show global help only if no command or command is --help/-h
			if (!command || command === "--help" || command === "-h") {
				showHelp(commands);
				return;
			}

			const subCommand = args.length >= 3 ? args[3] : undefined;

			if (!commands[command]) {
				console.log(
					chalk.bgRed.white("\n ❌ Error ") +
						chalk.red(` Unknown command: "${command}""`)
				);
				const suggestions = findSimilarCommands(command, commands);

				if (suggestions.length > 0) {
					console.log(
						chalk.bgYellow.black("\n 💡 Did you mean: ") +
							chalk.yellow(
								`\n${suggestions.map((cmd) => `  • ${chalk.bold(cmd)} - ${commands[cmd].description}`).join("\n")}\n`
							)
					);
				}
				showHelp(commands);
				return;
			}

			// Check if user is authenticated for all commands except login, logout, help, and version
			if (
				command !== "login" &&
				command !== "logout" &&
				command !== "help" &&
				command !== "version" &&
				(command !== "mcp" || subCommand !== "setup")
			) {
				const secrets = await getAllSecrets();
				const userData = secrets?.reduce(
					(acc, { account, password }) => {
						acc[account] = password;
						return acc;
					},
					{}
				);

				if (!userData?.token?.trim() && !userData?.session?.trim()) {
					console.log(
						chalk.yellow(
							'\nYou are not logged in. Please run "boltic login" first.'
						)
					);
					return;
				}
			}

			const commandObj = commands[command];
			await commandObj.action(args.slice(3));
		},
	};
};

async function showHelp(commands) {
	let version = "1.0.0";
	try {
		let baseDir;
		if (typeof import.meta !== "undefined" && import.meta.url) {
			// Resolve module directory in a cross-platform (Windows-safe) way
			const filename = fileURLToPath(import.meta.url);
			baseDir = path.dirname(filename);
		} else {
			baseDir = process.cwd();
		}
		const packageJsonPath = path.join(baseDir, "package.json");
		const packageJson = JSON.parse(
			fs.readFileSync(packageJsonPath, "utf-8")
		);
		version = packageJson.version || version;
	} catch {
		// Best-effort secondary attempt from current working directory
		try {
			const fallbackPath = path.join(process.cwd(), "package.json");
			const packageJson = JSON.parse(
				fs.readFileSync(fallbackPath, "utf-8")
			);
			version = packageJson.version || version;
		} catch {
			// keep default version
		}
	}

	console.log(chalk.bold.yellow(`\nBoltic CLI Version: ${version}\n`));
	console.log(chalk.cyan("Usage:") + " boltic [command] [options]\n");

	console.log(chalk.cyan("Commands:"));
	Object.keys(commands).forEach((cmd) => {
		console.log(
			chalk.bold(`  ${cmd.padEnd(15)}`) + commands[cmd].description
		);
	});

	console.log(chalk.cyan("\nGlobal Options:"));
	console.log(
		chalk.bold("  --help, -h".padEnd(18)) + "Show help for a command"
	);
	console.log(chalk.bold("  --verbose".padEnd(18)) + "Enable verbose output");

	console.log(chalk.cyan("\nLogin Options:"));
	console.log(
		chalk.bold("  --token <token>".padEnd(18)) + "Personal access token"
	);
	console.log(
		chalk.bold("  --account-id <id>".padEnd(18)) +
			"Account ID (alias: --acc-id)"
	);

	console.log(chalk.cyan("\nExamples:"));
	console.log(chalk.dim("  # Interactive browser login"));
	console.log("  boltic login\n");
	console.log(chalk.dim("  # Login with PAT token"));
	console.log(
		"  boltic login --token YOUR_TOKEN --account-id YOUR_ACCOUNT_ID\n"
	);
	console.log(chalk.dim("  # Get help for serverless commands"));
	console.log("  boltic serverless --help\n");
	console.log(chalk.dim("  # Create an integration"));
	console.log("  boltic integration create\n");
}

async function handleIntegration(args) {
	await IntegrationCommands.execute(args);
}

async function handleEnvironment(args) {
	await EnvironmentCommands.execute(args);
}

async function handleMcp(args) {
	await McpCommands.execute(args);
}

async function handleServerless(args) {
	await ServerlessCommands.execute(args);
}
async function showVersion() {
	let version = "1.0.0";
	try {
		let baseDir;
		if (typeof import.meta !== "undefined" && import.meta.url) {
			// Windows-safe resolution for ESM modules
			const filename = fileURLToPath(import.meta.url);
			baseDir = path.dirname(filename);
		} else {
			baseDir = process.cwd();
		}
		const packageJsonPath = path.join(baseDir, "package.json");
		const packageJson = JSON.parse(
			fs.readFileSync(packageJsonPath, "utf-8")
		);
		version = packageJson.version || version;
	} catch {
		// Best-effort secondary attempt from current working directory
		try {
			const fallbackPath = path.join(process.cwd(), "package.json");
			const packageJson = JSON.parse(
				fs.readFileSync(fallbackPath, "utf-8")
			);
			version = packageJson.version || version;
		} catch {
			// fallback already defined
		}
	}
	console.log(`Boltic CLI Version: ${version}`);
}

export default createCLI;
