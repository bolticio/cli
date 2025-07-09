import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
	{
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: {
				node: true,
				es2021: true,
				...globals.node,
				...globals.jest,
				console: true,
				process: true,
			},
		},
		files: ["**/*.js"],
		rules: {
			...js.configs.recommended.rules,
			indent: ["error", "tab"],
			"linebreak-style": ["error", "unix"],
			quotes: ["error", "double"],
			semi: ["error", "always"],
			"no-unused-vars": ["warn"],
			"no-console": "off",
		},
	},
	prettier,
];
