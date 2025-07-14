export default {
	testMatch: ["**/tests/**/*.{test,spec}.{js,ts}"],
	collectCoverageFrom: [
		"lib/**/*.{js,ts}",
		"src/**/*.{js,ts}",
		"*.{js,ts}",
		"*.{json,jsonc}",
		"!**/node_modules/**",
		"!**/tests/**",
	],
	coverageDirectory: "coverage",
	collectCoverage: true,
	coverageReporters: ["text", "lcov", "html"],
	verbose: true,
};
