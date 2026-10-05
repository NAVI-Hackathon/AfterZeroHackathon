/**
 * 環境變數集中讀取與驗證（SPEC §12）。只能在伺服器端與 scripts 使用，不可在 Client Component 匯入。
 * 採延遲驗證：第一次呼叫 getEnv() 時才檢查，避免 `next build` 在沒有 .env 的環境失敗。
 */
import { z } from "zod";

const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_CHAT_MODEL: z.string().min(1),
  OPENAI_EMBEDDING_MODEL: z.string().min(1),
  TURSO_DATABASE_URL: z
    .string()
    .regex(/^(libsql|https?|wss?|file):/, "需為 libsql://、https://、wss:// 或 file: 開頭"),
  /** 本機 file: 資料庫不需要 token */
  TURSO_AUTH_TOKEN: z.string().min(1).optional(),
  ADMIN_PASSWORD: z.string().min(8),
  DAILY_REQUEST_LIMIT: z.coerce.number().int().positive(),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    // 只列出欄位名稱與原因，不印出值
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`環境變數設定錯誤：\n${issues}\n請參考 .env.example`);
  }
  cached = result.data;
  return cached;
}
