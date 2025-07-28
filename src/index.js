import { readFile } from "fs";
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
 * @returns {Promise<Object>} A promise that resolves to the test results summary and details.
 *
 * @throws {Error} If there is an issue reading the collection file or during test execution.
 *
 * @example
 * const testConfig = {
 *   collection: './path/to/collection.json',
 *   concurrency: 2,
 *   iterations: 3,
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
const run = async (testConfig) => {
  const outputJson = { summary: { ...initialOutputJson.summary }, results: [] };
  return new Promise((resolve, reject) => {
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
        reporter = {
          enabled: false,
          name: "junit",
          output: "./reports",
        },
      } = testConfig;
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
              const options = {
                method,
                data: method === "POST" ? json : undefined,
                headers: headers.reduce((acc, header) => {
                  if (header.enabled) {
                    acc[header.name] = header.value;
                  }
                  return acc;
                }, {}),
              };
              if (method === "POST") {
                options.headers["Content-Type"] = "application/json";
              }
              let fullUrl = new URL(url);
              fullUrl = `${fullUrl.origin}${fullUrl.pathname}`;
              const queryParams = new URLSearchParams();
              params.forEach((param) => {
                const { enabled, name, value } = param;
                if (enabled && !queryParams.has(name)) {
                  queryParams.append(name, value);
                }
              });
              if (queryParams.toString().length) {
                fullUrl = `${fullUrl}?${queryParams.toString()}`;
              }
              const superagentRequest = superagent[method.toLowerCase()](
                fullUrl,
              ).set(options.headers);
              if (method === "POST") {
                superagentRequest.send(json);
              }
              const generateTestResponse = (res) => ({
                status: res.status,
                data: res.type === "text/html" ? res.text : res.body,
                headers: res.headers,
              });
              outputJson.summary.totalRequests++;
              startTime = Date.now();
              onBeforeRequest?.(superagentRequest);
              const response = await superagentRequest.catch((err) => {
                onRequestError?.(err);
                if (tests) {
                  try {
                    parseJSONTest(
                      parsedTests,
                      generateTestResponse(err.response),
                      outputJson,
                    );
                    reportResults(folderName, item.name);
                  } catch (assertionError) {
                    onTestError?.(assertionError);
                    outputJson.summary.failedRequests++;
                    reportResults(folderName, item.name, assertionError);
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
                try {
                  parseJSONTest(
                    parsedTests,
                    generateTestResponse(response),
                    outputJson,
                  );
                  reportResults(folderName, item.name);
                } catch (assertionError) {
                  onTestError?.(assertionError);
                  reportResults(folderName, item.name, assertionError);
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
                      `Expected status is not 200, skipping image comparison`,
                    ),
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
                    chalk.red(`Actual image saved at ${actualImagesFolder}`),
                  );
                  console.log(
                    chalk.bgRed(`Diff image saved at ${diffImagesFolder}`),
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
          const concurrentTests = Array.from({ length: concurrency }, () =>
            traverseBrunoCollection(parsedData.items),
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
