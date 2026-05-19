'use strict';

const path = require('path');
const sharp = require('sharp');

const DECK_REGION_RATIOS = {
  left: 0.545,
  top: 0.235,
  width: 0.425,
  height: 0.615,
};

const MIN_VISIBLE_CARD_BORDER_HEIGHT = 100;

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
  const { data, info } = await sourceImage.raw().toBuffer({ resolveWithObject: true });
  const metadata = { width: info.width, height: info.height };
  const deckRegion = toSafeRegion(metadata, DECK_REGION_RATIOS);
  const parsedPath = path.parse(imagePath);
  const detectedBorders = detectCardLeftBorders(data, info);
  const slots = [];

  for (const [index, border] of detectedBorders.entries()) {
    const region = toCardRegion(border, detectedBorders, metadata);

    if (region.width < 80 || region.height < 110) continue;

    const outputPath = path.join(parsedPath.dir, `${parsedPath.name}-slot-${index + 1}.png`);

    await sharp(imagePath).extract(region).png().toFile(outputPath);
    slots.push({
      path: outputPath,
      row: border.row,
      column: border.column,
      region,
    });
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

function isCardBorderPixel(data, info, x, y) {
  if (x < info.width * 0.25 || y < 70 || y > info.height - 35) return false;

  const offset = (y * info.width + x) * info.channels;
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];

  return red > 185 && green < 160 && blue > 80 && red - green > 40 && red - blue > 20;
}

function detectCardLeftBorders(data, info) {
  const visited = new Uint8Array(info.width * info.height);
  const queue = [];
  const borders = [];
  const startX = Math.floor(info.width * 0.25);

  for (let y = 70; y < info.height - 35; y += 1) {
    for (let x = startX; x < info.width - 10; x += 1) {
      const index = y * info.width + x;

      if (visited[index] || !isCardBorderPixel(data, info, x, y)) continue;

      const component = floodFillBorder(data, info, visited, queue, index);
      const width = component.maxX - component.minX + 1;
      const height = component.maxY - component.minY + 1;

      if (component.count > 120 && width >= 4 && width <= 14 && height >= MIN_VISIBLE_CARD_BORDER_HEIGHT) {
        borders.push({ ...component, width, height });
      }
    }
  }

  return assignGridPositions(borders.sort((a, b) => a.minY - b.minY || a.minX - b.minX));
}

function floodFillBorder(data, info, visited, queue, startIndex) {
  let minX = startIndex % info.width;
  let maxX = minX;
  let minY = Math.floor(startIndex / info.width);
  let maxY = minY;
  let count = 0;

  queue.length = 0;
  queue.push(startIndex);
  visited[startIndex] = 1;

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const pixelIndex = queue[queueIndex];
    const x = pixelIndex % info.width;
    const y = Math.floor(pixelIndex / info.width);

    count += 1;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    for (const nextIndex of [pixelIndex + 1, pixelIndex - 1, pixelIndex + info.width, pixelIndex - info.width]) {
      if (nextIndex < 0 || nextIndex >= info.width * info.height) continue;

      const nextX = nextIndex % info.width;
      const nextY = Math.floor(nextIndex / info.width);

      if (Math.abs(nextX - x) > 1 || visited[nextIndex]) continue;
      if (!isCardBorderPixel(data, info, nextX, nextY)) continue;

      visited[nextIndex] = 1;
      queue.push(nextIndex);
    }
  }

  return { minX, minY, maxX, maxY, count };
}

function assignGridPositions(borders) {
  const rows = [];

  for (const border of borders) {
    let row = rows.find((items) => Math.abs(items[0].minY - border.minY) < 40);

    if (!row) {
      row = [];
      rows.push(row);
    }

    row.push(border);
  }

  rows.sort((a, b) => a[0].minY - b[0].minY);

  return rows.flatMap((row, rowIndex) =>
    row
      .sort((a, b) => a.minX - b.minX)
      .map((border, columnIndex) => ({
        ...border,
        row: rowIndex,
        column: columnIndex,
      }))
  );
}

function toCardRegion(border, borders, metadata) {
  const sameRow = borders
    .filter((item) => item.row === border.row && item.minX > border.minX)
    .sort((a, b) => a.minX - b.minX);
  const nextInRow = sameRow[0];
  const previousInRow = borders
    .filter((item) => item.row === border.row && item.minX < border.minX)
    .sort((a, b) => b.minX - a.minX)[0];
  const neighborGap = nextInRow?.minX - border.minX || border.minX - previousInRow?.minX;
  const inferredWidth = neighborGap ? Math.floor(neighborGap * 0.94) : Math.floor(metadata.width * 0.105);
  const width = Math.min(Math.max(inferredWidth, 92), metadata.width - border.minX);
  const top = Math.max(0, border.minY - Math.floor(width * 0.34));
  const height = Math.min(Math.floor(width * 1.43), metadata.height - border.minY);

  return {
    left: Math.max(0, border.minX - 2),
    top,
    width: Math.min(width, metadata.width - Math.max(0, border.minX - 2)),
    height: Math.min(height, metadata.height - top),
  };
}

module.exports = { createDeckRegionCrop, createCardSlotCrops };
