import { createServer } from "http";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import path from "path";

const currentFilePath = fileURLToPath(import.meta.url);
const __dirname = path.dirname(currentFilePath);

const server = createServer((req, res) => {
	// Enable CORS
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type");
	res.setHeader("Content-Type", "application/json");

	console.log(`📡 ${req.method} ${req.url}`);

	try {
		if (req.url === "/todos") {
			// Return all todos
			const todos = readFileSync(
				join(__dirname, "..", "mock-data", "todos.json"),
				"utf8"
			);
			res.writeHead(200);
			res.end(todos);
		} else if (req.url.match(/^\/todos\/\d+$/)) {
			// Return specific todo by ID
			const id = req.url.split("/")[2];
			const todoFile = join(__dirname, "..", "mock-data", `todo-${id}.json`);

			try {
				const todo = readFileSync(todoFile, "utf8");
				res.writeHead(200);
				res.end(todo);
			} catch (err) {
				// If specific todo file doesn't exist, return a generic response
				res.writeHead(200);
				res.end(
					JSON.stringify({
						userId: 1,
						id: parseInt(id),
						title: `Todo item ${id}`,
						completed: false,
					})
				);
			}
		} else {
			// 404 for other routes
			res.writeHead(404);
			res.end(JSON.stringify({ error: "Not found" }));
		}
	} catch (error) {
		console.error("Server error:", error);
		res.writeHead(500);
		res.end(JSON.stringify({ error: "Internal server error" }));
	}
});

const PORT = 3001;

server.listen(PORT, "localhost", () => {
	console.log(`🚀 Mock server running at http://localhost:${PORT}`);
	console.log("Available endpoints:");
	console.log("  GET /todos - Get all todos");
	console.log("  GET /todos/:id - Get specific todo");
	console.log("\nPress Ctrl+C to stop the server");
});

// Graceful shutdown
process.on("SIGINT", () => {
	console.log("\n🛑 Shutting down mock server...");
	server.close(() => {
		console.log("✅ Mock server stopped");
		process.exit(0);
	});
});

export { server };
