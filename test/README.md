# Test Directory

This directory contains all test-related files for Chappie.

## File Structure

```
test/
├── test.js                     # Main test runner
├── mock-server.js              # Local HTTP server for testing
├── LocalTestCollection.json    # Bruno collection for local testing
├── Vars.json                   # Original variable test collection
├── BrokenTestCollection.json   # Collection with intentional errors
├── WorkingTestCollection.json  # Basic working collection
└── ImageCollection.json        # Collection for image testing
```

## Usage

### Run all tests:

```bash
npm run test
```

### Start mock server manually:

```bash
npm run mock-server
```

## Test Collections

### LocalTestCollection.json

- Uses local mock server (localhost:3001)
- Tests Bruno variable functionality
- Sets and uses variables between requests

### Vars.json

- Original test collection for variable interpolation
- Uses external JSONPlaceholder API

### BrokenTestCollection.json

- Contains intentional errors for testing error handling
- Uses malformed URLs and incorrect assertions

### WorkingTestCollection.json

- Basic working collection with simple assertions
- Good for testing basic functionality

### ImageCollection.json

- Tests image comparison functionality
- Downloads and compares placeholder images

## Mock Data

The mock server serves data from the `../mock-data/` directory:

- All todos: `GET /todos`
- Specific todo: `GET /todos/:id`

## Adding New Tests

1. Create a new Bruno collection JSON file
2. Add it to this directory
3. Update `test.js` to include the new collection (if needed)
4. Run tests with `npm run test`
