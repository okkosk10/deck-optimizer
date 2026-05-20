'use strict';

const fs = require('fs');
const { extractText } = require('./extractText');
const { parseCardText } = require('./parseCardText');
const { correctCards, parseCardSlotText, parseDeckText } = require('./deckParser');
const { createCardSlotCrops, createDeckRegionCrop } = require('./imagePreprocess');

/**
 * 이미지 경로를 받아 OCR 텍스트 추출 및 카드 정보 파싱을 수행한다.
 *
 * @param {string} imagePath - 처리할 이미지의 절대 경로
 * @returns {Promise<{ rawText: string, parsed: object }>}
 */
async function processImage(imagePath) {
  const rawText = await extractText(imagePath);
  const parsed = parseCardText(rawText);
  return { rawText, parsed };
}

async function safeUnlink(filePath) {
  if (!filePath) return;

  try {
    await fs.promises.unlink(filePath);
  } catch (_err) {
    // Temporary preprocessing files are best-effort cleanup.
  }
}

async function processDeckScreenshot(imagePath) {
  const crop = await createDeckRegionCrop(imagePath);
  const slotCrop = await createCardSlotCrops(imagePath);
  const temporaryFiles = [crop.path, ...slotCrop.slots.map((slot) => slot.path)];

  try {
    const rawText = await extractText(crop.path);
    const slotCards = [];

    for (const slot of slotCrop.slots) {
      const slotText = await extractText(slot.path);
      const card = parseCardSlotText(slotText, slot);

      if (card) {
        slotCards.push(card);
      }
    }

    const regionCards = parseDeckText(rawText);
    const correctedSlotCards = correctCards(slotCards, { minConfidence: 0.7, regionRawText: rawText });
    const cards = correctedSlotCards.length > 0 ? correctedSlotCards : regionCards;
    const parsed = cards[0] ?? parseCardText(rawText);

    return {
      rawText,
      parsed,
      cards,
      preprocessing: {
        mode: 'deck-region-crop',
        region: crop.region,
        sourceSize: crop.sourceSize,
        slotCount: slotCrop.slots.length,
      },
      warnings:
        cards.length === 0
          ? ['카드 후보를 찾지 못했습니다. 카드 목록 영역 crop 비율을 조정해야 할 수 있습니다.']
          : [],
    };
  } finally {
    await Promise.all(temporaryFiles.map((filePath) => safeUnlink(filePath)));
  }
}

module.exports = { processImage, processDeckScreenshot, extractText, parseCardText, parseDeckText };
