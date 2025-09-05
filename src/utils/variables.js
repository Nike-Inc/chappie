import chalk from "chalk";
/**
 * Bruno variable store for managing collection variables
 */
export class BrunoVariableStore {
	constructor(collection = null) {
		// Environment variables (from collection environments)
		this.environmentVariables = new Map();
		// Runtime variables (set during test execution via bru.setVar)
		this.runtimeVariables = new Map();

		// Load environment variables if collection is provided
		if (collection) {
			this.loadEnvironmentVariables(collection);
		}
	}

	/**
	 * Load environment variables from Bruno collection
	 * Priority: activeEnvironmentUid > first environment > none
	 */
	loadEnvironmentVariables(collection) {
		if (!collection.environments || collection.environments.length === 0) {
			console.log(chalk.gray("No environments found in collection"));
			return;
		}

		let activeEnvironment = null;

		// Try to find active environment first
		if (collection.activeEnvironmentUid) {
			activeEnvironment = collection.environments.find(
				env => env.uid === collection.activeEnvironmentUid
			);
		}

		// Fall back to first environment if no active environment found
		if (!activeEnvironment) {
			activeEnvironment = collection.environments[0];
			console.log(
				chalk.yellow(
					`No active environment found, using first environment: ${activeEnvironment.name}`
				)
			);
		} else {
			console.log(
				chalk.blue(`Using active environment: ${activeEnvironment.name}`)
			);
		}

		// Load variables from the selected environment
		if (activeEnvironment.variables) {
			activeEnvironment.variables.forEach(variable => {
				if (variable.enabled !== false) {
					this.environmentVariables.set(variable.name, variable.value);
					const displayValue = this.isSecretVariable(
						variable.name,
						variable.value
					)
						? this.maskValue(variable.value)
						: variable.value;
					console.log(
						chalk.green(
							`Loaded env variable: ${variable.name} = ${displayValue}`
						)
					);
				}
			});
		}
	}

	/**
	 * Determine if a variable should be treated as secret
	 * Variables containing 'secret', 'password', 'token', 'key', 'auth' are considered secret
	 */
	isSecretVariable(name, value) {
		const secretKeywords = [
			"secret",
			"password",
			"token",
			"key",
			"auth",
			"api",
		];
		const nameString = name.toLowerCase();
		return secretKeywords.some(keyword => nameString.includes(keyword));
	}

	/**
	 * Mask sensitive values for logging
	 */
	maskValue(value) {
		if (!value || typeof value !== "string") return value;
		if (value.length <= 8) return "***";
		return (
			value.substring(0, 3) +
			"*".repeat(value.length - 6) +
			value.substring(value.length - 3)
		);
	}

	/**
	 * Set a runtime variable (these override environment variables)
	 */
	setVar(key, value) {
		this.runtimeVariables.set(key, value);
		const displayValue = this.isSecretVariable(key, value)
			? this.maskValue(value)
			: value;
		console.log(chalk.blue(`Set runtime variable: ${key} = ${displayValue}`));
	}

	/**
	 * Get a variable with priority: runtime > environment
	 */
	getVar(key) {
		// Runtime variables take precedence
		if (this.runtimeVariables.has(key)) {
			return this.runtimeVariables.get(key);
		}
		// Fall back to environment variables
		return this.environmentVariables.get(key);
	}

	/**
	 * Check if a variable exists in either store
	 */
	hasVar(key) {
		return this.runtimeVariables.has(key) || this.environmentVariables.has(key);
	}

	interpolateString(str) {
		if (typeof str !== "string") return str;

		return str.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
			const trimmedVarName = varName.trim();
			if (this.hasVar(trimmedVarName)) {
				const value = this.getVar(trimmedVarName);
				const displayValue = this.isSecretVariable(trimmedVarName, value)
					? this.maskValue(value)
					: value;
				const source = this.runtimeVariables.has(trimmedVarName)
					? "runtime"
					: "environment";
				console.log(
					chalk.blue(
						`Replaced {{${trimmedVarName}}} with: ${displayValue} (${source})`
					)
				);
				return value;
			}
			console.log(
				chalk.yellow(
					`Variable {{${trimmedVarName}}} not found, keeping original`
				)
			);
			return match;
		});
	}

	interpolateObject(obj) {
		if (typeof obj === "string") {
			return this.interpolateString(obj);
		}
		if (Array.isArray(obj)) {
			return obj.map(item => this.interpolateObject(item));
		}
		if (typeof obj === "object" && obj !== null) {
			const result = {};
			for (const [key, value] of Object.entries(obj)) {
				result[key] = this.interpolateObject(value);
			}
			return result;
		}
		return obj;
	}

	clear() {
		// Only clear runtime variables, keep environment variables
		this.runtimeVariables.clear();
		console.log(
			chalk.gray("Cleared runtime variables (environment variables preserved)")
		);
	}

	/**
	 * Get all variables for debugging (with secrets masked)
	 */
	getAllVariables() {
		const all = new Map();

		// Add environment variables first
		for (const [key, value] of this.environmentVariables) {
			const displayValue = this.isSecretVariable(key, value)
				? this.maskValue(value)
				: value;
			all.set(`${key} (env)`, displayValue);
		}

		// Add runtime variables (these override environment)
		for (const [key, value] of this.runtimeVariables) {
			const displayValue = this.isSecretVariable(key, value)
				? this.maskValue(value)
				: value;
			all.set(`${key} (runtime)`, displayValue);
		}

		return all;
	}
}
