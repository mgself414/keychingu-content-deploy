/**
 * KeyChinGu Content Catalog — Filter Logic (v3 — search + area + pagination + favorites)
 * Vanilla JS, no dependencies.
 */
(function () {
  'use strict';

  let activeCategories = [];   // 다중선택 (2026-07-10 P2) — facet 내 OR, facet 간 AND
  let activeTag = null;
  let activeArea = null;
  let searchQuery = '';
  let showFavoritesOnly = false;
  let currentPage = 1;
  const PAGE_SIZE = 24;

  const CAT_COLORS = {
    A: '#218CCC', B: '#2E8B57', C: '#D94C53', D: '#FAAD19',
    E: '#E79397', F: '#6AB2DC', G: '#9B59B6', H: '#34495E', I: '#5C6BC0'
  };
  // 카테고리 아이콘 (숫자 워터마크 대체, 흰 stroke 24x24) — 단순 기하 심볼(이모지 지양, 브랜드룰)
  const CAT_ICONS = {
    A: 'M4 21V7l5-3 5 3v14M14 21v-9l6-3v12M3 21h18M7.5 10h.5M7.5 14h.5M11 10h.5M11 14h.5',
    B: 'M3 20l6-9 3 4 3-6 6 11z',
    C: 'M5 11h14a7 7 0 0 1-14 0zM8 11V7M12 11V6M16 11V7M5 21h14',
    D: 'M3 21h18M5 21V10l7-5 7 5v11M10 21v-6h4v6',
    E: 'M12 3l1.9 5.6L19.5 10l-5.6 1.4L12 17l-1.9-5.6L4.5 10l5.6-1.4z',
    F: 'M6 8h12l-1 12H7zM9 8V6a3 3 0 0 1 6 0v2',
    G: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
    H: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM15.5 8.5l-2 5-5 2 2-5z',
    I: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'
  };
  var NOW_MS = new Date().getTime();
  function catIconSVG(cat) {
    return '<svg class="cat-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="' +
      (CAT_ICONS[cat] || CAT_ICONS.H) + '"/></svg>';
  }
  function isNew(item) {   // 최근 30일 발행 = NEW
    if (!item.date_published) return false;
    var t = new Date(item.date_published).getTime();
    return !isNaN(t) && (NOW_MS - t) < 30 * 864e5;
  }

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
  const IS_EN = /\/(en|ja|zh)\//.test(window.location.pathname);
  const DATA_PATH = IS_EN ? '../data/contents.json' : 'data/contents.json';
  const INDEX_PATH = IS_EN ? '../data/search-index.json' : 'data/search-index.json';

  // ── 검색 강화 (2026-07-10): 본문 색인 + 동의어 + 필드가중 랭킹 ──
  // 동의어 그룹 (한국 여행 도메인) — 한 단어 검색이 유의어까지 매칭. '밤'은 과광범위라 제외.
  const SYN_GROUPS = [
    ['야간','심야','늦은','자정','24시','24시간','밤샘','night','nighttime','late-night','midnight','evening'],
    ['카페','cafe','coffee','커피','로스터리','roastery','coffeeshop'],
    ['맛집','먹거리','음식','food','restaurant','eat','dining','cuisine','gourmet'],
    ['술집','바','pub','bar','포차','포장마차','술','drink','izakaya'],
    ['쇼핑','shopping','mall','백화점','아울렛','store','shop'],
    ['시장','market','재래시장','전통시장'],
    ['숙소','호텔','hotel','stay','게스트하우스','guesthouse','hostel','숙박','accommodation'],
    ['명소','관광지','랜드마크','attraction','landmark','spot','sightseeing'],
    ['자연','공원','park','산','mountain','강','river','hiking','트레킹','trek'],
    ['한복','hanbok','전통','traditional','문화','culture'],
    ['화장품','뷰티','beauty','kbeauty','cosmetic','스킨케어','makeup','메이크업'],
    ['kpop','k-pop','아이돌','idol','콘서트','concert'],
    ['드라마','k-drama','kdrama','촬영지','filming'],
    ['디저트','dessert','베이커리','bakery','빵','케이크','cake','빙수','bingsu'],
    ['가족','family','아이','kids','children','어린이'],
    ['커플','couple','데이트','date','romantic','로맨틱'],
    ['가성비','budget','저렴','cheap','value','실속'],
    ['럭셔리','luxury','고급','premium','미쉐린','michelin'],
    ['교통','transport','지하철','subway','버스','bus','ktx','택시','taxi'],
    ['사진','photo','인생샷','인스타','instagram','포토','snapshot'],
    ['비건','vegan','채식','vegetarian','할랄','halal'],
    ['온천','스파','spa','찜질방','jjimjilbang','사우나','sauna','massage','마사지','웰니스','wellness']
  ];
  var SYN_MAP = {};
  SYN_GROUPS.forEach(function(g) { g.forEach(function(w) { SYN_MAP[w] = g; }); });
  function expandSyn(tok) { return SYN_MAP[tok] || [tok]; }
  var SEARCH_INDEX = null, SEARCH_BY_ID = {}, indexLoading = false;
  function loadSearchIndex() {
    if (SEARCH_INDEX || indexLoading) return;
    indexLoading = true;
    fetch(INDEX_PATH).then(function(r) { return r.json(); }).then(function(d) {
      SEARCH_INDEX = d;
      d.forEach(function(e) { SEARCH_BY_ID[e.i] = e; });
      // 인덱스 로드 후 현재 검색어 있으면 재적용
      if (searchQuery) applyFilters(window.__contents);
    }).catch(function() { indexLoading = false; });
  }
  // 필드가중 스코어 (본문색인+동의어). rawQuery 구절이 제목/요약에 통째면 보너스.
  function scoreEntry(entry, tokens, rawQuery) {
    var W = { ti: 12, tg: 6, su: 4, bo: 1 }, total = 0;
    for (var i = 0; i < tokens.length; i++) {
      var syns = expandSyn(tokens[i]), best = 0;
      ['ti', 'tg', 'su', 'bo'].forEach(function(f) {
        for (var j = 0; j < syns.length; j++) {
          if (entry[f].indexOf(syns[j]) !== -1) { if (W[f] > best) best = W[f]; break; }
        }
      });
      if (best === 0) return 0;  // AND: 모든 토큰이 어딘가엔 있어야
      total += best;
    }
    if (rawQuery.length > 1) {
      if (entry.ti.indexOf(rawQuery) !== -1) total += 20;       // 제목에 구절 통째
      else if (entry.su.indexOf(rawQuery) !== -1) total += 10;  // 요약에 구절 통째
    }
    return total;
  }

  // URL 파라미터 동기화 (?cat=A,C&tag=&area=&q=) — 공유·SEO·뒤로가기 (2026-07-10 P2)
  function syncURL() {
    var p = new URLSearchParams();
    if (activeCategories.length) p.set('cat', activeCategories.join(','));
    if (activeTag) p.set('tag', activeTag);
    if (activeArea) p.set('area', activeArea);
    if (searchQuery) p.set('q', searchQuery);
    var qs = p.toString();
    try { history.replaceState(null, '', qs ? ('?' + qs) : location.pathname); } catch (e) {}
  }
  function readURL() {
    var p = new URLSearchParams(location.search);
    if (p.get('cat')) activeCategories = p.get('cat').split(',').filter(Boolean);
    if (p.get('tag')) activeTag = p.get('tag');
    if (p.get('area')) activeArea = p.get('area');
    if (p.get('q')) searchQuery = p.get('q');
  }
  function restoreActiveButtons() {
    activeCategories.forEach(function(c) {
      var b = document.querySelector('.filter-btn[data-category="' + c + '"]');
      if (b) { b.classList.add('active'); b.setAttribute('aria-pressed', 'true'); }
    });
    if (activeTag) { var t = document.querySelector('.tag-btn[data-tag="' + activeTag + '"]'); if (t) t.classList.add('active'); }
    if (activeArea) { var a = document.querySelector('.area-btn[data-area="' + activeArea + '"]'); if (a) a.classList.add('active'); }
    if (searchQuery) { var s = document.getElementById('search-input'); if (s) s.value = searchQuery; }
  }

  function init() {
    fetch(DATA_PATH)
      .then(r => r.json())
      .then(data => {
        window.__contents = data;
        readURL();
        bindFilters(data);
        bindSearch(data);
        bindFavToggle(data);
        bindFilterToggle();
        decorateFilterButtons();
        populateSearchSuggestions(data);
        restoreActiveButtons();
        applyFilters(data);
        updateFavCount();
        if (searchQuery) loadSearchIndex();   // ?q= 진입 시 본문 색인 로드
      })
      .catch(err => console.error('[filter.js] failed to load', DATA_PATH, err));
  }

  // 카테고리 필터를 아이콘 퀵메뉴로 장식 (2026-07-10 P3, 보험사 아이콘 카드형)
  function decorateFilterButtons() {
    document.querySelectorAll('.filter-btn[data-category]').forEach(function(btn) {
      if (btn.querySelector('.qm-icon')) return;
      var cat = btn.dataset.category;
      var label = btn.textContent.trim();
      btn.innerHTML = '<svg class="qm-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="' +
        (CAT_ICONS[cat] || CAT_ICONS.H) + '"/></svg><span>' + label + '</span>';
      btn.setAttribute('aria-pressed', 'false');
    });
  }

  // 접이식 필터 패널 토글 (태그·지역 70버튼 과밀 해소 — 기본 접힘)
  function bindFilterToggle() {
    var toggle = document.getElementById('filter-toggle');
    var panel = document.getElementById('filter-collapse');
    if (!toggle || !panel) return;
    toggle.addEventListener('click', function() {
      var open = panel.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.classList.toggle('active', open);
    });
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
        H: lang === 'en' ? 'Practical' : '실용',
        I: lang === 'en' ? 'Nightlife' : '나이트'
      };
      const catLabel = catLabels[item.category] || item.category;
      const detailHref = 'content/' + item.slug + (lang === 'en' ? '.en' : '') + '.html';
      const favClass = isFavorite(item.id) ? 'fav-btn active' : 'fav-btn';
      const newBadge = isNew(item) ? '<span class="new-badge">NEW</span>' : '';
      const tagsHtml = item.tags.slice(0, 3).map(function(t) { return '<span>' + t + '</span>'; }).join('');
      return '<div class="card-wrap">' +
        '<button class="' + favClass + '" data-id="' + item.id + '" aria-label="favorite" title="' + (lang === 'en' ? 'Toggle favorite' : '즐겨찾기') + '">★</button>' +
        '<a href="' + detailHref + '" class="card" data-category="' + item.category + '" data-tags="' + item.tags.join(',') + '">' +
        '<div class="card-cover" style="background:linear-gradient(135deg,' + color + ' 0%,' + color + 'cc 100%);">' +
        '<span class="cat-badge">' + catLabel + '</span>' + newBadge +
        catIconSVG(item.category) +
        '</div>' +
        '<div class="card-body">' +
        '<h3>' + title + '</h3>' +
        '<p>' + summary + '</p>' +
        '<div class="card-tags">' + tagsHtml + '</div>' +
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
    if (activeCategories.length) {
      filtered = filtered.filter(function(item) { return activeCategories.indexOf(item.category) !== -1; });
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
      var rawQuery = searchQuery.toLowerCase().trim();
      var tokens = rawQuery.split(/[\s+]+/).filter(Boolean);
      var floor = tokens.length * 2;   // 관련도 하한 (순수 본문-우연매칭 배제)
      if (SEARCH_INDEX) {
        // 본문 색인 + 동의어 + 필드가중 (2026-07-10 강화)
        filtered = filtered.map(function(item) {
          var entry = SEARCH_BY_ID[item.id];
          var sc = entry ? scoreEntry(entry, tokens, rawQuery) : 0;
          return { item: item, score: sc };
        }).filter(function(r) { return r.score >= floor; })
          .sort(function(a, b) { return b.score - a.score; })
          .map(function(r) { return r.item; });
      } else {
        // 인덱스 로드 전 폴백: 제목/요약/태그만 (동의어 적용)
        filtered = filtered.map(function(item) {
          var hay = ((item.title_kr || '') + ' ' + (item.title_en || '') + ' ' +
            (item.title_ja || '') + ' ' + (item.title_zh || '') + ' ' + (item.tags || []).join(' ') + ' ' +
            (item.summary_kr || '') + ' ' + (item.summary_en || '') + ' ' +
            (item.summary_ja || '') + ' ' + (item.summary_zh || '')).toLowerCase();
          var ok = true, score = 0;
          tokens.forEach(function(t) {
            var syns = expandSyn(t), m = false;
            for (var j = 0; j < syns.length; j++) { if (hay.indexOf(syns[j]) !== -1) { m = true; break; } }
            if (!m) ok = false; else score += 1;
          });
          return { item: item, score: ok ? score : 0 };
        }).filter(function(r) { return r.score > 0; })
          .sort(function(a, b) { return b.score - a.score; })
          .map(function(r) { return r.item; });
      }
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

    // 검색 또는 정렬 active 시 중간 nav 숨기고 card-grid 바로 노출
    var midSections = document.querySelectorAll('.area-bar, .area-landing-nav');
    var sortBy = (document.getElementById('sort-select') || {}).value;
    var isActive = !!searchQuery || !!sortBy || activeCategories.length || !!activeTag || !!activeArea || showFavoritesOnly;
    midSections.forEach(function(el) {
      el.style.display = isActive ? 'none' : '';
    });
  }

  function bindFilters(data) {
    document.querySelectorAll('.filter-btn').forEach(function(btn) {
      btn.addEventListener('click', function () {
        var cat = this.dataset.category;
        var idx = activeCategories.indexOf(cat);
        if (idx !== -1) { activeCategories.splice(idx, 1); this.classList.remove('active'); }
        else { activeCategories.push(cat); this.classList.add('active'); }
        this.setAttribute('aria-pressed', idx === -1 ? 'true' : 'false');
        currentPage = 1;
        syncURL();
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
        syncURL();
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
        syncURL();
        applyFilters(data);
      });
    });
  }

  function bindSearch(data) {
    const input = document.getElementById('search-input');
    if (!input) return;
    // 검색창 포커스/입력 시 본문 색인 지연로드 (첫 검색 1회)
    input.addEventListener('focus', loadSearchIndex);
    let debounce;
    input.addEventListener('input', function () {
      loadSearchIndex();
      clearTimeout(debounce);
      debounce = setTimeout(function () {
        searchQuery = input.value.trim();
        currentPage = 1;
        syncURL();
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
