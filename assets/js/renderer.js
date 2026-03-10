// assets/js/renderer.js
// Renderer orchestrates drawing-oriented behavior and delegates logic to other modules.

let _state = null;
let _storage = null;
let _dataLoader = null;
let _audio = null;
let _router = null;

let _currentEpisode = null;
let _currentTextIndex = 0;
let _lastError = null;

function _setDependencies({ state, storage, dataLoader, audio, router } = {}) {
  _state = state || null;
  _storage = storage || null;
  _dataLoader = dataLoader || null;
  _audio = audio || null;
  _router = router || null;
}

function _getCurrentState() {
  return _state && typeof _state.getState === 'function' ? _state.getState() : null;
}

function renderTitle() {
  const hasSave = _storage && typeof _storage.hasAnySave === 'function'
    ? _storage.hasAnySave()
    : false;

  return {
    screen: 'title',
    emphasizeContinue: hasSave,
  };
}

function renderGame(episode, state) {
  _currentEpisode = episode || null;
  _currentTextIndex = 0;

  if (_state && episode && Array.isArray(episode.unlockGallery)) {
    for (const cgId of episode.unlockGallery) {
      if (!_state.isGalleryUnlocked || !_state.isGalleryUnlocked(cgId)) {
        _state.unlockGalleryItem(cgId);
      }
    }
  }

  const snapshot = _getCurrentState();
  if (_storage && snapshot && episode && Array.isArray(episode.unlockGallery) && episode.unlockGallery.length > 0) {
    _storage.saveAuto(snapshot);
  }

  if (_audio && episode && episode.bgm) {
    _audio.playBGM(episode.bgm);
  }

  return {
    screen: 'game',
    episode,
    state: snapshot || state,
    currentText: episode?.text?.[0] ?? null,
    viewOnly: false,
  };
}

function renderGameViewOnly(episode) {
  _currentEpisode = episode || null;
  _currentTextIndex = 0;

  if (_audio && episode && episode.bgm) {
    _audio.playBGM(episode.bgm);
  }

  return {
    screen: 'game',
    episode,
    currentText: episode?.text?.[0] ?? null,
    viewOnly: true,
    badge: '閲覧モード',
  };
}

async function renderGallery() {
  const unlocked = _state && typeof _state.getGalleryUnlocked === 'function'
    ? _state.getGalleryUnlocked()
    : [];
  const definitions = _dataLoader ? await _dataLoader.loadManifest('gallery.json') : [];

  return {
    screen: 'gallery',
    items: definitions.map((entry) => ({
      ...entry,
      unlocked: unlocked.includes(entry.cgId),
    })),
  };
}

async function renderDiaryList() {
  const seenEpisodes = _state && typeof _state.getSeenEpisodes === 'function'
    ? _state.getSeenEpisodes()
    : [];
  const definitions = _dataLoader ? await _dataLoader.loadDiaryManifest() : [];

  return {
    screen: 'diary',
    items: definitions.map((entry) => ({
      ...entry,
      unlocked: seenEpisodes.includes(entry.episodeId),
    })),
  };
}

async function renderDiary(diaryId) {
  const diary = _dataLoader ? await _dataLoader.loadDiary(diaryId) : null;
  return {
    screen: 'diary-detail',
    diary,
  };
}

async function renderUpdates() {
  const items = _dataLoader ? await _dataLoader.loadUpdateManifest() : [];
  return {
    screen: 'updates',
    items,
  };
}

function renderSaveLoad(mode = 'load') {
  return {
    screen: 'saveload',
    mode,
  };
}

function renderSettings() {
  const settings = _storage && typeof _storage.loadSettings === 'function'
    ? _storage.loadSettings()
    : null;
  return {
    screen: 'settings',
    settings,
  };
}

function handleChoice(choice, { episodeId } = {}) {
  if (_router && typeof _router.isViewOnly === 'function' && _router.isViewOnly()) {
    return {
      ignored: true,
      reason: 'view-only',
    };
  }

  if (_audio) {
    _audio.playSE('decide');
  }
  if (_state) {
    _state.applyEffects(choice.effects || {});
    _state.recordChoice(episodeId, choice.id);
    _state.addSeenEpisode(episodeId);
    if (choice.nextEpisodeId) {
      _state.setCurrentEpisodeId(choice.nextEpisodeId);
    }
  }

  const state = _getCurrentState();
  const affectionChanged = choice.effects
    && choice.effects.affection
    && Object.keys(choice.effects.affection).length > 0;

  if (affectionChanged && _audio) {
    _audio.playSE('affection_up');
  }

  return {
    nextEpisodeId: choice.nextEpisodeId || null,
    state,
  };
}

function advanceText() {
  const blocks = _currentEpisode?.text || [];
  if (_currentTextIndex < blocks.length - 1) {
    _currentTextIndex += 1;
  }
  return {
    currentTextIndex: _currentTextIndex,
    currentText: blocks[_currentTextIndex] ?? null,
  };
}

async function completeBranchRead(nextEpisodeId) {
  if (_router && typeof _router.isViewOnly === 'function' && _router.isViewOnly()) {
    return {
      ignored: true,
      reason: 'view-only',
    };
  }

  if (_state) {
    _state.advanceDay();
    _state.setCurrentEpisodeId(nextEpisodeId);
  }
  if (_audio) {
    _audio.playSE('day_change');
  }

  const snapshot = _getCurrentState();
  if (_storage && snapshot) {
    _storage.saveAuto(snapshot);
  }

  const nextEpisode = _dataLoader ? await _dataLoader.loadEpisode(nextEpisodeId) : null;
  return {
    nextEpisode,
    state: snapshot,
  };
}

function showError(message) {
  _lastError = message;
  return {
    screen: 'error',
    message,
  };
}

function getLastError() {
  return _lastError;
}

module.exports = {
  renderTitle,
  renderGame,
  renderGameViewOnly,
  renderGallery,
  renderDiaryList,
  renderDiary,
  renderUpdates,
  renderSaveLoad,
  renderSettings,
  handleChoice,
  advanceText,
  completeBranchRead,
  showError,
  getLastError,
  _setDependencies,
};
