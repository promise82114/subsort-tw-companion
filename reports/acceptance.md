# 本機驗收 — 2026-11-26

首次發布前再次驗收：20/20測試、production build與11組瀏覽器情境通過。建議標語分行、白金方向及恐怖等提醒已修正，見[發布驗收](release-20261126.md)。

後續精簡版本已完成：43張官方封面、23款至少一平台本體獎盃數、移除列內詳情／筆記／來源，入庫日期外顯。最新20項測試與11組production瀏覽器情境通過，見[本輪報告](ui-refinement-20261126.md)。以下保留首次建置的驗收範圍與限制；已被後續版本移除的詳情／筆記UI不代表目前仍提供。

## 交付與真實資料

已完成Vue 3 + Vite站台、Node擷取／匯入／比對／驗證工具、JSON schema及快照／人工修正／移除事件、首次研究與可重複更新文件。沒有後端、登入、排程或付費AI API。

- 上游全量1,558筆，指定網址55款候選；已回查公開客戶端預設Premium(PS)，包括Extra子集與Premium專有項目。
- 台帳官方目錄530筆：遊戲380、經典150，各27組count核對成功。
- 43款確認（35升級以上、8高級），12款待查，0直接排除；42款分級、1款設備／模式待評估。
- 3款有公開本體獎盃攻略；全部台灣NP群組ID尚未核實。其餘40款獎盃資料未知。
- 官方離庫日期未知；未把週期推測、每月遊戲領取截止或美帳日期當作台灣離庫公告。
- 真實清單與正式JSON有來源URL／查詢日期；測試合成資料只在測試與隔離private storage，不混入正式遊戲清單。

來源及完整待查名單見 [SOURCES](../SOURCES.md)、[更新報告](latest-update.md)、[來源證據](source-evidence.json)。本次多次實際更新已成功；最後成功資料未被失敗測試覆蓋。

## 自動驗證

|檢查|結果|範圍|
|---|---|---|
|npm test|18／18通過|Node20.18及Node22.23.5均實跑；Windows不依賴shell glob或測試目錄的版本差異|
|資料驗證|通過|schema、重複ID、版本引用、本體獎盃加總、公開快照鏡像一致|
|production build|通過|Vue／Vite，固定Pages子路徑；JS壓縮後約58KB|
|production browser|10組情境通過|Chrome隔離context，測試伺服器自動關閉，沒有本機資源404或console／page error|
|來源POC|成功|SubSort API、兩份台灣目錄、43份公開商店說明、3份獎盃攻略|

18項單元／管線驗證涵蓋：ll日曆月邊界與非免費欄位未知、全量與重複ID、concept／product＋平台匹配、官方公告地區／平台、JSON／CSV／Markdown、來源503與失敗更新不變、合法未知值、儲存格式、清理範圍、局部台帳暫缺不刪除、撤銷保留後續變更、重新入列即使同來源快照仍建立新週期。

10組瀏覽器情境涵蓋：

1. 真實production artifact於 `/subsort-tw-companion/` 載入43款候選。
2. 中文／英文搜尋，平台／方案／類型／白金／排序控制。
3. 列內狀態、筆記即時保存、重整保留、文字跳脫；完成／略過立即隱藏與還原。
4. 私人JSON匯出、取消匯入不變、實際差異、下載含兩端原文的復原備份、確認覆蓋與精準撤銷、損壞匯入拒絕。
5. 待查與來源揭露，沒有真實移除事件時禁止清理。
6. 損壞LocalStorage保留原文、禁止新寫入、提供復原匯出。
7. 2560、1920、1440、1024、820、768、390、320寬度無水平溢位，手機視窗／Escape可操作。
8. 切功能重設篩選、手機選單選定後收起、1920／2560備份工具與正文右緣對齊。
9. 展開後本體獎盃50與區域未知提示、未知官方日期正常呈現。
10. 匯入預覽後模擬其他分頁修改即停止；QuotaExceededError不誤報已保存、不改成功狀態。

原始本機瀏覽器結果在忽略的 `test-results/browser.json`，可透過同一腳本重跑。真實本期沒有移除事件，因此清理／重新入列採單元及管線合成生命週期測試，沒有聲稱已實際清理玩家舊紀錄。

## UI／UX修正

依使用者補充，讀取game-companion的共通介面偏好並套入本repo：淺色工作區、左側導航、右上「備份與還原」、緊湊單欄、列內直接狀態操作、按需詳情／筆記、來源獨立功能、可點摘要、切功能重設條件。既有五狀態與筆記依本專案明確規格保留，不改成純二態收集。詳細落地規則見 [UI_PREFERENCES](../docs/UI_PREFERENCES.md)。未修改參考repo。

## 驗收限制與待處理

- 設計技能初次gate於系統Node20回報：`GATE: ERROR`（缺少內建WebSocket，consistency／layout／copy未完整執行）。[design-taste-frontend SKILL.md](C:/Users/jin5001/.agents/skills/design-taste-frontend/SKILL.md)明訂此情況「put the line in the report and finish; do not rerun」，故未重跑gate；這不等同通過視覺品質檢查。
- 另安裝隔離Node22嘗試技能截圖，工具逾時，沒有有效截圖或逐張視覺驗收；Chrome／Edge工具限制不隱瞞。上列production瀏覽器操作與尺寸檢查已獨立成功，但不是完整設計gate。
- 尚未以實體手機、台灣登入主機領取、實際PSN跳盃驗收；公開台帳可能更新延遲。
- 12款台帳待查、Help Wanted 2設備需求、40款獎盃、台灣NP群組及官方離庫日期仍待補查；已於站內明示。
- 未取得Pages設定與發布權限的可驗證證據；未登入GitHub API回404，本機沒有gh CLI。只有手動發布workflow，沒有觸發。

## Git與發布

目前develop分支，origin保留。既有README更新，應用／資料／工具／文件新增；原先使用者提供且未追蹤的規格文件保留。cache、node_modules、dist、profile、測試私人紀錄皆忽略。沒有commit、push或部署。

後續收到發布指令，才依README確認GitHub Pages設定、分支政策、提交範圍與workflow結果。當前可用 `npm run dev` 本機檢視。
