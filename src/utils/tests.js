import tv4 from "tv4";
import { expect } from "chai";
import chalk from "chalk";

export const transformTests = (tests) => {
  let parsedTests =
    tests?.replaceAll(/res\.getStatus\(\)/g, "res.status") || "";
  parsedTests = parsedTests.replaceAll(/res\.getBody\(\)/g, "res.data");
  parsedTests = parsedTests.replaceAll(/res\.getHeaders\(\)/g, "res.headers");
  parsedTests = parsedTests.replaceAll(
    /res\.getHeader\('([^']+)'\)/g,
    "res.headers['$1']",
  );
  return parsedTests;
};

globalThis.test = (testCode, myTest, res) => {
  console.log(chalk.green(testCode));
  myTest(res, tv4, expect);
};

export const parseJSONTest = function (testCode, res, outputJson) {
  const testFunction = new Function("tv4", "expect", "res", testCode);
  const expectHandler = (input) => {
    outputJson.summary.totalAssertions++;
    return expect(input);
  };
  testFunction(tv4, expectHandler, res);
};
