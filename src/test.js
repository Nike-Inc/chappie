import { chappie } from "./index.js";

async function runCollections() {
  try {
    console.log("Starting first collection...");
    const result = await chappie.run({
      collection: "./BrokenTestCollection.json",
      iterations: 3,
      concurrency: 2,
      onTestError: (error) => {
        console.log("on test error: ", error.message);
      },
      onRequestError: (error) => {
        console.log("on request error: ", error.message);
      },
      onBeforeRequest: (request) => {
        console.log("on before request: ", request.url);
      },
      onAfterRequest: (response) => {
        console.log("on after request: ", response.type);
      },
      reporter: {
        enabled: true,
        name: "one",
      },
    });
    console.log(
      `First collection completed with: ${result.summary.failedTests} failed tests`,
    );

    console.log("Starting second collection...");

    await chappie.run({
      collection: "./WorkingTestCollection.json",
      reporter: {
        enabled: true,
        name: "two",
      },
    });
    console.log("Second collection completed");

    console.log("Starting image collection...");

    await chappie.run({
      collection: "./ImageCollection.json",
      reporter: {
        enabled: true,
        name: "image",
      },
    });
    console.log("Image collection completed");
  } catch (error) {
    console.error("Error running collections:", error);
  }
}

// Execute the function
console.log("Starting test runs...");
runCollections().then(() => console.log("All collections completed"));
