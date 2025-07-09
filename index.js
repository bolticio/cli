#!/usr/bin/env node

import createCLI from "./cli.js";
import { environments } from "./config/environments.js";

// Get environment-specific URLs
const env = environments.bolt;
const FYND_CONSOLE_URL = env.consoleUrl;
const BOLTIC_API_URL = env.apiUrl;

(async () => {
	const cli = createCLI(FYND_CONSOLE_URL, BOLTIC_API_URL, env);
	await cli.execute(process.argv);
})();
