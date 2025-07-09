import { environments } from "../config/environments.js";
import { getAllSecrets } from "./secure-storage.js";

/**
 * Get current environment and tokens from config
 * @returns {Object} Environment configuration including apiUrl, token, session, and accountId
 */
export const getCurrentEnv = async () => {
	let secrets;
	let config;

	try {
		secrets = await getAllSecrets();
	} catch {
		// If getAllSecrets fails, use default bolt environment
		secrets = null;
	}

	if (secrets && secrets.length > 0) {
		config = secrets.reduce((acc, { account, password }) => {
			acc[account] = password;
			return acc;
		}, {});
		const environment = config.environment || "bolt";
		return {
			name: environments[environment].name,
			apiUrl: environments[environment].apiUrl,
			loginUrl: environments[environment].loginUrl,
			consoleUrl: environments[environment].consoleUrl,
			clientId: environments[environment].clientId,
			token: config.token || null,
			session: config.session || null,
			accountId: config.account_id || null,
			frontendUrl: environments[environment].frontendUrl,
		};
	}
	return {
		name: environments.bolt.name,
		apiUrl: environments.bolt.apiUrl,
		loginUrl: environments.bolt.loginUrl,
		consoleUrl: environments.bolt.consoleUrl,
		clientId: environments.bolt.clientId,
		token: config?.token || null,
		session: config?.session || null,
		accountId: config?.account_id || null,
		frontendUrl: environments.bolt.frontendUrl,
	};
};
