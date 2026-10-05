# NAVI

**AI Service Journey Navigator** · **Understand. Guide. Resolve.**

NAVI 將使用者的需求轉化成清楚的服務旅程，位於使用者與既有企業服務之間，不取代 BNP / Cardif 核心系統。

目前為 **Phase 2A — Intelligence Backend**：事件描述透過 Node.js/Express 交由 Gemini 理解，經嚴格 Schema 驗證與 deterministic mapping 接回原有工作區。文件辨識、FAQ、來源與服務導引仍為示範資料；沒有 OCR、RAG、MongoDB、Authentication 或 Multi-Agent。

## 啟動

需要 Node.js **22.12+** 與 npm。

```sh
npm install
cp apps/api/.env.example apps/api/.env
# 自行在 apps/api/.env 填入 GEMINI_API_KEY，不要把 key 放進前端。
npm run dev
```

Root dev 同時啟動 Web `http://127.0.0.1:5173` 與 API `http://127.0.0.1:3001`。5173 已被使用時會停止並提示，不會默默切換到 CORS 未允許的連接埠。也可以分別用 `npm run dev:web`、`npm run dev:api`。修改 API `.env` 後重新啟動 API。

Backend 變數集中於 `apps/api/src/config/env.js`：`GEMINI_API_KEY`、`GEMINI_MODEL`（預設 `gemini-3.8-flash`）、`PORT`、`HOST`、`WEB_ORIGINS`、`INTENT_CONFIDENCE_THRESHOLD`（預設 0.65）、`AI_TIMEOUT_MS`（預設 10000）。Key 只在 server header 使用，`.env` 被 Git 忽略。

可選的前端設定見 `apps/web/.env.example`。預設 `/api` 使用 Vite proxy；同 origin production 可沿用這個路徑，跨 origin 才需設定 `VITE_API_BASE_URL` 與 Backend origin allowlist。前端 `.env` 是公開設定，不能填任何 Secret。

## 測試與 Build

```sh
npm test                  # Frontend + Backend，完全不需要 API Key
npm run test:web
npm run test:api
npm run build             # Frontend production build
npm run preview           # 只預覽 build，不會自動提供 API；需另啟 API / 設定部署 proxy
npm run test:integration  # 真正 Gemini 測試，需要 apps/api/.env
```

一般測試使用注入的 Mock Provider，驗證中英班機延誤、車禍、信用卡扣款變更、Unknown、驗證／錯誤／超時／CORS／rate limit 與原有 Golden Path。**Mock Provider 測試不代表模型實際理解能力已驗證。** 真實測試會呼叫 Gemini，輸出測試類型、結果與耗時，不輸出 key 或完整使用者內容。

截至本次 QA，沒有配置 API Key，因此真實 Gemini QA **尚未執行**。完整結果見 [Phase 2A 報告](docs/phase-2a-report.md)。

## Golden Path

輸入「我昨天從東京回台灣，班機延誤七個小時，不知道可以怎麼處理。」→ API 理解 → 班機延誤工作區 **35%** → Mock 登機證 **70%** → Mock 延誤證明 **90%**（14:20 → 21:43 = 7 小時 23 分）→ Review **100%** → 既有理賠服務導引預覽。

100% 只代表資料完整，Workflow 仍停在 `READY_FOR_REVIEW`，不判斷保障、理賠資格、核准或送出申請。移除／替換文件會撤回分數與確認。文件不會讀取或上傳；真實自然語言描述會送到 Gemini。FAQ 與來源面板仍標明示範知識庫。

其他已辨識需求只顯示「目前 Prototype 尚未開放完整服務旅程」，不展示假的完整 Workflow。模糊需求顯示「我還需要一些資訊」；低信心已知需求進入專員確認。真人接續僅準備本機摘要，不會聯絡專員。

## 明確示範備援

如需 API 故障時仍能展示 Golden Path，可自行複製 `apps/web/.env.example` 為 `.env.local`，設定：

```dotenv
VITE_ENABLE_DEMO_FALLBACK=true
```

重新啟動 Web（或重新 Build）後生效。只有 API failure 時且只支援班機延誤；畫面會顯示 **「示範備援判讀 · 本次未使用 AI 分析」**。有效的 Unknown／低信心結果不會被替換。預設與 production 都為關閉，Backend 不提供隱藏 mock 模式。

## API 與架構

- `GET /api/health`：狀態與 AI provider 是否已配置，不暴露環境值或密鑰。
- `POST /api/intelligence/understand`：`{ "message": "..." }`，最多 2,000 字；回傳 NAVI 的 validated data + deterministic routing meta。

```text
apps/web/src/            Premium React UI、純 workflow、API client 與 tests
apps/api/src/            Express app、config、intent schema / service、Gemini provider、error handler
apps/api/test/           Mock Provider contract / transport tests、手動真實 integration
shared/intelligence.js  共用 Zod schema、enums、mapping 與 threshold default
scripts/dev.js          無額外依賴的雙程序開發啟動
knowledge/              Mock 文件、FAQ、來源與既有準備度規則
docs/                   架構、產品、展示與各階段 QA 記錄
```

Premium Dark UI、繁中／英文輔助、CSS Motion System、Reduced Motion、桌面三欄、手機 Tabs、來源面板與 Demo Reset 全部保留。既有進度仍使用同分頁 `sessionStorage`，reload 保留 validated AI facts 與 mock documents；不儲存文件位元組。

詳見 [真實架構](docs/architecture.md)、[展示腳本](docs/demo-script.md) 與 [Phase 2A 報告](docs/phase-2a-report.md)。**Phase 2B / 2C 未實作。**
