'use strict';

const { extractText } = require('./extractText');
const { parseCardText } = require('./parseCardText');

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

module.exports = { processImage, extractText, parseCardText };
