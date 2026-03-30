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

// Lazy-load keytar via dynamic import so that a missing native dependency
// (e.g. libsecret on Linux CI runners) is caught at call time rather than
// crashing the process at startup with ERR_DLOPEN_FAILED.
// The result is cached after the first attempt.
let _keytar;
let _keytarAttempted = false;

const getKeytar = async () => {
	if (_keytarAttempted) return _keytar;
	_keytarAttempted = true;
	try {
		_keytar = (await import("keytar")).default;
	} catch {
		// Native library not available (e.g. libsecret missing on CI runners).
		_keytar = null;
	}
	return _keytar;
};

/**
 * Store a secret value securely using keytar.
 * In CI/headless environments where keytar is unavailable, logs a warning
 * instead of throwing so that env-var-based auth can still be used.
 */
export const storeSecret = async (key, value) => {
	const keytar = await getKeytar();
	if (!keytar) {
		console.warn(
			`Warning: System keychain is unavailable. Could not store '${key}'.`
		);
		console.warn(
			`In CI environments, set credentials via environment variables (e.g. BOLTIC_TOKEN, BOLTIC_ACCOUNT_ID).`
		);
		return;
	}
	try {
		await keytar.setPassword(SERVICE_NAME, key, value);
	} catch (error) {
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
 * (BOLTIC_TOKEN, BOLTIC_ACCOUNT_ID, etc.) when keytar is unavailable.
 */
export const getSecret = async (key) => {
	const keytar = await getKeytar();
	if (keytar) {
		try {
			const val = await keytar.getPassword(SERVICE_NAME, key);
			if (val !== null) return val;
		} catch {
			// keytar failed — fall through to env var
		}
	}
	return process.env[ENV_VAR_MAP[key]] || null;
};

/**
 * Delete a secret value using keytar.
 */
export const deleteSecret = async (key) => {
	const keytar = await getKeytar();
	if (!keytar) return false;
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
 */
export const getAllSecrets = async () => {
	const keytar = await getKeytar();
	if (keytar) {
		try {
			const keytarSecrets = await keytar.findCredentials(SERVICE_NAME);
			if (keytarSecrets && keytarSecrets.length > 0) return keytarSecrets;
		} catch {
			// keytar failed — fall through to env vars
		}
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
