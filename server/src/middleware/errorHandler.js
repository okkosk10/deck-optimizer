/**
 * 에러 핸들링 미들웨어
 *
 * Express 앱에서 발생하는 모든 예외를 일관된 형식으로 응답한다.
 * app.use()의 마지막에 등록해야 한다.
 *
 * 사용 예시 (src/index.js):
 *   const errorHandler = require('./middleware/errorHandler');
 *   app.use(errorHandler);
 */

'use strict';

/**
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || '서버 내부 오류가 발생했습니다.';

  console.error(`[errorHandler] ${req.method} ${req.path} → ${status}: ${message}`);

  res.status(status).json({
    error: message,
  });
}

module.exports = errorHandler;
