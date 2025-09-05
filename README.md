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
- **Bruno variable support** - Use `{{variable}}` syntax and `bru.setVar()` / `bru.getVar()`

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
	allowCodeExecution: false, // set to true if the collection is trusted
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

### Bruno Variables

Chappie supports Bruno's variable system, allowing you to:

1. **Set variables in tests** using `bru.setVar(key, value)`
2. **Use variables in URLs, headers, and request bodies** with `{{variableName}}` syntax
3. **Access variables in tests** using `bru.getVar(key)`

**Example Bruno Collection with Variables:**

```json
{
	"name": "Variable Example",
	"items": [
		{
			"name": "Set ID Variable",
			"seq": 1,
			"request": {
				"url": "https://jsonplaceholder.typicode.com/todos",
				"method": "GET",
				"tests": "const response = res.getBody();\nif (Array.isArray(response) && response.length > 0) {\n  bru.setVar('ID', response[0].id);\n}"
			}
		},
		{
			"name": "Use ID Variable",
			"seq": 2,
			"request": {
				"url": "https://jsonplaceholder.typicode.com/todos/{{ID}}",
				"method": "GET",
				"tests": "test('Should get specific todo', function() {\n  expect(res.getStatus()).to.equal(200);\n  expect(res.getBody().id).to.equal(bru.getVar('ID'));\n});"
			}
		}
	]
}
```

**Variable Features:**

- Variables are **automatically interpolated** in URLs, headers, and request body values
- Variables are **scoped per iteration** - they reset between iterations
- **Security note:** Variable interpolation respects the `allowCodeExecution` setting

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
- ✅ Bruno variables and interpolation
- ⬜️ Auth and token support
