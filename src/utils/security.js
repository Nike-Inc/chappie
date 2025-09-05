import { createInterface } from "readline";
/**
 * Prompts user for confirmation to execute JavaScript code from Bruno collections
 * @returns {Promise<boolean>} Promise that resolves to true if user confirms, false otherwise
 */
export const promptForCodeExecution = () => {
	return new Promise(resolve => {
		const rl = createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		console.log(chalk.yellow("\n⚠️  SECURITY WARNING:"));
		console.log(
			chalk.yellow(
				"This Bruno collection may contain JavaScript code in tests and pre-scripts."
			)
		);
		console.log(
			chalk.yellow(
				"Executing this code could potentially run arbitrary JavaScript on your system."
			)
		);

		rl.question(
			chalk.cyan("Do you want to allow JavaScript execution? (y/N): "),
			answer => {
				rl.close();
				const allowExecution =
					answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
				if (allowExecution) {
					console.log(chalk.green("✓ JavaScript execution enabled."));
				} else {
					console.log(
						chalk.yellow(
							"✗ JavaScript execution disabled. Tests will be skipped."
						)
					);
				}
				resolve(allowExecution);
			}
		);
	});
};
