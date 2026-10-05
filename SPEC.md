# SPEC — 法巴人壽智慧服務導覽助手（InsurHack 2026 · Theme 2-2）

> 隊伍名稱：AfterZero
> 專案資料夾 / repo：`AfterZeroHackathon`（package.json 的 name 用 `afterzero-hackathon`，npm 不接受大寫）
> 版本：v1.3（2026-10-06）
> 給 AI 開發工具（Codex / Claude Code）：開發前先讀 AGENTS.md 與本文件相關章節。依「里程碑」順序實作，每完成一個里程碑先停下來讓開發者驗收。
> 資料來源檔：`data/cardif_seed_data.json`（官網整理的服務登錄表）、`data/crawl/pages.jsonl` 與 `data/crawl/documents.json`（爬蟲輸出）

---

## 1. 產品定位

不是問答聊天機器人，而是「**理解意圖 → 檢查條件 → 指出最快管道 → 一步帶到位**」的服務導覽助手，嵌入在仿法巴官網的模擬網站上。

**要解決的現況痛點（已實地驗證）**
- 官網沒有站內搜尋；「常見問題」連結只會跳出 LINE QR Code
- 同名表單依保單類型拆成多個版本，使用者要先知道保單類型才選得對
- 同一件事的辦理方式（紙本、My Cardif、App）散在不同頁面
- 重要規則藏在分頁標籤和 PDF 裡
- 入口分散在官網、保戶專區、理專專區、App、LINE 等多個平台

---

## 2. 決策紀錄

| 項目 | 決定 |
|---|---|
| LLM | OpenAI（function calling + embedding）。模型名稱用環境變數，不寫死 |
| 模擬官網 | 仿法巴官網版面與配色，用 CSS 重建；**不盜連或複製官網圖片、logo 檔**，logo 用文字樣式代替；頁尾標註「InsurHack 模擬網站，非官方」 |
| 使用情境 | 訪客、模擬登入保戶、業務員三種身分，**共用同一個引擎**，網頁右上角切換 |
| 介面 | 全部在網頁上，桌機與手機寬度都要能用（RWD） |
| 後台 | 初賽做簡單儀表板 |
| 費用 | 自費，OpenAI 後台設每月硬上限；程式端也要有限流 |
| 技術棧 | Next.js App Router + TypeScript、Turso（libSQL，含向量搜尋）、Tailwind |
| 部署 | Cloudflare（@opennextjs/cloudflare）。若串流或 Node API 相容性卡住超過半天，改部署 Vercel |

---

## 3. 身分與情境

右上角身分切換器，切換後保留同一段對話，方便 demo 時用同一個問題比較三種回答。

| 身分 | 助手知道什麼 | 回答角度 |
|---|---|---|
| 訪客 | 只有公開資訊 | 條件不明就追問 |
| 保戶（模擬登入） | 該保戶的保單清單（類型、繳費方式、是否已開通線上變更） | 直接套用保單資訊，省掉追問；優先推薦線上管道 |
| 業務員 | 公開資訊 + 內部注意事項欄位 | 「如何協助客戶辦理」：要提醒客戶的事、常見退件原因、要帶的文件 |

**模擬保戶（假資料，寫在 `data/personas.json`）**
- 王小明：保障型（醫療險、壽險）、信用卡扣款、已開通 My Cardif 線上變更
- 林美華：投資型 + 分紅型各一張、銀行轉帳扣款、未開通線上變更
- 業務員：陳專員（不需保單資料）

所有個資都是虛構的，畫面上要明顯看得出是範例資料。

---

## 4. 功能需求

### P0（初賽必備）

**F1 仿官網模擬網站**
- 頁面：首頁、保戶服務總覽、常用表單下載、保單變更、保單借款、理賠程序介紹、網路保險服務、名詞解釋
- 內容來自 seed data 與爬蟲結果，保留官網的分頁標籤結構（這本身就是痛點示範）
- 每個可被導覽的元素加上 `data-tour-id`，例如 `data-tour-id="form-beneficiary-change"`
- 驗收：不靠助手時，操作體驗要和官網一樣「難找」，才能凸顯對比

**F2 浮動導覽助手**
- 右下角浮動按鈕，展開成側邊面板；手機寬度時改為全螢幕
- 串流輸出、可中斷、有建議問題快捷鈕
- 驗收：首字 2 秒內出現

**F3 卡片化回應**
- 回應由文字加上 0 到多張卡片組成，卡片類型：
  - `service_flow`：步驟、應備文件、申請時間、生效時間、注意事項、各管道（線上/紙本）
  - `form`：表單名稱、適用保單類型、下載或前往連結
  - `entry_point`：功能入口（例如 My Cardif 某功能），附「帶我去」按鈕
  - `faq`：問答
  - `handoff`：轉客服（電話、時間）
- **每張卡片必附來源**（官網頁面網址、擷取日期）
- 驗收：前端依 JSON schema 渲染，LLM 不可輸出未定義的卡片類型

**F4 條件追問**
- 服務登錄表中有 `precheck_questions` 的服務，在給答案前先問（選項按鈕，不要讓使用者打字）
- 保戶身分已知的條件自動跳過
- 必做的三個情境：變更受益人、變更繳費方式、變更地址
- 驗收：測試題組中這三類題目，追問後導向正確服務與表單

**F5 頁面導覽 overlay**
- 點卡片上的「帶我去」後，跳轉到對應頁面，依步驟框出元素（spotlight），附說明泡泡與「下一步」
- 導覽腳本定義在 `data/tours.json`：`{ tour_id, steps: [{ path, target (data-tour-id), text }] }`
- 若目標在分頁標籤內，要能先自動切換分頁
- 驗收：至少 5 條導覽腳本，對應 demo 情境

**F6 三種身分切換**（見第 3 節）

**F7 後台儀表板（簡易版）**
- 路徑 `/admin`，簡單密碼保護（環境變數）
- 指標：問題總數、各服務被問次數排行、**答不出來的問題清單**（無來源或轉客服）、使用者回饋（讚/倒讚）、各身分使用比例
- 知識庫健檢：列出 `known_inconsistencies` 與自動偵測到的「同一服務不同頁面說法不同」
- 驗收：demo 時能展示「這些問題代表官網該補的內容」

### P1（第三週視進度）
- F8 混合檢索 RAG：爬蟲全文切塊，關鍵字 + 向量搜尋，處理登錄表外的長尾問題
- F9 名詞解釋連動：回答中的專有名詞可點開解釋，並說明「這跟你的保單有什麼關係」

---

## 5. AI 引擎

### 工具（OpenAI function calling）

| 工具 | 用途 |
|---|---|
| `search_services(query)` | 從服務登錄表找候選服務（關鍵字 + 別名） |
| `get_service(service_id)` | 取得完整服務資料，含 precheck、管道、文件 |
| `find_form(service_id, policy_type?)` | 依保單類型回傳正確版本表單 |
| `search_knowledge(query)` | P1：全文檢索 |
| `lookup_hospital(name)` | 醫院別名正規化，判斷是否為醫起通合作醫院（台/臺、簡稱） |
| `get_persona_context()` | 取得目前身分與保單資料 |
| `start_tour(tour_id)` | 回傳導覽腳本 ID 給前端 |
| `handoff(reason)` | 轉客服 |

### 回應格式
- 模型最後輸出必須符合 `ResponseSchema`（zod 定義，前後端共用）：`{ text, cards[], followup_question?, sources[] }`
- `followup_question` 有選項時，前端渲染成按鈕

### 護欄（system prompt 與程式雙重把關）
- 只根據工具回傳的資料回答，找不到就說不知道並 `handoff`，不得自行編造流程、金額、期限
- 不提供投保建議、不判斷能否理賠成功、不承諾理賠結果
- 不要求、不記錄真實個資；使用者若輸入身分證字號等，回覆提醒不要提供並遮蔽記錄
- 每個身分各有一段 system prompt，放在 `lib/prompts/`

---

## 6. 資料模型（Turso）

- `services`：id、name、category、url、channels(json)、online_available、requires_login、apply_time、effective_time、documents(json)、notes(json)、precheck_questions(json)、keywords(json)、agent_notes(json，業務員專用)
- `forms`：id、name、policy_type、url、page、note
- `faq`：id、q、a、source
- `hospitals`：name、aliases(json)、claim_hospital_upload(bool)
- `chunks`（P1）：id、page_url、title、content、embedding（F32_BLOB）
- `personas`、`policies`：模擬資料
- `chat_logs`：id、session_id、role、question、matched_service、had_source、handoff、feedback、created_at（**不存個資，輸入先做遮蔽**）

匯入腳本：`scripts/seed.ts` 讀 `data/*.json` 寫入 Turso，可重複執行。

---

## 7. 非功能需求
- 繁體中文
- 首字 2 秒內、完整回應 5 秒內
- 限流：每個 session 每分鐘 10 則、全站每日上限（環境變數）
- 簡單快取：相同問題 + 相同身分，24 小時內回傳快取結果（省錢也讓 demo 穩定）
- 錯誤時顯示友善訊息與客服電話，不顯示原始錯誤

---

## 8. 評估
- `eval/questions.jsonl`：`{ id, question, persona, expected_service_id, expected_form_id?, must_ask_precheck(bool) }`，目標 50 題以上
- `scripts/eval.ts`：批次跑題組，輸出服務導向準確率、追問正確率、附來源率
- 目標：服務導向準確率 85%+、附來源率 100%

---

## 9. 目錄結構（建議）
```
app/
  (site)/            模擬官網頁面
  admin/             後台儀表板
  api/chat/          串流對話 API
components/
  assistant/         浮動面板、卡片元件、身分切換
  tour/              導覽 overlay
lib/
  contracts/         共用契約：ResponseSchema、persona 型別（改動需雙方同意）
  ai/                工具定義、路由
  prompts/           三種身分的 system prompt
  db/                Turso client、查詢、schema.sql
data/                cardif_seed_data.json、personas.json、tours.json
  crawl/             爬蟲輸出 pages.jsonl、documents.json（pdfs/ 不進 git）
scripts/             seed.ts、eval.ts
  crawler/           cardif_crawler.py
eval/                測試題組
```

---

## 10. 里程碑

| 里程碑 | 內容 | 目標日 |
|---|---|---|
| M0 | Sh 在 main 建立骨架、共用契約初版（response.ts、persona.ts、schema.sql）後才分支 | 10/7 |
| M1 | 部署管線（Sh）／Turso 連線與 seed 匯入（隊友） | 10/8 |
| M2 | 仿官網 8 頁（F1）含 data-tour-id | 10/11 |
| M3 | 對話 API + 工具呼叫 + 卡片渲染（F2、F3） | 10/14 |
| M4 | 條件追問、身分切換（F4、F6） | 10/17 |
| M5 | 導覽 overlay 與 5 條腳本（F5） | 10/21 |
| M6 | 後台儀表板（F7）、eval 腳本跑出第一版分數 | 10/24 |
| M7 | P1 視進度；10/28 功能凍結 | 10/28 |

---

## 10.5 協作方式
- 三人隊伍，以 git 分支協作；規則與目錄負責人見 AGENTS.md
- Sh（Claude Code）：前端——模擬官網、助手介面、卡片、導覽 overlay、後台頁面
- 隊友A（Codex）：AI 引擎與資料——對話 API、工具、prompt、seed、eval 腳本
- 隊友B（Codex）：企劃與測試——測試題組（目標 50 題以上，10/9 前先交 30 題）、自建 FAQ、可用性測試（6–8 人，原官網 vs 我們的版本）、痛點截圖與日期紀錄、簡報與 3 分鐘影片腳本、致電客服確認待查事項
- 測試題組格式見第 8 節，隊友B 產出、隊友A 的 eval 腳本讀取
- 前後端唯一介面是 `lib/contracts/`，前端開發時先用符合 ResponseSchema 的假資料（mock）渲染，不必等 API 完成

## 11. Demo 情境（影片腳本依據）
1. 訪客：「我住院了，在台中榮總看病，怎麼申請理賠？」→ 醫院別名辨識 → 醫起通資格與準備清單 → 提醒仍需請醫院開診斷書
2. 訪客：「我要把受益人改成我老婆」→ 追問是否身故受益人、事故是否已發生 → 表單卡 + 導覽
3. 保戶王小明：「信用卡換卡了」→ 已知信用卡扣款且已開通線上 → 直接導到線上「信用卡卡效卡號變更」
4. 同一題切換成林美華（未開通線上）→ 改導紙本流程，或先引導開通
5. 業務員：「客戶搬家要怎麼幫他改地址？」→ 區分通訊/戶籍地址、保全聯盟鏈條件、要提醒客戶的事
6. 後台：展示「答不出來的問題」排行與知識庫健檢

---

## 12. 環境變數
```
OPENAI_API_KEY=
OPENAI_CHAT_MODEL=
OPENAI_EMBEDDING_MODEL=
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
ADMIN_PASSWORD=
DAILY_REQUEST_LIMIT=
```

---

## 13. 待確認（不影響開工）
- 客服時間官網兩處說法不同（09:00–18:00 vs 09:00–20:00），需致電確認後更新資料
- LINE 官方帳號是否有自動回覆（競品對照，人工測試）
- My Cardif 與 App 登入後的實際介面（以操作手冊 PDF 為準）
