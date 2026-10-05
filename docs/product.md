# NAVI · Product scope

**AI Service Journey Navigator**  
**Understand. Guide. Resolve.**  
理解需求，引導流程，完成服務。

NAVI 是 AI 智慧服務旅程導航平台，將使用者的需求轉化成可執行的服務旅程。使用者不需要知道功能名稱、保險術語、文件位置或正確服務入口；描述想處理什麼，平台即整理目前狀態與下一步。

## 品牌與定位

Customers shouldn't need to understand insurance to use insurance.

NAVI understands what users need and turns their intent into an actionable service journey.

「使用者不應該先學會複雜的保險流程，才能使用保險服務。」

「NAVI 會理解使用者真正想做什麼，並將需求轉化成清楚、可執行的服務旅程。」

平台未來可以涵蓋理賠、保單變更、繳費、保單與產品知識查詢、FAQ / 文件搜尋、功能入口導航、文件理解、Next Best Action 與專員接續。**這是平台定位，不代表本次新增這些流程的完整實作。**

## 已完成範圍

- Flight Delay Claim 為第一個完整 Golden Path；其他類型提供意圖判讀與尚未開放完整旅程的說明。
- 繁中為主，英文為輔；Header / 助理 / 摘要 / metadata 全面使用 NAVI。
- 深色 command surface 首頁、三欄服務工作區、服務準備度、文件與下一步。
- 固定 35 → 70 → 90 → 100；登機證、延誤證明、移除、重傳、確認、服務導引預覽。
- 來源側面板／手機 bottom sheet、FAQ、未知意圖的補充說明與低信心專員接續與文字服務摘要。
- Loading、空白輸入、文件處理／成功／不支援／失敗重試、toast 與 dialog。
- 同分頁 sessionStorage 進度保留及一次性品牌 key 遷移；不讀取或傳送文件內容。

## Design system

主底色 `#0A0B0D`，surface `#101215`，raised `#15181C`；主文字 `#EEEFE9`，secondary `#B4BABB`，muted `#90989D`。小範圍 sage accent `#97C9B3` 用於進度、成功、active 與 focus。明亮 CTA 提供穩定對比，其餘以分隔線與空白建立層次。

繁中使用系統字型（PingFang TC / Noto Sans TC / Microsoft JhengHei fallback）。Display 38–62、H1 30、H2 18、H3 16、body 14、small 13、label 12、caption 11、metric 72；高密度文件輔助文字有個別較小尺寸。主要數值使用 tabular-nums。Spacing 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64；radius 8 / 14 / 22。Wordmark 採 NAVI 與簡單階梯路徑符號，非正式 BNP / Cardif 品牌標誌。

桌面三欄以中央為主；1280px 以上文件並排。平板兩欄，助理可展開／收合；760px 以下採總覽／旅程／助理分頁，總覽優先呈現準備度與下一步。

## Motion system

CSS tokens：fast 150ms、normal 250ms、slow 500ms；standard / enter / exit easing；距離 4–8px，按下 scale .98。首頁分析 1500ms；文件處理 1000ms。動畫以 opacity / transform 為主；數字與圓弧共享 500ms 插值，不增加動畫套件。

範例文字 250ms 快速填入、分析步驟、timeline 線填滿／勾選、current node breathing、文件掃描、欄位 reveal（40ms 間隔）、延誤數字、下一步內容 reveal、來源 panel、dialog entrance / shorter exit、toast 均共用 motion tokens。Reduced motion 取消非必要動畫與數字插值；可用系統偏好或右上選項切換。

Native dialog 加入 Tab / Shift+Tab 邊界處理、Escape、關閉後焦點恢復。互動使用 semantic buttons、輸入 labels、focus-visible、狀態文字與 progressbar ARIA；不靠顏色作為唯一訊號。

## 範圍邊界

NAVI 是 Intelligent Service Navigation & Orchestration Layer，不取代核心保險系統。100% 準備度不代表核准；前往服務僅開說明視窗。Workflow 仍停在 READY_FOR_REVIEW。

Phase 2A 已新增 Express 與 server-only Gemini 自然語言理解、嚴格 Schema、deterministic service mapping、Unknown 補充說明、低信心轉交與明確示範備援。真實 Provider QA 待 API Key 設定。沒有 MongoDB、RAG、真實 OCR、官方條款、真人或正式送件；文件／FAQ／來源仍為 Mock。模型 confidence 不代表已校準機率。
