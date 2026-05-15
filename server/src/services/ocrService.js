'use strict';

const path = require('path');
const vision = require('@google-cloud/vision');

const client = new vision.ImageAnnotatorClient({
  keyFilename: path.resolve(__dirname, '../../credentials/google-vision-key.json'),
});

/**
 * 이미지 파일 경로를 받아 텍스트를 추출한다.
 * @param {string} imagePath - 처리할 이미지의 절대 경로
 * @returns {Promise<string>} 추출된 텍스트
 */
async function extractText(imagePath) {
  console.log(`[ocrService] extractText 호출됨: ${imagePath}`);

  const [result] = await client.textDetection(imagePath);
  const detections = result.textAnnotations;

  if (!detections || detections.length === 0) return '';
  return detections[0].description || '';
}

module.exports = { extractText };
