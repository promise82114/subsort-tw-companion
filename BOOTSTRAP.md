# BOOTSTRAP — 首次開工
在目前已建立的 Git repository 內工作。先讀 AGENTS.md、PROJECT_SPEC.md、UPDATE.md、EVALUATION.md、SOURCES.md。目標是交付可運作的個人 SubSort TW Companion，而非僅規劃或 mockup。
## 執行順序
1. 檢查 repository、git status、Node 環境與既有設定；保留現有檔案。確認 Pages 部署選項及權限。
2. 優先做資料 POC：實測 SubSort 指定清單、台帳目錄、跨區/平台比對、獎盃來源；記錄證據與限制。若上游無法合法自動取得，實作手動匯入，向使用者索取真實清單；其他可獨立工作繼續。不得以假資料冒充正式資料。
3. 建立可重用 Node 腳本（擷取、匯入、比對、驗證、建置資料）、JSON schema/快取/人工修正、最後成功快照與移除事件機制。把已解決的問題沉澱為腳本與 SOURCES.md。
4. 依 PROJECT_SPEC.md 實作 Vue 3 + Vite 單頁網站，含搜尋、排序、篩選、狀態、筆記、匯出匯入及安全清理。使用 GitHub Pages 相容路徑。
5. 若來源可用，執行首次真實資料更新，研究新增遊戲並依 EVALUATION.md 評估。資料不足明示；若無法取得真實清單，正式資料維持空或待匯入，測試 fixture 與正式資料隔離。
6. 執行單元/整合測試與 production build；至少驗證來源失敗、版本匹配、未知欄位、狀態持久化、清理、重新入列、手機版及 Pages 路徑。若無法執行某項測試明示。
7. 生成 README.md（安裝、啟動、更新指令、部署、限制）、reports/latest-update.md；更新 SOURCES.md。只建立必要的部署設定，不建立資料更新排程或 AI API。
8. 回報實作、實際資料數量、來源缺口、測試、待確認事項及 git 狀態；預設不 push，等待發布指令。首次開工完成後本文件可封存，後續依 AGENTS.md。
## 完成標準
網站可本機執行、可建置、資料與私人紀錄分離；有真實清單或可用的手動匯入流程；更新可重複執行；無來源時不破壞舊資料。若有 blocker，交付可運作部分與最短補救步驟，不宣稱全部完成。
