/**
 * OCR 라우터
 *
 * POST /api/ocr/upload
 * - 이미지를 업로드하고 Google Vision API로 OCR 처리를 요청한다.
 * - 현재는 기본 구조만 작성되어 있으며, Google Vision API 연동은 추후 구현한다.
 *
 * TODO: Google Vision API 연동 시 ocrService를 완성할 것
 */

'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ocrService = require('../services/ocrService');

// multer: 업로드된 파일을 uploads/ 폴더에 저장
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    // 파일명 충돌 방지를 위해 타임스탬프 추가
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

// 이미지 파일만 허용 (보안 필터링)
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('이미지 파일만 업로드 가능합니다. (jpg, png, webp, gif)'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 최대 10MB
});

// POST /api/ocr/upload
// 이미지 업로드 및 OCR 처리 요청
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '이미지 파일이 필요합니다.' });
    }

    // OCR 서비스 호출 (Google Vision API 연동 후 활성화)
    const result = await ocrService.extractText(req.file.path);

    res.status(200).json({
      message: 'OCR 처리 완료',
      filename: req.file.filename,
      text: result,
    });
  } catch (error) {
    console.error('[OCR] 처리 중 오류:', error.message);
    res.status(500).json({ error: 'OCR 처리 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
