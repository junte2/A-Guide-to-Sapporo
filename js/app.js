// ============================================================
//  app.js – Sapporo Travel Guide SPA
// ============================================================

(function () {
  'use strict';

  /* ── State ─────────────────────────────────────────────── */
  const state = {
    activeCategory: 'all',
    searchQuery: '',
  };

  /* ── DOM refs ──────────────────────────────────────────── */
  const navEl        = document.getElementById('category-nav');
  const mainEl       = document.getElementById('main-content');
  const searchEl     = document.getElementById('search-input');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalInner   = document.getElementById('modal-inner');
  const scrollTopBtn = document.getElementById('scroll-top');

  /* ── Helpers ───────────────────────────────────────────── */
  function stars(n) {
    let s = '';
    for (let i = 1; i <= 5; i++) {
      s += `<span class="${i <= n ? 'star-filled' : 'star-empty'}">★</span>`;
    }
    return s;
  }

  function mapsUrl(query) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query + ' 札幌')}`;
  }

  function mapsEmbedUrl(query) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  }

  function categoryById(id) {
    return CATEGORIES.find(c => c.id === id) || {};
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  /* ── Build Navigation ──────────────────────────────────── */
  function buildNav() {
    const html = [`
      <button class="nav-btn active" data-cat="all">
        <span class="btn-emoji">🗺️</span>すべて
      </button>
    `];

    CATEGORIES.forEach(cat => {
      html.push(`
        <button class="nav-btn" data-cat="${cat.id}">
          <span class="btn-emoji">${cat.icon}</span>${cat.name}
        </button>
      `);
    });

    navEl.querySelector('.category-nav-inner').innerHTML = html.join('');

    navEl.addEventListener('click', e => {
      const btn = e.target.closest('.nav-btn');
      if (!btn) return;
      navEl.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeCategory = btn.dataset.cat;
      render();

      // scroll the clicked btn into view
      btn.scrollIntoView({ inline: 'nearest', behavior: 'smooth' });
    });
  }

  /* ── Build card HTML ───────────────────────────────────── */
  function cardHtml(place) {
    const cat   = categoryById(place.category);
    const color = cat.color || '#555';
    const bg    = hexToRgba(color, 0.12);

    const featuredBadge = place.featured
      ? `<span class="card-featured-badge">⭐ おすすめ</span>`
      : '';

    const highlightHtml = place.highlight
      ? `<div class="card-highlight" style="background:${hexToRgba(color,.12)};color:${color}">
           ✦ ${place.highlight}
         </div>`
      : '';

    const seasonHtml = place.season
      ? `<div class="season-badge">🗓️ ${place.season}</div>`
      : '';

    const tagsHtml = (place.tags || []).slice(0, 4).map(t =>
      `<span class="card-tag">${t}</span>`
    ).join('');

    return `
      <article class="place-card" data-id="${place.id}" role="button" tabindex="0" aria-label="${place.name}の詳細を見る">
        <div class="card-header" style="background:${bg}">
          <span aria-hidden="true">${cat.icon || '📍'}</span>
          ${featuredBadge}
        </div>
        <div class="card-body">
          ${seasonHtml}
          <div class="card-name">${place.name}</div>
          <div class="card-name-en">${place.nameEn}</div>
          ${highlightHtml}
          <p class="card-desc">${place.description}</p>
          <div class="card-meta">
            <div class="card-rating" title="${place.rating}つ星" aria-label="${place.rating}つ星">
              ${stars(place.rating)}
            </div>
            ${place.budget ? `<span class="card-budget">💴 ${place.budget}</span>` : ''}
          </div>
          <div class="card-tags">${tagsHtml}</div>
        </div>
        <div class="card-footer">
          <div class="card-address">
            <i class="fas fa-map-marker-alt" aria-hidden="true"></i>
            <span>${place.nearest || place.address}</span>
          </div>
          <a href="${mapsUrl(place.mapQuery)}" target="_blank" rel="noopener noreferrer"
             class="btn-map" aria-label="${place.name}のGoogle Mapsを開く" onclick="event.stopPropagation()">
            <i class="fab fa-google" aria-hidden="true"></i>地図
          </a>
        </div>
      </article>
    `;
  }

  /* ── Build category section HTML ───────────────────────── */
  function sectionHtml(cat, places) {
    if (!places.length) return '';

    const color = cat.color || '#555';
    const bg    = hexToRgba(color, 0.12);

    const cardsHtml = places.map(cardHtml).join('') ||
      `<div class="no-results">
         <i class="fas fa-search-minus" aria-hidden="true"></i>
         <p>検索結果がありません</p>
       </div>`;

    return `
      <section class="category-section" id="section-${cat.id}">
        <div class="section-header">
          <div class="section-icon" style="background:${bg}; color:${color}"
               aria-hidden="true">${cat.icon}</div>
          <div class="section-info">
            <h2>${cat.name}</h2>
            <p>${cat.description}</p>
          </div>
        </div>
        <div class="cards-grid">
          ${cardsHtml}
        </div>
      </section>
    `;
  }

  /* ── Filter logic ──────────────────────────────────────── */
  function filteredPlaces() {
    const q = state.searchQuery.toLowerCase().trim();
    return PLACES.filter(p => {
      const catMatch = state.activeCategory === 'all' || p.category === state.activeCategory;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.tags || []).some(t => t.toLowerCase().includes(q)) ||
        (p.highlight || '').toLowerCase().includes(q)
      );
    });
  }

  /* ── Render main content ───────────────────────────────── */
  function render() {
    const places = filteredPlaces();
    const sectionsToShow = state.activeCategory === 'all'
      ? CATEGORIES
      : CATEGORIES.filter(c => c.id === state.activeCategory);

    const html = sectionsToShow.map(cat => {
      const catPlaces = places.filter(p => p.category === cat.id);
      return sectionHtml(cat, catPlaces);
    }).join('');

    mainEl.innerHTML = html || `
      <div class="no-results" style="padding:5rem 1rem;text-align:center">
        <i class="fas fa-search-minus" style="font-size:3rem;margin-bottom:1rem;display:block;opacity:.4" aria-hidden="true"></i>
        <p style="color:#64748b">「${state.searchQuery}」に一致するスポットが見つかりませんでした</p>
      </div>
    `;

    // attach card click handlers
    mainEl.querySelectorAll('.place-card').forEach(card => {
      card.addEventListener('click', () => openModal(card.dataset.id));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(card.dataset.id);
        }
      });
    });
  }

  /* ── Modal ─────────────────────────────────────────────── */
  function openModal(id) {
    const place = PLACES.find(p => p.id === id);
    if (!place) return;

    const cat   = categoryById(place.category);
    const color = cat.color || '#555';
    const bg    = hexToRgba(color, 0.15);

    const highlightHtml = place.highlight
      ? `<div class="modal-highlight" style="background:${hexToRgba(color,.12)};color:${color}">
           ✦ ${place.highlight}
         </div>`
      : '';

    const seasonHtml = place.season
      ? `<div class="season-badge" style="margin-bottom:.75rem">🗓️ ${place.season}</div>`
      : '';

    const infoItems = [
      { icon: 'fa-map-marker-alt', label: '住所',       value: place.address },
      { icon: 'fa-train',          label: '最寄り',      value: place.nearest },
      { icon: 'fa-clock',          label: '営業時間',    value: place.hours },
      { icon: 'fa-calendar-times', label: '定休日',      value: place.closed },
      { icon: 'fa-yen-sign',       label: '予算目安',    value: place.budget },
    ].filter(i => i.value);

    const infoHtml = infoItems.map(i => `
      <div class="modal-info-item">
        <div class="modal-info-label">
          <i class="fas ${i.icon}" aria-hidden="true"></i>${i.label}
        </div>
        <div class="modal-info-value">${i.value}</div>
      </div>
    `).join('');

    const tagsHtml = (place.tags || []).map(t =>
      `<span class="modal-tag" style="background:${hexToRgba(color,.08)};color:${color}">${t}</span>`
    ).join('');

    modalInner.innerHTML = `
      <div class="modal-header" style="background:${bg}">
        <span style="font-size:5rem" aria-hidden="true">${cat.icon || '📍'}</span>
        <button class="modal-close" id="modal-close-btn" aria-label="閉じる">
          <i class="fas fa-times" aria-hidden="true"></i>
        </button>
      </div>
      <div class="modal-body">
        ${seasonHtml}
        <h2 class="modal-title">${place.name}</h2>
        <div class="modal-title-en">${place.nameEn}</div>
        ${highlightHtml}
        <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.75rem">
          <div class="card-rating" style="font-size:.95rem" aria-label="${place.rating}つ星評価">
            ${stars(place.rating)}
          </div>
          ${place.budget ? `<span class="card-budget">💴 ${place.budget}</span>` : ''}
        </div>
        <p class="modal-desc">${place.description}</p>
        <div class="modal-info-grid">${infoHtml}</div>
        <div class="modal-tags">${tagsHtml}</div>
        <div class="modal-map-wrap">
          <iframe
            src="${mapsEmbedUrl(place.mapQuery)}"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            title="${place.name}の地図"
            allowfullscreen>
          </iframe>
        </div>
        <div class="modal-actions">
          <a href="${mapsUrl(place.mapQuery)}" target="_blank" rel="noopener noreferrer"
             class="btn-primary">
            <i class="fab fa-google" aria-hidden="true"></i>Google Mapsで開く
          </a>
          <button class="btn-secondary" id="modal-close-btn2">
            <i class="fas fa-times" aria-hidden="true"></i>閉じる
          </button>
        </div>
      </div>
    `;

    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('modal-close-btn2').addEventListener('click', closeModal);

    // focus first focusable element inside modal
    setTimeout(() => {
      const focusable = modalInner.querySelector('button, [href], input');
      if (focusable) focusable.focus();
    }, 50);
  }

  function closeModal() {
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ── Snow animation ────────────────────────────────────── */
  function createSnow() {
    const container = document.querySelector('.snow-container');
    if (!container) return;
    const flakes = ['❄', '❅', '❆', '✦', '•'];
    for (let i = 0; i < 28; i++) {
      const el = document.createElement('span');
      el.className = 'snowflake';
      el.textContent = flakes[Math.floor(Math.random() * flakes.length)];
      el.style.left  = Math.random() * 100 + '%';
      el.style.fontSize = (Math.random() * 1 + 0.5) + 'em';
      el.style.opacity  = Math.random() * 0.6 + 0.2;
      el.style.animationDuration  = (Math.random() * 8 + 6) + 's';
      el.style.animationDelay     = (Math.random() * 10) + 's';
      container.appendChild(el);
    }
  }

  /* ── Scroll-to-top ─────────────────────────────────────── */
  function initScrollTop() {
    window.addEventListener('scroll', () => {
      scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ── Search ────────────────────────────────────────────── */
  function initSearch() {
    searchEl.addEventListener('input', e => {
      state.searchQuery = e.target.value;
      // when searching, show all categories
      if (state.searchQuery) {
        state.activeCategory = 'all';
        navEl.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        navEl.querySelector('[data-cat="all"]').classList.add('active');
      }
      render();
    });
  }

  /* ── Close modal on overlay click / Escape ─────────────── */
  function initModalEvents() {
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modalOverlay.classList.contains('open')) {
        closeModal();
      }
    });
  }

  /* ── Hero "探す" button ─────────────────────────────────── */
  function initHeroCta() {
    const cta = document.getElementById('hero-cta');
    if (!cta) return;
    cta.addEventListener('click', e => {
      e.preventDefault();
      const navOffset = navEl.getBoundingClientRect().height;
      const target    = document.getElementById('main-content');
      const top       = target.getBoundingClientRect().top + window.scrollY - navOffset - 16;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  }

  /* ── Init ──────────────────────────────────────────────── */
  function init() {
    buildNav();
    render();
    createSnow();
    initScrollTop();
    initSearch();
    initModalEvents();
    initHeroCta();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
