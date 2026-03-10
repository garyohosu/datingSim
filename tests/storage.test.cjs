const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const storageModulePath = path.join(process.cwd(), 'assets', 'js', 'storage.js');

function skipIfMissing(t, filePath) {
  if (!fs.existsSync(filePath)) {
    t.skip(`Module not implemented yet: ${filePath}`);
    return true;
  }
  return false;
}

// ─── モック localStorage ────────────────────────────────────

function createMockStorage() {
  const store = new Map();
  return {
    getItem:    (key)        => store.has(key) ? store.get(key) : null,
    setItem:    (key, value) => store.set(key, String(value)),
    removeItem: (key)        => store.delete(key),
    clear:      ()           => store.clear(),
    _has:       (key)        => store.has(key),
    _keys:      ()           => [...store.keys()],
  };
}

// 各テストで fresh なモックを注入するヘルパー
function freshStorage() {
  const storage = require(storageModulePath);
  const mock = createMockStorage();
  storage._setStorageBackend(mock);
  return { storage, mock };
}

// テスト用の最小 GameState
function makeState(overrides = {}) {
  return {
    version: 1,
    currentDay: 3,
    currentEpisodeId: 'day-003',
    affection: { minori: 5, toko: 2, hinata: 0 },
    params: { study: 10, sports: 10, charm: 10, care: 12, stress: 0 },
    flags: { met_minori: true },
    choiceHistory: [{ episodeId: 'day-001', choiceId: 'c1' }],
    seenEpisodes: ['day-001', 'day-002'],
    seenEvents: [],
    galleryUnlocked: ['cg-day001'],
    diaryUnlocked: ['diary-minori-001'],
    endingsReached: [],
    ...overrides,
  };
}

// ─── ファイル存在確認 ──────────────────────────────────────────

test('storage.js TDD targets are defined', async (t) => {
  if (skipIfMissing(t, storageModulePath)) return;
  assert.ok(fs.existsSync(storageModulePath));
});

// ─── hasAnySave ────────────────────────────────────────────────

test('hasAnySave detects autosave presence', async (t) => {
  if (skipIfMissing(t, storageModulePath)) return;
  const { storage } = freshStorage();

  assert.equal(storage.hasAnySave(), false);

  storage.saveAuto(makeState());

  assert.equal(storage.hasAnySave(), true);
});

test('hasAnySave returns false after resetProgress', async (t) => {
  if (skipIfMissing(t, storageModulePath)) return;
  const { storage } = freshStorage();

  storage.saveAuto(makeState());
  storage.resetProgress();

  assert.equal(storage.hasAnySave(), false);
});

// ─── saveAuto / loadAuto ───────────────────────────────────────

test('saveAuto and loadAuto round-trip the game state', async (t) => {
  if (skipIfMissing(t, storageModulePath)) return;
  const { storage } = freshStorage();

  const state = makeState();
  storage.saveAuto(state);
  const loaded = storage.loadAuto();

  assert.equal(loaded.currentDay, state.currentDay);
  assert.equal(loaded.currentEpisodeId, state.currentEpisodeId);
  assert.deepEqual(loaded.affection, state.affection);
  assert.deepEqual(loaded.params, state.params);
  assert.deepEqual(loaded.flags, state.flags);
  assert.deepEqual(loaded.seenEpisodes, state.seenEpisodes);
  assert.deepEqual(loaded.galleryUnlocked, state.galleryUnlocked);
  assert.deepEqual(loaded.diaryUnlocked, state.diaryUnlocked);
});

test('loadAuto returns null when no autosave exists', async (t) => {
  if (skipIfMissing(t, storageModulePath)) return;
  const { storage } = freshStorage();

  assert.equal(storage.loadAuto(), null);
});

test('loadAuto persists savedAt timestamp', async (t) => {
  if (skipIfMissing(t, storageModulePath)) return;
  const { storage } = freshStorage();

  storage.saveAuto(makeState());
  const loaded = storage.loadAuto();

  assert.ok(typeof loaded.savedAt === 'string');
  assert.ok(loaded.savedAt.length > 0);
});

// ─── saveManual / loadManual ───────────────────────────────────

test('saveManual and loadManual operate per slot', async (t) => {
  if (skipIfMissing(t, storageModulePath)) return;
  const { storage } = freshStorage();

  const s1 = makeState({ currentDay: 1, currentEpisodeId: 'day-001' });
  const s2 = makeState({ currentDay: 2, currentEpisodeId: 'day-002' });
  const s3 = makeState({ currentDay: 3, currentEpisodeId: 'day-003' });

  storage.saveManual(1, s1);
  storage.saveManual(2, s2);
  storage.saveManual(3, s3);

  assert.equal(storage.loadManual(1).currentDay, 1);
  assert.equal(storage.loadManual(2).currentDay, 2);
  assert.equal(storage.loadManual(3).currentDay, 3);
});

test('loadManual returns null for empty slot', async (t) => {
  if (skipIfMissing(t, storageModulePath)) return;
  const { storage } = freshStorage();

  assert.equal(storage.loadManual(1), null);
  assert.equal(storage.loadManual(2), null);
  assert.equal(storage.loadManual(3), null);
});

test('saveManual / loadManual include collection data', async (t) => {
  if (skipIfMissing(t, storageModulePath)) return;
  const { storage } = freshStorage();

  const state = makeState({ galleryUnlocked: ['cg-day001', 'cg-day002'] });
  storage.saveManual(1, state);
  const loaded = storage.loadManual(1);

  assert.deepEqual(loaded.galleryUnlocked, ['cg-day001', 'cg-day002']);
});

test('slots are independent: overwriting slot 2 does not affect slot 1', async (t) => {
  if (skipIfMissing(t, storageModulePath)) return;
  const { storage } = freshStorage();

  storage.saveManual(1, makeState({ currentDay: 5 }));
  storage.saveManual(2, makeState({ currentDay: 10 }));

  assert.equal(storage.loadManual(1).currentDay, 5);
  assert.equal(storage.loadManual(2).currentDay, 10);
});

// ─── listSaves ────────────────────────────────────────────────

test('listSaves returns empty and occupied slot summaries correctly', async (t) => {
  if (skipIfMissing(t, storageModulePath)) return;
  const { storage } = freshStorage();

  // 初期は全部 empty
  const before = storage.listSaves();
  assert.equal(before.length, 4); // auto + 1 + 2 + 3
  assert.ok(before.every(s => s.isEmpty));

  // auto と slot1 だけ埋める
  storage.saveAuto(makeState({ currentDay: 3 }));
  storage.saveManual(1, makeState({ currentDay: 7 }));

  const after = storage.listSaves();
  const auto  = after.find(s => s.slot === 'auto');
  const slot1 = after.find(s => s.slot === 1);
  const slot2 = after.find(s => s.slot === 2);

  assert.equal(auto.isEmpty, false);
  assert.equal(auto.currentDay, 3);
  assert.equal(slot1.isEmpty, false);
  assert.equal(slot1.currentDay, 7);
  assert.equal(slot2.isEmpty, true);
});

// ─── loadSettings / saveSettings ──────────────────────────────

test('loadSettings and saveSettings preserve audio settings', async (t) => {
  if (skipIfMissing(t, storageModulePath)) return;
  const { storage } = freshStorage();

  // 未保存: デフォルト値を返す
  const defaults = storage.loadSettings();
  assert.equal(typeof defaults.bgmVolume, 'number');
  assert.equal(typeof defaults.seVolume, 'number');
  assert.equal(typeof defaults.muted, 'boolean');

  // 保存して復元
  storage.saveSettings({ bgmVolume: 0.3, seVolume: 0.6, muted: true });
  const loaded = storage.loadSettings();

  assert.equal(loaded.bgmVolume, 0.3);
  assert.equal(loaded.seVolume, 0.6);
  assert.equal(loaded.muted, true);
});

test('loadSettings returns defaults when storage is empty', async (t) => {
  if (skipIfMissing(t, storageModulePath)) return;
  const { storage } = freshStorage();

  const s = storage.loadSettings();
  assert.equal(s.bgmVolume, 0.7);
  assert.equal(s.seVolume, 0.8);
  assert.equal(s.muted, false);
});

// ─── resetProgress ────────────────────────────────────────────

test('resetProgress deletes progress only and preserves collection-oriented data', async (t) => {
  if (skipIfMissing(t, storageModulePath)) return;
  const { storage, mock } = freshStorage();

  const state = makeState({
    galleryUnlocked: ['cg-day001'],
    diaryUnlocked: ['diary-minori-001'],
  });
  storage.saveAuto(state);
  storage.saveManual(1, state);
  storage.saveManual(2, state);
  storage.saveManual(3, state);
  storage.saveSettings({ bgmVolume: 0.5, seVolume: 0.5, muted: false });

  storage.resetProgress();

  // 進行データは消えている
  assert.equal(storage.loadAuto(), null);
  assert.equal(storage.loadManual(1), null);
  assert.equal(storage.loadManual(2), null);
  assert.equal(storage.loadManual(3), null);
  assert.equal(storage.hasAnySave(), false);

  // 設定は残っている
  assert.equal(storage.loadSettings().bgmVolume, 0.5);

  // コレクションは残っている
  const col = storage.loadCollection();
  assert.deepEqual(col.galleryUnlocked, ['cg-day001']);
  assert.deepEqual(col.diaryUnlocked, ['diary-minori-001']);
});

// ─── resetAll ────────────────────────────────────────────────

test('resetAll deletes progress, settings, and collection-related data', async (t) => {
  if (skipIfMissing(t, storageModulePath)) return;
  const { storage, mock } = freshStorage();

  const state = makeState({ galleryUnlocked: ['cg-day001'] });
  storage.saveAuto(state);
  storage.saveManual(1, state);
  storage.saveSettings({ bgmVolume: 0.4, seVolume: 0.4, muted: true });

  storage.resetAll();

  // 進行データは消えている
  assert.equal(storage.loadAuto(), null);
  assert.equal(storage.loadManual(1), null);
  assert.equal(storage.hasAnySave(), false);

  // 設定はデフォルトに戻っている
  const settings = storage.loadSettings();
  assert.equal(settings.bgmVolume, 0.7); // default

  // コレクションは消えている
  const col = storage.loadCollection();
  assert.deepEqual(col.galleryUnlocked, []);
  assert.deepEqual(col.diaryUnlocked, []);

  // localStorage に hokago_signal_* キーが残っていないこと
  const remaining = mock._keys().filter(k => k.startsWith('hokago_signal_'));
  assert.equal(remaining.length, 0);
});

// ─── 破損データ ───────────────────────────────────────────────

test('broken save data fails safely without auto-fallback', async (t) => {
  if (skipIfMissing(t, storageModulePath)) return;
  const { storage, mock } = freshStorage();

  // 不正な JSON を直接書き込む
  mock.setItem('hokago_signal_autosave', '{ broken json %%%');

  assert.throws(
    () => storage.loadAuto(),
    (err) => err.message === 'SAVE_PARSE_FAILED'
  );
});

test('version mismatch throws VERSION_MISMATCH', async (t) => {
  if (skipIfMissing(t, storageModulePath)) return;
  const { storage, mock } = freshStorage();

  mock.setItem('hokago_signal_autosave', JSON.stringify({ version: 99, currentDay: 1 }));

  assert.throws(
    () => storage.loadAuto(),
    (err) => err.message === 'VERSION_MISMATCH'
  );
});

test('broken data in manual slot also throws SAVE_PARSE_FAILED', async (t) => {
  if (skipIfMissing(t, storageModulePath)) return;
  const { storage, mock } = freshStorage();

  mock.setItem('hokago_signal_save_2', '!invalid!');

  assert.throws(
    () => storage.loadManual(2),
    (err) => err.message === 'SAVE_PARSE_FAILED'
  );
});

test('loadAuto error does not auto-fallback to manual saves', async (t) => {
  if (skipIfMissing(t, storageModulePath)) return;
  const { storage, mock } = freshStorage();

  // 手動セーブには正常なデータを置く
  storage.saveManual(1, makeState({ currentDay: 5 }));

  // オートセーブは壊す
  mock.setItem('hokago_signal_autosave', '{ bad }');

  // loadAuto はエラーを投げるだけ; 手動セーブを勝手に読まない
  assert.throws(
    () => storage.loadAuto(),
    (err) => err.message === 'SAVE_PARSE_FAILED'
  );
  // 手動セーブは無傷
  assert.equal(storage.loadManual(1).currentDay, 5);
});

// ─── loadCollection ───────────────────────────────────────────

test('loadCollection returns defaults when no data exists', async (t) => {
  if (skipIfMissing(t, storageModulePath)) return;
  const { storage } = freshStorage();

  const col = storage.loadCollection();
  assert.deepEqual(col.galleryUnlocked, []);
  assert.deepEqual(col.diaryUnlocked, []);
  assert.deepEqual(col.endingsReached, []);
});

test('collection is shared across auto and manual saves', async (t) => {
  if (skipIfMissing(t, storageModulePath)) return;
  const { storage } = freshStorage();

  // slot1 で gallery を解放
  storage.saveManual(1, makeState({ galleryUnlocked: ['cg-day001'] }));

  // autosave で読み込んでも gallery が見えている
  storage.saveAuto(makeState({ galleryUnlocked: ['cg-day001', 'cg-day002'] }));
  const loaded = storage.loadAuto();

  assert.deepEqual(loaded.galleryUnlocked, ['cg-day001', 'cg-day002']);
});
