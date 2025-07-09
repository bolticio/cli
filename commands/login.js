import chalk from "chalk";
import open from "open";
import { v4 as uuidv4 } from "uuid";
import { getCliBearerToken, getCliSession } from "../api/login.js";
import { getCurrentEnv } from "../helper/env.js";
import { deleteAllSecrets, storeSecret } from "../helper/secure-storage.js";

// Define login commands and their actions
const commands = {
	login: {
		description: "Login to the platform and save access token",
		action: handleLogin,
	},
	logout: {
		description: "Logout and clear access token",
		action: handleLogout,
	},
	help: { description: "Show help for login commands", action: showHelp },
};

// Execute a command
const execute = async (args) => {
	const subCommand = args[0];

	if (!subCommand || !commands[subCommand]) {
		console.log(chalk.red("❌ Unknown or missing login sub-command.\n"));
		showHelp();
		return;
	}

	await commands[subCommand].action(args.slice(1));
};

// Show available login commands
function showHelp() {
	console.log(chalk.cyan("\nLogin Commands:\n"));
	Object.entries(commands).forEach(([cmd, details]) =>
		console.log(chalk.bold(`${cmd}`) + ` - ${details.description}`)
	);
}

// Handle login command
async function handleLogin() {
	const { apiUrl, loginUrl, clientId, frontendUrl, name } =
		await getCurrentEnv();

	const requestCode = uuidv4();
	const state = {
		source: "boltic_cli",
		request_code: requestCode,
	};

	const loginPage = new URL(`${loginUrl}/auth/sign-in`);
	loginPage.searchParams.append("client_id", clientId);
	loginPage.searchParams.append("redirect_uri", frontendUrl);
	loginPage.searchParams.append("state", JSON.stringify(state));

	console.log(chalk.cyan("\n🌐 Opening browser for login..."));
	console.log(chalk.cyan("\n" + loginPage.toString() + "\n"));
	try {
		await open(loginPage.toString());
		console.log(chalk.cyan("✅ Browser launched successfully"));
	} catch (error) {
		console.error(
			chalk.red(
				`\n❌ Failed to open browser automatically: ${error.message}`
			)
		);
		console.log(
			chalk.yellow("\n📋 Please copy and paste this URL in your browser:")
		);
		console.log(chalk.cyan("\n" + loginPage.toString() + "\n"));
	}

	const startTime = Date.now();
	const timeout = 300000; // 5 minutes in milliseconds
	const pollInterval = 5000; // 5 seconds

	let lastProgressUpdate = 0;
	console.log(chalk.cyan("\n⏳ Waiting for authentication..."));

	while (Date.now() - startTime < timeout) {
		try {
			const sessionResponse = await getCliSession(apiUrl, requestCode);

			if (!sessionResponse?.data?.data) {
				const now = Date.now();
				if (now - lastProgressUpdate >= pollInterval) {
					process.stdout.write(chalk.yellow("."));
					lastProgressUpdate = now;
				}
				continue;
			}

			const { account_id: accountId, session } =
				sessionResponse.data.data;

			if (!accountId || !session) {
				console.log(
					chalk.yellow(
						"\n⚠️ Invalid session data received, retrying..."
					)
				);
				continue;
			}

			try {
				await storeSecret(
					"session",
					`${name}.session=${encodeURIComponent(session)}`
				);
				await storeSecret("account_id", accountId);

				const token = await getCliBearerToken(
					name,
					apiUrl,
					accountId,
					session
				);

				if (!token?.data?.data?.token) {
					throw new Error("Invalid token response");
				}

				await storeSecret("token", token.data.data.token);
				console.log(chalk.green("\n✅ Login successful!"));
				return;
			} catch (storageError) {
				console.error(
					chalk.red(
						`\n❌ Failed to store authentication data: ${storageError.message}`
					)
				);
				return;
			}
		} catch (error) {
			if (error?.response?.status === 401) {
				console.error(
					chalk.red("\n\n❌ Authentication failed. Please try again.")
				);
				return;
			} else if (error?.code === "ECONNREFUSED") {
				console.error(
					chalk.red("\n\n❌ Cannot connect to authentication server.")
				);
				return;
			} else if (error?.response?.status !== 404) {
				const now = Date.now();
				if (now - lastProgressUpdate >= pollInterval) {
					process.stdout.write(chalk.yellow("x"));
					lastProgressUpdate = now;
				}
			}
		}

		await new Promise((resolve) => setTimeout(resolve, pollInterval));
	}

	console.error(
		chalk.red("\n❌ Login timeout after 5 minutes. Please try again.")
	);
}

// Handle logout command
async function handleLogout() {
	await deleteAllSecrets();
	console.log(
		chalk.bgGreen.black("\n ✅ Success! ") +
			chalk.green(" Logout successful! All user data cleared.\n")
	);
}

export default { execute, handleLogin, handleLogout };
