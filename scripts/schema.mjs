import Ajv from 'ajv';
import fs from 'node:fs/promises';
const ajv=new Ajv({allErrors:true,strict:false});
const schema=JSON.parse(await fs.readFile(new URL('../data/schema.json',import.meta.url),'utf8'));
const check=ajv.compile(schema);
function validateExtra(v){const a=v.additionalTrophies;if(!a)return;const ids=new Set();if((a.status==='none')!==(a.groups.length===0))throw new Error('追加獎盃狀態不符');for(const g of a.groups){if(ids.has(g.id))throw new Error('追加獎盃分組重複');ids.add(g.id);if(g.counts&&(g.total!==g.counts.total||g.total!==g.counts.bronze+g.counts.silver+g.counts.gold+g.counts.platinum))throw new Error('追加獎盃加總不符');}}
export function validateSnapshot(snapshot){
  if(!check(snapshot))throw new Error(`Schema: ${ajv.errorsText(check.errors,{separator:'; '})}`);
  const ids=new Set(),refs=new Set();
  for(const g of snapshot.games){if(ids.has(g.gameId))throw new Error('重複 gameId');ids.add(g.gameId);for(const v of g.versions){validateExtra(v);if(v.baseTrophies&&v.baseTrophies.total!==v.baseTrophies.bronze+v.baseTrophies.silver+v.baseTrophies.gold+v.baseTrophies.platinum)throw new Error('本體獎盃總數不符');}}
  for(const e of snapshot.watchlist.entries){if(!ids.has(e.gameId)||refs.has(e.gameId)||e.snapshotId!==snapshot.metadata.snapshotId)throw new Error('清單引用／ID／快照不符');refs.add(e.gameId);const g=snapshot.games.find(g=>g.gameId===e.gameId);const mapping=snapshot.mappings.find(m=>m.gameId===e.gameId);if(!mapping||mapping.twConceptId!==g.twConceptId||e.platforms.some(p=>!mapping.platforms.includes(p)))throw new Error('清單缺少精確版本對應');}
  for(const p of snapshot.watchlist.pending)if(refs.has(p.gameId)&&!snapshot.watchlist.entries.find(e=>e.gameId===p.gameId)?.suspended)throw new Error('待查不可混入正式候選');
  return snapshot;
}
