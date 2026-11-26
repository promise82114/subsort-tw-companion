import test from 'node:test';
import assert from 'node:assert/strict';
import {reactive} from 'vue';
import {recordKey,validatePrivate,loadPrivate,planCleanup,applyCleanup,makeChange,undoChange,sortGames,formatHours} from '../src/domain.js';
const entry=(id='ss-one',cycle='cycle-aaaa')=>({gameId:id,cycleId:cycle,status:'想玩',note:'私人筆記',updatedAt:'2026-11-26T08:00:00Z'});
const privateOf=(...rows)=>({schemaVersion:1,records:Object.fromEntries(rows.map(r=>[recordKey(r.gameId,r.cycleId),r]))});
test('schema removes unknown fields and rejects invalid status, oversized notes and dangerous IDs',()=>{
  const r=entry();assert.deepEqual(validatePrivate({...privateOf({...r,extra:'ignored'}),token:'not retained'}),privateOf(r));
  for(const patch of [{status:'白金'},{note:1},{note:'x'.repeat(20001)},{updatedAt:'invalid'}])assert.throws(()=>validatePrivate(privateOf({...r,...patch})));
  assert.throws(()=>validatePrivate({schemaVersion:99,records:{}}));
  assert.throws(()=>validatePrivate(privateOf(entry('__proto__'))));
});
test('saved state loads, malformed storage remains recoverable rather than silently replaced',()=>{
  const data=privateOf(entry());assert.deepEqual(loadPrivate({getItem:()=>JSON.stringify(data)}),data);
  assert.throws(()=>loadPrivate({getItem:()=>'{broken'}));
  assert.throws(()=>loadPrivate({getItem:()=>{throw new Error('storage unavailable')}}));
});
test('cleanup requires a complete valid snapshot and a confirmed, scoped removal event',()=>{
  const data=privateOf(entry(),entry('ss-two')),metadata={snapshotId:'snapshot-x',validSnapshot:true,complete:true,removalEvents:[{gameId:'ss-one',cycleId:'cycle-aaaa',snapshotId:'snapshot-x',confirmed:true,reason:'upstream-absent'}]};
  const keys=planCleanup(data,metadata);assert.deepEqual(keys,['ss-one::cycle-aaaa']);
  for(const patch of [{validSnapshot:false},{complete:false},{snapshotId:null},{removalEvents:[{...metadata.removalEvents[0],confirmed:false}]},{removalEvents:[{...metadata.removalEvents[0],reason:'unknown'}]}])assert.deepEqual(planCleanup(data,{...metadata,...patch}),[]);
  assert.equal(Object.keys(applyCleanup(reactive(data),keys).next.records).length,1);
});
test('cleanup never touches a newly re-entered cycle, or unrelated games',()=>{
  const data=privateOf(entry(),entry('ss-one','cycle-bbbb'),entry('ss-other'));
  const {next}=applyCleanup(data,['ss-one::cycle-aaaa']);
  assert.equal(Object.keys(next.records).length,2);assert.ok(next.records['ss-one::cycle-bbbb']);assert.ok(next.records['ss-other::cycle-aaaa']);
});
test('precise undo restores only its changed records and preserves later edits',()=>{
  const before=privateOf(entry(),entry('ss-other'));const after=applyCleanup(before,['ss-one::cycle-aaaa']).next;
  const patch=makeChange(before,after),later=privateOf({...entry('ss-other'),note:'後續修改'});
  const undone=undoChange(reactive(later),patch);assert.equal(undone.restored,1);assert.equal(undone.next.records['ss-other::cycle-aaaa'].note,'後續修改');
  const conflict=undoChange(privateOf({...entry(),note:'更晚輸入'}),patch);assert.equal(conflict.conflicts,1);assert.equal(conflict.next.records['ss-one::cycle-aaaa'].note,'更晚輸入');
});
test('import replacement undo is scoped to incoming keys and does not remove other data',()=>{
  const before=privateOf(entry(),entry('ss-other'));
  const after=privateOf({...entry(),note:'匯入內容'},entry('ss-other'),entry('ss-new'));
  const restored=undoChange(after,makeChange(before,after));assert.deepEqual(restored.next,before);
});
test('unknown hours sort after known values; rank ties use main time and deterministic title',()=>{
  const make=(id,rank,hours)=>({gameId:id,upstreamRank:null,officialDeparture:null,game:{nameEn:id,mainHours:hours?{min:hours,max:hours}:null,platinumHours:null,evaluation:{rank}}});
  const rows=[make('z',null,null),make('b','A',20),make('a','A',3),make('s','S',10)];
  assert.deepEqual(sortGames(rows).map(r=>r.gameId),['s','a','b','z']);
  assert.deepEqual(sortGames(rows,'main').map(r=>r.gameId),['a','s','b','z']);
  assert.equal(formatHours(null),'未知');assert.equal(formatHours({min:15,max:null}),'15 小時以上');
});
