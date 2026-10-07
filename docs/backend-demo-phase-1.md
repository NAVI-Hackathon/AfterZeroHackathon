# Developer B · Backend Demo Phase 1

已完成 Demo Provider、InMemory Journey API、deterministic workflow、準備度、下一步、示範文件與 JSON Knowledge Retrieval。沒有新增真實 Gemini 文件辨識、RAG、資料庫、登入或 Multi-Agent。既有 Gemini 意圖理解 transport 保留，這次 QA 不呼叫它。

## 啟動

Node 22.12+，在 repository root：

```sh
npm install
AI_MODE=demo npm run dev:navi
# 若要同時開啟獨立 Mock Website：
AI_MODE=demo npm run dev:all
```

NAVI 5173、API 3001、Mock Website 3000。也可在 `apps/api/.env` 明確設定 `AI_MODE=demo`，並重新啟動 API；範例為 `.env.example`。未設定時仍是 `live`，沿用既有 Phase 2A，不會無聲 fallback。Demo 不需要 API key，不發 Gemini request。沒有提交任何實際 `.env`。

## 契約與相容性

- 既有 `shared/intelligence.js` 不修改：保留 intent `service_request / knowledge_query / unknown` 與現有 service enums。這裡的 `service_request` 對應產品上的 service discovery／claim 需求，不另外新增會破壞前端的 enum。
- 新增 `shared/journey.js`，作為 Journey / Requirement / Document / Conversation / Source / NextAction 的單一 Zod 契約來源；Developer A 可依它建立 live adapter 與 mock adapter。
- 既有 `/api/intelligence/understand` envelope 不變。Demo 的 `meta.source` 使用現有 `demo_fallback` enum，前端會顯示本次未使用 AI。
- 新 `/api/analyze-intent` 回平面 IntentData；`X-NAVI-AI-Mode: demo | live`（CORS 可讀）標示來源。
- 新 API 的 Journey `provider` 為 `demo / live / provided`。提交 `intentResult` 時為 `provided`，只表示經 schema 驗證的 caller data，不冒稱是後端 Gemini 產物。
- Error 在既有 `{ success:false,error:{code,message} }` 加入相容欄位 `retryable`；不回傳 stack、raw provider errors 或 key。

## API

所有新 endpoints 都在 `/api`，成功除 documents 外直接回 Journey／資料，不額外包 envelope。

| Endpoint | Request | Response |
| --- | --- | --- |
| `POST /api/analyze-intent` | `{ message }` | 原 IntentData shape |
| `POST /api/journeys` | `{ message, intentResult? }` | 201 完整 ServiceJourney |
| `GET /api/journeys/:id` | — | 完整 ServiceJourney |
| `POST /api/journeys/:id/documents` | multipart `file` + `documentType` | `{ document, journey, readinessChange:{before,after} }` |
| `DELETE /api/journeys/:id/documents/:documentId` | — | 移除後 Journey；撤回 review |
| `POST /api/journeys/:id/review` | `{ confirmed:true }` | 更新後 Journey |
| `GET /api/journeys/:id/handoff-summary` | — | issue、summary、collected、missing、reason、sources、provider |
| `GET /api/knowledge?query=...` | 1–500 字 query | answer、sources、found、isMock |
| `GET /api/health` | — | 舊格式；aiProviderConfigured 指 Gemini key 是否配置，不代表 Demo 可用性 |

`intentResult` 若提供，必須符合完整 IntentDataSchema（包含四個 extractedData 欄位，未知用 null）。不接受 caller 傳 readiness／state／nextAction。Unknown 與未支援服務仍可建立需求紀錄，但沒有假的文件旅程或分數；只提供補充資訊／尚未開放訊息。

## Schema

ServiceJourney：UUID id、serviceType、title、summary、confidence、currentStage、readiness、extractedData、requirements、documents、conversation、nextAction、sources、confirmed、supported、provider、createdAt、updatedAt、disclaimer。

Requirement：id、name、description、required、status（missing／uploaded／verified／needs_review）、weight。

Document：UUID id、documentType、status、confidence、fields、matchedRequirements、filename、mimeType、size、source、isMock。原始分析只允許 documentType、confidence、各文件限定的 fields，不允許 provider 指定 readiness、state 或匹配規則。延誤分鐘數由 backend 時間差計算，忽略 provider 回傳的 delayMinutes。

KnowledgeSource：id、title、section、type（prototype_guide／prototype_faq）、isMock:true、url:null。現有來源均為示範資料，不是官方條款。

NextAction：type、target、title、description。支援 UPLOAD_DOCUMENT、PROVIDE_INFORMATION、REVIEW_INFORMATION、CONTACT_SPECIALIST、PROCEED_TO_SERVICE、NONE。

## Workflow、Readiness 與下一步

State enum：NEW、INCIDENT_IDENTIFIED、SERVICE_IDENTIFIED、EVIDENCE_COLLECTION、READY_FOR_REVIEW、HUMAN_REVIEW、READY_TO_PROCEED。建立 API 同步完成事件／服務比對，正常班機延誤直接回 EVIDENCE_COLLECTION，不製造假的中間非同步狀態。

| 已確認內容 | 權重來源 `knowledge/claims.json` |
| --- | --- |
| 事件資訊 | 20 |
| 服務辨識 | 15 |
| 登機證旅行資訊完整 | 15 |
| 登機證 verified | 20 |
| 延誤證明 verified | 20 |
| 使用者 review | 10 |

初始 35 → 登機證 70 → 延誤證明 90 → Review 100。只累計 verified requirements，不從 intent 提供的地點直接取得旅行資訊分數。Summary 與 readiness 不表示保障或理賠核准。

- 缺登機證 → UPLOAD_DOCUMENT boarding_pass。
- 缺延誤證明 → UPLOAD_DOCUMENT delay_certificate。
- 文件備齊 → READY_FOR_REVIEW + REVIEW_INFORMATION。
- 明確 `confirmed:true` → READY_TO_PROCEED + PROCEED_TO_SERVICE；不送件、不連真實 insurer。
- 重新上傳或移除文件撤回 confirmation；100 移除登機證回 55，重傳回 90。
- Unknown → INCIDENT_IDENTIFIED + PROVIDE_INFORMATION，readiness 0。
- 其他已知需求 → SERVICE_IDENTIFIED、supported:false、readiness 0；禁止文件／review 操作。

新 Journey threshold 集中於 config：`JOURNEY_CONFIDENCE_THRESHOLD=0.75`、`HUMAN_REVIEW_THRESHOLD=0.55`。>=0.75 正常；0.55–<0.75 停在 SERVICE_IDENTIFIED，下一步 CONTACT_SPECIALIST；<0.55 進 HUMAN_REVIEW。低信心文件、缺必要 fields、時間不合理或航班不一致進 HUMAN_REVIEW。移除或補正爭議文件後重新推導狀態。

既有入口的 `INTENT_CONFIDENCE_THRESHOLD=0.65` 保留，避免破壞 Developer A 原本的意圖 routing；它與新 Journey 的服務確認門檻用途不同。

## Provider 與上傳

`ai/provider.js` 選擇 Demo／既有 Gemini provider；routes 與 workflow 不寫 demo 判斷。Demo 支援中英文班機延誤及次要需求辨識，模糊／多種需求不硬猜。Demo 文件必須明確指定 `documentType=boarding_pass` 或 `delay_certificate`；選擇自有 fixture，**不是依 uploaded bytes 進行 OCR**。

支援 PDF／PNG／JPEG／WebP，每檔最多 10 MiB；multipart request 最多 10 MiB + 64 KiB；只接受一份 file 與 documentType。檢查 MIME 與基本檔頭，不宣稱已完整解析／掃描文件。使用 Express bounded raw body 與 Node 原生 Request.formData，沒有新增 multipart dependency。bytes 只在本次 request 存於記憶體，不寫磁碟、不保存於 repository、Demo 不傳第三方。

無效 structured output 最多 retry 一次；provider timeout 集中處理，即使 provider 不遵守 AbortSignal 也會回 timeout，不會等待無限久。live 模式的文件 API 回 501 DOCUMENT_INTELLIGENCE_NOT_AVAILABLE，沒有偷偷使用 Mock。

## Knowledge

KnowledgeService 讀現有 FAQ／sitemap 和新增 journeys.json。班機延誤 definition 與 requirements 文案集中，權重仍讀原 claims.json。JSON retrieval 僅支援 curated FAQ topics／id，找不到就回 found:false、sources:[]；不呼叫 LLM 編造答案。不更動 Developer A 使用的既有 services／documents／FAQ 檔格式。

## Developer A 串接

現有首頁不改：在 Demo API 模式下，既有 understand endpoint 就會回 schema-compatible demo result，可繼續操作原 frontend Mock 文件 Golden Path，無須開啟 VITE fallback。

**新 Journey API 尚未接到現有工作區。** 要改成 server-owned journey 時，請由 A 的 adapter 接入：

```js
// 建立案件：也可先分析，再傳同 shape intentResult，避免重複分析
const journey = await fetch('/api/journeys', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message }),
}).then(response => response.json()); // adapter 應先檢查 response.ok

const form = new FormData();
form.set('file', file);
form.set('documentType', 'boarding_pass'); // demo 明確指定 fixture
const result = await fetch(`/api/journeys/${journey.id}/documents`, {
  method: 'POST', body: form, // 不手動設定 Content-Type／boundary
}).then(response => response.json());
// 使用 result.journey 同步更新旅程、分數、文件與 NextAction。
```

adapter 應使用 ServiceJourneySchema／UnderstandingSchema 各自驗證對應 endpoint；error 讀 error.code／retryable。重載可保存 journey.id，再 GET；404 表示過期或 API 重啟，需要重新建立。現有 sessionStorage 存的是舊前端 Case shape，不可直接當作新 Journey。

後端 Review 100% 的 state 是 READY_TO_PROCEED；原前端仍依既有純函式停在 READY_FOR_REVIEW。未修改 A 的行為；接新 adapter 時需處理這個 state 對照，PROCEED 不等於實際送件。

## Tests 與驗收

```sh
npm test                  # frontend 10 + backend 21
npm run build:navi
npm run test:sites        # 先啟動 dev:all
```

驗收結果：`npm test` 31/31（Frontend 10、Backend 21）通過，NAVI build 成功。實際 `AI_MODE=demo dev:all` + Vite proxy 跑通新 Journey API 的 35→70→90→100；8 頁雙站 smoke checks 通過。重啟時曾遇到既有 Next dev cache 卡住，將 generated cache 保留於 ignored artifacts 後重新產生即恢復；沒有修改 Mock Website 原始碼。

Backend test/journeys.test.js 使用真實 HTTP 與 FormData：intent、建立、35→70→90→100、next action／state、handoff、threshold、unknown／unsupported、移除重傳、invalid outputs、multipart／MIME／signature／大小、時間差、跨日、航班衝突、同時上傳、repository clone／TTL／容量、prototype sources、基本個資遮蔽、timeout／cancel、live 不 mock。

## 技術債與 Phase 2 建議

- InMemoryJourneyRepository 是 get／save 的可替換注入邊界；未建立空的 Mongo subclass。單 process、最多 100 案、TTL 一小時，process 重啟即遺失。尚無登入與案件存取授權，只適合本機示範，不可直接開放真實案件服務。
- Conversation 只保留建立時的描述，尚未提供多輪對話／補充資料 API。已遮蔽常見台灣身分證、手機與 email，並非完整 DLP；不要填真實個資。
- 文件 verified 只代表 fixture fields 符合示範 requirement，未做真實 OCR、防偽、惡意檔案掃描或條款判斷。
- Live intent 與 Demo 自動化測試不同；這次沒有呼叫真實 Gemini。
- Phase 2 建議先由 A 接 server-owned Journey adapter，再加入真實 Gemini 文件 structured extraction、錯誤／信心 QA；最後才評估知識索引或 durable storage。此次停止，不實作上述功能。
