# AfterZeroHackathon · NAVI 與 Mock Website

此 Repository 包含兩個獨立網站：**NAVI 黑客松主產品**，以及 **Demo 用模擬保險官網**。兩者有各自的 routing、CSS、framework、build 與執行程序；不把模擬頁面嵌進 NAVI。

NAVI — AI Service Journey Navigator · Understand. Guide. Resolve.

## Project Structure

```text
apps/
  web/                 NAVI：React / Vite，Premium UI、工作區、Golden Path
  api/                 NAVI：Express / Gemini 意圖理解 API
  mock-site/           Mock Website：Next.js / TypeScript / Tailwind
    app/(site)/        模擬官網 8 頁與服務分頁
    components/site/   模擬站導覽、Tabs、data-tour-id、示意下載
    public/            原有靜態資產
shared/intelligence.js NAVI 共用 Zod 契約與 deterministic routing
lib/contracts/         原模擬服務助手契約（保留，未改成 NAVI 契約）
lib/db/、lib/env.ts     原團隊的資料庫／環境規格骨架，尚未接入現有服務
data/                  模擬官網本地 seed、爬蟲輸出
knowledge/             NAVI 示範文件、FAQ、來源、準備度規則
scripts/               啟動、雙站驗證、原有爬蟲
docs/                 架構、展示、QA 與整合紀錄
```

所有安裝共用 root `package-lock.json`；Node.js **22.12+**。請在 repository 根目錄安裝，不要為每個網站另建 lock file。

## Run NAVI

在根目錄：

```sh
npm install
# 首次設定：檔案已存在時勿覆蓋
cp apps/api/.env.example apps/api/.env
# 在 apps/api/.env 填入 GEMINI_API_KEY（只放 Backend）
npm run dev:navi
```

主產品 URL：**http://127.0.0.1:5173/**。Backend：http://127.0.0.1:3001/api/health。
`npm run dev` 仍是原本 NAVI 的啟動捷徑；`dev:web`、`dev:api` 可分別啟動。整合啟動的 API 不監看檔案，修改 Backend 或 `.env` 後請重新啟動；`dev:api` 則保留開發監看。

Backend 設定集中於 `apps/api/src/config/env.js`，範例在 `apps/api/.env.example`；Gemini 模型與 threshold 沿用現有設定。未設定 key 時 health 正常、分析 API 明確回覆未配置，不會冒充 AI 成功。

前端設定在 `apps/web/.env.example`；`/api` 由 Vite proxy 連到 3001，production 需部署同 origin reverse proxy 或設定 `VITE_API_BASE_URL`。Key 不可放進 `VITE_*`。

## Run Mock Website

在根目錄：

```sh
npm install
npm run dev:mock
```

或安裝完成後：

```sh
cd apps/mock-site
npm run dev
```

URL：**http://127.0.0.1:3000/**。這是展示外部服務情境的模擬保險官網，**不是 NAVI**。
固定綁定 127.0.0.1:3000；不與 NAVI 共用 router 或 API。沒有登入、保險送件、OpenAI 或 Turso runtime，不需要填 root `.env.example` 才能啟動。

保留首頁、服務總覽、表單下載、保單變更、借款、理賠程序、網路服務、名詞解釋，以及 hash 分頁、`revealTabPanels`、`data-tour-id`。內容讀 root `data/cardif_seed_data.json`，共用型別讀 `lib/contracts`；專用 tsconfig aliases 與 Next workspace root 已設定。原有示意 QR、下載說明和非官方標示保留；沒有對官方網站的 runtime fetch／iframe／盜連。

## Run Both

```sh
npm install
npm run dev:all
```

| 執行程序 | URL | 用途 |
| --- | --- | --- |
| NAVI Web | http://127.0.0.1:5173/ | 主產品 |
| NAVI API | http://127.0.0.1:3001/api/health | 意圖分析 Backend |
| Mock Website | http://127.0.0.1:3000/ | 模擬外部服務 |

`Ctrl+C` 一併停止三個程序；任一程序啟動失敗會停止其他程序。連接埠被占用時會報錯，不會自動換到另一個 port。不要同時再跑 `dev:navi`／`dev:mock`。

## Demo Flow

1. 開 **3000** 模擬網站 →「理賠程序介紹」(`/services/claims`) → 切換「應備文件」，展示使用者原本需要自行搜尋／閱讀的情境。
2. **手動切換另一分頁至 5173 NAVI**。目前沒有跨站自動傳遞案件、嵌入式助手或自動導覽 overlay，請勿把它說成已完成。
3. NAVI 輸入「我昨天從東京回台灣，班機延誤七個小時，不知道可以怎麼處理。」→ 開始分析 → 班機延誤旅程 **35%**。
4. 上傳登機證（目前仍 Mock）→ **70%**；上傳延誤證明（Mock）→ **90%**；確認案件資料 → **100%**；前往服務僅開啟導引預覽，不送件。
5. NAVI 右上選單「重新開始示範」可清除本分頁進度。reload 保留 sessionStorage；不同 tab 的案件分開。

模擬官網的既有理賠資料與 NAVI 班機延誤示範資料是不同資料集，不能據此宣稱該公司承保旅遊延誤。未配置 Gemini 時，請先按下方方式**明確啟用示範備援**；備援畫面會標記本次未使用 AI。

## 測試與 Build

執行 Mock Website build／typecheck 前，先停止其 dev 程序；避免 Next 產生的型別與開發程序同時更新。

```sh
npm test                  # Frontend + Backend，完全不需要 API Key
npm run test:web
npm run test:api
npm run build             # NAVI Frontend production build
npm run build:mock        # Mock Website production build
npm run build:all         # 兩站各自 build
npm run lint              # Mock Website 既有 ESLint
npm run typecheck:mock    # Mock Website TypeScript
npm run test:sites        # 先啟動 dev:all；雙站路由、資產、API proxy smoke checks
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
scripts/dev.js          無額外依賴的 NAVI／雙站開發啟動
knowledge/              Mock 文件、FAQ、來源與既有準備度規則
docs/                   架構、產品、展示與各階段 QA 記錄
```

Premium Dark UI、繁中／英文輔助、CSS Motion System、Reduced Motion、桌面三欄、手機 Tabs、來源面板與 Demo Reset 全部保留。既有進度仍使用同分頁 `sessionStorage`，reload 保留 validated AI facts 與 mock documents；不儲存文件位元組。

詳見 [真實架構](docs/architecture.md)、[展示腳本](docs/demo-script.md) 與 [Phase 2A 報告](docs/phase-2a-report.md)。**Phase 2B / 2C 未實作。**


## 整合與協作

`3a09337` 的模擬官網成果已合併，NAVI 與 Mock Website 以 npm workspaces 分開。根目錄 Next.js 起始設定搬到 `apps/mock-site`，不再干擾 NAVI。兩種助手契約用途不同，沒有強行合併；原 `SPEC.md`／`AGENTS.md` 保留作為團隊規格紀錄，現有可執行入口以本 README 為準。完整差異與驗證見 [整合報告](docs/repository-integration.md)。
