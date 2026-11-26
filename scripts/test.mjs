import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
const files=(await fs.readdir('tests')).filter(f=>f.endsWith('.test.mjs')).sort().map(f=>`tests/${f}`);
if(!files.length)throw new Error('沒有找到測試，拒絕假通過');
const child=spawn(process.execPath,['--test',...files],{stdio:'inherit',shell:false});
child.on('error',e=>{console.error(e);process.exitCode=1;});child.on('close',code=>{process.exitCode=code??1;});
