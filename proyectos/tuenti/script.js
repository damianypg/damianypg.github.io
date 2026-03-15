document.addEventListener('DOMContentLoaded', () => {
  const servicesGrid = document.getElementById('services-grid');
  const carousel = document.getElementById('carousel');
  const carouselItems = carousel ? Array.from(carousel.querySelectorAll('.carousel-item')) : [];
  const navButtons = Array.from(document.querySelectorAll('.nav-btn'));

  renderServices();
  initCarousel();

  function setActiveNav(label) {
    navButtons.forEach((btn) => {
      const text = btn.querySelector('.label')?.textContent?.trim();
      const isActive = text === label;
      btn.classList.toggle('active', isActive);
    });
  }

  function initCarousel() {
    if (!carousel || !carouselItems.length) return;

    // Clone slides for infinite looping
    const firstSlide = carouselItems[0];
    const lastSlide = carouselItems[carouselItems.length - 1];
    const firstClone = firstSlide.cloneNode(true);
    const lastClone = lastSlide.cloneNode(true);

    carousel.appendChild(firstClone);
    carousel.insertBefore(lastClone, firstSlide);

    const allItems = Array.from(carousel.querySelectorAll('.carousel-item'));
    let activeIndex = 1; // starts on the original first slide (after the clone)
    let autoSlide = null;

    const getGap = () => parseFloat(getComputedStyle(carousel).gap) || 12;

    const calculateTranslate = (index) => {
      const gap = getGap();
      const itemWidth = allItems[0].offsetWidth;
      const containerWidth = carousel.offsetWidth;
      const centerOffset = (containerWidth - itemWidth) / 2;
      return -index * (itemWidth + gap) + centerOffset;
    };

    const setTransform = (value, animated = true) => {
      carousel.style.transition = animated ? 'transform 0.6s ease' : 'none';
      carousel.style.transform = `translateX(${value}px)`;
    };

    const setActiveItem = (index, animate = true) => {
      allItems.forEach((item, idx) => {
        item.classList.toggle('active', idx === index);
      });
      setTransform(calculateTranslate(index), animate);
    };

    const resetToIndex = (index) => {
      // Jump without animation
      setActiveItem(index, false);
      requestAnimationFrame(() => {
        // restore animation for next move
        setTransform(calculateTranslate(index), true);
      });
    };

    const startAutoSlide = () => {
      stopAutoSlide();
      autoSlide = setInterval(() => {
        activeIndex += 1;
        setActiveItem(activeIndex);

        // If we land on the cloned first slide, reset to real first slide
        if (activeIndex === allItems.length - 1) {
          activeIndex = 1;
          setTimeout(() => resetToIndex(activeIndex), 610);
        }
      }, 3000);
    };

    const stopAutoSlide = () => {
      if (autoSlide) {
        clearInterval(autoSlide);
        autoSlide = null;
      }
    };

    allItems.forEach((item, index) => {
      item.addEventListener('click', (event) => {
        event.preventDefault();
        // Align clicked item to center
        activeIndex = index;
        setActiveItem(activeIndex);
        setActiveNav('Perfil');
      });
    });

    // Keep carousel centered on resize
    window.addEventListener('resize', () => setActiveItem(activeIndex, false));

    setActiveItem(activeIndex, false);
    startAutoSlide();
  }

  function initUsageIndicators() {
    const indicators = Array.from(document.querySelectorAll('.indicator-dot'));
    indicators.forEach((dot) => {
      dot.addEventListener('click', () => {
        const type = dot.dataset.type;
        if (type) {
          switchTuentiCircle(type);
        }
      });
    });
  }

  function renderServices() {
    const services = [
      { icon: '➕', label: 'Asocia una línea' },
      { icon: '💳', label: 'Suscripción' },
      { icon: '📶', label: 'Activa un chip' },
      { icon: '📦', label: 'Pide un chip' },
      { icon: '📞', label: 'Llámame' },
      { icon: '💸', label: 'Recárgame' },
    ];

    servicesGrid.innerHTML = services
      .map(
        (service) => `
        <button class="service-card" type="button">
          <div class="service-icon">${service.icon}</div>
          <span class="service-label">${service.label}</span>
        </button>
      `
      )
      .join('');
  }

  renderServices();
  initDashboardsCarousel();

  function initDashboardsCarousel() {
    const track = document.querySelector('.dashboards-track');
    const dots = Array.from(document.querySelectorAll('.dashboard-dot'));
    let currentDashboardIndex = 0;

    function goToDashboard(index) {
      if (index < 0 || index >= dots.length) return;
      currentDashboardIndex = index;
      const translateX = -index * 50; // 50% per step to show 2 cards
      track.style.transform = `translateX(${translateX}%)`;
      dots.forEach((dot, i) => {
        dot.classList.toggle('dashboard-dot--active', i === index);
      });
    }

    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        goToDashboard(index);
      });
    });

    // Initialize circles
    const cards = document.querySelectorAll('.dashboard-card');
    cards.forEach(card => {
      const progress = parseFloat(card.dataset.progress) || 0;
      const progressCircle = card.querySelector('.tuenti-circle-progress');
      if (progressCircle) {
        const circumference = 314.16;
        const offset = circumference * (1 - progress);
        progressCircle.style.strokeDashoffset = offset;
      }
    });

    goToDashboard(0);
  }
});
