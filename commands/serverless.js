import { search, input } from "@inquirer/prompts";
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
	createServerlessFiles,
	loadBolticConfig,
	parseLanguageFromConfig,
	parseHandlerConfig,
	detectLanguage,
	generateTestFiles,
	getStartCommand,
	checkNodeDependencies,
	getTestEnvironmentVariables,
	cleanupGeneratedFiles,
	displayTestStartupMessage,
	readHandlerFile,
	buildUpdatePayload,
	displayPublishSuccessMessage,
	createPulledServerlessFiles,
	displayPullSuccessMessage,
	detectHandlerFunctionFromCode,
	pollServerlessStatus,
} from "../helper/serverless.js";
import {
	listAllServerless,
	pullServerless,
	publishServerless,
	updateServerless,
} from "../api/serverless.js";

// Define commands and their descriptions
const commands = {
	create: {
		description: "Create a new serverless function",
		action: handleCreate,
	},
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
	list: {
		description: "List all serverless functions",
		action: handleList,
	},
	status: {
		description: "Show status of a serverless function",
		action: handleStatus,
	},
};

// Serverless type choices for dropdown
const SERVERLESS_TYPE_CHOICES = [
	{ name: "📦 Git       - Deploy from Git repository", value: "git" },
	{ name: "📝 Blueprint - Write code directly", value: "code" },
	{ name: "🐳 Container - Deploy Docker container", value: "container" },
];

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
		let { name, language, directory, type } = parsedArgs;

		// Step 2: Serverless Type Selection
		if (!type) {
			type = await search({
				message: "Select Serverless Type:",
				source: async (term) => {
					if (!term) return SERVERLESS_TYPE_CHOICES;
					return SERVERLESS_TYPE_CHOICES.filter(
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
		}

		console.log(chalk.cyan("📦 Selected type: ") + chalk.bold.white(type));

		// Step 3: Name Input (required - no random generation)
		if (!name) {
			name = await input({
				message: "Enter serverless function name:",
				validate: (value) => {
					if (!value || value.trim() === "") {
						return "Name is required";
					}
					// Validate name format (alphanumeric, hyphens, underscores)
					if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(value.trim())) {
						return "Name must start with a letter and contain only letters, numbers, hyphens, and underscores";
					}
					return true;
				},
			});
			name = name.trim();
		}
		console.log(
			chalk.cyan("📛 Serverless name: ") + chalk.bold.white(name)
		);

		// Step 4: Language Selection (skip for container type)
		let version = null;
		if (type !== "container") {
			if (!language) {
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

			// Step 5: Get latest language version
			version = LANGUAGE_VERSIONS[language];
		}

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

		// Branch based on type
		if (type === "git") {
			// For git type: create empty folder with boltic.yaml only
			await handleGitTypeCreate(name, language, version, targetDir);
			return;
		}

		if (type === "container") {
			// For container type: ask for image and create serverless
			await handleContainerTypeCreate(name, targetDir);
			return;
		}

		// For code type: create full template files and call create API
		await handleCodeTypeCreate(name, language, version, targetDir);
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
 * Handle code type serverless creation - creates folder with template files and calls create API
 */
async function handleCodeTypeCreate(name, language, version, targetDir) {
	const templateContext = {
		AppSlug: name,
		Language: `${language}/${version}`,
		Region: "asia-south1",
	};

	console.log(chalk.cyan("\n📝 Creating serverless function files..."));
	console.log(chalk.dim(`   Type: code`));
	console.log(chalk.dim(`   Language: ${language}/${version}`));
	console.log(chalk.dim(`   Region: ${templateContext.Region}`));
	console.log(chalk.dim(`   Handler: ${HANDLER_MAPPING[language]}`));

	// Create template files
	try {
		createServerlessFiles(targetDir, language, templateContext);
	} catch (err) {
		console.error(chalk.red(`\n❌ Failed to create template files`));
		console.error(chalk.red(`Error: ${err.message}`));
		// Cleanup
		try {
			fs.rmSync(targetDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
		return;
	}

	// Get authentication credentials
	const env = await getCurrentEnv();
	if (!env || !env.token || !env.session) {
		console.error(chalk.red("\n❌ Not authenticated. Please login first."));
		console.log(chalk.yellow("   Run: boltic login"));
		return;
	}

	const { apiUrl, token, accountId, session } = env;

	// Read the handler file to get the code
	const handlerFileName = HANDLER_MAPPING[language].split(".")[0];
	let handlerFile;
	if (language === "java") {
		handlerFile = path.join(
			targetDir,
			"src",
			"main",
			"java",
			"com",
			"boltic",
			"io",
			"serverless",
			"Handler.java"
		);
	} else if (language === "golang") {
		handlerFile = path.join(targetDir, `${handlerFileName}.go`);
	} else if (language === "python") {
		handlerFile = path.join(targetDir, `${handlerFileName}.py`);
	} else {
		handlerFile = path.join(targetDir, `${handlerFileName}.js`);
	}

	const code = fs.readFileSync(handlerFile, "utf-8");

	// Build the payload for create API
	const payload = {
		Name: name,
		Runtime: "code",
		Env: {},
		PortMap: [],
		Scaling: {
			AutoStop: false,
			Min: 1,
			Max: 1,
			MaxIdleTime: 0,
		},
		Resources: {
			CPU: 0.1,
			MemoryMB: 128,
			MemoryMaxMB: 128,
		},
		CodeOpts: {
			Language: `${language}/${version}`,
			Packages: [],
			Code: code,
		},
	};

	// Call create serverless API
	console.log(chalk.cyan("\n📤 Creating serverless function..."));
	const response = await publishServerless(apiUrl, token, session, payload);

	if (!response) {
		console.error(chalk.red("\n❌ Failed to create serverless function"));
		return;
	}

	// Update boltic.yaml with serverlessId inside serverlessConfig
	const serverlessId = response.ID || response.data?.ID || response._id;
	if (serverlessId) {
		const bolticYamlPath = path.join(targetDir, "boltic.yaml");
		let bolticYamlContent = fs.readFileSync(bolticYamlPath, "utf-8");
		// Add serverlessId inside serverlessConfig after the serverlessConfig: line
		bolticYamlContent = bolticYamlContent.replace(
			/^(serverlessConfig:)$/m,
			`$1\n  serverlessId: "${serverlessId}"`
		);
		fs.writeFileSync(bolticYamlPath, bolticYamlContent);
	}

	// Display success message
	console.log("\n" + chalk.bgGreen.black(" ✓ CREATED ") + "\n");
	console.log(
		chalk.green("📝 Blueprint serverless function created successfully!")
	);
	console.log();
	console.log(chalk.cyan("   Name: ") + chalk.white(name));
	console.log(chalk.cyan("   Type: ") + chalk.white("code"));
	console.log(
		chalk.cyan("   Language: ") + chalk.white(`${language}/${version}`)
	);
	console.log(chalk.cyan("   Location: ") + chalk.white(targetDir));
	if (serverlessId) {
		console.log(
			chalk.cyan("   Serverless ID: ") + chalk.white(serverlessId)
		);
	}
	console.log();

	// Poll for serverless status until running
	if (serverlessId) {
		await pollServerlessStatus(pullServerless, serverlessId, {
			apiUrl,
			token,
			accountId,
			session,
		});
	}

	console.log(chalk.yellow("📝 Next steps:"));
	console.log(chalk.dim("   1. Edit your handler code"));
	console.log(chalk.dim("   2. Test locally: boltic serverless test"));
	console.log(chalk.dim("   3. Update: boltic serverless publish"));
	console.log();
}

/**
 * Handle git type serverless creation - creates folder with boltic.yaml and calls create API
 */
async function handleGitTypeCreate(name, language, version, targetDir) {
	console.log(chalk.cyan("\n📁 Creating git-based serverless project..."));
	console.log(chalk.dim(`   Type: git`));
	console.log(chalk.dim(`   Language: ${language}/${version}`));

	// Get authentication credentials first
	const env = await getCurrentEnv();
	if (!env || !env.token || !env.session) {
		console.error(chalk.red("\n❌ Not authenticated. Please login first."));
		console.log(chalk.yellow("   Run: boltic login"));
		// Cleanup the created directory
		try {
			fs.rmSync(targetDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
		return;
	}

	const { apiUrl, token, session } = env;

	// Build the payload for git type
	const payload = {
		Name: name,
		Runtime: "git",
		Env: {},
		PortMap: [],
		Scaling: {
			AutoStop: false,
			Min: 1,
			Max: 1,
			MaxIdleTime: 0,
		},
		Resources: {
			CPU: 0.1,
			MemoryMB: 128,
			MemoryMaxMB: 128,
		},
		CodeOpts: {
			Language: `${language}/${version}`,
		},
	};

	// Call create serverless API
	console.log(chalk.cyan("\n📤 Creating git-based serverless function..."));
	const response = await publishServerless(apiUrl, token, session, payload);

	if (!response) {
		console.error(chalk.red("\n❌ Failed to create serverless function"));
		// Cleanup the created directory
		try {
			fs.rmSync(targetDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
		return;
	}

	// Extract serverless ID and git info from response
	// Response structure: { ID, Links: { Git: { Repository: { SshURL, HtmlURL, CloneURL, ... } } } }
	const serverlessId = response.ID || response.data?.ID || response._id;
	const gitRepo =
		response.Links?.Git?.Repository ||
		response.data?.Links?.Git?.Repository;
	const gitSshUrl = gitRepo?.SshURL || "";
	const gitHttpUrl = gitRepo?.HtmlURL || "";
	const gitCloneUrl = gitRepo?.CloneURL || "";

	// Create boltic.yaml with serverlessId inside serverlessConfig
	const bolticYamlContent = `app: "${name}"
region: "asia-south1"
handler: "${HANDLER_MAPPING[language]}"
language: "${language}/${version}"

serverlessConfig:
  serverlessId: "${serverlessId}"
  Name: "${name}"
  Description: ""
  Runtime: "git"
  # Environment variables for your serverless function
  # To add env variables, replace {} with key-value pairs like:
  # Env:
  #   API_KEY: "your-api-key"
  #TO add port map, replace {} with port map like:
  # PortMap:
  #   - Name: "port"
  #     Port: "8080"
  #     Protocol: "http"/"https"
  Env: {}
  PortMap: {}
  Scaling:
    AutoStop: false
    Min: 1
    Max: 1
    MaxIdleTime: 300
  Resources:
    CPU: 0.1
    MemoryMB: 128
    MemoryMaxMB: 128
  Timeout: 60
  Validations: null

build:
  builtin: dockerfile
  ignorefile: .gitignore
`;

	try {
		fs.writeFileSync(
			path.join(targetDir, "boltic.yaml"),
			bolticYamlContent
		);
	} catch (err) {
		console.error(chalk.red(`\n❌ Failed to create boltic.yaml`));
		console.error(chalk.red(`Error: ${err.message}`));
		return;
	}

	// Check if user has git access by trying ls-remote
	let hasGitAccess = false;
	if (gitSshUrl) {
		console.log(chalk.cyan("\n🔍 Checking git repository access..."));
		try {
			// Initialize git repo
			execSync(`git init`, { cwd: targetDir, stdio: "pipe" });
			execSync(`git remote add origin ${gitSshUrl}`, {
				cwd: targetDir,
				stdio: "pipe",
			});
			// Try ls-remote to check SSH access
			execSync(`git ls-remote ${gitSshUrl}`, {
				cwd: targetDir,
				stdio: "pipe",
				timeout: 15000,
			});
			hasGitAccess = true;
		} catch (err) {
			hasGitAccess = false;
		}
	}

	// If user has access, create main branch
	if (hasGitAccess) {
		try {
			console.log(chalk.cyan("🔧 Setting up git branch..."));
			// Create main branch
			execSync(`git checkout -b main`, { cwd: targetDir, stdio: "pipe" });
			console.log(chalk.green("✓ Created main branch"));
		} catch (err) {
			// Ignore errors in branch setup, user can do it manually
			console.log(
				chalk.yellow(
					"⚠️  Could not auto-setup git branch. You can set it up manually."
				)
			);
		}
	}

	// Display success message
	console.log("\n" + chalk.bgGreen.black(" ✓ CREATED ") + "\n");
	console.log(
		chalk.green("📁 Git-based serverless project created successfully!")
	);
	console.log();
	console.log(chalk.cyan("   Name: ") + chalk.white(name));
	console.log(chalk.cyan("   Type: ") + chalk.white("git"));
	console.log(
		chalk.cyan("   Language: ") + chalk.white(`${language}/${version}`)
	);
	console.log(chalk.cyan("   Location: ") + chalk.white(targetDir));
	console.log(chalk.cyan("   Serverless ID: ") + chalk.white(serverlessId));

	if (gitSshUrl || gitHttpUrl) {
		console.log();
		console.log(chalk.cyan("   📦 Git Repository:"));
		if (gitSshUrl) {
			console.log(chalk.cyan("      SSH URL: ") + chalk.white(gitSshUrl));
		}
		if (gitHttpUrl) {
			console.log(
				chalk.cyan("      Web URL: ") + chalk.white(gitHttpUrl)
			);
		}
		if (gitCloneUrl) {
			console.log(
				chalk.cyan("      Clone URL: ") + chalk.white(gitCloneUrl)
			);
		}
		console.log();

		if (hasGitAccess) {
			console.log(
				chalk.green("✅ You have access to the git repository!")
			);
			console.log(chalk.green("✅ Main branch created!"));
			console.log();
			console.log(
				chalk.yellow("📝 Next steps - Add your code and push:")
			);
			console.log(chalk.dim("   1. Add your server code to this folder"));
			console.log(chalk.dim("   2. Commit and push:"));
			console.log(chalk.white(`      git add .`));
			console.log(chalk.white(`      git commit -m "Initial commit"`));
			console.log(chalk.white(`      git push -u origin main`));
		} else {
			console.log(
				chalk.red("❌ You don't have access to this git repository.")
			);
			console.log(
				chalk.yellow(
					"   Please add your SSH key from the Boltic UI to get access."
				)
			);
			console.log();
			console.log(
				chalk.yellow("📝 Once you have access, push your code:")
			);
			console.log(chalk.dim("   1. Add your code to this folder"));
			console.log(chalk.dim("   2. Run:"));
			console.log(chalk.white(`      git checkout -b main`));
			console.log(chalk.white(`      git add .`));
			console.log(chalk.white(`      git commit -m "Initial commit"`));
			console.log(chalk.white(`      git push -u origin main`));
		}
	} else {
		console.log();
		console.log(chalk.yellow("📝 Next steps:"));
		console.log(chalk.dim("   1. Add your code to this folder"));
		console.log(chalk.dim("   2. Configure git remote and push your code"));
	}
	console.log();
}

/**
 * Handle container type serverless creation - creates empty folder with boltic.yaml
 */
async function handleContainerTypeCreate(name, targetDir) {
	console.log(
		chalk.cyan("\n🐳 Creating container-based serverless project...")
	);
	console.log(chalk.dim(`   Type: container`));

	// Ask for container image URI
	const containerImage = await input({
		message: "Enter container image URI (e.g., docker.io/user/image:tag):",
		validate: (value) => {
			if (!value || value.trim() === "") {
				return "Container image URI is required";
			}
			return true;
		},
	});

	console.log(chalk.cyan("\n📤 Creating serverless function..."));

	// Get auth credentials
	const { apiUrl, token, accountId, session } = await getCurrentEnv();

	// Build create payload for container type
	const createPayload = {
		Name: name,
		Description: "",
		Runtime: "container",
		PortMap: [],
		Scaling: {
			AutoStop: false,
			Min: 1,
			Max: 1,
			MaxIdleTime: 300,
		},
		Resources: {
			CPU: 0.1,
			MemoryMB: 128,
			MemoryMaxMB: 128,
		},
		Timeout: 60,
		Validations: null,
		ContainerOpts: {
			Image: containerImage.trim(),
			Args: [],
			Command: "",
		},
	};

	// Call create serverless API
	const response = await publishServerless(
		apiUrl,
		token,
		session,
		createPayload
	);

	if (!response || !response.ID) {
		console.error(chalk.red("\n❌ Failed to create serverless function"));
		// Cleanup directory
		try {
			fs.rmSync(targetDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
		return;
	}

	const serverlessId = response.ID;

	// Create boltic.yaml for container type with serverlessId inside serverlessConfig
	const bolticYamlContent = `app: "${name}"
region: "asia-south1"

serverlessConfig:
  serverlessId: "${serverlessId}"
  Name: "${name}"
  Description: ""
  Runtime: "container"
  # Environment variables for your serverless function
  # To add env variables, replace {} with key-value pairs like:
  # Env:
  #   API_KEY: "your-api-key"
  Env: {}
  PortMap: []
  Scaling:
    AutoStop: false
    Min: 1
    Max: 1
    MaxIdleTime: 300
  Resources:
    CPU: 0.1
    MemoryMB: 128
    MemoryMaxMB: 128
  Timeout: 60
  Validations: null
  ContainerOpts:
    Image: "${containerImage.trim()}"
    Args: []
    Command: ""

build:
  builtin: dockerfile
  ignorefile: .gitignore
`;

	try {
		fs.writeFileSync(
			path.join(targetDir, "boltic.yaml"),
			bolticYamlContent
		);
	} catch (err) {
		console.error(chalk.red(`\n❌ Failed to create boltic.yaml`));
		console.error(chalk.red(`Error: ${err.message}`));
		return;
	}

	// Display success message for container type
	console.log("\n" + chalk.bgGreen.black(" ✓ CREATED ") + "\n");
	console.log(
		chalk.green(
			"🐳 Container-based serverless project created successfully!"
		)
	);
	console.log();
	console.log(chalk.cyan("   Name: ") + chalk.white(name));
	console.log(chalk.cyan("   Type: ") + chalk.white("container"));
	console.log(chalk.cyan("   Image: ") + chalk.white(containerImage.trim()));
	console.log(chalk.cyan("   Location: ") + chalk.white(targetDir));
	console.log(chalk.cyan("   Serverless ID: ") + chalk.white(serverlessId));
	console.log();

	// Poll for serverless status until running
	await pollServerlessStatus(pullServerless, serverlessId, {
		apiUrl,
		token,
		accountId,
		session,
	});

	console.log(chalk.yellow("📝 Next steps:"));
	console.log(chalk.dim("   1. To update configuration, edit boltic.yaml"));
	console.log(
		chalk.dim("   2. To publish changes: boltic serverless publish")
	);
	console.log();
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
		const serverlessConfig = config.serverlessConfig;
		const serverlessId = serverlessConfig?.serverlessId;

		if (!appName) {
			console.error(chalk.red("\n❌ App name not found in boltic.yaml"));
			return;
		}

		if (!language && serverlessConfig?.Runtime !== "container") {
			console.error(chalk.red("\n❌ Language not found in boltic.yaml"));
			return;
		}

		console.log(chalk.cyan("📋 App Name: ") + chalk.white(appName));
		console.log(chalk.cyan("📋 Language: ") + chalk.white(language));
		console.log(
			chalk.cyan("📋 Runtime: ") +
				chalk.white(serverlessConfig?.Runtime || "code")
		);

		// Step 4: Read handler file (only for "code" runtime type)
		const languageBase = parseLanguageFromConfig(language);
		const runtime = serverlessConfig?.Runtime || "code";
		let code = null;

		if (runtime === "code") {
			code = readHandlerFile(directory, languageBase, config);

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
		}

		// Step 5: Get auth credentials
		const { apiUrl, token, accountId, session } = await getCurrentEnv();

		let response;

		// Update existing serverless function
		const payload = buildUpdatePayload(serverlessConfig, language, code);

		console.log(chalk.cyan("\n📤 Updating serverless function..."));
		response = await updateServerless(
			apiUrl,
			token,
			session,
			serverlessId,
			payload
		);

		if (response) {
			displayPublishSuccessMessage(appName, response);

			// Poll for serverless status for code and container types only
			if (runtime === "code" || runtime === "container") {
				await pollServerlessStatus(pullServerless, serverlessId, {
					apiUrl,
					token,
					accountId,
					session,
				});
			}
		} else {
			console.error(
				chalk.red(`\n❌ Failed to publish serverless function`)
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
		if (!config) {
			console.error(
				chalk.red("\n❌ boltic.yaml not found in the directory")
			);
			console.log(
				chalk.yellow(
					"You can only test code or container type serverless with boltic.yaml"
				)
			);
			return;
		}

		// Check if it's a container type serverless
		const runtime = config.serverlessConfig?.Runtime || "code";
		if (runtime === "container") {
			await handleContainerTest(config, directory, port);
			return;
		}

		// For git type, show message that test is not supported
		if (runtime === "git") {
			console.log(
				chalk.yellow(
					"\n⚠️  Git type serverless test is not supported via CLI."
				)
			);
			console.log(
				chalk.dim(
					"For git type, run your server directly using your project's start command."
				)
			);
			console.log(
				chalk.dim("Example: npm start, python app.py, go run ., etc.")
			);
			return;
		}

		// Step 3: Determine language (for code type)
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

		// Step 4.1: Detect actual handler function name from code
		// This handles cases where user might have renamed the function (e.g., handler -> handler1)
		const handlerCode = fs.readFileSync(handlerPath, "utf8");
		const detectedFunction = detectHandlerFunctionFromCode(
			handlerCode,
			language
		);

		if (detectedFunction && detectedFunction !== handlerFunction) {
			console.log(
				chalk.yellow(`⚠️  Detected handler function: `) +
					chalk.bold.white(detectedFunction) +
					chalk.yellow(` (config says: ${handlerFunction})`)
			);
			console.log(
				chalk.cyan("   Using detected function name from code...")
			);
			handlerFunction = detectedFunction;
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

/**
 * Handle container type serverless test - runs docker container locally
 */
async function handleContainerTest(config, directory, port) {
	const containerOpts = config.serverlessConfig?.ContainerOpts;
	const image = containerOpts?.Image;

	if (!image) {
		console.error(
			chalk.red("\n❌ Container image not found in boltic.yaml")
		);
		console.log(
			chalk.yellow(
				"Please ensure ContainerOpts.Image is set in serverlessConfig."
			)
		);
		return;
	}

	console.log(chalk.cyan("\n🐳 Container serverless detected"));
	console.log(chalk.dim(`   Image: ${image}`));
	console.log(chalk.dim(`   Port: ${port}`));

	// Check if Docker is available
	try {
		execSync("docker --version", { stdio: "pipe" });
	} catch (err) {
		console.error(
			chalk.red("\n❌ Docker is not installed or not available in PATH.")
		);
		console.log(
			chalk.yellow(
				"Please install Docker to test container type serverless."
			)
		);
		return;
	}

	// Build environment variables from config
	const envVars = config.serverlessConfig?.Env || {};
	const envArgs = Object.entries(envVars).flatMap(([key, value]) => [
		"-e",
		`${key}=${value}`,
	]);

	// Build docker run command
	const dockerArgs = ["run", "--rm", "-p", `${port}:8080`, ...envArgs, image];

	console.log("\n" + chalk.bgCyan.black(" 🧪 LOCAL CONTAINER TEST ") + "\n");
	console.log(
		chalk.green(`🚀 Starting container on http://localhost:${port}`)
	);
	console.log();
	console.log(chalk.dim("━".repeat(60)));
	console.log(chalk.dim("  Press Ctrl+C to stop the container"));
	console.log(chalk.dim("━".repeat(60)));
	console.log();

	// Start the container
	const dockerProcess = spawn("docker", dockerArgs, {
		cwd: directory,
		stdio: ["inherit", "pipe", "pipe"],
	});

	// Stream stdout
	dockerProcess.stdout.on("data", (data) => {
		process.stdout.write(chalk.white(data.toString()));
	});

	// Stream stderr
	dockerProcess.stderr.on("data", (data) => {
		process.stderr.write(chalk.yellow(data.toString()));
	});

	// Handle process exit
	dockerProcess.on("close", (code) => {
		console.log(
			chalk.yellow(`\n🛑 Container stopped with exit code: ${code}`)
		);
		process.exit(code || 0);
	});

	// Handle process error
	dockerProcess.on("error", (error) => {
		console.error(
			chalk.red(`\n❌ Failed to start container: ${error.message}`)
		);
		if (error.code === "ENOENT") {
			console.log(
				chalk.yellow(
					"\n💡 Hint: Make sure Docker is installed and available in PATH."
				)
			);
		}
		process.exit(1);
	});

	// Handle Ctrl+C
	const cleanup = (signal) => {
		console.log(
			chalk.yellow(`\n\n🛑 Received ${signal}, stopping container...`)
		);
		dockerProcess.kill("SIGTERM");
	};

	process.on("SIGINT", () => cleanup("SIGINT"));
	process.on("SIGTERM", () => cleanup("SIGTERM"));
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
			allServerless.map((serverless) => {
				const runtime = serverless.Config?.Runtime || "code";
				const typeIcon =
					runtime === "git"
						? "📦"
						: runtime === "container"
							? "🐳"
							: "📝";
				const language = serverless.Config?.CodeOpts?.Language;
				return {
					name: `${serverless.Config.Name}: ${typeIcon} ${runtime} | Status - ${serverless.Status}${language ? ` | language: ${language}` : ""}`,
					value: serverless,
				};
			}) || [];

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
		// console.log("selectes serverless : ",pulledServerless)

		// Get the app name, language and type for the folder name
		const appName =
			pulledServerless?.Config?.Name || selectedServerless.Config?.Name;
		const language =
			pulledServerless?.Config?.CodeOpts?.Language?.split("/")[0] ||
			"nodejs";
		const serverlessType = pulledServerless?.Config?.Runtime || "code";

		// Create folder name similar to create command
		const folderName = appName;
		const targetDir = path.join(currentDir, folderName);

		// Check if folder already exists
		if (fs.existsSync(targetDir)) {
			console.error(
				chalk.red(
					`\n❌ Folder "${folderName}" already exists in ${currentDir}. Please remove it or use a different location.`
				)
			);
			return;
		}

		// Create the folder
		fs.mkdirSync(targetDir, { recursive: true });
		console.log(chalk.cyan(`\n📁 Creating folder: ${folderName}`));

		// Create the files (boltic.yaml with serverlessId and serverlessConfig, handler file with code)
		try {
			const result = createPulledServerlessFiles(
				targetDir,
				pulledServerless,
				serverlessType
			);

			// If there was an error (e.g., no SSH access for git type), don't show success
			if (result?.error) {
				return;
			}

			displayPullSuccessMessage(appName, targetDir);
		} catch (fileError) {
			console.error(
				chalk.red("\n❌ Failed to create files:"),
				fileError.message
			);
			// Clean up the created folder on error
			try {
				fs.rmSync(targetDir, { recursive: true, force: true });
			} catch (cleanupError) {
				// Ignore cleanup errors
			}
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
		chalk.bold("  --type, -t") +
			chalk.dim("           ") +
			"Serverless type: blueprint, git, or container (prompts if not provided)"
	);
	console.log(
		chalk.bold("  --name, -n") +
			chalk.dim("           ") +
			"Name of the serverless function (required, prompts if not provided)"
	);
	console.log(
		chalk.bold("  --language, -l") +
			chalk.dim("       ") +
			"Programming language: nodejs, python, golang, java (prompts if not provided)"
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
		chalk.bold("  --language, -l") +
			chalk.dim("       ") +
			"Language (nodejs, python, golang, java) - auto-detected if not specified"
	);
	console.log(
		chalk.bold("  --directory, -d") +
			chalk.dim("      ") +
			"Base directory of the project (default: current directory)"
	);

	console.log(chalk.cyan("\nPublish Command Options:\n"));
	console.log(
		chalk.bold("  --directory, -d") +
			chalk.dim("      ") +
			"Directory of the serverless project (default: current directory)"
	);

	console.log(chalk.cyan("\nStatus Command Options:\n"));
	console.log(
		chalk.bold("  --name, -n") +
			chalk.dim("           ") +
			"Name of the serverless function (prompts if not provided)"
	);

	console.log(chalk.cyan("\nCreate Examples:\n"));
	console.log(
		chalk.dim(
			"  # Interactive mode (will prompt for type, name, and language)"
		)
	);
	console.log("  boltic serverless create\n");
	console.log(chalk.dim("  # Create blueprint serverless"));
	console.log(
		"  boltic serverless create --type blueprint --name my-api --language nodejs\n"
	);
	console.log(
		chalk.dim(
			"  # Create git-based serverless (add your code, then publish)"
		)
	);
	console.log(
		"  boltic serverless create --type git --name my-git-func --language python\n"
	);
	console.log(chalk.dim("  # Create container-based serverless"));
	console.log(
		"  boltic serverless create --type container --name my-container --language golang\n"
	);
	console.log(chalk.dim("  # With custom directory"));
	console.log(
		"  boltic serverless create --type blueprint --name my-function --language python --directory ./projects\n"
	);

	console.log(chalk.cyan("\nTest Examples:\n"));
	console.log(chalk.dim("  # Basic usage - auto-detect everything"));
	console.log("  boltic serverless test\n");
	console.log(chalk.dim("  # Specify port"));
	console.log("  boltic serverless test --port 3000\n");

	console.log(chalk.cyan("\nPublish Examples:\n"));
	console.log(chalk.dim("  # Publish from current directory"));
	console.log("  boltic serverless publish\n");
	console.log(chalk.dim("  # Publish from specific directory"));
	console.log("  boltic serverless publish -d ./my-function\n");

	console.log(chalk.cyan("\nList Examples:\n"));
	console.log(chalk.dim("  # List all serverless functions"));
	console.log("  boltic serverless list\n");

	console.log(chalk.cyan("\nStatus Examples:\n"));
	console.log(chalk.dim("  # Get status by name"));
	console.log("  boltic serverless status -n my-function\n");
	console.log(chalk.dim("  # Interactive mode (will prompt for name)"));
	console.log("  boltic serverless status\n");
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

async function handleList(args = []) {
	try {
		const { apiUrl, token, accountId, session } = await getCurrentEnv();

		console.log(chalk.cyan("\n📋 Fetching serverless functions...\n"));

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
			return;
		}

		if (allServerless.length === 0) {
			console.log(chalk.yellow("No serverless functions found."));
			return;
		}

		console.log(
			chalk.green(`Found ${allServerless.length} serverless function(s):`)
		);
		console.log(
			chalk.dim("Use ↑↓ to scroll, type to search, Ctrl+C to exit\n")
		);

		// Build choices for the list
		const choices = allServerless.map((serverless) => {
			const runtime = serverless.Config?.Runtime || "code";
			const typeIcon =
				runtime === "git"
					? "📦"
					: runtime === "container"
						? "🐳"
						: "📝";
			const language = serverless.Config?.CodeOpts?.Language;
			const status = serverless.Status;

			return {
				name: `${serverless.Config.Name}: ${typeIcon} ${runtime} | Status - ${status}${language ? ` | ${language}` : ""} | ID: ${serverless.ID.substring(0, 8)}...`,
				value: serverless,
			};
		});

		// Show interactive scrollable list
		const selected = await search({
			message: "Serverless functions (scroll to browse):",
			source: async (term) => {
				if (!term) return choices;
				return choices.filter((choice) =>
					choice.name.toLowerCase().includes(term.toLowerCase())
				);
			},
		});

		// Show details of selected serverless
		if (selected) {
			const runtime = selected.Config?.Runtime || "code";
			const typeIcon =
				runtime === "git"
					? "📦"
					: runtime === "container"
						? "🐳"
						: "📝";

			console.log("\n" + chalk.cyan("━".repeat(60)));
			console.log(chalk.bold("\n📌 Selected Serverless Details:\n"));
			console.log(
				chalk.cyan("   Name: ") + chalk.white(selected.Config.Name)
			);
			console.log(chalk.cyan("   ID: ") + chalk.white(selected.ID));
			console.log(
				chalk.cyan("   Type: ") + chalk.white(`${typeIcon} ${runtime}`)
			);
			console.log(
				chalk.cyan("   Status: ") + chalk.white(selected.Status)
			);
			if (selected.Config?.CodeOpts?.Language) {
				console.log(
					chalk.cyan("   Language: ") +
						chalk.white(selected.Config.CodeOpts.Language)
				);
			}
			if (selected.Config?.ContainerOpts?.Image) {
				console.log(
					chalk.cyan("   Image: ") +
						chalk.white(selected.Config.ContainerOpts.Image)
				);
			}
			console.log(chalk.cyan("━".repeat(60)));
			console.log(
				chalk.dim(
					"\nUse 'boltic serverless pull' to pull this serverless locally."
				)
			);
		}
	} catch (error) {
		if (
			error.message &&
			error.message.includes("User force closed the prompt")
		) {
			console.log(chalk.yellow("\n⚠️ List closed"));
			return;
		}
		console.error(
			chalk.red("\n❌ An error occurred:"),
			error.message || "Unknown error"
		);
	}
}

/**
 * Handle the status command - show status of a serverless function
 */
async function handleStatus(args = []) {
	try {
		// Parse name from args
		let name = null;
		const nameIndex = args.indexOf("--name");
		const shortNameIndex = args.indexOf("-n");

		if (nameIndex !== -1 && args[nameIndex + 1]) {
			name = args[nameIndex + 1];
		} else if (shortNameIndex !== -1 && args[shortNameIndex + 1]) {
			name = args[shortNameIndex + 1];
		}

		// If name not provided, prompt for it
		if (!name) {
			name = await input({
				message: "Enter serverless name:",
				validate: (value) => {
					if (!value || value.trim() === "") {
						return "Serverless name is required";
					}
					return true;
				},
			});
		}

		const { apiUrl, token, accountId, session } = await getCurrentEnv();

		console.log(chalk.cyan(`\n🔍 Fetching status for "${name}"...\n`));

		// Get serverless by name using query parameter
		const result = await listAllServerless(
			apiUrl,
			token,
			accountId,
			session,
			name // Pass name as query parameter
		);

		if (!result || !Array.isArray(result)) {
			console.error(
				chalk.red(
					"\n❌ Failed to fetch serverless: Invalid response format"
				)
			);
			return;
		}

		// Get first element (name is unique)
		const serverless = result[0];

		if (!serverless) {
			console.error(chalk.red(`\n❌ Serverless "${name}" not found.`));
			console.log(
				chalk.yellow(
					"\nUse 'boltic serverless list' to see all serverless functions."
				)
			);
			return;
		}

		// Display status
		const runtime = serverless.Config?.Runtime || "code";
		const typeIcon =
			runtime === "git" ? "📦" : runtime === "container" ? "🐳" : "📝";
		const status = serverless.Status;
		const statusColor =
			status === "running"
				? chalk.green
				: status === "draft"
					? chalk.yellow
					: status === "stopped"
						? chalk.red
						: chalk.gray;

		console.log(chalk.cyan("━".repeat(60)));
		console.log(chalk.bold("\n📊 Serverless Status\n"));
		console.log(
			chalk.cyan("   Name: ") + chalk.white(serverless.Config.Name)
		);
		console.log(chalk.cyan("   ID: ") + chalk.white(serverless.ID));
		console.log(
			chalk.cyan("   Type: ") + chalk.white(`${typeIcon} ${runtime}`)
		);
		console.log(chalk.cyan("   Status: ") + statusColor(status));

		if (serverless.Config?.CodeOpts?.Language) {
			console.log(
				chalk.cyan("   Language: ") +
					chalk.white(serverless.Config.CodeOpts.Language)
			);
		}
		if (serverless.Config?.ContainerOpts?.Image) {
			console.log(
				chalk.cyan("   Image: ") +
					chalk.white(serverless.Config.ContainerOpts.Image)
			);
		}
		if (serverless.Config?.Resources) {
			console.log(
				chalk.cyan("   Resources: ") +
					chalk.white(
						`CPU: ${serverless.Config.Resources.CPU}, Memory: ${serverless.Config.Resources.MemoryMB}MB`
					)
			);
		}
		if (serverless.Config?.Scaling) {
			console.log(
				chalk.cyan("   Scaling: ") +
					chalk.white(
						`Min: ${serverless.Config.Scaling.Min}, Max: ${serverless.Config.Scaling.Max}`
					)
			);
		}
		if (serverless.RegionID) {
			console.log(
				chalk.cyan("   Region: ") + chalk.white(serverless.RegionID)
			);
		}
		if (serverless.CreatedAt) {
			console.log(
				chalk.cyan("   Created: ") +
					chalk.white(new Date(serverless.CreatedAt).toLocaleString())
			);
		}
		if (serverless.UpdatedAt) {
			console.log(
				chalk.cyan("   Updated: ") +
					chalk.white(new Date(serverless.UpdatedAt).toLocaleString())
			);
		}

		console.log();
		console.log(chalk.cyan("━".repeat(60)));
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

export default {
	execute,
};
