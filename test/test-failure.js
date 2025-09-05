import { chappie } from "../src/index.js";
import { server } from "./mock-server.js";

let mockServer;

function startMockServer() {
	return new Promise(resolve => {
		if (mockServer) {
			resolve();
			return;
		}
		console.log("🚀 Starting mock server...");
		mockServer = server;
		setTimeout(() => {
			console.log("✅ Mock server ready at http://localhost:3001");
			resolve();
		}, 1000);
	});
}

function stopMockServer() {
	return new Promise(resolve => {
		if (mockServer) {
			console.log("🛑 Stopping mock server...");
			mockServer.close(() => {
				console.log("✅ Mock server stopped");
				mockServer = null;
				resolve();
			});
		} else {
			resolve();
		}
	});
}

async function runFailingTest() {
	try {
		await startMockServer();

		console.log("Starting failing test collection...");
		const result = await chappie.run({
			collection: "./test/FailingTestCollection.json",
			iterations: 1,
			concurrency: 1,
			allowCodeExecution: true,
			onTestError: error => {
				console.log("❌ Test error:", error.message);
			},
			onRequestError: error => {
				console.log("❌ Request error:", error.message);
			},
		});

		await stopMockServer();

		const hasFailures =
			result.summary.failedTests > 0 ||
			result.summary.failedRequests > 0 ||
			result.summary.failedAssertions > 0;

		console.log(`Failed tests: ${result.summary.failedTests}`);
		console.log(`Failed requests: ${result.summary.failedRequests}`);
		console.log(`Failed assertions: ${result.summary.failedAssertions}`);

		if (hasFailures) {
			console.error("❌ Tests failed! Exiting with error code 1");
			process.exit(1);
		}

		return result;
	} catch (error) {
		console.error("❌ Error running collections:", error);
		await stopMockServer();
		process.exit(1);
	}
}

console.log("🧪 Testing failure scenario...");
runFailingTest()
	.then(() => {
		console.log("🎉 All tests passed (this shouldn't happen)!");
		process.exit(0);
	})
	.catch(error => {
		console.error("❌ Unexpected error:", error);
		process.exit(1);
	});
