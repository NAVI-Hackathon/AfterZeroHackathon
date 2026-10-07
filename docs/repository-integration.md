# Repository 整合與驗收

本次目標：整合雙方既有成果，保留 NAVI 的產品體驗與 Mock Website 的外部服務展示環境。沒有實作 Phase 2B、RAG、登入、資料庫或跨站案件傳遞。

## 分析結果

初次分析時 `main` 為 `eecf5f8`，沒有已修改的產品檔案；未追蹤的 `.idea/` 為本機 IDE 設定，保留並加入 ignore。

| 提交／作者 | 已完成內容 | 整合方式 |
| --- | --- | --- |
| `52d495d`／arren1088 | NAVI React/Vite Premium UI、純 workflow、Golden Path、Express/Gemini 意圖分析、Zod 契約、測試與文件 | 保留 `apps/web`、`apps/api`、`shared`、`knowledge`，未重做介面或商業規則 |
| `7cc28fd`／sh940203 | Next 起始架構、團隊規格、seed、共用契約、DB schema、環境驗證與爬蟲 | 保留規格、root `lib`／`data`／crawler；Next 專用設定移入 Mock Website |
| `3a09337`／sh940203 | `feat/mock-site` 的 8 頁模擬官網、分頁標籤、來源日期、data-tour-id、revealTabPanels、示意 QR 與下載 | 合併這批成果，網站獨立放在 `apps/mock-site` |

`eecf5f8` 先前只合併了 NAVI 與原 main 的歷史，沒有包含 `3a09337` 的模擬官網成品。故不能把原根目錄的 Next 歡迎頁當成完整 Mock Website。

## 衝突與決定

- 兩個 `/` 首頁分屬不同產品，不合併 routing。NAVI 用 Vite，Mock Website 用 Next。
- 根目錄 npm 設定原先只安裝 NAVI，Next/Tailwind 依賴已失去可執行入口。將模擬站原依賴恢復到獨立 workspace，保留原版本與 framework。
- Next 的 PostCSS／TS／ESLint 設定不應套用 NAVI。它們搬到模擬站，NAVI 的現有設定保留。
- `shared/intelligence.js` 是 NAVI 的理解結果契約；`lib/contracts` 是原團隊的來源卡片／persona 契約，用途與 shape 不同。沒有強行合併或修改契約。
- `knowledge` 的 NAVI 示例與 `data/cardif_seed_data.json` 的模擬官網資料有不同來源與用途，保留兩份，不假裝是同一保單保障規則。
- 原 `SPEC.md` 的 Next/OpenAI/Turso 等較大規格仍保留，但不代表已實作。root `.env.example` 加上用途說明；實際 NAVI secrets 僅在 API `.env`。
- Next public 的起始 SVG 與 favicon 保留於模擬站。沒有因未使用而直接刪除資產。

## 最終結構

```text
apps/web/          NAVI 主產品：UI、journey、readiness、mock 文件
apps/api/          NAVI Intelligence Backend
apps/mock-site/    Mock Website：app/(site)、components/site、public、獨立 configs
shared/            NAVI 共用契約
lib/               原團隊契約與尚未接入的 DB／env 骨架
data/              模擬官網 seed 與爬蟲輸出
knowledge/         NAVI 示範知識與文件資料
scripts/           dev.js、verify-sites.js、crawler/
docs/              現有報告、架構、展示腳本與本整合報告
package.json       workspace 指令
package-lock.json  所有 workspaces 共用的可重現安裝
```

## 啟動與網址

在 root 執行 `npm install`（Node 22.12+）。

| 指令 | 執行程序 | 網址 |
| --- | --- | --- |
| `npm run dev:navi`（或原 `npm run dev`） | NAVI Web + API | 127.0.0.1:5173 / 127.0.0.1:3001 |
| `npm run dev:mock` | Mock Website | 127.0.0.1:3000 |
| `npm run dev:all` | 以上三個獨立程序 | 5173、3001、3000 |

模擬站也可以在 `apps/mock-site` 直接 `npm run dev`；安裝仍使用 root workspace lock。固定 port，遇到占用時報錯，避免現場開錯網站。NAVI 的 Vite `/api` proxy 仍指向 3001，Mock Website 不代理 NAVI API。

`apps/mock-site/tsconfig.json` 保留 local `@/*`，另指定 `@/data/*`、`@/lib/*` 指向 root。Next `turbopack.root` 與 tracing root 指向 repository root，使 shared 資料可在 build 與 runtime 解析；做法參考 [Next 官方 Turbopack 設定](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack)。port 由 [Next CLI 參數](https://nextjs.org/docs/app/api-reference/cli/next) 固定。

## Demo 順序

1. 3000 模擬站首頁 → 理賠程序介紹 → 應備文件分頁，展示原本需要自行尋找的資訊。
2. 手動切換另一分頁至 5173 NAVI。沒有跨站自動傳送案件，也沒有把 Mock Website 內容掛在 NAVI router。
3. 描述東京回台灣班機延誤 7 小時 → 35% → Mock 登機證 70% → Mock 延誤證明 90% → Review 100%。
4. 「前往服務」僅展示接續導引，不會連到正式平台或送出保險申請。
5. 右上選單重新開始示範，reload 仍保留同 tab 的 sessionStorage。

此示範不表示模擬官網所屬公司承保 NAVI 的旅遊延誤情境。

## 重要檔案變更

- 合併 `feat/mock-site` 成品；原 `app/`、`components/`、`public/` 與 Next/TS/PostCSS/ESLint 設定整批搬入 `apps/mock-site`，保留頁面實作。
- 新增 `apps/mock-site/package.json`，root workspace 與 lock 加入既有 Next/Tailwind 依賴。
- 修改 `scripts/dev.js`，以 `--all` 選項加開模擬站；未新增 process manager 依賴。續接 QA 發現相依套件檔案變動造成 Node watcher 反覆重啟，故 root 整合啟動改為一般 API 程序；獨立 `dev:api` 保留 watcher。
- 新增 `scripts/verify-sites.js`：可重跑的 8 頁 HTTP／asset／API proxy／router 隔離檢查。
- root README 重整雙站指令、port、資料用途與 Demo 順序；architecture 補上兩站邊界。
- `.gitignore` 增加 nested `.next`、generated Next 型別／本機 agent guidance、IDE 設定排除；root 團隊規則不修改。
- 原 Next 歡迎頁由已完成的模擬站首頁取代（來源提交本來就刪除此頁）；未刪除有效功能。NAVI 產品檔案與 workflow 未修改。

## 已執行驗證

| 驗證 | 結果 |
| --- | --- |
| root `npm install`、三個 workspace install、續接 `npm ci` | 成功，只有一份 root lock |
| `npm run build:all` | NAVI Vite 與 Mock Next 兩站均成功；Next 8 頁及 not-found 輸出正常 |
| `npm test` | Frontend 10/10、Backend 10/10，原 Golden Path regression 保留 |
| `npm run lint` | 模擬站既有 ESLint 通過 |
| `npm run typecheck:mock` | Next typegen + TypeScript strict 通過 |
| `npm run dev:all` | 5173、3000、3001 同時啟動，無 port 衝突 |
| Mock production start | `npm run start --workspace @navi/mock-site` 成功；搭配 NAVI 再跑雙站 smoke checks 全部通過 |
| `npm run test:sites` | 8 個 mock routes、兩站 favicon、mock stylesheet、direct/proxied health 通過；mock `/api/health` 404 |
| NAVI desktop 1440px | 三欄與 35→70→90→100 完整；file picker、Review、服務預覽正常 |
| NAVI mobile 390px | Tabs 與 35→70→90→100 完整；沒有頁面水平溢出 |
| Mock Website 390px／320px | 選單開關與應備文件分頁可操作；兩種尺寸 document scrollWidth = innerWidth |
| 整合程序停止 | Ctrl+C 結束三個程序；確認 3000、3001、5173 均無殘留 listener |
| Production dependencies audit | `npm audit --omit=dev`：0 vulnerabilities |
| NAVI 320px | 首頁與初始旅程可操作，實測 document scrollWidth = innerWidth = 320 |
| 文件 rollback 與 persistence | 移除登機證 100→55、unsupported 不更改案件、重傳恢復 90，需再次 review；reload 保留 100 |
| Demo Reset／keyboard | 重設回 Landing；Tab 可到達下一個互動控制 |
| API 未配置 | health 成功；分析回 AI_NOT_CONFIGURED，前端顯示可重試訊息 |

續接 QA 曾在 Mock dev 與 build 同時執行時，遭遇 `.next` generated route types 衝突；停止開發程序後 `build:all` 重新成功。README 已明列 build／typecheck 前停止 Mock dev，未以放寬 TypeScript 來迴避錯誤。

Golden Path 瀏覽器驗收使用**明確 `VITE_ENABLE_DEMO_FALLBACK=true`**，畫面呈現本次未使用 AI；沒有 Gemini key，真實 AI 理解尚未驗證。QA screenshot 放本機 ignored `artifacts/repository-integration`，不提交使用者附件或本機設定。

## 限制與待辦

- Intent 真實 Gemini account/latency QA 仍待設定 API key。文件、FAQ、Sources、服務接續仍為 Phase 2A 的 mock／預覽。
- Mock Website 沒有登入、實際下載、嵌入式 NAVI assistant、tour overlay、跨站自動帶入資料。保留原 hooks，未冒充已完成的整合。
- 安裝後 npm audit 回報原 Next ESLint 工具依賴鏈 5 項 high（braces／micromatch／fast-glob 等）；建議修復包含 major 降版，未使用 audit fix --force 破壞既有 Next 版本。應另行確認安全相容版本。`npm audit --omit=dev` 驗證 runtime dependencies 為 0 vulnerabilities。
- 原 SPEC／AGENTS 是較廣的團隊規格，未擅自改寫。此文件與 README 描述本次實際可執行架構；未配置 Cloudflare、Vercel 或部署管線。
