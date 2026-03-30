import fs from "fs";
import os from "os";
import path from "path";

const SERVICE_NAME = "boltic-cli";

// Mapping from credential keys to environment variable names.
// Checked last (lowest priority) so explicit login always wins.
const ENV_VAR_MAP = {
	token: "BOLTIC_TOKEN",
	account_id: "BOLTIC_ACCOUNT_ID",
	session: "BOLTIC_SESSION",
	environment: "BOLTIC_ENVIRONMENT",
};

// File-based credential store used when keytar (OS keychain) is unavailable.
// Credentials are stored as plain JSON, readable only by the current user.
const CRED_FILE = path.join(os.homedir(), ".boltic", "credentials.json");

const readCredFile = () => {
	try {
		return JSON.parse(fs.readFileSync(CRED_FILE, "utf-8"));
	} catch {
		return {};
	}
};

const writeCredFile = (data) => {
	const dir = path.dirname(CRED_FILE);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
	}
	fs.writeFileSync(CRED_FILE, JSON.stringify(data, null, 2), {
		mode: 0o600,
	});
};

// Lazy-load keytar via dynamic import so that a missing native dependency
// (e.g. libsecret on Linux CI runners) is caught at call time rather than
// crashing the process at startup with ERR_DLOPEN_FAILED.
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
 * Store a secret value.
 * Priority: keytar (OS keychain) → file store (~/.boltic/credentials.json)
 */
export const storeSecret = async (key, value) => {
	const keytar = await getKeytar();
	if (keytar) {
		try {
			await keytar.setPassword(SERVICE_NAME, key, value);
			return;
		} catch {
			// fall through to file store
		}
	}
	// File-based fallback (CI / headless environments)
	const data = readCredFile();
	data[key] = value;
	writeCredFile(data);
};

/**
 * Retrieve a secret value.
 * Priority: keytar → file store → environment variables
 */
export const getSecret = async (key) => {
	const keytar = await getKeytar();
	if (keytar) {
		try {
			const val = await keytar.getPassword(SERVICE_NAME, key);
			if (val !== null) return val;
		} catch {
			// fall through
		}
	}
	// File store fallback
	const val = readCredFile()[key];
	if (val != null) return val;
	// Env var fallback
	return process.env[ENV_VAR_MAP[key]] || null;
};

/**
 * Delete a secret value.
 * Priority: keytar → file store
 */
export const deleteSecret = async (key) => {
	const keytar = await getKeytar();
	if (keytar) {
		try {
			return await keytar.deletePassword(SERVICE_NAME, key);
		} catch (error) {
			console.error(`Error deleting secret for ${key}:`, error.message);
			return false;
		}
	}
	// File store fallback
	const data = readCredFile();
	if (key in data) {
		delete data[key];
		writeCredFile(data);
	}
	return true;
};

/**
 * Retrieve all secrets.
 * Priority: keytar → file store → environment variables
 */
export const getAllSecrets = async () => {
	const keytar = await getKeytar();
	if (keytar) {
		try {
			const keytarSecrets = await keytar.findCredentials(SERVICE_NAME);
			if (keytarSecrets && keytarSecrets.length > 0) return keytarSecrets;
		} catch {
			// fall through
		}
	}
	// File store fallback
	const fileData = readCredFile();
	if (Object.keys(fileData).length > 0) {
		return Object.entries(fileData).map(([account, password]) => ({
			account,
			password,
		}));
	}
	// Env var fallback
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
		const keytar = await getKeytar();
		if (keytar) {
			try {
				const secrets = await keytar.findCredentials(SERVICE_NAME);
				if (secrets && secrets.length > 0) {
					await Promise.all(
						secrets.map(({ account }) =>
							keytar.deletePassword(SERVICE_NAME, account)
						)
					);
					return;
				}
			} catch {
				// fall through to file store
			}
		}
		// File store fallback
		if (fs.existsSync(CRED_FILE)) {
			fs.unlinkSync(CRED_FILE);
		}
	} catch (error) {
		console.error(`Error deleting all secrets:`, error.message);
	}
};
