const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const rendererPath = path.join(process.cwd(), 'assets', 'js', 'renderer.js');

function createDeps() {
  const calls = [];
  const stateValue = {
    currentDay: 2,
    currentEpisodeId: 'day-002a',
    seenEpisodes: ['day-001'],
    galleryUnlocked: ['cg-day001'],
  };

  return {
    calls,
    state: {
      getState: () => ({ ...stateValue }),
      applyEffects: (effects) => calls.push(['applyEffects', effects]),
      recordChoice: (episodeId, choiceId) => calls.push(['recordChoice', episodeId, choiceId]),
      addSeenEpisode: (episodeId) => calls.push(['addSeenEpisode', episodeId]),
      setCurrentEpisodeId: (id) => calls.push(['setCurrentEpisodeId', id]),
      advanceDay: () => calls.push(['advanceDay']),
      isGalleryUnlocked: (cgId) => cgId === 'cg-day001',
      unlockGalleryItem: (cgId) => calls.push(['unlockGalleryItem', cgId]),
      getGalleryUnlocked: () => ['cg-day001'],
      getSeenEpisodes: () => ['day-001'],
    },
    storage: {
      hasAnySave: () => true,
      loadSettings: () => ({ bgmVolume: 0.7, seVolume: 0.8, muted: false }),
      saveAuto: (state) => calls.push(['saveAuto', state]),
    },
    dataLoader: {
      loadManifest: async (filename) => {
        calls.push(['loadManifest', filename]);
        return [
          { cgId: 'cg-day001', title: 'A' },
          { cgId: 'cg-day002', title: 'B' },
        ];
      },
      loadDiaryManifest: async () => {
        calls.push(['loadDiaryManifest']);
        return [
          { diaryId: 'diary-minori-001', episodeId: 'day-001', title: 'open' },
          { diaryId: 'diary-minori-002', episodeId: 'day-004', title: 'locked' },
        ];
      },
      loadDiary: async (diaryId) => {
        calls.push(['loadDiary', diaryId]);
        return { diaryId, text: 'body' };
      },
      loadUpdateManifest: async () => {
        calls.push(['loadUpdateManifest']);
        return [{ title: 'update' }];
      },
      loadEpisode: async (episodeId) => {
        calls.push(['loadEpisode', episodeId]);
        return { id: episodeId, text: ['next'], bgm: 'daily_theme' };
      },
    },
    audio: {
      playBGM: (id) => calls.push(['playBGM', id]),
      playSE: (id) => calls.push(['playSE', id]),
    },
    router: {
      isViewOnly: () => false,
    },
  };
}

test('renderTitle toggles continue emphasis based on save presence', async () => {
  const renderer = require(rendererPath);
  const deps = createDeps();
  renderer._setDependencies(deps);

  const view = renderer.renderTitle();

  assert.equal(view.screen, 'title');
  assert.equal(view.emphasizeContinue, true);
});

test('renderGame unlocks gallery entries in normal mode and saves progress', async () => {
  const renderer = require(rendererPath);
  const deps = createDeps();
  deps.state.isGalleryUnlocked = () => false;
  renderer._setDependencies(deps);

  const view = renderer.renderGame(
    { id: 'day-001', bgm: 'daily_theme', text: ['a'], unlockGallery: ['cg-day001'] },
    { currentDay: 1 }
  );

  assert.equal(view.screen, 'game');
  assert.deepEqual(deps.calls, [
    ['unlockGalleryItem', 'cg-day001'],
    ['saveAuto', {
      currentDay: 2,
      currentEpisodeId: 'day-002a',
      seenEpisodes: ['day-001'],
      galleryUnlocked: ['cg-day001'],
    }],
    ['playBGM', 'daily_theme'],
  ]);
});

test('handleChoice delegates to state in order', async () => {
  const renderer = require(rendererPath);
  const deps = createDeps();
  renderer._setDependencies(deps);

  const result = renderer.handleChoice(
    {
      id: 'c1',
      nextEpisodeId: 'day-002b',
      effects: { affection: { minori: 3 }, flags: { met_minori: true } },
    },
    { episodeId: 'day-002a' }
  );

  assert.equal(result.nextEpisodeId, 'day-002b');
  assert.deepEqual(deps.calls.slice(0, 5), [
    ['playSE', 'decide'],
    ['applyEffects', { affection: { minori: 3 }, flags: { met_minori: true } }],
    ['recordChoice', 'day-002a', 'c1'],
    ['addSeenEpisode', 'day-002a'],
    ['setCurrentEpisodeId', 'day-002b'],
  ]);
});

test('completeBranchRead advances day, saves, and loads the next episode', async () => {
  const renderer = require(rendererPath);
  const deps = createDeps();
  renderer._setDependencies(deps);

  const result = await renderer.completeBranchRead('day-003');

  assert.equal(result.nextEpisode.id, 'day-003');
  assert.deepEqual(deps.calls, [
    ['advanceDay'],
    ['setCurrentEpisodeId', 'day-003'],
    ['playSE', 'day_change'],
    ['saveAuto', {
      currentDay: 2,
      currentEpisodeId: 'day-002a',
      seenEpisodes: ['day-001'],
      galleryUnlocked: ['cg-day001'],
    }],
    ['loadEpisode', 'day-003'],
  ]);
});

test('renderGallery merges unlocked ids with gallery definitions', async () => {
  const renderer = require(rendererPath);
  const deps = createDeps();
  renderer._setDependencies(deps);

  const view = await renderer.renderGallery();

  assert.equal(view.items[0].unlocked, true);
  assert.equal(view.items[1].unlocked, false);
});

test('renderDiaryList locks entries by seen episode state', async () => {
  const renderer = require(rendererPath);
  const deps = createDeps();
  renderer._setDependencies(deps);

  const view = await renderer.renderDiaryList();

  assert.equal(view.items[0].unlocked, true);
  assert.equal(view.items[1].unlocked, false);
});

test('renderUpdates returns update manifest items', async () => {
  const renderer = require(rendererPath);
  const deps = createDeps();
  renderer._setDependencies(deps);

  const view = await renderer.renderUpdates();

  assert.equal(view.screen, 'updates');
  assert.equal(view.items.length, 1);
});

test('showError records and returns the current error', async () => {
  const renderer = require(rendererPath);
  const deps = createDeps();
  renderer._setDependencies(deps);

  const view = renderer.showError('EPISODE_LOAD_FAILED');

  assert.equal(view.message, 'EPISODE_LOAD_FAILED');
  assert.equal(renderer.getLastError(), 'EPISODE_LOAD_FAILED');
});

test('view-only mode disables choice handling and branch completion', async () => {
  const renderer = require(rendererPath);
  const deps = createDeps();
  deps.router.isViewOnly = () => true;
  renderer._setDependencies(deps);

  const choiceResult = renderer.handleChoice({ id: 'c1', effects: {} }, { episodeId: 'day-001' });
  const branchResult = await renderer.completeBranchRead('day-002');

  assert.deepEqual(choiceResult, { ignored: true, reason: 'view-only' });
  assert.deepEqual(branchResult, { ignored: true, reason: 'view-only' });
  assert.deepEqual(deps.calls, []);
});
