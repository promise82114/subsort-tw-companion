import {chromium} from 'playwright';
import {preview} from 'vite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=await preview({configLoader:'runner',preview:{host:'127.0.0.1',port:4173,strictPort:true}});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
const page=await context.newPage(),errors=[],failures=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400&&r.url().includes('127.0.0.1'))failures.push(`${r.status()} ${r.url()}`);});
const check=(name,fn)=>fn().then(()=>{checks.push(name);console.log('PASS',name)});
const snapshot=JSON.parse(await fs.readFile('data/snapshot.json','utf8'));
await fs.mkdir('test-results',{recursive:true});
const cards=()=>page.locator('.game-card');
const setStatus=async(row,value)=>row.getByRole('button',{name:new RegExp('^(?:✓ )?'+value+'$')}).click();
try{
  await page.goto('http://127.0.0.1:4173/subsort-tw-companion/');await page.waitForSelector('.game-card');
  await check('production Pages subpath loads every confirmed real candidate',async()=>assert.equal(await cards().count(),snapshot.metadata.counts.confirmed));
  await check('Chinese/English search, platform, genre, platinum and sort controls work',async()=>{
    await page.getByLabel('搜尋遊戲').fill('8號');assert.equal(await cards().count(),1);assert.match(await cards().first().innerText(),/8號出口/);
    await page.getByRole('button',{name:'重設篩選'}).click();await page.getByLabel('搜尋遊戲').fill('A Space for the Unbound');await page.getByLabel('平台',{exact:true}).selectOption('PS5');assert.equal(await cards().count(),0);
    await page.getByLabel('平台',{exact:true}).selectOption('PS4');assert.equal(await cards().count(),1);
    await page.getByRole('button',{name:'重設篩選'}).click();await page.getByLabel('所需方案',{exact:true}).selectOption('Deluxe');assert.equal(await cards().count(),snapshot.watchlist.entries.filter(e=>e.tier==='Deluxe').length);await page.getByLabel('所需方案',{exact:true}).selectOption('Extra');assert.equal(await cards().count(),snapshot.watchlist.entries.filter(e=>e.tier==='Extra').length);await page.getByRole('button',{name:'重設篩選'}).click();await page.getByLabel('白金',{exact:true}).selectOption('yes');assert.equal(await cards().count(),snapshot.games.filter(g=>g.versions.some(v=>v.hasPlatinum===true)).length);
    await page.getByRole('button',{name:'重設篩選'}).click();await page.getByLabel('類型',{exact:true}).selectOption('PUZZLE');assert.ok(await cards().count()>0);await page.getByRole('button',{name:'重設篩選'}).click();await page.getByLabel('排序').selectOption('main');
  });
  const first=snapshot.watchlist.entries[0],selector=`[data-game-id="${first.gameId}"]`;
  const legacyKey=first.gameId+'::'+first.cycleId;
  const savedNote=()=>page.evaluate(k=>JSON.parse(localStorage.getItem('subsort-tw:private:v1')).records[k]?.note,legacyKey);
  await check('compact rows show covers, dates and trophy icons without detail/note/source controls',async()=>{
    assert.equal(await page.locator('.game-cover').count(),43);await page.locator('.game-cover').evaluateAll(images=>images.forEach(img=>img.loading='eager'));await page.waitForFunction(()=>[...document.querySelectorAll('.game-cover')].every(img=>img.complete&&img.naturalWidth>0));
    assert.equal(await cards().locator('textarea,details,.detail-toggle,a').count(),0);assert.equal(await cards().first().locator('.trophy-number svg').count(),4);assert.match(await cards().first().locator('.added-at').innerText(),/入庫 [0-9]{4}-[0-9]{2}-[0-9]{2}/);assert.doesNotMatch(await cards().first().innerText(),/升級以上|官方離庫公告|遊玩風險與評估|私人筆記/);
    const image=await cards().first().locator('.game-cover').boundingBox(),content=await cards().first().locator('.game-row-content').boundingBox();assert.ok(image.x+image.width<content.x);
  });
  await check('state survives reload; removed note UI preserves legacy notes and complete/skip undo',async()=>{
    await page.evaluate(e=>localStorage.setItem('subsort-tw:private:v1',JSON.stringify({schemaVersion:1,records:{[e.gameId+'::'+e.cycleId]:{gameId:e.gameId,cycleId:e.cycleId,status:'待評估',note:'測試私人紀錄',updatedAt:'2026-11-26T08:00:00Z'}}})),first);await page.reload();await page.waitForSelector(selector);
    await setStatus(page.locator(selector),'遊玩中');await page.reload();await page.waitForSelector(selector);assert.equal(await page.locator(selector).getByRole('button',{name:'✓ 遊玩中',exact:true}).getAttribute('aria-pressed'),'true');assert.match(await savedNote(),/測試私人紀錄/);
    await setStatus(page.locator(selector),'完成');assert.equal(await page.locator(selector).count(),0);await page.getByLabel('顯示完成／略過').check();await setStatus(page.locator(selector),'想玩');await page.getByLabel('顯示完成／略過').uncheck();assert.equal(await page.locator(selector).count(),1);
    await setStatus(page.locator(selector),'略過');assert.equal(await page.locator(selector).count(),0);await page.getByRole('button',{name:'撤銷上次操作',exact:true}).click();assert.equal(await page.locator(selector).count(),1);assert.match(await savedNote(),/測試私人紀錄/);
  });
  await check('private JSON export and confirmation-based merge import, precise undo',async()=>{
    await page.locator('.header').getByRole('button',{name:'備份與還原',exact:true}).click();
    const download=page.waitForEvent('download');await page.getByRole('button',{name:'匯出私人紀錄',exact:true}).click();const file=await download;const stream=await file.createReadStream();let text='';for await(const c of stream)text+=c;const exported=JSON.parse(text);const key=`${first.gameId}::${first.cycleId}`;assert.match(exported.records[key].note,/測試私人紀錄/);
    const incoming=structuredClone(exported);incoming.records[key].note='匯入內容';
    await page.locator('input[type=file]').setInputFiles({name:'private.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(incoming))});
    await page.getByRole('button',{name:'取消匯入'}).click();assert.match(await savedNote(),/測試私人紀錄/);
    await page.locator('input[type=file]').setInputFiles({name:'private.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(incoming))});assert.equal(await page.getByRole('button',{name:'確認合併與覆蓋'}).isDisabled(),true);const recoveryDownload=page.waitForEvent('download');await page.getByRole('button',{name:'下載兩端復原備份'}).click();const recovery=await recoveryDownload;const recoveryStream=await recovery.createReadStream();let recoveryText='';for await(const chunk of recoveryStream)recoveryText+=chunk;const bundle=JSON.parse(recoveryText);assert.match(bundle.sourceRaw,/匯入內容/);assert.match(bundle.records[key].note,/測試私人紀錄/);await page.getByLabel('已確認復原備份下載並保存').check();await page.getByRole('button',{name:'確認合併與覆蓋'}).click();assert.equal(await savedNote(),'匯入內容');
    await page.getByRole('button',{name:'撤銷上次操作',exact:true}).click();assert.match(await savedNote(),/測試私人紀錄/);
    await page.locator('input[type=file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{broken')});await page.waitForFunction(()=>document.querySelector('.feedback')?.textContent.includes('匯入失敗'));assert.match(await page.locator('.feedback').innerText(),/匯入失敗/);
  });
  await check('sources and pending views expose uncertainty; missing data cannot trigger cleanup',async()=>{
    await page.getByRole('button',{name:/台帳待確認/}).click();assert.equal(await page.locator('.pending-row').count(),snapshot.metadata.counts.pending);
    await page.getByRole('button',{name:'查看來源與資料缺口'}).click();assert.match(await page.getByRole('dialog').innerText(),/不代表官方出庫/);await page.getByRole('button',{name:'關閉視窗'}).click();
    await page.locator('.header').getByRole('button',{name:'備份與還原',exact:true}).click();assert.equal(await page.getByRole('button',{name:/預覽可清理紀錄/}).isDisabled(),true);await page.getByRole('button',{name:'關閉視窗'}).click();await page.getByRole('button',{name:/遊戲候選/}).click();
  });
  await check('corrupt localStorage is preserved and disables writes with recovery export',async()=>{
    await page.evaluate(()=>localStorage.setItem('subsort-tw:private:v1','{broken'));await page.reload();await page.waitForSelector('.warning');assert.equal(await page.locator(selector).getByRole('button',{name:'想玩',exact:true}).isDisabled(),true);assert.equal(await page.evaluate(()=>localStorage.getItem('subsort-tw:private:v1')),'{broken');await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForSelector('.game-card');
  });
  await check('2560–320 layouts do not overflow; focus, mobile dialogs usable',async()=>{
    for(const width of [2560,1920,1440,1024,820,768,390,320]){await page.setViewportSize({width,height:900});const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));assert.ok(dims.scroll<=dims.width,`overflow at ${width}: ${JSON.stringify(dims)}`);await page.locator('.header').getByRole('button',{name:'備份與還原',exact:true}).click();const dialog=page.getByRole('dialog');assert.equal(await dialog.isVisible(),true);await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);}
    await page.keyboard.press('Control+Home');await page.keyboard.press('Tab');
  });
  await check('feature changes reset filters; compact sidebar navigation and aligned backup tools',async()=>{
    await page.setViewportSize({width:1440,height:1000});await page.getByLabel('搜尋遊戲').fill('Coffee');await page.getByRole('button',{name:/台帳待確認/}).click();await page.getByRole('button',{name:/遊戲候選/}).click();assert.equal(await page.getByLabel('搜尋遊戲').inputValue(),'');assert.equal(await cards().count(),snapshot.metadata.counts.confirmed);
    for(const width of [1920,2560]){await page.setViewportSize({width,height:1000});const right=await page.locator('#main').evaluate(el=>el.getBoundingClientRect().right-parseFloat(getComputedStyle(el).paddingRight)-1);const tool=await page.locator('.header button').boundingBox();assert.ok(Math.abs(right-tool.x-tool.width)<3,'backup tool aligns with content edge');}
    await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'功能選單',exact:true}).click();await page.getByRole('button',{name:'資料與來源',exact:true}).click();assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');assert.equal(await page.locator('h1').innerText(),'資料與來源');await page.getByRole('button',{name:'功能選單',exact:true}).click();await page.getByRole('button',{name:/遊戲候選/}).click();
  });
  await check('inline trophy counts distinguish no platinum, unknown versions and base/DLC; provenance centralized',async()=>{
    await page.getByLabel('搜尋遊戲').fill('8號');assert.match(await cards().first().locator('.risk-note').innerText(),/恐怖/);assert.match(await cards().first().locator('.graduation-goal').innerText(),/全獎盃/);assert.match(await cards().first().locator('.trophy-counts').innerText(),/4/);assert.equal(await cards().first().getByLabel('白金盃 0',{exact:true}).count(),1);
    await page.getByRole('button',{name:'重設篩選'}).click();await page.getByLabel('搜尋遊戲').fill('Granblue');assert.match(await cards().first().locator('.trophy-caption').innerText(),/54/);assert.doesNotMatch(await cards().first().locator('.trophy-caption').innerText(),/96/);
    await page.getByRole('button',{name:'重設篩選'}).click();await page.getByLabel('搜尋遊戲').fill('Black Desert');assert.match(await cards().first().locator('.trophy-counts').innerText(),/尚待查證/);await page.getByRole('button',{name:'重設篩選'}).click();
  });
  await check('stale import preview stops and quota failure never reports a saved status',async()=>{
    const first=snapshot.watchlist.entries[0],second=snapshot.watchlist.entries[1];const fixture={schemaVersion:1,records:{[first.gameId+'::'+first.cycleId]:{gameId:first.gameId,cycleId:first.cycleId,status:'想玩',note:'來源測試',updatedAt:'2026-11-26T09:00:00Z'}}};await page.locator('input[type=file]').setInputFiles({name:'stale.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});const wait=page.waitForEvent('download');await page.getByRole('button',{name:'下載兩端復原備份'}).click();await wait;await page.getByLabel('已確認復原備份下載並保存').check();await page.evaluate(e=>{localStorage.setItem('subsort-tw:private:v1',JSON.stringify({schemaVersion:1,records:{[e.gameId+'::'+e.cycleId]:{gameId:e.gameId,cycleId:e.cycleId,status:'遊玩中',note:'其他分頁較晚資料',updatedAt:'2026-11-26T09:01:00Z'}}}));},second);await page.getByRole('button',{name:'確認合併與覆蓋'}).click();assert.match(await page.locator('.feedback').innerText(),/預覽後紀錄已變更/);assert.match(await page.evaluate(()=>localStorage.getItem('subsort-tw:private:v1')),/其他分頁較晚資料/);await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForSelector('.game-card');
    await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('quota test','QuotaExceededError');};});await setStatus(cards().first(),'想玩');assert.match(await page.locator('.feedback').innerText(),/保存失敗/);assert.equal(await cards().first().getByRole('button',{name:'想玩',exact:true}).getAttribute('aria-pressed'),'false');await page.reload();await page.waitForSelector('.game-card');
  });
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  await fs.writeFile('test-results/browser.json',JSON.stringify({checkedAt:new Date().toISOString(),checks,errors,failures,builtArtifact:true},null,2));
  console.log(`Browser acceptance passed: ${checks.length} scenarios; no console/page or local resource errors.`);
}finally{await browser.close();await new Promise(r=>server.httpServer.close(r));}
