/**
 * OCR 라우터
 *
 * POST /api/ocr/upload
 * - 이미지를 업로드하고 Google Vision API로 OCR 처리를 수행한다.
 * - OCR 성공/실패 여부와 무관하게 업로드된 임시 파일을 삭제한다.
 * - 결과를 rawText + parsed 구조로 반환한다.
 */

'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { processImage } = require('../services/ocr');

// ─── multer 설정 ──────────────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

// jpg/jpeg/png/webp 만 허용
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('허용되지 않는 파일 형식입니다. (jpg, jpeg, png, webp)'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 최대 10MB
});

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

/**
 * 업로드된 임시 파일을 안전하게 삭제한다.
 * 파일이 이미 없거나 삭제에 실패해도 예외를 던지지 않는다.
 *
 * @param {string | undefined} filePath
 */
async function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (_err) {
    // 파일이 없거나 이미 삭제된 경우 무시
  }
}

// ─── 라우터 ───────────────────────────────────────────────────────────────────

// POST /api/ocr/upload
router.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: '이미지 파일이 필요합니다.' });
  }

  const filePath = req.file.path;

  console.time('OCR_PROCESS');
  try {
    const { rawText, parsed } = await processImage(filePath);

    console.timeEnd('OCR_PROCESS');
    return res.status(200).json({
      success: true,
      data: { rawText, parsed },
    });
  } catch (error) {
    console.timeEnd('OCR_PROCESS');
    console.error('[OCR] 처리 중 오류:', error.message);
    return res.status(500).json({ success: false, error: 'OCR 처리 실패' });
  } finally {
    await safeUnlink(filePath);
  }
});

module.exports = router;
