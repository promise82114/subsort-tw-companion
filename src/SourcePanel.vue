<script setup>
import {computed} from 'vue';
const props=defineProps({snapshot:Object});
const games=computed(()=>props.snapshot.watchlist.entries.filter(e=>!e.suspended).map(e=>props.snapshot.games.find(g=>g.gameId===e.gameId)));
const known=computed(()=>games.value.filter(g=>g.versions.some(v=>v.baseTrophies)).length);
function evidence(g){const sources=[...g.sources,...g.evaluation.sources,...g.versions.flatMap(v=>v.baseTrophies?[v.baseTrophies.source]:[]),...(g.mainHours?[g.mainHours.source]:[]),...(g.rating?[g.rating.source]:[])];return [...new Map(sources.map(s=>[s.originalUrl??s.url,s])).values()];}
const sourceName=url=>url.includes('subsort')?'SubSort 公開清單':url.includes('whats-new')?'官方最新內容（離庫未確認）':url.includes('plus-classics')?'台灣經典目錄':'台灣官方遊戲目錄';
</script>
<template>
  <div class="source-panel">
    <p>比對基準日：{{ snapshot.metadata.asOf }}（Asia/Taipei）。完整擷取包含 {{ snapshot.metadata.counts.upstreamTotal }} 筆上游資料、{{ snapshot.metadata.counts.gameCatalog }} 筆台帳遊戲目錄及 {{ snapshot.metadata.counts.classicsCatalog }} 筆經典目錄。</p>
    <h3>指定清單的實際語意</h3><p>關閉 Xbox，沿用原站 Premium(PS) 預設，SubSort「可能離庫」。此分類依入庫未滿24個月的第三方遊戲、6個月週期計算，不代表官方出庫。台灣所需方案另以官方目錄標示。</p>
    <h3>確認範圍與缺口</h3><ul><li>{{ snapshot.metadata.counts.confirmed }} 款正式候選，以 concept ID 或完整 product ID 與台帳共同平台確認。</li><li>{{ snapshot.metadata.counts.pending }} 款待查；未用名稱近似自動合併，也不直接判定已出庫。</li><li>主線與評分由 SubSort 轉載，原始連結統一放在下方。</li><li>{{ known }}／{{ games.length }} 款至少有一個平台版本的本體獎盃數量；未知仍留空，台灣 NP 群組 ID 未核實。</li><li>獎盃數量與白金攻略分開快取，僅採同平台本體；不把DLC或更新盃混入本體，也不因缺白金攻略而隱藏已知數量。</li><li>推薦為依個人規則作出的判斷；研究與來源集中於此，遊戲列僅顯示決策需要的內容。</li></ul>
    <h3>來源連結</h3><div class="source-links"><a v-for="s in snapshot.metadata.sources" :key="s.url" :href="s.url" target="_blank" rel="noopener noreferrer">{{ sourceName(s.url) }} · {{ s.checkedAt.slice(0,10) }}</a></div><p class="muted snapshot-id">{{ snapshot.metadata.snapshotId }}</p>
    <h3>各遊戲資料依據</h3><article v-for="g in games" :key="g.gameId" class="source-game"><h4>{{ g.nameZh??g.nameEn }}</h4><p>研究：{{ g.evaluation.evaluatedAt??'未知' }}。{{ g.evaluation.reason }}</p><p>{{ g.versions.map(v=>v.platform+' 本體 '+(v.baseTrophies?.total??'未知')).join(' · ') }}</p><div class="source-links"><a v-for="s in evidence(g)" :key="s.originalUrl??s.url" :href="s.originalUrl??s.url" target="_blank" rel="noopener noreferrer">{{ (s.originalUrl??s.url).includes('truetrophies')?'本體獎盃清單':(s.originalUrl??s.url).includes('powerpyx')?'獎盃攻略':(s.originalUrl??s.url).includes('howlongtobeat')?'主線時數':(s.originalUrl??s.url).includes('metacritic')?'評分':s.url.includes('subsort')?'SubSort':s.url.includes('/bin/')?'台帳目錄':'台灣商店' }} · {{ s.checkedAt.slice(0,10) }}</a></div></article>
  </div>
</template>
