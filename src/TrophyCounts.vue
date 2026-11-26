<script setup>
import {computed} from 'vue';
const props=defineProps({game:Object,platform:String});
const version=computed(()=>{
  const candidates=props.game.versions.filter(v=>!props.platform||v.platform===props.platform);
  return candidates.find(v=>v.platform==='PS5'&&v.baseTrophies)??candidates.find(v=>v.baseTrophies)??candidates[0];
});
const types=[['platinum','白金'],['gold','金'],['silver','銀'],['bronze','銅']];
</script>
<template>
  <div class="trophy-counts" :aria-label="`${version?.platform??''}本體獎盃數量`">
    <span class="trophy-caption">{{ version?.platform }} 本體獎盃<span v-if="version?.baseTrophies"> · {{ version.baseTrophies.total }}</span></span>
    <div v-if="version?.baseTrophies" class="trophy-numbers"><span v-for="[type,label] in types" :key="type" :class="['trophy-number',type]" :aria-label="`${label}盃 ${version.baseTrophies[type]}`" :title="label+'盃'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v5c0 4-2 6-5 6S7 12 7 8V3Z" fill="currentColor"/><path d="M7 5H3v3c0 3 2 5 5 5m9-8h4v3c0 3-2 5-5 5M12 14v5m-4 2h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><b>{{ version.baseTrophies[type] }}</b></span></div>
    <span v-else class="trophy-unknown">尚待查證</span>
  </div>
</template>
