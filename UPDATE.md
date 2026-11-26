# UPDATE — 手動更新 SOP
1. 讀規範、檢查 git status、既有資料、上次報告；不覆蓋使用者未提交修改。
2. 執行既有擷取工具取得完整 SubSort 清單，核對頁數、數量、參數、時間與來源。失敗則保留舊快照，記錄原因；可合法替代或請使用者匯入清單，不假裝成功。
3. 取得台灣 PS Plus 對應目錄（確認方案、PS4/PS5、地區與版本），逐項匹配。確認未入庫才排除；無法確認另列待查，不誤判。官方出庫公告另查。
4. 比對穩定 ID 與快取；新遊戲及缺失欄位才研究。舊資料可信則沿用；重大更新或使用者指定才重評。每個重要欄位記錄來源及查詢日期。
5. 依 EVALUATION.md 評估，排序當期候選。人工 overrides 優先。保留已離開清單的客觀資料快取。
6. 只有官方確認已出庫，或完整成功快照確認已不在上游候選範圍，才產生移除事件。對不確定消失或異常大幅縮減先複核（必要時第二次獨立成功擷取），不清理筆記。確認移除後由瀏覽器清理對應追蹤週期；重新入列為新週期。
7. 暫存新資料，驗證 schema、ID、引用、來源、數量與移除事件；通過後才替換正式快照。測試 build 及狀態/筆記生命週期。失敗保留最後成功版本。
8. 更新 SOURCES.md（若方法變更）及 reports/latest-update.md：原始數量、台帳確認/排除/待查、新增/移除名單與原因、沿用/新評估數、缺口、驗證結果、git diff 摘要。
9. 預設停在本機驗收；收到發布指令才 commit/push，檢查 Pages 部署。不新增資料排程。

獎盃補查可由 Codex 使用 AI 搜尋公開資料，不需付費 AI API。先用 `npm run trophies:queue` 找出缺項，逐平台核對本體／DLC分組、完整類別加總、來源網址與日期，再寫入 data/trophy-counts.json，執行 enrich:display、validate 與測試。數量不依賴完整攻略；403 不繞過，改找合法公開來源；未核實保留未知，報告具體缺口。搜尋摘要須足以確認版本與本體範圍，不將 AI 記憶視為證據。

## 獎盃補查與DLC更新

1. 執行 npm run trophies:queue，預設只查每款PS5優先平台；需要其他版本時加 -- --all-platforms。清單分base、additional欄位並保留具體研究缺口。
2. 每次更新由Codex搜尋缺項及已有追加清單的變化；以原文名＋平台＋trophies、必要時改用其他合法公開清單。不能在第一個來源403後就把熱門作品當作無資料。完整攻略不是必需。
3. 人工核實JSON沿用data/trophy-counts.json格式：schemaVersion=1、entries[conceptId][platform]，scope=base、counts、source、platform不可缺。additional可選，包含status、source與groups；各組必須有id、name、kind（dlc/update/unknown）、total、counts與source。counts細分未知用null，不用0補齊。overallTotal可供本體＋追加加總核對。
4. 執行 npm run trophies:import -- cache/reviewed-trophies.json，整份驗證成功才改快取，舊快取備份到cache/trophy-counts-before-import.json；錯誤輸入不改正式資料。接著執行npm run enrich:display、npm run trophies:queue、npm test、npm run build、npm run test:browser。
5. status=none只在完整清單未列追加組時使用；未查留空，partial標已知部分。追加數量不得混入本體，不能由PS4推算PS5。補查不改動候選名單、cycleId、私人紀錄或原始清單擷取時間。
6. 報告優先平台覆蓋數、其他平台缺口、DLC／更新分組、仍未核實原因與網址。缺口消除後移除對應researchGaps；未解決的支援／版本疑義保留，不用虛構零盃結案。
