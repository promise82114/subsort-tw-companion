import fs from 'node:fs/promises';
const snapshot=JSON.parse(await fs.readFile('data/snapshot.json','utf8'));
const rows=[];
for(const e of snapshot.watchlist.entries){const game=snapshot.games.find(g=>g.gameId===e.gameId);for(const v of game.versions){if(v.baseTrophies)continue;rows.push({conceptId:game.twConceptId,gameId:game.gameId,name:game.nameEn,platform:v.platform,query:`${game.nameEn} ${v.platform} base game trophy count bronze silver gold platinum`,reason:'需核對同平台與本體分組，不直接套用全套含DLC總數'});}}
await fs.mkdir('reports',{recursive:true});await fs.writeFile('reports/trophy-research-queue.json',JSON.stringify({schemaVersion:1,generatedAt:new Date().toISOString(),rows},null,2)+'\n');console.log(`待補 ${rows.length} 個平台版本；建議搜尋公開索引／可合法讀取的清單，人工複核後填入 data/trophy-counts.json。`);
