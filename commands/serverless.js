import { search } from "@inquirer/prompts";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import { spawn, execSync } from "child_process";

import { getCurrentEnv } from "../helper/env.js";
import {
	SUPPORTED_LANGUAGES,
	LANGUAGE_VERSIONS,
	HANDLER_MAPPING,
	LANGUAGE_CHOICES,
	REQUIRED_DEPENDENCIES,
	parseCreateArgs,
	parseTestArgs,
	parsePublishArgs,
	generateRandomName,
	createServerlessFiles,
	displayCreateSuccessMessages,
	loadBolticConfig,
	parseLanguageFromConfig,
	parseHandlerConfig,
	detectLanguage,
	generateTestFiles,
	getStartCommand,
	checkNodeDependencies,
	checkPythonDependencies,
	getTestEnvironmentVariables,
	cleanupGeneratedFiles,
	displayTestStartupMessage,
	readHandlerFile,
	buildPublishPayload,
	displayPublishSuccessMessage,
} from "../helper/serverless.js";
import {
	listAllServerless,
	pullServerless,
	publishServerless,
} from "../api/serverless.js";

// Define commands and their descriptions
const commands = {
	create: {
		description: "Create a new serverless function",
		action: handleCreate,
	},
	// edit: {
	// 	description: "Edit an existing serverless",
	// 	action: handleEdit,
	// },
	publish: {
		description: "Publish a serverless",
		action: handlePublish,
	},
	pull: {
		description: "Pull a serverless",
		action: handlePull,
	},
	test: {
		description: "Test a serverless function locally",
		action: handleTest,
	},
	help: {
		description: "Show help for serverless commands",
		action: showHelp,
	},
};

/**
 * Handle the create serverless command
 */
async function handleCreate(args = []) {
	try {
		console.log(
			"\n" +
				chalk.bgCyan.black(" 🚀 SERVERLESS CREATE ") +
				chalk.cyan(" Initialize a new serverless function\n")
		);

		// Step 1: Parse CLI arguments
		const parsedArgs = parseCreateArgs(args);
		let { name, language, directory } = parsedArgs;

		// Step 2: Language Selection
		if (!language) {
			// Show interactive dropdown for language selection
			language = await search({
				message: "Select Language:",
				source: async (term) => {
					if (!term) return LANGUAGE_CHOICES;
					return LANGUAGE_CHOICES.filter(
						(choice) =>
							choice.name
								.toLowerCase()
								.includes(term.toLowerCase()) ||
							choice.value
								.toLowerCase()
								.includes(term.toLowerCase())
					);
				},
			});
		} else {
			// Validate the provided language
			if (!SUPPORTED_LANGUAGES.includes(language)) {
				console.error(
					chalk.red(`\n❌ Unsupported language: ${language}`)
				);
				console.log(
					chalk.yellow(
						`Supported languages: ${SUPPORTED_LANGUAGES.join(", ")}`
					)
				);
				return;
			}
		}

		// Step 3: Get latest language version
		const version = LANGUAGE_VERSIONS[language];

		// Step 4: Name generation
		if (!name) {
			name = generateRandomName(language);
			console.log(
				chalk.cyan("🎲 Generating a random serverless name: ") +
					chalk.bold.white(name)
			);
		} else {
			console.log(
				chalk.cyan("📛 Using provided name: ") + chalk.bold.white(name)
			);
		}

		// Step 5: Prepare template variables
		const templateContext = {
			AppSlug: name,
			Language: `${language}/${version}`,
			Region: "asia-south1",
		};

		// Step 6: Determine target directory
		const targetDir = path.join(directory, name);

		// Check if directory already exists
		if (fs.existsSync(targetDir)) {
			console.error(
				chalk.red(`\n❌ Directory already exists: ${targetDir}`)
			);
			console.log(
				chalk.yellow(
					"Please choose a different name or delete the existing directory."
				)
			);
			return;
		}

		// Create the target directory
		try {
			fs.mkdirSync(targetDir, { recursive: true });
		} catch (err) {
			console.error(
				chalk.red(`\n❌ Failed to create directory: ${targetDir}`)
			);
			console.error(chalk.red(`Error: ${err.message}`));
			return;
		}

		// Step 7 & 8: Create template files
		console.log(chalk.cyan("\n📝 Creating serverless function files..."));
		console.log(chalk.dim(`   Language: ${language}/${version}`));
		console.log(chalk.dim(`   Region: ${templateContext.Region}`));
		console.log(chalk.dim(`   Handler: ${HANDLER_MAPPING[language]}`));

		try {
			createServerlessFiles(targetDir, language, templateContext);
		} catch (err) {
			console.error(chalk.red(`\n❌ Failed to create template files`));
			console.error(chalk.red(`Error: ${err.message}`));

			// Cleanup: remove the created directory
			try {
				fs.rmSync(targetDir, { recursive: true, force: true });
			} catch {
				// Ignore cleanup errors
			}
			return;
		}

		// Step 9: Display success messages
		displayCreateSuccessMessages(targetDir);
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

/**
 * Handle the publish serverless command
 */
async function handlePublish(args = []) {
	try {
		console.log(
			"\n" +
				chalk.bgMagenta.black(" 🚀 SERVERLESS PUBLISH ") +
				chalk.magenta(" Deploy your serverless function\n")
		);

		// Step 1: Parse CLI arguments
		const parsedArgs = parsePublishArgs(args);
		const { directory } = parsedArgs;

		// Validate directory exists
		if (!fs.existsSync(directory)) {
			console.error(
				chalk.red(`\n❌ Directory does not exist: ${directory}`)
			);
			return;
		}

		// Step 2: Load boltic.yaml config
		const config = loadBolticConfig(directory);
		if (!config) {
			console.error(
				chalk.red("\n❌ boltic.yaml not found in the directory")
			);
			console.log(
				chalk.yellow(
					"Please run this command from a serverless project directory."
				)
			);
			return;
		}

		// Step 3: Get app name and language from config
		const appName = config.app;
		const language = config.language; // e.g., "nodejs/20"

		if (!appName) {
			console.error(chalk.red("\n❌ App name not found in boltic.yaml"));
			return;
		}

		if (!language) {
			console.error(chalk.red("\n❌ Language not found in boltic.yaml"));
			return;
		}

		console.log(chalk.cyan("📋 App Name: ") + chalk.white(appName));
		console.log(chalk.cyan("📋 Language: ") + chalk.white(language));

		// Step 4: Read handler file
		const languageBase = parseLanguageFromConfig(language);
		const code = readHandlerFile(directory, languageBase, config);

		if (!code) {
			console.error(chalk.red("\n❌ Handler file not found"));
			const handlerConfig = parseHandlerConfig(
				config.handler,
				languageBase
			);
			console.log(
				chalk.yellow(`Expected handler file: ${handlerConfig.file}`)
			);
			return;
		}

		console.log(chalk.cyan("📄 Handler code loaded successfully"));

		// Step 5: Build payload
		const payload = buildPublishPayload(appName, language, code);

		// Step 6: Get auth credentials
		const { apiUrl, token, session } = await getCurrentEnv();

		// Step 7: Publish to API
		console.log(chalk.cyan("\n📤 Publishing serverless function..."));

		const response = await publishServerless(
			apiUrl,
			token,
			session,
			payload
		);

		if (response) {
			displayPublishSuccessMessage(appName, response);
		} else {
			console.error(
				chalk.red("\n❌ Failed to publish serverless function")
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
		console.error(
			chalk.red("\n❌ An error occurred:"),
			error.message || "Unknown error"
		);
	}
}

/**
 * Handle the test serverless command
 */
async function handleTest(args = []) {
	let childProcess = null;
	let language = null;
	let directory = null;
	let retain = false;

	// Setup cleanup handler
	const cleanup = (signal) => {
		console.log(chalk.yellow(`\n\n⚠️  ${signal} received, cleaning up...`));

		if (childProcess) {
			childProcess.kill("SIGTERM");
		}

		if (language && directory) {
			cleanupGeneratedFiles(directory, language, retain);
		}

		process.exit(0);
	};

	// Register signal handlers
	process.on("SIGINT", () => cleanup("SIGINT"));
	process.on("SIGTERM", () => cleanup("SIGTERM"));

	try {
		// Step 1: Parse CLI arguments
		const parsedArgs = parseTestArgs(args);
		let {
			port,
			handlerFile,
			handlerFunction,
			command: customCommand,
		} = parsedArgs;
		language = parsedArgs.language;
		directory = parsedArgs.directory;
		retain = parsedArgs.retain;

		// Validate directory exists
		if (!fs.existsSync(directory)) {
			console.error(
				chalk.red(`\n❌ Directory does not exist: ${directory}`)
			);
			return;
		}

		// Step 2: Load boltic.yaml config
		const config = loadBolticConfig(directory);

		// Step 3: Determine language
		if (!language && config?.language) {
			language = parseLanguageFromConfig(config.language);
			console.log(
				chalk.cyan("📋 Using language from boltic.yaml: ") +
					chalk.bold.white(language)
			);
		}

		if (!language) {
			console.log(
				chalk.yellow("⚠️  No language specified, auto-detecting...")
			);
			language = detectLanguage(directory);
		}

		if (!language) {
			console.error(
				chalk.red(
					"\n❌ Could not detect language. Please specify with --language flag."
				)
			);
			console.log(
				chalk.yellow(
					`Supported languages: ${SUPPORTED_LANGUAGES.join(", ")}`
				)
			);
			return;
		}

		// Validate language
		if (!SUPPORTED_LANGUAGES.includes(language)) {
			console.error(chalk.red(`\n❌ Unsupported language: ${language}`));
			console.log(
				chalk.yellow(
					`Supported languages: ${SUPPORTED_LANGUAGES.join(", ")}`
				)
			);
			return;
		}

		// Step 4: Determine handler file and function
		if (!handlerFile || !handlerFunction) {
			const handlerConfig = parseHandlerConfig(config?.handler, language);
			handlerFile = handlerFile || handlerConfig.file;
			handlerFunction = handlerFunction || handlerConfig.function;
		}

		// Verify handler file exists
		const handlerPath = path.join(directory, handlerFile);
		if (!fs.existsSync(handlerPath)) {
			console.error(
				chalk.red(`\n❌ Handler file not found: ${handlerPath}`)
			);
			console.log(
				chalk.yellow(
					"Please specify the correct handler file with --handler-file flag."
				)
			);
			return;
		}

		console.log(
			chalk.cyan("📦 Handler: ") +
				chalk.white(`${handlerFile}.${handlerFunction}`)
		);

		// Step 5: Install dependencies
		if (language === "nodejs") {
			const missingDeps = checkNodeDependencies(
				directory,
				REQUIRED_DEPENDENCIES.nodejs
			);

			if (missingDeps.length > 0) {
				console.log(
					chalk.yellow(
						`\n📦 Missing dependencies: ${missingDeps.join(", ")}`
					)
				);
				console.log(chalk.cyan("   Installing with --no-save..."));

				try {
					execSync(`npm install ${missingDeps.join(" ")} --no-save`, {
						cwd: directory,
						stdio: "inherit",
					});
					console.log(chalk.green("   ✓ Dependencies installed"));
				} catch (error) {
					console.error(
						chalk.red("\n❌ Failed to install dependencies")
					);
					console.error(chalk.red(`Error: ${error.message}`));
					return;
				}
			}
		}

		// Install Python dependencies using virtual environment
		if (language === "python") {
			const venvPath = path.join(directory, ".venv");
			const venvPython = path.join(venvPath, "bin", "python3");
			const venvPip = path.join(venvPath, "bin", "pip3");

			// Create virtual environment if it doesn't exist
			if (!fs.existsSync(venvPath)) {
				console.log(
					chalk.cyan("\n📦 Creating Python virtual environment...")
				);
				try {
					execSync(`python3 -m venv .venv`, {
						cwd: directory,
						stdio: "inherit",
					});
					console.log(
						chalk.green("   ✓ Virtual environment created")
					);
				} catch (error) {
					console.error(
						chalk.red("\n❌ Failed to create virtual environment")
					);
					console.error(chalk.red(`Error: ${error.message}`));
					return;
				}
			}

			// Install dependencies in the virtual environment
			const depsToInstall = REQUIRED_DEPENDENCIES.python;
			console.log(
				chalk.cyan(
					`\n📦 Installing Python packages: ${depsToInstall.join(", ")}`
				)
			);

			try {
				execSync(`${venvPip} install ${depsToInstall.join(" ")}`, {
					cwd: directory,
					stdio: "inherit",
				});
				console.log(chalk.green("   ✓ Python packages installed"));
			} catch (error) {
				console.error(
					chalk.red("\n❌ Failed to install Python packages")
				);
				console.error(chalk.red(`Error: ${error.message}`));
				return;
			}
		}

		// Step 6: Generate test files (wrapper + additional files like pom.xml for Java)
		console.log(chalk.cyan("\n📝 Generating test files..."));

		// Get app name from config or directory name
		const appName = config?.app || path.basename(directory);

		const testFiles = generateTestFiles(
			language,
			handlerFile,
			handlerFunction,
			appName
		);

		if (!testFiles || testFiles.length === 0) {
			console.error(
				chalk.red(
					`\n❌ Failed to generate test files for language: ${language}`
				)
			);
			return;
		}

		// Write all generated files
		for (const file of testFiles) {
			const filePath = path.join(directory, file.path);

			// Create directories if needed
			const fileDir = path.dirname(filePath);
			if (!fs.existsSync(fileDir)) {
				fs.mkdirSync(fileDir, { recursive: true });
			}

			fs.writeFileSync(filePath, file.content, "utf8");
			console.log(chalk.dim(`   Created: ${file.path}`));
		}

		// Step 7: Determine start command
		const startCmd = getStartCommand(language, directory, customCommand);

		// Step 8: Set environment variables
		const env = getTestEnvironmentVariables(port, language);

		// Step 9: Display startup message
		displayTestStartupMessage(port);

		// Step 10: Start the server
		childProcess = spawn(startCmd.command, startCmd.args, {
			cwd: directory,
			env,
			stdio: ["inherit", "pipe", "pipe"],
			shell: process.platform === "win32",
		});

		// Stream stdout
		childProcess.stdout.on("data", (data) => {
			process.stdout.write(chalk.white(data.toString()));
		});

		// Stream stderr
		childProcess.stderr.on("data", (data) => {
			process.stderr.write(chalk.red(data.toString()));
		});

		// Handle process exit
		childProcess.on("close", (code) => {
			console.log(
				chalk.yellow(`\n🛑 Server stopped with exit code: ${code}`)
			);
			cleanupGeneratedFiles(directory, language, retain);
			process.exit(code || 0);
		});

		// Handle process error
		childProcess.on("error", (error) => {
			console.error(
				chalk.red(`\n❌ Failed to start server: ${error.message}`)
			);

			if (error.code === "ENOENT") {
				console.log(
					chalk.yellow(
						`\n💡 Hint: Make sure the command "${startCmd.command}" is installed and available in PATH.`
					)
				);
			}

			cleanupGeneratedFiles(directory, language, retain);
			process.exit(1);
		});
	} catch (error) {
		if (
			error.message &&
			error.message.includes("User force closed the prompt")
		) {
			console.log(chalk.yellow("\n⚠️ Operation cancelled by user"));
			if (language && directory) {
				cleanupGeneratedFiles(directory, language, retain);
			}
			return;
		}

		console.error(
			chalk.red("\n❌ An error occurred:"),
			error.message || "Unknown error"
		);

		if (language && directory) {
			cleanupGeneratedFiles(directory, language, retain);
		}
	}
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
		console.log(chalk.bold(`  ${cmd}`) + ` - ${details.description}`);
	});

	console.log(chalk.cyan("\nCreate Command Options:\n"));
	console.log(
		chalk.bold("  --name, -n") +
			chalk.dim("           ") +
			"Name of the serverless function (auto-generated if not provided)"
	);
	console.log(
		chalk.bold("  --language, -l") +
			chalk.dim("       ") +
			"Programming language (nodejs, python, golang, java)"
	);
	console.log(
		chalk.bold("  --directory, -d") +
			chalk.dim("      ") +
			"Directory where to create the project (default: current directory)"
	);

	console.log(chalk.cyan("\nTest Command Options:\n"));
	console.log(
		chalk.bold("  --port, -p") +
			chalk.dim("           ") +
			"Port to run the server on (default: 8080)"
	);
	console.log(
		chalk.bold("  --handler-file, -f") +
			chalk.dim("   ") +
			"The handler file to run (e.g., handler.js)"
	);
	console.log(
		chalk.bold("  --handler-function, -u") +
			chalk.dim(" ") +
			"Name of the handler function (default: handler)"
	);
	console.log(
		chalk.bold("  --language, -l") +
			chalk.dim("       ") +
			"Language (nodejs, python, golang, java) - auto-detected if not specified"
	);
	console.log(
		chalk.bold("  --directory, -d") +
			chalk.dim("      ") +
			"Base directory of the project (default: current directory)"
	);
	console.log(
		chalk.bold("  --command") +
			chalk.dim("            ") +
			"Custom command to run the server"
	);
	console.log(
		chalk.bold("  --retain, -r") +
			chalk.dim("         ") +
			"Retain auto-generated files after stopping (default: false)"
	);

	console.log(chalk.cyan("\nCreate Examples:\n"));
	console.log(chalk.dim("  # Interactive mode (will prompt for language)"));
	console.log("  boltic serverless create\n");
	console.log(chalk.dim("  # With language flag"));
	console.log("  boltic serverless create --language nodejs\n");
	console.log(chalk.dim("  # With all flags"));
	console.log(
		"  boltic serverless create --name my-function --language python --directory ./my-project\n"
	);

	console.log(chalk.cyan("\nPublish Command Options:\n"));
	console.log(
		chalk.bold("  --directory, -d") +
			chalk.dim("      ") +
			"Directory of the serverless project (default: current directory)"
	);

	console.log(chalk.cyan("\nTest Examples:\n"));
	console.log(chalk.dim("  # Basic usage - auto-detect everything"));
	console.log("  boltic serverless test\n");
	console.log(chalk.dim("  # Specify port"));
	console.log("  boltic serverless test --port 3000\n");
	console.log(chalk.dim("  # Specify language and handler"));
	console.log(
		"  boltic serverless test -l nodejs -f handler.js -u handler\n"
	);
	console.log(chalk.dim("  # Keep generated files after stopping"));
	console.log("  boltic serverless test --retain\n");

	console.log(chalk.cyan("\nPublish Examples:\n"));
	console.log(chalk.dim("  # Publish from current directory"));
	console.log("  boltic serverless publish\n");
	console.log(chalk.dim("  # Publish from specific directory"));
	console.log("  boltic serverless publish -d ./my-function\n");
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
