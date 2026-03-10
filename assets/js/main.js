const moduleCache = new Map();

const CHARACTER_PORTRAITS = {
  minori: './assets/images/characters/minori/minori_base_default.webp',
  toko: './assets/images/characters/toko/toko_base_default.webp',
  hinata: './assets/images/characters/hinata/hinata_base_default.webp',
};

async function loadCommonJsModule(url) {
  if (moduleCache.has(url)) {
    return moduleCache.get(url);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`MODULE_LOAD_FAILED:${url}`);
  }

  const source = await response.text();
  const module = { exports: {} };
  const factory = new Function('module', 'exports', `${source}\nreturn module.exports;`);
  const exportsValue = factory(module, module.exports);
  moduleCache.set(url, exportsValue);
  return exportsValue;
}

async function bootstrap() {
  const moduleUrl = (relativePath) => new URL(relativePath, import.meta.url).href;
  const [
    state,
    storage,
    dataLoader,
    audio,
    router,
    renderer,
  ] = await Promise.all([
    loadCommonJsModule(moduleUrl('./state.js')),
    loadCommonJsModule(moduleUrl('./storage.js')),
    loadCommonJsModule(moduleUrl('./dataLoader.js')),
    loadCommonJsModule(moduleUrl('./audio.js')),
    loadCommonJsModule(moduleUrl('./router.js')),
    loadCommonJsModule(moduleUrl('./renderer.js')),
  ]);

  const root = document.getElementById('app');
  const status = document.getElementById('status');

  let currentView = null;
  let currentTextIndex = 0;

  function setStatus(message) {
    status.textContent = message || '';
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function formatLabel(value) {
    return String(value || '')
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function imageTag(src, alt, className = '') {
    if (!src) return '';
    return `<img class="${className}" src="${escapeHtml(src)}" alt="${escapeHtml(alt || '')}">`;
  }

  function updateViewMeta(view) {
    const previousEpisodeId = currentView?.episode?.id || null;
    const nextEpisodeId = view?.episode?.id || null;
    if (view && view.screen === 'game' && previousEpisodeId !== nextEpisodeId) {
      currentTextIndex = 0;
    }
    currentView = view;
  }

  function getPortraitPath(characters = []) {
    const firstCharacter = Array.isArray(characters) ? characters[0] : null;
    return CHARACTER_PORTRAITS[firstCharacter] || '';
  }

  function renderTitle(view) {
    return `
      <section class="title-shell">
        <section class="panel title-visual">
          <div class="title-copy">
            <p class="eyebrow">放課後のシグナル</p>
            <h1>放課後のシグナル</h1>
            <p>
              同日分岐、手動セーブ、ギャラリー解放、日記エントリ、アップデートプレビューを備えたビジュアルノベルMVP。
            </p>
          </div>
        </section>
        <section class="panel title-menu">
          <div class="section-head">
            <div>
              <p class="eyebrow">プレイ可能なMVP</p>
              <h2>タイトルメニュー</h2>
            </div>
            <p class="muted">オートセーブ再開と手動セーブスロット3つ。</p>
          </div>
          <div class="menu-grid">
            <button data-action="start" class="primary">はじめる</button>
            <button data-action="continue" class="${view.emphasizeContinue ? 'primary' : 'secondary'}">つづける</button>
            <button data-action="open-load">ロード</button>
            <button data-action="gallery">ギャラリー</button>
            <button data-action="diary">日記</button>
            <button data-action="updates">アップデート</button>
            <button data-action="settings">設定</button>
          </div>
          <p class="menu-note">
            つづけるはオートセーブを再開します。ロードはオートセーブと手動スロット3つを表示します。
            アップデートはセーブデータを変更せずに閲覧専用でエピソードを開きます。
          </p>
        </section>
      </section>
    `;
  }

  function renderGame(view) {
    const episode = view.episode || {};
    const currentState = view.state || {};
    const textBlocks = episode.text || [];
    const currentText = textBlocks[currentTextIndex] || '';
    const atLastText = currentTextIndex >= textBlocks.length - 1;
    const choices = atLastText ? (episode.choices || []) : [];
    const nextButton = atLastText && choices.length === 0 && episode.nextEpisodeId
      ? `<button data-action="next-episode" data-next-episode-id="${escapeHtml(episode.nextEpisodeId)}" class="primary">次の日へ</button>`
      : '';
    const endButton = atLastText && choices.length === 0 && !episode.nextEpisodeId
      ? '<button data-action="back-title">タイトルへ</button>'
      : '';
    const choiceButtons = choices.map((choice) => `
      <button data-action="choice" data-choice-id="${escapeHtml(choice.id)}" class="secondary">
        ${escapeHtml(choice.label)}
      </button>
    `).join('');
    const backgroundStyle = episode.background
      ? `style="background-image:url('${escapeHtml(episode.background)}')"`
      : '';
    const sceneArt = episode.sceneImage
      ? `
        <div class="scene-card">
          ${imageTag(episode.sceneImage, episode.title || 'scene image')}
          <div class="scene-caption">${escapeHtml(formatLabel(episode.location || 'story scene'))}</div>
        </div>
      `
      : '';
    const cast = Array.isArray(episode.characters) ? episode.characters.map(formatLabel).join(', ') : '';
    const portraitPath = getPortraitPath(episode.characters);
    const affection = currentState.affection || {};

    return `
      <section class="panel game-shell">
        <div class="game-stage">
          <div class="game-background" ${backgroundStyle}></div>
          <div class="game-overlay"></div>
          <header class="hud">
            <div class="hud-left">
              <span class="badge">Day ${escapeHtml(episode.day ?? '-')}</span>
              ${episode.season ? `<span class="badge">${escapeHtml(formatLabel(episode.season))}</span>` : ''}
              ${episode.location ? `<span class="badge">${escapeHtml(formatLabel(episode.location))}</span>` : ''}
              ${view.viewOnly ? '<span class="badge">閲覧専用</span>' : ''}
            </div>
            <div class="hud-right">
              ${!view.viewOnly ? '<button data-action="open-save">セーブ</button><button data-action="open-load">ロード</button>' : ''}
              <button data-action="updates">アップデート</button>
              <button data-action="settings">設定</button>
              <button data-action="back-title">タイトル</button>
            </div>
          </header>
          <section class="stage-art">
            ${portraitPath ? `<div class="portrait-card">${imageTag(portraitPath, cast || 'portrait')}</div>` : ''}
            ${sceneArt}
          </section>
          <section class="dialogue">
            <div class="dialogue-box">
              <div class="dialogue-head">
                <div>
                  <p class="eyebrow">Episode ${escapeHtml(episode.id ?? '')}</p>
                  <h2>${escapeHtml(episode.title ?? '')}</h2>
                </div>
                <div class="stat-cloud">
                  ${cast ? `<span class="badge">${escapeHtml(cast)}</span>` : ''}
                  ${episode.characters?.[0] ? `<span class="badge">好感度 ${escapeHtml(episode.characters[0])}: ${escapeHtml(affection[episode.characters[0]] ?? 0)}</span>` : ''}
                  <span class="badge">気遣い ${escapeHtml(currentState.params?.care ?? 0)}</span>
                  <span class="badge">ストレス ${escapeHtml(currentState.params?.stress ?? 0)}</span>
                </div>
              </div>
              <p class="scene">${escapeHtml(currentText)}</p>
              <div class="actions">
                ${!atLastText ? '<button data-action="advance-text" class="primary">次へ</button>' : ''}
                ${nextButton}
                ${endButton}
                ${view.viewOnly ? '<button data-action="close-view-only">閲覧専用を閉じる</button>' : ''}
              </div>
              ${choiceButtons ? `<div class="choices">${choiceButtons}</div>` : ''}
            </div>
          </section>
        </div>
      </section>
    `;
  }

  function renderGallery(view) {
    return `
      <section class="panel section-panel">
        <div class="section-head">
          <div>
            <p class="eyebrow">コレクション</p>
            <h2>ギャラリー</h2>
          </div>
          <p class="muted">${view.items.filter((item) => item.unlocked).length} / ${view.items.length} 解放済み</p>
        </div>
        <div class="card-grid">
          ${view.items.map((item) => `
            <article class="card ${item.unlocked ? '' : 'locked'}">
              <div class="thumb">
                ${item.unlocked ? imageTag(item.imagePath, item.title) : ''}
              </div>
              <div class="card-body">
                <h3>${escapeHtml(item.unlocked ? item.title : '未解放')}</h3>
                <p>${escapeHtml(item.unlocked ? item.cgId : '解放すると表示されます')}</p>
              </div>
            </article>
          `).join('')}
        </div>
        <div class="actions"><button data-action="back-title">タイトルへ</button></div>
      </section>
    `;
  }

  function renderDiary(view) {
    return `
      <section class="panel section-panel">
        <div class="section-head">
          <div>
            <p class="eyebrow">解放済みのノート</p>
            <h2>日記</h2>
          </div>
          <p class="muted">エントリはリセットしても残ります。</p>
        </div>
        <div class="list-stack">
          ${view.items.map((item) => `
            <article class="list-item ${item.unlocked ? '' : 'locked'}">
              <div class="diary-cover">
                ${imageTag('./assets/images/backgrounds/bg_school_gate_morning.webp', item.title)}
              </div>
              <div>
                <strong>${escapeHtml(item.unlocked ? item.title : '未解放')}</strong>
                <p class="muted">エピソード ${escapeHtml(item.episodeId)}</p>
              </div>
              ${item.unlocked
                ? `<button data-action="open-diary" data-diary-id="${escapeHtml(item.diaryId)}" class="primary">開く</button>`
                : '<span class="muted">未解放</span>'}
            </article>
          `).join('')}
        </div>
        <div class="actions"><button data-action="back-title">タイトルへ</button></div>
      </section>
    `;
  }

  function renderDiaryDetail(view) {
    return `
      <section class="panel section-panel">
        <div class="section-head">
          <div>
            <p class="eyebrow">日記エントリ</p>
            <h2>${escapeHtml(view.diary?.title ?? '')}</h2>
          </div>
        </div>
        <p class="scene">${escapeHtml(view.diary?.text ?? '')}</p>
        <div class="actions">
          <button data-action="diary">日記へ戻る</button>
        </div>
      </section>
    `;
  }

  function renderUpdates(view) {
    return `
      <section class="panel section-panel">
        <div class="section-head">
          <div>
            <p class="eyebrow">公開された変更</p>
            <h2>アップデート</h2>
          </div>
          <p class="muted">進行に影響せず、リンクされたエピソードをプレビューできます。</p>
        </div>
        <div class="list-stack">
          ${view.items.map((item) => `
            <article class="list-item">
              <div class="diary-cover">
                ${imageTag('./assets/images/events/event_day001_school_gate_minori.webp', item.title)}
              </div>
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <p class="muted">${escapeHtml(item.description)}</p>
              </div>
              ${item.link ? `<button data-action="open-update-link" data-episode-id="${escapeHtml(item.link)}" class="primary">エピソードをプレビュー</button>` : ''}
            </article>
          `).join('')}
        </div>
        <div class="actions"><button data-action="back-title">タイトルへ</button></div>
      </section>
    `;
  }

  function renderSettings(view) {
    return `
      <section class="panel section-panel">
        <div class="section-head">
          <div>
            <p class="eyebrow">音声とデータ</p>
            <h2>設定</h2>
          </div>
          <p class="muted">
            ギャラリー ${escapeHtml(view.collection?.galleryUnlocked?.length ?? 0)} /
            日記 ${escapeHtml(view.collection?.diaryUnlocked?.length ?? 0)}
          </p>
        </div>
        <div class="settings-grid">
          <label>BGM音量
            <input id="bgm-volume" type="range" min="0" max="1" step="0.1" value="${view.settings?.bgmVolume ?? 0.7}">
          </label>
          <label>SE音量
            <input id="se-volume" type="range" min="0" max="1" step="0.1" value="${view.settings?.seVolume ?? 0.8}">
          </label>
          <label class="check">
            <input id="muted" type="checkbox" ${view.settings?.muted ? 'checked' : ''}>
            ミュート
          </label>
        </div>
        <div class="actions">
          <button data-action="save-settings" class="primary">設定を保存</button>
          <button data-action="reset-progress">進行リセット</button>
          <button data-action="reset-all">全データ削除</button>
          <button data-action="back-title">タイトルへ</button>
        </div>
      </section>
    `;
  }

  function renderSaveLoad(view) {
    const isSaveMode = view.mode === 'save';
    return `
      <section class="panel section-panel">
        <div class="section-head">
          <div>
            <p class="eyebrow">スロット</p>
            <h2>${isSaveMode ? 'セーブ' : 'ロード'}</h2>
          </div>
          <p class="muted">${isSaveMode ? '現在の進行を手動スロットに保存します。' : 'オートセーブと手動スロット3つ。'}</p>
        </div>
        <div class="list-stack">
          ${view.slots.map((slot) => {
            const label = slot.slot === 'auto' ? 'オートセーブ' : `スロット ${slot.slot}`;
            const summary = slot.isEmpty
              ? '空'
              : `Day ${slot.currentDay ?? '-'} / ${slot.currentEpisodeId ?? '不明なエピソード'}`;
            const button = slot.slot === 'auto' && isSaveMode
              ? '<span class="muted">オートセーブは自動管理されます</span>'
              : `<button data-action="${isSaveMode ? 'save-slot' : 'load-slot'}" data-slot="${escapeHtml(slot.slot)}" class="primary">${isSaveMode ? 'ここに保存' : 'ロード'}</button>`;
            return `
              <article class="list-item ${slot.isEmpty ? 'locked' : ''}">
                <div class="diary-cover">
                  ${imageTag('./assets/images/backgrounds/bg_classroom_day.webp', label)}
                </div>
                <div>
                  <strong>${escapeHtml(label)}</strong>
                  <p class="muted">${escapeHtml(summary)}</p>
                  ${slot.savedAt ? `<p class="muted">${escapeHtml(slot.savedAt)}</p>` : ''}
                  ${slot.corrupted ? '<p class="muted">データが破損しています</p>' : ''}
                </div>
                ${button}
              </article>
            `;
          }).join('')}
        </div>
        <div class="actions"><button data-action="back-title">タイトルへ</button></div>
      </section>
    `;
  }

  function renderView(view) {
    updateViewMeta(view);
    if (!view) {
      root.innerHTML = '<section class="panel section-panel"><p>画面がありません。</p></section>';
      return;
    }

    switch (view.screen) {
      case 'title':
        root.innerHTML = renderTitle(view);
        return;
      case 'game':
        root.innerHTML = renderGame(view);
        return;
      case 'gallery':
        root.innerHTML = renderGallery(view);
        return;
      case 'diary':
        root.innerHTML = renderDiary(view);
        return;
      case 'diary-detail':
        root.innerHTML = renderDiaryDetail(view);
        return;
      case 'updates':
        root.innerHTML = renderUpdates(view);
        return;
      case 'settings':
        root.innerHTML = renderSettings(view);
        return;
      case 'saveload':
        root.innerHTML = renderSaveLoad(view);
        return;
      case 'error':
        root.innerHTML = `
          <section class="panel section-panel error">
            <h2>エラー</h2>
            <p>${escapeHtml(view.message)}</p>
            <div class="actions"><button data-action="back-title">タイトルへ</button></div>
          </section>
        `;
        return;
      default:
        root.innerHTML = '<section class="panel section-panel"><p>不明な画面です。</p></section>';
    }
  }

  async function showTitle() {
    const view = await router.navigateTo('title');
    renderView(view);
  }

  async function startNewGame() {
    state.initState();
    state.setCurrentEpisodeId('day-001');
    const episode = await dataLoader.loadEpisode('day-001');
    const snapshot = state.getState();
    storage.saveAuto(snapshot);
    const view = await router.navigateTo('game', { episode, state: snapshot });
    renderView(view);
  }

  async function continueGame() {
    try {
      const saved = storage.loadAuto();
      if (!saved) {
        setStatus('オートセーブがありません。');
        return showTitle();
      }
      state.restoreState(saved);
      const episode = await dataLoader.loadEpisode(saved.currentEpisodeId);
      const view = await router.navigateTo('game', { episode, state: state.getState() });
      renderView(view);
    } catch (error) {
      setStatus('オートセーブを読み込めませんでした。ロード画面から手動で開いてください。');
      renderView(renderer.showError('AUTO_SAVE_LOAD_FAILED'));
    }
  }

  async function loadSlot(slotValue) {
    try {
      const saved = slotValue === 'auto'
        ? storage.loadAuto()
        : storage.loadManual(Number(slotValue));
      if (!saved) {
        setStatus('そのスロットは空です。');
        return;
      }
      state.restoreState(saved);
      router.setViewOnlyMode(false);
      const episode = await dataLoader.loadEpisode(saved.currentEpisodeId);
      const view = await router.navigateTo('game', { episode, state: state.getState() });
      renderView(view);
    } catch (error) {
      setStatus('セーブデータを読み込めませんでした。');
      renderView(renderer.showError(error.message || 'LOAD_FAILED'));
    }
  }

  async function saveSlot(slotValue) {
    if (router.isViewOnly()) {
      setStatus('閲覧専用モードではセーブできません。');
      return;
    }

    if (slotValue === 'auto') {
      setStatus('オートセーブは自動管理されます。');
      return;
    }

    storage.saveManual(Number(slotValue), state.getState());
    setStatus(`スロット ${slotValue} に保存しました。`);
    renderView(await router.navigateTo('saveload', { mode: 'save' }));
  }

  async function openUpdateLink(episodeId) {
    router.setViewOnlyMode(true);
    const view = await router.navigateTo('game', { episodeId });
    renderView(view);
  }

  async function openSaveLoad(mode) {
    router.setViewOnlyMode(false);
    renderView(await router.navigateTo('saveload', { mode }));
  }

  async function resetProgressFlow() {
    if (!window.confirm('現在の進行のみ削除しますか？ギャラリー、日記、エンディングは残ります。')) {
      return;
    }
    storage.resetProgress();
    state.initState();
    setStatus('進行をリセットしました。コレクションデータは保持されています。');
    await showTitle();
  }

  async function resetAllFlow() {
    if (!window.confirm('設定、ギャラリー、日記、セーブデータを含むすべてのローカルデータを削除しますか？')) {
      return;
    }
    storage.resetAll();
    state.initState();
    setStatus('すべてのローカルデータを削除しました。');
    await showTitle();
  }

  async function onAction(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const action = button.dataset.action;

    try {
      switch (action) {
        case 'start':
          setStatus('');
          return startNewGame();
        case 'continue':
          return continueGame();
        case 'open-load':
          return openSaveLoad('load');
        case 'open-save':
          return openSaveLoad('save');
        case 'gallery':
          return renderView(await router.navigateTo('gallery'));
        case 'diary':
          return renderView(await router.navigateTo('diary'));
        case 'updates':
          router.setViewOnlyMode(false);
          return renderView(await router.navigateTo('updates'));
        case 'settings':
          return renderView(await router.navigateTo('settings'));
        case 'save-settings': {
          const settings = {
            bgmVolume: Number(document.getElementById('bgm-volume')?.value ?? 0.7),
            seVolume: Number(document.getElementById('se-volume')?.value ?? 0.8),
            muted: Boolean(document.getElementById('muted')?.checked),
          };
          storage.saveSettings(settings);
          audio.applySettings(settings);
          setStatus('設定を保存しました。');
          return;
        }
        case 'reset-progress':
          return resetProgressFlow();
        case 'reset-all':
          return resetAllFlow();
        case 'back-title':
          router.setViewOnlyMode(false);
          return showTitle();
        case 'advance-text':
          renderer.advanceText();
          currentTextIndex += 1;
          return renderView(currentView);
        case 'choice': {
          const choice = (currentView?.episode?.choices || []).find((entry) => entry.id === button.dataset.choiceId);
          if (!choice) return;
          const result = renderer.handleChoice(choice, { episodeId: currentView.episode.id });
          const episode = await dataLoader.loadEpisode(result.nextEpisodeId);
          const view = await router.navigateTo('game', { episode, state: result.state });
          return renderView(view);
        }
        case 'next-episode': {
          const result = await renderer.completeBranchRead(button.dataset.nextEpisodeId);
          if (result.ignored) return;
          if (!result.nextEpisode) return showTitle();
          const view = await router.navigateTo('game', {
            episode: result.nextEpisode,
            state: result.state,
          });
          return renderView(view);
        }
        case 'open-diary':
          return renderView(await router.navigateTo('diary', { diaryId: button.dataset.diaryId }));
        case 'open-update-link':
          return openUpdateLink(button.dataset.episodeId);
        case 'close-view-only':
          router.setViewOnlyMode(false);
          return renderView(await router.navigateTo('updates'));
        case 'save-slot':
          return saveSlot(button.dataset.slot);
        case 'load-slot':
          return loadSlot(button.dataset.slot);
        default:
          break;
      }
    } catch (error) {
      console.error(error);
      renderView(renderer.showError(error.message || 'UNEXPECTED_ERROR'));
    }
  }

  storage.init();
  audio.applySettings(storage.loadSettings());
  audio.init();

  renderer._setDependencies({ state, storage, dataLoader, audio, router });
  router._setDependencies({ renderer, dataLoader, stateStore: state });

  root.addEventListener('click', onAction);
  await showTitle();
}

window.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch((error) => {
    console.error(error);
    const root = document.getElementById('app');
    if (root) {
      root.innerHTML = `<section class="panel section-panel error"><h2>起動エラー</h2><p>${error.message}</p></section>`;
    }
  });
});
