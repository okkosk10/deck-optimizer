'use strict';

const { getVisionClient } = require('./visionClient');

/**
 * 이미지 파일 경로로 Google Vision textDetection을 호출하고
 * 추출된 원시 텍스트(string)를 반환한다.
 *
 * @param {string} imagePath - 처리할 이미지의 절대 경로
 * @returns {Promise<string>} 추출된 텍스트 (없으면 빈 문자열)
 */
async function extractText(imagePath) {
  const client = getVisionClient();
  const [result] = await client.textDetection(imagePath);
  const detections = result.textAnnotations;

  if (!detections || detections.length === 0) return '';
  return detections[0].description || '';
}

module.exports = { extractText };
