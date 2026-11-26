<script setup>
import {computed,ref,onMounted,onUnmounted,nextTick} from 'vue';
import SourcePanel from './SourcePanel.vue';
import TrophyCounts from './TrophyCounts.vue';
import {preferredVersion} from './trophies.js';
import snapshot from '../data/snapshot.json';
import {STATUSES,recordKey,emptyPrivate,loadPrivate,validatePrivate,planCleanup,applyCleanup,makeChange,undoChange,sortGames,formatHours} from './domain.js';
const meta=snapshot.metadata;
const importBefore=ref(null),importRaw=ref(''),recoveryDownloaded=ref(false),recoveryAcknowledged=ref(false);
const menuOpen=ref(false),failedCovers=ref({});
const completed=computed(()=>all.value.filter(e=>record(e).status==='完成').length);
const wanted=computed(()=>all.value.filter(e=>record(e).status==='想玩').length);
function switchView(next){view.value=next;resetFilters();menuOpen.value=false;}
function setStatus(e,value){edit(e,'status',record(e).status===value?'待評估':value);}
function focusResult(e){nextTick(()=>{if(!document.querySelector(`[data-game-id="${e.gameId}"]`))document.querySelector('.game-row button, .empty, #main')?.focus({preventScroll:true});});}

const privateData=ref(emptyPrivate()),storageBlocked=ref(false),notice=ref(''),undo=ref(null);
const query=ref(''),platform=ref(''),tier=ref(''),genre=ref(''),platinum=ref(''),sort=ref('recommendation'),status=ref(''),showHidden=ref(false),view=ref('confirmed'),dialog=ref(null),incoming=ref(null),importInput=ref(null);
const title=g=>g.nameZh??g.nameEn;
const genreNames={ACTION:'動作',ADVENTURE:'冒險',ROLE_PLAYING:'角色扮演',RPG:'角色扮演',SIMULATION:'模擬',STRATEGY:'策略',PUZZLE:'益智',FAMILY:'家庭',HORROR:'恐怖',DRIVING_RACING:'競速',RACING:'競速',SPORTS:'運動',CASUAL:'休閒',BRAIN_TRAINING:'腦力訓練',ARCADE:'街機',SHOOTER:'射擊',FIGHTING:'格鬥'};
const genreName=g=>genreNames[g]??g;
const all=computed(()=>snapshot.watchlist.entries.filter(e=>!e.suspended).map(e=>({...e,game:snapshot.games.find(g=>g.gameId===e.gameId)})));
const genres=computed(()=>[...new Set(all.value.flatMap(e=>e.game.genres))].sort());
const key=e=>recordKey(e.gameId,e.cycleId);
const record=e=>privateData.value.records[key(e)]??{status:'待評估',note:''};
const hasPlatinum=e=>{const v=preferredVersion(e.game,platform.value);return v?.hasPlatinum===true?'yes':v?.hasPlatinum===false?'no':'unknown';};
const filtered=computed(()=>sortGames(all.value.filter(e=>{
  const g=e.game,s=record(e).status;
  return (!query.value||`${g.nameEn} ${g.nameZh??''}`.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase()))&&(!tier.value||e.tier===tier.value)&&(!platform.value||e.platforms.includes(platform.value))&&(!genre.value||g.genres.includes(genre.value))&&(!platinum.value||hasPlatinum(e)===platinum.value)&&(!status.value||s===status.value)&&((showHidden.value||status.value==='完成'||status.value==='略過')||!['完成','略過'].includes(s));
}),sort.value));
const playing=computed(()=>all.value.filter(e=>record(e).status==='遊玩中').length);
const cleanKeys=computed(()=>planCleanup(privateData.value,meta));
const cleanRecords=computed(()=>cleanKeys.value.map(k=>privateData.value.records[k]));
function persist(next,trackUndo=true){
  if(storageBlocked.value){notice.value='瀏覽器儲存不可用，請先匯出原始紀錄。';return false;}
  try{
    next=validatePrivate(next);const intent=makeChange(privateData.value,next),latest=loadPrivate(localStorage);
    for(const [k,p]of Object.entries(intent)){if(JSON.stringify(latest.records[k]??null)!==JSON.stringify(p.before))throw new Error('其他分頁已修改此筆紀錄，請重新比較');if(p.after===null)delete latest.records[k];else latest.records[k]=p.after;}
    next=latest;const patch=intent;
    // All private state and its undo journal share one atomic localStorage entry.
    const nextUndo=trackUndo?patch:undo.value;
    localStorage.setItem('subsort-tw:private:v1',JSON.stringify({...next,undo:nextUndo}));
    privateData.value=next;undo.value=nextUndo;return true;
  }catch(e){notice.value=`保存失敗：${e.message}。畫面保留上次成功內容，請匯出備份。`;return false;}
}
function edit(e,field,value){const next=JSON.parse(JSON.stringify(privateData.value));next.records[key(e)]={...record(e),gameId:e.gameId,cycleId:e.cycleId,[field]:value,updatedAt:new Date().toISOString()};if(persist(next,field==='status'))notice.value=field==='status'?'已保存遊玩狀態；完成不代表白金。':'筆記已保存在此瀏覽器。';if(field==='status')focusResult(e);}
function undoLast(){if(!undo.value)return;const result=undoChange(privateData.value,undo.value);if(persist(result.next,false)){undo.value=null;try{localStorage.setItem('subsort-tw:private:v1',JSON.stringify(privateData.value));}catch{}notice.value=`已撤銷 ${result.restored} 筆，保留 ${result.conflicts} 筆後續變更。`;}}
function download(value,name){const blob=new Blob([typeof value==='string'?value:JSON.stringify(value,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportPrivate(){download({...privateData.value,exportedAt:new Date().toISOString()},'subsort-tw-private.json');notice.value='已匯出私人紀錄；手機與電腦需自行匯入。';}
function exportRecovery(){download(localStorage.getItem('subsort-tw:private:v1')??'','subsort-tw-recovery.json');}
async function readImport(event){const file=event.target.files?.[0];event.target.value='';if(!file)return;
  try{if(file.size>2*1024*1024)throw new Error('檔案超過2MB');importRaw.value=await file.text();incoming.value=validatePrivate(JSON.parse(importRaw.value));importBefore.value=JSON.stringify(loadPrivate(localStorage));recoveryDownloaded.value=false;recoveryAcknowledged.value=false;dialog.value='import';}catch(e){notice.value=`匯入失敗：${e.message}；原紀錄未變更。`;}}
const importCount=computed(()=>Object.keys(incoming.value?.records??{}).length);
const overwriteCount=computed(()=>Object.keys(incoming.value?.records??{}).filter(k=>Object.hasOwn(privateData.value.records,k)).length);
const importDiff=computed(()=>Object.entries(incoming.value?.records??{}).filter(([k,r])=>JSON.stringify(privateData.value.records[k])!==JSON.stringify(r)).map(([k,r])=>({key:k,from:r,to:privateData.value.records[k]??null,name:snapshot.games.find(g=>g.gameId===r.gameId)?.nameZh??snapshot.games.find(g=>g.gameId===r.gameId)?.nameEn??r.gameId})));
function exportRecoveryBundle(){const before=JSON.parse(importBefore.value);download({schemaVersion:1,records:before.records,kind:'subsort-tw-import-recovery',exportedAt:new Date().toISOString(),before,sourceRaw:importRaw.value},'subsort-tw-import-recovery.json');recoveryDownloaded.value=true;}
function confirmImport(){
  if(!recoveryAcknowledged.value)return;
  try{
  if(JSON.stringify(loadPrivate(localStorage))!==importBefore.value||JSON.stringify(privateData.value)!==importBefore.value){notice.value='預覽後紀錄已變更，匯入已停止；請重新選檔比較。';dialog.value=null;return;}
  const next={schemaVersion:1,records:{...privateData.value.records,...incoming.value.records}};if(persist(next)){dialog.value=null;incoming.value=null;notice.value='已合併匯入，可精準撤銷本次覆蓋。';}}
  catch(e){notice.value=`匯入已停止：${e.message}；原紀錄保留。`;dialog.value=null;}}
function clean(){const {next}=applyCleanup(privateData.value,cleanKeys.value);if(persist(next)){dialog.value=null;notice.value='已清理確認移除週期的紀錄，可撤銷；重新入列會建立新週期。';}}
function resetFilters(){query.value='';platform.value='';tier.value='';genre.value='';platinum.value='';status.value='';showHidden.value=false;sort.value='recommendation';}
function load(){try{privateData.value=loadPrivate(localStorage);const raw=JSON.parse(localStorage.getItem('subsort-tw:private:v1')??'null');
  undo.value=null;if(raw?.undo&&typeof raw.undo==='object'&&!Array.isArray(raw.undo)){for(const [k,p]of Object.entries(raw.undo)){for(const value of [p.before,p.after])if(value!==null)validatePrivate({schemaVersion:1,records:{[k]:value}});}undo.value=raw.undo;}
  storageBlocked.value=false;
}catch(e){storageBlocked.value=true;notice.value=`無法讀取私人紀錄：${e.message}。原始內容保留，請匯出原始備份後處理。`;}}
const sync=e=>{if(e.key==='subsort-tw:private:v1'){load();notice.value='已同步同一瀏覽器其他分頁的紀錄。';}};
onMounted(()=>{load();window.addEventListener('storage',sync);});onUnmounted(()=>window.removeEventListener('storage',sync));
const validUrl=url=>{try{return new URL(url).protocol==='https:'?url:null;}catch{return null;}};
const coverUrl=g=>g.cover?.path&&!failedCovers.value[g.gameId]?import.meta.env.BASE_URL+g.cover.path:null;
const shortReason=g=>g.evaluation.reason.split('。')[0]+(g.evaluation.reason.includes('。')?'。':'');
const displayDate=value=>value?new Date(value).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false}):'未知';
</script>


<template>
  <a class="skip-link" href="#main">跳到遊戲清單</a>
  <aside class="sidebar">
    <a class="brand" href="#main" @click="switchView('confirmed')"><span class="brand-mark" aria-hidden="true">S</span><span>SubSort TW<small>Companion · 台帳遊戲決策</small></span></a>
    <button class="menu-toggle" :aria-expanded="menuOpen" aria-controls="navigation" @click="menuOpen=!menuOpen">功能選單</button>
    <nav id="navigation" aria-label="主要功能" :class="{open:menuOpen}">
      <button :aria-current="view==='confirmed'?'page':undefined" @click="switchView('confirmed')">遊戲候選<span>{{ all.length }}</span></button>
      <button :aria-current="view==='pending'?'page':undefined" @click="switchView('pending')">台帳待確認<span>{{ snapshot.watchlist.pending.length }}</span></button>
      <button :aria-current="view==='sources'?'page':undefined" @click="switchView('sources')">資料與來源</button>
    </nav>
    <p class="sidebar-scope">PlayStation Plus 台灣<br>升級／高級會員<br><span>本機紀錄 · 不連接 PSN</span></p>
  </aside>
  <div class="workspace">
    <header class="header wrap"><span>選遊戲、玩主線，依自己的目標畢業。</span><button @click="dialog='records'" aria-haspopup="dialog">備份與還原</button></header>
    <main id="main" class="wrap content" tabindex="-1">
      <section class="page-heading" aria-labelledby="page-title">
        <h1 id="page-title">{{ view==='confirmed'?'台帳遊戲候選':view==='pending'?'台帳待確認':'資料與來源' }}</h1>
        <p v-if="view==='confirmed'">單人優先、PS5 優先；主線玩完也可以畢業，完成不等於白金。</p>
        <p v-else-if="view==='pending'">沒有相同台灣穩定 ID 的項目另列待查，不混入正式候選。</p>
        <p v-else>原站語意、台帳版本與查證限制集中於此。</p>
        <div class="update-line"><span>最後成功更新：{{ displayDate(meta.lastSuccessAt) }}（台灣）</span><button v-if="view!=='sources'" class="text-button" @click="dialog='sources'">查看來源與資料缺口</button></div>
      </section>
      <div v-if="storageBlocked" class="warning">私人紀錄目前無法保存；原始內容仍保留。<button @click="exportRecovery">匯出原始備份</button></div>
      <section v-if="view==='confirmed'" aria-label="台帳候選">
        <div class="stats" aria-label="本期遊玩摘要">
          <button class="stat-card" @click="resetFilters()"><span>本期台帳候選</span><strong>{{ all.length }} <small>款</small></strong><small>上游 {{ meta.counts.candidates }} 款 · {{ meta.counts.pending }} 款待查</small></button>
          <button class="stat-card" :aria-pressed="status==='想玩'" @click="resetFilters();status='想玩'"><span>想玩</span><strong>{{ wanted }} <small>款</small></strong><small>查看已挑選的遊戲</small></button>
          <button class="stat-card" :aria-pressed="status==='遊玩中'" @click="resetFilters();status='遊玩中'"><span>遊玩中</span><strong>{{ playing }} <small>款</small></strong><small>回到目前遊玩的項目</small></button>
          <button class="stat-card" :aria-pressed="status==='完成'" @click="resetFilters();status='完成'"><span>本期已完成</span><strong>{{ completed }} <small>/ {{ all.length }} 款</small></strong><span class="progress-track" aria-hidden="true"><i :style="{width:`${all.length?completed/all.length*100:0}%`}"></i></span></button>
        </div>
        <div class="filters">
          <label class="search">搜尋遊戲<input v-model="query" type="search" placeholder="中文、英文名稱或已知原文" autocomplete="off"></label>
          <label>平台<select v-model="platform" aria-label="平台"><option value="">全部平台</option><option>PS5</option><option>PS4</option></select></label>
          <label>所需方案<select v-model="tier" aria-label="所需方案"><option value="">全部方案</option><option value="Extra">升級</option><option value="Deluxe">高級</option></select></label>
          <label>類型<select v-model="genre" aria-label="類型"><option value="">全部類型</option><option v-for="g in genres" :key="g" :value="g">{{ genreName(g) }}</option></select></label>
          <label>白金<select v-model="platinum" aria-label="白金"><option value="">全部</option><option value="yes">有白金</option><option value="no">無白金</option><option value="unknown">未知</option></select></label>
          <label>排序<select v-model="sort" aria-label="排序"><option value="recommendation">推薦優先</option><option value="main">主線時間短到長</option><option value="platinum">白金時間短到長</option></select></label>
        </div>
        <div class="list-bar"><span role="status">顯示 {{ filtered.length }} 款 · 完成／略過預設隱藏</span><div class="list-options"><label class="inline-label">遊玩狀態<select v-model="status" aria-label="遊玩狀態"><option value="">全部狀態</option><option v-for="s in STATUSES" :key="s">{{ s }}</option></select></label><label class="check"><input v-model="showHidden" type="checkbox">顯示完成／略過</label><button class="text-button" @click="resetFilters">重設篩選</button></div></div>
        <div v-if="!filtered.length" class="empty" tabindex="-1"><h2>沒有符合條件的遊戲</h2><p>調整篩選，或顯示已完成與略過的紀錄。</p><button @click="resetFilters">清除所有條件</button></div>
        <div class="game-list">
          <article v-for="e in filtered" :key="key(e)" class="game-card game-row" :data-game-id="e.gameId">
            <img v-if="coverUrl(e.game)" class="game-cover" :src="coverUrl(e.game)" :alt="title(e.game)+' 封面'" width="112" height="112" loading="lazy" decoding="async" @error="failedCovers[e.gameId]=true">
            <div v-else class="cover-fallback" aria-label="封面暫缺">{{ title(e.game).slice(0,2) }}</div>
            <div class="game-row-content">
              <div class="row-heading">
                <div class="row-name"><span class="rank" :class="{priority:['S','A'].includes(e.game.evaluation.rank)}" :aria-label="'推薦'+(e.game.evaluation.rank??'待評估')">{{ e.game.evaluation.rank??'待評估' }}</span><div><h2>{{ title(e.game) }}</h2><p v-if="e.game.nameZh" class="english">{{ e.game.nameEn }}</p><p class="genre-line">{{ e.platforms.join(' / ') }} · {{ e.tier==='Deluxe'?'高級':'升級' }} · {{ e.game.genres.map(genreName).join('／') }}<span class="added-at" title="SubSort美帳入庫日期">入庫 <time :datetime="e.addedAt??undefined">{{ e.addedAt??'未知' }}</time></span></p></div></div>
                <div class="row-numbers"><dl class="game-facts"><div><dt>主線</dt><dd>{{ formatHours(e.game.mainHours) }}</dd></div><div><dt>評分</dt><dd>{{ e.game.rating?e.game.rating.score+' / 100':'未知' }}</dd></div></dl><TrophyCounts :game="e.game" :platform="platform" /></div>
              </div>
              <p class="graduation-goal"><span class="goal-tag">{{ e.game.evaluation.goal?'建議'+e.game.evaluation.goal+'畢業':'待評估' }}</span><small v-if="e.game.evaluation.goal==='白金' && preferredVersion(e.game,platform)?.hasPlatinum!==true">（白金有無與條件待查）</small></p>
              <p class="reason">{{ shortReason(e.game) }}</p>
              <p v-for="risk in e.game.evaluation.risks" :key="risk" class="risk-note">提醒：{{ risk }}</p>
              <div class="row-actions"><div class="status-actions" role="group" :aria-label="title(e.game)+'的遊玩狀態'"><span class="status-label">我的狀態</span><button v-for="s in ['想玩','遊玩中','完成','略過']" :key="s" :aria-pressed="record(e).status===s" :disabled="storageBlocked" @click="setStatus(e,s)">{{ record(e).status===s?'✓ ':'' }}{{ s }}</button></div></div>
            </div>
          </article>
        </div>
      </section>
      <section v-else-if="view==='pending'" class="pending-section" aria-label="台帳待查項目"><p class="warning">待確認不等於未入庫或已出庫。區域、商品版本與目錄更新時間可能不同。</p><article v-for="p in snapshot.watchlist.pending" :key="p.gameId" class="pending-row"><div><h2>{{ p.name }}</h2><p>{{ p.reason }}</p></div><a :href="validUrl(p.storeUrl)" target="_blank" rel="noopener noreferrer">查閱上游商品</a></article></section>
      <section v-else aria-label="來源與查證"><SourcePanel :snapshot="snapshot" /></section>
      <footer class="footer"><p>SubSort TW Companion · 非官方個人輔助站</p><p>與 SubSort、Sony PlayStation 無官方關係；遊戲資料與商標屬各權利人，訂閱內容以台灣商店及主機為準。</p><p>遊玩狀態只保存在此瀏覽器，不同裝置以「備份與還原」手動移轉。</p></footer>
    </main>
    <div v-if="notice" class="feedback" role="status"><div>{{ notice }}</div><button v-if="undo && Object.keys(undo).length" @click="undoLast">撤銷上次操作</button></div>
  </div>
  <input ref="importInput" type="file" accept=".json,application/json" hidden @change="readImport">
  <Teleport to="body"><div v-if="dialog" class="modal-backdrop" @click.self="dialog=null" @keydown.esc="dialog=null"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1" v-focus-trap><header><h2 id="dialog-title">{{ dialog==='import'?'核對匯入差異':dialog==='cleanup'?'確認清理追蹤週期':dialog==='sources'?'資料來源與完整性':'備份與還原' }}</h2><button autofocus @click="dialog=null">關閉視窗</button></header>
    <template v-if="dialog==='records'"><p>已保存 {{ Object.keys(privateData.records).length }} 筆。遊戲與追蹤週期各自識別，重新入列會開啟新週期。</p><h3>本機紀錄</h3><div class="modal-actions"><button class="primary" @click="exportPrivate">匯出私人紀錄</button><button :disabled="storageBlocked" @click="importInput.click()">匯入私人紀錄</button><button :disabled="!undo||!Object.keys(undo).length" @click="undoLast">撤銷上次操作</button><button :disabled="!cleanKeys.length||storageBlocked" @click="dialog='cleanup'">預覽可清理紀錄（{{ cleanKeys.length }}）</button></div><p>只有完整有效快照內確認移除的週期可清理。暫缺資料、篩選和待查項目不觸發清理。</p><p v-if="notice" role="status">{{ notice }}</p></template>
    <template v-else-if="dialog==='import'"><p>共 {{ importCount }} 筆，其中 {{ overwriteCount }} 筆與本機同鍵。其他紀錄保留；請核對下列 {{ importDiff.length }} 筆差異，下載兩端原文備份後再套用。</p><div class="import-diff"><article v-for="d in importDiff" :key="d.key"><h3>{{ d.name }}</h3><p><strong>本機：</strong>{{ d.to?.status??'無紀錄' }} · {{ d.to?.note||'無筆記' }}</p><p><strong>匯入：</strong>{{ d.from.status }} · {{ d.from.note||'無筆記' }}</p></article></div><div class="modal-actions"><button @click="exportRecoveryBundle">下載兩端復原備份</button><button @click="dialog=null">取消匯入</button></div><label class="check"><input v-model="recoveryAcknowledged" type="checkbox" :disabled="!recoveryDownloaded">已確認復原備份下載並保存</label><button class="primary" :disabled="!recoveryAcknowledged" @click="confirmImport">確認合併與覆蓋</button></template>
    <template v-else-if="dialog==='cleanup'"><p>下列 {{ cleanKeys.length }} 個已確認移除週期的狀態與筆記將清理；其他遊戲與重新入列的新週期保留。</p><ul><li v-for="r in cleanRecords" :key="recordKey(r.gameId,r.cycleId)">{{ snapshot.games.find(g=>g.gameId===r.gameId)?.nameZh??snapshot.games.find(g=>g.gameId===r.gameId)?.nameEn??r.gameId }} · {{ r.status }}</li></ul><div class="modal-actions"><button @click="exportPrivate">先匯出清理前備份</button><button class="primary" @click="clean">確認清理舊週期</button><button @click="dialog=null">取消清理</button></div></template>
    <SourcePanel v-else :snapshot="snapshot" />
  </section></div></Teleport>
</template>

<script>
export default {directives:{focusTrap:{mounted(el){el.__prior=document.activeElement;el.__key=e=>{if(e.key!=='Tab')return;const items=[...el.querySelectorAll('button:not(:disabled),a[href],input,select,textarea')].filter(x=>!x.hidden);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){last?.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first?.focus();e.preventDefault();}};el.addEventListener('keydown',el.__key);el.querySelector('button')?.focus();},unmounted(el){el.removeEventListener('keydown',el.__key);el.__prior?.focus();}}}};
</script>
