/**
 * OCR 서비스
 *
 * Google Vision API를 이용해 이미지에서 텍스트를 추출한다.
 *
 * 현재 상태: 기본 구조만 작성되어 있다.
 *
 * Google Vision API 연동 방법:
 * 1. `npm install @google-cloud/vision` 설치
 * 2. .env 파일에 GOOGLE_APPLICATION_CREDENTIALS 경로 설정
 * 3. 아래 TODO 부분의 주석을 해제하고 구현한다.
 */

'use strict';

// TODO: Google Vision API 연동 시 아래 주석을 해제한다.
// const vision = require('@google-cloud/vision');
// const client = new vision.ImageAnnotatorClient();

/**
 * 이미지 파일 경로를 받아 텍스트를 추출한다.
 * @param {string} imagePath - 처리할 이미지의 절대 경로
 * @returns {Promise<string>} 추출된 텍스트
 */
async function extractText(imagePath) {
  // TODO: Google Vision API 연동 후 아래 코드를 실제 구현으로 교체한다.
  //
  // const [result] = await client.textDetection(imagePath);
  // const detections = result.textAnnotations;
  // if (!detections || detections.length === 0) return '';
  // return detections[0].description || '';

  // 현재는 플레이스홀더 응답을 반환한다.
  console.log(`[ocrService] extractText 호출됨: ${imagePath}`);
  return '(OCR 기능은 Google Vision API 연동 후 사용 가능합니다.)';
}

module.exports = { extractText };
