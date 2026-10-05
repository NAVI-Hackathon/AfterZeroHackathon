export class ApiError extends Error {
  constructor(code, message, status = 502) { super(message); this.code = code; this.status = status; }
}
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const known = error instanceof ApiError;
  const malformed = error.type === 'entity.parse.failed';
  const tooLarge = error.type === 'entity.too.large';
  const code = known ? error.code : malformed ? 'INVALID_INPUT' : tooLarge ? 'REQUEST_TOO_LARGE' : 'INTERNAL_ERROR';
  const status = known ? error.status : malformed ? 400 : tooLarge ? 413 : 500;
  // Log metadata only: no request text, provider bodies, environment values or credentials.
  if (status >= 500) console.warn(JSON.stringify({ event: 'api_error', code, status }));
  res.status(status).json({ success: false, error: { code, message: known ? error.message : malformed ? '請提供有效的 JSON 資料。' : tooLarge ? '輸入資料過大。' : '目前暫時無法處理，請稍後再試。' } });
}
