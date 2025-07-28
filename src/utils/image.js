import sharp from "sharp";
import { join } from "path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import fs from "fs";
import { readFileSync } from "fs";
import { Buffer } from "buffer";
import { expect } from "chai";
import chalk from "chalk";
export const compareImages = async (config) => {
  const {
    response,
    item,
    actualImagesFolder,
    baseImagesFolder,
    testName,
    diffImagesFolder,
  } = config;
  let actualImage;
  let pngBuffer;

  const buffer = Buffer.from(response.body, "binary");
  pngBuffer = await sharp(buffer).png().toBuffer();
  actualImage = PNG.sync.read(pngBuffer);

  const baseImagePath = join(baseImagesFolder, `${testName}.png`);

  if (!fs.existsSync(baseImagePath)) {
    fs.writeFileSync(baseImagePath, pngBuffer, {
      encoding: null,
    });
    console.log(chalk.bgCyan(`Base image saved at ${baseImagePath}`));
  }

  const baseImage = PNG.sync.read(readFileSync(baseImagePath));
  const { width, height } = baseImage;
  const diff = new PNG({ width, height });
  try {
    const numDiffPixels = pixelmatch(
      baseImage.data,
      actualImage.data,
      diff.data,
      width,
      height,
      { threshold: 0.1 },
    );

    const totalPixels = width * height;
    const correctPixels = totalPixels - numDiffPixels;
    const correctness = correctPixels / totalPixels;
    expect(correctness).to.be.greaterThan(0.99);
    console.log(chalk.green(`SUCCESS! ${item.name} -- Image matches`));
  } catch (error) {
    const diffImagePath = join(diffImagesFolder, `${testName}.png`);
    fs.writeFileSync(diffImagePath, PNG.sync.write(diff));
    throw error;
  } finally {
    const actualImagePath = join(actualImagesFolder, `${testName}.png`);
    fs.writeFileSync(actualImagePath, pngBuffer, {
      encoding: null,
    });
    console.log(chalk.dim(`Actual image saved at ${actualImagePath}`));
  }
};
