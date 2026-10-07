import { DOCUMENT_MIME_TYPES, MAX_DOCUMENT_BYTES } from '../../../../shared/journey.js';

/** Returns a zh-TW message for an unacceptable upload, or null when the file can be used. */
export function validateFile(file) {
  if (!file || !file.size) return '這份文件是空的，請重新選擇。';
  if (file.size > MAX_DOCUMENT_BYTES) return '文件超過 10 MB，請選擇較小的檔案。';
  if (!DOCUMENT_MIME_TYPES.includes(file.type)) return '不支援這個檔案格式，請使用 PDF、PNG、JPG 或 WebP。';
  return null;
}
