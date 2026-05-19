'use strict';

const path = require('path');
const fs = require('fs');
const vision = require('@google-cloud/vision');

/**
 * Google Vision ImageAnnotatorClient 인스턴스를 반환한다.
 * 인증 키 경로는 GOOGLE_APPLICATION_CREDENTIALS 환경변수로 제어한다.
 * (server/.env → dotenv.config() 로 주입)
 * 싱글톤 패턴: 첫 번째 호출 시에만 생성하고 이후 재사용한다.
 */
let _client = null;

function getVisionClient() {
  if (_client) return _client;

  const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyFilename) {
    throw new Error(
      'GOOGLE_APPLICATION_CREDENTIALS 환경 변수가 설정되지 않았습니다. server/.env 파일을 확인하세요.'
    );
  }

  // 상대 경로인 경우 process.cwd() 기준으로 절대 경로로 변환
  const resolvedPath = path.isAbsolute(keyFilename)
    ? keyFilename
    : path.resolve(process.cwd(), keyFilename);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Google Vision 인증 파일을 찾을 수 없습니다: ${resolvedPath}`);
  }

  _client = new vision.ImageAnnotatorClient({ keyFilename: resolvedPath });
  return _client;
}

module.exports = { getVisionClient };
