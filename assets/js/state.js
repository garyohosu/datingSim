// assets/js/state.js
// ゲーム状態管理モジュール
// 責務: 状態の保持と更新ロジックのみ。UI・I/O は持たない。

const SAVE_VERSION = 1;

const DEFAULT_PARAMS = {
  study: 10,
  sports: 10,
  charm: 10,
  care: 10,
  stress: 0,
};

const DEFAULT_AFFECTION = {
  minori: 0,
  toko: 0,
  hinata: 0,
};

const PARAM_MIN = 0;
const PARAM_MAX = 99;
const AFFECTION_MIN = 0;
const AFFECTION_MAX = 100;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createInitialState() {
  return {
    version: SAVE_VERSION,
    currentDay: 1,
    currentEpisodeId: null,
    affection: { ...DEFAULT_AFFECTION },
    params: { ...DEFAULT_PARAMS },
    flags: {},
    choiceHistory: [],
    seenEpisodes: [],
    seenEvents: [],
    galleryUnlocked: [],
    diaryUnlocked: [],
    endingsReached: [],
  };
}

let _state = createInitialState();

// ─── 公開 API ────────────────────────────────────────────────

/**
 * 状態を初期値にリセットして返す。
 * @returns {object} 初期状態のディープコピー
 */
function initState() {
  _state = createInitialState();
  return structuredClone(_state);
}

/**
 * 現在の状態のディープコピーを返す。
 * 内部参照を外部に漏らさない。
 * @returns {object}
 */
function getState() {
  return structuredClone(_state);
}

/**
 * セーブデータから状態を復元する。
 * @param {object} save - loadAuto / loadManual から得たオブジェクト
 */
function restoreState(save) {
  _state = structuredClone(save);
}

/**
 * 選択肢の効果を状態に適用する。
 * 未知のキーが存在しても安全に動作する（エラーにしない）。
 * @param {object} effects - { affection, params, flags }
 */
function applyEffects(effects = {}) {
  if (effects.affection && typeof effects.affection === 'object') {
    for (const [key, delta] of Object.entries(effects.affection)) {
      const current = typeof _state.affection[key] === 'number' ? _state.affection[key] : 0;
      _state.affection[key] = clamp(current + delta, AFFECTION_MIN, AFFECTION_MAX);
    }
  }

  if (effects.params && typeof effects.params === 'object') {
    for (const [key, delta] of Object.entries(effects.params)) {
      const current = typeof _state.params[key] === 'number' ? _state.params[key] : 0;
      _state.params[key] = clamp(current + delta, PARAM_MIN, PARAM_MAX);
    }
  }

  if (effects.flags && typeof effects.flags === 'object') {
    for (const [key, value] of Object.entries(effects.flags)) {
      _state.flags[key] = value;
    }
  }
}

/**
 * 選択履歴を記録する。
 * @param {string} episodeId
 * @param {string} choiceId
 */
function recordChoice(episodeId, choiceId) {
  _state.choiceHistory.push({ episodeId, choiceId });
}

/**
 * 既読エピソードを追加する（冪等: 重複登録しない）。
 * @param {string} episodeId
 */
function addSeenEpisode(episodeId) {
  if (!_state.seenEpisodes.includes(episodeId)) {
    _state.seenEpisodes.push(episodeId);
  }
}

/**
 * 既読イベントを追加する（冪等）。
 * @param {string} eventId
 */
function addSeenEvent(eventId) {
  if (!_state.seenEvents.includes(eventId)) {
    _state.seenEvents.push(eventId);
  }
}

/**
 * currentEpisodeId を更新する。currentDay は変化しない。
 * @param {string} id
 */
function setCurrentEpisodeId(id) {
  _state.currentEpisodeId = id;
}

/**
 * 日付を進める。
 * sameDay=true のとき（同日分岐）は currentDay を増やさない。
 * @param {{ sameDay?: boolean }} options
 */
function advanceDay({ sameDay = false } = {}) {
  if (!sameDay) {
    _state.currentDay += 1;
  }
}

/**
 * ギャラリー解放済み cgId 一覧を返す（コピー）。
 * @returns {string[]}
 */
function getGalleryUnlocked() {
  return [..._state.galleryUnlocked];
}

/**
 * ギャラリー CG を解放する（冪等）。
 * @param {string} cgId
 */
function unlockGalleryItem(cgId) {
  if (!_state.galleryUnlocked.includes(cgId)) {
    _state.galleryUnlocked.push(cgId);
  }
}

/**
 * @param {string} cgId
 * @returns {boolean}
 */
function isGalleryUnlocked(cgId) {
  return _state.galleryUnlocked.includes(cgId);
}

/**
 * 既読エピソード一覧を返す（コピー）。
 * @returns {string[]}
 */
function getSeenEpisodes() {
  return [..._state.seenEpisodes];
}

/**
 * @param {string} episodeId
 * @returns {boolean}
 */
function isSeenEpisode(episodeId) {
  return _state.seenEpisodes.includes(episodeId);
}

/**
 * 日記を解放する（冪等）。
 * @param {string} diaryId
 */
function unlockDiaryEntry(diaryId) {
  if (!_state.diaryUnlocked.includes(diaryId)) {
    _state.diaryUnlocked.push(diaryId);
  }
}

/**
 * @param {string} diaryId
 * @returns {boolean}
 */
function isDiaryUnlocked(diaryId) {
  return _state.diaryUnlocked.includes(diaryId);
}

/**
 * エンディング到達を記録する。
 * @param {string} heroine
 * @param {string} endingType
 */
function recordEndingReached(heroine, endingType) {
  _state.endingsReached.push({ heroine, endingType, reachedAt: new Date().toISOString() });
}

module.exports = {
  initState,
  getState,
  restoreState,
  applyEffects,
  recordChoice,
  addSeenEpisode,
  addSeenEvent,
  setCurrentEpisodeId,
  advanceDay,
  getGalleryUnlocked,
  unlockGalleryItem,
  isGalleryUnlocked,
  getSeenEpisodes,
  isSeenEpisode,
  unlockDiaryEntry,
  isDiaryUnlocked,
  recordEndingReached,
};
