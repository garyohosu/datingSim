const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const loaderPath = path.join(process.cwd(), 'assets', 'js', 'dataLoader.js');

function skipIfMissing(t, filePath) {
  if (!fs.existsSync(filePath)) {
    t.skip(`Module not implemented yet: ${filePath}`);
    return true;
  }
  return false;
}

// ─── モック fetch ──────────────────────────────────────────────

/**
 * responses: { [url]: data | null }
 *   data  → 200 OK + json()
 *   null  → 404
 * callLog: 実際に呼ばれた URL を記録する
 */
function createMockFetch(responses = {}) {
  const callLog = [];
  const mockFetch = async (url) => {
    callLog.push(url);
    if (Object.prototype.hasOwnProperty.call(responses, url) && responses[url] !== null) {
      const data = responses[url];
      return { ok: true, status: 200, json: async () => data };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  mockFetch.callLog = callLog;
  return mockFetch;
}

// 各テストで fresh なローダーを返すヘルパー
function freshLoader(responses = {}) {
  const loader = require(loaderPath);
  const mockFetch = createMockFetch(responses);
  loader._setFetchBackend(mockFetch);
  return { loader, mockFetch };
}

// ─── テストフィクスチャ ──────────────────────────────────────

const EPISODE_DATA = {
  id: 'day-001',
  day: 1,
  title: '春の朝',
  season: 'spring',
  weather: 'sunny',
  location: 'school_gate',
  characters: ['minori'],
  bgm: 'daily_theme',
  background: 'assets/images/backgrounds/bg_school_gate_morning.webp',
  sceneImage: 'assets/images/events/day-001.webp',
  text: ['朝、校門の前でみのりに呼び止められた。'],
  choices: [
    { id: 'c1', label: '笑ってうなずく', nextEpisodeId: 'day-001a',
      effects: { affection: { minori: 3 } } },
  ],
  nextEpisodeId: 'day-002',
};

const EPISODES_MANIFEST = [
  { id: 'day-001', day: 1, title: '春の朝', characters: ['minori'],
    season: 'spring', addedAt: '2026-03-10', summary: 'みのりと出会う。' },
];

const GALLERY_MANIFEST = [
  { cgId: 'cg-day001', title: '春の出会い', heroine: 'minori',
    episodeId: 'day-001', imagePath: 'assets/images/events/day-001.webp' },
];

const DIARY_MANIFEST = [
  { diaryId: 'diary-minori-001', heroine: 'minori', episodeId: 'day-001', title: 'あの朝のこと' },
  { diaryId: 'diary-toko-001',   heroine: 'toko',   episodeId: 'day-003', title: '図書室にて' },
];

const DIARY_DATA = {
  diaryId: 'diary-minori-001',
  heroine: 'minori',
  title: 'あの朝のこと',
  text: '今日、また彼と話した。いつもみたいにちょっと照れてしまった。',
  unlockedBy: 'day-001',
};

const UPDATES_MANIFEST = [
  { date: '2026-03-10', type: 'episode', title: '第1話を追加',
    description: 'みのりとの出会いを追加。', link: 'day-001' },
];

const BGM_CONFIG = [
  { id: 'title_theme',  type: 'synth' },
  { id: 'daily_theme',  type: 'synth' },
  { id: 'evening_theme', type: 'synth' },
];

// fixtures → fetch モックの URL マッピング
const DEFAULT_RESPONSES = {
  'assets/data/episodes/day-001.json':       EPISODE_DATA,
  'assets/data/episodes/day-001a.json':      { ...EPISODE_DATA, id: 'day-001a' },
  'assets/data/manifests/episodes.json':     EPISODES_MANIFEST,
  'assets/data/manifests/gallery.json':      GALLERY_MANIFEST,
  'assets/data/manifests/diary.json':        DIARY_MANIFEST,
  'assets/data/manifests/updates.json':      UPDATES_MANIFEST,
  'assets/data/manifests/bgm.json':          BGM_CONFIG,
  'assets/data/diaries/diary-minori-001.json': DIARY_DATA,
};

// ─── ファイル存在確認 ──────────────────────────────────────────

test('dataLoader.js TDD targets are defined', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  assert.ok(fs.existsSync(loaderPath));
});

// ─── loadEpisode ───────────────────────────────────────────────

test('loadEpisode returns correct JSON for a given episodeId', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  const { loader } = freshLoader(DEFAULT_RESPONSES);

  const episode = await loader.loadEpisode('day-001');

  assert.equal(episode.id, 'day-001');
  assert.equal(episode.day, 1);
  assert.equal(episode.title, '春の朝');
  assert.deepEqual(episode.characters, ['minori']);
});

test('loadEpisode fetches correct URL path', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  const { loader, mockFetch } = freshLoader(DEFAULT_RESPONSES);

  await loader.loadEpisode('day-001');

  assert.ok(mockFetch.callLog.includes('assets/data/episodes/day-001.json'));
});

test('loadEpisode works for branch episode ids (day-001a)', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  const { loader } = freshLoader(DEFAULT_RESPONSES);

  const ep = await loader.loadEpisode('day-001a');
  assert.equal(ep.id, 'day-001a');
});

test('loadEpisode throws on 404', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  const { loader } = freshLoader({}); // 空レスポンス = 全部404

  await assert.rejects(
    () => loader.loadEpisode('day-999'),
    (err) => err.message.startsWith('FETCH_FAILED:404')
  );
});

// ─── loadManifest ──────────────────────────────────────────────

test('loadManifest returns correct JSON', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  const { loader } = freshLoader(DEFAULT_RESPONSES);

  const manifest = await loader.loadManifest('episodes.json');

  assert.equal(manifest.length, 1);
  assert.equal(manifest[0].id, 'day-001');
});

test('loadManifest fetches correct URL for episodes.json', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  const { loader, mockFetch } = freshLoader(DEFAULT_RESPONSES);

  await loader.loadManifest('episodes.json');

  assert.ok(mockFetch.callLog.includes('assets/data/manifests/episodes.json'));
});

test('loadManifest fetches correct URL for gallery.json', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  const { loader, mockFetch } = freshLoader(DEFAULT_RESPONSES);

  const gallery = await loader.loadManifest('gallery.json');

  assert.ok(mockFetch.callLog.includes('assets/data/manifests/gallery.json'));
  assert.equal(gallery[0].cgId, 'cg-day001');
});

test('loadManifest throws on missing file', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  const { loader } = freshLoader({});

  await assert.rejects(
    () => loader.loadManifest('nonexistent.json'),
    (err) => err.message.startsWith('FETCH_FAILED:404')
  );
});

// ─── loadDiaryManifest ─────────────────────────────────────────

test('loadDiaryManifest returns correct JSON', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  const { loader } = freshLoader(DEFAULT_RESPONSES);

  const manifest = await loader.loadDiaryManifest();

  assert.equal(manifest.length, 2);
  assert.equal(manifest[0].diaryId, 'diary-minori-001');
  assert.equal(manifest[0].episodeId, 'day-001');
});

test('loadDiaryManifest fetches correct URL', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  const { loader, mockFetch } = freshLoader(DEFAULT_RESPONSES);

  await loader.loadDiaryManifest();

  assert.ok(mockFetch.callLog.includes('assets/data/manifests/diary.json'));
});

// ─── loadDiary ────────────────────────────────────────────────

test('loadDiary returns correct diary data', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  const { loader } = freshLoader(DEFAULT_RESPONSES);

  const diary = await loader.loadDiary('diary-minori-001');

  assert.equal(diary.diaryId, 'diary-minori-001');
  assert.equal(diary.heroine, 'minori');
  assert.ok(diary.text.length > 0);
});

test('loadDiary fetches correct URL', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  const { loader, mockFetch } = freshLoader(DEFAULT_RESPONSES);

  await loader.loadDiary('diary-minori-001');

  assert.ok(mockFetch.callLog.includes('assets/data/diaries/diary-minori-001.json'));
});

test('loadDiary throws on 404', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  const { loader } = freshLoader({});

  await assert.rejects(
    () => loader.loadDiary('diary-nonexistent'),
    (err) => err.message.startsWith('FETCH_FAILED:404')
  );
});

// ─── loadUpdateManifest ────────────────────────────────────────

test('loadUpdateManifest returns correct JSON', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  const { loader } = freshLoader(DEFAULT_RESPONSES);

  const updates = await loader.loadUpdateManifest();

  assert.equal(updates.length, 1);
  assert.equal(updates[0].type, 'episode');
  assert.equal(updates[0].link, 'day-001');
});

test('loadUpdateManifest fetches correct URL', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  const { loader, mockFetch } = freshLoader(DEFAULT_RESPONSES);

  await loader.loadUpdateManifest();

  assert.ok(mockFetch.callLog.includes('assets/data/manifests/updates.json'));
});

// ─── isBGMDefined ─────────────────────────────────────────────

test('isBGMDefined returns true for defined BGM id', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  const { loader } = freshLoader(DEFAULT_RESPONSES);

  assert.equal(await loader.isBGMDefined('title_theme'),  true);
  assert.equal(await loader.isBGMDefined('daily_theme'),  true);
  assert.equal(await loader.isBGMDefined('evening_theme'), true);
});

test('isBGMDefined returns false for undefined BGM id', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  const { loader } = freshLoader(DEFAULT_RESPONSES);

  assert.equal(await loader.isBGMDefined('tension_theme'),    false);
  assert.equal(await loader.isBGMDefined('confession_theme'), false);
  assert.equal(await loader.isBGMDefined('nonexistent_bgm'),  false);
});

test('isBGMDefined auto-loads bgm.json on first call', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  const { loader, mockFetch } = freshLoader(DEFAULT_RESPONSES);

  // bgm.json を明示的に読まずに呼ぶ
  await loader.isBGMDefined('daily_theme');

  assert.ok(mockFetch.callLog.includes('assets/data/manifests/bgm.json'));
});

test('isBGMDefined does not re-fetch bgm.json on subsequent calls', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  const { loader, mockFetch } = freshLoader(DEFAULT_RESPONSES);

  await loader.isBGMDefined('daily_theme');
  await loader.isBGMDefined('title_theme');
  await loader.isBGMDefined('nonexistent');

  const bgmFetchCount = mockFetch.callLog.filter(
    (url) => url === 'assets/data/manifests/bgm.json'
  ).length;
  assert.equal(bgmFetchCount, 1);
});

test('loadManifest("bgm.json") also primes the isBGMDefined cache', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  const { loader, mockFetch } = freshLoader(DEFAULT_RESPONSES);

  // loadManifest 経由で bgm.json を読む
  await loader.loadManifest('bgm.json');
  // isBGMDefined は追加 fetch なしで判定できる
  assert.equal(await loader.isBGMDefined('daily_theme'), true);

  const bgmFetchCount = mockFetch.callLog.filter(
    (url) => url === 'assets/data/manifests/bgm.json'
  ).length;
  assert.equal(bgmFetchCount, 1); // 2回呼んでいない
});

// ─── キャッシュ ───────────────────────────────────────────────

test('same URL is fetched only once (cache hit on second call)', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  const { loader, mockFetch } = freshLoader(DEFAULT_RESPONSES);

  await loader.loadEpisode('day-001');
  await loader.loadEpisode('day-001');
  await loader.loadEpisode('day-001');

  const episodeFetchCount = mockFetch.callLog.filter(
    (url) => url === 'assets/data/episodes/day-001.json'
  ).length;
  assert.equal(episodeFetchCount, 1);
});

test('different episode ids result in separate fetches', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  const { loader, mockFetch } = freshLoader(DEFAULT_RESPONSES);

  await loader.loadEpisode('day-001');
  await loader.loadEpisode('day-001a');

  assert.ok(mockFetch.callLog.includes('assets/data/episodes/day-001.json'));
  assert.ok(mockFetch.callLog.includes('assets/data/episodes/day-001a.json'));
  assert.equal(mockFetch.callLog.length, 2);
});

test('cache is cleared when _setFetchBackend is called', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  const loader = require(loaderPath);

  // 1回目
  const mock1 = createMockFetch(DEFAULT_RESPONSES);
  loader._setFetchBackend(mock1);
  await loader.loadEpisode('day-001');

  // キャッシュクリアして 2回目
  const mock2 = createMockFetch(DEFAULT_RESPONSES);
  loader._setFetchBackend(mock2);
  await loader.loadEpisode('day-001');

  assert.equal(mock1.callLog.filter(u => u.includes('day-001')).length, 1);
  assert.equal(mock2.callLog.filter(u => u.includes('day-001')).length, 1);
});

test('manifest cache is independent from episode cache', async (t) => {
  if (skipIfMissing(t, loaderPath)) return;
  const { loader, mockFetch } = freshLoader(DEFAULT_RESPONSES);

  await loader.loadEpisode('day-001');
  await loader.loadManifest('episodes.json');

  assert.ok(mockFetch.callLog.includes('assets/data/episodes/day-001.json'));
  assert.ok(mockFetch.callLog.includes('assets/data/manifests/episodes.json'));
  assert.equal(mockFetch.callLog.length, 2);
});
