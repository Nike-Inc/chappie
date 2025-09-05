import { chappie } from "../src/index.js";
import { server } from "./mock-server.js";

let mockServer;

function startMockServer() {
	return new Promise(resolve => {
		// Check if server is already running
		if (mockServer) {
			resolve();
			return;
		}

		console.log("🚀 Starting mock server...");
		mockServer = server;

		// Give the server a moment to start
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

async function runCollections() {
	try {
		// Start the mock server first
		await startMockServer();

		console.log("Starting local collection test...");
		const result = await chappie.run({
			collection: "./test/LocalTestCollection.json", // Updated path
			iterations: 1,
			concurrency: 1,
			allowCodeExecution: true,
			onTestError: error => {
				console.log("❌ Test error:", error.message);
			},
			onRequestError: error => {
				console.log("❌ Request error:", error.message);
			},
			onBeforeRequest: request => {
				console.log("🔄 Making request to:", request.url);
			},
			onAfterRequest: response => {
				console.log("✅ Response status:", response.status);
			},
			reporter: {
				enabled: true,
				name: "local-test",
				output: "./reports",
			},
		});

		console.log(
			`✅ Local collection completed with: ${result.summary.failedTests} failed tests`
		);
		console.log(`📊 Total requests: ${result.summary.totalRequests}`);
		console.log(`📊 Total assertions: ${result.summary.totalAssertions}`);

		// Stop the mock server
		await stopMockServer();

		// Check if any tests failed and exit with appropriate code
		const hasFailures =
			result.summary.failedTests > 0 ||
			result.summary.failedRequests > 0 ||
			result.summary.failedAssertions > 0;

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

// Handle graceful shutdown
process.on("SIGINT", async () => {
	console.log("\n🛑 Shutting down...");
	await stopMockServer();
	process.exit(0);
});

// Execute the function
console.log("🧪 Starting local JSON file tests...");
runCollections()
	.then(result => {
		if (result) {
			console.log("🎉 All local tests completed successfully!");
			process.exit(0);
		}
	})
	.catch(error => {
		console.error("❌ Unexpected error:", error);
		process.exit(1);
	});
