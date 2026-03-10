const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const stateModulePath = path.join(process.cwd(), 'assets', 'js', 'state.js');

function skipIfMissing(t, filePath) {
  if (!fs.existsSync(filePath)) {
    t.skip(`Module not implemented yet: ${filePath}`);
    return true;
  }
  return false;
}

// ─── ファイル存在確認 ─────────────────────────────────────────

test('state.js TDD targets are defined', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  assert.ok(fs.existsSync(stateModulePath));
});

// ─── initState ───────────────────────────────────────────────

test('initState returns the initial game state', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  const state = require(stateModulePath);

  const s = state.initState();

  assert.equal(s.currentDay, 1);
  assert.equal(s.currentEpisodeId, null);
  assert.deepEqual(s.affection, { minori: 0, toko: 0, hinata: 0 });
  assert.equal(s.params.study,  10);
  assert.equal(s.params.sports, 10);
  assert.equal(s.params.charm,  10);
  assert.equal(s.params.care,   10);
  assert.equal(s.params.stress, 0);
  assert.deepEqual(s.flags, {});
  assert.deepEqual(s.choiceHistory, []);
  assert.deepEqual(s.seenEpisodes, []);
  assert.deepEqual(s.galleryUnlocked, []);
});

test('initState resets state between calls', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  const state = require(stateModulePath);

  state.initState();
  state.setCurrentEpisodeId('day-003');
  state.advanceDay();
  state.advanceDay();

  const fresh = state.initState();

  assert.equal(fresh.currentDay, 1);
  assert.equal(fresh.currentEpisodeId, null);
});

test('getState does not expose internal reference', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  const state = require(stateModulePath);
  state.initState();

  const s1 = state.getState();
  s1.currentDay = 99;
  s1.flags.mutated = true;

  const s2 = state.getState();
  assert.equal(s2.currentDay, 1);
  assert.equal(s2.flags.mutated, undefined);
});

// ─── applyEffects ────────────────────────────────────────────

test('applyEffects updates affection, params, and flags', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  const state = require(stateModulePath);
  state.initState();

  state.applyEffects({
    affection: { minori: 3 },
    params: { care: 1, stress: 5 },
    flags: { day001_positive: true },
  });

  const s = state.getState();
  assert.equal(s.affection.minori, 3);
  assert.equal(s.params.care, 11);
  assert.equal(s.params.stress, 5);
  assert.equal(s.flags.day001_positive, true);
});

test('applyEffects is cumulative across multiple calls', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  const state = require(stateModulePath);
  state.initState();

  state.applyEffects({ affection: { minori: 2 } });
  state.applyEffects({ affection: { minori: 3 } });

  assert.equal(state.getState().affection.minori, 5);
});

test('applyEffects handles unknown keys without throwing', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  const state = require(stateModulePath);
  state.initState();

  assert.doesNotThrow(() => {
    state.applyEffects({ affection: { unknown_heroine: 5 }, params: { new_param: 3 } });
  });
  assert.equal(state.getState().affection.unknown_heroine, 5);
  assert.equal(state.getState().params.new_param, 3);
});

test('applyEffects clamps affection to 0-100', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  const state = require(stateModulePath);
  state.initState();

  state.applyEffects({ affection: { minori: 200 } });
  assert.equal(state.getState().affection.minori, 100);

  state.applyEffects({ affection: { minori: -999 } });
  assert.equal(state.getState().affection.minori, 0);
});

test('applyEffects clamps params to 0-99', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  const state = require(stateModulePath);
  state.initState();

  state.applyEffects({ params: { study: 200 } });
  assert.equal(state.getState().params.study, 99);

  state.applyEffects({ params: { study: -999 } });
  assert.equal(state.getState().params.study, 0);
});

test('applyEffects with empty or omitted sections does not throw', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  const state = require(stateModulePath);
  state.initState();

  assert.doesNotThrow(() => state.applyEffects({}));
  assert.doesNotThrow(() => state.applyEffects());
  assert.doesNotThrow(() => state.applyEffects({ affection: {} }));
});

// ─── recordChoice ─────────────────────────────────────────────

test('recordChoice appends a choice record', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  const state = require(stateModulePath);
  state.initState();

  state.recordChoice('day-001', 'c1');
  state.recordChoice('day-002', 'c2');

  const history = state.getState().choiceHistory;
  assert.equal(history.length, 2);
  assert.deepEqual(history[0], { episodeId: 'day-001', choiceId: 'c1' });
  assert.deepEqual(history[1], { episodeId: 'day-002', choiceId: 'c2' });
});

// ─── addSeenEpisode ───────────────────────────────────────────

test('addSeenEpisode stores seen episodes without breaking state', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  const state = require(stateModulePath);
  state.initState();

  state.addSeenEpisode('day-001');
  state.addSeenEpisode('day-002');

  assert.deepEqual(state.getSeenEpisodes(), ['day-001', 'day-002']);
});

test('addSeenEpisode is idempotent (no duplicate entries)', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  const state = require(stateModulePath);
  state.initState();

  state.addSeenEpisode('day-001');
  state.addSeenEpisode('day-001');
  state.addSeenEpisode('day-001');

  assert.equal(state.getSeenEpisodes().length, 1);
});

test('isSeenEpisode returns correct boolean', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  const state = require(stateModulePath);
  state.initState();

  state.addSeenEpisode('day-001');

  assert.equal(state.isSeenEpisode('day-001'), true);
  assert.equal(state.isSeenEpisode('day-002'), false);
});

// ─── setCurrentEpisodeId ──────────────────────────────────────

test('setCurrentEpisodeId updates the current episode pointer', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  const state = require(stateModulePath);
  state.initState();

  state.setCurrentEpisodeId('day-001a');

  assert.equal(state.getState().currentEpisodeId, 'day-001a');
  assert.equal(state.getState().currentDay, 1); // 日付は変わらない
});

// ─── advanceDay ───────────────────────────────────────────────

test('advanceDay increments day when branch reading is complete', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  const state = require(stateModulePath);
  state.initState();

  state.advanceDay();

  assert.equal(state.getState().currentDay, 2);
});

test('advanceDay does not increment currentDay on same-day branch', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  const state = require(stateModulePath);
  state.initState();

  state.advanceDay({ sameDay: true });

  assert.equal(state.getState().currentDay, 1);
});

test('advanceDay increments correctly across multiple calls', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  const state = require(stateModulePath);
  state.initState();

  state.advanceDay();
  state.advanceDay({ sameDay: true }); // 分岐：進まない
  state.advanceDay();

  assert.equal(state.getState().currentDay, 3);
});

// ─── getGalleryUnlocked / getSeenEpisodes ────────────────────

test('getGalleryUnlocked and getSeenEpisodes expose current state slices', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  const state = require(stateModulePath);
  state.initState();

  state.unlockGalleryItem('cg-day001');
  state.unlockGalleryItem('cg-day002');
  state.addSeenEpisode('day-001');

  assert.deepEqual(state.getGalleryUnlocked(), ['cg-day001', 'cg-day002']);
  assert.deepEqual(state.getSeenEpisodes(), ['day-001']);
});

test('getGalleryUnlocked returns a copy, not the internal array', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  const state = require(stateModulePath);
  state.initState();

  state.unlockGalleryItem('cg-day001');
  const arr = state.getGalleryUnlocked();
  arr.push('injected');

  assert.equal(state.getGalleryUnlocked().length, 1);
});

test('unlockGalleryItem is idempotent', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  const state = require(stateModulePath);
  state.initState();

  state.unlockGalleryItem('cg-day001');
  state.unlockGalleryItem('cg-day001');

  assert.equal(state.getGalleryUnlocked().length, 1);
});

// ─── diary ───────────────────────────────────────────────────

test('unlockDiaryEntry and isDiaryUnlocked work correctly', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  const state = require(stateModulePath);
  state.initState();

  assert.equal(state.isDiaryUnlocked('diary-minori-001'), false);

  state.unlockDiaryEntry('diary-minori-001');

  assert.equal(state.isDiaryUnlocked('diary-minori-001'), true);
  assert.equal(state.isDiaryUnlocked('diary-toko-001'), false);
});

test('unlockDiaryEntry is idempotent', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  const state = require(stateModulePath);
  state.initState();

  state.unlockDiaryEntry('diary-minori-001');
  state.unlockDiaryEntry('diary-minori-001');

  assert.equal(state.getState().diaryUnlocked.length, 1);
});

// ─── restoreState ─────────────────────────────────────────────

test('restoreState restores from a saved snapshot', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  const state = require(stateModulePath);
  state.initState();

  state.setCurrentEpisodeId('day-005');
  state.advanceDay();
  state.advanceDay();
  state.advanceDay();
  state.applyEffects({ affection: { minori: 10 } });

  const snapshot = state.getState();

  state.initState(); // リセット
  assert.equal(state.getState().currentDay, 1);

  state.restoreState(snapshot);
  const restored = state.getState();

  assert.equal(restored.currentDay, 4);
  assert.equal(restored.currentEpisodeId, 'day-005');
  assert.equal(restored.affection.minori, 10);
});

test('restoreState does not expose internal reference', async (t) => {
  if (skipIfMissing(t, stateModulePath)) return;
  const state = require(stateModulePath);
  state.initState();

  const snapshot = state.getState();
  state.restoreState(snapshot);

  snapshot.currentDay = 999;

  assert.notEqual(state.getState().currentDay, 999);
});
