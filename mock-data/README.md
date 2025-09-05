# Mock Data Setup

This directory contains JSON files that are served by the mock server for local testing.

## File Structure

- `todos.json` - Array of all todos (served at `/todos`)
- `todo-{id}.json` - Individual todo items (served at `/todos/{id}`)

## Usage

### 1. Start the mock server manually:

```bash
npm run mock-server
```

### 2. Run tests with the mock server:

```bash
npm run test
```

The test script automatically starts and stops the mock server.

## Available Endpoints

- `GET /todos` - Returns all todos from `todos.json`
- `GET /todos/:id` - Returns specific todo from `todo-{id}.json`

## Customizing Responses

### Adding new todos:

1. Add the todo to the `todos.json` array
2. Create a new `todo-{id}.json` file with the individual todo data

### Modifying existing responses:

1. Edit the appropriate JSON file
2. Restart the server (if running manually)

## Example Files

- `todo-1.json` - Basic todo item
- `todo-2.json` - Another basic todo item
- `todo-3.json` - Incomplete todo
- `todo-4.json` - Completed todo

## Testing Different Scenarios

You can create JSON files for different test scenarios:

- Error responses
- Edge cases
- Different data structures
- Empty responses

Just create the appropriate JSON file and the mock server will serve it automatically.
