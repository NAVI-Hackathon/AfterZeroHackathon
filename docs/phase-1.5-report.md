# NAVI · Phase 1.5 / Branding report

已直接修改現有專案，完成繁中深色 UI、Premium interaction 與 NAVI 品牌更名。未開始 Phase 2，未新增 Gemini、Express、MongoDB、RAG 或動畫套件。

## 1. 修改檔案與元件

| 檔案 | 變更 |
| --- | --- |
| `apps/web/src/App.jsx` | 三欄與分頁協調、1500ms 分析、1000ms 文件處理、失敗重試、reset、menu、品牌進度遷移 |
| `apps/web/src/components/Landing.jsx`（新增） | Command surface、繁中 hero、範例快速填入、分析過場 |
| `apps/web/src/components/Journey.jsx`（新增） | 服務旅程、航班概況、狀態動畫、文件整合 |
| `apps/web/src/components/Review.jsx`（新增） | Review、Handoff、Sources；原 App 內頁面拆出 |
| `apps/web/src/components/Toast.jsx`（新增） | 有生命週期與關閉動畫的產品提示 |
| `apps/web/src/components/Copilot.jsx` | NAVI 服務助理 timeline、FAQ、來源、無來源狀態 |
| `apps/web/src/components/DocumentDropzone.jsx` | 拖曳、picker、處理、結果、錯誤、重試、移除、延誤時數 |
| `apps/web/src/components/ReadinessPanel.jsx` | 通用服務準備度、共享插值圓弧、暫時增量、資料完整度、下一步 |
| `apps/web/src/components/Dialog.jsx` | 進退場、backdrop、Tab 邊界、Escape、焦點恢復 |
| `apps/web/src/components/Icon.jsx` | NAVI 路徑 mark、選單／reset／旅程一致 icon |
| `apps/web/src/presentation.js`（新增） | 繁中／英文輔助、Service-centric 顯示文案 |
| `apps/web/src/hooks/useMotion.js`（新增） | Reduced motion、token duration、count-up 插值 |
| `apps/web/src/hooks/motion.test.js`（新增） | 插值／撤回驗證 |
| `apps/web/src/domain/storage.test.js`（新增） | 舊進度恢復、新 key 優先 |
| `apps/web/src/domain/workflow.js` | 僅新增 key 常數與 legacy fallback；業務推導未改 |
| `apps/web/src/styles.css` | 深色 design tokens、字體、層次、responsive、各互動狀態 |
| `apps/web/src/motion.css` | 統一 motion / easing、動畫與 reduced-motion guard |
| `apps/web/index.html` | zh-Hant、NAVI browser title、meta description、theme color |
| `apps/web/public/favicon.svg` | NAVI 幾何路徑符號 |
| `package.json` | navi package／workspace scripts、測試腳本 |
| `apps/web/package.json` | `@navi/web` workspace 名稱 |
| `package-lock.json` | 同步 package / workspace 名稱，無新依賴 |
| `knowledge/faq.json` | 自然繁中說明，保留 IDs 與來源契約 |
| `knowledge/sitemap.json` | 繁中指南／常見問題，保留 mock 標示與來源 IDs |
| `README.md` | NAVI 平台定位、標語、操作方式、能力命名、範圍與進度遷移 |
| `docs/architecture.md` | AI Service Orchestration Layer、既有企業服務邊界、presentation / storage 架構 |
| `docs/product.md` | 產品定位、UI／motion 系統、範圍、Pitch |
| `docs/demo-script.md` | NAVI 繁中兩分鐘腳本與 Pitch |
| `docs/verification.md` | Build、4 項測試、瀏覽器 QA、對比與限制 |
| `docs/phase-1.5-report.md`（新增） | 本次完整報告 |

原有 `domain/workflow.test.js` 未修改；`main.jsx`、文件 fixtures、服務與計分 JSON 未修改。

## 2. UI / UX 與品牌

- Brand：NAVI — AI Service Journey Navigator；Understand. Guide. Resolve.；理解需求，引導流程，完成服務。
- Header：克制的 NAVI wordmark 與階梯路徑 mark，副標低調顯示；一般介面不暴露 AI 技術名詞。
- Homepage：告訴我，發生了什麼事？Command input、繁中例句／CTA、低強度 ambient field，非聊天首頁。
- Workspace：中央旅程最大，助理與服務智慧 rail 較輕；減少框線／badge，資訊以空白與分隔線分層。
- Document：連續的分析 → 擷取欄位 → requirement matching；延誤時間為主視覺，資料變更同步觸發旅程、準備度與下一步。
- Review：5 個 section，確認後 100%；前往服務只是 existing service navigation 說明。
- Handoff：冷靜說明、服務摘要、已收集／待確認內容與可複製文字，不用紅色錯誤呈現。

平台術語改為 Service Workspace（服務工作區）、Service Journey（服務旅程）、Service Readiness（服務準備度）、Service Summary（服務摘要）。架構使用 Service Digital Twin（服務數位狀態）。具體 Use Case 保留班機延誤理賠與 `claim` domain object，不為品牌重寫業務模型。

## 3. Design system

Graphite canvas / surface / raised：`#0A0B0D` / `#101215` / `#15181C`。文字 off-white `#EEEFE9`、secondary `#B4BABB`、muted `#90989D`，小範圍 accent `#97C9B3`。主要 CTA 明亮，綠色用於 active／success／progress／focus。

系統繁中字體；Display / H1 / H2 / H3 / Body / Small / Label / Caption / Metric tokens。數字使用 tabular-nums。Spacing 4–64 的刻度，radius 8 / 14 / 22，低透明度 border，少量 dialog blur。實測文字對比見驗證文件。

## 4. Motion system 與新增動畫

fast 150ms / normal 250ms / slow 500ms；standard / enter / exit easing；位移 4–8px、按下 .98 scale。CSS 與小型 rAF 插值完成，不引入 Framer Motion / Anime.js。

範例 250ms 快速填入、分析三步 1500ms、landing exit／workspace entrance、journey 線／勾選、current node breathing、dragover 1.01、文件 settle／scan 1000ms、欄位 40ms stagger、延誤 count-up、準備度與弧同步 500ms、+分數短暫顯示、下一步內容淡入、source panel／sheet、dialog 短退場、toast。簡單 hover／focus／press 用 CSS。

原生 dialog 支援 Tab / Shift+Tab / Escape 與焦點恢復，選單支援 Escape／外部點擊收合。Reduced motion 取消非必要動畫與數字插值；狀態與辨識 loading 仍保留。

下一步內容採同一 claim 更新後的淡入與微小位移，沒有保留舊內容做重疊 crossfade；這可避免額外 DOM 與互動混淆。

## 5. Desktop / Mobile

桌面完整三欄，中央為主；1280px 以上兩份文件並排。平板兩欄，助理可收合。手機使用總覽／旅程／助理；總覽優先顯示準備度與 CTA，旅程上傳後分頁列仍顯示即時準備度。390px 主要 CTA 可直接看到；320px 保持單欄，部分內容需正常垂直捲動，無橫向溢出。

## 6. Golden Path 與 mock 範圍

Landing → 1500ms 理解事件／辨識服務／建立旅程 → 35% → 登機證 1000ms 辨識 → 70% → 延誤證明 1000ms 辨識 → 14:20 / 21:43 JST、7 小時 23 分 → 90%、Ready for Review → 勾選確認 → 100% → 前往服務預覽。

Workflow 仍維持 `READY_FOR_REVIEW`，沒有核准或送出申請。Score / delay / state / next action 的核心函式維持原樣，原測試通過。

仍為 mock：意圖與信心、文件欄位、FAQ／來源、required evidence、真人接續、正式入口。車禍／繳費變更仍只提供預覽。使用者文件只驗證型別／大小，不讀內容、不上傳。

## 7. Storage / branding migration

沿用同分頁 `sessionStorage`，不改為永久 localStorage。新 key `navi.case` 優先讀；缺少時讀舊 key，經既有 owned fixture 還原，再寫入新 key。只有成功寫入後才移除舊 key；失敗仍保留記憶體與舊進度。Reset 清除兩者。

產品 UI、README、docs、metadata 與 package 名稱均已改名。原始碼只保留 1 處 legacy key 字面值，專供既有進度相容，非品牌殘留畫面。歷史 ignored QA artifacts 不列入產品來源。

## 8. Build / QA

`npm run build` 通過；`npm test` **4 passed / 0 failed**。桌面與 390px 於 NAVI 更名後均完整跑到 100%；320px 完整流程與更名後版面／分頁驗證，1024px 收合助理。Picker、unsupported、remove、re-upload、failure/retry、reload、reset、sources、unknown confidence、review、reduced motion override 與 keyboard 均已檢查。

本機 DataTransfer File 事件測試確認 drop pipeline 正常；瀏覽器工具無法傳 OS file payload，因此未宣稱 Finder 檔案拖曳完成。OS reduced-motion 開關與下載落盤亦未實測；產品 override 與可複製摘要已驗證。完整明細見 [verification](verification.md)。

## 9. 後續可提升與 technical debt

- 視覺可再做正式 BNP / Cardif 品牌規範校對，並測試指定企業中文字體；目前為系統 fallback 與概念 accent。
- 高密度文件的英文 caption 可在錄影視窗尺寸確定後再微調；320px CTA 仍以正常捲動取得。
- 瀏覽器內 case state 適合 demo；正式權限、審計與伺服器驗證未建立。Mock 文件與任意敘述可能不一致，已明確標示範例資料。
- 進度僅保留於同分頁，追問不儲存。下載實測與 OS 檔案拖曳應於錄影機器再快速確認。
- 後續 Gemini 應經 Node API 接收 validated structured schema；仍由 deterministic workflow 決定 state / readiness / next action。知識先用 verified JSON，需求明確後才評估 RAG。**這只是建議，本次沒有實作。**

## 10. 最新 NAVI 截圖

截圖為本機 artifact，不納入 Git。

| 狀態 | 畫面 |
| --- | --- |
| Landing | [首頁](../artifacts/phase-1.5/landing.png) |
| Analysing | [理解情況](../artifacts/phase-1.5/analysing.png) |
| Initial Workspace 35% | [初始旅程](../artifacts/phase-1.5/workspace-35.png) |
| Boarding Pass 70% | [登機證完成](../artifacts/phase-1.5/boarding-70.png) |
| Delay Certificate 90% | [延誤時間與 Review 下一步](../artifacts/phase-1.5/delay-90.png) |
| Review 100% | [資料確認完成](../artifacts/phase-1.5/review-100.png) |
| Human Handoff | [專員接續](../artifacts/phase-1.5/human-handoff.png) |
| Mobile 390px | [總覽](../artifacts/phase-1.5/mobile-overview-390.png) · [首頁](../artifacts/phase-1.5/mobile-landing-390.png) |
| Mobile 320px | [總覽](../artifacts/phase-1.5/mobile-overview-320.png) · [旅程](../artifacts/phase-1.5/mobile-journey-320.png) · [首頁](../artifacts/phase-1.5/mobile-landing-320.png) |
| Sources | [來源側面板](../artifacts/phase-1.5/sources.png) |

完成後停在 Phase 1.5 UI / UX 與 NAVI 品牌確認，等待使用者確認。
