/**
 * deck-optimizer Express 서버 진입점
 *
 * 역할:
 * - Express 앱 초기화 및 미들웨어 등록
 * - 라우터 연결
 * - 서버 시작
 */

'use strict';

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// 라우터 import
const healthRouter = require('./routes/health');
const ocrRouter = require('./routes/ocr');

// 미들웨어 import
const errorHandler = require('./middleware/errorHandler');

// .env 파일 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ─── 미들웨어 ────────────────────────────────────────────────────────────────

// CORS: 클라이언트(Vite, localhost:5173)의 요청을 허용한다.
app.use(
  cors({
    origin: CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// JSON / URL-encoded 바디 파싱
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// uploads 폴더를 정적 파일로 제공 (업로드된 이미지 등에 접근할 때 사용)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── 라우터 ──────────────────────────────────────────────────────────────────

// 헬스 체크 라우터: /api/health
app.use('/api/health', healthRouter);

// OCR 라우터: /api/ocr (이후 Google Vision API 연동 시 구현)
app.use('/api/ocr', ocrRouter);

// 에러 핸들러: 모든 라우터 등록 후 마지막에 위치해야 한다.
app.use(errorHandler);

// ─── 서버 시작 ────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[server] 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  console.log(`[server] CORS 허용 출처: ${CLIENT_URL}`);
});

module.exports = app;
