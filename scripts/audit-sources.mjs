import fs from 'node:fs/promises';
import {request,hash,SOURCE_URL,CATALOG_URL,CLASSICS_URL,selectCandidates,flattenCatalog,dateTW} from './sources.mjs';
await fs.mkdir('cache/audit',{recursive:true});
const evidence={checkedAt:new Date().toISOString(),urls:{source:SOURCE_URL,catalog:CATALOG_URL,classics:CLASSICS_URL},checks:[]};
for(const [name,url]of [['subsort-robots','https://www.subsort.gg/robots.txt'],['ps-robots','https://www.playstation.com/robots.txt'],['store-robots','https://store.playstation.com/robots.txt'],['subsort-terms','https://www.subsort.gg/en/terms']]){
  const text=await request(url,'text');await fs.writeFile(`cache/audit/${name}.txt`,text);evidence.checks.push({name,url,sha256:hash(text),status:'read'});
}
const html=await request(SOURCE_URL,'text');await fs.writeFile('cache/audit/subsort-page.html',html);
let filter=null,defaults=null;
for(const [i,m]of [...html.matchAll(/<script[^>]+src="([^"]+)/g)].entries()){
  if(!m[1].startsWith('/_next/static/'))continue;
  const url=new URL(m[1],SOURCE_URL).href,text=await request(url,'text');
  if(text.includes('"/api/games"')&&text.includes('likelyLeaving')){filter={url,sha256:hash(text)};await fs.writeFile('cache/audit/filter.js',text);if(!text.includes('likelyLeaving:"ll"')||!text.includes('n%6>=4'))throw new Error('上游篩選契約變更，需人工調整adapter');}
  if(text.includes('"C",0,"Premium(PS)"')&&text.includes('added-date-desc')){defaults={url,sha256:hash(text)};await fs.writeFile('cache/audit/defaults.js',text);}
}
if(!filter||!defaults)throw new Error('無法驗證上游預設Premium與ll篩選契約；保留資料，不自動改語意');
const raw=await request('https://www.subsort.gg/api/games');const game=await request(CATALOG_URL);await new Promise(r=>setTimeout(r,5100));const classics=await request(CLASSICS_URL);
await fs.writeFile('cache/subsort-games.json',JSON.stringify(raw));await fs.writeFile('cache/tw.json',JSON.stringify(game));await fs.writeFile('cache/tw-classics.json',JSON.stringify(classics));
evidence.adapter={filter,defaults,defaultPlan:'Premium(PS)',xb:'disabled',av:'likelyLeaving',sort:'added-date-desc',timeZone:'Asia/Taipei',pagination:'all games in one public response; upstream client consumes games array'};
evidence.counts={upstream:raw.games.length,candidates:selectCandidates(raw,dateTW()).length,gameCatalog:flattenCatalog(game).length,classicsCatalog:flattenCatalog(classics).length};
await fs.writeFile('reports/source-evidence.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence.counts));
