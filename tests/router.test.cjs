const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const routerPath = path.join(process.cwd(), 'assets', 'js', 'router.js');

function createRendererSpy() {
  const calls = [];
  return {
    calls,
    renderTitle() { calls.push(['renderTitle']); },
    renderGame(episode, state) { calls.push(['renderGame', episode, state]); },
    renderGameViewOnly(episode) { calls.push(['renderGameViewOnly', episode]); },
    renderGallery() { calls.push(['renderGallery']); },
    renderDiaryList() { calls.push(['renderDiaryList']); },
    renderDiary(diaryId) { calls.push(['renderDiary', diaryId]); },
    renderUpdates() { calls.push(['renderUpdates']); },
    renderSaveLoad(mode) { calls.push(['renderSaveLoad', mode]); },
    renderSettings() { calls.push(['renderSettings']); },
  };
}

test('start navigates to the title screen', async () => {
  const router = require(routerPath);
  const renderer = createRendererSpy();
  router._setDependencies({ renderer });
  router.setViewOnlyMode(false);

  await router.start();

  assert.equal(router.getCurrentScreen(), 'title');
  assert.deepEqual(renderer.calls[0], ['renderTitle']);
});

test('navigateTo routes standard screens to renderer', async () => {
  const router = require(routerPath);
  const renderer = createRendererSpy();
  router._setDependencies({ renderer });

  await router.navigateTo('gallery');
  await router.navigateTo('updates');
  await router.navigateTo('settings');
  await router.navigateTo('saveload', { mode: 'load' });

  assert.deepEqual(renderer.calls, [
    ['renderGallery'],
    ['renderUpdates'],
    ['renderSettings'],
    ['renderSaveLoad', 'load'],
  ]);
});

test('setViewOnlyMode and isViewOnly keep preview-mode state', async () => {
  const router = require(routerPath);
  const renderer = createRendererSpy();
  router._setDependencies({ renderer });

  router.setViewOnlyMode(true);
  assert.equal(router.isViewOnly(), true);

  router.setViewOnlyMode(false);
  assert.equal(router.isViewOnly(), false);
});

test('navigateTo(game) uses renderGame in normal mode', async () => {
  const router = require(routerPath);
  const renderer = createRendererSpy();
  const stateStore = { getState: () => ({ currentDay: 3 }) };
  const dataLoader = { loadEpisode: async (episodeId) => ({ id: episodeId }) };
  router._setDependencies({ renderer, dataLoader, stateStore });
  router.setViewOnlyMode(false);

  await router.navigateTo('game', { episodeId: 'day-003' });

  assert.deepEqual(renderer.calls[0], ['renderGame', { id: 'day-003' }, { currentDay: 3 }]);
});

test('navigateTo(game) uses renderGameViewOnly in preview mode', async () => {
  const router = require(routerPath);
  const renderer = createRendererSpy();
  const dataLoader = { loadEpisode: async (episodeId) => ({ id: episodeId }) };
  router._setDependencies({ renderer, dataLoader });
  router.setViewOnlyMode(true);

  await router.navigateTo('game', { episodeId: 'day-005' });

  assert.deepEqual(renderer.calls[0], ['renderGameViewOnly', { id: 'day-005' }]);
});

test('navigateTo(diary) routes to detail or list depending on options', async () => {
  const router = require(routerPath);
  const renderer = createRendererSpy();
  router._setDependencies({ renderer });

  await router.navigateTo('diary');
  await router.navigateTo('diary', { diaryId: 'diary-minori-001' });

  assert.deepEqual(renderer.calls, [
    ['renderDiaryList'],
    ['renderDiary', 'diary-minori-001'],
  ]);
});

test('navigateTo throws on unknown screen', async () => {
  const router = require(routerPath);
  const renderer = createRendererSpy();
  router._setDependencies({ renderer });

  await assert.rejects(
    () => router.navigateTo('unknown'),
    (err) => err.message === 'UNKNOWN_SCREEN:unknown'
  );
});
