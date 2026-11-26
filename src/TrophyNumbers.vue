<script setup>
defineProps({counts:Object});
const types=[['platinum','白金'],['gold','金'],['silver','銀'],['bronze','銅']];
</script>
<template>
  <div class="trophy-numbers"><span v-for="[type,label] in types" :key="type" :class="['trophy-number',type]" :aria-label="`${label}盃 ${counts[type]}`" :title="label+'盃'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v5c0 4-2 6-5 6S7 12 7 8V3Z" fill="currentColor"/><path d="M7 5H3v3c0 3 2 5 5 5m9-8h4v3c0 3-2 5-5 5M12 14v5m-4 2h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><b>{{ counts[type] }}</b></span></div>
</template>
