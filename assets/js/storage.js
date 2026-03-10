// assets/js/storage.js
// 責務: localStorage への永続化。ゲームロジックは持たない。
//
// キー設計:
//   hokago_signal_autosave     … 進行データ (resetProgress で削除)
//   hokago_signal_save_1〜3   … 手動セーブ (resetProgress で削除)
//   hokago_signal_collection   … gallery/diary/endings (resetProgress で保持)
//   hokago_signal_settings     … 音量設定 (resetProgress で保持)

const SAVE_VERSION = 1;

const KEYS = {
  autosave: 'hokago_signal_autosave',
  save1:    'hokago_signal_save_1',
  save2:    'hokago_signal_save_2',
  save3:    'hokago_signal_save_3',
  collection: 'hokago_signal_collection',
  settings:   'hokago_signal_settings',
};

// resetProgress で削除する対象
const PROGRESS_KEYS = [KEYS.autosave, KEYS.save1, KEYS.save2, KEYS.save3];

// resetAll で削除するすべてのキー
const ALL_KEYS = Object.values(KEYS);

const DEFAULT_SETTINGS   = { bgmVolume: 0.7, seVolume: 0.8, muted: false };
const DEFAULT_COLLECTION = { galleryUnlocked: [], diaryUnlocked: [], endingsReached: [] };

// テスト用に localStorage 実装を差し替え可能にする
let _store = (typeof globalThis !== 'undefined' && globalThis.localStorage) || null;

/** @internal テスト専用: localStorage モックを注入する */
function _setStorageBackend(mock) {
  _store = mock;
}

// ─── 低レベル I/O ─────────────────────────────────────────────

function _get(key) {
  return _store ? _store.getItem(key) : null;
}

function _set(key, value) {
  if (_store) _store.setItem(key, value);
}

function _remove(key) {
  if (_store) _store.removeItem(key);
}

// ─── 内部ヘルパー ─────────────────────────────────────────────

/**
 * state からコレクション以外の進行データだけを JSON 化する。
 * セーブスロットに書き込む形式。
 */
function _serializeProgress(state) {
  const {
    galleryUnlocked: _g,
    diaryUnlocked:   _d,
    endingsReached:  _e,
    ...progress
  } = state;

  return JSON.stringify({
    ...progress,
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
  });
}

/**
 * コレクションデータを collection キーから読む。
 * 読み込み失敗時はデフォルトを返す（エラーにしない）。
 */
function _loadCollection() {
  const raw = _get(KEYS.collection);
  if (raw === null) return { ...DEFAULT_COLLECTION };
  try {
    const parsed = JSON.parse(raw);
    return {
      galleryUnlocked: Array.isArray(parsed.galleryUnlocked) ? parsed.galleryUnlocked : [],
      diaryUnlocked:   Array.isArray(parsed.diaryUnlocked)   ? parsed.diaryUnlocked   : [],
      endingsReached:  Array.isArray(parsed.endingsReached)  ? parsed.endingsReached  : [],
    };
  } catch {
    return { ...DEFAULT_COLLECTION };
  }
}

/**
 * state 内のコレクションデータを collection キーへ書く。
 * saveAuto/saveManual から呼ばれる。
 */
function _saveCollection(state) {
  _set(KEYS.collection, JSON.stringify({
    galleryUnlocked: state.galleryUnlocked || [],
    diaryUnlocked:   state.diaryUnlocked   || [],
    endingsReached:  state.endingsReached  || [],
  }));
}

/**
 * JSON 文字列をパースしてバージョンを検証し、コレクションとマージした
 * 完全な GameState を返す。
 * @throws {Error} SAVE_PARSE_FAILED | VERSION_MISMATCH
 */
function _deserializeAndMerge(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('SAVE_PARSE_FAILED');
  }

  if (!parsed || parsed.version !== SAVE_VERSION) {
    throw new Error('VERSION_MISMATCH');
  }

  return { ...parsed, ..._loadCollection() };
}

// ─── 公開 API ────────────────────────────────────────────────

/**
 * 起動時初期化。設定を返す。
 * @returns {object} Settings
 */
function init() {
  return loadSettings();
}

/**
 * オートセーブが存在するか返す。
 * @returns {boolean}
 */
function hasAnySave() {
  return _get(KEYS.autosave) !== null;
}

/**
 * オートセーブを書き込む。
 * @param {object} state - GameState
 */
function saveAuto(state) {
  _set(KEYS.autosave, _serializeProgress(state));
  _saveCollection(state);
}

/**
 * オートセーブを読み込む。
 * @returns {object|null} GameState or null (存在しない場合)
 * @throws {Error} SAVE_PARSE_FAILED | VERSION_MISMATCH
 */
function loadAuto() {
  const raw = _get(KEYS.autosave);
  if (raw === null) return null;
  return _deserializeAndMerge(raw);
}

/**
 * 手動セーブを書き込む。
 * @param {1|2|3} slot
 * @param {object} state - GameState
 */
function saveManual(slot, state) {
  const key = KEYS[`save${slot}`];
  if (!key) throw new Error(`Invalid slot: ${slot}`);
  _set(key, _serializeProgress(state));
  _saveCollection(state);
}

/**
 * 手動セーブを読み込む。
 * @param {1|2|3} slot
 * @returns {object|null} GameState or null (存在しない場合)
 * @throws {Error} SAVE_PARSE_FAILED | VERSION_MISMATCH
 */
function loadManual(slot) {
  const key = KEYS[`save${slot}`];
  if (!key) throw new Error(`Invalid slot: ${slot}`);
  const raw = _get(key);
  if (raw === null) return null;
  return _deserializeAndMerge(raw);
}

/**
 * 全スロットの概要を返す。
 * @returns {Array<{slot, isEmpty, currentDay?, currentEpisodeId?, affection?, savedAt?, corrupted?}>}
 */
function listSaves() {
  const slots = [
    { slot: 'auto', key: KEYS.autosave },
    { slot: 1,      key: KEYS.save1 },
    { slot: 2,      key: KEYS.save2 },
    { slot: 3,      key: KEYS.save3 },
  ];

  return slots.map(({ slot, key }) => {
    const raw = _get(key);
    if (raw === null) return { slot, isEmpty: true };

    try {
      const data = JSON.parse(raw);
      return {
        slot,
        isEmpty: false,
        currentDay: data.currentDay,
        currentEpisodeId: data.currentEpisodeId,
        affection: data.affection,
        savedAt: data.savedAt,
      };
    } catch {
      return { slot, isEmpty: true, corrupted: true };
    }
  });
}

/**
 * 設定を読む。読み込み失敗時はデフォルトを返す。
 * @returns {object} Settings
 */
function loadSettings() {
  const raw = _get(KEYS.settings);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * 設定を書く。
 * @param {object} settings
 */
function saveSettings(settings) {
  _set(KEYS.settings, JSON.stringify(settings));
}

/**
 * コレクションデータ（gallery/diary/endings）を読む。
 * 最初から リセット後に initState と組み合わせて使う。
 * @returns {{ galleryUnlocked: string[], diaryUnlocked: string[], endingsReached: object[] }}
 */
function loadCollection() {
  return _loadCollection();
}

/**
 * 進行データのみ削除する（最初から）。
 * settings / collection は保持する。
 */
function resetProgress() {
  for (const key of PROGRESS_KEYS) {
    _remove(key);
  }
}

/**
 * 全データを削除する（全データ削除）。
 */
function resetAll() {
  for (const key of ALL_KEYS) {
    _remove(key);
  }
}

module.exports = {
  init,
  hasAnySave,
  saveAuto,
  loadAuto,
  saveManual,
  loadManual,
  listSaves,
  loadSettings,
  saveSettings,
  loadCollection,
  resetProgress,
  resetAll,
  _setStorageBackend,
};
