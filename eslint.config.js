import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";

export default defineConfig([
	{
		files: ["**/*.{js,mjs,cjs}"],
		plugins: { js },
		extends: ["js/recommended"],
		rules: {
			"no-process-exit": "off", // Allow process.exit() and other process.xxx methods
			"no-unused-vars": [
				"warn",
				{
					argsIgnorePattern: "^_", // Ignore unused function arguments prefixed with _
					varsIgnorePattern: "^_", // Ignore unused variables prefixed with _
				},
			],
		},
	},
	{
		files: ["**/*.{js,mjs,cjs}"],
		languageOptions: { globals: { ...globals.browser, process: true } }, // Add `process` to globals
	},
]);
