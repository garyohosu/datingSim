const moduleCache = new Map();

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

  function updateViewMeta(view) {
    const previousEpisodeId = currentView?.episode?.id || null;
    const nextEpisodeId = view?.episode?.id || null;
    if (view && view.screen === 'game' && previousEpisodeId !== nextEpisodeId) {
      currentTextIndex = 0;
    }
    currentView = view;
  }

  function render(view) {
    updateViewMeta(view);

    if (!view) {
      root.innerHTML = '<section class="panel"><p>表示できる画面がありません。</p></section>';
      return;
    }

    switch (view.screen) {
      case 'title':
        root.innerHTML = `
          <section class="hero">
            <div class="hero-copy">
              <p class="eyebrow">After School Signals</p>
              <h1>放課後シグナル</h1>
              <p class="lede">最小実装の縦切り。TDDで固めたモジュールをそのままつないだ確認用UIです。</p>
            </div>
            <div class="hero-actions">
              <button data-action="start">最初から</button>
              <button data-action="continue" class="${view.emphasizeContinue ? 'primary' : ''}">続きから</button>
              <button data-action="gallery">ギャラリー</button>
              <button data-action="diary">日記</button>
              <button data-action="updates">更新履歴</button>
              <button data-action="settings">設定</button>
            </div>
          </section>
        `;
        return;

      case 'game': {
        const episode = view.episode || {};
        const textBlocks = episode.text || [];
        const currentText = textBlocks[currentTextIndex] || '';
        const atLastText = currentTextIndex >= textBlocks.length - 1;
        const choices = atLastText ? (episode.choices || []) : [];
        const nextButton = atLastText && choices.length === 0 && episode.nextEpisodeId
          ? `<button data-action="next-episode" data-next-episode-id="${escapeHtml(episode.nextEpisodeId)}">次へ</button>`
          : '';
        const endButton = atLastText && choices.length === 0 && !episode.nextEpisodeId
          ? `<button data-action="back-title">タイトルへ戻る</button>`
          : '';
        const choiceButtons = choices.map((choice) => `
          <button
            data-action="choice"
            data-choice-id="${escapeHtml(choice.id)}"
          >${escapeHtml(choice.label)}</button>
        `).join('');

        root.innerHTML = `
          <section class="panel game-shell">
            <div class="game-meta">
              <span>Day ${escapeHtml(episode.day ?? '-')}</span>
              <span>${escapeHtml(episode.location ?? '')}</span>
              ${view.viewOnly ? '<span class="badge">閲覧モード</span>' : ''}
            </div>
            <h2>${escapeHtml(episode.title ?? '')}</h2>
            <p class="scene">${escapeHtml(currentText)}</p>
            <div class="actions">
              ${!atLastText ? '<button data-action="advance-text">続きを読む</button>' : ''}
              ${choiceButtons}
              ${nextButton}
              ${endButton}
              ${view.viewOnly ? '<button data-action="close-view-only">更新履歴へ戻る</button>' : '<button data-action="back-title">タイトルへ戻る</button>'}
            </div>
          </section>
        `;
        return;
      }

      case 'gallery':
        root.innerHTML = `
          <section class="panel">
            <h2>ギャラリー</h2>
            <div class="list">
              ${view.items.map((item) => `
                <article class="list-item ${item.unlocked ? '' : 'locked'}">
                  <strong>${escapeHtml(item.unlocked ? item.title : '未取得')}</strong>
                  <span>${escapeHtml(item.unlocked ? item.cgId : 'silhouette')}</span>
                </article>
              `).join('')}
            </div>
            <div class="actions"><button data-action="back-title">タイトルへ戻る</button></div>
          </section>
        `;
        return;

      case 'diary':
        root.innerHTML = `
          <section class="panel">
            <h2>日記</h2>
            <div class="list">
              ${view.items.map((item) => `
                <article class="list-item ${item.unlocked ? '' : 'locked'}">
                  <strong>${escapeHtml(item.unlocked ? item.title : '未解放')}</strong>
                  ${item.unlocked
                    ? `<button data-action="open-diary" data-diary-id="${escapeHtml(item.diaryId)}">開く</button>`
                    : '<span>本編読了で解放</span>'}
                </article>
              `).join('')}
            </div>
            <div class="actions"><button data-action="back-title">タイトルへ戻る</button></div>
          </section>
        `;
        return;

      case 'diary-detail':
        root.innerHTML = `
          <section class="panel">
            <h2>${escapeHtml(view.diary?.title ?? '')}</h2>
            <p class="scene">${escapeHtml(view.diary?.text ?? '')}</p>
            <div class="actions">
              <button data-action="diary">日記一覧へ戻る</button>
            </div>
          </section>
        `;
        return;

      case 'updates':
        root.innerHTML = `
          <section class="panel">
            <h2>更新履歴</h2>
            <div class="list">
              ${view.items.map((item) => `
                <article class="list-item">
                  <strong>${escapeHtml(item.title)}</strong>
                  <span>${escapeHtml(item.description)}</span>
                  ${item.link ? `<button data-action="open-update-link" data-episode-id="${escapeHtml(item.link)}">閲覧する</button>` : ''}
                </article>
              `).join('')}
            </div>
            <div class="actions"><button data-action="back-title">タイトルへ戻る</button></div>
          </section>
        `;
        return;

      case 'settings':
        root.innerHTML = `
          <section class="panel">
            <h2>設定</h2>
            <label> BGM
              <input id="bgm-volume" type="range" min="0" max="1" step="0.1" value="${view.settings?.bgmVolume ?? 0.7}">
            </label>
            <label> SE
              <input id="se-volume" type="range" min="0" max="1" step="0.1" value="${view.settings?.seVolume ?? 0.8}">
            </label>
            <label class="check">
              <input id="muted" type="checkbox" ${view.settings?.muted ? 'checked' : ''}>
              ミュート
            </label>
            <div class="actions">
              <button data-action="save-settings">保存</button>
              <button data-action="back-title">タイトルへ戻る</button>
            </div>
          </section>
        `;
        return;

      case 'saveload':
        root.innerHTML = `
          <section class="panel">
            <h2>ロード</h2>
            <p>現状は最小実装です。続きからはオートセーブ専用です。</p>
            <div class="actions"><button data-action="back-title">タイトルへ戻る</button></div>
          </section>
        `;
        return;

      case 'error':
        root.innerHTML = `
          <section class="panel error">
            <h2>エラー</h2>
            <p>${escapeHtml(view.message)}</p>
            <div class="actions"><button data-action="back-title">タイトルへ戻る</button></div>
          </section>
        `;
        return;

      default:
        root.innerHTML = '<section class="panel"><p>未対応の画面です。</p></section>';
    }
  }

  async function showTitle() {
    const view = await router.navigateTo('title');
    render(view);
  }

  async function startNewGame() {
    state.initState();
    state.setCurrentEpisodeId('day-001');
    const episode = await dataLoader.loadEpisode('day-001');
    const snapshot = state.getState();
    storage.saveAuto(snapshot);
    const view = await router.navigateTo('game', { episode, state: snapshot });
    render(view);
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
      render(view);
    } catch (error) {
      setStatus('オートセーブの読込に失敗しました。ロード画面へ誘導します。');
      const view = renderer.showError('AUTO_SAVE_LOAD_FAILED');
      render(view);
    }
  }

  async function openUpdateLink(episodeId) {
    router.setViewOnlyMode(true);
    const view = await router.navigateTo('game', { episodeId });
    render(view);
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

        case 'gallery':
          return render(await router.navigateTo('gallery'));

        case 'diary':
          return render(await router.navigateTo('diary'));

        case 'updates':
          router.setViewOnlyMode(false);
          return render(await router.navigateTo('updates'));

        case 'settings':
          return render(await router.navigateTo('settings'));

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

        case 'back-title':
          router.setViewOnlyMode(false);
          return showTitle();

        case 'advance-text': {
          renderer.advanceText();
          currentTextIndex += 1;
          return render(currentView);
        }

        case 'choice': {
          const choice = (currentView?.episode?.choices || []).find((entry) => entry.id === button.dataset.choiceId);
          if (!choice) return;
          const result = renderer.handleChoice(choice, { episodeId: currentView.episode.id });
          const episode = await dataLoader.loadEpisode(result.nextEpisodeId);
          const view = await router.navigateTo('game', { episode, state: result.state });
          return render(view);
        }

        case 'next-episode': {
          const result = await renderer.completeBranchRead(button.dataset.nextEpisodeId);
          if (result.ignored) {
            return;
          }
          if (!result.nextEpisode) {
            return showTitle();
          }
          const view = await router.navigateTo('game', {
            episode: result.nextEpisode,
            state: result.state,
          });
          return render(view);
        }

        case 'open-diary':
          return render(await router.navigateTo('diary', { diaryId: button.dataset.diaryId }));

        case 'open-update-link':
          return openUpdateLink(button.dataset.episodeId);

        case 'close-view-only':
          router.setViewOnlyMode(false);
          return render(await router.navigateTo('updates'));

        default:
          break;
      }
    } catch (error) {
      console.error(error);
      render(renderer.showError(error.message || 'UNEXPECTED_ERROR'));
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
      root.innerHTML = `<section class="panel error"><h2>起動失敗</h2><p>${error.message}</p></section>`;
    }
  });
});
