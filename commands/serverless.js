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
	createGitignore,
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
	getServerlessBuilds,
	getServerlessLogs,
	getBuildLogs,
} from "../api/serverless.js";
import { setVerboseMode } from "../helper/verbose.js";

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
	list: {
		description: "List all serverless functions",
		action: handleList,
	},
	status: {
		description: "Show status of a serverless function",
		action: handleStatus,
	},
	builds: {
		description: "List builds for a serverless function",
		action: handleBuilds,
	},
	logs: {
		description: "Show logs for a serverless function",
		action: handleLogs,
	},
	"build logs": {
		description: "Show logs for a specific build",
		action: handleBuildLogs,
	},
	help: {
		description: "Show help for serverless commands",
		action: showHelp,
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
		let { name, language, directory, type, noGitignore } = parsedArgs;

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
			await handleGitTypeCreate(
				name,
				language,
				version,
				targetDir,
				noGitignore
			);
			return;
		}

		if (type === "container") {
			// For container type: ask for image and create serverless
			await handleContainerTypeCreate(name, targetDir, noGitignore);
			return;
		}

		// For code type: create full template files and call create API
		await handleCodeTypeCreate(
			name,
			language,
			version,
			targetDir,
			noGitignore
		);
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
 * Check if a serverless function with the given name already exists
 * @returns {Object|null} The existing serverless object if found, null otherwise
 */
async function checkServerlessExists(name) {
	const env = await getCurrentEnv();
	if (!env || !env.token || !env.session) {
		return null; // Can't check without auth, let the create call handle auth error
	}

	const { apiUrl, token, accountId, session } = env;

	try {
		const allServerless = await listAllServerless(
			apiUrl,
			token,
			accountId,
			session,
			name // Use query parameter to search by name
		);

		if (allServerless && Array.isArray(allServerless)) {
			// Find exact match by name (case-insensitive)
			const existing = allServerless.find(
				(s) => s.Name && s.Name.toLowerCase() === name.toLowerCase()
			);
			return existing || null;
		}
	} catch {
		// If API call fails, let the create call handle it
		return null;
	}

	return null;
}

/**
 * Display message when serverless already exists and suggest pull command
 */
function displayServerlessExistsMessage(name, existing) {
	console.log(
		chalk.yellow(
			`\n⚠️  A serverless function named "${name}" already exists.`
		)
	);
	console.log(chalk.dim(`   ID: ${existing.ID || existing._id}`));
	if (existing.Status) {
		console.log(chalk.dim(`   Status: ${existing.Status}`));
	}
	console.log();
	console.log(chalk.cyan("To pull the existing serverless function, run:"));
	console.log(chalk.green(`   boltic serverless pull --name ${name}`));
	console.log();
	console.log(chalk.dim("Or use a different name:"));
	console.log(chalk.dim(`   boltic serverless create --name <new-name> ...`));
	console.log();
}

/**
 * Handle code type serverless creation - creates folder with template files and calls create API
 */
async function handleCodeTypeCreate(
	name,
	language,
	version,
	targetDir,
	noGitignore = false
) {
	// Check if serverless with this name already exists
	const existingServerless = await checkServerlessExists(name);
	if (existingServerless) {
		displayServerlessExistsMessage(name, existingServerless);
		// Cleanup the created directory
		try {
			fs.rmSync(targetDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
		return;
	}

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

	// Create .gitignore file unless --no-gitignore flag is set
	if (!noGitignore) {
		const gitignoreCreated = createGitignore(targetDir, language);
		if (gitignoreCreated) {
			console.log(chalk.dim(`   Created .gitignore for ${language}`));
		}
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
 * Handle git type serverless creation - creates serverless on server and clones the repo
 */
async function handleGitTypeCreate(
	name,
	language,
	version,
	targetDir,
	noGitignore = false
) {
	// Check if serverless with this name already exists
	const existingServerless = await checkServerlessExists(name);
	if (existingServerless) {
		displayServerlessExistsMessage(name, existingServerless);
		// Cleanup the created directory
		try {
			fs.rmSync(targetDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
		return;
	}

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
	const serverlessId = response.ID || response.data?.ID || response._id;
	const gitRepo =
		response.Links?.Git?.Repository ||
		response.data?.Links?.Git?.Repository;
	const gitSshUrl = gitRepo?.SshURL || "";
	const gitHttpUrl = gitRepo?.HtmlURL || "";
	const gitCloneUrl = gitRepo?.CloneURL || "";

	// Remove the empty directory created earlier - we'll clone into it
	try {
		fs.rmSync(targetDir, { recursive: true, force: true });
	} catch {
		// Ignore cleanup errors
	}

	// Clone the repo from server (which has the server-generated boltic.yaml)
	let cloneSuccess = false;
	if (gitSshUrl) {
		console.log(chalk.cyan("\n📥 Cloning git repository..."));
		try {
			// Clone the repo
			execSync(`git clone ${gitSshUrl} "${targetDir}"`, {
				stdio: "pipe",
				timeout: 30000,
			});
			cloneSuccess = true;
			console.log(chalk.green("✅ Repository cloned successfully!"));
		} catch (err) {
			console.log(
				chalk.yellow(
					"⚠️  Could not clone repository. You may not have SSH access yet."
				)
			);
			cloneSuccess = false;
		}
	}

	// If clone failed, create directory with minimal setup
	if (!cloneSuccess) {
		try {
			fs.mkdirSync(targetDir, { recursive: true });
			// Create a minimal boltic.yaml as fallback
			const bolticYamlContent = `app: "${name}"
region: "asia-south1"
handler: "${HANDLER_MAPPING[language]}"
language: "${language}/${version}"

serverlessConfig:
  serverlessId: "${serverlessId}"
  Name: "${name}"
  Runtime: "git"
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
`;
			fs.writeFileSync(
				path.join(targetDir, "boltic.yaml"),
				bolticYamlContent
			);
			// Initialize git repo
			if (gitSshUrl) {
				execSync(`git init`, { cwd: targetDir, stdio: "pipe" });
				execSync(`git remote add origin ${gitSshUrl}`, {
					cwd: targetDir,
					stdio: "pipe",
				});
			}
		} catch (err) {
			console.error(chalk.red(`\n❌ Failed to create project directory`));
			console.error(chalk.red(`Error: ${err.message}`));
			return;
		}
	}

	// Create .gitignore file unless --no-gitignore flag is set
	if (!noGitignore) {
		const gitignoreCreated = createGitignore(targetDir, language);
		if (gitignoreCreated) {
			console.log(chalk.dim(`   Created .gitignore for ${language}`));
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

		if (cloneSuccess) {
			console.log(
				chalk.green("✅ Repository cloned with server configuration!")
			);
			console.log();
			console.log(
				chalk.yellow("📝 Next steps - Add your code and push:")
			);
			console.log(chalk.dim("   1. Add your server code to this folder"));
			console.log(chalk.dim("   2. Commit and push:"));
			console.log(chalk.white(`      git add .`));
			console.log(
				chalk.white(`      git commit -m "Add application code"`)
			);
			console.log(chalk.white(`      git push origin main`));
		} else {
			console.log(
				chalk.yellow("⚠️  Could not clone repository automatically.")
			);
			console.log(
				chalk.yellow(
					"   Please add your SSH key from the Boltic UI to get access."
				)
			);
			console.log();
			console.log(
				chalk.yellow("📝 Once you have access, sync with remote:")
			);
			console.log(chalk.dim("   1. Pull the server config first:"));
			console.log(
				chalk.white(
					`      git pull origin main --allow-unrelated-histories`
				)
			);
			console.log(chalk.dim("   2. Add your code and push:"));
			console.log(chalk.white(`      git add .`));
			console.log(
				chalk.white(`      git commit -m "Add application code"`)
			);
			console.log(chalk.white(`      git push origin main`));
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
async function handleContainerTypeCreate(name, targetDir, noGitignore = false) {
	// Check if serverless with this name already exists
	const existingServerless = await checkServerlessExists(name);
	if (existingServerless) {
		displayServerlessExistsMessage(name, existingServerless);
		// Cleanup the created directory
		try {
			fs.rmSync(targetDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
		return;
	}

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

	// Create .gitignore file unless --no-gitignore flag is set
	if (!noGitignore) {
		const gitignoreCreated = createGitignore(targetDir, "container");
		if (gitignoreCreated) {
			console.log(chalk.dim(`   Created .gitignore`));
		}
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
		const { directory, verbose } = parsedArgs;

		// Enable verbose mode if requested
		if (verbose) {
			setVerboseMode(true);
		}

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
		if (runtime === "git") {
			console.log(
				chalk.yellow(
					"\n📦 Git-based serverless deploys via git push, not publish."
				)
			);
			console.log(chalk.cyan("\nTo deploy your changes:\n"));
			console.log(chalk.white("   # Stage your changes"));
			console.log(chalk.green("   git add .\n"));
			console.log(chalk.white("   # Commit your changes"));
			console.log(
				chalk.green('   git commit -m "Update serverless function"\n')
			);
			console.log(chalk.white("   # Push to deploy"));
			console.log(chalk.green("   git push origin main\n"));
			console.log(
				chalk.dim(
					"The serverless will automatically build and deploy after push."
				)
			);
			console.log(
				chalk.dim(
					`Monitor status with: boltic serverless status --name ${appName} --follow\n`
				)
			);
			return;
		}

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
		let serverlessName = null;

		for (let i = 0; i < args.length; i++) {
			const arg = args[i];
			const nextArg = args[i + 1];

			if (arg === "--path" && nextArg) {
				currentDir = nextArg;
				i++;
			} else if ((arg === "--name" || arg === "-n") && nextArg) {
				serverlessName = nextArg;
				i++;
			}
		}

		// Validate the provided path
		if (currentDir !== process.cwd() && !fs.existsSync(currentDir)) {
			console.error(
				chalk.red(
					`Error: The specified path does not exist: ${currentDir}`
				)
			);
			return;
		}

		const { apiUrl, token, accountId, session } = await getCurrentEnv();

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
			console.error(chalk.red("\n❌ No serverless found."));
			return;
		}

		let selectedServerless;

		// If name is provided, find exact match
		if (serverlessName) {
			selectedServerless = allServerless.find(
				(s) =>
					s.Config?.Name?.toLowerCase() ===
					serverlessName.toLowerCase()
			);

			if (!selectedServerless) {
				console.error(
					chalk.red(`\n❌ Serverless "${serverlessName}" not found.`)
				);
				console.log(chalk.yellow("\nAvailable serverless functions:"));
				allServerless.slice(0, 5).forEach((s) => {
					console.log(chalk.dim(`   - ${s.Config?.Name}`));
				});
				if (allServerless.length > 5) {
					console.log(
						chalk.dim(`   ... and ${allServerless.length - 5} more`)
					);
				}
				console.log(
					chalk.yellow("\nRun 'boltic serverless list' to see all.")
				);
				return;
			}

			console.log(
				chalk.cyan("Selected serverless:"),
				selectedServerless.Config.Name
			);
		} else {
			// Interactive selection
			console.log(
				chalk.green(
					"Please select the serverless to pull from the list below:"
				)
			);

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

			selectedServerless = await search({
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
		}
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
		console.log(chalk.bold(`  ${cmd.padEnd(12)}`) + details.description);
	});

	console.log(chalk.cyan("\nGlobal Options:\n"));
	console.log(
		chalk.bold("  --help, -h".padEnd(20)) + "Show help for a command"
	);

	console.log(chalk.cyan("\nCreate Options:\n"));
	console.log(
		chalk.bold("  --type, -t".padEnd(20)) +
			"Serverless type: blueprint, git, or container"
	);
	console.log(
		chalk.bold("  --name, -n".padEnd(20)) +
			"Name of the serverless function"
	);
	console.log(
		chalk.bold("  --language, -l".padEnd(20)) +
			"Programming language: nodejs, python, golang, java"
	);
	console.log(
		chalk.bold("  --directory, -d".padEnd(20)) +
			"Directory for the project (default: current)"
	);

	console.log(chalk.cyan("\nTest Options:\n"));
	console.log(
		chalk.bold("  --port, -p".padEnd(20)) +
			"Port to run the server on (default: 8080)"
	);
	console.log(
		chalk.bold("  --language, -l".padEnd(20)) +
			"Language (auto-detected if not specified)"
	);
	console.log(
		chalk.bold("  --directory, -d".padEnd(20)) +
			"Base directory of the project"
	);

	console.log(chalk.cyan("\nPublish Options:\n"));
	console.log(
		chalk.bold("  --directory, -d".padEnd(20)) +
			"Directory of the serverless project"
	);

	console.log(chalk.cyan("\nStatus Options:\n"));
	console.log(
		chalk.bold("  --name, -n".padEnd(20)) +
			"Name of the serverless function"
	);
	console.log(
		chalk.bold("  --follow, -f".padEnd(20)) +
			"Poll until status is running, failed, or degraded"
	);

	console.log(chalk.cyan("\nBuilds Options:\n"));
	console.log(
		chalk.bold("  --name, -n".padEnd(20)) +
			"Name of the serverless function"
	);

	console.log(chalk.cyan("\nLogs Options:\n"));
	console.log(
		chalk.bold("  --name, -n".padEnd(20)) +
			"Name of the serverless function"
	);
	console.log(
		chalk.bold("  --follow, -f".padEnd(20)) + "Follow logs in real-time"
	);
	console.log(
		chalk.bold("  --lines, -l".padEnd(20)) +
			"Number of lines to show (default: 100)"
	);

	console.log(chalk.cyan("\nBuild Logs Options:\n"));
	console.log(
		chalk.bold("  --name, -n".padEnd(20)) +
			"Name of the serverless function"
	);
	console.log(
		chalk.bold("  --build, -b".padEnd(20)) +
			"Build ID (prompts if not provided)"
	);

	console.log(chalk.cyan("\nExamples:\n"));

	console.log(chalk.dim("  # Create a blueprint serverless"));
	console.log(
		"  boltic serverless create -t blueprint -n my-api -l nodejs\n"
	);

	console.log(chalk.dim("  # Test locally on port 3000"));
	console.log("  boltic serverless test -p 3000\n");

	console.log(chalk.dim("  # Publish from current directory"));
	console.log("  boltic serverless publish\n");

	console.log(chalk.dim("  # List all serverless functions"));
	console.log("  boltic serverless list\n");

	console.log(chalk.dim("  # Check status with polling"));
	console.log("  boltic serverless status -n my-function --follow\n");

	console.log(chalk.dim("  # View builds for a serverless"));
	console.log("  boltic serverless builds -n my-function\n");

	console.log(chalk.dim("  # View runtime logs"));
	console.log("  boltic serverless logs -n my-function -f\n");

	console.log(chalk.dim("  # View build logs"));
	console.log("  boltic serverless build logs -n my-function\n");
}

// Execute the serverless command
const execute = async (args) => {
	let subCommand = args[0];
	let argsToPass = args.slice(1);

	// Handle help flags
	if (
		!subCommand ||
		subCommand === "--help" ||
		subCommand === "-h" ||
		args.includes("--help") ||
		args.includes("-h")
	) {
		showHelp();
		return;
	}

	// Handle two-word commands like "build logs"
	if (subCommand === "build" && args[1] === "logs") {
		subCommand = "build logs";
		argsToPass = args.slice(2);
	}

	if (!commands[subCommand]) {
		console.log(chalk.red(`Unknown serverless command: "${subCommand}"\n`));
		showHelp();
		return;
	}

	const commandObj = commands[subCommand];
	await commandObj.action(argsToPass);
};

/**
 * Get the URL for a serverless function
 */
function getServerlessUrl(serverless) {
	const appDomain = serverless.AppDomain?.[0];
	if (appDomain) {
		return `https://${appDomain.DomainName}.${appDomain.BaseUrl || "serverless.boltic.app"}`;
	}
	return null;
}

/**
 * Get status color for display
 */
function getStatusColor(status) {
	switch (status) {
		case "running":
			return chalk.green;
		case "draft":
		case "building":
		case "pending":
			return chalk.yellow;
		case "stopped":
		case "failed":
		case "degraded":
			return chalk.red;
		default:
			return chalk.gray;
	}
}

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
			const url = getServerlessUrl(serverless);

			return {
				name: `${serverless.Config.Name}: ${typeIcon} ${runtime} | ${status}${language ? ` | ${language}` : ""}${url ? ` | ${url}` : ""}`,
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
			displayServerlessDetails(selected);
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
 * Display detailed information about a serverless function
 */
function displayServerlessDetails(serverless) {
	const runtime = serverless.Config?.Runtime || "code";
	const typeIcon =
		runtime === "git" ? "📦" : runtime === "container" ? "🐳" : "📝";
	const status = serverless.Status;
	const statusColor = getStatusColor(status);
	const url = getServerlessUrl(serverless);

	console.log("\n" + chalk.cyan("━".repeat(60)));
	console.log(chalk.bold("\n📊 Serverless Details\n"));
	console.log(chalk.cyan("   Name: ") + chalk.white(serverless.Config.Name));
	console.log(chalk.cyan("   ID: ") + chalk.white(serverless.ID));
	console.log(
		chalk.cyan("   Type: ") + chalk.white(`${typeIcon} ${runtime}`)
	);
	console.log(chalk.cyan("   Status: ") + statusColor(status));

	if (url) {
		console.log(chalk.cyan("   URL: ") + chalk.white.bold(url));
	}

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
	console.log(
		chalk.dim(
			"\nTip: Use 'boltic serverless status -n <name> --follow' to poll for status changes."
		)
	);
}

/**
 * Parse status command arguments
 */
function parseStatusArgs(args) {
	const parsed = {
		name: null,
		watch: false,
		verbose: false,
		timeout: -1, // -1 means infinite
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		const nextArg = args[i + 1];

		if ((arg === "--name" || arg === "-n") && nextArg) {
			parsed.name = nextArg;
			i++;
		} else if (
			arg === "--follow" ||
			arg === "-f" ||
			arg === "--watch" ||
			arg === "-w"
		) {
			parsed.watch = true;
		} else if (arg === "--verbose" || arg === "-v") {
			parsed.verbose = true;
		} else if ((arg === "--timeout" || arg === "-t") && nextArg) {
			parsed.timeout = parseInt(nextArg, 10);
			i++;
		} else if (!arg.startsWith("-") && !parsed.name) {
			// Accept positional argument as name
			parsed.name = arg;
		}
	}

	return parsed;
}

/**
 * Handle the status command - show status of a serverless function
 */
async function handleStatus(args = []) {
	try {
		const parsedArgs = parseStatusArgs(args);
		let { name, watch, verbose, timeout } = parsedArgs;

		// Enable verbose mode if requested
		if (verbose) {
			setVerboseMode(true);
		}

		const { apiUrl, token, accountId, session } = await getCurrentEnv();

		// If name not provided, show list selector
		if (!name) {
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

			// Build choices for the list
			const choices = allServerless.map((serverless) => {
				const runtime = serverless.Config?.Runtime || "code";
				const typeIcon =
					runtime === "git"
						? "📦"
						: runtime === "container"
							? "🐳"
							: "📝";
				const status = serverless.Status;
				const statusColor = getStatusColor(status);

				return {
					name: `${serverless.Config.Name} | ${typeIcon} ${runtime} | ${statusColor(status)}`,
					value: serverless,
				};
			});

			const selected = await search({
				message: "Select a serverless function:",
				source: async (term) => {
					if (!term) return choices;
					return choices.filter((choice) =>
						choice.name.toLowerCase().includes(term.toLowerCase())
					);
				},
			});

			if (!selected) {
				return;
			}

			// Display status directly since we have the full object
			displayServerlessDetails(selected);

			// If watch mode, continue polling
			if (watch) {
				name = selected.Config.Name;
			} else {
				return;
			}
		}

		// If not in watch mode (and name was provided), just fetch and display once
		if (!watch) {
			console.log(chalk.cyan(`\n🔍 Fetching status for "${name}"...\n`));

			// First find the serverless by name to get the ID
			const result = await listAllServerless(
				apiUrl,
				token,
				accountId,
				session,
				name
			);

			if (!result || !Array.isArray(result) || !result[0]) {
				console.error(
					chalk.red(`\n❌ Serverless "${name}" not found.`)
				);
				console.log(
					chalk.yellow(
						"\nUse 'boltic serverless list' to see all serverless functions."
					)
				);
				return;
			}

			// Use pullServerless to get the full details with accurate status
			const serverlessId = result[0].ParentID || result[0].ID;
			const serverless = await pullServerless(
				apiUrl,
				token,
				accountId,
				session,
				serverlessId
			);

			if (!serverless) {
				console.error(
					chalk.red("\n❌ Failed to fetch serverless details")
				);
				return;
			}

			displayServerlessDetails(serverless);
			return;
		}

		// Watch mode - poll for status changes
		console.log(chalk.cyan(`\n👁️  Watching status for "${name}"...\n`));
		const timeoutMsg = timeout > 0 ? ` (timeout: ${timeout}s)` : "";
		console.log(chalk.dim(`Press Ctrl+C to stop watching.${timeoutMsg}\n`));

		// First, get the serverless ID
		const initialResult = await listAllServerless(
			apiUrl,
			token,
			accountId,
			session,
			name
		);

		if (
			!initialResult ||
			!Array.isArray(initialResult) ||
			!initialResult[0]
		) {
			console.error(chalk.red(`\n❌ Serverless "${name}" not found.`));
			return;
		}

		const serverlessId = initialResult[0].ParentID || initialResult[0].ID;
		const terminalStates = ["running", "failed", "degraded", "suspended"];
		let lastStatus = null;
		let iteration = 0;
		const startTime = Date.now();

		while (true) {
			iteration++;

			// Check timeout (-1 means infinite)
			if (timeout > 0) {
				const elapsed = Math.floor((Date.now() - startTime) / 1000);
				if (elapsed >= timeout) {
					console.log(
						chalk.yellow(
							`\n\n⏱️  Timeout reached after ${timeout} seconds.`
						)
					);
					return;
				}
			}

			// Use pullServerless for accurate status
			const serverless = await pullServerless(
				apiUrl,
				token,
				accountId,
				session,
				serverlessId
			);

			if (!serverless) {
				console.error(
					chalk.red(`\n❌ Failed to fetch serverless status.`)
				);
				return;
			}
			const status = serverless.Status;
			const statusColor = getStatusColor(status);
			const url = getServerlessUrl(serverless);

			// Show status update
			const timestamp = new Date().toLocaleTimeString();
			if (status !== lastStatus) {
				console.log(
					chalk.dim(`[${timestamp}]`) +
						` Status: ${statusColor(status)}` +
						(url ? chalk.dim(` | ${url}`) : "")
				);
				lastStatus = status;
			} else if (iteration % 3 === 0) {
				// Show a dot every 3 iterations to indicate it's still polling
				process.stdout.write(chalk.dim("."));
			}

			// Check if we've reached a terminal state
			if (terminalStates.includes(status)) {
				console.log();
				displayServerlessDetails(serverless);
				console.log(
					chalk.green(`\n✓ Reached terminal state: ${status}`)
				);
				return;
			}

			// Wait before next poll
			await new Promise((resolve) => setTimeout(resolve, 5000));
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
 * Helper to select a serverless function interactively
 */
async function selectServerless(
	apiUrl,
	token,
	accountId,
	session,
	message = "Select a serverless function:"
) {
	const allServerless = await listAllServerless(
		apiUrl,
		token,
		accountId,
		session
	);

	if (!allServerless || !Array.isArray(allServerless)) {
		throw new Error("Failed to fetch serverless: Invalid response format");
	}

	if (allServerless.length === 0) {
		console.log(chalk.yellow("No serverless functions found."));
		return null;
	}

	const choices = allServerless.map((serverless) => {
		const runtime = serverless.Config?.Runtime || "code";
		const typeIcon =
			runtime === "git" ? "📦" : runtime === "container" ? "🐳" : "📝";
		const status = serverless.Status;

		return {
			name: `${serverless.Config.Name} | ${typeIcon} ${runtime} | ${status}`,
			value: serverless,
		};
	});

	return await search({
		message,
		source: async (term) => {
			if (!term) return choices;
			return choices.filter((choice) =>
				choice.name.toLowerCase().includes(term.toLowerCase())
			);
		},
	});
}

/**
 * Handle the builds command - list builds for a serverless function
 */
async function handleBuilds(args = []) {
	try {
		// Parse name from args (supports --name, -n, or positional)
		let name = null;
		for (let i = 0; i < args.length; i++) {
			const arg = args[i];
			if ((arg === "--name" || arg === "-n") && args[i + 1]) {
				name = args[i + 1];
				break;
			} else if (!arg.startsWith("-") && !name) {
				name = arg;
			}
		}

		const { apiUrl, token, accountId, session } = await getCurrentEnv();

		let serverless;

		// If name not provided, show selector
		if (!name) {
			console.log(chalk.cyan("\n📋 Select a serverless function...\n"));
			serverless = await selectServerless(
				apiUrl,
				token,
				accountId,
				session,
				"Select serverless to view builds:"
			);

			if (!serverless) {
				return;
			}
		} else {
			// Fetch by name
			const result = await listAllServerless(
				apiUrl,
				token,
				accountId,
				session,
				name
			);

			if (!result || !Array.isArray(result) || !result[0]) {
				console.error(
					chalk.red(`\n❌ Serverless "${name}" not found.`)
				);
				return;
			}
			serverless = result[0];
		}

		// Check if serverless is container type - builds are not available
		const runtime = serverless.Config?.Runtime || "code";
		if (runtime === "container") {
			console.log(
				chalk.yellow(
					`\n⚠️  Builds are not available for container-type serverless functions.`
				)
			);
			console.log(
				chalk.dim(
					`   Container images are built externally and pulled directly.`
				)
			);
			console.log(
				chalk.dim(
					`\n   To view runtime logs, use: boltic serverless logs ${serverless.Config.Name}`
				)
			);
			return;
		}

		console.log(
			chalk.cyan(
				`\n🔨 Fetching builds for "${serverless.Config.Name}"...\n`
			)
		);

		const buildsData = await getServerlessBuilds(
			apiUrl,
			token,
			accountId,
			session,
			serverless.ID
		);

		if (!buildsData || !buildsData.data || buildsData.data.length === 0) {
			console.log(chalk.yellow("No builds found for this serverless."));
			return;
		}

		const builds = buildsData.data;

		console.log(chalk.green(`Found ${builds.length} build(s):\n`));
		console.log(chalk.cyan("━".repeat(100)));
		console.log(
			chalk.bold("  #  ") +
				chalk.bold("Status".padEnd(12)) +
				chalk.bold("Version".padEnd(10)) +
				chalk.bold("Created".padEnd(22)) +
				chalk.bold("Build ID")
		);
		console.log(chalk.cyan("━".repeat(100)));

		builds.forEach((build, index) => {
			const status =
				build.StatusHistory?.slice(-1)[0]?.Status ||
				build.Status ||
				"unknown";
			const statusColor = getStatusColor(status);
			const createdAt = build.CreatedAt
				? new Date(build.CreatedAt).toLocaleString()
				: "N/A";
			const version = build.Version || "N/A";

			console.log(
				chalk.dim(`  ${String(index + 1).padStart(2)} `) +
					statusColor(status.padEnd(12)) +
					`v${String(version).padEnd(9)}` +
					createdAt.padEnd(22) +
					build.ID
			);

			// Show status history for recent builds (first 3)
			if (
				index < 3 &&
				build.StatusHistory &&
				build.StatusHistory.length > 1
			) {
				const history = build.StatusHistory.map((h) => {
					const ts = h.Timestamp
						? new Date(h.Timestamp).toLocaleTimeString()
						: "";
					return `${h.Status}${ts ? ` (${ts})` : ""}`;
				}).join(" → ");
				console.log(chalk.dim(`      └─ ${history}`));
			}
		});

		console.log(chalk.cyan("━".repeat(100)));
		console.log(
			chalk.dim(
				"\nTip: Use 'boltic serverless build logs -n <name>' to view logs for a build."
			)
		);
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
 * Handle the logs command - show logs for a serverless function
 */
async function handleLogs(args = []) {
	try {
		// Parse args (supports --name, -n, or positional)
		let name = null;
		let follow = false;
		let lines = 100;

		for (let i = 0; i < args.length; i++) {
			const arg = args[i];
			const nextArg = args[i + 1];

			if ((arg === "--name" || arg === "-n") && nextArg) {
				name = nextArg;
				i++;
			} else if (arg === "--follow" || arg === "-f") {
				follow = true;
			} else if ((arg === "--lines" || arg === "-l") && nextArg) {
				lines = parseInt(nextArg, 10) || 100;
				i++;
			} else if (!arg.startsWith("-") && !name) {
				// Accept positional argument as name
				name = arg;
			}
		}

		const { apiUrl, token, accountId, session } = await getCurrentEnv();

		let serverless;

		// If name not provided, show selector
		if (!name) {
			console.log(chalk.cyan("\n📋 Select a serverless function...\n"));
			serverless = await selectServerless(
				apiUrl,
				token,
				accountId,
				session,
				"Select serverless to view logs:"
			);

			if (!serverless) {
				return;
			}
		} else {
			// Fetch by name
			const result = await listAllServerless(
				apiUrl,
				token,
				accountId,
				session,
				name
			);

			if (!result || !Array.isArray(result) || !result[0]) {
				console.error(
					chalk.red(`\n❌ Serverless "${name}" not found.`)
				);
				return;
			}
			serverless = result[0];
		}

		console.log(
			chalk.cyan(
				`\n📜 Fetching logs for "${serverless.Config.Name}"...\n`
			)
		);

		if (follow) {
			console.log(chalk.dim("Following logs... Press Ctrl+C to stop.\n"));
		}

		// Track seen log IDs to avoid duplicates in follow mode
		const seenLogIds = new Set();

		const fetchAndDisplayLogs = async (afterTimestamp = null) => {
			const now = Math.floor(Date.now() / 1000);
			const logsData = await getServerlessLogs(
				apiUrl,
				token,
				accountId,
				session,
				serverless.ID,
				{
					limit: lines,
					// For follow mode: fetch logs AFTER the last seen timestamp
					// For initial fetch: get last 24 hours
					timestampStart: afterTimestamp || now - 24 * 60 * 60,
					timestampEnd: now,
				}
			);

			if (!logsData || !logsData.data || logsData.data.length === 0) {
				if (!follow && !afterTimestamp) {
					console.log(
						chalk.yellow("No logs found for this serverless.")
					);
				}
				return afterTimestamp;
			}

			const logs = logsData.data;
			let latestTimestamp = afterTimestamp;

			// Sort logs by timestamp ascending for proper display order
			const sortedLogs = [...logs].sort(
				(a, b) => (a.Timestamp || 0) - (b.Timestamp || 0)
			);

			sortedLogs.forEach((log) => {
				// Create a unique ID for deduplication
				const logId = `${log.Timestamp}-${log.Log}`;
				if (seenLogIds.has(logId)) {
					return; // Skip duplicate
				}
				seenLogIds.add(logId);

				// Timestamp is unix epoch in seconds
				const timestamp = log.Timestamp
					? new Date(log.Timestamp * 1000).toLocaleTimeString()
					: "";
				const severity = log.Severity || "INFO";
				const severityColor =
					severity === "ERROR"
						? chalk.red
						: severity === "WARNING" || severity === "WARN"
							? chalk.yellow
							: severity === "DEBUG"
								? chalk.blue
								: chalk.gray;

				// Parse the Log field which may contain JSON
				let message = "";
				if (log.Log) {
					try {
						const parsed = JSON.parse(log.Log);
						message = parsed.msg || parsed.message || log.Log;
					} catch {
						// Not JSON, use as-is
						message = log.Log;
					}
				}

				console.log(
					chalk.dim(`[${timestamp}]`) +
						` ${severityColor(severity.padEnd(7))} ${message}`
				);

				if (
					log.Timestamp &&
					(!latestTimestamp || log.Timestamp > latestTimestamp)
				) {
					latestTimestamp = log.Timestamp;
				}
			});

			return latestTimestamp;
		};

		let lastTimestamp = await fetchAndDisplayLogs();

		if (follow) {
			// Poll for new logs every 2 seconds
			while (true) {
				await new Promise((resolve) => setTimeout(resolve, 2000));
				lastTimestamp = await fetchAndDisplayLogs(lastTimestamp);
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
		console.error(
			chalk.red("\n❌ An error occurred:"),
			error.message || "Unknown error"
		);
	}
}

/**
 * Handle the "build logs" command - show logs for a specific build
 */
async function handleBuildLogs(args = []) {
	try {
		// Parse args (supports --name, -n, --build, -b, --follow, -f)
		let name = null;
		let buildId = null;
		let follow = false;

		for (let i = 0; i < args.length; i++) {
			const arg = args[i];
			const nextArg = args[i + 1];

			if ((arg === "--name" || arg === "-n") && nextArg) {
				name = nextArg;
				i++;
			} else if ((arg === "--build" || arg === "-b") && nextArg) {
				buildId = nextArg;
				i++;
			} else if (arg === "--follow" || arg === "-f") {
				follow = true;
			} else if (!arg.startsWith("-") && !name) {
				// Accept positional argument as name
				name = arg;
			}
		}

		const { apiUrl, token, accountId, session } = await getCurrentEnv();

		let serverless;

		// If name not provided, show selector
		if (!name) {
			console.log(chalk.cyan("\n📋 Select a serverless function...\n"));
			serverless = await selectServerless(
				apiUrl,
				token,
				accountId,
				session,
				"Select serverless to view build logs:"
			);

			if (!serverless) {
				return;
			}
		} else {
			// Fetch by name
			const result = await listAllServerless(
				apiUrl,
				token,
				accountId,
				session,
				name
			);

			if (!result || !Array.isArray(result) || !result[0]) {
				console.error(
					chalk.red(`\n❌ Serverless "${name}" not found.`)
				);
				return;
			}
			serverless = result[0];
		}

		// Check if serverless is container type - build logs are not available
		const runtime = serverless.Config?.Runtime || "code";
		if (runtime === "container") {
			console.log(
				chalk.yellow(
					`\n⚠️  Build logs are not available for container-type serverless functions.`
				)
			);
			console.log(
				chalk.dim(
					`   Container images are built externally and pulled directly.`
				)
			);
			console.log(
				chalk.dim(
					`\n   To view runtime logs, use: boltic serverless logs ${serverless.Config.Name}`
				)
			);
			return;
		}

		// If build ID not provided, fetch builds and let user select
		if (!buildId) {
			console.log(
				chalk.cyan(
					`\n🔨 Fetching builds for "${serverless.Config.Name}"...\n`
				)
			);

			const buildsData = await getServerlessBuilds(
				apiUrl,
				token,
				accountId,
				session,
				serverless.ID
			);

			if (
				!buildsData ||
				!buildsData.data ||
				buildsData.data.length === 0
			) {
				console.log(
					chalk.yellow("No builds found for this serverless.")
				);
				return;
			}

			const builds = buildsData.data;

			const buildChoices = builds.map((build, index) => {
				const status =
					build.StatusHistory?.slice(-1)[0]?.Status ||
					build.Status ||
					"unknown";
				const statusColor = getStatusColor(status);
				const createdAt = build.CreatedAt
					? new Date(build.CreatedAt).toLocaleString()
					: "N/A";

				return {
					name: `#${index + 1} | ${statusColor(status)} | ${createdAt} | ${build.ID.substring(0, 8)}...`,
					value: build,
				};
			});

			const selectedBuild = await search({
				message: "Select a build to view logs:",
				source: async (term) => {
					if (!term) return buildChoices;
					return buildChoices.filter((choice) =>
						choice.name.toLowerCase().includes(term.toLowerCase())
					);
				},
			});

			if (!selectedBuild) {
				return;
			}

			buildId = selectedBuild.ID;
		}

		console.log(chalk.cyan(`\n📜 Fetching build logs...\n`));

		if (follow) {
			console.log(
				chalk.dim("Following build logs... Press Ctrl+C to stop.\n")
			);
		}

		console.log(chalk.cyan("━".repeat(80)));
		console.log(chalk.bold("Build Logs:\n"));

		// Track displayed lines to avoid duplicates in follow mode
		let displayedLines = 0;

		const fetchAndDisplayBuildLogs = async () => {
			const logsData = await getBuildLogs(
				apiUrl,
				token,
				accountId,
				session,
				serverless.ID,
				buildId
			);

			if (!logsData || !logsData.data) {
				if (!follow && displayedLines === 0) {
					console.log(chalk.yellow("No logs found for this build."));
				}
				return { hasLogs: false, buildComplete: false };
			}

			// Handle different log formats
			const logs = Array.isArray(logsData.data)
				? logsData.data
				: [logsData.data];

			// Only display new logs (skip already displayed ones)
			const newLogs = logs.slice(displayedLines);

			newLogs.forEach((log) => {
				if (typeof log === "string") {
					console.log(log);
				} else if (log.Log) {
					// Log field contains the actual log content (may include ANSI colors)
					// Output directly to preserve color codes
					process.stdout.write(log.Log);
					if (!log.Log.endsWith("\n")) {
						process.stdout.write("\n");
					}
				} else if (log.Message || log.message) {
					const timestamp = log.Timestamp
						? new Date(log.Timestamp * 1000).toLocaleTimeString()
						: "";
					console.log(
						chalk.dim(`[${timestamp}]`) +
							` ${log.Message || log.message}`
					);
				} else {
					console.log(JSON.stringify(log, null, 2));
				}
			});

			displayedLines = logs.length;

			// Check if build is complete by looking for completion indicators
			const lastLog = logs[logs.length - 1];
			const logContent =
				typeof lastLog === "string"
					? lastLog
					: lastLog?.Log || lastLog?.Message || "";
			const buildComplete =
				logContent.includes("Build completed") ||
				logContent.includes("Build failed") ||
				logContent.includes("successfully") ||
				logContent.includes("error:");

			return { hasLogs: true, buildComplete };
		};

		let result = await fetchAndDisplayBuildLogs();

		if (follow && !result.buildComplete) {
			// Poll for new logs every 2 seconds until build completes
			while (true) {
				await new Promise((resolve) => setTimeout(resolve, 2000));
				result = await fetchAndDisplayBuildLogs();
				if (result.buildComplete) {
					console.log(
						chalk.dim("\n\nBuild completed. Stopping log follow.")
					);
					break;
				}
			}
		}

		console.log("\n" + chalk.cyan("━".repeat(80)));
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
