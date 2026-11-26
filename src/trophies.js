export function preferredVersion(game,platform=''){
  if(platform)return game.versions.find(v=>v.platform===platform);
  return game.versions.find(v=>v.platform==='PS5')??game.versions[0];
}
export function additionalSummary(additional){
  if(!additional||additional.status==='none')return null;
  const groups=additional.groups,total=groups.reduce((n,g)=>n+g.total,0);
  const counts=groups.every(g=>g.counts)?Object.fromEntries(['platinum','gold','silver','bronze'].map(k=>[k,groups.reduce((n,g)=>n+g.counts[k],0)])):null;
  return {total,counts,groups,complete:additional.status==='complete'};
}
