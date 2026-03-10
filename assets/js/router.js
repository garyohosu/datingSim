// assets/js/router.js
// Screen routing and preview-mode switching for the MVP.

let _renderer = null;
let _dataLoader = null;
let _stateStore = null;

let _currentScreen = 'title';
let _viewOnlyMode = false;

function _setDependencies({ renderer, dataLoader, stateStore } = {}) {
  _renderer = renderer || null;
  _dataLoader = dataLoader || null;
  _stateStore = stateStore || null;
}

function setViewOnlyMode(flag) {
  _viewOnlyMode = Boolean(flag);
}

function isViewOnly() {
  return _viewOnlyMode;
}

function getCurrentScreen() {
  return _currentScreen;
}

async function start() {
  return navigateTo('title');
}

async function navigateTo(screen, options = {}) {
  if (!_renderer) {
    throw new Error('ROUTER_RENDERER_NOT_CONFIGURED');
  }

  _currentScreen = screen;

  switch (screen) {
    case 'title':
      return _renderer.renderTitle();

    case 'gallery':
      return _renderer.renderGallery();

    case 'diary':
      if (options.diaryId) {
        return _renderer.renderDiary(options.diaryId);
      }
      return _renderer.renderDiaryList();

    case 'updates':
      return _renderer.renderUpdates();

    case 'settings':
      return _renderer.renderSettings();

    case 'saveload':
      return _renderer.renderSaveLoad(options.mode || 'load');

    case 'game': {
      const episode = options.episode
        || (options.episodeId && _dataLoader ? await _dataLoader.loadEpisode(options.episodeId) : null);
      const state = options.state
        || (_stateStore && typeof _stateStore.getState === 'function' ? _stateStore.getState() : null);

      if (_viewOnlyMode) {
        return _renderer.renderGameViewOnly(episode);
      }
      return _renderer.renderGame(episode, state);
    }

    default:
      throw new Error(`UNKNOWN_SCREEN:${screen}`);
  }
}

module.exports = {
  start,
  navigateTo,
  setViewOnlyMode,
  isViewOnly,
  getCurrentScreen,
  _setDependencies,
};
