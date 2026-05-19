'use strict';

const path = require('path');
const fs = require('fs');
const vision = require('@google-cloud/vision');

let client = null;

function getVisionClient() {
  if (client) return client;

  const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyFilename) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS 환경 변수가 설정되지 않았습니다. server/.env 파일을 확인하세요.');
  }

  const resolvedPath = path.isAbsolute(keyFilename)
    ? keyFilename
    : path.resolve(process.cwd(), keyFilename);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Google Vision 인증 파일을 찾을 수 없습니다: ${resolvedPath}`);
  }

  client = new vision.ImageAnnotatorClient({ keyFilename: resolvedPath });
  return client;
}

module.exports = { getVisionClient };
