import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {likelyLeaving,selectCandidates,matchTaiwan,flattenCatalog,request,parseStore} from '../scripts/sources.mjs';
import {parseList} from '../scripts/import-list.mjs';
import {reconcile} from '../scripts/lifecycle.mjs';
import {validateSnapshot} from '../scripts/schema.mjs';
import {validateAnnouncements,officialFor} from '../scripts/official.mjs';
const base={id:'fixture-one',gameName:'Fixture',platform:'PS',subscriptionPlan:'Premium(PS), Extra',addedDate:'2026-06-27',providerType:'Third party',isFreeToPlay:false,platformDetails:'PS4, PS5',gameDetailsUrl:'https://store.playstation.com/en-us/concept/123'};
test('SubSort month boundaries reproduce ll semantics (calendar day and 24-month cutoff)',()=>{
  assert.equal(likelyLeaving(base,'2026-10-26'),false);assert.equal(likelyLeaving(base,'2026-10-27'),true);assert.equal(likelyLeaving(base,'2026-12-27'),false);
  assert.equal(likelyLeaving({...base,addedDate:'2024-11-26'},'2026-11-26'),false);
  assert.equal(likelyLeaving({...base,providerType:'First party'},'2026-11-26'),false);
  assert.equal(likelyLeaving({...base,isFreeToPlay:true},'2026-11-26'),false);
  assert.equal(likelyLeaving({...base,isFreeToPlay:null},'2026-11-26'),false);
  assert.equal(selectCandidates({games:[base,{...base,id:'fixture-xbox',platform:'XBOX'}]},'2026-11-26').length,1);
});
test('matching requires concept/product identity AND shared platform; names never prove identity',()=>{
  const catalog=[{conceptId:123,device:['PS4'],conceptUrl:'https://store.playstation.com/zh-hant-tw/concept/123',productId:'HP0000-CUSA00001_00-ABCD'}];
  assert.deepEqual(matchTaiwan(base,catalog).platforms,['PS4']);
  assert.equal(matchTaiwan({...base,gameDetailsUrl:'https://store.playstation.com/en-us/concept/456'},catalog).status,'pending');
  assert.equal(matchTaiwan({...base,platformDetails:'PS5'},catalog).status,'pending');
  assert.equal(matchTaiwan({...base,gameDetailsUrl:'https://store.playstation.com/en-us/product/HP0000-CUSA00001_00-ABCD'},catalog).method,'product-id+platform');
  assert.throws(()=>matchTaiwan(base,catalog,[{upstreamId:base.id,twConceptId:'123'}]));
});
test('catalog count mismatch and upstream empty/duplicate data fail closed',()=>{
  assert.throws(()=>flattenCatalog([{count:1,games:[]}]));
  assert.throws(()=>selectCandidates({games:[]},'2026-11-26'));
  assert.throws(()=>selectCandidates({games:[base,base]},'2026-11-26'));
});
test('suspended TW match is never a removal; independently confirmed upstream absence is',()=>{
  const old={gameId:'ss-one',cycleId:'cycle-aaaa',snapshotId:'snapshot-old'};
  const previous={watchlist:{entries:[old]},metadata:{removalEvents:[]}};
  assert.equal(reconcile(previous,[],['ss-one'],{snapshotId:'snapshot-new',complete:true,confirmedAbsence:true}).removalEvents.length,0);
  assert.equal(reconcile(previous,[],['ss-one'],{snapshotId:'snapshot-new',complete:true}).entries[0].suspended,true);
  assert.equal(reconcile(previous,[],[],{snapshotId:'snapshot-new',complete:false,confirmedAbsence:true}).removalEvents.length,0);
  const removed=reconcile(previous,[],[],{snapshotId:'snapshot-new',complete:true,confirmedAbsence:true});assert.equal(removed.removalEvents.length,1);
  const returned=reconcile({watchlist:{entries:[]},metadata:{removalEvents:removed.removalEvents}},[{gameId:'ss-one'}],['ss-one'],{snapshotId:'snapshot-return',complete:true});assert.notEqual(returned.entries[0].cycleId,old.cycleId);assert.equal(returned.removalEvents.length,1);
});
test('manual JSON CSV Markdown import preserves null, quoted commas and requires stable IDs',()=>{
  assert.equal(parseList(JSON.stringify({games:[base]}),'json').games.length,1);
  const csv='id,gameName,platform,playTime\nfixture-a,"Hello, world",PS,\n';
  assert.equal(parseList(csv,'csv').games[0].gameName,'Hello, world');assert.equal(parseList(csv,'csv').games[0].playTime,null);
  assert.equal(parseList('| id | gameName | platform |\n|---|---|---|\n| fixture-a | Game | PS |','md').games.length,1);
  assert.throws(()=>parseList('gameName,platform\nGame,PS','csv'));assert.throws(()=>parseList('id,gameName,platform\na,"bad,PS','csv'));
});
test('store parser uses actual JSON instead of executing upstream scripts',()=>{
  assert.equal(parseStore('<script type="application/ld+json">{"@type":"Product","name":"Game","description":"Intro"}</script>','123').name,'Game');
  assert.throws(()=>parseStore('<script>throw Error("not executed")</script>','123'));
});
test('network HTTP failure is observable and does not clear snapshot',async()=>{
  const server=http.createServer((req,res)=>{res.writeHead(503);res.end('unavailable');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const before=await fs.readFile('data/snapshot.json','utf8');
  try{await assert.rejects(request(`http://127.0.0.1:${server.address().port}/`),/HTTP 503/);assert.equal(await fs.readFile('data/snapshot.json','utf8'),before);}finally{server.close();}
});
test('real production snapshot validates identities, trophy sums, unknowns and cycles',async()=>{
  const s=JSON.parse(await fs.readFile('data/snapshot.json','utf8'));validateSnapshot(s);
  const duplicate=structuredClone(s);duplicate.games.push(duplicate.games[0]);assert.throws(()=>validateSnapshot(duplicate),/重複/);
  const broken=structuredClone(s);broken.watchlist.entries[0].gameId='ss-missing';assert.throws(()=>validateSnapshot(broken));
  assert.ok(s.games.some(g=>g.mainHours===null));assert.ok(s.games.some(g=>g.versions.some(v=>v.hasPlatinum===null)));
  const space=s.games.find(g=>g.twConceptId==='10005843');assert.deepEqual(space.versions.map(v=>v.platform),['PS4']);
});
test('failed update CLI leaves all public data byte-identical',async()=>{
  const sandbox=new URL('../.local/pipeline-test/',import.meta.url);await fs.mkdir(new URL('data/',sandbox),{recursive:true});
  const names=['snapshot','games','watchlist','metadata','mappings'];const before=await Promise.all(names.map(n=>fs.readFile(`data/${n}.json`,'utf8')));
  for(let i=0;i<names.length;i++)await fs.writeFile(new URL(`data/${names[i]}.json`,sandbox),before[i]);
  await fs.copyFile('data/overrides.json',new URL('data/overrides.json',sandbox));await fs.writeFile(new URL('empty.json',sandbox),'{"games":[]}');
  assert.throws(()=>execFileSync(process.execPath,[new URL('../scripts/update.mjs',import.meta.url).pathname.replace(/^\/(\w:)/,'$1'),'--input','empty.json','--complete'],{stdio:'pipe',cwd:sandbox}));
  assert.deepEqual(await Promise.all(names.map(n=>fs.readFile(new URL(`data/${n}.json`,sandbox),'utf8'))),before);
});
test('official dates require TW platform evidence and never clear unaffected versions',()=>{
  const a={gameId:'ss-one',region:'TW',confirmed:true,reason:'已確認官方公告',date:'2026-12-15',platforms:['PS4'],source:{url:'https://blog.zh-hant.playstation.com/official',checkedAt:'2026-11-26'}};
  validateAnnouncements({schemaVersion:1,announcements:[a]});
  assert.equal(officialFor({gameId:'ss-one',platforms:['PS4','PS5']},[a]),null);
  assert.equal(officialFor({gameId:'ss-one',platforms:['PS4']},[a]),a);
  assert.throws(()=>validateAnnouncements({schemaVersion:1,announcements:[{...a,region:'US'}]}));
  assert.throws(()=>validateAnnouncements({schemaVersion:1,announcements:[{...a,source:{url:'https://example.com',checkedAt:'2026-11-26'}}]}));
  const p={watchlist:{entries:[{gameId:'ss-one',cycleId:'cycle-aaaa'}]},metadata:{removalEvents:[]}};
  const result=reconcile(p,[],[],{snapshotId:'snapshot-official',complete:true,officialRemoved:['ss-one']});assert.equal(result.removalEvents[0].reason,'official-departure');
});
test('re-entering even an identical source snapshot never revives an earlier cycle',()=>{
  const first=reconcile(null,[{gameId:'ss-one'}],['ss-one'],{snapshotId:'snapshot-same',complete:true});
  const second=reconcile({watchlist:{entries:[]},metadata:{removalEvents:[]}},[{gameId:'ss-one'}],['ss-one'],{snapshotId:'snapshot-same',complete:true});
  assert.notEqual(first.entries[0].cycleId,second.entries[0].cycleId);
});
