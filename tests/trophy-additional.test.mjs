import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {applyCounts,validateAdditional} from '../scripts/display-data.mjs';
import {preferredVersion,additionalSummary} from '../src/trophies.js';
import {validateSnapshot} from '../scripts/schema.mjs';
const source={url:'https://example.com/list',checkedAt:'2026-11-26'};
const group={id:'one',name:'Update',kind:'update',total:2,counts:{total:2,bronze:2,silver:0,gold:0,platinum:0},source};
test('PS5 remains preferred even if only PS4 was researched; explicit PS4 never leaks PS5 data',()=>{
 const game={versions:[{platform:'PS4',baseTrophies:{total:10}},{platform:'PS5',baseTrophies:null}]};assert.equal(preferredVersion(game).platform,'PS5');assert.equal(preferredVersion(game).baseTrophies,null);assert.equal(preferredVersion(game,'PS4').baseTrophies.total,10);assert.equal(preferredVersion({versions:[game.versions[0]]}).platform,'PS4');
});
test('DLC totals remain separate and incomplete type breakdown never becomes zero',()=>{
 const a={status:'partial',source,groups:[group,{...group,id:'two',total:3,counts:null}]};const sum=additionalSummary(a);assert.equal(sum.total,5);assert.equal(sum.counts,null);assert.equal(sum.complete,false);assert.equal(additionalSummary({status:'none',groups:[],source}),null);assert.equal(additionalSummary(null),null);
 assert.throws(()=>validateAdditional({...a,groups:[group,group]}),/分組/);assert.throws(()=>validateAdditional({...a,groups:[{...group,total:99}]}),/加總/);assert.throws(()=>validateAdditional({status:'none',groups:[group],source}),/不完整/);
 const base={platform:'PS5',scope:'base',counts:{total:4,bronze:0,silver:0,gold:4,platinum:0},source,additional:{status:'complete',groups:[group],source},overallTotal:6};const game={twConceptId:'1',versions:[{platform:'PS5'}]};applyCounts(game,{'1':{PS5:base}});assert.equal(game.versions[0].baseTrophies.total,4);assert.equal(game.versions[0].additionalTrophies.groups[0].total,2);assert.throws(()=>applyCounts(game,{'1':{PS5:{...base,overallTotal:4}}}),/總數/);
});
test('real requested games, all additional groups and snapshot schema remain consistent',async()=>{
 const snapshot=JSON.parse(await fs.readFile('data/snapshot.json','utf8'));validateSnapshot(snapshot);
 for(const [id,base,extra] of [['10004462',65,9],['234567',45,13],['233032',15,0],['10002100',50,19],['10008409',41,36]]){const v=preferredVersion(snapshot.games.find(g=>g.twConceptId===id));assert.equal(v.platform,'PS5');assert.equal(v.baseTrophies.total,base);assert.equal(v.additionalTrophies.groups.reduce((n,g)=>n+g.total,0),extra);}
 const bad=structuredClone(snapshot);const v=bad.games.find(g=>g.twConceptId==='234567').versions.find(v=>v.platform==='PS5');v.additionalTrophies.groups[0].total++;assert.throws(()=>validateSnapshot(bad),/加總/);
});
test('invalid manual import leaves count cache and formal snapshot byte-identical',async()=>{
 const files=['data/trophy-counts.json','data/snapshot.json','data/games.json'],before=await Promise.all(files.map(p=>fs.readFile(p,'utf8')));await fs.mkdir('cache',{recursive:true});const bad='cache/invalid-trophy-import-test.json';await fs.writeFile(bad,JSON.stringify({schemaVersion:1,entries:{'10004462':{PS5:{platform:'PS5',scope:'all',counts:{total:74},source}}}}));
 assert.throws(()=>execFileSync(process.execPath,['scripts/import-trophies.mjs',bad],{stdio:'pipe'}));for(let i=0;i<files.length;i++)assert.equal(await fs.readFile(files[i],'utf8'),before[i]);await fs.unlink(bad);
});
