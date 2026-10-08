import {test} from 'node:test';
import assert from 'node:assert/strict';
import {daysLeft, validDate, validTask} from './core.js';
test('calendar countdown crosses months and years by local date',()=>{assert.equal(daysLeft('2027-01-01',new Date(2026,11,31,23,59)),1);assert.equal(daysLeft('2026-10-08',new Date(2026,9,8,0,1)),0);assert.equal(daysLeft('2026-10-07',new Date(2026,9,8)),-1);});
test('invalid dates and malformed backups are rejected',()=>{assert.equal(validDate('2026-02-29'),false);assert.equal(validDate('2028-02-29'),true);assert.equal(validDate('2026-13-01'),false);assert.equal(validTask({id:'a',title:'task',due:'2026-10-08',priority:'normal',notes:'',completed:false,createdAt:'2026-10-08'}),true);assert.equal(validTask({}),false);});
import {validDeadline, millisecondsLeft, countdown, normalizeDue} from './core.js';
test('minute precision detects same-day overdue deadlines',()=>{const now=new Date(2026,9,8,15,30);assert.equal(millisecondsLeft('2026-10-08T15:29',now),-60000);assert.deepEqual(countdown('2026-10-08T16:45',now),{value:'1h 15m',label:'left',overdue:false});assert.equal(countdown('2026-10-08T15:30',now).label,'Due now');assert.equal(countdown('2026-10-08T15:29',now).label,'overdue');});
test('legacy deadlines and invalid times',()=>{assert.equal(normalizeDue('2026-10-08'),'2026-10-08T23:59');assert.equal(validDeadline('2026-10-08T24:00'),false);assert.equal(validDeadline('2026-10-08T12:60'),false);assert.equal(validDeadline('2026-10-08T12:30'),true);assert.equal(daysLeft('2026-10-15T12:30',new Date(2026,9,8)),7);});
