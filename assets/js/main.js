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

  function formatLabel(value) {
    return String(value || '')
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function imageTag(src, alt, className = '') {
    if (!src) {
      return '';
    }
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

  function render(view) {
    updateViewMeta(view);

    if (!view) {
      root.innerHTML = '<section class="panel section-panel"><p>No screen is available.</p></section>';
      return;
    }

    switch (view.screen) {
      case 'title':
        root.innerHTML = `
          <section class="title-shell">
            <section class="panel title-visual">
              <div class="title-copy">
                <p class="eyebrow">After School Signals</p>
                <h1>After School Signals</h1>
                <p>
                  A compact visual novel build with same-day branches, gallery unlocks,
                  diary entries, and update previews that do not modify your save.
                </p>
              </div>
            </section>
            <section class="panel title-menu">
              <div class="section-head">
                <div>
                  <p class="eyebrow">Playable MVP</p>
                  <h2>Title Menu</h2>
                </div>
                <p class="muted">Autosave-driven continue, branch episodes, and collection views.</p>
              </div>
              <div class="menu-grid">
                <button data-action="start" class="primary">Start</button>
                <button data-action="continue" class="${view.emphasizeContinue ? 'primary' : 'secondary'}">Continue</button>
                <button data-action="gallery">Gallery</button>
                <button data-action="diary">Diary</button>
                <button data-action="updates">Updates</button>
                <button data-action="settings">Settings</button>
              </div>
              <p class="menu-note">
                Continue resumes the autosave. Updates opens linked episodes in view-only mode.
              </p>
            </section>
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
          ? `<button data-action="next-episode" data-next-episode-id="${escapeHtml(episode.nextEpisodeId)}" class="primary">Next Day</button>`
          : '';
        const endButton = atLastText && choices.length === 0 && !episode.nextEpisodeId
          ? '<button data-action="back-title">Back To Title</button>'
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

        root.innerHTML = `
          <section class="panel game-shell">
            <div class="game-stage">
              <div class="game-background" ${backgroundStyle}></div>
              <div class="game-overlay"></div>
              <header class="hud">
                <div class="hud-left">
                  <span class="badge">Day ${escapeHtml(episode.day ?? '-')}</span>
                  ${episode.season ? `<span class="badge">${escapeHtml(formatLabel(episode.season))}</span>` : ''}
                  ${episode.location ? `<span class="badge">${escapeHtml(formatLabel(episode.location))}</span>` : ''}
                  ${view.viewOnly ? '<span class="badge">View Only</span>' : ''}
                </div>
                <div class="hud-right">
                  <button data-action="updates">Updates</button>
                  <button data-action="settings">Settings</button>
                  <button data-action="back-title">Title</button>
                </div>
              </header>
              <section class="stage-art">
                ${sceneArt}
              </section>
              <section class="dialogue">
                <div class="dialogue-box">
                  <div class="dialogue-head">
                    <div>
                      <p class="eyebrow">Episode ${escapeHtml(episode.id ?? '')}</p>
                      <h2>${escapeHtml(episode.title ?? '')}</h2>
                    </div>
                    <p class="meta-inline">${escapeHtml(cast)}</p>
                  </div>
                  <p class="scene">${escapeHtml(currentText)}</p>
                  <div class="actions">
                    ${!atLastText ? '<button data-action="advance-text" class="primary">Advance</button>' : ''}
                    ${nextButton}
                    ${endButton}
                    ${view.viewOnly ? '<button data-action="close-view-only">Close View Only</button>' : ''}
                  </div>
                  ${choiceButtons ? `<div class="choices">${choiceButtons}</div>` : ''}
                </div>
              </section>
            </div>
          </section>
        `;
        return;
      }

      case 'gallery':
        root.innerHTML = `
          <section class="panel section-panel">
            <div class="section-head">
              <div>
                <p class="eyebrow">Collection</p>
                <h2>Gallery</h2>
              </div>
              <p class="muted">${view.items.filter((item) => item.unlocked).length} / ${view.items.length} unlocked</p>
            </div>
            <div class="card-grid">
              ${view.items.map((item) => `
                <article class="card ${item.unlocked ? '' : 'locked'}">
                  <div class="thumb">
                    ${item.unlocked ? imageTag(item.imagePath, item.title) : ''}
                  </div>
                  <div class="card-body">
                    <h3>${escapeHtml(item.unlocked ? item.title : 'Locked')}</h3>
                    <p>${escapeHtml(item.unlocked ? item.cgId : 'Silhouette until unlocked')}</p>
                  </div>
                </article>
              `).join('')}
            </div>
            <div class="actions"><button data-action="back-title">Back To Title</button></div>
          </section>
        `;
        return;

      case 'diary':
        root.innerHTML = `
          <section class="panel section-panel">
            <div class="section-head">
              <div>
                <p class="eyebrow">Unlocked Notes</p>
                <h2>Diary</h2>
              </div>
              <p class="muted">Entries open when their source episode has been seen.</p>
            </div>
            <div class="list-stack">
              ${view.items.map((item) => `
                <article class="list-item ${item.unlocked ? '' : 'locked'}">
                  <div class="diary-cover">
                    ${imageTag('./assets/images/backgrounds/bg_school_gate_morning.webp', item.title)}
                  </div>
                  <div>
                    <strong>${escapeHtml(item.unlocked ? item.title : 'Locked Entry')}</strong>
                    <p class="muted">Episode ${escapeHtml(item.episodeId)}</p>
                  </div>
                  ${item.unlocked
                    ? `<button data-action="open-diary" data-diary-id="${escapeHtml(item.diaryId)}" class="primary">Open</button>`
                    : '<span class="muted">Locked until episode is seen</span>'}
                </article>
              `).join('')}
            </div>
            <div class="actions"><button data-action="back-title">Back To Title</button></div>
          </section>
        `;
        return;

      case 'diary-detail':
        root.innerHTML = `
          <section class="panel section-panel">
            <div class="section-head">
              <div>
                <p class="eyebrow">Diary Entry</p>
                <h2>${escapeHtml(view.diary?.title ?? '')}</h2>
              </div>
            </div>
            <p class="scene">${escapeHtml(view.diary?.text ?? '')}</p>
            <div class="actions">
              <button data-action="diary">Back To Diary</button>
            </div>
          </section>
        `;
        return;

      case 'updates':
        root.innerHTML = `
          <section class="panel section-panel">
            <div class="section-head">
              <div>
                <p class="eyebrow">Published Changes</p>
                <h2>Updates</h2>
              </div>
              <p class="muted">Preview linked episodes without changing progression.</p>
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
                  ${item.link ? `<button data-action="open-update-link" data-episode-id="${escapeHtml(item.link)}" class="primary">Preview Episode</button>` : ''}
                </article>
              `).join('')}
            </div>
            <div class="actions"><button data-action="back-title">Back To Title</button></div>
          </section>
        `;
        return;

      case 'settings':
        root.innerHTML = `
          <section class="panel section-panel">
            <div class="section-head">
              <div>
                <p class="eyebrow">Audio</p>
                <h2>Settings</h2>
              </div>
            </div>
            <div class="settings-grid">
              <label>BGM Volume
                <input id="bgm-volume" type="range" min="0" max="1" step="0.1" value="${view.settings?.bgmVolume ?? 0.7}">
              </label>
              <label>SE Volume
                <input id="se-volume" type="range" min="0" max="1" step="0.1" value="${view.settings?.seVolume ?? 0.8}">
              </label>
              <label class="check">
                <input id="muted" type="checkbox" ${view.settings?.muted ? 'checked' : ''}>
                Mute Audio
              </label>
            </div>
            <div class="actions">
              <button data-action="save-settings" class="primary">Save Settings</button>
              <button data-action="back-title">Back To Title</button>
            </div>
          </section>
        `;
        return;

      case 'saveload':
        root.innerHTML = `
          <section class="panel section-panel">
            <h2>Load</h2>
            <p class="muted">Load slots are not implemented yet. Continue uses the autosave.</p>
            <div class="actions"><button data-action="back-title">Back To Title</button></div>
          </section>
        `;
        return;

      case 'error':
        root.innerHTML = `
          <section class="panel section-panel error">
            <h2>Error</h2>
            <p>${escapeHtml(view.message)}</p>
            <div class="actions"><button data-action="back-title">Back To Title</button></div>
          </section>
        `;
        return;

      default:
        root.innerHTML = '<section class="panel section-panel"><p>Unknown screen.</p></section>';
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
        setStatus('No autosave is available.');
        return showTitle();
      }
      state.restoreState(saved);
      const episode = await dataLoader.loadEpisode(saved.currentEpisodeId);
      const view = await router.navigateTo('game', { episode, state: state.getState() });
      render(view);
    } catch (error) {
      setStatus('Autosave could not be loaded. Open the load screen manually.');
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
          setStatus('Settings saved.');
          return;
        }

        case 'back-title':
          router.setViewOnlyMode(false);
          return showTitle();

        case 'advance-text':
          renderer.advanceText();
          currentTextIndex += 1;
          return render(currentView);

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
      root.innerHTML = `<section class="panel section-panel error"><h2>Bootstrap Error</h2><p>${error.message}</p></section>`;
    }
  });
});
