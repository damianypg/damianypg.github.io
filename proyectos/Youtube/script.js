const state = {
	appData: null,
	activeCategory: "Todos",
	searchTerm: ""
};

document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
	const appData = normalizePreviewData(await loadData());
	state.appData = appData;

	renderSidebar(appData.sidebar);
	renderChips(appData.categories);
	renderShorts(appData.shorts || []);
	renderVideos();
	setupEvents();
}

function normalizePreviewData(appData) {
	const previewPool = ["img/short-1.mp4", "img/short-2.mp4"];

	return {
		...appData,
		shorts: (appData.shorts || []).map((short, index) => ({
			...short,
			previewVideo: previewPool[index % previewPool.length]
		})),
		videos: (appData.videos || []).map((video, index) => ({
			...video,
			previewVideo: previewPool[index % previewPool.length]
		}))
	};
}

async function loadData() {
	try {
		const res = await fetch("data.json");
		if (!res.ok) throw new Error("No se pudo cargar data.json");
		return await res.json();
	} catch (error) {
		console.error(error);
		return {
			categories: ["Todos"],
			sidebar: { principal: [], tu: [], suscripciones: [] },
			shorts: [],
			videos: []
		};
	}
}

function renderShorts(shorts) {
	const shortsRow = document.getElementById("shortsRow");
	if (!shortsRow) return;

	if (!shorts.length) {
		shortsRow.innerHTML = "";
		return;
	}

	shortsRow.innerHTML = `
		<div class="shorts-head">
			<div class="shorts-title">
				<i class="bi bi-play-btn-fill"></i>
				<span>Shorts</span>
			</div>
			<div class="shorts-controls">
				<button class="shorts-nav" type="button" data-short-nav="prev" aria-label="Short anterior"><i class="bi bi-chevron-left"></i></button>
				<button class="shorts-nav" type="button" data-short-nav="next" aria-label="Short siguiente"><i class="bi bi-chevron-right"></i></button>
			</div>
		</div>
		<div class="shorts-list" id="shortsTrack">
			${shorts
				.map(
					(short) => `
						<button class="short-card" type="button" data-url="${short.url}">
							<div class="short-thumb" style="--short-a:${short.gradient[0]}; --short-b:${short.gradient[1]};">
								${short.poster ? `<img class="short-poster" src="${short.poster}" alt="Portada de ${short.title}">` : ""}
								${
									short.previewVideo
										? `<video class="short-preview-video" muted playsinline preload="metadata" poster="${short.poster || ""}" src="${short.previewVideo}"></video>`
										: ""
								}
								<span class="short-label">${short.label}</span>
							</div>
							<div class="short-copy">
								<h4>${short.title}</h4>
								<p>${short.views} visualizaciones</p>
							</div>
						</button>
					`
				)
				.join("")}
		</div>
	`;
}

function renderSidebar(sidebarData) {
	const sidebar = document.getElementById("ytSidebar");
	if (!sidebar) return;

	const createGroup = (title, items) => `
		<section class="sidebar-group">
			${title ? `<h3>${title}</h3>` : ""}
			${items
				.map(
					(item, index) => `
						<button class="sidebar-link ${index === 0 ? "is-active" : ""}" type="button">
							${
								item.image
									? `<img class="sidebar-logo" src="${item.image}" alt="${item.label}" />`
									: `<i class="bi ${item.icon}"></i>`
							}
							<span>${item.label}</span>
						</button>
					`
				)
				.join("")}
		</section>
	`;

	const legal = (sidebarData.legal || []).map((item) => `<a href="#">${item}</a>`).join("");

	sidebar.innerHTML = [
		createGroup("Principal", sidebarData.principal || []),
		createGroup("Suscripciones", sidebarData.suscripciones || []),
		createGroup("Tu", sidebarData.tu || []),
		createGroup("Explorar", sidebarData.explorar || []),
		createGroup("Mas de YouTube", sidebarData.masDeYoutube || []),
		createGroup("", sidebarData.configuracion || []),
		`<section class="sidebar-legal">${legal}<p>© 2026 Google LLC</p></section>`
	].join("");
}

function renderChips(categories) {
	const chipsRow = document.getElementById("chipsRow");
	if (!chipsRow) return;

	chipsRow.innerHTML = categories
		.map(
			(category) => `
				<button class="chip ${category === state.activeCategory ? "is-active" : ""}" data-category="${category}" type="button">
					${category}
				</button>
			`
		)
		.join("");
}

function renderVideos() {
	const videoGridTop = document.getElementById("videoGridTop");
	const videoGridBottom = document.getElementById("videoGridBottom");
	if (!videoGridTop || !videoGridBottom || !state.appData) return;

	const normalizedSearch = state.searchTerm.trim().toLowerCase();

	const filtered = state.appData.videos.filter((video) => {
		const categoryOk = state.activeCategory === "Todos" || video.category === state.activeCategory;
		const queryOk =
			!normalizedSearch ||
			video.title.toLowerCase().includes(normalizedSearch) ||
			video.channel.toLowerCase().includes(normalizedSearch);

		return categoryOk && queryOk;
	}).slice(0, 12);

	if (!filtered.length) {
		videoGridTop.innerHTML = '<article class="empty-state">No se encontraron videos con ese filtro.</article>';
		videoGridBottom.innerHTML = "";
		return;
	}

	const topVideos = filtered.slice(0, 6);
	const bottomVideos = filtered.slice(6, 12);

	videoGridTop.innerHTML = renderVideoCards(topVideos);
	videoGridBottom.innerHTML = bottomVideos.length ? renderVideoCards(bottomVideos) : "";
}

function renderVideoCards(videos) {
	return videos
		.map(
			(video) => `
			<article class="video-card">
				<div class="thumb" style="--thumb-a:${video.gradient[0]}; --thumb-b:${video.gradient[1]};">
					${video.poster ? `<img class="video-poster" src="${video.poster}" alt="Portada de ${video.title}">` : ""}
					${video.previewVideo ? `<video class="video-preview" muted playsinline preload="metadata" poster="${video.poster || ""}" src="${video.previewVideo}"></video>` : ""}
					<span class="thumb-label">${video.label}</span>
					<span class="duration">${video.duration}</span>
				</div>
				<div class="video-meta">
					<div class="avatar">${video.channelInitial}</div>
					<div class="meta-copy">
						<h3>${video.title}</h3>
						<p>${video.channel}</p>
						<p>${video.views} vistas • ${video.timeAgo}</p>
						<button class="watch-btn" type="button" data-url="${video.url}">
							Ver video <i class="bi bi-box-arrow-up-right"></i>
						</button>
					</div>
				</div>
			</article>
		`
		)
		.join("");
}

function setupEvents() {
	const chipsRow = document.getElementById("chipsRow");
	const searchForm = document.getElementById("searchForm");
	const searchInput = document.getElementById("searchInput");
	const content = document.querySelector(".yt-content");
	const sidebar = document.getElementById("ytSidebar");
	const layout = document.querySelector(".yt-layout");
	const menuToggle = document.getElementById("menuToggle");
	const sidebarBackdrop = document.getElementById("sidebarBackdrop");

	chipsRow?.addEventListener("click", (event) => {
		const chip = event.target.closest(".chip");
		if (!chip) return;

		state.activeCategory = chip.dataset.category || "Todos";
		renderChips(state.appData.categories);
		renderVideos();
	});

	searchForm?.addEventListener("submit", (event) => {
		event.preventDefault();
		state.searchTerm = searchInput?.value || "";
		renderVideos();
	});

	searchInput?.addEventListener("input", () => {
		if (!searchInput.value.trim()) {
			state.searchTerm = "";
			renderVideos();
		}
	});

	content?.addEventListener("click", (event) => {
		const btn = event.target.closest(".watch-btn");
		if (!btn) return;

		const url = btn.dataset.url;
		if (url) window.open(url, "_blank", "noopener,noreferrer");
	});

	setupHoverPreview(content, ".video-card", ".video-preview");
	setupHoverPreview(document.getElementById("shortsRow"), ".short-card", ".short-preview-video");

	document.getElementById("shortsRow")?.addEventListener("click", (event) => {
		const navBtn = event.target.closest(".shorts-nav");
		if (navBtn) {
			const track = document.getElementById("shortsTrack");
			if (!track) return;

			const card = track.querySelector(".short-card");
			const step = (card?.getBoundingClientRect().width || 180) + 12;
			const direction = navBtn.dataset.shortNav === "next" ? 1 : -1;
			track.scrollBy({ left: step * direction, behavior: "smooth" });
			return;
		}

		const shortCard = event.target.closest(".short-card");
		if (!shortCard) return;

		const url = shortCard.dataset.url;
		if (url) window.open(url, "_blank", "noopener,noreferrer");
	});

	menuToggle?.addEventListener("click", () => {
		if (!sidebar) return;

		if (window.innerWidth <= 767) {
			const isOpen = sidebar.classList.toggle("is-open");
			sidebarBackdrop?.classList.toggle("is-active", isOpen);
			menuToggle.setAttribute("aria-expanded", String(isOpen));
			return;
		}

		if (window.innerWidth <= 1024) {
			const isExpanded = layout?.classList.toggle("sidebar-expanded") ?? false;
			sidebar.classList.toggle("is-open", isExpanded);
			sidebarBackdrop?.classList.remove("is-active");
			menuToggle.setAttribute("aria-expanded", String(isExpanded));
			return;
		}

		if (window.innerWidth <= 1440) {
			layout?.classList.remove("sidebar-collapsed");
			const isExpandedMidDesktop = layout?.classList.toggle("sidebar-expanded") ?? false;
			sidebar.classList.toggle("is-open", isExpandedMidDesktop);
			menuToggle.setAttribute("aria-expanded", String(isExpandedMidDesktop));
			return;
		}

		layout?.classList.remove("sidebar-expanded");
		const isCollapsedDesktop = layout?.classList.toggle("sidebar-collapsed") ?? false;
		sidebar.classList.remove("is-open");
		menuToggle.setAttribute("aria-expanded", String(!isCollapsedDesktop));
	});

	sidebarBackdrop?.addEventListener("click", () => {
		sidebar?.classList.remove("is-open");
		sidebarBackdrop.classList.remove("is-active");
		menuToggle?.setAttribute("aria-expanded", "false");
	});

	document.addEventListener("click", (event) => {
		if (window.innerWidth > 767) return;
		if (!sidebar || !sidebar.classList.contains("is-open")) return;

		const clickInside = sidebar.contains(event.target) || menuToggle?.contains(event.target);
		if (!clickInside) {
			sidebar.classList.remove("is-open");
			sidebarBackdrop?.classList.remove("is-active");
			menuToggle?.setAttribute("aria-expanded", "false");
		}
	});

	window.addEventListener("resize", () => {
		if (window.innerWidth <= 767) {
			layout?.classList.remove("sidebar-expanded");
			layout?.classList.remove("sidebar-collapsed");
			sidebar?.classList.remove("is-collapsed");
			return;
		}

		if (window.innerWidth <= 1024) {
			layout?.classList.remove("sidebar-collapsed");
			sidebarBackdrop?.classList.remove("is-active");
			sidebar?.classList.remove("is-collapsed");
			return;
		}

		if (window.innerWidth <= 1440) {
			layout?.classList.remove("sidebar-collapsed");
			sidebar?.classList.remove("is-collapsed");
			return;
		}

		if (window.innerWidth > 1024) {
			layout?.classList.remove("sidebar-expanded");
			layout?.classList.remove("sidebar-collapsed");
			sidebar?.classList.remove("is-open");
			sidebar?.classList.remove("is-collapsed");
			sidebarBackdrop?.classList.remove("is-active");
			menuToggle?.setAttribute("aria-expanded", "false");
		}
	});
}

function setupHoverPreview(container, cardSelector, videoSelector) {
	if (!container) return;

	container.addEventListener("mouseenter", (event) => {
		const card = event.target.closest(cardSelector);
		const video = card?.querySelector(videoSelector);
		if (!video) return;

		clearTimeout(video._previewTimeoutId);
		video.currentTime = 0;
		video.play().catch(() => {});
		video._previewTimeoutId = window.setTimeout(() => {
			video.pause();
		}, 5000);
	}, true);

	container.addEventListener("mouseleave", (event) => {
		const card = event.target.closest(cardSelector);
		const video = card?.querySelector(videoSelector);
		if (!video) return;

		clearTimeout(video._previewTimeoutId);
		video.pause();
		video.currentTime = 0;
	}, true);

	container.addEventListener("ended", (event) => {
		const video = event.target;
		if (!(video instanceof HTMLVideoElement)) return;
		clearTimeout(video._previewTimeoutId);
		video.pause();
		video.currentTime = 0;
	}, true);
}
