import fs from "fs";
import path from "path";

function clearDirectory(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((file) => {
      const filePath = path.join(directoryPath, file);
      if (fs.lstatSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      }
    });
    console.log(`Cleared all files in directory: ${directoryPath}`);
  }
}

export const prepareFolders = (config) => {
  const { baseImagesFolder, actualImagesFolder, diffImagesFolder } = config;
  if (!fs.existsSync(baseImagesFolder)) {
    fs.mkdirSync(baseImagesFolder, { recursive: true });
  }
  if (!fs.existsSync(actualImagesFolder)) {
    fs.mkdirSync(actualImagesFolder, { recursive: true });
  }
  if (!fs.existsSync(diffImagesFolder)) {
    fs.mkdirSync(diffImagesFolder, { recursive: true });
  }
  clearDirectory(actualImagesFolder);
  clearDirectory(diffImagesFolder);
};
