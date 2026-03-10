// assets/js/audio.js
// Lightweight audio state manager for MVP tests and browser integration.

const DEFAULT_SETTINGS = {
  bgmVolume: 0.7,
  seVolume: 0.8,
  muted: false,
};

let _audioContextFactory = () => ({ state: 'running' });
let _audioContext = null;
let _isInitialized = false;
let _isMuted = DEFAULT_SETTINGS.muted;
let _bgmVolume = DEFAULT_SETTINGS.bgmVolume;
let _seVolume = DEFAULT_SETTINGS.seVolume;
let _currentBGMId = null;
let _bgmFallbackId = 'daily_theme';
let _playLog = [];

function _setAudioContextFactory(factory) {
  _audioContextFactory = factory;
  reset();
}

function init() {
  if (_isInitialized) {
    return _audioContext;
  }

  _audioContext = _audioContextFactory();
  _isInitialized = true;
  return _audioContext;
}

function playBGM(bgmId) {
  const resolved = bgmId || _bgmFallbackId;
  _currentBGMId = resolved;
  _playLog.push({ type: 'bgm', id: resolved, muted: _isMuted, volume: _bgmVolume });
  return resolved;
}

function stopBGM() {
  _currentBGMId = null;
}

function playSE(seId) {
  _playLog.push({ type: 'se', id: seId, muted: _isMuted, volume: _seVolume });
  return seId;
}

function setBGMVolume(vol) {
  _bgmVolume = Number(vol);
}

function setSEVolume(vol) {
  _seVolume = Number(vol);
}

function setMute(muted) {
  _isMuted = Boolean(muted);
}

function applySettings(settings = {}) {
  if (typeof settings.bgmVolume === 'number') {
    _bgmVolume = settings.bgmVolume;
  }
  if (typeof settings.seVolume === 'number') {
    _seVolume = settings.seVolume;
  }
  if (typeof settings.muted === 'boolean') {
    _isMuted = settings.muted;
  }
}

function getState() {
  return {
    isInitialized: _isInitialized,
    isMuted: _isMuted,
    bgmVolume: _bgmVolume,
    seVolume: _seVolume,
    currentBGMId: _currentBGMId,
    bgmFallbackId: _bgmFallbackId,
    playLog: [..._playLog],
  };
}

function reset() {
  _audioContext = null;
  _isInitialized = false;
  _isMuted = DEFAULT_SETTINGS.muted;
  _bgmVolume = DEFAULT_SETTINGS.bgmVolume;
  _seVolume = DEFAULT_SETTINGS.seVolume;
  _currentBGMId = null;
  _playLog = [];
}

module.exports = {
  init,
  playBGM,
  stopBGM,
  playSE,
  setBGMVolume,
  setSEVolume,
  setMute,
  applySettings,
  getState,
  reset,
  _setAudioContextFactory,
};
