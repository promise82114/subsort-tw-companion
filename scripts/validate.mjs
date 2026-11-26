import fs from 'node:fs/promises';
import {validateSnapshot} from './schema.mjs';
const snapshot=validateSnapshot(JSON.parse(await fs.readFile('data/snapshot.json','utf8')));
for(const [name,value] of Object.entries({games:snapshot.games,watchlist:snapshot.watchlist,mappings:snapshot.mappings,metadata:snapshot.metadata})){
  if(JSON.stringify(JSON.parse(await fs.readFile(`data/${name}.json`,'utf8')))!==JSON.stringify(value))throw new Error(`${name} 與正式 snapshot 不一致；請復原更新`);
}
console.log(`資料驗證通過：${snapshot.games.length} 款快取，${snapshot.metadata.counts.confirmed} 款確認候選`);
