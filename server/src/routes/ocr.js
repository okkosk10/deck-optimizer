'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { processImage, processDeckScreenshot } = require('../services/ocr');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('허용되지 않는 파일 형식입니다. jpg, jpeg, png, webp만 업로드할 수 있습니다.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

async function safeUnlink(filePath) {
  if (!filePath) return;

  try {
    await fs.promises.unlink(filePath);
  } catch (_err) {
    // Temporary upload cleanup is best-effort.
  }
}

function getClientErrorMessage(error, fallback) {
  const message = error instanceof Error ? error.message : '';

  if (message.includes('GOOGLE_APPLICATION_CREDENTIALS')) {
    return message;
  }

  if (message.includes('Google Vision 인증 파일')) {
    return message;
  }

  return fallback;
}

function decodeOriginalName(originalName) {
  try {
    return Buffer.from(originalName, 'latin1').toString('utf8');
  } catch (_err) {
    return originalName;
  }
}

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
    return res.status(500).json({
      success: false,
      error: getClientErrorMessage(error, 'OCR 처리 실패'),
    });
  } finally {
    await safeUnlink(filePath);
  }
});

router.post('/batch', upload.array('images', 10), async (req, res) => {
  const files = req.files || [];

  if (files.length === 0) {
    return res.status(400).json({ success: false, error: '이미지 파일이 필요합니다.' });
  }

  console.time('OCR_BATCH_PROCESS');
  try {
    const data = [];

    for (const [index, file] of files.entries()) {
      const { rawText, parsed, cards, preprocessing, warnings } = await processDeckScreenshot(file.path);
      data.push({
        index,
        fileName: decodeOriginalName(file.originalname),
        rawText,
        parsed,
        cards,
        preprocessing,
        warnings,
      });
    }

    console.timeEnd('OCR_BATCH_PROCESS');
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.timeEnd('OCR_BATCH_PROCESS');
    console.error('[OCR_BATCH] 처리 중 오류:', error.message);
    return res.status(500).json({
      success: false,
      error: getClientErrorMessage(error, 'OCR 배치 처리 실패'),
    });
  } finally {
    await Promise.all(files.map((file) => safeUnlink(file.path)));
  }
});

module.exports = router;
