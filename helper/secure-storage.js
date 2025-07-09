import keytar from "keytar";

const SERVICE_NAME = "boltic-cli";

/**
 * Store a secret value securely using keytar
 * @param {string} key - The key under which to store the secret
 * @param {string} value - The secret value to store
 * @returns {Promise<void>}
 */
export const storeSecret = async (key, value) => {
	try {
		await keytar.setPassword(SERVICE_NAME, key, value);
	} catch (error) {
		console.error(`Error storing secret for ${key}:`, error.message);
		throw error;
	}
};

/**
 * Retrieve a secret value using keytar
 * @param {string} key - The key of the secret to retrieve
 * @returns {Promise<string|null>} The secret value or null if not found
 */
export const getSecret = async (key) => {
	try {
		return await keytar.getPassword(SERVICE_NAME, key);
	} catch (error) {
		console.error(`Error retrieving secret for ${key}:`, error.message);
		return null;
	}
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
 * Retrieve all secrets stored using keytar
 * @returns {Promise<Array<{account: string, password: string}>|null>} An array of secret objects or null if an error occurs
 */

export const getAllSecrets = async () => {
	try {
		return await keytar.findCredentials(SERVICE_NAME);
	} catch (error) {
		console.error(`Error retrieving all secrets:`, error.message);
		return null;
	}
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
