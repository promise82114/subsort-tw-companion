import fs from 'node:fs/promises';
import {validateSnapshot} from './schema.mjs';
export function applyCounts(game,entries){
  const variants=entries[String(game.twConceptId)]??{};
  for(const v of game.versions){const record=variants[v.platform];if(!record)continue;
    const c=record.counts;
    if(record.scope!=='base'||!record.source?.url?.startsWith('https://')||!record.source.checkedAt||record.platform!==v.platform||!['bronze','silver','gold','platinum','total'].every(k=>Number.isInteger(c?.[k])&&c[k]>=0)||c.total!==c.bronze+c.silver+c.gold+c.platinum||c.total===0)throw new Error(`獎盃數量證據不完整：${game.twConceptId} ${v.platform}`);
    v.baseTrophies={...c,source:record.source};v.hasPlatinum=c.platinum>0;v.trophyScope='公開本體清單；台灣區域群組未核實';
  }
  return game;
}
export async function enrichDisplay(){
  const snapshot=JSON.parse(await fs.readFile('data/snapshot.json','utf8'));
  const counts=JSON.parse(await fs.readFile('data/trophy-counts.json','utf8'));
  if(counts.schemaVersion!==1)throw new Error('獎盃快取版本不支援');
  const catalogs=(await Promise.all(['cache/tw.json','cache/tw-classics.json'].map(async p=>JSON.parse(await fs.readFile(p,'utf8'))))).flatMap(bs=>bs.flatMap(b=>b.games));
  await fs.mkdir('public/covers',{recursive:true});
  for(const game of snapshot.games){
    applyCounts(game,counts.entries);
    const matches=catalogs.filter(g=>String(g.conceptId)===game.twConceptId);
    if(matches.length!==1||!matches[0].imageUrl)continue;
    const original=matches[0].imageUrl,url=new URL(original);
    if(url.hostname!=='image.api.playstation.com')throw new Error('非官方圖片來源');
    url.searchParams.set('w','160');url.searchParams.set('thumb','false');
    const file=`covers/${game.twConceptId}.jpg`;
    try{await fs.access(`public/${file}`);}catch{
      const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
      if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw new Error(`封面擷取失敗 ${game.nameEn}`);
      const body=Buffer.from(await response.arrayBuffer());if(body.length>500000)throw new Error('封面大小超出預期');
      await fs.writeFile(`public/${file}`,body);await new Promise(r=>setTimeout(r,150));
    }
    game.cover={path:file,source:{url:original,checkedAt:'2026-11-26'},alt:game.nameZh??game.nameEn};
  }
  validateSnapshot(snapshot);
  for(const [file,value]of Object.entries({games:snapshot.games,snapshot})){await fs.writeFile(`data/${file}.json.tmp`,JSON.stringify(value,null,2)+'\n');await fs.rename(`data/${file}.json.tmp`,`data/${file}.json`);}
  const covered=snapshot.games.filter(g=>g.cover).length,withCounts=snapshot.games.filter(g=>g.versions.some(v=>v.baseTrophies)).length;
  console.log(JSON.stringify({covers:covered,trophyCounts:withCounts,total:snapshot.games.length}));
}
if(process.argv[1]?.endsWith('display-data.mjs'))await enrichDisplay();
