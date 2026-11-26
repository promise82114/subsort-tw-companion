import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
export const SOURCE_URL = 'https://www.subsort.gg/en?xb=0&av=ll';
export const CATALOG_URL = 'https://www.playstation.com/bin/imagic/gameslist?locale=zh-hant-tw&categoryList=plus-games-list';
export const CLASSICS_URL = 'https://www.playstation.com/bin/imagic/gameslist?locale=zh-hant-tw&categoryList=plus-classics-list';
export const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const dateTW = () => new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Taipei'}).format(new Date());
const lastRequests=new Map();
export async function request(url, format='json') {
  const origin=new URL(url).origin,delay=origin==='https://www.playstation.com'?5100:origin==='https://store.playstation.com'?1000:250;
  const wait=delay-(Date.now()-(lastRequests.get(origin)??0));if(wait>0)await new Promise(r=>setTimeout(r,wait));lastRequests.set(origin,Date.now());
  const response = await fetch(url, {headers:{'User-Agent':'SubSortTWCompanion/0.1 (personal research; no login)'}, signal:AbortSignal.timeout(40000)});
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return format === 'json' ? response.json() : response.text();
}
export function validateRaw(raw) {
  if (!raw || !Array.isArray(raw.games) || !raw.games.length) throw new Error('SubSort 清單為空或契約已改變');
  const ids = new Set();
  for (const g of raw.games) {
    if (!g.id || !g.gameName || !['PS','XBOX'].includes(g.platform) || ids.has(g.id)) throw new Error('上游 ID／平台無效或重複');
    ids.add(g.id);
  }
  return raw;
}
export function likelyLeaving(g, date) {
  if (!g.addedDate || g.providerType !== 'Third party' || g.isFreeToPlay !== false) return false;
  const a = new Date(`${g.addedDate}T00:00:00Z`), d = new Date(`${date}T00:00:00Z`);
  const months=(d.getUTCFullYear()-a.getUTCFullYear())*12+d.getUTCMonth()-a.getUTCMonth()-(d.getUTCDate()<a.getUTCDate()?1:0);
  return months>1 && months<24 && months%6>=4;
}
export function selectCandidates(raw,date) {
  // Verified upstream defaults: Premium(PS), added-date-desc, no platform restriction; ll is a calendar rule.
  return validateRaw(raw).games.filter(g=>g.platform==='PS' && typeof g.subscriptionPlan==='string' && g.subscriptionPlan.split(', ').includes('Premium(PS)') && likelyLeaving(g,date))
    .sort((a,b)=>(b.addedDate??'').localeCompare(a.addedDate??'') || a.gameName.localeCompare(b.gameName,'en',{numeric:true,sensitivity:'base'}) || a.id.localeCompare(b.id));
}
export function flattenCatalog(buckets) {
  if (!Array.isArray(buckets) || buckets.length < 26 || buckets.some(b=>!Array.isArray(b.games)||b.count!==b.games.length)) throw new Error('台帳目錄分組數／count 不完整');
  const games=buckets.flatMap(b=>b.games);
  if (!games.length || games.some(g=>!g.conceptId||!Array.isArray(g.device)||!g.conceptUrl?.startsWith('https://store.playstation.com/zh-hant-tw/'))) throw new Error('台帳目錄契約不符');
  return games;
}
export function matchTaiwan(upstream,catalog,manual=[]) {
  const concept=upstream.gameDetailsUrl?.match(/\/concept\/(\d+)/)?.[1];
  const override=manual.find(m=>m.upstreamId===upstream.id);
  // A manual match must be explicit, platform scoped, with evidence; title similarity never confirms a match.
  const id=override?.twConceptId??concept;
  if (override && (!override.reason||!override.source||!override.platforms?.length)) throw new Error('人工對應缺少證據／平台');
  const product=upstream.gameDetailsUrl?.match(/\/product\/([A-Za-z0-9_-]+)/)?.[1];
  const matches=catalog.filter(g=>id ? String(g.conceptId)===String(id) : product && g.productId===product);
  if(matches.length!==1) return {status:'pending',reason:matches.length?'台帳 concept ID 不唯一':'台帳目錄無相同 concept ID；不代表未入庫'};
  const entry=matches[0];
  const platforms=upstream.platformDetails.split(', ').filter(p=>entry.device.includes(p) && (!override || override.platforms.includes(p)));
  if(!platforms.length) return {status:'pending',reason:'相同 concept，但無已確認的共同平台'};
  return {status:'confirmed',entry,platforms,method:override?'manual-evidence':concept?'concept-id+platform':'product-id+platform',reason:override?.reason??'台灣官方遊戲目錄相同穩定 ID 與平台'};
}
export function parseStore(html,conceptId) {
  let product=null,description=null,features=[];
  for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    if(!m[1].includes('application/')) continue;
    let obj; try { obj=JSON.parse(m[2]); } catch { continue; }
    if(obj['@type']==='Product') product=obj;
    for(const c of Object.values(obj.cache??{})) {
      if(c.__typename==='Concept'&&String(c.id)===String(conceptId)) description=c.descriptions?.find(d=>d.type==='LONG')?.value??description;
      if(c.__typename==='Concept'&&String(c.id)===String(conceptId)) features.push(...(c.compatibilityNotices??[]));
    }
  }
  if(!product?.name) throw new Error('商店 SSR Product 未取得');
  return {name:product.name,description:(description??product.description??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(),sku:product.sku,features};
}
export async function cachedStore(id) {
  const path=`cache/store-${id}.html`;
  let html; try {html=await fs.readFile(path,'utf8');} catch {html=await request(`https://store.playstation.com/zh-hant-tw/concept/${id}`,'text'); await fs.writeFile(path,html);}
  return parseStore(html,id);
}
