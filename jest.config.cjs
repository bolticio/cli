module.exports = {
	testEnvironment: "node",
	transformIgnorePatterns: ["node_modules/(?!@inquirer/prompts)/"],
	transform: {
		"^.+\.js$": ["babel-jest", { rootMode: "upward" }],
	},
	globals: {
		"import.meta": {
			url: "file://",
		},
	},
	moduleNameMapper: {
		"^../commands/(.*)$": "<rootDir>/commands/$1",
		"^../api/(.*)$": "<rootDir>/api/$1",
		"^../config/(.*)$": "<rootDir>/config/$1",
		"^../helper/(.*)$": "<rootDir>/helper/$1",
		"^../utils/(.*)$": "<rootDir>/utils/$1",
		"^../templates/(.*)$": "<rootDir>/templates/$1",
	},
	testEnvironmentOptions: {
		customExportConditions: ["node", "node-addons"],
		url: "http://localhost",
	},
	injectGlobals: true,
	testRunner: "jest-circus/runner",
	collectCoverage: true,
	coverageReporters: ["text", "lcov", "clover", "html"],
	coverageDirectory: "coverage",
	collectCoverageFrom: [
		"**/*.js",
		"!**/node_modules/**",
		"!**/__tests__/**",
		"!**/coverage/**",
		"!babel.config.cjs",
		"!jest.config.cjs",
		"!eslint.config.js",
	],
	coverageThreshold: {
		global: {
			branches: 84,
			functions: 90,
			lines: 90,
			statements: 90,
		},
	},
	coveragePathIgnorePatterns: [
		"/node_modules/",
		"/__tests__/",
		"/coverage/",
		"babel.config.cjs",
		"jest.config.cjs",
		"eslint.config.js",
	],
	testMatch: ["**/__tests__/*.test.js"],
	verbose: true,
	forceExit: true,
	clearMocks: true,
	restoreMocks: true,
};
