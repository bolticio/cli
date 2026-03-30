import { jest } from "@jest/globals";

// Mock fs and os so file-store tests don't touch the real filesystem
const mockFs = {
	existsSync: jest.fn(),
	mkdirSync: jest.fn(),
	readFileSync: jest.fn(),
	writeFileSync: jest.fn(),
	unlinkSync: jest.fn(),
};
const mockOs = { homedir: jest.fn().mockReturnValue("/mock-home") };

jest.mock("fs", () => mockFs);
jest.mock("os", () => mockOs);

// Mock keytar
const mockKeytar = {
	setPassword: jest.fn(),
	getPassword: jest.fn(),
	deletePassword: jest.fn(),
	findCredentials: jest.fn(),
};
jest.mock("keytar", () => mockKeytar);

describe("Secure Storage", () => {
	let secureStorage;

	beforeAll(async () => {
		secureStorage = await import("../helper/secure-storage.js");
	});

	beforeEach(() => {
		jest.clearAllMocks();
		// Default: cred file does not exist / is empty
		mockFs.existsSync.mockReturnValue(false);
		mockFs.readFileSync.mockImplementation(() => {
			throw new Error("ENOENT");
		});
	});

	describe("storeSecret", () => {
		it("should store secret via keytar when available", async () => {
			mockKeytar.setPassword.mockResolvedValue(true);

			await secureStorage.storeSecret("test-key", "test-value");

			expect(mockKeytar.setPassword).toHaveBeenCalledWith(
				"boltic-cli",
				"test-key",
				"test-value"
			);
			expect(mockFs.writeFileSync).not.toHaveBeenCalled();
		});

		it("should fall back to file store when keytar fails", async () => {
			mockKeytar.setPassword.mockRejectedValue(new Error("keytar error"));
			mockFs.existsSync.mockReturnValue(true);

			await secureStorage.storeSecret("token", "my-token");

			expect(mockFs.writeFileSync).toHaveBeenCalledWith(
				expect.stringContaining("credentials.json"),
				expect.stringContaining("my-token"),
				expect.objectContaining({ mode: 0o600 })
			);
		});
	});

	describe("getSecret", () => {
		it("should retrieve secret from keytar", async () => {
			mockKeytar.getPassword.mockResolvedValue("test-value");

			const result = await secureStorage.getSecret("test-key");

			expect(result).toBe("test-value");
			expect(mockKeytar.getPassword).toHaveBeenCalledWith(
				"boltic-cli",
				"test-key"
			);
		});

		it("should return null for non-existent secret", async () => {
			mockKeytar.getPassword.mockResolvedValue(null);

			const result = await secureStorage.getSecret("non-existent");

			expect(result).toBeNull();
		});

		it("should fall back to file store when keytar fails", async () => {
			mockKeytar.getPassword.mockRejectedValue(new Error("keytar error"));
			mockFs.readFileSync.mockReturnValue(
				JSON.stringify({ token: "file-token" })
			);

			const result = await secureStorage.getSecret("token");

			expect(result).toBe("file-token");
		});

		it("should fall back to env vars when keytar and file store both miss", async () => {
			mockKeytar.getPassword.mockResolvedValue(null);
			const old = process.env.BOLTIC_TOKEN;
			process.env.BOLTIC_TOKEN = "env-token";

			const result = await secureStorage.getSecret("token");

			expect(result).toBe("env-token");
			if (old === undefined) delete process.env.BOLTIC_TOKEN;
			else process.env.BOLTIC_TOKEN = old;
		});
	});

	describe("deleteSecret", () => {
		it("should delete secret via keytar", async () => {
			mockKeytar.deletePassword.mockResolvedValue(true);

			await secureStorage.deleteSecret("test-key");

			expect(mockKeytar.deletePassword).toHaveBeenCalledWith(
				"boltic-cli",
				"test-key"
			);
		});

		it("should handle deletion errors", async () => {
			const mockConsoleError = jest
				.spyOn(console, "error")
				.mockImplementation(() => {});
			mockKeytar.deletePassword.mockRejectedValue(
				new Error("Deletion failed")
			);

			const result = await secureStorage.deleteSecret("test-key");

			expect(result).toBe(false);
			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Error deleting secret"),
				"Deletion failed"
			);
			mockConsoleError.mockRestore();
		});
	});

	describe("getAllSecrets", () => {
		it("should retrieve all secrets from keytar", async () => {
			const mockCredentials = [
				{ account: "token", password: "test-token" },
				{ account: "session", password: "test-session" },
			];
			mockKeytar.findCredentials.mockResolvedValue(mockCredentials);

			const result = await secureStorage.getAllSecrets();

			expect(result).toEqual(mockCredentials);
			expect(mockKeytar.findCredentials).toHaveBeenCalledWith(
				"boltic-cli"
			);
		});

		it("should fall back to file store when keytar returns empty", async () => {
			mockKeytar.findCredentials.mockResolvedValue([]);
			mockFs.readFileSync.mockReturnValue(
				JSON.stringify({ token: "file-token", account_id: "acc-123" })
			);

			const result = await secureStorage.getAllSecrets();

			expect(result).toEqual(
				expect.arrayContaining([
					{ account: "token", password: "file-token" },
					{ account: "account_id", password: "acc-123" },
				])
			);
		});

		it("should fall back to env vars when keytar and file store both miss", async () => {
			mockKeytar.findCredentials.mockResolvedValue([]);
			const old = process.env.BOLTIC_TOKEN;
			process.env.BOLTIC_TOKEN = "env-token";

			const result = await secureStorage.getAllSecrets();

			expect(result).toEqual(
				expect.arrayContaining([
					{ account: "token", password: "env-token" },
				])
			);
			if (old === undefined) delete process.env.BOLTIC_TOKEN;
			else process.env.BOLTIC_TOKEN = old;
		});

		it("should return null when nothing is found anywhere", async () => {
			mockKeytar.findCredentials.mockResolvedValue([]);

			const result = await secureStorage.getAllSecrets();

			expect(result).toBeNull();
		});

		it("should fall back to file store when keytar throws", async () => {
			mockKeytar.findCredentials.mockRejectedValue(
				new Error("Find failed")
			);

			const result = await secureStorage.getAllSecrets();

			expect(result).toBeNull();
		});
	});

	describe("deleteAllSecrets", () => {
		it("should delete all secrets via keytar", async () => {
			const mockCredentials = [
				{ account: "token", password: "test-token" },
				{ account: "session", password: "test-session" },
			];
			mockKeytar.findCredentials.mockResolvedValue(mockCredentials);
			mockKeytar.deletePassword.mockResolvedValue(true);

			await secureStorage.deleteAllSecrets();

			expect(mockKeytar.deletePassword).toHaveBeenCalledTimes(2);
			expect(mockKeytar.deletePassword).toHaveBeenCalledWith(
				"boltic-cli",
				"token"
			);
			expect(mockKeytar.deletePassword).toHaveBeenCalledWith(
				"boltic-cli",
				"session"
			);
		});

		it("should delete cred file when keytar is unavailable", async () => {
			mockKeytar.findCredentials.mockRejectedValue(
				new Error("keytar error")
			);
			mockFs.existsSync.mockReturnValue(true);

			await secureStorage.deleteAllSecrets();

			expect(mockFs.unlinkSync).toHaveBeenCalledWith(
				expect.stringContaining("credentials.json")
			);
		});

		it("should handle empty keytar credentials", async () => {
			mockKeytar.findCredentials.mockResolvedValue([]);
			mockFs.existsSync.mockReturnValue(false);

			await secureStorage.deleteAllSecrets();

			expect(mockKeytar.deletePassword).not.toHaveBeenCalled();
			expect(mockFs.unlinkSync).not.toHaveBeenCalled();
		});
	});
});
