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

module.exports = { createDeckRegionCrop };
