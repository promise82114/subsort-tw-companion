import fs from 'node:fs/promises';
import {cachedStore, flattenCatalog, matchTaiwan, selectCandidates,dateTW} from './sources.mjs';
const date=process.argv[2]??dateTW();
const raw=JSON.parse(await fs.readFile('cache/subsort-games.json','utf8'));
const tw=[...flattenCatalog(JSON.parse(await fs.readFile('cache/tw.json','utf8'))),...flattenCatalog(JSON.parse(await fs.readFile('cache/tw-classics.json','utf8')))];
const result=[];
for(const g of selectCandidates(raw,date)) {
  const m=matchTaiwan(g,tw);
  if(m.status!=='confirmed') continue;
  try {const store=await cachedStore(m.entry.conceptId);result.push({upstreamId:g.id,conceptId:m.entry.conceptId,english:g.gameName,platforms:m.platforms,...store});console.log(g.gameName,'OK');}
  catch(e){console.log(g.gameName,e.message);result.push({upstreamId:g.id,english:g.gameName,error:e.message})}
  await new Promise(r=>setTimeout(r,1000));
}
await fs.writeFile('cache/research.json',JSON.stringify(result,null,2));
