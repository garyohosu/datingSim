const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const audioPath = path.join(process.cwd(), 'assets', 'js', 'audio.js');

test('init avoids double initialization', async () => {
  const audio = require(audioPath);
  let initCount = 0;
  audio._setAudioContextFactory(() => {
    initCount += 1;
    return { id: initCount };
  });

  const a = audio.init();
  const b = audio.init();

  assert.equal(initCount, 1);
  assert.deepEqual(a, b);
});

test('playBGM switches current BGM', async () => {
  const audio = require(audioPath);
  audio.reset();

  audio.playBGM('title_theme');
  assert.equal(audio.getState().currentBGMId, 'title_theme');

  audio.playBGM('daily_theme');
  assert.equal(audio.getState().currentBGMId, 'daily_theme');
});

test('playSE records se playback without changing current BGM', async () => {
  const audio = require(audioPath);
  audio.reset();
  audio.playBGM('daily_theme');
  audio.playSE('decide');

  const state = audio.getState();
  assert.equal(state.currentBGMId, 'daily_theme');
  assert.equal(state.playLog.at(-1).id, 'decide');
  assert.equal(state.playLog.at(-1).type, 'se');
});

test('setBGMVolume, setSEVolume, and setMute update audio state', async () => {
  const audio = require(audioPath);
  audio.reset();

  audio.setBGMVolume(0.3);
  audio.setSEVolume(0.4);
  audio.setMute(true);

  const state = audio.getState();
  assert.equal(state.bgmVolume, 0.3);
  assert.equal(state.seVolume, 0.4);
  assert.equal(state.isMuted, true);
});

test('applySettings applies stored settings in one call', async () => {
  const audio = require(audioPath);
  audio.reset();

  audio.applySettings({ bgmVolume: 0.5, seVolume: 0.6, muted: true });

  const state = audio.getState();
  assert.equal(state.bgmVolume, 0.5);
  assert.equal(state.seVolume, 0.6);
  assert.equal(state.isMuted, true);
});
