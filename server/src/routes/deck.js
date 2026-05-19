'use strict';

const express = require('express');
const { evaluateDeck } = require('../services/deck/evaluator');

const router = express.Router();

router.post('/evaluate', (req, res) => {
  const cards = req.body?.cards;

  if (!Array.isArray(cards)) {
    return res.status(400).json({
      success: false,
      error: 'cards 배열이 필요합니다. cardId 문자열 또는 OCR 카드 객체를 전달하세요.',
    });
  }

  return res.status(200).json({
    success: true,
    data: evaluateDeck(cards),
  });
});

module.exports = router;
