# SOURCES — 已實測來源與維護方式

實測日期：2026-11-26，Asia/Taipei。公開可讀不等於概括再散布授權；只保存必要事實、連結與自行撰寫的判斷。原始 HTML／JSON 存於忽略的 cache，不提交；不複製上游介面、文案或登入資料。

最新補充：已分離數量與攻略，23款至少一平台有本體獎盃數，20款仍待查；43張封面採台灣目錄的image.api.playstation.com縮圖。快速查找、403與robots限制、本體／DLC核對見[精簡介面與獎盃研究](reports/ui-refinement-20261126.md)，實際數字來源位於data/trophy-counts.json。下方三份攻略是首次研究的白金時間來源，數量不再只限於這三款。

## SubSort：可自動取得

- 指定清單：<https://www.subsort.gg/en?xb=0&av=ll>。
- 公開介面：<https://www.subsort.gg/api/games>，HTTP 200，`{games:[...]}` 實測1,558筆。原站客戶端消費完整陣列，無分頁；HTML本身只有骨架，不能以骨架判斷空清單。
- [robots](https://www.subsort.gg/robots.txt) 明確允許 `/api/games`。不使用其他被禁止的 `/api/` 或 `/private/`。
- [條款](https://www.subsort.gg/en/terms) 說明beta可能不準確、UI與文案受保護，未提供概括再散布授權。維持個人用途與來源署名，發布前重查條款。
- 公開JavaScript已核實：xb=0關閉Xbox；av=ll為likelyLeaving；**PS預設Premium(PS)**，不是Extra；排序added-date-desc。來源以美帳為基準。
- ll規則：Third party、非免費、有addedDate；完整日曆月數 >1 且 <24，`months % 6 >= 4`。這是6個月週期之前約2個月的推測，不是官方公告、離庫機率或風險排名。`upstreamRank=null`，另留畫面位置upstreamPosition。
- 55款指定候選，含46款Extra子集及9款Premium專有項目。不能只抓Extra後宣稱涵蓋指定網址。
- 主線時間與評分由SubSort轉載，保留原始HLTB／Metacritic網址；未假稱已直接查閱原始量測。全完成時間不作白金時間使用。
- `npm run sources:audit` 重查robots／條款與客戶端契約，保存腳本URL及SHA-256至 `reports/source-evidence.json`。契約改變就停止並修adapter。

## 台灣官方目錄：遊戲380筆、經典150筆

從[官方入口](https://www.playstation.com/zh-hant-tw/ps-plus/games/)載入的[公開game finder程式](https://www.playstation.com/content/dam/global_pdc/en/services/ps-plus/game-finder/js/main.js?v=1014)確認以下實際介面：

- [遊戲目錄](https://www.playstation.com/bin/imagic/gameslist?locale=zh-hant-tw&categoryList=plus-games-list)：最低Extra（升級以上）。
- [經典目錄](https://www.playstation.com/bin/imagic/gameslist?locale=zh-hant-tw&categoryList=plus-classics-list)：Deluxe（高級）。

各27組，逐組檢查count===games.length，驗證台灣商品網址、conceptId、device。無分頁。美帳Premium不直接當成台帳全部可用，仍依台灣目錄逐項確認。

匹配只使用conceptId或**完整相同productId**，再取共同平台，不按名稱合併。35款升級以上、8款高級確認，12款待查，0款直接排除。公開目錄可能延遲；未登入主機領取驗證。

- A Space for the Unbound：上游PS4／PS5，台帳目錄僅PS4，因此只列PS4。商店預設PS5不代表訂閱包含。
- ANNO: Mutationem Collector's Edition：上游productId `UP6305-PPSA05925_00-7779893283764094` 與台帳concept 10001119下的收藏版完全一致，可確認，並非只按標題判斷。
- [PlayStation robots](https://www.playstation.com/robots.txt) 指定crawl-delay 5；工具至少間隔5.1秒。Store robots禁止chihiro-api，沒有使用。

## 商店與推薦研究

`https://store.playstation.com/zh-hant-tw/concept/{id}` 的公開HTML可解析JSON-LD Product及application/json的description，不執行外部腳本。`npm run research -- YYYY-MM-DD` 提供研究材料至cache，每次商店請求至少間隔1秒，成功快取可重用。重新查詢時先移走相應舊快取；不要改正式快照。

已讀43款商店說明，`data/research.json` 保存自行撰寫的判斷與日期；42款分級，Help Wanted 2因台帳VR／非VR模式及設備未確認而保持待評估。中文名只採台灣目錄原文，未提供就顯示英文。沒有自動編造翻譯或評論。

一般更新沿用既有研究；新遊戲缺證據保持null。`seed-research.mjs` 僅重建首次研究，日後不要覆蓋新研究。指定重評須先補查事實，再用 `update --reevaluate`。

## 獎盃：攻略可用，台灣NP群組未知

已查閱下列公開攻略，只整理本體事實，不含DLC：

|作品／適用平台|本體數量|白金時間|來源|
|---|---|---|---|
|FINAL FANTASY XVI／PS5|50：銅40銀6金3白金1|70–90小時|[攻略](https://www.powerpyx.com/final-fantasy-16-xvi-trophy-guide-roadmap/)|
|Resident Evil Village／PS4、PS5攻略範圍|50：銅40銀6金3白金1|20–25小時|[攻略](https://www.powerpyx.com/resident-evil-8-village-trophy-guide-roadmap/)|
|Life is Strange: Double Exposure／PS5|33：銅8銀21金3白金1|15小時以上|[攻略](https://www.powerpyx.com/life-is-strange-double-exposure-trophy-guide-roadmap/)|

攻略儲存於 `data/trophy-research.json`；數量補充獨立放 `data/trophy-counts.json`，不依賴完整攻略。本輪23款至少一平台有數量、20款仍未知；除上述3款外沒有據此推導白金時間。平台與台灣NP群組未核實的範圍於來源頁說明。PSNProfiles的Web工具存取未成功，未繞過；未使用需要NPSSO憑證的psn-api。不猜區域群組ID。

補數量以TrueTrophies公開搜尋索引的本體分組及平台資訊人工複核，取得方式明列public-search-index-reviewed；[本體／DLC示例](https://www.truetrophies.com/game/granblue-fantasy-relink/trophies)。直接HTTP回403時不繞過。[PSN API公開文件](https://github.com/andshrew/PlayStation-Trophies/blob/master/docs/APIv2.md)所需登入Token不引入本專案。

## 官方離庫：沒有可逐版確認日期

查閱[官方最新內容](https://www.playstation.com/zh-hant-tw/ps-plus/whats-new/)與[2026-11-11官方目錄公告](https://blog.zh-hant.playstation.com/2026/11/11/20261111-psplus/)，未取得能對目前候選逐版確認的離庫公告。每月遊戲領取截止與升級／高級目錄離庫不同。`officialDeparture=null`，不把SubSort日期轉成台灣公告。

## 失敗與合法備援

空清單、來源錯誤、count不符、重複ID與大幅縮減均停止，保留正式資料。完整成功清單確認項目不再屬上游候選，第二次獨立擷取相符後才產生移除事件；台帳找不到只列待查。

`npm run import:list -- PATH` 支援JSON／CSV／Markdown，先暫存再驗證，不直接替換。需要穩定ID、日期與完整清單證據。無合法來源時向使用者索取真實匯出，不以其他網站冒充SubSort。

網站本身無上游API／登入／追蹤請求。依使用者介面偏好改用系統字型，不載入遠端字型。快取、profile及私人筆記均不發布。
