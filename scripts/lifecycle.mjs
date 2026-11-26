import {randomUUID} from 'node:crypto';
export function reconcile(previous,entries,candidateIds,{snapshotId,complete,confirmedAbsence=false,officialRemoved=[]}){
  const old=previous?.watchlist?.entries??[], events=[...(previous?.metadata?.removalEvents??[])];
  const candidates=new Set(candidateIds),active=[];
  for(const e of entries){const prior=old.find(o=>o.gameId===e.gameId);active.push({...e,cycleId:prior?.cycleId??`cycle-${randomUUID()}`});}
  if(complete){for(const e of old){if(!candidates.has(e.gameId)&&(confirmedAbsence||officialRemoved.includes(e.gameId))&&!events.some(x=>x.gameId===e.gameId&&x.cycleId===e.cycleId))events.push({gameId:e.gameId,cycleId:e.cycleId,snapshotId,confirmed:true,reason:officialRemoved.includes(e.gameId)?'official-departure':'upstream-absent'});}}
  // A missing TW match cannot confirm departure. Preserve that tracking cycle for a future match.
  const suspended=old.filter(e=>candidates.has(e.gameId)&&!active.some(a=>a.gameId===e.gameId)).map(e=>({...e,suspended:true}));
  return {entries:[...active,...suspended],removalEvents:events};
}
