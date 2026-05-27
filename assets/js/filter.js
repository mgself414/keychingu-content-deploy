/**
 * KeyChinGu Content Catalog — Filter Logic (v3 — search + area + pagination + favorites)
 * Vanilla JS, no dependencies.
 */
(function () {
  'use strict';

  let activeCategory = null;
  let activeTag = null;
  let activeArea = null;
  let searchQuery = '';
  let showFavoritesOnly = false;
  let currentPage = 1;
  const PAGE_SIZE = 24;

  const CAT_COLORS = {
    A: '#218CCC', B: '#2E8B57', C: '#D94C53', D: '#FAAD19',
    E: '#E79397', F: '#6AB2DC', G: '#9B59B6', H: '#34495E'
  };

  // Favorites — localStorage backed
  function getFavorites() {
    try {
      return JSON.parse(localStorage.getItem('kc_favorites') || '[]');
    } catch (e) { return []; }
  }
  function setFavorites(arr) {
    localStorage.setItem('kc_favorites', JSON.stringify(arr));
  }
  function isFavorite(id) {
    return getFavorites().indexOf(String(id)) !== -1;
  }
  function toggleFavorite(id) {
    const favs = getFavorites();
    const idx = favs.indexOf(String(id));
    if (idx === -1) favs.push(String(id));
    else favs.splice(idx, 1);
    setFavorites(favs);
    updateFavCount();
  }
  function updateFavCount() {
    const el = document.getElementById('fav-count');
    if (el) {
      const count = getFavorites().length;
      el.textContent = count > 0 ? '(' + count + ')' : '';
    }
  }

  // 페이지 위치에 따라 contents.json 경로 자동 결정 (KR / EN 호환)
  const IS_EN = /\/en\//.test(window.location.pathname);
  const DATA_PATH = IS_EN ? '../data/contents.json' : 'data/contents.json';

  function init() {
    fetch(DATA_PATH)
      .then(r => r.json())
      .then(data => {
        window.__contents = data;
        applyFilters(data);
        bindFilters(data);
        bindSearch(data);
        bindFavToggle(data);
        populateSearchSuggestions(data);
        updateFavCount();
      })
      .catch(err => console.error('[filter.js] failed to load', DATA_PATH, err));
  }

  function populateSearchSuggestions(data) {
    const dl = document.getElementById('search-suggestions');
    if (!dl) return;
    const set = new Set();
    data.forEach(function(item) {
      if (item.title_kr) set.add(item.title_kr);
      if (item.title_en) set.add(item.title_en);
      (item.tags || []).forEach(function(t) { if (t) set.add(t); });
    });
    const opts = Array.from(set).sort().map(function(v) {
      var safe = v.replace(/"/g, '&quot;');
      return '<option value="' + safe + '">';
    }).join('');
    dl.innerHTML = opts;
  }

  function getLang() {
    return document.documentElement.lang === 'en' ? 'en' : 'kr';
  }

  function updateCount(filtered, total) {
    const el = document.getElementById('result-count');
    if (!el) return;
    const lang = getLang();
    if (filtered === total) {
      el.textContent = lang === 'en' ? total + ' guides' : total + '개 가이드';
    } else {
      el.textContent = lang === 'en'
        ? filtered + ' / ' + total + ' guides'
        : filtered + ' / ' + total + '개 일치';
    }
  }

  function renderCards(items) {
    const grid = document.getElementById('card-grid');
    const lang = getLang();
    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = 1;

    if (!totalItems) {
      grid.innerHTML = '<div class="no-results">' +
        (lang === 'en' ? 'No content matches your filters.' : '필터 조건에 맞는 콘텐츠가 없습니다.') +
        '</div>';
      renderPagination(0, 1);
      return;
    }

    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const pageItems = items.slice(startIdx, startIdx + PAGE_SIZE);

    grid.innerHTML = pageItems.map(item => {
      const title = lang === 'en' ? item.title_en : item.title_kr;
      const summary = lang === 'en' ? item.summary_en : item.summary_kr;
      const color = CAT_COLORS[item.category] || '#D94C53';
      const catLabels = {
        A: lang === 'en' ? 'Neighborhood' : '동네',
        B: lang === 'en' ? 'Nature' : '자연',
        C: lang === 'en' ? 'Food' : '먹거리',
        D: lang === 'en' ? 'Culture' : '문화',
        E: lang === 'en' ? 'Beauty' : '뷰티',
        F: lang === 'en' ? 'Shopping' : '쇼핑',
        G: lang === 'en' ? 'K-Content' : 'K-콘텐츠',
        H: lang === 'en' ? 'Practical' : '실용'
      };
      const catLabel = catLabels[item.category] || item.category;
      const detailHref = 'content/' + item.slug + (lang === 'en' ? '.en' : '') + '.html';
      const favClass = isFavorite(item.id) ? 'fav-btn active' : 'fav-btn';
      return '<div class="card-wrap">' +
        '<button class="' + favClass + '" data-id="' + item.id + '" aria-label="favorite" title="' + (lang === 'en' ? 'Toggle favorite' : '즐겨찾기') + '">★</button>' +
        '<a href="' + detailHref + '" class="card" data-category="' + item.category + '" data-tags="' + item.tags.join(',') + '">' +
        '<div class="card-cover" style="background:linear-gradient(135deg,' + color + ' 0%,' + color + 'cc 100%);">' +
        '<span class="cat-badge" style="background:rgba(0,0,0,0.25);">' + catLabel + '</span>' +
        '<span class="card-num">#' + item.id + '</span>' +
        '</div>' +
        '<div class="card-body">' +
        '<h3>' + title + '</h3>' +
        '<p>' + summary + '</p>' +
        '<div class="card-tags">' + item.tags.map(function(t) { return '<span>' + t + '</span>'; }).join('') + '</div>' +
        '</div></a></div>';
    }).join('');

    // Bind fav buttons
    grid.querySelectorAll('.fav-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const id = this.dataset.id;
        toggleFavorite(id);
        this.classList.toggle('active');
      });
    });

    renderPagination(totalItems, totalPages);
  }

  function renderPagination(totalItems, totalPages) {
    const el = document.getElementById('pagination');
    if (!el) return;
    if (totalPages <= 1) {
      el.innerHTML = '';
      return;
    }
    const lang = getLang();
    let html = '<button class="page-btn" data-page="prev"' + (currentPage === 1 ? ' disabled' : '') + '>←</button>';
    // Show all pages if ≤7, else first·current±1·last with ellipsis
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    pages.forEach(function(p) {
      if (p === '...') html += '<span class="page-ellipsis">…</span>';
      else html += '<button class="page-btn' + (p === currentPage ? ' active' : '') + '" data-page="' + p + '">' + p + '</button>';
    });
    html += '<button class="page-btn" data-page="next"' + (currentPage === totalPages ? ' disabled' : '') + '>→</button>';
    el.innerHTML = html;

    el.querySelectorAll('.page-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const p = this.dataset.page;
        if (p === 'prev' && currentPage > 1) currentPage--;
        else if (p === 'next' && currentPage < totalPages) currentPage++;
        else if (!isNaN(parseInt(p))) currentPage = parseInt(p);
        applyFilters(window.__contents);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  function applyFilters(data) {
    let filtered = data;
    if (activeCategory) {
      filtered = filtered.filter(function(item) { return item.category === activeCategory; });
    }
    if (activeTag) {
      filtered = filtered.filter(function(item) { return item.tags.indexOf(activeTag) !== -1; });
    }
    if (activeArea) {
      filtered = filtered.filter(function(item) { return item.tags.indexOf(activeArea) !== -1; });
    }
    if (showFavoritesOnly) {
      const favs = getFavorites();
      filtered = filtered.filter(function(item) { return favs.indexOf(String(item.id)) !== -1; });
    }
    if (searchQuery) {
      // 멀티 키워드 분리 (공백 또는 +)
      const tokens = searchQuery.toLowerCase().split(/[\s+]+/).filter(Boolean);
      filtered = filtered.map(function(item) {
        // ranking score: title 매치 = 10, tags 매치 = 5, summary 매치 = 2, slug/id = 1
        var score = 0;
        const titleKr = (item.title_kr || '').toLowerCase();
        const titleEn = (item.title_en || '').toLowerCase();
        const tagsLow = (item.tags || []).join(' ').toLowerCase();
        const summaryKr = (item.summary_kr || '').toLowerCase();
        const summaryEn = (item.summary_en || '').toLowerCase();
        const slug = (item.slug || '').toLowerCase();
        const idStr = '#' + item.id;
        var allMatch = true;
        tokens.forEach(function(t) {
          var matched = false;
          if (titleKr.indexOf(t) !== -1) { score += 10; matched = true; }
          if (titleEn.indexOf(t) !== -1) { score += 10; matched = true; }
          if (tagsLow.indexOf(t) !== -1) { score += 5; matched = true; }
          if (summaryKr.indexOf(t) !== -1) { score += 2; matched = true; }
          if (summaryEn.indexOf(t) !== -1) { score += 2; matched = true; }
          if (slug.indexOf(t) !== -1) { score += 1; matched = true; }
          if (idStr.indexOf(t) !== -1) { score += 1; matched = true; }
          if (!matched) allMatch = false;
        });
        return { item: item, score: allMatch ? score : 0 };
      }).filter(function(r) { return r.score > 0; })
        .sort(function(a, b) { return b.score - a.score; })
        .map(function(r) { return r.item; });
    } else {
      // 검색 없을 때 정렬 옵션 적용
      const sortBy = (document.getElementById('sort-select') || {}).value;
      if (sortBy === 'id-desc') {
        filtered = filtered.slice().sort(function(a, b) { return parseInt(b.id) - parseInt(a.id); });
      } else if (sortBy === 'id-asc') {
        filtered = filtered.slice().sort(function(a, b) { return parseInt(a.id) - parseInt(b.id); });
      } else if (sortBy === 'category') {
        filtered = filtered.slice().sort(function(a, b) { return (a.category || '').localeCompare(b.category || ''); });
      }
      // default: 입력 순서 유지
    }
    renderCards(filtered);
    updateCount(filtered.length, data.length);
  }

  function bindFilters(data) {
    document.querySelectorAll('.filter-btn').forEach(function(btn) {
      btn.addEventListener('click', function () {
        var cat = this.dataset.category;
        if (activeCategory === cat) {
          activeCategory = null;
          this.classList.remove('active');
        } else {
          activeCategory = cat;
          document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
          this.classList.add('active');
        }
        currentPage = 1;
        applyFilters(data);
      });
    });
    document.querySelectorAll('.tag-btn').forEach(function(btn) {
      btn.addEventListener('click', function () {
        var tag = this.dataset.tag;
        if (activeTag === tag) {
          activeTag = null;
          this.classList.remove('active');
        } else {
          activeTag = tag;
          document.querySelectorAll('.tag-btn').forEach(function(b) { b.classList.remove('active'); });
          this.classList.add('active');
        }
        currentPage = 1;
        applyFilters(data);
      });
    });
    document.querySelectorAll('.area-btn').forEach(function(btn) {
      btn.addEventListener('click', function () {
        var area = this.dataset.area;
        if (activeArea === area) {
          activeArea = null;
          this.classList.remove('active');
        } else {
          activeArea = area;
          document.querySelectorAll('.area-btn').forEach(function(b) { b.classList.remove('active'); });
          this.classList.add('active');
        }
        currentPage = 1;
        applyFilters(data);
      });
    });
  }

  function bindSearch(data) {
    const input = document.getElementById('search-input');
    if (!input) return;
    let debounce;
    input.addEventListener('input', function () {
      clearTimeout(debounce);
      debounce = setTimeout(function () {
        searchQuery = input.value.trim();
        currentPage = 1;
        applyFilters(data);
      }, 150);
    });
    // 정렬 select binding
    const sortEl = document.getElementById('sort-select');
    if (sortEl) {
      sortEl.addEventListener('change', function() {
        currentPage = 1;
        applyFilters(data);
      });
    }
  }

  function bindFavToggle(data) {
    const btn = document.getElementById('fav-toggle');
    if (!btn) return;
    btn.addEventListener('click', function() {
      showFavoritesOnly = !showFavoritesOnly;
      this.classList.toggle('active');
      currentPage = 1;
      applyFilters(data);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
