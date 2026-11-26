import fs from 'node:fs/promises';
import {applyCounts} from './display-data.mjs';
const input=process.argv[2];if(!input)throw new Error('用法：npm run trophies:import -- 已核實資料.json');
const incoming=JSON.parse(await fs.readFile(input,'utf8')),cache=JSON.parse(await fs.readFile('data/trophy-counts.json','utf8')),games=JSON.parse(await fs.readFile('data/games.json','utf8'));
if(incoming.schemaVersion!==1||!incoming.entries||Array.isArray(incoming.entries))throw new Error('不支援的獎盃資料格式');
for(const [id,versions] of Object.entries(incoming.entries)){
  const game=games.find(g=>g.twConceptId===id);if(!game)throw new Error('未知遊戲ID '+id);
  for(const [platform,record] of Object.entries(versions)){
    if(!game.versions.some(v=>v.platform===platform))throw new Error('未確認台帳平台 '+id+' '+platform);
    const merged={...cache.entries[id]?.[platform],...record};
    applyCounts({twConceptId:id,versions:[{platform}]},{[id]:{[platform]:merged}});
    cache.entries[id]??={};cache.entries[id][platform]=merged;
  }
}
// All entries validate before the cache changes. Formal snapshot changes only with enrich:display.
await fs.mkdir('cache',{recursive:true});await fs.copyFile('data/trophy-counts.json','cache/trophy-counts-before-import.json');
await fs.writeFile('data/trophy-counts.json.tmp',JSON.stringify(cache,null,2)+'\n');await fs.rename('data/trophy-counts.json.tmp','data/trophy-counts.json');
console.log('已匯入人工核實的獎盃資料；請執行 enrich:display、validate 與測試。');
