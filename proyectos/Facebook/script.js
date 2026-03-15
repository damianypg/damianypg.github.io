const fallbackData = {
	user: {
		name: "Yosef Puetate",
		role: "Disenador frontend y creador de contenido",
		initials: "YS",
		avatar: "../../img/img-yo.png",
		friends: 842,
		groups: 18,
		photos: 126
	},
	shortcuts: [
		{
			icon: "metaAI",
			title: "Meta AI",
			meta: "Asistente inteligente"
		},
		{
			icon: "friends",
			title: "Amigos",
			meta: "Solicitudes y sugerencias"
		},
		{
			icon: "groups",
			title: "Grupos",
			meta: "Comunidades y conversaciones"
		},
		{
			icon: "saved",
			title: "Guardado",
			meta: "Contenido guardado"
		},
		{
			icon: "memories",
			title: "Recuerdos",
			meta: "Publicaciones de otros anos"
		},
		{
			icon: "events",
			title: "Eventos",
			meta: "Actividades cercanas"
		},
		{
			icon: "marketplaceBrand",
			title: "Marketplace",
			meta: "Compra y venta local"
		}
	],
	stories: [
		{
			initials: "YS",
			title: "Tu historia",
			image: "../../img/img-yo.png"
		},
		{
			initials: "AL",
			title: "Ana Lopez",
			image: "../../img/2.png"
		},
		{
			initials: "MR",
			title: "Marco Ruiz",
			image: "../../img/3.png"
		},
		{
			initials: "SP",
			title: "Sofia Perez",
			image: "../../img/5.png"
		},
		{
			initials: "DG",
			title: "Diego Gomez",
			image: "../../img/6.png"
		},
		{
			initials: "LM",
			title: "Laura Mora",
			image: "../../img/7.png"
		}
	],
	posts: [
		{
			author: "Yosef Puetate",
			initials: "YP",
			avatar: "../../img/img-yo.png",
			time: "Hace 32 min",
			caption: "Cerrando una landing con enfoque mobile first. El detalle en el espaciado cambia todo.",
			image: "../../img/img-1.jpg",
			reactions: ["like", "love", "care", "wow"],
			likes: "3.2 mil",
			comments: 184,
			shares: 41
		},
		{
			author: "Ana Lopez",
			initials: "AL",
			avatar: "../../img/2.png",
			time: "Hace 1 h",
			caption: "Domingo de cafe y mockups. Hoy me inspire en una interfaz mas limpia y rapida.",
			image: "../../img/img-2.webp",
			reactions: ["like", "love", "haha"],
			likes: "1.8 mil",
			comments: 73,
			shares: 12
		},
		{
			author: "Marco Ruiz",
			initials: "MR",
			avatar: "../../img/3.png",
			time: "Hace 2 h",
			caption: "Nuevo setup para edicion de video. Fluido, silencioso y listo para reels.",
			image: "../../img/img-3.jpg",
			reactions: ["like", "love", "care"],
			likes: "2.4 mil",
			comments: 96,
			shares: 29
		},
		{
			author: "Sofia Perez",
			initials: "SP",
			avatar: "../../img/5.png",
			time: "Hace 4 h",
			caption: "Mini shooting de producto para redes. Luz natural + edicion ligera.",
			image: "../../img/img-4.jpg",
			reactions: ["like", "love", "wow"],
			likes: "956",
			comments: 38,
			shares: 7
		},
		{
			author: "Diego Gomez",
			initials: "DG",
			avatar: "../../img/6.png",
			time: "Ayer a las 21:10",
			caption: "Checklist de publicacion: copy claro, visual fuerte y CTA directo.",
			image: "../../img/img-5.webp",
			reactions: ["like", "haha", "wow"],
			likes: "1.1 mil",
			comments: 52,
			shares: 16
		}
	],
	advertisement: {
		eyebrow: "Patrocinado",
		title: "Impulsa tu marca",
		text: "Lanza campanas con alcance local y conversiones medibles en minutos."
	},
	birthdays: [
		{
			name: "Andrea Rojas",
			meta: "Cumple hoy"
		},
		{
			name: "Jose Medina",
			meta: "Cumple en 2 dias"
		}
	],
	contacts: [
		{
			initials: "AR",
			name: "Andrea Rojas",
			avatar: "../../img/2.png",
			status: "Activa ahora"
		},
		{
			initials: "JM",
			name: "Jose Medina",
			avatar: "../../img/3.png",
			status: "Activo hace 5 min"
		},
		{
			initials: "LP",
			name: "Laura Pineda",
			avatar: "../../img/5.png",
			status: "Activo hace 1 min"
		}
	],
	screens: {
		watch: {
			title: "Watch",
			description: "Explora videos y transmisiones recomendadas para ti."
		},
		marketplace: {
			title: "Marketplace",
			description: "Compra y vende productos cerca de tu ubicacion."
		},
		groups: {
			title: "Grupos",
			description: "Descubre comunidades y conversaciones por intereses."
		},
		gaming: {
			title: "Gaming",
			description: "Sigue streamings, clips y actividades gaming."
		}
	}
};

const profilePanel = document.getElementById("profilePanel");
const shortcutList = document.getElementById("shortcutList");
const storyList = document.getElementById("storyList");
const postList = document.getElementById("postList");
const composerAvatar = document.getElementById("composerAvatar");
const storyCarousel = document.getElementById("storyCarousel");
const storiesPrev = document.getElementById("storiesPrev");
const storiesNext = document.getElementById("storiesNext");
const adCard = document.getElementById("adCard");
const birthdayList = document.getElementById("birthdayList");
const contactList = document.getElementById("contactList");
const onlineCount = document.getElementById("onlineCount");
const themeToggle = document.getElementById("themeToggle");
const themeToggleIcon = document.getElementById("themeToggleIcon");
const leftMenuToggle = document.getElementById("leftMenuToggle");
const leftSidebar = document.querySelector(".sidebar--left");
const screenWatch = document.getElementById("screenWatch");
const screenMarketplace = document.getElementById("screenMarketplace");
const screenGroups = document.getElementById("screenGroups");
const screenGaming = document.getElementById("screenGaming");
const navScreenButtons = document.querySelectorAll(".topbar__nav .icon-button[data-screen]");

function getIcon(name) {
	const icons = {
		facebook: '<i class="bi bi-facebook"></i>',
		messenger: '<i class="bi bi-messenger"></i>',
		instagram: '<i class="bi bi-instagram"></i>',
		whatsapp: '<i class="bi bi-whatsapp"></i>',
		youtube: '<i class="bi bi-youtube"></i>',
		tiktok: '<i class="bi bi-tiktok"></i>',
		metaAI: '<i class="bi bi-stars"></i>',
		friends: '<i class="bi bi-people-fill"></i>',
		groups: '<i class="bi bi-collection-fill"></i>',
		saved: '<i class="bi bi-bookmark-fill"></i>',
		memories: '<i class="bi bi-clock-history"></i>',
		events: '<i class="bi bi-calendar-event-fill"></i>',
		marketplaceBrand: '<i class="bi bi-shop"></i>',
		profile: '<i class="bi bi-person-circle"></i>',
		photo: '<i class="bi bi-image"></i>',
		like: '<i class="bi bi-hand-thumbs-up-fill"></i>',
		comment: '<i class="bi bi-chat-dots-fill"></i>',
		share: '<i class="bi bi-share-fill"></i>',
		attach: '<i class="bi bi-paperclip"></i>'
		,
		love: '<i class="bi bi-heart-fill"></i>',
		haha: '<i class="bi bi-emoji-laughing-fill"></i>',
		wow: '<i class="bi bi-emoji-surprise-fill"></i>',
		care: '<i class="bi bi-emoji-smile-fill"></i>'
	};

	return icons[name] || "";
}

function getAvatarMarkup(user, className) {
	if (user.avatar) {
		const imageClassName = className === "profile-panel__avatar" ? "profile-panel__avatar-image" : className;
		return `<img class="${imageClassName}" src="${user.avatar}" alt="Foto de perfil de ${user.name}">`;
	}

	return `<div class="avatar avatar--blue ${className}">${user.initials}</div>`;
}

function setupThemeToggle() {
	const savedTheme = localStorage.getItem("facebook-theme") || "light";
	document.body.dataset.theme = savedTheme;
	themeToggleIcon.className = savedTheme === "dark" ? "bi bi-sun-fill" : "bi bi-moon-stars-fill";

	themeToggle.addEventListener("click", () => {
		const currentTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
		document.body.dataset.theme = currentTheme;
		localStorage.setItem("facebook-theme", currentTheme);
		themeToggleIcon.className = currentTheme === "dark" ? "bi bi-sun-fill" : "bi bi-moon-stars-fill";
	});
}

function setupLeftSidebarToggle() {
	if (!leftMenuToggle || !leftSidebar) {
		return;
	}

	const closeLeftMenu = () => {
		document.body.classList.remove("left-menu-open");
		leftMenuToggle.setAttribute("aria-expanded", "false");
	};

	leftMenuToggle.addEventListener("click", () => {
		const isOpen = document.body.classList.contains("left-menu-open");
		document.body.classList.toggle("left-menu-open", !isOpen);
		leftMenuToggle.setAttribute("aria-expanded", String(!isOpen));
	});

	document.addEventListener("click", (event) => {
		if (!document.body.classList.contains("left-menu-open")) {
			return;
		}

		const target = event.target;

		if (!(target instanceof Element)) {
			return;
		}

		if (target.closest(".sidebar--left") || target.closest("#leftMenuToggle")) {
			return;
		}

		closeLeftMenu();
	});

	window.addEventListener("resize", () => {
		if (window.innerWidth <= 768 || window.innerWidth >= 1024) {
			closeLeftMenu();
		}
	});
}

function createScreenPlaceholder(container, title, description) {
	container.innerHTML = `
		<article class="screen-placeholder">
			<h2>${title}</h2>
			<p>${description}</p>
		</article>
	`;
}

function setupTopNavigation() {
	const screenMap = {
		home: document.getElementById("screenHome"),
		watch: screenWatch,
		marketplace: screenMarketplace,
		groups: screenGroups,
		gaming: screenGaming
	};

	navScreenButtons.forEach((button) => {
		button.addEventListener("click", () => {
			const target = button.dataset.screen;

			navScreenButtons.forEach((item) => {
				item.classList.remove("icon-button--active");
			});

			Object.values(screenMap).forEach((screen) => {
				screen.classList.add("screen--hidden");
				screen.classList.remove("screen--active");
			});

			button.classList.add("icon-button--active");
			screenMap[target].classList.remove("screen--hidden");
			screenMap[target].classList.add("screen--active");
		});
	});
}

function createProfile(user) {
	composerAvatar.innerHTML = getAvatarMarkup(user, "avatar__image");

	profilePanel.innerHTML = `
		<div class="profile-panel__top">
			${getAvatarMarkup(user, "profile-panel__avatar")}
			<div>
				<p class="profile-panel__name">${user.name}</p>
				<p class="profile-panel__role">${user.role}</p>
			</div>
		</div>
	`;
}

function createShortcuts(shortcuts) {
	shortcutList.innerHTML = shortcuts.map((item) => `
		<article class="shortcut">
			<div class="shortcut__icon">${getIcon(item.icon)}</div>
			<div>
				<p class="shortcut__title">${item.title}</p>
				<p class="shortcut__meta">${item.meta}</p>
			</div>
		</article>
	`).join("");
}

function createStories(stories) {
	storyList.innerHTML = stories.map((story) => `
		<article class="story-card">
			<img class="story-card__image" src="${story.image}" alt="Historia de ${story.title}">
			<div class="story-card__badge">${story.image ? `<img class="story-card__badge-image" src="${story.image}" alt="Perfil de ${story.title}">` : story.initials}</div>
			<div>
				<p class="story-card__title">${story.title}</p>
			</div>
		</article>
	`).join("");
}

function setupStoriesCarousel() {
	const scrollAmount = 270;

	storiesNext.addEventListener("click", () => {
		storyCarousel.scrollBy({ left: scrollAmount, behavior: "smooth" });
	});

	storiesPrev.addEventListener("click", () => {
		storyCarousel.scrollBy({ left: -scrollAmount, behavior: "smooth" });
	});
}

function createReactionMarkup(reactions = []) {
	const reactionMap = {
		like: { className: "post__reaction--like", icon: "like" },
		love: { className: "post__reaction--love", icon: "love" },
		care: { className: "post__reaction--care", icon: "care" },
		haha: { className: "post__reaction--haha", icon: "haha" },
		wow: { className: "post__reaction--wow", icon: "wow" }
	};

	return reactions.slice(0, 4).map((reaction) => {
		const config = reactionMap[reaction] || reactionMap.like;
		return `<span class="post__reaction ${config.className}">${getIcon(config.icon)}</span>`;
	}).join("");
}

function createPosts(posts) {
	postList.innerHTML = posts.map((post) => `
		<article class="post">
			<div class="post__header">
				<div class="post__author-block">
					<div class="avatar avatar--blue">${post.avatar ? `<img class="post__author-avatar-image" src="${post.avatar}" alt="Perfil de ${post.author}">` : post.initials}</div>
					<div>
						<p class="post__author">${post.author}</p>
						<p class="post__meta">${post.time}</p>
					</div>
				</div>
				<button class="post__menu" type="button" aria-label="Opciones"><i class="bi bi-three-dots"></i></button>
			</div>
			<p class="post__caption">${post.caption}</p>
			<div class="post__media post__media--photo">
				<img class="post__image" src="${post.image}" alt="Publicacion de ${post.author}">
			</div>
			<div class="post__stats">
				<div class="post__reactions" aria-label="Reacciones">
					${createReactionMarkup(post.reactions)}
					<span>${post.likes}</span>
				</div>
				<span class="post__summary">${post.comments} comentarios · ${post.shares} compartidos</span>
			</div>
			<div class="post__footer">
				<button class="post__action" type="button">${getIcon("like")}<span>Me gusta</span></button>
				<button class="post__action" type="button">${getIcon("comment")}<span>Comentar</span></button>
				<button class="post__action" type="button">${getIcon("share")}<span>Compartir</span></button>
			</div>
		</article>
	`).join("");
}

function createAdvertisement(advertisement) {
	adCard.innerHTML = `
		<span class="ad-card__pill">${advertisement.eyebrow}</span>
		<h3 class="ad-card__title">${advertisement.title}</h3>
		<p class="ad-card__text">${advertisement.text}</p>
	`;
}

function createBirthdays(birthdays) {
	birthdayList.innerHTML = birthdays.map((item) => `
		<article class="birthday-item">
			<span class="birthday-item__icon"><i class="bi bi-gift-fill"></i></span>
			<p class="birthday-item__text"><strong>${item.name}</strong> · ${item.meta}</p>
		</article>
	`).join("");
}

function createContacts(contacts) {
	onlineCount.textContent = `${contacts.length} en linea`;
	contactList.innerHTML = contacts.map((contact) => `
		<article class="contact">
			<div class="contact__avatar">${contact.avatar ? `<img class="contact__avatar-image" src="${contact.avatar}" alt="Perfil de ${contact.name}">` : contact.initials}</div>
			<div>
				<p class="contact__name">${contact.name}</p>
				<p class="contact__status">${contact.status}</p>
			</div>
			<span class="contact__presence" aria-hidden="true"></span>
		</article>
	`).join("");
}

function renderApp(data) {
	createProfile(data.user);
	createShortcuts(data.shortcuts);
	createStories(data.stories);
	setupStoriesCarousel();
	createPosts(data.posts);
	createAdvertisement(data.advertisement);
	createBirthdays(data.birthdays);
	createContacts(data.contacts);
	createScreenPlaceholder(screenWatch, data.screens.watch.title, data.screens.watch.description);
	createScreenPlaceholder(screenMarketplace, data.screens.marketplace.title, data.screens.marketplace.description);
	createScreenPlaceholder(screenGroups, data.screens.groups.title, data.screens.groups.description);
	createScreenPlaceholder(screenGaming, data.screens.gaming.title, data.screens.gaming.description);
	setupTopNavigation();
	setupThemeToggle();
	setupLeftSidebarToggle();
}

async function loadData() {
	try {
		const response = await fetch("data.json");

		if (!response.ok) {
			throw new Error("No se pudo cargar data.json");
		}

		const data = await response.json();
		renderApp({
			...fallbackData,
			...data,
			user: { ...fallbackData.user, ...data.user },
			advertisement: { ...fallbackData.advertisement, ...data.advertisement },
			screens: { ...fallbackData.screens, ...data.screens },
			shortcuts: data.shortcuts ?? fallbackData.shortcuts,
			stories: data.stories ?? fallbackData.stories,
			posts: data.posts ?? fallbackData.posts,
			birthdays: data.birthdays ?? fallbackData.birthdays,
			contacts: data.contacts ?? fallbackData.contacts
		});
	} catch (error) {
		renderApp(fallbackData);
		console.error(error);
	}
}

loadData();
