import { readFile } from "fs";
import { createInterface } from "readline";
import chalk from "chalk";
import superagent from "superagent";
import { Reporter } from "./utils/reports.js";
import { compareImages } from "./utils/image.js";
import { prepareFolders } from "./utils/files.js";
import { parseJSONTest, transformTests } from "./utils/tests.js";

const ACTUAL_IMAGES_FOLDER = "./actual-images";
const BASE_IMAGES_FOLDER = "./base-images";
const DIFF_IMAGES_FOLDER = "./diff-images";

const initialOutputJson = {
	summary: {
		iterations: 0,
		concurrency: 1,
		totalRequests: 0,
		passedRequests: 0,
		failedRequests: 0,
		totalAssertions: 0,
		passedAssertions: 0,
		failedAssertions: 0,
		totalTests: 0,
		passedTests: 0,
		failedTests: 0,
	},
	results: [],
};

/**
 * Bruno variable store for managing collection variables
 */
class BrunoVariableStore {
	constructor() {
		this.variables = new Map();
	}

	setVar(key, value) {
		this.variables.set(key, value);
		console.log(chalk.blue(`Set variable: ${key} = ${value}`));
	}

	getVar(key) {
		return this.variables.get(key);
	}

	hasVar(key) {
		return this.variables.has(key);
	}

	interpolateString(str) {
		if (typeof str !== "string") return str;

		return str.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
			const trimmedVarName = varName.trim();
			if (this.hasVar(trimmedVarName)) {
				const value = this.getVar(trimmedVarName);
				console.log(
					chalk.blue(`Replaced {{${trimmedVarName}}} with: ${value}`)
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
		this.variables.clear();
	}
}

/**
 * Prompts user for confirmation to execute JavaScript code from Bruno collections
 * @returns {Promise<boolean>} Promise that resolves to true if user confirms, false otherwise
 */
const promptForCodeExecution = () => {
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

/**
 * Executes a series of tests defined in a collection file and generates a report.
 *
 * @async
 * @function
 * @param {Object} testConfig - Configuration object for the test run.
 * @param {string} testConfig.collection - Path to the collection file containing test definitions.
 * @param {string} [testConfig.actualImagesFolder=ACTUAL_IMAGES_FOLDER] - Folder to store actual images.
 * @param {string} [testConfig.baseImagesFolder=BASE_IMAGES_FOLDER] - Folder containing base images for comparison.
 * @param {string} [testConfig.diffImagesFolder=DIFF_IMAGES_FOLDER] - Folder to store diff images.
 * @param {number} [testConfig.concurrency=1] - Number of concurrent tests to run.
 * @param {number} [testConfig.iterations=1] - Number of iterations to run the tests.
 * @param {Function} [testConfig.onBeforeRequest] - Callback executed before each request.
 * @param {Function} [testConfig.onAfterRequest] - Callback executed after each request.
 * @param {Function} [testConfig.onRequestError] - Callback executed when a request fails.
 * @param {Function} [testConfig.onTestError] - Callback executed when a test fails.
 * @param {Object} [testConfig.reporter] - Configuration for the test reporter.
 * @param {boolean} [testConfig.reporter.enabled=false] - Whether the reporter is enabled.
 * @param {string} [testConfig.reporter.name="junit"] - Name of the reporter.
 * @param {string} [testConfig.reporter.output="./reports"] - Output directory for the reporter.
 * @param {boolean} [testConfig.allowCodeExecution] - Whether to allow JavaScript execution without prompting (for CI/automated runs).
 * @returns {Promise<Object>} A promise that resolves to the test results summary and details.
 *
 * @throws {Error} If there is an issue reading the collection file or during test execution.
 *
 * @example
 * const testConfig = {
 *   collection: './path/to/collection.json',
 *   concurrency: 2,
 *   iterations: 3,
 *   allowCodeExecution: false, // Disable JavaScript execution for security
 *   reporter: {
 *     enabled: true,
 *     name: 'junit',
 *     output: './test-reports',
 *   },
 *   onBeforeRequest: (request) => console.log('Before request:', request),
 *   onAfterRequest: (response) => console.log('After request:', response),
 *   onRequestError: (error) => console.error('Request error:', error),
 * };
 *
 * run(testConfig)
 *   .then((results) => console.log('Test results:', results))
 *   .catch((error) => console.error('Error during test run:', error));
 */
const run = async testConfig => {
	const outputJson = { summary: { ...initialOutputJson.summary }, results: [] };

	// Initialize Bruno variable store
	const variableStore = new BrunoVariableStore();

	return new Promise(async (resolve, reject) => {
		try {
			const {
				collection,
				actualImagesFolder = ACTUAL_IMAGES_FOLDER,
				baseImagesFolder = BASE_IMAGES_FOLDER,
				diffImagesFolder = DIFF_IMAGES_FOLDER,
				concurrency = 1,
				iterations = 1,
				onBeforeRequest,
				onAfterRequest,
				onRequestError,
				onTestError,
				allowCodeExecution,
				reporter = {
					enabled: false,
					name: "junit",
					output: "./reports",
				},
			} = testConfig;

			// Check if we should allow code execution
			let codeExecutionAllowed = false;
			if (allowCodeExecution === true) {
				codeExecutionAllowed = true;
			} else if (allowCodeExecution === false) {
				codeExecutionAllowed = false;
			} else {
				// Prompt user for confirmation
				codeExecutionAllowed = await promptForCodeExecution();
			}

			outputJson.summary.concurrency = concurrency;
			let hasInstantiatedImages = false;
			let startTime;

			const completeReport = () => {
				if (!reporter.enabled) {
					return;
				}
				Reporter.completeReport({
					outputJson,
					reporter,
				});
			};
			const reportResults = (folder, name, assertionError) => {
				if (!reporter.enabled) {
					return;
				}
				Reporter.saveResult({
					assertionError,
					folder,
					name,
					outputJson,
					reporter,
					startTime,
				});
			};
			readFile(collection, "utf8", async (err, data) => {
				if (err) {
					console.error("Could not list the directory.", err);
					process.exit(1);
				}
				const parsedData = JSON.parse(data);
				let folderName = "";
				async function traverseBrunoCollection(items) {
					const sortedItems = items.sort((a, b) => a.seq - b.seq);
					for (const item of sortedItems) {
						if (item.type === "folder") {
							folderName = item.name;
							await traverseBrunoCollection(item.items);
						} else {
							const {
								url,
								method,
								params,
								body: { json },
								tests,
								headers,
							} = item.request;
							const folder = folderName.length ? `${folderName}-` : "";
							const testName = `${folder}${item.name}`
								.replaceAll("/", "-")
								.replaceAll(" ", "-")
								.toLowerCase();
							console.log(chalk.bgCyan(`Running test: ${testName}`));
							let parsedTests = transformTests(tests);

							// Interpolate variables in the URL
							const interpolatedUrl = variableStore.interpolateString(url);

							// Interpolate variables in headers
							const interpolatedHeaders = headers.reduce((acc, header) => {
								if (header.enabled) {
									acc[header.name] = variableStore.interpolateString(
										header.value
									);
								}
								return acc;
							}, {});

							const options = {
								method,
								data:
									method === "POST"
										? variableStore.interpolateObject(json)
										: undefined,
								headers: interpolatedHeaders,
							};
							if (method === "POST") {
								options.headers["Content-Type"] = "application/json";
							}
							let fullUrl = new URL(interpolatedUrl);
							fullUrl = `${fullUrl.origin}${fullUrl.pathname}`;
							const queryParams = new URLSearchParams();
							params.forEach(param => {
								const { enabled, name, value } = param;
								if (enabled && !queryParams.has(name)) {
									// Interpolate variable in param value
									const interpolatedValue =
										variableStore.interpolateString(value);
									queryParams.append(name, interpolatedValue);
								}
							});
							if (queryParams.toString().length) {
								fullUrl = `${fullUrl}?${queryParams.toString()}`;
							}
							const superagentRequest = superagent[method.toLowerCase()](
								fullUrl
							)
								.set(options.headers)
								.disableTLSCerts();
							if (method === "POST") {
								superagentRequest.send(options.data);
							}

							// Create the bru object for this test
							const bru = {
								setVar: (key, value) => variableStore.setVar(key, value),
								getVar: key => variableStore.getVar(key),
							};

							const generateTestResponse = res => ({
								status: res.status,
								data: res.type === "text/html" ? res.text : res.body,
								headers: res.headers,
							});
							outputJson.summary.totalRequests++;
							startTime = Date.now();
							onBeforeRequest?.(superagentRequest);
							const response = await superagentRequest.catch(err => {
								onRequestError?.(err);
								if (tests) {
									if (codeExecutionAllowed) {
										try {
											parseJSONTest(
												parsedTests,
												generateTestResponse(err.response),
												outputJson,
												bru
											);
											outputJson.summary.totalTests++;
											outputJson.summary.passedTests++;
											reportResults(folderName, item.name);
										} catch (assertionError) {
											onTestError?.(assertionError);
											outputJson.summary.totalTests++;
											outputJson.summary.failedRequests++;
											reportResults(folderName, item.name, assertionError);
										}
									} else {
										console.log(
											chalk.yellow(
												`Skipping JavaScript tests for ${item.name} - code execution disabled`
											)
										);
										outputJson.summary.totalTests++;
										outputJson.summary.failedTests++; // Count as failed since we skipped
									}
								}
								return;
							});

							if (!response) {
								continue;
							}
							onAfterRequest?.(response);
							const contentType = response.headers["content-type"];

							if (tests) {
								if (codeExecutionAllowed) {
									try {
										parseJSONTest(
											parsedTests,
											generateTestResponse(response),
											outputJson,
											bru
										);
										outputJson.summary.totalTests++;
										outputJson.summary.passedTests++;
										reportResults(folderName, item.name);
									} catch (assertionError) {
										onTestError?.(assertionError);
										outputJson.summary.totalTests++;
										outputJson.summary.failedTests++;
										reportResults(folderName, item.name, assertionError);
									}
								} else {
									console.log(
										chalk.yellow(
											`Skipping JavaScript tests for ${item.name} - code execution disabled`
										)
									);
									outputJson.summary.totalTests++;
									outputJson.summary.failedTests++; // Count as failed since we skipped
								}
							}
							if (contentType.startsWith("image/")) {
								if (!hasInstantiatedImages) {
									hasInstantiatedImages = true;
									prepareFolders({
										baseImagesFolder,
										actualImagesFolder,
										diffImagesFolder,
									});
								}
								if (response.status !== 200) {
									console.log(
										chalk.bgCyan(
											`Expected status is not 200, skipping image comparison`
										)
									);
									return;
								}
								try {
									await compareImages({
										response,
										item,
										testName,
										actualImagesFolder,
										baseImagesFolder,
										diffImagesFolder,
									});
									reportResults(folderName, item.name);
								} catch (assertionError) {
									onTestError?.(assertionError);
									reportResults(folderName, item.name, assertionError);
									console.log(
										chalk.red(`Actual image saved at ${actualImagesFolder}`)
									);
									console.log(
										chalk.bgRed(`Diff image saved at ${diffImagesFolder}`)
									);
									if (reporter.enabled) {
										Reporter.saveResult({
											assertionError,
											folder: folderName,
											name: item.name,
											outputJson,
											reporter,
											startTime,
										});
									}
								}
							}
						}
					}
				}
				const testsToRun = Array.from({ length: iterations });
				for (const _ of testsToRun) {
					// Clear variables at the start of each iteration
					variableStore.clear();

					const concurrentTests = Array.from({ length: concurrency }, () =>
						traverseBrunoCollection(parsedData.items)
					);
					await Promise.all(concurrentTests);
					outputJson.summary.iterations++;
				}
				completeReport();
				console.table(outputJson.summary);
				resolve(outputJson);
			});
		} catch (error) {
			reject(error);
		}
	});
};
export const chappie = {
	run,
};
