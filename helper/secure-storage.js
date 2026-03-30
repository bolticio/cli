import keytar from "keytar";

const SERVICE_NAME = "boltic-cli";

// Mapping from credential keys to environment variable names.
// In CI/headless environments where keytar (OS keychain) is unavailable,
// these env vars are used as a fallback so commands like `boltic serverless publish`
// work without an interactive keychain daemon.
const ENV_VAR_MAP = {
	token: "BOLTIC_TOKEN",
	account_id: "BOLTIC_ACCOUNT_ID",
	session: "BOLTIC_SESSION",
	environment: "BOLTIC_ENVIRONMENT",
};

/**
 * Store a secret value securely using keytar.
 * In CI/headless environments where keytar is unavailable, logs a warning
 * instead of throwing so that env-var-based auth can still be used.
 * @param {string} key - The key under which to store the secret
 * @param {string} value - The secret value to store
 * @returns {Promise<void>}
 */
export const storeSecret = async (key, value) => {
	try {
		await keytar.setPassword(SERVICE_NAME, key, value);
	} catch (error) {
		// In headless/CI environments the OS keychain daemon is not available.
		// Warn instead of throwing so callers can still rely on env var fallback.
		console.warn(
			`Warning: Could not store '${key}' in system keychain: ${error.message}`
		);
		console.warn(
			`In CI environments, set credentials via environment variables (e.g. BOLTIC_TOKEN, BOLTIC_ACCOUNT_ID).`
		);
	}
};

/**
 * Retrieve a secret value. Tries keytar first; falls back to env vars
 * (BOLTIC_TOKEN, BOLTIC_PAT, BOLTIC_ACCOUNT_ID, etc.) when keytar is unavailable.
 * @param {string} key - The key of the secret to retrieve
 * @returns {Promise<string|null>} The secret value or null if not found
 */
export const getSecret = async (key) => {
	try {
		const val = await keytar.getPassword(SERVICE_NAME, key);
		if (val !== null) return val;
	} catch {
		// keytar unavailable (CI/headless) — fall through to env var
	}
	return process.env[ENV_VAR_MAP[key]] || null;
};

/**
 * Delete a secret value using keytar
 * @param {string} key - The key of the secret to delete
 * @returns {Promise<boolean>} True if deletion was successful
 */
export const deleteSecret = async (key) => {
	try {
		return await keytar.deletePassword(SERVICE_NAME, key);
	} catch (error) {
		console.error(`Error deleting secret for ${key}:`, error.message);
		return false;
	}
};

/**
 * Retrieve all secrets. Tries keytar first; falls back to env vars when
 * keytar is unavailable (e.g. GitHub Actions, Docker containers).
 * @returns {Promise<Array<{account: string, password: string}>|null>}
 */
export const getAllSecrets = async () => {
	try {
		const keytarSecrets = await keytar.findCredentials(SERVICE_NAME);
		if (keytarSecrets && keytarSecrets.length > 0) return keytarSecrets;
	} catch {
		// keytar unavailable (CI/headless) — fall through to env vars
	}

	// Build credential list from env vars
	const secrets = [];
	for (const [key, envVar] of Object.entries(ENV_VAR_MAP)) {
		if (process.env[envVar]) {
			secrets.push({ account: key, password: process.env[envVar] });
		}
	}
	return secrets.length > 0 ? secrets : null;
};

export const deleteAllSecrets = async () => {
	try {
		const secrets = await getAllSecrets();
		if (secrets && secrets.length > 0) {
			const deletionPromises = secrets.map(
				async ({ account }) => await deleteSecret(account)
			);
			await Promise.all(deletionPromises);
		}
	} catch (error) {
		console.error(`Error deleting all secrets:`, error.message);
	}
};
