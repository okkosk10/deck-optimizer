'use strict';

const path = require('path');
const sharp = require('sharp');

const DECK_REGION_RATIOS = {
  left: 0.545,
  top: 0.235,
  width: 0.425,
  height: 0.615,
};

function toSafeRegion(metadata, ratios) {
  const imageWidth = metadata.width;
  const imageHeight = metadata.height;

  if (!imageWidth || !imageHeight) {
    throw new Error('이미지 크기를 읽을 수 없습니다.');
  }

  const left = Math.max(0, Math.floor(imageWidth * ratios.left));
  const top = Math.max(0, Math.floor(imageHeight * ratios.top));
  const width = Math.min(imageWidth - left, Math.floor(imageWidth * ratios.width));
  const height = Math.min(imageHeight - top, Math.floor(imageHeight * ratios.height));

  if (width <= 0 || height <= 0) {
    throw new Error('카드 영역 crop 크기가 올바르지 않습니다.');
  }

  return { left, top, width, height };
}

async function createDeckRegionCrop(imagePath) {
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  const region = toSafeRegion(metadata, DECK_REGION_RATIOS);
  const parsedPath = path.parse(imagePath);
  const outputPath = path.join(parsedPath.dir, `${parsedPath.name}-deck-region.png`);

  await image.extract(region).png().toFile(outputPath);

  return {
    path: outputPath,
    region,
    sourceSize: {
      width: metadata.width,
      height: metadata.height,
    },
  };
}

async function createCardSlotCrops(imagePath) {
  const sourceImage = sharp(imagePath);
  const metadata = await sourceImage.metadata();
  const deckRegion = toSafeRegion(metadata, DECK_REGION_RATIOS);
  const parsedPath = path.parse(imagePath);
  const columns = 4;
  const rows = 3;
  const cellWidth = deckRegion.width / columns;
  const rowStep = deckRegion.height * 0.455;
  const cardWidth = Math.floor(cellWidth * 0.95);
  const cardHeight = Math.floor(deckRegion.height * 0.43);
  const xInset = Math.floor(cellWidth * 0.025);
  const yInset = Math.floor(deckRegion.height * 0.012);
  const slots = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const left = Math.max(0, Math.floor(deckRegion.left + column * cellWidth + xInset));
      const top = Math.max(0, Math.floor(deckRegion.top + row * rowStep + yInset));
      const width = Math.min(cardWidth, metadata.width - left);
      const height = Math.min(cardHeight, metadata.height - top);

      if (width <= 24 || height <= 24) continue;

      const outputPath = path.join(parsedPath.dir, `${parsedPath.name}-slot-${row + 1}-${column + 1}.png`);
      const region = { left, top, width, height };

      await sharp(imagePath).extract(region).png().toFile(outputPath);
      slots.push({
        path: outputPath,
        row,
        column,
        region,
      });
    }
  }

  return {
    slots,
    deckRegion,
    sourceSize: {
      width: metadata.width,
      height: metadata.height,
    },
  };
}

module.exports = { createDeckRegionCrop, createCardSlotCrops };
