# AGENTS.md — AfterZeroHackathon 開發規則

> 本檔是 Codex 與 Claude Code 共用的唯一規則來源（CLAUDE.md 只匯入本檔）。
> 修改本檔需全員同意，並用獨立的 PR 提交。

## 專案
- AfterZero 隊伍參加 2026 法巴人壽 InsurHack，Theme 2-2「智慧知識與服務導覽助手」
- 完整需求見 `SPEC.md`。**開始任何任務前先讀 SPEC.md 相關章節**
- 只實作被指派的里程碑或功能，完成後停下來說明驗收方式，不要自行往下做

## 技術棧（不得自行更換）
- Next.js App Router + TypeScript（strict）、Tailwind
- Turso（libSQL），向量搜尋用 libSQL 內建功能
- OpenAI SDK，模型名稱只能讀環境變數 `OPENAI_CHAT_MODEL`、`OPENAI_EMBEDDING_MODEL`，不得寫死
- 驗證用 zod；部署 Cloudflare（@opennextjs/cloudflare）
- OpenAI SDK、libSQL 向量、OpenNext 用法變動快，實作前查最新官方文件，不要憑記憶
- 新增主要相依套件前先徵求開發者同意

## 目錄與負責人
隊伍三人：Sh（sh940203，Claude Code）、隊友A（Codex）、隊友B（Codex，企劃與測試）。

| 路徑 | 負責 | 說明 |
|---|---|---|
| `app/(site)/`、`components/`、`app/admin/` | Sh | 模擬官網、助手介面、卡片、導覽 overlay、後台頁面 |
| `lib/ai/`、`lib/prompts/`、`app/api/`、`scripts/`、`eval/eval.ts` | 隊友A | 對話 API、工具呼叫、prompt、匯入與評估腳本 |
| `data/`（`data/faq_extra.json` 除外） | 隊友A | 資料檔；`data/crawl/` 是爬蟲輸出 |
| `eval/questions.jsonl`、`data/faq_extra.json`、`docs/` | 隊友B | 測試題組、自建 FAQ、簡報與影片素材、可用性測試紀錄、痛點截圖 |
| **共用契約**（見下） | 全員 | 修改需另開 PR 並通知其他成員 |

只修改自己負責的路徑。必須動到他人的檔案時，在 PR 說明裡標註原因並請該負責人 review。

## 共用契約（改動前必須先溝通）
- `lib/contracts/response.ts`：ResponseSchema 與卡片型別（zod），前後端唯一共用來源
- `lib/contracts/persona.ts`：身分與模擬保戶型別
- `lib/db/schema.sql`：資料表結構
- `data/tours.json` 的格式、`data-tour-id` 命名規則（kebab-case，例：`form-beneficiary-change`）

契約檔變更流程：獨立分支 `contract/<主題>` → PR → 相關負責人 review 後合併 → 全員各自 rebase。

## Git 規則
- `main` 永遠可執行、可部署，不直接 push 到 main
- 分支命名：`feat/<功能>`、`fix/<問題>`、`contract/<主題>`、`data/<主題>`、`docs/<主題>`
- 小步提交，commit 訊息格式：`[M3] feat: 卡片元件 service_flow`
- 開 PR 前先 `git fetch origin && git rebase origin/main`，確認 `npm run build` 與 `npm run lint` 通過
- 不提交：`.env*`、`.venv/`、`node_modules/`、`data/crawl/pdfs/`

## 產品護欄（程式與 prompt 都要遵守）
- 只根據工具回傳的資料回答，找不到就說不知道並轉客服；不得編造流程、金額、期限
- 不提供投保建議、不判斷能否理賠、不承諾理賠結果
- 不要求也不記錄真實個資；記錄前先遮蔽身分證字號、電話等
- 每張卡片必附來源（官網網址與擷取日期）
- 模擬官網是在本 repo 從零重建的獨立網站，與真實官網完全分離：
  - 執行時不得對 life.cardif.com.tw、my.cardif.com.tw 發出任何請求（不 fetch、不 iframe、不盜連圖片或檔案）
  - 不複製官網的圖片、logo、CSS、JS 檔；版面與配色用自己的程式碼重建，logo 用文字樣式
  - 站內連結一律指向模擬網站自己的頁面；只有卡片的「來源」可以用新分頁開啟真實官網網址
  - 頁尾標註「InsurHack 模擬網站，非官方」
- 讀取真實官網只有一個管道：隊友A 執行 `scripts/crawler/` 的爬蟲（唯讀、限速、遵守 robots.txt），產出 `data/crawl/` 後，網站只讀這些本地資料
- 使用者看得到的文字一律繁體中文

## 程式風格
- 元件用函式元件與 hooks；伺服器端邏輯放 Server Components 或 Route Handlers
- 不用 `any`；外部資料一律先經 zod 驗證
- 環境變數集中在 `lib/env.ts` 讀取與驗證

## Next.js 官方提醒（由 create-next-app 產生，`next dev` 會自動維護這段，請勿刪除）

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
