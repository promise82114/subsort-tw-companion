export const STATUSES=['待評估','想玩','遊玩中','完成','略過'];
export const recordKey=(gameId,cycleId)=>`${gameId}::${cycleId}`;
export const emptyPrivate=()=>({schemaVersion:1,records:{}});
export function validatePrivate(input){
  if(input?.schemaVersion!==1||!input.records||typeof input.records!=='object'||Array.isArray(input.records))throw new Error('紀錄格式或版本不支援');
  const clean=emptyPrivate();
  if(Object.keys(input.records).length>10000)throw new Error('紀錄數超過上限');
  for(const [key,r] of Object.entries(input.records)){
    if(!r||typeof r.gameId!=='string'||typeof r.cycleId!=='string'||key!==recordKey(r.gameId,r.cycleId)||!STATUSES.includes(r.status)||typeof r.note!=='string'||r.note.length>20000||!Number.isFinite(Date.parse(r.updatedAt)))throw new Error('紀錄內容無效');
    if(!/^ss-[A-Za-z0-9_-]+$/.test(r.gameId)||!/^cycle-[a-f0-9-]+$/.test(r.cycleId))throw new Error('紀錄 ID 無效');
    clean.records[key]={gameId:r.gameId,cycleId:r.cycleId,status:r.status,note:r.note,updatedAt:r.updatedAt};
  }
  return clean;
}
export function loadPrivate(storage){
  const raw=storage.getItem('subsort-tw:private:v1');
  return raw?validatePrivate(JSON.parse(raw)):emptyPrivate();
}
export function planCleanup(privateData,metadata){
  if(!metadata?.validSnapshot||!metadata.complete||!metadata.snapshotId)return [];
  return (metadata.removalEvents??[]).filter(e=>e.confirmed&&e.gameId&&e.cycleId&&e.snapshotId&&['upstream-absent','official-departure'].includes(e.reason))
    .map(e=>recordKey(e.gameId,e.cycleId)).filter(k=>Object.hasOwn(privateData.records,k));
}
export function applyCleanup(privateData,keys){
  const next=JSON.parse(JSON.stringify(privateData)),undo={};for(const key of keys){if(Object.hasOwn(next.records,key)){undo[key]=next.records[key];delete next.records[key];}}return {next,undo};
}
// Undo changes only records that still equal the result of that operation; later edits survive.
export function makeChange(before,after){
  const patch={};for(const key of new Set([...Object.keys(before.records),...Object.keys(after.records)]))if(JSON.stringify(before.records[key])!==JSON.stringify(after.records[key]))patch[key]={before:before.records[key]??null,after:after.records[key]??null};return patch;
}
export function undoChange(current,patch){
  const next=JSON.parse(JSON.stringify(current));let restored=0,conflicts=0;
  for(const [key,p]of Object.entries(patch)){if(JSON.stringify(current.records[key]??null)!==JSON.stringify(p.after)){conflicts++;continue;}if(p.before===null)delete next.records[key];else next.records[key]=p.before;restored++;}return {next,restored,conflicts};
}
const ranks={S:0,A:1,B:2,C:3,D:4};
export function sortGames(items,sort='recommendation'){
  const number=(a,b)=>(a??Infinity)-(b??Infinity);
  return [...items].sort((a,b)=>{
    let d=0;
    if(sort==='main')d=number(a.game.mainHours?.min,b.game.mainHours?.min);
    else if(sort==='platinum')d=number(a.game.platinumHours?.min,b.game.platinumHours?.min);
    else d=Number(Boolean(b.officialDeparture))-Number(Boolean(a.officialDeparture))||number(ranks[a.game.evaluation.rank],ranks[b.game.evaluation.rank])||number(a.upstreamRank,b.upstreamRank)||number(a.game.mainHours?.min,b.game.mainHours?.min);
    return (Number.isNaN(d)?0:d)||a.game.nameEn.localeCompare(b.game.nameEn,'en')||a.gameId.localeCompare(b.gameId);
  });
}
export function formatHours(value){if(!value)return '未知';return value.max===null?`${value.min} 小時以上`:value.min===value.max?`${value.min} 小時`:`${value.min}–${value.max} 小時`;}
