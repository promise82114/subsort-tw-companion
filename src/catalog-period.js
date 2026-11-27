import {sortGames} from './domain.js';
const DAY=86400000;
export const todayTaiwan=(now=new Date())=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei'}).format(now);
function parseDay(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value?d:null;
}
const dayString=d=>d.toISOString().slice(0,10);
// Clamp anniversaries to the last real day of the destination month (e.g. Feb 29 -> Feb 28).
function plusMonths(start,n){
  const first=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+n,1));
  const last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
  first.setUTCDate(Math.min(start.getUTCDate(),last));return first;
}
export function catalogPeriod(addedAt,asOf=todayTaiwan()){
  const added=parseDay(addedAt),now=parseDay(asOf);
  if(!added||!now||added>now)return {known:false,reason:!added?'入庫日待查':!now?'計時日期待查':'入庫日尚未到',label:'日期待確認',tone:'unknown'};
  let months=(now.getUTCFullYear()-added.getUTCFullYear())*12+now.getUTCMonth()-added.getUTCMonth();
  if(plusMonths(added,months)>now)months--;
  const days=Math.round((now-plusMonths(added,months))/DAY),years=Math.floor(months/12),remainder=months%12;
  const duration=[years?years+'年':'',remainder?remainder+'個月':'',days?days+'天':''].filter(Boolean).join(' ')||'0天';
  const milestones=[6,12,18,24].map(n=>({months:n,date:dayString(plusMonths(added,n)),days:Math.round((plusMonths(added,n)-now)/DAY),near:now>=plusMonths(added,n-2)&&now<=plusMonths(added,n)}));
  const annual=milestones.find(m=>[12,24].includes(m.months)&&m.days>=0)??null;
  const nearAnnual=milestones.find(m=>[12,24].includes(m.months)&&m.near)??null;
  const nearHalf=milestones.find(m=>[6,18].includes(m.months)&&m.near)??null;
  const label=nearAnnual?(nearAnnual.months===12?'近1年週期':'近2年週期'):nearHalf?'半年參考':months>=24?'已滿2年':months>=12?'已滿1年':'未滿1年';
  const marker=nearAnnual??nearHalf??annual;
  const markerLabel=marker?(marker.months===12?'滿1年':marker.months===24?'滿2年':'滿'+marker.months+'個月'):null;
  return {known:true,addedAt,months,days,duration,ageDays:Math.round((now-added)/DAY),label,tone:nearAnnual?'annual':nearHalf?'half':'neutral',nearYear:nearAnnual?.months===12,nearTwoYears:nearAnnual?.months===24,nearHalf:Boolean(nearHalf),annual,marker,markerLabel};
}
export function matchesPeriod(timing,value=''){
  if(!value)return true;
  if(value==='unknown')return !timing.known;
  if(!timing.known)return false;
  return value==='year'?timing.nearYear:value==='two-years'?timing.nearTwoYears:value==='annual'?(timing.nearYear||timing.nearTwoYears):value==='half'?timing.nearHalf:value==='under-year'?timing.months<12:value==='over-year'?timing.months>=12:value==='over-two-years'?timing.months>=24:false;
}
export function sortByPeriod(items,sort='recommendation',asOf=todayTaiwan()){
  if(!['catalog-oldest','catalog-newest','annual-nearest'].includes(sort))return sortGames(items,sort);
  // Recommendation order remains the stable tie-break, and is unchanged unless a new sort is selected.
  return sortGames(items).map((entry,index)=>({entry,index,t:catalogPeriod(entry.addedAt,asOf)})).sort((a,b)=>{
    const av=a.t.known?(sort==='annual-nearest'?a.t.annual?.days??Infinity:sort==='catalog-oldest'?-a.t.ageDays:a.t.ageDays):Infinity;
    const bv=b.t.known?(sort==='annual-nearest'?b.t.annual?.days??Infinity:sort==='catalog-oldest'?-b.t.ageDays:b.t.ageDays):Infinity;
    return (av<bv?-1:av>bv?1:0)||a.index-b.index;
  }).map(x=>x.entry);
}
