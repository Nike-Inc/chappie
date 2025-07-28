# Chappie

## What is Chappie?

Chappie is a test runner for Bruno collections. The Bruno CLI runner doesn't allow for custom response handlers, which is possible using Postman and Newman. Chappie solves this by parsing your Bruno collection and running the tests related to the responses. If the API returns an image, Chappie will use Sharp and Pixelmatch to either save the result or compare the result to an existing image.

## Features

- Concurrent requests
- Multiple iterations
- Test reports
- Image comparison
- JSON schema validation
- Bruno response tests

## Usage

### Install

```
yarn add chappie-runner
```

NPM:

```
npm install chappie-runner
```

### Run

```
import { chappie } from "chappie-runner";

chappie.run({
	collection: "./TestCollection.json", // the relative location of the collection
	iterations: 1, // how many times to run the collection
	concurrent: 1, // how many parallel runs there should be
	actualImagesFolder:  './actual-images', // where to store the image results
	baseImagesFolder'./base-images', // where to store the base images
	diffImagesFolder'./diff-images', // where to store the diff images (if they exist),
	onTestError: error => {
		console.log("on test error: ", error.message);
	},
	onRequestError: error => {
		console.log("on request error: ", error.message);
	},
	onBeforeRequest: request => {
		console.log("on before request: ", request.url);
	},
	onAfterRequest: response => {
		console.log("on after request: ", response.type);
	},
});
```

### Reports

Chappie also supports JUNIT tests.

```
chappie.run({
	collection: "./TestCollection.json", // the relative location of the collection
 	reporter: {
		enabled: true,
		name: 'my-report-name',
		output: './reports'
	},
});
```

## Roadmap

- ✅ Image comparison
- ✅ JSON validation
- ⬜️ Auth and token support
