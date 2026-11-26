import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {applyCounts} from '../scripts/display-data.mjs';
test('count-only cache cannot bleed across platforms or import a DLC total',()=>{
  const game={twConceptId:'123',versions:[{platform:'PS4',baseTrophies:null},{platform:'PS5',baseTrophies:null}]};
  const proof={platform:'PS5',scope:'base',counts:{total:4,bronze:0,silver:0,gold:4,platinum:0},source:{url:'https://example.com/list',checkedAt:'2026-11-26'}};
  applyCounts(game,{'123':{PS5:proof}});assert.equal(game.versions[0].baseTrophies,null);assert.equal(game.versions[1].hasPlatinum,false);assert.equal(game.versions[1].baseTrophies.total,4);
  assert.throws(()=>applyCounts(game,{'123':{PS5:{...proof,scope:'all'}}}));
  assert.throws(()=>applyCounts(game,{'123':{PS5:{...proof,counts:{...proof.counts,total:99}}}}));
});
test('real covers and trophy scope are valid; counts do not depend on guides',async()=>{
  const s=JSON.parse(await fs.readFile('data/snapshot.json','utf8'));
  assert.equal(s.games.filter(g=>g.cover).length,43);
  for(const g of s.games){assert.match(g.cover.path,/^covers\/\d+\.jpg$/);assert.equal(new URL(g.cover.source.url).hostname,'image.api.playstation.com');assert.ok((await fs.stat(`public/${g.cover.path}`)).size>100);}
  const cat=s.games.find(g=>g.twConceptId==='10007859');assert.equal(cat.platinumHours,null);assert.equal(cat.versions.find(v=>v.platform==='PS5').baseTrophies.total,31);
  const relink=s.games.find(g=>g.twConceptId==='229066');assert.equal(relink.versions.find(v=>v.platform==='PS5').baseTrophies.total,54);
  const little=s.games.find(g=>g.twConceptId==='10008945');assert.equal(little.versions.find(v=>v.platform==='PS5').baseTrophies.total,48);
});
