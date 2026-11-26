import fs from 'node:fs/promises';
import {validateRaw} from './sources.mjs';
export function parseTable(text,separator) {
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===separator&&!quoted){row.push(field.trim());field='';}else if(c==='\n'&&!quoted){row.push(field.trim());rows.push(row);row=[];field='';}else if(c!=='\r')field+=c;}
  if(quoted)throw new Error('未結束的 CSV 引號');
  if(field||row.length){row.push(field.trim());rows.push(row);}return rows.filter(r=>r.some(Boolean));
}
export function parseList(text,format) {
  if(format==='json')return validateRaw(JSON.parse(text.replace(/^\uFEFF/,'')));
  let rows=parseTable(text.trim(),format==='md'?'|':',');
  if(format==='md') rows=rows.map(r=>r.filter((v,i)=>!(v===''&&(i===0||i===r.length-1)))).filter(r=>!r.every(v=>/^:?-+:?$/.test(v)));
  const headers=rows.shift();if(!headers?.includes('id')||!headers.includes('gameName'))throw new Error('需要 id 與 gameName 欄位；不可用名稱當 ID');
  return validateRaw({games:rows.map(r=>{const g=Object.fromEntries(headers.map((h,i)=>[h,r[i]||null]));for(const k of ['isFreeToPlay','isLastChance','isEarlyArrival'])g[k]=g[k]==='true'?true:g[k]==='false'?false:null;for(const k of ['playTime','metacritic'])g[k]=g[k]===null||g[k]===undefined?null:Number(g[k]);return g;})});
}
if(process.argv[1]?.endsWith('import-list.mjs')){
  const file=process.argv[2];if(!file)throw new Error('用法：npm run import:list -- FILE.json|csv|md；再 npm run update -- --input cache/imported.json --complete --date YYYY-MM-DD');
  const raw=parseList(await fs.readFile(file,'utf8'),file.split('.').pop());
  await fs.mkdir('cache',{recursive:true});await fs.writeFile('cache/imported.json',JSON.stringify(raw,null,2));
  console.log(`已驗證 ${raw.games.length} 筆，暫存 cache/imported.json；尚未改動正式資料。必須確認為完整「全部遊戲」匯出，否則不使用 --complete。`);
}
