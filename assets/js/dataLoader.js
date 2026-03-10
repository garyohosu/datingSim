// assets/js/dataLoader.js
// 責務: JSON データの取得・URL構築・必要最小限のキャッシュ。
//       ゲームロジックは持たない。

// ─── パス定義 ────────────────────────────────────────────────
// すべてのパスをここで集中管理する。

const PATHS = {
  episode:        (id)   => `assets/data/episodes/${id}.json`,
  manifest:       (file) => `assets/data/manifests/${file}`,
  diary:          (id)   => `assets/data/diaries/${id}.json`,
  diaryManifest:  ()     => `assets/data/manifests/diary.json`,
  updateManifest: ()     => `assets/data/manifests/updates.json`,
  bgmConfig:      ()     => `assets/data/manifests/bgm.json`,
};

// ─── インフラ ─────────────────────────────────────────────────

// テスト用に fetch 実装を差し替え可能にする
let _fetchFn =
  typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function'
    ? (...args) => globalThis.fetch(...args)
    : null;

let _cache  = new Map();   // url → data
let _bgmIds = null;        // Set<string> | null  ← isBGMDefined の同期判定用

/** @internal テスト専用: fetch モックを注入し、キャッシュをクリアする */
function _setFetchBackend(mockFetch) {
  _fetchFn = mockFetch;
  _cache   = new Map();
  _bgmIds  = null;
}

/**
 * URL から JSON を取得してキャッシュに保存する内部ヘルパー。
 * 同じ URL は 2 回以上 fetch しない。
 * @throws {Error} FETCH_FAILED:<status>:<url>
 */
async function _fetchJSON(url) {
  if (_cache.has(url)) return _cache.get(url);

  if (!_fetchFn) throw new Error('fetch not available');

  const res = await _fetchFn(url);
  if (!res.ok) {
    throw new Error(`FETCH_FAILED:${res.status}:${url}`);
  }

  const data = await res.json();
  _cache.set(url, data);
  return data;
}

// ─── 公開 API ────────────────────────────────────────────────

/**
 * エピソード JSON を読む。
 * @param {string} episodeId - e.g. "day-001", "day-002a"
 * @returns {Promise<object>} EpisodeData
 */
async function loadEpisode(episodeId) {
  return _fetchJSON(PATHS.episode(episodeId));
}

/**
 * マニフェスト JSON を読む。
 * "bgm.json" を読んだ場合は isBGMDefined 用のキャッシュを自動更新する。
 * @param {string} filename - e.g. "episodes.json", "gallery.json", "bgm.json"
 * @returns {Promise<object[]>}
 */
async function loadManifest(filename) {
  const data = await _fetchJSON(PATHS.manifest(filename));
  if (filename === 'bgm.json' && Array.isArray(data)) {
    _bgmIds = new Set(data.map((t) => t.id));
  }
  return data;
}

/**
 * 日記マニフェストを読む。
 * @returns {Promise<Array<{diaryId, heroine, episodeId, title}>>}
 */
async function loadDiaryManifest() {
  return _fetchJSON(PATHS.diaryManifest());
}

/**
 * 個別の日記データを読む。
 * @param {string} diaryId - e.g. "diary-minori-001"
 * @returns {Promise<object>} DiaryData
 */
async function loadDiary(diaryId) {
  return _fetchJSON(PATHS.diary(diaryId));
}

/**
 * 更新履歴マニフェストを読む。
 * @returns {Promise<object[]>} UpdateEntry[]
 */
async function loadUpdateManifest() {
  return _fetchJSON(PATHS.updateManifest());
}

/**
 * BGM ID が実装済みかを返す。
 * 初回呼び出し時は bgm.json を自動ロードする（以降はキャッシュから判定）。
 * @param {string} bgmId
 * @returns {Promise<boolean>}
 */
async function isBGMDefined(bgmId) {
  if (_bgmIds === null) {
    const data = await _fetchJSON(PATHS.bgmConfig());
    _bgmIds = new Set(Array.isArray(data) ? data.map((t) => t.id) : []);
  }
  return _bgmIds.has(bgmId);
}

module.exports = {
  loadEpisode,
  loadManifest,
  loadDiaryManifest,
  loadDiary,
  loadUpdateManifest,
  isBGMDefined,
  _setFetchBackend,
};
