<script setup>
import {computed} from 'vue';
import TrophyNumbers from './TrophyNumbers.vue';
import {preferredVersion,additionalSummary} from './trophies.js';
const props=defineProps({game:Object,platform:String});
const version=computed(()=>preferredVersion(props.game,props.platform));
const extra=computed(()=>additionalSummary(version.value?.additionalTrophies));
const kindName=kind=>kind==='update'?'更新':kind==='dlc'?'DLC':'追加';
</script>
<template>
  <div class="trophy-counts" :aria-label="(version?.platform??'')+'獎盃數量'">
    <div class="trophy-base">
      <span class="trophy-caption">{{ version?.platform }} 本體獎盃<span v-if="version?.baseTrophies"> · {{ version.baseTrophies.total }}</span></span>
      <TrophyNumbers v-if="version?.baseTrophies" :counts="version.baseTrophies" />
      <span v-else class="trophy-unknown">尚待查證</span>
    </div>
    <div v-if="extra" class="trophy-additional" aria-label="DLC與更新追加獎盃">
      <span class="additional-caption">{{ extra.groups.every(g=>g.kind==='update')?'更新獎盃':'DLC／追加獎盃' }} · {{ extra.complete?'':'已知 ' }}{{ extra.total }}<span v-if="!extra.complete">（未齊）</span></span>
      <TrophyNumbers v-if="extra.counts" :counts="extra.counts" />
      <ul class="trophy-pack-names"><li v-for="group in extra.groups" :key="group.id">{{ kindName(group.kind) }} · {{ group.name }} <b>{{ group.total }}</b></li></ul>
    </div>
    <span v-else-if="version?.additionalTrophies?.status!=='none'" class="additional-unknown">DLC／更新獎盃待查</span>
  </div>
</template>
