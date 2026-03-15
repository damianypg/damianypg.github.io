const state = {
  data: null,
  activeCategory: 'ALL',
  searchTerm: '',
  heroIndex: 0,
  heroMuted: true,
  heroVolume: 0.5,
  streamerAvatars: {}
};

const HERO_VIDEO_FALLBACKS = [
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4'
];

const STREAM_THUMB_FALLBACKS = [
  'https://picsum.photos/seed/stream-one/960/540',
  'https://picsum.photos/seed/stream-two/960/540',
  'https://picsum.photos/seed/stream-three/960/540',
  'https://picsum.photos/seed/stream-four/960/540',
  'https://picsum.photos/seed/stream-five/960/540',
  'https://picsum.photos/seed/stream-six/960/540'
];

const PROFILE_AVATAR_PATHS = [
  '../../img/2.png',
  '../../img/3.png',
  '../../img/5.png',
  '../../img/6.png',
  '../../img/7.png'
];
const CATEGORY_IMAGE_PATHS = [
  '../../img/2.png',
  '../../img/3.png',
  '../../img/5.png',
  '../../img/6.png',
  '../../img/7.png'
];

const refs = {
  liveChannels: document.getElementById('liveChannels'),
  recommendedCats: document.getElementById('recommendedCats'),
  categoryChips: document.getElementById('categoryChips'),
  streamSections: document.getElementById('streamSections'),
  streamCount: document.getElementById('streamCount'),
  followingSidebar: document.getElementById('followingSidebar'),
  searchInput: document.getElementById('searchInput'),
  heroTrack: document.getElementById('heroTrack'),
  heroPrev: document.getElementById('heroPrev'),
  heroNext: document.getElementById('heroNext')
};

const STREAM_SECTION_DEFS = [
  {
    title: 'Canales en directo',
    pick: () => true,
  },
  {
    title: 'QSMP',
    pick: (stream) => /minecraft|qsmp|survival/i.test(`${stream.title} ${stream.game} ${stream.category}`),
  },
  {
    title: 'MOBA',
    pick: (stream) => /moba|league|dota/i.test(`${stream.title} ${stream.game} ${stream.category}`),
  },
  {
    title: 'Categorias que podrian interesarte',
    pick: (stream) => /fps|rpg|speedruns|e-sports|fortnite|valorant|hades/i.test(`${stream.title} ${stream.game} ${stream.category}`),
  },
];

document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    const response = await fetch('data.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`No se pudo cargar data.json (${response.status})`);

    state.data = await response.json();
    buildStreamerAvatarMap();
    renderSidebarChannels();
    renderFollowingSidebar();
    renderRecommendedCategories();
    renderHeroCarousel();
    renderCategoryChips();
    renderStreams();
    bindEvents();
  } catch (error) {
    if (refs.streamSections) {
      refs.streamSections.innerHTML = `<p style="color:#ffb4b4;">Error: ${error.message}</p>`;
    }
  }
}

function buildStreamerAvatarMap() {
  const streamerNames = new Set();

  (state.data?.streams || []).forEach((stream) => {
    if (stream.streamer) streamerNames.add(stream.streamer);
  });

  (state.data?.liveChannels || []).forEach((channel) => {
    if (channel.name) streamerNames.add(channel.name);
  });

  (state.data?.following || []).forEach((name) => {
    if (name) streamerNames.add(name);
  });

  const orderedNames = [...streamerNames].sort((a, b) => a.localeCompare(b));
  state.streamerAvatars = orderedNames.reduce((acc, name, index) => {
    acc[name] = PROFILE_AVATAR_PATHS[index % PROFILE_AVATAR_PATHS.length];
    return acc;
  }, {});
}

function getAvatarForStreamer(streamerName) {
  return state.streamerAvatars[streamerName] || PROFILE_AVATAR_PATHS[0];
}

function getCategoryImage(categoryName, index = 0) {
  const safeName = String(categoryName || '').trim();
  const chars = [...safeName];
  const hash = chars.reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const imageIndex = (hash + index) % CATEGORY_IMAGE_PATHS.length;
  return CATEGORY_IMAGE_PATHS[imageIndex];
}

function bindEvents() {
  document.querySelector('.search-wrap').addEventListener('submit', (event) => {
    event.preventDefault();
    state.searchTerm = refs.searchInput.value.trim().toLowerCase();
    renderStreams();
  });

  refs.heroPrev?.addEventListener('click', () => moveHero(-1));
  refs.heroNext?.addEventListener('click', () => moveHero(1));
}

function getHeroStreams() {
  return (state.data?.streams || []).slice(0, 3);
}

function getVideoForStream(stream, index) {
  return stream.video || HERO_VIDEO_FALLBACKS[index % HERO_VIDEO_FALLBACKS.length];
}

function renderHeroCarousel() {
  const streams = getHeroStreams();

  if (!refs.heroTrack) return;
  refs.heroTrack.innerHTML = '';

  if (streams.length === 0) {
    refs.heroTrack.innerHTML = '<p style="color:#d6d6de;">No hay streams para el carrusel.</p>';
    if (refs.heroPrev) refs.heroPrev.disabled = true;
    if (refs.heroNext) refs.heroNext.disabled = true;
    return;
  }

  refs.heroTrack.innerHTML = `
    <div class="hero-stage">
      <article id="heroSideLeft" class="hero-side hero-side-left" title="Stream previo">
        <video id="heroSideLeftVideo" muted loop playsinline preload="metadata"></video>
        <div class="hero-side-overlay">
          <img id="heroSideLeftAvatar" class="hero-side-avatar" src="" alt="Avatar streamer previo" />
          <p id="heroSideLeftName" class="hero-side-name"></p>
        </div>
      </article>

      <article class="featured-stream">
        <div class="featured-media" id="featuredMedia" title="Click para ir al siguiente stream">
          <video id="featuredVideo" loop playsinline preload="metadata"></video>
          <div class="player-controls" id="playerControls">
            <div class="player-controls-left">
              <button id="playPauseBtn" class="player-btn" type="button" aria-label="Play o pausa">▶</button>
              <button id="muteBtn" class="player-btn" type="button" aria-label="Silenciar o activar volumen"><i class="bi bi-volume-up-fill"></i></button>
              <input id="volumeSlider" class="player-volume" type="range" min="0" max="1" step="0.05" value="0.5" aria-label="Volumen" />
            </div>
            <div class="player-controls-right">
              <button id="settingsBtn" class="player-btn" type="button" aria-label="Configuracion"><i class="bi bi-gear-fill"></i></button>
              <button id="fullscreenBtn" class="player-btn" type="button" aria-label="Pantalla completa"><i class="bi bi-fullscreen"></i></button>
            </div>
          </div>
        </div>
        <aside class="featured-info">
          <div class="featured-streamer">
            <img id="featuredAvatar" class="featured-avatar" src="" alt="Streamer" />
            <div class="featured-streamer-meta">
              <strong id="featuredName" class="featured-name"></strong>
              <span id="featuredGame" class="featured-game"></span>
            </div>
          </div>
          <p id="featuredTitle" class="featured-title"></p>
          <span id="featuredViewers" class="featured-viewers"></span>
          <div id="featuredTags" class="featured-tags"></div>
        </aside>
      </article>

      <article id="heroSideRight" class="hero-side hero-side-right" title="Siguiente stream">
        <video id="heroSideRightVideo" muted loop playsinline preload="metadata"></video>
        <div class="hero-side-overlay">
          <img id="heroSideRightAvatar" class="hero-side-avatar" src="" alt="Avatar streamer siguiente" />
          <p id="heroSideRightName" class="hero-side-name"></p>
        </div>
      </article>
    </div>
  `;

  if (refs.heroPrev) refs.heroPrev.disabled = streams.length < 2;
  if (refs.heroNext) refs.heroNext.disabled = streams.length < 2;
  state.heroIndex = 0;
  bindFeaturedPlayerEvents();
  updateFeaturedStream();
}

function moveHero(direction) {
  const streams = getHeroStreams();
  if (streams.length < 2) return;

  triggerHeroSwapAnimation(direction);
  state.heroIndex = (state.heroIndex + direction + streams.length) % streams.length;
  updateFeaturedStream();
}

function triggerHeroSwapAnimation(direction) {
  const stage = refs.heroTrack?.querySelector('.hero-stage');
  if (!stage) return;

  stage.classList.remove('is-swap-next', 'is-swap-prev');
  stage.classList.add(direction > 0 ? 'is-swap-next' : 'is-swap-prev');

  window.setTimeout(() => {
    stage.classList.remove('is-swap-next', 'is-swap-prev');
  }, 260);
}

function bindFeaturedPlayerEvents() {
  const sideLeft = document.getElementById('heroSideLeft');
  const sideRight = document.getElementById('heroSideRight');
  const media = document.getElementById('featuredMedia');
  const controls = document.getElementById('playerControls');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const muteBtn = document.getElementById('muteBtn');
  const volumeSlider = document.getElementById('volumeSlider');
  const settingsBtn = document.getElementById('settingsBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const video = document.getElementById('featuredVideo');

  if (!media || !video) return;

  sideLeft?.addEventListener('click', () => moveHero(-1));
  sideRight?.addEventListener('click', () => moveHero(1));
  media.addEventListener('click', () => moveHero(1));
  controls?.addEventListener('click', (event) => event.stopPropagation());

  playPauseBtn?.addEventListener('click', () => {
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
    syncPlayerButtons();
  });

  muteBtn?.addEventListener('click', () => {
    state.heroMuted = !video.muted;
    video.muted = state.heroMuted;
    syncPlayerButtons();
  });

  volumeSlider?.addEventListener('input', () => {
    state.heroVolume = Number(volumeSlider.value);
    video.volume = state.heroVolume;
    if (state.heroVolume > 0 && video.muted) {
      video.muted = false;
      state.heroMuted = false;
    }
    syncPlayerButtons();
  });

  settingsBtn?.addEventListener('click', () => {
    settingsBtn.classList.toggle('is-active');
  });

  fullscreenBtn?.addEventListener('click', async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    if (media.requestFullscreen) {
      await media.requestFullscreen();
    }
  });

  video.addEventListener('play', syncPlayerButtons);
  video.addEventListener('pause', syncPlayerButtons);
}

function syncPlayerButtons() {
  const video = document.getElementById('featuredVideo');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const muteBtn = document.getElementById('muteBtn');
  const volumeSlider = document.getElementById('volumeSlider');
  if (!video) return;

  if (playPauseBtn) {
    playPauseBtn.innerHTML = video.paused
      ? '<i class="bi bi-play-fill"></i>'
      : '<i class="bi bi-pause-fill"></i>';
  }

  if (muteBtn) {
    muteBtn.innerHTML = video.muted || video.volume === 0
      ? '<i class="bi bi-volume-mute-fill"></i>'
      : '<i class="bi bi-volume-up-fill"></i>';
  }

  if (volumeSlider) {
    volumeSlider.value = String(video.volume);
  }
}

function updateFeaturedStream() {
  const streams = getHeroStreams();
  if (!streams.length) return;

  const stream = streams[state.heroIndex];
  const leftIndex = (state.heroIndex - 1 + streams.length) % streams.length;
  const rightIndex = (state.heroIndex + 1) % streams.length;
  const leftStream = streams[leftIndex];
  const rightStream = streams[rightIndex];

  const video = document.getElementById('featuredVideo');
  const leftVideo = document.getElementById('heroSideLeftVideo');
  const rightVideo = document.getElementById('heroSideRightVideo');
  const leftName = document.getElementById('heroSideLeftName');
  const rightName = document.getElementById('heroSideRightName');
  const leftAvatar = document.getElementById('heroSideLeftAvatar');
  const rightAvatar = document.getElementById('heroSideRightAvatar');
  const avatar = document.getElementById('featuredAvatar');
  const name = document.getElementById('featuredName');
  const game = document.getElementById('featuredGame');
  const title = document.getElementById('featuredTitle');
  const viewers = document.getElementById('featuredViewers');
  const tags = document.getElementById('featuredTags');
  if (!video || !avatar || !name || !game || !title || !viewers || !tags) return;

  const src = getVideoForStream(stream, state.heroIndex);
  if (video.src !== src) {
    video.src = src;
  }

  video.muted = state.heroMuted;
  video.volume = state.heroVolume;
  video.currentTime = 0;
  video.play().catch(() => {});

  if (leftVideo && leftStream) {
    leftVideo.src = getVideoForStream(leftStream, leftIndex);
    leftVideo.pause();
    leftVideo.currentTime = 0;
  }

  if (rightVideo && rightStream) {
    rightVideo.src = getVideoForStream(rightStream, rightIndex);
    rightVideo.pause();
    rightVideo.currentTime = 0;
  }

  if (leftName && leftStream) {
    leftName.textContent = leftStream.streamer;
  }

  if (leftAvatar && leftStream) {
    leftAvatar.src = getAvatarForStreamer(leftStream.streamer);
    leftAvatar.alt = `Avatar de ${leftStream.streamer}`;
  }

  if (rightName && rightStream) {
    rightName.textContent = rightStream.streamer;
  }

  if (rightAvatar && rightStream) {
    rightAvatar.src = getAvatarForStreamer(rightStream.streamer);
    rightAvatar.alt = `Avatar de ${rightStream.streamer}`;
  }

  avatar.src = getAvatarForStreamer(stream.streamer);
  avatar.alt = `Avatar de ${stream.streamer}`;
  name.textContent = stream.streamer;
  game.textContent = stream.game;
  title.textContent = stream.title;
  viewers.textContent = stream.viewers;

  const tagValues = [stream.category, stream.game, 'En vivo'];
  tags.innerHTML = [...new Set(tagValues)]
    .map((tag) => `<span class="featured-tag">${tag}</span>`)
    .join('');

  syncPlayerButtons();
}

function renderSidebarChannels() {
  const channels = state.data?.liveChannels || [];
  if (!refs.liveChannels) return;

  refs.liveChannels.innerHTML = channels
    .map((channel) => `
      <li class="channel-item">
        <img class="channel-avatar" src="${getAvatarForStreamer(channel.name)}" alt="Avatar de ${channel.name}" />
        <div class="channel-main">
          <strong class="channel-name">${channel.name}</strong>
          <span class="channel-meta">${channel.game}</span>
        </div>
        <span class="live-status">${channel.viewers}</span>
      </li>
    `)
    .join('');
}

function renderFollowingSidebar() {
  if (!refs.followingSidebar) return;

  refs.followingSidebar.innerHTML = (state.data?.following || [])
    .map((name) => `<li class="follow-item"><img class="channel-avatar" src="${getAvatarForStreamer(name)}" alt="Avatar de ${name}" /><strong class="channel-name">${name}</strong><span class="offline-pill">Desconectado</span></li>`)
    .join('');
}

function renderRecommendedCategories() {
  if (!refs.recommendedCats) return;

  refs.recommendedCats.innerHTML = (state.data?.categories || [])
    .slice(0, 8)
    .map((name, index) => `
      <li class="cat-side-item">
        <div class="cat-side-main">
          <img class="cat-side-thumb" src="${getCategoryImage(name, index)}" alt="Categoria ${name}" />
          <span class="cat-side-name">${name}</span>
        </div>
        <span class="cat-side-count">${(index + 3) * 4}K</span>
      </li>
    `)
    .join('');
}

function getThumbnailForStream(stream, index) {
  return stream.thumbnail || STREAM_THUMB_FALLBACKS[index % STREAM_THUMB_FALLBACKS.length];
}

function getStreamCategoryList(stream) {
  if (Array.isArray(stream.categories) && stream.categories.length > 0) {
    return [...new Set(stream.categories.map((item) => String(item).trim()).filter(Boolean))];
  }

  const fallback = [stream.category, stream.language]
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  return [...new Set(fallback)];
}

function getStreamMetaText(stream) {
  const categories = getStreamCategoryList(stream);
  const categoriesText = categories.length > 0 ? ` · ${categories.join(' · ')}` : '';
  return `${stream.game}${categoriesText}`;
}

function buildSectionStreams(streams, predicate, size) {
  const picked = streams.filter(predicate);
  const output = picked.slice(0, size);

  if (streams.length === 0) return output;

  let cursor = 0;
  while (output.length < size) {
    output.push(streams[cursor % streams.length]);
    cursor += 1;
  }

  return output;
}

function renderCategoryChips() {
  const all = ['ALL', ...state.data.categories];

  refs.categoryChips.innerHTML = all
    .map((category, index) => {
      const active = category === state.activeCategory ? 'active' : '';
      const thumb = category === 'ALL'
        ? ''
        : `<img class="chip-thumb" src="${getCategoryImage(category, index)}" alt="Categoria ${category}" />`;

      return `<button class="chip ${active}" data-category="${category}">${thumb}<span>${category}</span></button>`;
    })
    .join('');

  refs.categoryChips.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.activeCategory = chip.dataset.category;
      renderCategoryChips();
      renderStreams();
    });
  });
}

function getFilteredStreams() {
  return state.data.streams.filter((stream) => {
    const streamCategories = getStreamCategoryList(stream);
    const categoryMatch = state.activeCategory === 'ALL' || streamCategories.includes(state.activeCategory);

    const text = `${stream.title} ${stream.streamer} ${stream.game}`.toLowerCase();
    const searchMatch = state.searchTerm === '' || text.includes(state.searchTerm);

    return categoryMatch && searchMatch;
  });
}

function renderStreams() {
  const streams = getFilteredStreams();

  refs.streamCount.textContent = `${streams.length} resultado(s)`;

  if (streams.length === 0) {
    if (refs.streamSections) {
      refs.streamSections.innerHTML = '<p style="color:#d6d6de;">No se encontraron streams con ese filtro.</p>';
    }
    return;
  }

  const sectionsMarkup = STREAM_SECTION_DEFS.map((section) => {
    const sectionStreams = buildSectionStreams(streams, section.pick, 5);
    const cards = sectionStreams
      .map((stream, index) => `
        <article class="stream-card">
          <div class="thumb" style="background-image: linear-gradient(130deg, ${stream.accent}55, #1d1d24aa), url('${getThumbnailForStream(stream, index)}');">
            <span class="live-badge">LIVE</span>
            <span class="viewers-badge">${stream.viewers}</span>
          </div>
          <div class="stream-info">
            <h4 class="stream-title">${stream.title}</h4>
            <div class="streamer-line">
              <img class="streamer-avatar" src="${getAvatarForStreamer(stream.streamer)}" alt="Avatar de ${stream.streamer}" />
              <p class="streamer">${stream.streamer}</p>
            </div>
            <p class="meta">${getStreamMetaText(stream)}</p>
          </div>
        </article>
      `)
      .join('');

    return `
      <section class="stream-category">
        <div class="stream-category-head">
          <h4>${section.title}</h4>
          <span>${sectionStreams.length} en directo</span>
        </div>
        <div class="stream-row">${cards}</div>
        <button class="show-more-btn" type="button">Mostrar mas</button>
      </section>
    `;
  }).join('');

  if (refs.streamSections) {
    refs.streamSections.innerHTML = sectionsMarkup;
  }
}
