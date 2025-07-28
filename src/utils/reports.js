import builder from "junit-report-builder";
import makeHtmlOutput from "./html.js";
import chalk from "chalk";

export const Reporter = {
  suite: null,
  saveResult: (config) => {
    const { assertionError, folder, name, outputJson, reporter, startTime } =
      config;

    if (!Reporter.suite) {
      Reporter.suite = builder.testSuite().name(reporter.name);
    }

    const runtime = (Date.now() - startTime) / 1000;
    const resultObject = {
      suitename: reporter.name,
      request: {
        method: "GET",
        url: name,
      },
      runtime,
    };

    if (assertionError) {
      console.error(chalk.red("Error running test:", assertionError));

      Reporter.suite
        .testCase()
        .className(folder)
        .name(name)
        .failure(assertionError.message);
      outputJson.summary.failedTests++;
      outputJson.summary.failedAssertions++;
      resultObject.testResults = [
        {
          description: name,
          status: "fail",
          error: assertionError.message,
        },
      ];
    } else {
      resultObject.testResults = [
        {
          description: name,
          status: "pass",
        },
      ];
      outputJson.summary.passedTests++;
      Reporter.suite.testCase().className(folder).name(name);
    }
    outputJson.summary.totalTests++;
    outputJson.results.push(resultObject);
  },
  completeReport: (config) => {
    const { outputJson, reporter } = config;

    if (reporter.enabled) {
      builder.writeTo(
        `${reporter.output || "./reports"}/${(
          reporter.name?.replaceAll("/", "-").replaceAll(" ", "-") || "junit"
        ).toLowerCase()}.xml`,
      );

      makeHtmlOutput(
        outputJson,
        `./reports/${
          reporter.name?.replaceAll("/", "-").replaceAll(" ", "-") || "index"
        }.html`,
      );
    }
  },
};
