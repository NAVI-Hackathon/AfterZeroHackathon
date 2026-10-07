import { randomUUID } from 'node:crypto';
import { DocumentAnalysisSchema, DocumentSchema, DOCUMENT_MIME_TYPES, MAX_DOCUMENT_BYTES } from '../../../../shared/journey.js';
import { ApiError } from '../middleware/errorHandler.js';
import { withProviderDeadline } from './providerRequest.js';

function matchesSignature(bytes, mime) {
  if (mime === 'application/pdf') return bytes.subarray(0, 5).toString() === '%PDF-';
  if (mime === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return mime === 'image/webp' && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
}
export async function parseUpload(req) {
  if (!req.is('multipart/form-data') || !Buffer.isBuffer(req.body)) throw new ApiError('INVALID_INPUT', '請以 multipart/form-data 提供文件。', 400);
  let form;
  try { form = await new Request('http://navi.local/upload', { method: 'POST', headers: { 'Content-Type': req.get('content-type') }, body: req.body }).formData(); }
  catch { throw new ApiError('INVALID_INPUT', '上傳格式不完整，請重新選擇文件。', 400); }
  const files = form.getAll('file');
  if ([...form.keys()].some(key => !['file', 'documentType'].includes(key)) || files.length !== 1 || !(files[0] instanceof File) || form.getAll('documentType').length > 1) throw new ApiError('INVALID_INPUT', '請提供一份文件與 documentType。', 400);
  const file = files[0];
  if (!file.size) throw new ApiError('EMPTY_DOCUMENT', '文件是空的，請重新選擇。', 400);
  if (file.size > MAX_DOCUMENT_BYTES) throw new ApiError('DOCUMENT_TOO_LARGE', '文件超過 10 MB，請選擇較小的文件。', 413);
  if (!DOCUMENT_MIME_TYPES.includes(file.type)) throw new ApiError('UNSUPPORTED_FILE_TYPE', '請選擇 PDF、PNG、JPG 或 WebP。', 415);
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!matchesSignature(bytes, file.type)) throw new ApiError('UNSUPPORTED_FILE_TYPE', '文件內容與格式不符，請重新選擇。', 415);
  const documentType = form.get('documentType');
  if (documentType !== null && typeof documentType !== 'string') throw new ApiError('INVALID_INPUT', '請提供有效的 documentType。', 400);
  const filename = file.name.replace(/\\/g, '/').split('/').at(-1).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 180) || 'document';
  return { documentType, bytes, filename, mimeType: file.type, size: file.size };
}
export function calculateDelayMinutes(fields) {
  if (!fields.scheduledDeparture || !fields.actualDeparture) return null;
  const minutes = (Date.parse(fields.actualDeparture) - Date.parse(fields.scheduledDeparture)) / 60000;
  return Number.isFinite(minutes) && minutes >= 0 && minutes <= 525600 ? Math.round(minutes) : null;
}
export function documentVerified(document, threshold) {
  const fields = document.fields;
  const complete = document.documentType === 'boarding_pass'
    ? ['passengerName', 'flightNumber', 'origin', 'destination', 'departureDate'].every(key => Boolean(fields[key]))
    : document.documentType === 'delay_certificate' && calculateDelayMinutes(fields) !== null && Boolean(fields.flightNumber);
  return Boolean(complete && document.confidence >= threshold);
}
export async function analyzeDocument(upload, { provider, config, signal }) {
  if (!provider.analyzeDocument) throw new ApiError('DOCUMENT_INTELLIGENCE_NOT_AVAILABLE', '目前僅支援示範文件流程，真實文件辨識尚未開放。', 501, false);
  return withProviderDeadline(async combined => {
    let analysis;
    for (let attempt = 0; attempt < 2; attempt++) {
      const raw = await provider.analyzeDocument(upload, combined);
      const parsed = DocumentAnalysisSchema.safeParse(raw);
      if (parsed.success) { analysis = parsed.data; break; }
      if (attempt === 1) throw new ApiError('AI_RESPONSE_INVALID', '文件分析結果不完整，請重新嘗試。');
    }
    if (analysis.documentType === 'unknown') throw new ApiError('DOCUMENT_UNRECOGNIZED', '暫時無法辨識這份文件；示範模式請指定登機證或延誤證明。', 422, true);
    const fields = { ...analysis.fields };
    if (analysis.documentType === 'delay_certificate') fields.delayMinutes = calculateDelayMinutes(fields);
    const verified = documentVerified({ ...analysis, fields }, config.journeyConfidenceThreshold);
    return DocumentSchema.parse({ id: randomUUID(), ...analysis, fields, status: verified ? 'verified' : 'needs_review', matchedRequirements: verified ? [analysis.documentType] : [], filename: upload.filename, mimeType: upload.mimeType, size: upload.size, source: provider.mode === 'demo' ? 'demo' : 'live', isMock: provider.mode === 'demo' });
  }, { config, signal });
}
