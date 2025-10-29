import chalk from "chalk";
import fs from "fs";
import os from "os";
import path from "path";
import yaml from "js-yaml";
import { execFileSync } from "child_process";

// Types removed for CommonJS conversion

const commands = {
	setup: {
		description: "Setup command for various MCP Clients",
		action: handleSetup,
	},
	help: {
		description: "Show help for mcp commands",
		action: showHelp,
	},
};

// Execute the MCP command
const execute = async (args) => {
	const subCommand = args[0];

	if (!subCommand) {
		showHelp();
		return;
	}

	if (!commands[subCommand]) {
		console.log(chalk.red("Unknown or missing mcp sub-command.\n"));
		showHelp();
		return;
	}

	const commandObj = commands[subCommand];
	await commandObj.action(args.slice(1));
};

function showHelp() {
	console.log(chalk.cyan("\nMCP Commands:\n"));
	Object.entries(commands).forEach(([cmd, details]) => {
		console.log(chalk.bold(`${cmd}`) + ` - ${details.description}`);
	});
}

// Handle setup subcommand: setup <url> [name] --client <client>
async function handleSetup(args) {
	// Parse positional args
	const url = args[0];
	let name = args[1] && !args[1].startsWith("--") ? args[1] : undefined;

	// Parse flags: --client, --name
	let client = "claude";
	for (let i = 0; i < args.length; i++) {
		const token = args[i];
		if (
			token === "--client" &&
			args[i + 1] &&
			!args[i + 1].startsWith("--")
		) {
			client = args[i + 1];
			i++;
		} else if (token.startsWith("--client=")) {
			client = token.split("=")[1];
		} else if (
			token === "--name" &&
			args[i + 1] &&
			!args[i + 1].startsWith("--")
		) {
			name = args[i + 1];
			i++;
		} else if (token.startsWith("--name=")) {
			name = token.split("=")[1];
		}
	}

	if (!url) {
		console.log(
			chalk.red(
				"❌ URL is required. Usage: boltic mcp setup <url> [name] --client <client>"
			)
		);
		return;
	}

	const newKey =
		name || url.split("/").slice(3).join("/").replace(/\//g, "-");

	try {
		console.log(chalk.cyan("📝 Configuration Details:"));
		console.log(`   URL: ${chalk.green(url)}`);
		console.log(`   Client: ${chalk.green(client)}`);
		console.log(`   Name: ${chalk.green(newKey)}\n`);

		const mcpUrl = url;
		const command = `composio --sse "${mcpUrl}"`;

		saveMcpConfig(url, client, newKey, mcpUrl, command);

		console.log(
			chalk.cyan(
				`\n🚀 All done! Please restart ${client} for changes to take effect\n`
			)
		);
	} catch (error) {
		console.log(chalk.red("\n❌ Error occurred while setting up MCP:"));
		console.log(
			chalk.red(
				`   ${error && error.message ? error.message : String(error)}`
			)
		);
		console.log(
			chalk.yellow(
				"\nPlease try again or contact support if the issue persists.\n"
			)
		);
	}
}

function saveMcpConfig(url, clientType, name, mcpUrl, command) {
	const config = {
		command: "npx",
		args: ["-y", "mcp-remote", mcpUrl],
		env: {
			npm_config_yes: "true",
		},
	};

	const sseConfig = {
		url: mcpUrl,
	};

	const homeDir = os.homedir();

	const platformPaths = {
		win32: {
			baseDir:
				process.env.APPDATA || path.join(homeDir, "AppData", "Roaming"),
			vscodePath: path.join("Code", "User", "globalStorage"),
		},
		darwin: {
			baseDir: path.join(homeDir, "Library", "Application Support"),
			vscodePath: path.join("Code", "User", "globalStorage"),
		},
		linux: {
			baseDir:
				process.env.XDG_CONFIG_HOME || path.join(homeDir, ".config"),
			vscodePath: path.join("Code/User/globalStorage"),
		},
	};

	const platform = process.platform;

	// Check if platform is supported
	if (!platformPaths[platform]) {
		console.log(chalk.red(`\n❌ Platform ${platform} is not supported.`));
		process.exit(1);
	}

	const { baseDir } = platformPaths[platform];

	const defaultClaudePath = path.join(
		baseDir,
		"Claude",
		"claude_desktop_config.json"
	);

	// Define client paths using the platform-specific base directories
	const clientPaths = {
		claude: {
			type: "file",
			path: defaultClaudePath,
		},
		cline: {
			type: "file",
			path: path.join(
				baseDir,
				platformPaths[platform].vscodePath,
				"saoudrizwan.claude-dev",
				"settings",
				"cline_mcp_settings.json"
			),
		},
		roocode: {
			type: "file",
			path: path.join(
				baseDir,
				platformPaths[platform].vscodePath,
				"rooveterinaryinc.roo-cline",
				"settings",
				"mcp_settings.json"
			),
		},
		windsurf: {
			type: "file",
			path: path.join(homeDir, ".codeium", "windsurf", "mcp_config.json"),
		},
		witsy: {
			type: "file",
			path: path.join(baseDir, "Witsy", "settings.json"),
		},
		enconvo: {
			type: "file",
			path: path.join(homeDir, ".config", "enconvo", "mcp_config.json"),
		},
		cursor: {
			type: "file",
			path: path.join(homeDir, ".cursor", "mcp.json"),
		},
		vscode: {
			type: "command",
			command: process.platform === "win32" ? "code.cmd" : "code",
		},
		"vscode-insiders": {
			type: "command",
			command:
				process.platform === "win32"
					? "code-insiders.cmd"
					: "code-insiders",
		},
		boltai: {
			type: "file",
			path: path.join(homeDir, ".boltai", "mcp.json"),
		},
		"amazon-bedrock": {
			type: "file",
			path: path.join(
				homeDir,
				"Amazon Bedrock Client",
				"mcp_config.json"
			),
		},
		amazonq: {
			type: "file",
			path: path.join(homeDir, ".aws", "amazonq", "mcp.json"),
		},
		librechat: {
			type: "yaml",
			path: path.join(homeDir, "LibreChat", "librechat.yaml"),
		},
		"gemini-cli": {
			type: "file",
			path: path.join(homeDir, ".gemini", "settings.json"),
		},
	};
	if (!clientPaths[clientType]) {
		console.log(chalk.red(`\n❌ Client ${clientType} is not supported.`));
		process.exit(1);
	}

	const clientConfig = clientPaths[clientType];
	const newKey =
		name || url.split("/").slice(3).join("/").replace(/\//g, "-");

	if (clientConfig.type === "command") {
		handleCommandClient(clientConfig, newKey, config);
	} else if (clientConfig.type === "yaml") {
		handleYamlClient(clientConfig, newKey, config);
	} else {
		handleFileClient(clientConfig, newKey, config, mcpUrl);
	}
}

function handleCommandClient(clientConfig, serverName, config) {
	if (!clientConfig.command) {
		throw new Error("Command not specified for command-type client");
	}

	const args = [];
	args.push("--add-mcp", JSON.stringify({ ...config, name: serverName }));

	try {
		const output = execFileSync(clientConfig.command, args);
		console.log(
			chalk.green(
				`✅ Configuration added via ${clientConfig.command}: ${output.toString()}`
			)
		);
	} catch (error) {
		if (error && error.code === "ENOENT") {
			throw new Error(
				`Command '${clientConfig.command}' not found. Make sure ${clientConfig.command} is installed and on your PATH`
			);
		}
		throw error;
	}
}

function handleYamlClient(clientConfig, serverName, config) {
	if (!clientConfig.path) {
		throw new Error("Path not specified for YAML client");
	}

	const configDir = path.dirname(clientConfig.path);
	if (!fs.existsSync(configDir)) {
		fs.mkdirSync(configDir, { recursive: true });
	}

	let existingYaml = {};

	try {
		if (fs.existsSync(clientConfig.path)) {
			const originalContent = fs.readFileSync(clientConfig.path, "utf8");
			existingYaml = yaml.load(originalContent) || {};
		}
	} catch (error) {
		console.log(chalk.yellow("⚠️  Creating new YAML config file"));
	}

	// Initialize mcpServers if it doesn't exist
	if (!existingYaml.mcpServers) {
		existingYaml.mcpServers = {};
	}

	// Add the new server
	existingYaml.mcpServers[serverName] = config;

	// Write the updated YAML
	const yamlContent = yaml.dump(existingYaml, {
		indent: 2,
		lineWidth: -1,
		noRefs: true,
	});

	fs.writeFileSync(clientConfig.path, yamlContent);
	console.log(chalk.green(`✅ Configuration saved to: ${clientConfig.path}`));
}

function handleFileClient(clientConfig, serverName, config, mcpUrl) {
	if (!clientConfig.path) {
		throw new Error("Path not specified for file client");
	}

	const configDir = path.dirname(clientConfig.path);
	if (!fs.existsSync(configDir)) {
		fs.mkdirSync(configDir, { recursive: true });
	}

	let existingConfig = { mcpServers: {} };

	try {
		if (fs.existsSync(clientConfig.path)) {
			existingConfig = JSON.parse(
				fs.readFileSync(clientConfig.path, "utf8")
			);
		}
	} catch (error) {
		console.log(chalk.yellow("⚠️  Creating new config file"));
	}

	// Ensure mcpServers exists
	if (!existingConfig.mcpServers) existingConfig.mcpServers = {};

	// Special handling for Cursor which uses SSE configuration
	if (clientConfig.path?.includes(".cursor")) {
		const sseConfig = {
			url: mcpUrl,
		};
		existingConfig.mcpServers[serverName] = sseConfig;
	} else {
		existingConfig.mcpServers[serverName] = config;
	}

	fs.writeFileSync(
		clientConfig.path,
		JSON.stringify(existingConfig, null, 2)
	);
	console.log(chalk.green(`✅ Configuration saved to: ${clientConfig.path}`));
}

export default { execute };
