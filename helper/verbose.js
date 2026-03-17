import chalk from "chalk";

let isVerbose = false;

export const setVerboseMode = (verbose) => {
	isVerbose = verbose;
};

export const getVerboseMode = () => {
	return isVerbose;
};

export const logApi = (method, url, status) => {
	if (!isVerbose) return;
	console.log(
		chalk(
			`https fetch ${chalk.cyan(method.toUpperCase())} ${chalk.green(status)} ${chalk.yellow(url)}`
		)
	);
};

export const logApiRequest = (method, url, payload = null) => {
	if (!isVerbose) return;
	console.log(
		chalk.dim(
			"\n┌─────────────────────────────────────────────────────────────"
		)
	);
	console.log(chalk.dim("│ ") + chalk.cyan("REQUEST"));
	console.log(
		chalk.dim(
			"├─────────────────────────────────────────────────────────────"
		)
	);
	console.log(
		chalk.dim("│ ") +
			chalk.yellow("Method: ") +
			chalk.white(method.toUpperCase())
	);
	console.log(chalk.dim("│ ") + chalk.yellow("URL: ") + chalk.white(url));
	if (payload) {
		console.log(chalk.dim("│ ") + chalk.yellow("Payload:"));
		const payloadStr = JSON.stringify(payload, null, 2);
		payloadStr.split("\n").forEach((line) => {
			console.log(chalk.dim("│   ") + chalk.gray(line));
		});
	}
};

export const logApiResponse = (status, data) => {
	if (!isVerbose) return;
	console.log(
		chalk.dim(
			"├─────────────────────────────────────────────────────────────"
		)
	);
	console.log(chalk.dim("│ ") + chalk.cyan("RESPONSE"));
	console.log(
		chalk.dim(
			"├─────────────────────────────────────────────────────────────"
		)
	);
	console.log(
		chalk.dim("│ ") +
			chalk.yellow("Status: ") +
			(status >= 200 && status < 300
				? chalk.green(status)
				: chalk.red(status))
	);
	if (data) {
		console.log(chalk.dim("│ ") + chalk.yellow("Data:"));
		const dataStr = JSON.stringify(data, null, 2);
		dataStr.split("\n").forEach((line) => {
			console.log(chalk.dim("│   ") + chalk.gray(line));
		});
	}
	console.log(
		chalk.dim(
			"└─────────────────────────────────────────────────────────────\n"
		)
	);
};
