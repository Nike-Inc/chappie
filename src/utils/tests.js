import tv4 from "tv4";
import { expect } from "chai";
import chalk from "chalk";

export const transformTests = tests => {
	let parsedTests =
		tests?.replaceAll(/res\.getStatus\(\)/g, "res.status") || "";
	parsedTests = parsedTests.replaceAll(/res\.getBody\(\)/g, "res.data");
	parsedTests = parsedTests.replaceAll(/res\.getHeaders\(\)/g, "res.headers");
	parsedTests = parsedTests.replaceAll(
		/res\.getHeader\('([^']+)'\)/g,
		"res.headers['$1']"
	);
	return parsedTests;
};

globalThis.test = (testCode, myTest, res) => {
	console.log(chalk.green(testCode));
	try {
		myTest(res, tv4, expect);
		// Test passed - this will be counted by the caller
	} catch (error) {
		// Test failed - throw the error to be caught by the caller
		throw error;
	}
};

export const parseJSONTest = function (testCode, res, outputJson, bru = null) {
	// If bru object is provided, include it in the function context
	const args = bru
		? ["tv4", "expect", "res", "bru", testCode]
		: ["tv4", "expect", "res", testCode];

	const testFunction = new Function(...args);
	const expectHandler = input => {
		outputJson.summary.totalAssertions++;
		return expect(input);
	};

	if (bru) {
		testFunction(tv4, expectHandler, res, bru);
	} else {
		testFunction(tv4, expectHandler, res);
	}
};
