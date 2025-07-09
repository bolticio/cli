import { jest } from "@jest/globals";

// Mock all dependencies before importing the module
const mockOpen = jest.fn();
const mockUuidv4 = jest.fn();
const mockGetCurrentEnv = jest.fn();
const mockDeleteAllSecrets = jest.fn();
const mockStoreSecret = jest.fn();
const mockGetCliBearerToken = jest.fn();
const mockGetCliSession = jest.fn();

jest.mock("chalk", () => ({
	red: jest.fn((str) => str),
	cyan: jest.fn((str) => str),
	yellow: jest.fn((str) => str),
	green: jest.fn((str) => str),
	bold: jest.fn((str) => str),
	bgGreen: {
		black: jest.fn((str) => str),
	},
}));

jest.mock("open", () => mockOpen);
jest.mock("uuid", () => ({ v4: mockUuidv4 }));

jest.mock("../api/login.js", () => ({
	getCliBearerToken: mockGetCliBearerToken,
	getCliSession: mockGetCliSession,
}));

jest.mock("../helper/env.js", () => ({
	getCurrentEnv: mockGetCurrentEnv,
}));

jest.mock("../helper/secure-storage.js", () => ({
	deleteAllSecrets: mockDeleteAllSecrets,
	storeSecret: mockStoreSecret,
}));

// Variable to hold the imported module
let LoginCommands;

describe("Login Commands", () => {
	let consoleSpy;
	let consoleErrorSpy;
	let processStdoutSpy;

	beforeAll(async () => {
		// Import the module after mocking
		LoginCommands = await import("../commands/login.js");
	});

	beforeEach(() => {
		jest.clearAllMocks();
		consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
		consoleErrorSpy = jest
			.spyOn(console, "error")
			.mockImplementation(() => {});
		processStdoutSpy = jest
			.spyOn(process.stdout, "write")
			.mockImplementation(() => {});

		// Setup default mocks
		mockUuidv4.mockReturnValue("test-uuid-1234");
		mockGetCurrentEnv.mockResolvedValue({
			apiUrl: "https://api.test.com",
			loginUrl: "https://login.test.com",
			clientId: "test-client-id",
			frontendUrl: "https://frontend.test.com",
			name: "test-app",
		});
	});

	afterEach(() => {
		consoleSpy.mockRestore();
		consoleErrorSpy.mockRestore();
		processStdoutSpy.mockRestore();
	});

	describe("execute", () => {
		it("should show help when no subcommand is provided", async () => {
			await LoginCommands.default.execute([]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					"❌ Unknown or missing login sub-command."
				)
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("Login Commands:")
			);
		});

		it("should show help when invalid subcommand is provided", async () => {
			await LoginCommands.default.execute(["invalid"]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					"❌ Unknown or missing login sub-command."
				)
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("Login Commands:")
			);
		});

		it("should execute login command", async () => {
			// Mock successful login
			mockOpen.mockResolvedValue();
			mockGetCliSession.mockResolvedValue({
				data: {
					data: {
						account_id: "test-account",
						session: "test-session",
					},
				},
			});
			mockGetCliBearerToken.mockResolvedValue({
				data: {
					data: {
						token: "test-token",
					},
				},
			});

			await LoginCommands.default.execute(["login"]);

			expect(mockGetCurrentEnv).toHaveBeenCalled();
			expect(mockOpen).toHaveBeenCalled();
		});

		it("should execute logout command", async () => {
			await LoginCommands.default.execute(["logout"]);

			expect(mockDeleteAllSecrets).toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("✅ Success!")
			);
		});

		it("should execute help command", async () => {
			await LoginCommands.default.execute(["help"]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("Login Commands:")
			);
		});
	});

	describe("handleLogin", () => {
		let mockDateNow;
		let mockSetTimeout;

		beforeEach(() => {
			// Mock setTimeout to resolve immediately for faster tests
			mockSetTimeout = jest
				.spyOn(global, "setTimeout")
				.mockImplementation((fn) => {
					fn();
					return 1;
				});

			// Mock Date.now for timeout testing
			mockDateNow = jest.spyOn(Date, "now").mockReturnValue(0);
		});

		afterEach(() => {
			mockSetTimeout.mockRestore();
			mockDateNow.mockRestore();
		});

		it("should successfully login with valid session", async () => {
			mockOpen.mockResolvedValue();
			mockGetCliSession.mockResolvedValue({
				data: {
					data: {
						account_id: "test-account",
						session: "test-session",
					},
				},
			});
			mockGetCliBearerToken.mockResolvedValue({
				data: {
					data: {
						token: "test-token",
					},
				},
			});

			await LoginCommands.default.handleLogin([]);

			expect(mockGetCurrentEnv).toHaveBeenCalled();
			expect(mockOpen).toHaveBeenCalled();
			expect(mockStoreSecret).toHaveBeenCalledWith(
				"session",
				"test-app.session=test-session"
			);
			expect(mockStoreSecret).toHaveBeenCalledWith(
				"account_id",
				"test-account"
			);
			expect(mockStoreSecret).toHaveBeenCalledWith("token", "test-token");
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("✅ Login successful!")
			);
		});

		it("should handle browser open failure", async () => {
			mockOpen.mockRejectedValue(new Error("Browser not found"));
			mockGetCliSession.mockResolvedValue({
				data: {
					data: {
						account_id: "test-account",
						session: "test-session",
					},
				},
			});
			mockGetCliBearerToken.mockResolvedValue({
				data: {
					data: {
						token: "test-token",
					},
				},
			});

			await LoginCommands.default.handleLogin([]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					"❌ Failed to open browser automatically"
				)
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("📋 Please copy and paste this URL")
			);
		});

		it("should handle invalid session data", async () => {
			mockOpen.mockResolvedValue();
			let callCount = 0;
			mockGetCliSession.mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					return Promise.resolve({
						data: {
							data: {
								account_id: null, // Invalid data
								session: "test-session",
							},
						},
					});
				} else {
					return Promise.resolve({
						data: {
							data: {
								account_id: "test-account",
								session: "test-session",
							},
						},
					});
				}
			});
			mockGetCliBearerToken.mockResolvedValue({
				data: {
					data: {
						token: "test-token",
					},
				},
			});

			await LoginCommands.default.handleLogin([]);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					"⚠️ Invalid session data received, retrying..."
				)
			);
		});

		it("should handle no session data", async () => {
			mockOpen.mockResolvedValue();

			// Mock Date.now to control timing for progress updates
			let currentTime = 0;
			mockDateNow.mockImplementation(() => {
				currentTime += 6000; // Increment by 6 seconds each call to trigger progress
				return currentTime;
			});

			let callCount = 0;
			mockGetCliSession.mockImplementation(() => {
				callCount++;
				if (callCount <= 2) {
					return Promise.resolve({
						data: {
							data: null, // No data
						},
					});
				} else {
					return Promise.resolve({
						data: {
							data: {
								account_id: "test-account",
								session: "test-session",
							},
						},
					});
				}
			});
			mockGetCliBearerToken.mockResolvedValue({
				data: {
					data: {
						token: "test-token",
					},
				},
			});

			await LoginCommands.default.handleLogin([]);

			expect(processStdoutSpy).toHaveBeenCalledWith(
				expect.stringContaining(".")
			);
		});

		it("should handle storage error", async () => {
			mockOpen.mockResolvedValue();
			mockGetCliSession.mockResolvedValue({
				data: {
					data: {
						account_id: "test-account",
						session: "test-session",
					},
				},
			});
			mockStoreSecret.mockRejectedValue(new Error("Storage failed"));

			await LoginCommands.default.handleLogin([]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					"❌ Failed to store authentication data"
				)
			);
		});

		it("should handle invalid token response", async () => {
			mockOpen.mockResolvedValue();
			mockGetCliSession.mockResolvedValue({
				data: {
					data: {
						account_id: "test-account",
						session: "test-session",
					},
				},
			});
			mockGetCliBearerToken.mockResolvedValue({
				data: {
					data: {
						token: null, // Invalid token
					},
				},
			});

			await LoginCommands.default.handleLogin([]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					"❌ Failed to store authentication data"
				)
			);
		});

		it("should handle 401 authentication error", async () => {
			mockOpen.mockResolvedValue();
			mockGetCliSession.mockRejectedValue({
				response: { status: 401 },
			});

			await LoginCommands.default.handleLogin([]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					"❌ Authentication failed. Please try again."
				)
			);
		});

		it("should handle connection refused error", async () => {
			mockOpen.mockResolvedValue();
			mockGetCliSession.mockRejectedValue({
				code: "ECONNREFUSED",
			});

			await LoginCommands.default.handleLogin([]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					"❌ Cannot connect to authentication server."
				)
			);
		});

		it("should handle non-404 errors with progress indicator", async () => {
			mockOpen.mockResolvedValue();

			// Mock Date.now to control timing for progress updates
			let currentTime = 0;
			mockDateNow.mockImplementation(() => {
				currentTime += 6000; // Increment by 6 seconds each call to trigger progress
				return currentTime;
			});

			let callCount = 0;
			mockGetCliSession.mockImplementation(() => {
				callCount++;
				if (callCount <= 2) {
					return Promise.reject({
						response: { status: 500 }, // Server error
					});
				} else {
					return Promise.resolve({
						data: {
							data: {
								account_id: "test-account",
								session: "test-session",
							},
						},
					});
				}
			});
			mockGetCliBearerToken.mockResolvedValue({
				data: {
					data: {
						token: "test-token",
					},
				},
			});

			await LoginCommands.default.handleLogin([]);

			expect(processStdoutSpy).toHaveBeenCalledWith(
				expect.stringContaining("x")
			);
		});

		it("should handle 404 errors silently", async () => {
			mockOpen.mockResolvedValue();
			let callCount = 0;
			mockGetCliSession.mockImplementation(() => {
				callCount++;
				if (callCount <= 2) {
					return Promise.reject({
						response: { status: 404 }, // Not found (expected during polling)
					});
				} else {
					return Promise.resolve({
						data: {
							data: {
								account_id: "test-account",
								session: "test-session",
							},
						},
					});
				}
			});
			mockGetCliBearerToken.mockResolvedValue({
				data: {
					data: {
						token: "test-token",
					},
				},
			});
			mockStoreSecret.mockResolvedValue(); // Ensure storage succeeds

			await LoginCommands.default.handleLogin([]);

			// Should not show error progress for 404s
			expect(processStdoutSpy).not.toHaveBeenCalledWith("x");
			// Check that the login process completed successfully
			expect(mockStoreSecret).toHaveBeenCalledWith("token", "test-token");
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("✅ Login successful!")
			);
		});

		it("should timeout after 5 minutes", async () => {
			// Mock Date.now to simulate timeout
			let currentTime = 0;
			mockDateNow.mockImplementation(() => {
				currentTime += 310000; // Exceed 5 minute timeout
				return currentTime;
			});

			mockOpen.mockResolvedValue();
			mockGetCliSession.mockResolvedValue({
				data: { data: null }, // Never return valid data
			});

			await LoginCommands.default.handleLogin([]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("❌ Login timeout after 5 minutes")
			);
		});
	});

	describe("handleLogout", () => {
		it("should successfully logout and clear all secrets", async () => {
			mockDeleteAllSecrets.mockResolvedValue();

			await LoginCommands.default.handleLogout();

			expect(mockDeleteAllSecrets).toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("✅ Success!")
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					"Logout successful! All user data cleared."
				)
			);
		});

		it("should handle logout errors gracefully", async () => {
			mockDeleteAllSecrets.mockRejectedValue(new Error("Delete failed"));

			// The logout function doesn't handle errors, so it will throw
			await expect(LoginCommands.default.handleLogout()).rejects.toThrow(
				"Delete failed"
			);
		});
	});

	describe("URL construction", () => {
		it("should construct correct login URL", async () => {
			mockOpen.mockImplementation((url) => {
				// Verify URL construction
				expect(url).toContain("https://login.test.com/auth/sign-in");
				expect(url).toContain("client_id=test-client-id");
				expect(url).toContain("redirect_uri=https://frontend.test.com");
				expect(url).toContain("state=");
				expect(url).toContain("boltic_cli");
				expect(url).toContain("test-uuid-1234");
				return Promise.resolve();
			});

			mockGetCliSession.mockResolvedValue({
				data: {
					data: {
						account_id: "test-account",
						session: "test-session",
					},
				},
			});
			mockGetCliBearerToken.mockResolvedValue({
				data: {
					data: {
						token: "test-token",
					},
				},
			});

			await LoginCommands.default.handleLogin([]);

			expect(mockOpen).toHaveBeenCalled();
		});
	});

	describe("Session encoding", () => {
		it("should properly encode session value", async () => {
			mockOpen.mockResolvedValue();
			mockGetCliSession.mockResolvedValue({
				data: {
					data: {
						account_id: "test-account",
						session: "test session with spaces",
					},
				},
			});
			mockGetCliBearerToken.mockResolvedValue({
				data: {
					data: {
						token: "test-token",
					},
				},
			});

			await LoginCommands.default.handleLogin([]);

			expect(mockStoreSecret).toHaveBeenCalledWith(
				"session",
				"test-app.session=test%20session%20with%20spaces"
			);
		});
	});

	describe("Edge cases and specific line coverage", () => {
		let mockDateNow;
		let mockSetTimeout;

		beforeEach(() => {
			// Mock setTimeout to resolve immediately for faster tests
			mockSetTimeout = jest
				.spyOn(global, "setTimeout")
				.mockImplementation((fn) => {
					fn();
					return 1;
				});

			// Mock Date.now for timeout testing
			mockDateNow = jest.spyOn(Date, "now").mockReturnValue(0);
		});

		afterEach(() => {
			mockSetTimeout.mockRestore();
			mockDateNow.mockRestore();
		});

		it("should cover progress dot display logic (lines 89-90)", async () => {
			mockOpen.mockResolvedValue();

			// Mock Date.now to control timing for progress updates
			let currentTime = 0;
			mockDateNow.mockImplementation(() => {
				currentTime += 6000; // Increment by 6 seconds each call to trigger progress
				return currentTime;
			});

			let callCount = 0;
			mockGetCliSession.mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					// Return null data to trigger progress dot
					return Promise.resolve({
						data: {
							data: null,
						},
					});
				} else {
					return Promise.resolve({
						data: {
							data: {
								account_id: "test-account",
								session: "test-session",
							},
						},
					});
				}
			});
			mockGetCliBearerToken.mockResolvedValue({
				data: {
					data: {
						token: "test-token",
					},
				},
			});

			await LoginCommands.default.handleLogin([]);

			expect(processStdoutSpy).toHaveBeenCalledWith(
				expect.stringContaining(".")
			);
		});

		it("should cover invalid token error logic (line 122)", async () => {
			mockOpen.mockResolvedValue();
			mockGetCliSession.mockResolvedValue({
				data: {
					data: {
						account_id: "test-account",
						session: "test-session",
					},
				},
			});
			// Return response without token field to trigger line 122
			mockGetCliBearerToken.mockResolvedValue({
				data: {
					data: {
						// Missing token field entirely
					},
				},
			});

			await LoginCommands.default.handleLogin([]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					"❌ Failed to store authentication data"
				)
			);
		});

		it("should cover invalid token error logic with null token (line 122)", async () => {
			mockOpen.mockResolvedValue();
			mockGetCliSession.mockResolvedValue({
				data: {
					data: {
						account_id: "test-account",
						session: "test-session",
					},
				},
			});
			// Return response with null token to trigger line 122
			mockGetCliBearerToken.mockResolvedValue({
				data: {
					data: {
						token: null,
					},
				},
			});

			await LoginCommands.default.handleLogin([]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					"❌ Failed to store authentication data"
				)
			);
		});

		it("should cover error progress display logic (lines 150-151)", async () => {
			mockOpen.mockResolvedValue();

			// Mock Date.now to control timing for progress updates
			let currentTime = 0;
			mockDateNow.mockImplementation(() => {
				currentTime += 6000; // Increment by 6 seconds each call to trigger progress
				return currentTime;
			});

			let callCount = 0;
			mockGetCliSession.mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					// Return server error to trigger "x" progress
					return Promise.reject({
						response: { status: 500 },
					});
				} else {
					return Promise.resolve({
						data: {
							data: {
								account_id: "test-account",
								session: "test-session",
							},
						},
					});
				}
			});
			mockGetCliBearerToken.mockResolvedValue({
				data: {
					data: {
						token: "test-token",
					},
				},
			});

			await LoginCommands.default.handleLogin([]);

			expect(processStdoutSpy).toHaveBeenCalledWith(
				expect.stringContaining("x")
			);
		});
	});
});
