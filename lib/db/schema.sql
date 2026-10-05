-- 共用契約：Turso（libSQL）資料表結構
-- 依 SPEC §6，欄位對應 data/cardif_seed_data.json。改動需走 contract/<主題> 分支 + PR。
-- 慣例：
--   - (json) 欄位存 JSON 字串（TEXT），讀出後先經 zod 驗證
--   - 布林存 INTEGER 0/1
--   - retrieved_at 為擷取日期 YYYY-MM-DD，用來產生卡片的 sources
--   - 全部用 IF NOT EXISTS，scripts/seed.ts 可重複執行

-- 服務登錄表（seed: services[]）
CREATE TABLE IF NOT EXISTS services (
  id                 TEXT PRIMARY KEY,           -- 例：change_beneficiary
  name               TEXT NOT NULL,
  category           TEXT NOT NULL,              -- 保單變更／保單借款／理賠／網路服務
  url                TEXT NOT NULL,              -- 官網來源頁
  channels           TEXT NOT NULL DEFAULT '[]', -- json: string[]
  online_available   TEXT,                       -- seed 是說明文字（可／部分／頁面未說明…），不是布林
  requires_login     INTEGER NOT NULL DEFAULT 0,
  apply_time         TEXT,
  effective_time     TEXT,
  documents          TEXT NOT NULL DEFAULT '[]', -- json: string[]
  notes              TEXT NOT NULL DEFAULT '[]', -- json: string[]
  precheck_questions TEXT NOT NULL DEFAULT '[]', -- json: string[]
  keywords           TEXT NOT NULL DEFAULT '[]', -- json: string[]（含別名）
  related_forms      TEXT NOT NULL DEFAULT '[]', -- json: string[]，對應 forms.id
  agent_notes        TEXT NOT NULL DEFAULT '[]', -- json: string[]，業務員專用
  extra              TEXT NOT NULL DEFAULT '{}', -- json: 其他服務專屬欄位（transfer_companies_note、partner_hospitals_note…）
  retrieved_at       TEXT NOT NULL
);

-- 表單（seed: forms[]）
CREATE TABLE IF NOT EXISTS forms (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  form_group   TEXT,          -- 同名表單不同保單類型版本共用的群組 id（例：form_contract_change）
  policy_type  TEXT CHECK (policy_type IN ('protection', 'investment', 'participating')), -- NULL = 不分類型
  url          TEXT,          -- 檔案直連（理賠表單 PDF 有；a311 表單目前沒有）
  page         TEXT,          -- 表單所在官網頁面
  note         TEXT,
  retrieved_at TEXT NOT NULL
);

-- 常見問題（seed: faq[]，以及隊友B 的 data/faq_extra.json）
CREATE TABLE IF NOT EXISTS faq (
  id           TEXT PRIMARY KEY,   -- seed 無 id，由 seed.ts 產生穩定 id
  q            TEXT NOT NULL,
  a            TEXT NOT NULL,
  source       TEXT,               -- 官網網址；自建 FAQ 可能為 NULL
  origin       TEXT NOT NULL DEFAULT 'official' CHECK (origin IN ('official', 'extra')),
  retrieved_at TEXT NOT NULL
);

-- 醫院（seed: services[claim_hospital_upload].partner_hospitals）
CREATE TABLE IF NOT EXISTS hospitals (
  name                  TEXT PRIMARY KEY,           -- 正式名稱（臺 字）
  aliases               TEXT NOT NULL DEFAULT '[]', -- json: string[]（台中榮總、台大…）
  claim_hospital_upload INTEGER NOT NULL DEFAULT 0  -- 是否為醫起通合作醫院
);

-- 理賠應備文件（seed: claim_document_requirements）
CREATE TABLE IF NOT EXISTS claim_requirements (
  claim_type   TEXT PRIMARY KEY,           -- 例：住院醫療
  documents    TEXT NOT NULL DEFAULT '[]', -- json: string[]
  source       TEXT NOT NULL,
  retrieved_at TEXT NOT NULL
);

-- 理賠通則（seed: claim_general_rules）
CREATE TABLE IF NOT EXISTS claim_rules (
  id           INTEGER PRIMARY KEY,  -- 依 seed 陣列順序
  rule         TEXT NOT NULL,
  source       TEXT NOT NULL,
  retrieved_at TEXT NOT NULL
);

-- 聯絡資訊（seed: contacts，key/value）
CREATE TABLE IF NOT EXISTS contacts (
  key          TEXT PRIMARY KEY,  -- hotline / address / outbound_call_number
  value        TEXT NOT NULL,
  retrieved_at TEXT NOT NULL
);

-- 知識庫健檢（seed: known_inconsistencies；F7 也會寫入自動偵測結果）
CREATE TABLE IF NOT EXISTS known_inconsistencies (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  topic      TEXT NOT NULL,
  detail     TEXT NOT NULL,
  status     TEXT NOT NULL,
  origin     TEXT NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual', 'auto')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 全文切塊（P1，F8）。向量維度需與 OPENAI_EMBEDDING_MODEL 一致
-- （text-embedding-3-small = 1536；換模型要改這裡並重建索引）
CREATE TABLE IF NOT EXISTS chunks (
  id           TEXT PRIMARY KEY,
  page_url     TEXT NOT NULL,
  title        TEXT,
  content      TEXT NOT NULL,
  embedding    F32_BLOB(1536),
  retrieved_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS chunks_embedding_idx
  ON chunks (libsql_vector_idx(embedding, 'metric=cosine'));

-- 模擬身分（data/personas.json，全部虛構）
CREATE TABLE IF NOT EXISTS personas (
  id                    TEXT PRIMARY KEY,
  role                  TEXT NOT NULL CHECK (role IN ('visitor', 'policyholder', 'agent')),
  display_name          TEXT NOT NULL,
  online_change_enabled INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS policies (
  policy_no        TEXT PRIMARY KEY,  -- 虛構
  persona_id       TEXT NOT NULL REFERENCES personas (id),
  product_name     TEXT NOT NULL,
  policy_type      TEXT NOT NULL CHECK (policy_type IN ('protection', 'investment', 'participating')),
  product_category TEXT NOT NULL,
  payment_method   TEXT NOT NULL CHECK (payment_method IN ('credit_card', 'bank_transfer', 'other'))
);

-- 對話紀錄（不存個資：question 寫入前先遮蔽身分證字號、電話等）
CREATE TABLE IF NOT EXISTS chat_logs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id      TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('visitor', 'policyholder', 'agent')), -- 提問時的身分
  question        TEXT NOT NULL,      -- 已遮蔽
  matched_service TEXT,               -- services.id；NULL = 沒對到服務
  had_source      INTEGER NOT NULL DEFAULT 0,
  handoff         INTEGER NOT NULL DEFAULT 0,
  feedback        INTEGER CHECK (feedback IN (1, -1)), -- 讚 1／倒讚 -1／未回饋 NULL
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS chat_logs_created_at_idx ON chat_logs (created_at);

-- 回應快取（SPEC §7：相同問題 + 相同身分 24 小時內回傳快取）
CREATE TABLE IF NOT EXISTS response_cache (
  cache_key  TEXT PRIMARY KEY,  -- hash(正規化問題 + 身分 id)
  response   TEXT NOT NULL,     -- json: ResponseSchema
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
