/**
 * 헬스 체크 라우터
 *
 * GET /api/health
 * - 서버가 정상 동작 중인지 확인하는 엔드포인트
 * - 클라이언트에서 서버 연결 상태를 확인할 때 사용
 */

'use strict';

const express = require('express');
const router = express.Router();

// GET /api/health
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: '서버가 정상 동작 중입니다.',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
