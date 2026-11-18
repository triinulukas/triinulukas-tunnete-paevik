import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dayKey, dayIndex, weekdayOf, questionsForDay, computeStats,
  starBalance, nextReward, escapeHtml, isHardDay, computeContextStats, computeSleepStats,
  textHash, speakableTexts, planSentence, DEFAULT_SETTINGS,
} from '../logic.js';

test('dayKey formats local date', () => {
  assert.equal(dayKey(new Date(2026, 10, 18)), '2026-11-18');
});

test('weekdayOf: 2026-11-18 is Wednesday (2)', () => {
  assert.equal(weekdayOf('2026-11-18'), 2);
  assert.equal(weekdayOf('2026-11-16'), 0); // Monday
  assert.equal(weekdayOf('2026-11-22'), 6); // Sunday
});

test('questionsForDay gives one positive + one coping, rotating daily', () => {
  const a = questionsForDay('2026-11-18');
  const b = questionsForDay('2026-11-19');
  assert.equal(a.length, 2);
  assert.match(a[0].id, /^p/);
  assert.match(a[1].id, /^c/);
  assert.notEqual(a[0].id, b[0].id);
  assert.deepEqual(questionsForDay('2026-11-18'), a); // deterministic
});

test('isHardDay', () => {
  assert.equal(isHardDay({ emotion: 'vihane', intensity: 4 }), true);
  assert.equal(isHardDay({ emotion: 'vihane', intensity: 1 }), false);
  assert.equal(isHardDay({ emotion: 'roomus', intensity: 5, goalResult: 'no' }), true);
  assert.equal(isHardDay({ emotion: 'roomus', intensity: 5, goalResult: 'yes' }), false);
});

test('computeStats counts weekday patterns and goal rate within window', () => {
  const entries = [
    { date: '2026-11-16', emotion: 'vihane', intensity: 5, goalResult: 'no' },   // Mon hard
    { date: '2026-11-09', emotion: 'vihane', intensity: 4, goalResult: 'partly' }, // Mon hard
    { date: '2026-11-18', emotion: 'roomus', intensity: 3, goalResult: 'yes' },  // Wed
    { date: '2026-09-01', emotion: 'kurb', intensity: 5, goalResult: 'no' },     // outside window
  ];
  const s = computeStats(entries, { today: '2026-11-18', days: 28 });
  assert.equal(s.count, 3);
  assert.deepEqual(s.weekday[0], { label: 'E', total: 2, hard: 2 });
  assert.equal(s.weekday[2].hard, 0);
  assert.equal(s.emotionCounts.vihane, 2);
  assert.equal(s.goalRate, 0.5);
  assert.equal(s.hardDays, 2);
});

test('computeStats with no goals gives null rate', () => {
  assert.equal(computeStats([], { today: '2026-11-18' }).goalRate, null);
});

test('starBalance and nextReward', () => {
  const bal = starBalance([{ delta: 1 }, { delta: 1 }, { delta: 5 }, { delta: -5 }]);
  assert.equal(bal, 2);
  const rewards = [{ text: 'B', cost: 15 }, { text: 'A', cost: 5 }, { text: '', cost: 1 }];
  assert.deepEqual(nextReward(2, rewards).next, { text: 'A', cost: 5 });
  assert.equal(nextReward(2, rewards).remaining, 3);
  assert.equal(nextReward(6, rewards).reachable.length, 1);
  assert.equal(nextReward(99, rewards).next, null);
});

test('computeContextStats counts hard and good places in window', () => {
  const entries = [
    { type: 'evening', date: '2026-11-18', hardPlace: 'tund', goodPlace: 'trenn' },
    { type: 'evening', date: '2026-11-17', hardPlace: 'tund', goodPlace: 'vahetund' },
    { type: 'evening', date: '2026-11-16', hardPlace: 'none', goodPlace: 'trenn' },
    { type: 'morning', date: '2026-11-18', hardPlace: 'kodu' },
    { type: 'evening', date: '2026-09-01', hardPlace: 'kodu' },
  ];
  const s = computeContextStats(entries, { today: '2026-11-18' });
  assert.equal(s.hard.tund, 2);
  assert.equal(s.hard.kodu, 0);
  assert.equal(s.good.trenn, 2);
});

test('computeSleepStats joins morning sleep with same-day evening', () => {
  const entries = [
    { type: 'morning', date: '2026-11-18', sleep: 'bad' },
    { type: 'evening', date: '2026-11-18', emotion: 'vihane', intensity: 4 },
    { type: 'morning', date: '2026-11-17', sleep: 'good' },
    { type: 'evening', date: '2026-11-17', emotion: 'roomus', intensity: 3 },
    { type: 'morning', date: '2026-11-16', sleep: 'bad' }, // no evening -> ignored
  ];
  const s = computeSleepStats(entries, { today: '2026-11-18' });
  assert.deepEqual(s.bad, { days: 1, hard: 1 });
  assert.deepEqual(s.good, { days: 1, hard: 0 });
  assert.deepEqual(s.ok, { days: 0, hard: 0 });
});

test('textHash is stable, whitespace-insensitive, and distinct', () => {
  assert.equal(textHash('Tere hommikust!'), textHash('  Tere   hommikust! '));
  assert.notEqual(textHash('Tere'), textHash('tere'));
  assert.match(textHash('õäöü'), /^[0-9a-f]{8}$/);
});

test('speakableTexts covers questions, plans and calm steps without duplicates or hash collisions', () => {
  const t = speakableTexts();
  assert.equal(new Set(t).size, t.length);
  assert.ok(t.includes('Mis oli täna kõige toredam hetk?'));
  assert.ok(t.includes('Kui suur see vihane tunne oli?'));
  assert.ok(t.includes(planSentence(DEFAULT_SETTINGS.plans[0])));
  assert.equal(new Set(t.map(textHash)).size, t.length);
});

test('escapeHtml', () => {
  assert.equal(escapeHtml('<b>"x"</b>'), '&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
});
