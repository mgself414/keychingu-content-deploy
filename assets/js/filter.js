/**
 * KeyChinGu Content Catalog — Filter Logic
 * Vanilla JS, no dependencies.
 */
(function () {
  'use strict';

  let activeCategory = null;
  let activeTag = null;

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
        bindFilters(data);
      });
  }

  function getLang() {
    return document.documentElement.lang === 'en' ? 'en' : 'kr';
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
    renderCards(filtered);
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
