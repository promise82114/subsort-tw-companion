# 精簡遊戲列與獎盃數量研究 — 2026-11-26

## 介面

- 43款加上台灣官方目錄封面，左側112px（手機80px）；使用官方CDN縮圖，43張合計497,987 bytes，隨站本機提供，沒有執行時追蹤或第三方圖片請求。
- 移除每列私人筆記、資料來源、遊玩風險與評估區、離庫公告、整個詳情展開操作。來源統一在來源頁，入庫日期直接可見，方案簡寫升級／高級。
- 保留短推薦理由、建議畢業目標與少數具體提醒，直接選狀態、完成／略過預設隱藏、還原與撤銷仍可用。舊筆記不刪除，仍能匯出／還原。
- 獎盃顯示本體總數及白金、金、銀、銅圖示；標明取用平台。篩選PS4／PS5時只使用該版，不套另一版數字。

## 為什麼之前只有3款有獎盃數量

原管線把數量與白金攻略綁在data/trophy-research.json；只有研究過完整攻略的3款有數字。本次新增獨立data/trophy-counts.json，公開清單即可補數量，不要求白金時間／難度，也不替缺攻略的作品捏造估計。

目前23／43款至少有一個平台版本本體數量，20款尚無；共有39個平台版本待補。來源與平台記錄於JSON，台灣NP群組仍未驗證。

## 快速查找的可行方向

1. **先查公開搜尋索引的獎盃清單，核對平台與Base Game分組**：本次TrueTrophies索引可讀，可得到白金／金／銀／銅及本體分組；不需看完整攻略。數量是公開事實，只保存必要數字與URL，不複製攻略。
2. **可合法直接讀取的公開清單／攻略作第二來源**：PowerPyx robots允許讀取；實際URL需先搜尋，不憑作品名猜slug。原3款來源保留。
3. **維護候選查詢清單**：npm run trophies:queue輸出缺失版本、遊戲ID與查詢詞。找到資料後人工複核，填counts快取，再npm run enrich:display。未確認就維持未知，不自動靠相似名稱合併。
4. **官方PSN API暫不採用**：公開文件顯示需要OAuth／存取Token，與本專案不登入／不放憑證的方向不合。

直接抓TrueTrophies、Exophase、PlayStationTrophies.org實測回403；沒有嘗試繞過。PSMania可回頁面，但robots明確禁止ChatGPT-User等AI代理，因此未納入自動擷取來源。搜尋索引已公開可用的TrueTrophies資料與直接HTTP自動擷取分開記錄，本次acquisition標示public-search-index-reviewed，不冒稱取得其API。

## 本體／DLC核對例子

|作品|本體|清單合計|本次採用|
|---|---:|---:|---|
|Granblue Fantasy: Relink|54|96|54|
|A Little to the Left|48|66|48|
|Another Crab’s Treasure|33|39|33|
|Atlas Fallen|37|39|37|
|Blades of Fire|43|46|43|
|Firefighting Simulator: Ignite|41|77|41|
|Darkest Dungeon II|55|107|55|

來源URL與必要數字均存data/trophy-counts.json。Ridge Racer搜尋會混入Arcade Archives 2與Vita，不能套用其數量；未確認的經典移植仍留未知。

## 驗證與狀態

20項單元／管線測試通過，新增數量快取平台隔離、本體scope、加總與封面檔案驗證。11組production瀏覽器情境通過，含43張封面實際載入、列內無詳情／筆記／來源、入庫日期、圖示、無白金為0、未知保持未知、DLC不混入、狀態保存與舊筆記備份相容。

320–2560寬度無水平溢位，1920／2560工具列與正文對齊。Production build通過。只補呈現資料，不重新評估或改變55款來源範圍／43款正式候選；不commit、不push、不部署。
