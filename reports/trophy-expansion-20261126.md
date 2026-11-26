# 獎盃擴充與PS5優先 — 2026-11-26

GATE: ERROR（既有視覺技能環境限制；本輪未重跑或宣稱該gate通過）。依C:/Users/jin5001/.agents/skills/design-taste-frontend/SKILL.md：GATE: ERROR時記錄並停止重跑。此次用獨立production瀏覽器驗收與截圖檢查此增量功能。沿用本專案淺色、單欄、官方封面與精簡列，不做行銷頁重設計。

## 結果

- 本體數量23→41／43款（皆涵蓋各款PS5優先平台；僅PS4作品保留PS4），新增18款，另補ANNO與百英雄傳PS5版本。非優先版本仍有缺口，共19個平台版本本體未知；不把PS5搬到PS4。
- 14款、30個DLC／更新分組另顯示；本體數量不被含DLC總數覆蓋。存在DLC商品不代表有額外獎盃，訂閱也不保證包含DLC。完整清單未列追加組標none，其餘缺少資料維持待查。
- 原43款候選、12款台帳待查、所有gameId/cycleId、名單擷取時間及私人紀錄流程保留。不是新一輪上游資料更新；數量查核日期2026-11-26。

|PS5作品|本體|追加|依據|
|---|---:|---:|---|
|人中之龍8|65|Master Vacation Pack 9|[本體](https://www.truetrophies.com/game/like-a-dragon-infinite-wealth/trophies)、[DLC](https://www.powerpyx.com/like-a-dragon-infinite-wealth-master-vacation-pack-dlc-trophy-guide-roadmap/)|
|黑色沙漠|15|清單未列追加組|[PS5清單](https://www.truetrophies.com/game/black-desert/trophies)|
|Cyberpunk 2077|45|Phantom Liberty 13|[本體](https://www.truetrophies.com/game/cyberpunk-2077/trophies)、[DLC](https://www.powerpyx.com/cyberpunk-2077-phantom-liberty-dlc-trophy-guide-roadmap/)|

其他有追加組：Firefighting Ignite、Blades of Fire、Kingdom Come、Life is Strange Double Exposure、FF16、A Little to the Left、Darkest Dungeon II、RE Village、Granblue Relink、Wo Long、Another Crab、Atlas Fallen。逐組數量、類型、來源與日期均保存在data/trophy-counts.json及正式快照。KCD部分分組、Darkest Dungeon II的Inhuman Bondage目前僅保存組數量，尚未保存完整類別細數；此時只顯示數量，不用虛構的圖示數字。

## 原因與維護

之前補查停在部分來源或人工研究尚未完成，且沒有DLC欄位；不是上述知名IP找不到清單，也不是仍只吃三篇固定攻略。本輪新增可重用trophies:import、PS5優先補查佇列、追加組schema與加總／重複／範圍驗證。合法公開搜尋索引的方式繼續使用，不突破403或robots限制、不需憑證／付費AI。

尚未解決：RIDGE RACER原版PS1移植只找到支援預告，不能套Arcade Archives 2／Vita版本；SOULCALIBUR III只有發售時未支援獎盃報導，尚無後續可核實清單，不當作今日零盃。具體研究紀錄在researchGaps，補查清單會帶出理由。台灣NP群組仍全部未核實，ANNO PS5來源標EU，保留區域限制。

## 驗收與狀態

- 24／24測試通過：平台不串資料、DLC加總、重複分組、部分類別未知、本體／追加分開、無效匯入不變更檔案。
- validate、production build通過；12組Chrome production情境通過，包含知名三作、DLC／免費更新、PS5預設／PS4明選、320–2560版面、儲存與安全匯入。
- 初次新增長名稱在820px出現溢出，已以數值區換行與寬度限制修正，完整重測通過。
- C磁碟空間不足，測試改用D磁碟隔離暫存，未刪除使用者檔案。
- 本機驗收時尚未commit、push或部署；其後使用者已授權發布，最終結果以GitHub Actions與線上驗證為準。
