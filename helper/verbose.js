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
