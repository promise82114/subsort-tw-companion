import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {todayTaiwan,catalogPeriod,matchesPeriod,sortByPeriod} from '../src/catalog-period.js';
import {sortGames} from '../src/domain.js';
test('Taiwan day, leap years and month-end anniversaries use real calendar days',()=>{
  assert.equal(todayTaiwan(new Date('2026-11-26T16:01:00Z')),'2026-11-27');
  const leap=catalogPeriod('2024-02-29','2025-02-28');assert.equal(leap.months,12);assert.equal(leap.days,0);assert.equal(leap.marker.date,'2025-02-28');assert.equal(leap.marker.days,0);
  const end=catalogPeriod('2024-01-31','2024-02-29');assert.equal(end.months,1);assert.equal(end.days,0);
  assert.equal(catalogPeriod('2026-01-20','2026-11-27').duration,'10個月 7天');
});
test('annual windows are the two calendar months before 12/24, not a departure announcement',()=>{
  assert.equal(matchesPeriod(catalogPeriod('2026-01-20','2026-11-19'),'year'),false);
  const start=catalogPeriod('2026-01-20','2026-11-20');assert.equal(start.nearYear,true);assert.equal(start.tone,'annual');assert.equal(start.marker.date,'2027-01-20');
  const exact=catalogPeriod('2026-01-20','2027-01-20');assert.equal(exact.nearYear,true);assert.equal(exact.marker.days,0);
  const passed=catalogPeriod('2026-01-20','2027-01-21');assert.equal(passed.nearYear,false);assert.equal(passed.label,'已滿1年');assert.equal(passed.annual.date,'2028-01-20');
  assert.equal(catalogPeriod('2025-01-20','2026-11-27').nearTwoYears,true);
  assert.equal(catalogPeriod('2024-01-20','2026-11-27').label,'已滿2年');assert.equal(catalogPeriod('2024-01-20','2026-11-27').annual,null);
});
test('half-year references do not enter annual filters; unknown/future dates are not zero age',()=>{
  const half=catalogPeriod('2026-07-20','2026-11-27');assert.equal(half.nearHalf,true);assert.equal(half.tone,'half');assert.equal(matchesPeriod(half,'annual'),false);assert.equal(matchesPeriod(half,'half'),true);
  for(const date of [null,'invalid','2026-02-30','2026-11-28']){const t=catalogPeriod(date,'2026-11-27');assert.equal(t.known,false);assert.equal(matchesPeriod(t,'unknown'),true);assert.equal(matchesPeriod(t,'annual'),false);assert.equal(t.ageDays,undefined);}
});
test('existing recommendation/time sorts are byte-for-byte equivalent; new sorts keep unknown last',async()=>{
  const snapshot=JSON.parse(await fs.readFile('data/snapshot.json','utf8'));
  const items=snapshot.watchlist.entries.map(e=>({...e,game:snapshot.games.find(g=>g.gameId===e.gameId)}));
  for(const sort of ['recommendation','main','platinum'])assert.deepEqual(sortByPeriod(items,sort,'2026-11-27'),sortGames(items,sort));
  const fixtures=[{...items[0],gameId:'old',addedAt:'2025-01-20'},{...items[1],gameId:'new',addedAt:'2026-07-20'},{...items[2],gameId:'unknown',addedAt:null}];
  assert.deepEqual(sortByPeriod(fixtures,'catalog-oldest','2026-11-27').map(x=>x.gameId),['old','new','unknown']);assert.deepEqual(sortByPeriod(fixtures,'catalog-newest','2026-11-27').map(x=>x.gameId),['new','old','unknown']);
  const nearest=sortByPeriod(fixtures,'annual-nearest','2026-11-27');assert.equal(nearest[0].gameId,'old');assert.equal(nearest.at(-1).gameId,'unknown');assert.notEqual(nearest,fixtures);
});
