import fs from 'node:fs/promises';
import {preferredVersion} from '../src/trophies.js';
const snapshot=JSON.parse(await fs.readFile('data/snapshot.json','utf8'));
const gaps=JSON.parse(await fs.readFile('data/trophy-counts.json','utf8')).researchGaps??{};
const all=process.argv.includes('--all-platforms'),rows=[];
for(const e of snapshot.watchlist.entries){
  const game=snapshot.games.find(g=>g.gameId===e.gameId);
  for(const v of all?game.versions:[preferredVersion(game)]){
    const fields=[...(!v.baseTrophies?['base']:[]),...(!['none','complete'].includes(v.additionalTrophies?.status)?['additional']:[])];
    if(!fields.length)continue;
    rows.push({conceptId:game.twConceptId,gameId:game.gameId,name:game.nameEn,platform:v.platform,fields,status:gaps[game.twConceptId]?.[v.platform]?.status??(v.baseTrophies?'additional-unresearched':'base-unverified'),research:gaps[game.twConceptId]?.[v.platform]??null,query:`${game.nameEn} ${v.platform} trophies base game DLC title update bronze silver gold platinum`,reason:'先查PS5；逐平台核對本體與追加分組。未查不是找不到，403須續查合法公開替代來源，不可用DLC總數覆蓋本體。'});
  }
}
rows.sort((a,b)=>(a.platform==='PS5'?0:1)-(b.platform==='PS5'?0:1)||(a.fields.includes('base')?0:1)-(b.fields.includes('base')?0:1)||a.name.localeCompare(b.name));
await fs.mkdir('reports',{recursive:true});await fs.writeFile('reports/trophy-research-queue.json',JSON.stringify({schemaVersion:2,scope:all?'all-platforms':'preferred-platform',generatedAt:new Date().toISOString(),rows},null,2)+'\n');
console.log(`待補 ${rows.length} 個${all?'全部':'PS5優先'}平台版本；本體缺項 ${rows.filter(r=>r.fields.includes('base')).length}。`);
