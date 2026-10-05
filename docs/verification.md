# NAVI · Phase 1.5 verification

## Build / tests

`npm run build` 通過。`npm test` 使用 Node 內建 runner，4 項通過、0 失敗，無新增測試套件：

1. 原有 Golden Path：35 / 70 / 90 / 100、撤回與 review stopping state。
2. 原有邊界：意圖、專員、逆序文件、跨日時間、文件大小／MIME／空檔、損壞進度。
3. 數字插值：邊界、終點、單調增加及撤回。
4. 品牌進度：恢復舊 key 完成狀態，新 key 優先。

原有 workflow test 檔案未修改。Workflow domain 的唯一變更為 storage key 常數與相容讀取；計分、延誤計算、服務識別、文件增減及狀態推導皆維持原樣。

## 瀏覽器 QA

| 項目 | 結果 / 實際範圍 |
| --- | --- |
| Desktop Golden Path | NAVI 改名後再次 35 → 70 → 90 → 100，Review 後服務導引 modal |
| 390px Golden Path | 改名後完整重跑，範例文件、確認、100% reload |
| 320px | 完整流程已跑；改名後再查 landing、總覽、旅程與鍵盤 tabs；無水平溢出 |
| Tablet 1024px | 兩欄，助理展開／收合正常 |
| Landing empty / analysing | 空輸入提示與 focus；快速範例填入、1500ms 3 步分析過場 |
| File picker | 實際 PNG → 70%；TXT → 中文不支援錯誤 → PNG 重新選擇成功；手機 Next Action 可開 picker |
| Drag / drop | 本機 DataTransfer + File + DragEvent fixture，PNG → 70%，TXT → 可復原錯誤 |
| Remove / re-upload | 100% 移除登機證 → 55%，清除確認；重傳 → 90%。移除延誤證明 → 70% |
| Upload failed / retry | 示範失敗不改 35%；重新嘗試 → 70% |
| Persistence | 同分頁重新載入保留 100%；品牌變更後亦保留進度 |
| Demo reset | 清除新／舊 key，回首頁，空輸入，不保留文件與確認 |
| Reduced motion | 產品「減少動畫」開關：computed animation 為 none、立即更新、分數正確。系統 media query 分支已檢查程式 |
| Keyboard | 表單 Tab / focus-visible；tabs Arrow keys；dialog Tab / Shift+Tab 邊界、Escape、關閉回到觸發按鈕；選單 Escape |
| Review | 勾選前 CTA disabled，確認才達 100%，前往服務不送件 |
| Sources / no sources | FAQ 繁中回答與 2 項來源側面板；未知追問提供無來源說明；Review 可返回 |
| Human Handoff | 42% mock 信心、平靜說明、服務摘要、資料／待確認清單、成功提示；準備後焦點到下載按鈕 |
| Summary | 產生 NAVI 文字摘要並可複製；不顯示 JSON，不送交真人 |
| Secondary intents | 改名後確認車禍／繳費變更與下一步預覽 |
| Browser title / metadata | NAVI — AI Service Journey Navigator；新 meta description 與 favicon |
| Final console | 最後一輪產品 QA 無 error / warning |

## 明確限制

- CUA 瀏覽器工具的原生拖曳只傳文字 payload，未能傳入 OS 檔案。已以本機 DataTransfer 檔案事件測試真正的 component drop 處理，但**未宣稱 Finder 檔案拖曳已實測通過**；仍建議現場以 Finder 快速拖入一份測試 PNG。
- 未改動 macOS 的系統 reduced-motion 偏好；實測產品 override，系統 matchMedia / CSS 分支已檢查。
- In-app browser 的下載落盤無法可靠驗證。已驗證文字摘要內容與可選取複製 fallback，未宣稱下載檔案成功保存。
- 未執行正式 AI、OCR、保險資格判定、真人接續或送件；這些不在本次範圍。

## Contrast

依 WCAG sRGB 公式計算 semantic token 配色：主文字 / canvas 17.03:1；secondary / raised 9.06:1；muted / raised 6.07:1；accent / raised 9.60:1；CTA 深文字 / off-white 15.27:1。非文字細分隔線刻意低對比；互動另有 focus-visible 與語意狀態。

## 品牌殘留

Repo 原始碼、JSON、package metadata、README、docs 搜尋只找到一處歷史 key 常數，位於 `domain/workflow.js` 的 `LEGACY_STORAGE_KEY`。這是一次性相容用途，不會顯示於產品；其餘產品品牌字樣均為 NAVI。Ignored 歷史 QA artifacts 不是產品程式碼。

最新截圖位於 ignored `artifacts/phase-1.5/`，完整索引見 [完工報告](phase-1.5-report.md)。
