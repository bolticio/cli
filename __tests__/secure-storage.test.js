import { jest } from "@jest/globals";

// Mock keytar before importing the module
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
	});

	describe("storeSecret", () => {
		it("should store secret successfully", async () => {
			mockKeytar.setPassword.mockResolvedValue(true);

			await secureStorage.storeSecret("test-key", "test-value");

			expect(mockKeytar.setPassword).toHaveBeenCalledWith(
				"boltic-cli",
				"test-key",
				"test-value"
			);
		});

		it("should handle storage errors", async () => {
			const mockConsoleError = jest
				.spyOn(console, "error")
				.mockImplementation(() => {});
			mockKeytar.setPassword.mockRejectedValue(
				new Error("Storage failed")
			);

			await expect(
				secureStorage.storeSecret("test-key", "test-value")
			).rejects.toThrow("Storage failed");
			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Error storing secret for test-key:"),
				"Storage failed"
			);
			mockConsoleError.mockRestore();
		});
	});

	describe("getSecret", () => {
		it("should retrieve secret successfully", async () => {
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

		it("should handle retrieval errors", async () => {
			const mockConsoleError = jest
				.spyOn(console, "error")
				.mockImplementation(() => {});
			mockKeytar.getPassword.mockRejectedValue(
				new Error("Retrieval failed")
			);

			const result = await secureStorage.getSecret("test-key");

			expect(result).toBeNull();
			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Error retrieving secret"),
				"Retrieval failed"
			);

			mockConsoleError.mockRestore();
		});
	});

	describe("deleteSecret", () => {
		it("should delete secret successfully", async () => {
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
		it("should retrieve all secrets successfully", async () => {
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

		it("should return empty array when no secrets found", async () => {
			mockKeytar.findCredentials.mockResolvedValue([]);

			const result = await secureStorage.getAllSecrets();

			expect(result).toEqual([]);
		});

		it("should handle retrieval errors", async () => {
			const mockConsoleError = jest
				.spyOn(console, "error")
				.mockImplementation(() => {});
			mockKeytar.findCredentials.mockRejectedValue(
				new Error("Find failed")
			);

			const result = await secureStorage.getAllSecrets();

			expect(result).toBeNull();
			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Error retrieving all secrets"),
				"Find failed"
			);

			mockConsoleError.mockRestore();
		});
	});

	describe("deleteAllSecrets", () => {
		it("should delete all secrets successfully", async () => {
			const mockCredentials = [
				{ account: "token", password: "test-token" },
				{ account: "session", password: "test-session" },
			];
			mockKeytar.findCredentials.mockResolvedValue(mockCredentials);
			mockKeytar.deletePassword.mockResolvedValue(true);

			await secureStorage.deleteAllSecrets();

			expect(mockKeytar.findCredentials).toHaveBeenCalledWith(
				"boltic-cli"
			);
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

		it("should handle deletion errors gracefully", async () => {
			const mockConsoleError = jest
				.spyOn(console, "error")
				.mockImplementation(() => {});
			const mockCredentials = [
				{ account: "token", password: "test-token" },
			];
			mockKeytar.findCredentials.mockResolvedValue(mockCredentials);
			mockKeytar.deletePassword.mockRejectedValue(
				new Error("Delete failed")
			);

			await secureStorage.deleteAllSecrets();

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Error deleting secret"),
				"Delete failed"
			);

			mockConsoleError.mockRestore();
		});

		it("should handle empty credentials list", async () => {
			mockKeytar.findCredentials.mockResolvedValue([]);

			await secureStorage.deleteAllSecrets();

			expect(mockKeytar.findCredentials).toHaveBeenCalledWith(
				"boltic-cli"
			);
			expect(mockKeytar.deletePassword).not.toHaveBeenCalled();
		});
	});
});
