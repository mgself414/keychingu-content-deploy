/**
 * KeyChinGu Content Catalog — Filter Logic (v2 — search + area)
 * Vanilla JS, no dependencies.
 */
(function () {
  'use strict';

  let activeCategory = null;
  let activeTag = null;
  let activeArea = null;
  let searchQuery = '';

  const CAT_COLORS = {
    A: '#218CCC', B: '#2E8B57', C: '#D94C53', D: '#FAAD19',
    E: '#E79397', F: '#6AB2DC', G: '#9B59B6', H: '#34495E'
  };

  function init() {
    fetch('data/contents.json')
      .then(r => r.json())
      .then(data => {
        window.__contents = data;
        renderCards(data);
        updateCount(data.length, data.length);
        bindFilters(data);
        bindSearch(data);
      });
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
    if (!items.length) {
      grid.innerHTML = '<div class="no-results">' +
        (lang === 'en' ? 'No content matches your filters.' : '필터 조건에 맞는 콘텐츠가 없습니다.') +
        '</div>';
      return;
    }
    grid.innerHTML = items.map(item => {
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
      return '<a href="' + detailHref + '" class="card" data-category="' + item.category + '" data-tags="' + item.tags.join(',') + '">' +
        '<div class="card-cover" style="background:linear-gradient(135deg,' + color + ' 0%,' + color + 'cc 100%);">' +
        '<span class="cat-badge" style="background:rgba(0,0,0,0.25);">' + catLabel + '</span>' +
        '<span class="card-num">#' + item.id + '</span>' +
        '</div>' +
        '<div class="card-body">' +
        '<h3>' + title + '</h3>' +
        '<p>' + summary + '</p>' +
        '<div class="card-tags">' + item.tags.map(function(t) { return '<span>' + t + '</span>'; }).join('') + '</div>' +
        '</div></a>';
    }).join('');
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
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(function(item) {
        const haystack = [
          item.title_kr || '',
          item.title_en || '',
          item.summary_kr || '',
          item.summary_en || '',
          (item.tags || []).join(' '),
          item.slug || '',
          '#' + item.id
        ].join(' ').toLowerCase();
        return haystack.indexOf(q) !== -1;
      });
    }
    renderCards(filtered);
    updateCount(filtered.length, data.length);
  }

  function bindFilters(data) {
    // Category buttons
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
        applyFilters(data);
      });
    });
    // Tag buttons
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
        applyFilters(data);
      });
    });
    // Area buttons
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
        applyFilters(data);
      }, 150);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
