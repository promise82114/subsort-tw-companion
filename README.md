# SubSort TW Companion

非官方繁體中文個人台帳遊戲決策工具。Vue 3 + Vite、Node腳本、JSON、LocalStorage；無後端、登入、AI API或排程。

首次資料：2026-11-26，SubSort指定55款，台帳確認43款（升級以上35／高級8），12款待查。詳見 [來源](SOURCES.md)、[更新報告](reports/latest-update.md)、[驗收報告](reports/acceptance.md)。

介面依 [本專案UI／UX偏好](docs/UI_PREFERENCES.md)：淺色、左側功能、右上備份與還原；單欄遊戲列含官方封面、數值、入庫日期與直接狀態操作，不再提供詳情與筆記展開，來源集中於來源頁，切功能重設條件。

本次補充：43張官方封面（合計約498KB），23款至少有一個平台版本的本體獎盃數量，20款仍待查；不把不同平台或DLC總數混用。見 [精簡介面與獎盃研究報告](reports/ui-refinement-20261126.md)。

## 本機啟動與驗收

建議Node 22 LTS，最低20.18；PowerShell：

```powershell
npm ci --cache .local/npm-cache
npm run dev
```

開啟 <http://127.0.0.1:5173/subsort-tw-companion/>。

```powershell
npm test
npm run build
npm run test:browser
npm run preview
```

瀏覽器測試自行啟動／關閉4173 production preview，使用已安裝Chrome的隔離profile；未裝Chrome可將測試channel改為已安裝的msedge，不使用個人登入資料。Vite base為 `/subsort-tw-companion/`，儲存庫改名時同步修改。

## 更新流程

依 [UPDATE.md](UPDATE.md)、[EVALUATION.md](EVALUATION.md) 工作；產品規格為 [PROJECT_SPEC.md](PROJECT_SPEC.md)。

```powershell
git status --short
npm run sources:audit
npm run research -- 2026-11-26
# 查閱cache/research.json，研究新項目後補data/research.json
npm run update
npm run enrich:display
npm run trophies:queue
npm test
npm run build
npm run test:browser
git diff --check
```

audit重查robots、條款與原站預設／ll規則，留下URL與雜湊。契約改變先修adapter。research只擷取研究材料，不自動編造推薦；未補研究的遊戲維持待評估。update重新取得上游及台灣兩目錄、沿用可信評估。可用 `--date YYYY-MM-DD` 固定日期；research日期須一致，不傳時用台灣當日。指定重新評估需先補查事實，再用 `update --reevaluate`。seed-research僅重建首次研究，不用來覆蓋日後資料。

### 手動來源備援

```powershell
npm run import:list -- C:/path/subsort-export.json
npm run update -- --input cache/imported.json --complete --date 2026-11-26
```

也支援.csv與.md表格；JSON為 `{ "games": [...] }`。必備id、gameName、platform；要重現指定清單，另需subscriptionPlan、providerType、addedDate、platformDetails、gameDetailsUrl、isFreeToPlay。布林用true／false，未知留空。CSV支援引號逗號及多行；Markdown儲存格有管線符號時改用JSON／CSV。

**--complete只供確認完整的原站全部遊戲匯出**，不能用局部畫面冒充。未確認完整會拒絕替換；手動來源不會自動產生移除事件，因缺第二次獨立證據。離線可加 `--catalog cache/tw.json --classics cache/tw-classics.json`，但須自行確認快取日期完整性，不冒稱新擷取。

### 人工修正、快照與復原

- `data/overrides.json` 優先於自動結果：games[gameId]需reason、source（url／checkedAt）、patch。允許姓名、類型、時數、評分、evaluation等欄位，不准改ID。mappings需upstreamId、twConceptId、platforms、reason、source；排除也需證據。
- `data/official-departures.json` 只放已確認台灣官方公告（gameId、platforms、date、source）；不填猜測。資料格式見該檔及驗證器。
- `data/snapshot.json` 為網站單一正式快照；games／watchlist／mappings／metadata為規格鏡像。validate檢查schema、引用及鏡像一致。
- 更新先驗證、寫journal及tmp，再rename；snapshot最後替換，失敗回復。原始成功回應留cache/snapshots。移除事件長期保留，重新入列建立新UUID週期。
- `.local/update.lock` 防止同時更新。若程序中斷，先確認沒有update在跑，再刪除這一個lock檔重跑；**保留journal**，下次啟動先回復整組舊資料。
- 上游或候選縮減超過30%停止。重查契約、日期、獨立擷取並留下覆核證據，再調整工具，不能清空舊資料解決。

## 私人紀錄

LocalStorage鍵 `subsort-tw:private:v1`，以gameId + cycleId識別。狀態即時保存在此瀏覽器；完成不代表白金，完成／略過預設隱藏但可還原。筆記操作入口已移除，既有筆記仍隨備份保存，不因改版刪除。不同裝置手動匯出／匯入，清除瀏覽器前先備份。

匯入顯示實際差異，下載含兩端原文的復原備份、確認保存後才合併不同鍵／覆蓋同鍵。復原備份頂層保留匯入前records，可直接還原，sourceRaw另保留完整匯入原文。預覽後有其他編輯則停止，須重新比較。可撤銷本次操作，後續已改的內容保留並告知衝突。清理先預覽、提供匯出，再確認；只處理完整有效快照內已確認移除的舊週期。篩選、台帳待查或缺資料不會清理。損壞／不支援版本的原始紀錄保留，停用寫入並提供原始匯出。

## 發布到GitHub Pages

origin為 `https://github.com/promise82114/subsort-tw-companion`，預設分支 main，開發分支 develop。Pages 使用 GitHub Actions，發布前執行本機驗收；無資料更新排程。

收到發布指令後：

1. 檢查差異、私人資料排除與最新驗證，只提交本次檔案，不覆蓋無關修改。
2. 確認GitHub Settings → Pages → Source為GitHub Actions，以及Actions／Pages權限。
3. 在 develop 完成 commit 後 push develop，再以 `git push origin develop:main` fast-forward 更新發布分支 main。推送被拒時先查遠端差異，不 force push。workflow_dispatch 需存在於預設分支 main。
4. 手動執行 **Publish GitHub Pages** workflow：測試、build、靜態部署。沒有資料更新排程，普通push不自動發布。
5. 等workflow／deployment成功，再驗證 `https://promise82114.github.io/subsort-tw-companion/` 子路徑、資料時間與狀態保存，才回報發布完成。

## 已知缺口

12款台帳待查、1款設備／模式待確認；20款尚無任何已核實平台的本體獎盃數量，全部台灣NP群組未核實。部分作品只核實其中一平台，另有39個平台版本待補；不將它們當成零盃。主線／評分目前透過SubSort轉載，不保證是台灣版本量測。公開目錄不等於主機實際領取驗證。視覺技能gate環境限制與瀏覽器驗收範圍見驗收報告。
