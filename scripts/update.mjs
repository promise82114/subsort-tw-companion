import fs from 'node:fs/promises';
import path from 'node:path';
import {request,hash,dateTW,selectCandidates,flattenCatalog,matchTaiwan,SOURCE_URL,CATALOG_URL,CLASSICS_URL,cachedStore} from './sources.mjs';
import {validateSnapshot} from './schema.mjs';
import {reconcile} from './lifecycle.mjs';
import {validateAnnouncements,officialFor} from './official.mjs';
import {applyCounts} from './display-data.mjs';
const args=process.argv.slice(2),option=k=>args[args.indexOf(k)+1];
const date=args.includes('--date')?option('--date'):dateTW();
if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date)))throw new Error('日期無效');
const now=new Date().toISOString(),source=(url,status='ok')=>({url,checkedAt:now,status});
await fs.mkdir('cache',{recursive:true});await fs.mkdir('reports',{recursive:true});await fs.mkdir('.local',{recursive:true});
let lock;try{lock=await fs.open('.local/update.lock','wx');}catch{throw new Error('已有更新工作；若上次中斷，先依 README 復原');}
const load=async(file,fallback)=>{try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}};
try{
  // Crash recovery: a journal is durable before the first public mirror is replaced.
  const journal=await load('.local/update-journal.json',null);
  if(journal){for(const [name,value]of Object.entries(journal)){if(value===null)await fs.rm(`data/${name}.json`,{force:true});else await fs.writeFile(`data/${name}.json`,value);}await fs.rm('.local/update-journal.json');}
  const previous=await load('data/snapshot.json',null),overrides=await load('data/overrides.json',null);
  if(!overrides||overrides.schemaVersion!==1)throw new Error('overrides 版本不支援');
  const input=args.includes('--input')?option('--input'):null;
  const raw=input?await load(input,null):await request('https://www.subsort.gg/api/games');
  const complete=!input||args.includes('--complete');
  const candidates=selectCandidates(raw,date);
  if(!candidates.length)throw new Error('候選清單意外為空，請人工複核；不覆寫最後成功快照');
  const twBuckets=args.includes('--catalog')?await load(option('--catalog'),null):await request(CATALOG_URL);
  const classicBuckets=args.includes('--classics')?await load(option('--classics'),null):await request(CLASSICS_URL);
  const catalog=[...flattenCatalog(twBuckets).map(g=>({...g,tier:'Extra',catalogUrl:CATALOG_URL})),...flattenCatalog(classicBuckets).map(g=>({...g,tier:'Deluxe',catalogUrl:CLASSICS_URL}))];
  const research=await load('data/research.json',{}),trophies=await load('data/trophy-research.json',{});
  const trophyCounts=await load('data/trophy-counts.json',{schemaVersion:1,entries:{}});
  if(trophyCounts.schemaVersion!==1)throw new Error('獎盃快取版本不支援');
  const announcements=validateAnnouncements(await load('data/official-departures.json',{schemaVersion:1,announcements:[]}));
  const snapshotId=`snapshot-${hash([raw,twBuckets,classicBuckets,date,overrides,research,trophies,announcements]).slice(0,24)}`;
  const priorCount=previous?.metadata.counts.upstreamTotal;
  const priorCandidateCount=previous?.metadata.counts.candidates;
  if(priorCount&&raw.games.length<priorCount*.7||priorCandidateCount&&candidates.length<priorCandidateCount*.7)throw new Error('清單大幅縮減（>30%）；需獨立複核，保留最後成功快照');
  const candidateIds=candidates.map(g=>`ss-${g.id}`);
  const removed=previous?.watchlist.entries.filter(e=>!candidateIds.includes(e.gameId))??[];
  let confirmedAbsence=false;
  if(removed.length&&complete&&!input){
    await new Promise(r=>setTimeout(r,2000));
    const second=await request('https://www.subsort.gg/api/games');
    if(hash(selectCandidates(second,date))!==hash(candidates))throw new Error('第二次上游擷取不同，停止移除與更新');
    confirmedAbsence=true;
  }
  // Partial manual imports can enrich a cache, but must never replace the active snapshot.
  if(!complete)throw new Error('手動清單未確認完整；已保留匯入暫存，正式快照不變');
  const games=new Map((previous?.games??[]).map(g=>[g.gameId,g]));
  const mappings=new Map((previous?.mappings??[]).map(g=>[g.gameId,g]));
  const entries=[],pending=[],excluded=[];let reused=0,evaluated=0;
  for(const upstream of candidates){
    const gameId=`ss-${upstream.id}`,match=matchTaiwan(upstream,catalog,overrides.mappings);
    const exclusion=overrides.exclusions.find(e=>e.upstreamId===upstream.id);
    if(exclusion){if(!exclusion.reason||!exclusion.source)throw new Error('排除缺少理由／來源');excluded.push({gameId,name:upstream.gameName,...exclusion});continue;}
    if(match.status!=='confirmed'){pending.push({gameId,upstreamId:upstream.id,name:upstream.gameName,reason:match.reason,source:source(SOURCE_URL),storeUrl:upstream.gameDetailsUrl});continue;}
    const tw=match.entry,storeUrl=tw.conceptUrl,storeSource=source(storeUrl),catalogSource=source(tw.catalogUrl),old=games.get(gameId);
    let store=null;try{store=await cachedStore(tw.conceptId);}catch(e){console.warn(`商店補查失敗，保留已確認目錄及未知欄位：${upstream.gameName}: ${e.message}`);}
    const subSource=source('https://www.subsort.gg/api/games');
    const fieldSource=url=>url?{...subSource,originalUrl:url}:subSource;
    const proof=research[String(tw.conceptId)];
    let evaluation=old?.evaluation??{rank:null,goal:null,reason:'尚無足夠研究資料，待評估。',risks:['獎盃難度與區域群組尚未確認'],confidence:'unknown',evaluatedAt:null,promptVersion:proof?.promptVersion??'EVALUATION-v2',sources:[]};
    if((!old||!old.evaluation.evaluatedAt||proof?.checkedAt>old.evaluation.evaluatedAt||args.includes('--reevaluate'))&&proof){evaluation={rank:proof.rank,goal:proof.goal,reason:proof.reason,risks:proof.risks,confidence:proof.confidence??'medium',evaluatedAt:proof.checkedAt,promptVersion:proof?.promptVersion??'EVALUATION-v2',sources:[{url:storeUrl,checkedAt:proof.checkedAt},...(proof.sources??[])]};evaluated++;}else if(old)reused++;
    const guide=trophies[String(tw.conceptId)];
    let game={gameId,upstreamId:upstream.id,twConceptId:String(tw.conceptId),nameZh:/[\u3400-\u9fff]/.test(tw.name)?tw.name:null,nameEn:upstream.gameName,nameSource:catalogSource,genres:tw.genre,versions:match.platforms.map(platform=>{
      const base=guide?.platforms.includes(platform)?guide:null;
      return {platform,productId:((platform==='PS5'&&tw.productId?.includes('-PPSA'))||(platform==='PS4'&&tw.productId?.includes('-CUSA')))?tw.productId:null,catalogProductId:tw.productId,trophyGroupId:null,baseTrophies:base?{...base.counts,source:{url:base.url,checkedAt:base.checkedAt}}:null,hasPlatinum:base?base.counts.platinum>0:null,source:storeSource,trophyScope:base?'公開攻略本體清單；台灣 NP 群組 ID 未驗證':null};
    }),mainHours:upstream.playTime>0?{min:upstream.playTime,max:upstream.playTime,source:fieldSource(upstream.playTimeUrl)}:null,platinumHours:guide?{...guide.hours,source:{url:guide.url,checkedAt:guide.checkedAt}}:null,platinumDifficulty:guide?.difficulty??null,rating:typeof upstream.metacritic==='number'?{score:upstream.metacritic,source:fieldSource(upstream.metacriticUrl)}:null,evaluation,sources:[subSource,catalogSource,storeSource],officialDescriptionAvailable:Boolean(store?.description)};
    applyCounts(game,trophyCounts.entries);
    if(old?.cover)game.cover=old.cover;
    // Overrides are deliberately scoped: no accidental edits to identity or public/private mixing.
    const override=overrides.games[gameId];if(override){if(!override.reason||!override.source||!override.patch)throw new Error('人工修正缺少證據');const allowed=['nameZh','genres','mainHours','platinumHours','platinumDifficulty','rating','evaluation'];for(const [k,v]of Object.entries(override.patch)){if(!allowed.includes(k))throw new Error(`不允許 override ${k}`);game[k]=v;}game.sources.push(override.source);}
    games.set(gameId,game);mappings.set(gameId,{gameId,upstreamId:upstream.id,twConceptId:String(tw.conceptId),platforms:match.platforms,method:match.method,source:catalogSource,trophyGroups:[]});
    entries.push({gameId,tier:tw.tier,platforms:match.platforms,snapshotId,upstreamRank:null,upstreamPosition:candidates.indexOf(upstream)+1,addedAt:upstream.addedDate??null,prediction:{kind:'third-party-pattern',label:'SubSort 週期預測；非官方公告',basis:'第三方、非免費，入庫未滿24個月，每6個月週期之前約2個月',source:source(SOURCE_URL),upstreamLeavingDate:upstream.leavingDate??null,isLastChance:upstream.isLastChance??false},officialDeparture:null});
  }
  const officialRemoved=[];
  for(let i=entries.length-1;i>=0;i--){const a=officialFor(entries[i],announcements);if(a){entries[i].officialDeparture=a;if(a.date<date){officialRemoved.push(entries[i].gameId);excluded.push({gameId:entries[i].gameId,name:games.get(entries[i].gameId).nameEn,reason:'台灣官方確認已離庫',source:a.source});entries.splice(i,1);}}}
  const lifecycle=reconcile(previous,entries,candidateIds.filter(id=>!officialRemoved.includes(id)),{snapshotId,complete,confirmedAbsence,officialRemoved});
  // Suspended records belong to this successful snapshot too; they are never shown as confirmed.
  lifecycle.entries=lifecycle.entries.map(e=>({...e,snapshotId}));
  const snapshot={schemaVersion:1,games:[...games.values()],mappings:[...mappings.values()],watchlist:{entries:lifecycle.entries,pending,excluded},metadata:{snapshotId,lastSuccessAt:now,asOf:date,complete,validSnapshot:true,sources:[source('https://www.subsort.gg/api/games'),source(CATALOG_URL),source(CLASSICS_URL),source('https://www.playstation.com/zh-hant-tw/ps-plus/whats-new/','partial-no-confirmed-departures')],counts:{upstreamTotal:raw.games.length,candidates:candidates.length,taiwanCatalog:catalog.length,gameCatalog:flattenCatalog(twBuckets).length,classicsCatalog:flattenCatalog(classicBuckets).length,confirmed:entries.length,pending:pending.length,excluded:excluded.length,newEvaluations:evaluated,reusedEvaluations:reused},removalEvents:lifecycle.removalEvents}};
  validateSnapshot(snapshot);
  const files={games:snapshot.games,watchlist:snapshot.watchlist,mappings:snapshot.mappings,metadata:snapshot.metadata,snapshot};
  const originals={};for(const name of Object.keys(files)){try{originals[name]=await fs.readFile(`data/${name}.json`,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;originals[name]=null;}}
  await fs.mkdir(`cache/snapshots/${snapshotId}`,{recursive:true});
  await fs.writeFile(`cache/snapshots/${snapshotId}/subsort.json`,JSON.stringify(raw));
  await fs.writeFile(`cache/snapshots/${snapshotId}/taiwan.json`,JSON.stringify(twBuckets));
  await fs.writeFile(`cache/snapshots/${snapshotId}/taiwan-classics.json`,JSON.stringify(classicBuckets));
  await fs.writeFile('.local/update-journal.json',JSON.stringify(originals));
  try{
    for(const [name,value]of Object.entries(files)){const temp=`data/${name}.json.tmp`;await fs.writeFile(temp,JSON.stringify(value,null,2)+'\n');await fs.rename(temp,`data/${name}.json`);}
    await fs.rm('.local/update-journal.json');
  }catch(e){for(const [name,value]of Object.entries(originals)){if(value===null)await fs.rm(`data/${name}.json`,{force:true});else await fs.writeFile(`data/${name}.json`,value);}throw e;}
  const report=`# 首次／最新資料更新\n\n- 台灣日期：${date}；擷取時間：${now}\n- 快照：${snapshotId}\n- 上游全量 ${raw.games.length}；指定候選 ${candidates.length}；台帳目錄 ${catalog.length}（遊戲 ${flattenCatalog(twBuckets).length}／經典 ${flattenCatalog(classicBuckets).length}）\n- 原站指定網址語意：xb=0、av=ll、預設 Premium(PS)；不可誤限縮為 Extra。\n- 台帳確認 ${entries.length}（升級以上 ${entries.filter(e=>e.tier==='Extra').length}／高級 ${entries.filter(e=>e.tier==='Deluxe').length}）；排除 ${excluded.length}；待查 ${pending.length}\n- 本次研究 ${evaluated}；沿用研究 ${reused}；有分級 ${entries.filter(e=>games.get(e.gameId).evaluation.rank).length}；待評估 ${entries.filter(e=>!games.get(e.gameId).evaluation.rank).length}。未知欄位保留 null。\n- 新增：${entries.filter(e=>!previous?.watchlist.entries.some(o=>o.gameId===e.gameId)).map(e=>games.get(e.gameId).nameEn).join('、')||'無'}\n- 本次確認移除：${lifecycle.removalEvents.filter(e=>e.snapshotId===snapshotId).map(e=>e.gameId).join('、')||'無'}\n- 官方出庫：未取得足以逐版確認的台灣公告，日期全部未知；上游預測不轉成官方資訊。\n- 獎盃：${entries.filter(e=>games.get(e.gameId).versions.some(v=>v.baseTrophies)).length} 款有公開本體攻略；台灣 NP 群組尚未取得。\n- 台帳待查項目：\n${pending.map(p=>`  - ${p.name}：${p.reason}`).join('\n')}\n- 以 concept ID 或完整 product ID 與共同平台比對；不按名稱自動合併；目錄缺少者不判定排除。\n- 驗證：JSON schema、引用、重複 ID、獎盃加總通過；測試與建置見 reports/acceptance.md。\n- 發布：僅本機；未 commit、未 push。\n`;
  await fs.writeFile('reports/latest-update.md',report);await fs.writeFile('reports/last-attempt.json',JSON.stringify({attemptedAt:now,status:'success',snapshotId,counts:snapshot.metadata.counts},null,2)+'\n');console.log(report);
}catch(e){await fs.writeFile('reports/last-attempt.json',JSON.stringify({attemptedAt:now,status:'failed',reason:e.message,preservedLastSuccess:true},null,2));throw e;}
finally{await lock.close();await fs.rm('.local/update.lock',{force:true});}
