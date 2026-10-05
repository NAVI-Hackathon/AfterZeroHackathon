# NAVI Phase 2A — 實作與 QA 報告

日期：2026-10-06

**Phase 2A 程式與 Mock Provider QA 已完成。真實 Gemini QA 尚未完成：目前沒有配置 GEMINI_API_KEY。** 未使用備援或 Mock 測試冒充真實模型結果。Phase 2B／Document Intelligence／RAG／MongoDB／Authentication／Multi-Agent 均未開始。

## 1. 新增／修改檔案

新增：

- `apps/api/package.json`、`apps/api/.env.example`
- `apps/api/src/app.js`、`apps/api/src/server.js`
- `apps/api/src/config/env.js`
- `apps/api/src/schemas/intent.schema.js`
- `apps/api/src/middleware/errorHandler.js`
- `apps/api/src/services/gemini.service.js`、`intent.service.js`、`intent.prompt.js`
- `apps/api/test/intelligence.test.js`、`fixtures.js`、`integration.js`
- `shared/intelligence.js`、`scripts/dev.js`
- `apps/web/.env.example`
- `apps/web/src/domain/intelligence.js`、`intelligence.test.js`
- `apps/web/src/services/intelligence.js`、`intelligence.test.js`
- `docs/phase-2a-report.md`

修改：

- Root `.gitignore`、`package.json`、`package-lock.json`、`README.md`
- `apps/web/vite.config.js`
- `apps/web/src/App.jsx`、`presentation.js`、`domain/workflow.js`
- `apps/web/src/components/Landing.jsx`、`Copilot.jsx`、`Journey.jsx`、`Review.jsx`
- `apps/web/src/styles.css`、`motion.css`
- `docs/architecture.md`、`product.md`、`demo-script.md`

既有測試與 Knowledge readiness／document fixtures 沒有被改寫。QA 截圖與臨時 Browser Mock Provider 位於被忽略的 `artifacts/phase-2a`；Mock Provider 服務已停止，測試用 Web `.env.local` 已移除。未建立或追蹤任何真實 `.env`。

## 2. Backend 架構

Express app → bounded request validation → Intelligence Service → Gemini Provider → validated／normalized data → deterministic routing。兩個小 endpoint 直接在 app 組合，不增加只做轉呼叫的 controller/router。Native Node fetch 不引入 Google SDK；新增 Express、CORS、express-rate-limit 與共用 Zod。

## 3. API endpoints

- `GET /api/health`：`status`、`aiProviderConfigured`，不輸出秘密或環境值。
- `POST /api/intelligence/understand`：只接受 `{ message }`，trim 後 1–2,000 字。
- 統一 success/error envelope；400／403／413／429／502／503／504／500 均有明確 error code。

## 4. Gemini 使用方式

Server-only `GEMINI_API_KEY` 經 header 傳送，模型名稱集中於 config。預設 `gemini-3.8-flash`，預設模型使用 low thinking；覆寫其他模型時不送這個模型專屬設定。`generateContent` 要求 JSON MIME 與 JSON Schema，不把 Google 原始 envelope 交給前端。

官方依據：[模型](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash)、[Structured Output](https://ai.google.dev/gemini-api/docs/structured-output)、[REST API](https://ai.google.dev/api/generate-content)。帳戶可用性與實際延遲仍待真實 Key 驗證。

## 5. Structured Output Schema

五個欄位：`intent`、`serviceType`、`confidence`、`summary`、`extractedData`。Intent 三種、Service 六種 enum。Extracted fields 為 origin／destination／delayMinutes／incidentDate，全部 required 且允許 null。日期必須是真實有效的 YYYY-MM-DD；分鐘為非負、有上限的整數。額外欄位一律拒絕。

API 另有系統產生的 `meta.source`、`meta.outcome`、`meta.confidenceThreshold`，不是模型輸出。

## 6. Prompt 設計

只理解需求、分類、擷取明確事實與產生簡短台灣繁中摘要。使用者內容視為資料，不能改角色或 schema。不承諾理賠、不判斷保障／資格／金額、不捏造政策，不決定 stage／readiness／next action。模糊需求必須 unknown；未提供資訊用 null，「台灣」不推定「台北」，沒有日期參照的「昨天」不創造日期。

## 7. Validation

共用 Zod contract 覆蓋 Backend、Frontend、persistence 邊界。嚴格 enum／型別／欄位／日期驗證；confidence 缺值為 0，有限數字超出範圍則 clamp。非法模型回應重試最多一次，與首輪共用同一個 10 秒 deadline。依舊不合法就回安全錯誤，不渲染未驗證資料。

## 8. Confidence handling

集中 default 0.65，可由 API env 調整。已知需求低於 threshold → `human_review`；達門檻且是 flight-delay service request → `supported`。Frontend 使用 validated 系統 routing，不被 legacy Mock 0.7 門檻覆蓋。UI 顯示「判讀信心估計」，不當成已校準機率或理賠資格。低信心工作區以服務摘要／專員確認為主，不假裝服務比對已確定。

## 9. Unknown／其他服務

Unknown 是正常 success / clarification，首頁顯示「我還需要一些資訊」與補充說明，保留輸入；不硬猜 Flight Delay。其他已辨識服務顯示名稱、摘要與完整旅程尚未開放的說明。可準備專員摘要，但不建立假的完整工作區或聲稱真人已接案。

## 10. Demo Fallback

只有明確 `VITE_ENABLE_DEMO_FALLBACK=true` 才可啟用，預設與 production 關閉。只有 network／provider／timeout／invalid output 等失敗可回 flight-delay 本機備援。Invalid input／CORS／rate limit、有效 Unknown、低信心回應不會被備援覆蓋。

備援有獨立 `source: demo_fallback`，畫面顯示「示範備援判讀 · 本次未使用 AI 分析」，隱藏 Mock 信心值。Backend 沒有偷偷啟用 Mock 的 production 設定。

## 11. Frontend integration

Start 同時啟動 HTTP request 與既有分析動畫。快速成功保留約 1500ms；API 慢時持續 loading，只有收到 validated 結果才完成辨識步驟。Exit 留足 300ms 完成既有 250ms transition。Reduced motion 取消最低動畫等待。

Client timeout 12 秒；錯誤保留描述並提供重新分析。Reset／navigation 會 abort request 與 timers，舊結果不能重建案件。Cases 保存 validated AI facts，reload 不重新走 keyword interpretation；舊品牌 session 相容性保留。

## 12. 仍為 Mock／未實作

登機證與延誤證明辨識／欄位、FAQ、Sources、文件處理 loading／失敗模擬、真人 handoff 與既有理賠服務連線仍是 Mock 或 preview。只有入口理解具備真正 Gemini API 實作。沒有 Phase 2B 文件 API、RAG、資料庫、Authentication、Multi-Agent。

## 13. Build／Tests／QA 結果

| 檢查 | 結果與驗證方式 |
| --- | --- |
| Frontend build | PASS，Vite 8.3.2，JS 374.70 KB / gzip 113.46 KB |
| Frontend tests | **10/10 PASS**，包含原有 4 項 regression tests |
| Backend tests | **10/10 PASS**，Injected Mock Provider / HTTP / Gemini transport |
| Chinese / English / Payment / Vehicle / Unknown | Mock Provider contract tests PASS；不是模型 NLP 效果測試 |
| API health | 正常 Backend 200，`status: ok`、`aiProviderConfigured: false` |
| 未配置 Key | 正常 Backend 503 `AI_NOT_CONFIGURED`，安全訊息，沒有假成功 |
| Desktop Golden Path | 1440×1000，Mock Provider，35→70→90→100、服務導引 PASS |
| 390px Golden Path | 390×844，Mock Provider，中英輸入／兩文件／Review PASS |
| 320px / Keyboard / Reduced Motion | 無水平溢出；ArrowRight 分頁與 focus 正常；Reduced Motion 35% 即時呈現 |
| Unknown / Payment / Vehicle UI | 正常 clarification／明確未開放說明，沒有假的完整旅程 |
| API failure / Retry UI | 503／provider failure／invalid response 有產品 inline state；retry 可接回 workspace |
| Timeout UI | 實際 HTTP 10 秒 deadline，顯示「分析時間較長」，輸入保留 |
| Demo Fallback | 暫時明確啟用後 PASS，來源標示可見；測完移除設定，最後 build 預設關閉 |
| 低信心 Handoff | 42% → HUMAN_REVIEW；摘要、成功狀態及非正式送件聲明正常 |
| Reload persistence | Desktop／Mobile 100% 重新載入保留；AI facts 另有非關鍵字描述 regression test |
| Reset / stale request | 清空進度回 Landing；分析中 reset 後舊結果不會進 Workspace |
| Remove / re-upload | 320px 移除登機證後回 35%，重新上傳回 70% |
| Key isolation | Bundle 無 GEMINI_API_KEY 變數或 Google Key 格式；server env 不由前端匯入 |
| Git env | `.env`／`.env.local` 被忽略，tracked env files 空；只有 `.env.example` 可追蹤 |
| Root dev | 正常 Web 5173 + 真正 provider Backend 3001 同時啟動；Browser QA Mock server 已停止 |

一般 suite 20 項測試均通過。沒有新增或改寫舊測試來放寬既有 Golden Path 規則。

## 14. 真實 Gemini Golden Path

**尚未執行。** `npm run test:integration` 已嘗試啟動，但因沒有 `apps/api/.env` / `GEMINI_API_KEY` 在呼叫前明確停止；沒有對 Google 發出請求。Health 也確認 provider 未配置。

因此不能宣稱中文／英文 Flight Delay 或 Unknown 的真實模型結果、信心與耗時已通過。請自行在 `apps/api/.env` 設定 Key，重啟 API，再執行：

```sh
npm run test:integration
```

測試會依序實際呼叫中文、英文班機延誤、信用卡扣款變更、車禍與 Unknown；Flight Delay 另驗證 delayMinutes=420 與 supported routing。

## 15. Technical Debt

- 真實模型權限、prompt 分類效果、confidence、延遲還需要帳戶實測與更完整 labeled evaluation。
- 瀏覽器持有 case／workflow 與 session，不具正式案件權限、audit 或安全後端持久化。
- Mock documents 可能與真實描述矛盾，尚未做跨文件／原始描述 reconciliation 或修改欄位。
- Rate limit 為 per-process memory；多實例部署需共用 store。CORS 不代表 Authentication。
- 正式部署需同 origin reverse proxy 或設定 API base URL／allowlist；Vite dev proxy 不是 production gateway。
- Gemini prompt + schema 保證結構與安全邊界意圖，不保證每項事實正確，不是政策／資格審核。

## 16. Phase 2B 建議（尚未開始）

先確認 Phase 2A 真實 API QA，再針對兩種文件建立有大小／signature／schema validation 的 Document API。辨識結果要能人工確認／修正，與已理解的航線、日期、航班比對，低信心或衝突資料交由專員；準備度維持由 deterministic rules 計算。這一步不需要先加入 RAG、MongoDB 或 agents。

## 本機 QA 畫面

以下為 **Mock Provider / explicit fallback** 的 UI 驗證畫面，並非真實 Gemini 測試紀錄。檔案位於忽略的 artifacts 目錄。

- Landing / API error：`artifacts/phase-2a/api-error.png`
- Analysing：`artifacts/phase-2a/analysing.png`
- Initial 35%：`artifacts/phase-2a/desktop-35.png`
- Boarding pass 70%：`artifacts/phase-2a/desktop-70.png`
- Delay certificate 90%：`artifacts/phase-2a/mobile-90.png`
- Review 100%：`artifacts/phase-2a/review-100.png`
- Human Review / Handoff：`artifacts/phase-2a/human-review.png`、`handoff.png`
- Mobile：`artifacts/phase-2a/mobile-35.png`、`mobile-unknown.png`、`mobile-timeout.png`
- Explicit fallback：`artifacts/phase-2a/demo-fallback.png`

實作範圍停在 NAVI Intelligence Backend；真實 Provider QA 待 Key，沒有開始下一階段。
