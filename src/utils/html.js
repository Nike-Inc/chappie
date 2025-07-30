import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import path from "path";
import { fileURLToPath } from "url";

const currentFilePath = fileURLToPath(import.meta.url);
const __dirname = path.dirname(currentFilePath);
const makeHtmlOutput = async (results, outputPath) => {
	const reportPath = join(__dirname, "templates", "html-template.html");
	const template = readFileSync(reportPath, "utf8");

	mkdirSync(path.dirname(outputPath), { recursive: true });

	writeFileSync(
		outputPath,
		template.replace("__RESULTS_JSON__", JSON.stringify(results, null, 2))
	);
};

export default makeHtmlOutput;
