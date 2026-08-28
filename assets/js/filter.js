/**
 * KeyChinGu Content Catalog — Filter Logic (v4 — 4-language single engine)
 * Vanilla JS, no dependencies. KR·EN·JA·ZH 허브 공용 (html lang 으로 자동 분기).
 */
(function () {
  'use strict';

  // 언어 분기 — html lang="ko|en|ja|zh-CN" 기준. 허브별 인라인 복제(구 3벌) 대체.
  var LANG = (document.documentElement.lang || 'ko').split('-')[0].toLowerCase();
  if (LANG === 'ko') LANG = 'kr';
  var LANG_SUFFIX = { kr: '', en: '.en', ja: '.ja', zh: '.zh' }[LANG] || '';
  var AVAIL_FLAG = { en: 'en_available', ja: 'jp_available', zh: 'cn_available' }[LANG] || null;
  var STR = {
    guides:  { kr: '개 가이드', en: ' guides', ja: '件のガイド', zh: '条指南' },
    noMatch: { kr: '필터 조건에 맞는 콘텐츠가 없습니다.', en: 'No content matches your filters.',
               ja: '該当するコンテンツがありません。', zh: '没有符合条件的内容。' },
    noResult:{ kr: '검색 결과 없음: ', en: 'No results for: ', ja: '検索結果なし: ', zh: '无搜索结果: ' },
    hint:    { kr: '더 넓은 키워드로 검색하거나 필터를 초기화해 보세요.', en: 'Try broader keywords or clear filters.',
               ja: 'より広いキーワードで検索するか、フィルターをリセットしてください。', zh: '请尝试更宽泛的关键词或清除筛选。' },
    fav:     { kr: '즐겨찾기', en: 'Toggle favorite', ja: 'お気に入り', zh: '收藏' },
    vGrid:   { kr: '그리드 보기', en: 'Grid view', ja: 'グリッド表示', zh: '网格视图' },
    vSection:{ kr: '카테고리별 보기', en: 'Group by category', ja: 'カテゴリ別表示', zh: '按分类查看' },
    loadMore:{ kr: '더보기', en: 'Load more', ja: 'もっと見る', zh: '加载更多' },
    remaining:{ kr: '편 남음', en: ' more', ja: '件', zh: '条' }
  };
  function T(key) { return STR[key][LANG] || STR[key].en; }

  let activeCategories = [];   // 다중선택 (2026-07-10 P2) — facet 내 OR, facet 간 AND
  let activeTags = [];    // 다중선택 (2026-08-20 P4) — facet 내 OR, facet 간 AND
  let activeAreas = [];   // 〃
  let searchQuery = '';
  let showFavoritesOnly = false;
  let currentPage = 1;
  const PAGE_SIZE = 24;
  let viewMode = (function(){ try { return localStorage.getItem('kc_view') || 'grid'; } catch(e){ return 'grid'; } })();  // grid|section (2026-07-10 P3)

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

  // 페이지 위치에 따라 경로 자동 결정 (KR 루트 / en·ja·zh 서브디렉터리)
  const IS_SUBDIR = /\/(en|ja|zh)\//.test(window.location.pathname);
  const DATA_PATH = IS_SUBDIR ? '../data/contents.json' : 'data/contents.json';
  const INDEX_PATH = IS_SUBDIR ? '../data/search-index.json' : 'data/search-index.json';
  const CONTENT_PREFIX = IS_SUBDIR ? '../content/' : 'content/';

  // ── 검색 강화 (2026-07-10): 본문 색인 + 동의어 + 필드가중 랭킹 ──
  // 동의어 그룹 (한국 여행 도메인) — 한 단어 검색이 유의어까지 매칭. '밤'은 과광범위라 제외.
  const SYN_GROUPS = [
    ['야간','심야','늦은','자정','24시','24시간','밤샘','night','nighttime','late-night','midnight','evening','夜','夜間','深夜','ナイト','夜间','夜晚'],
    ['카페','cafe','coffee','커피','로스터리','roastery','coffeeshop','カフェ','コーヒー','珈琲','咖啡','咖啡厅','咖啡店'],
    ['맛집','먹거리','음식','food','restaurant','eat','dining','cuisine','gourmet','グルメ','レストラン','飲食','美食','餐厅','餐饮'],
    ['술집','바','pub','bar','포차','포장마차','술','drink','izakaya','居酒屋','お酒','酒吧','小酒馆'],
    ['쇼핑','shopping','mall','백화점','아울렛','store','shop','ショッピング','買い物','デパート','购物','商场','百货'],
    ['시장','market','재래시장','전통시장','市場','市场','传统市场'],
    ['숙소','호텔','hotel','stay','게스트하우스','guesthouse','hostel','숙박','accommodation','ホテル','宿泊','酒店','住宿'],
    ['명소','관광지','랜드마크','attraction','landmark','spot','sightseeing','観光','名所','景点','观光','地标'],
    ['자연','공원','park','산','mountain','강','river','hiking','트레킹','trek','自然','公園','登山','公园','爬山'],
    ['한복','hanbok','전통','traditional','문화','culture','韓服','伝統','文化','韩服','传统'],
    ['화장품','뷰티','beauty','kbeauty','cosmetic','스킨케어','makeup','메이크업','コスメ','美容','化粧','美妆','化妆品'],
    ['kpop','k-pop','아이돌','idol','콘서트','concert','アイドル','コンサート','偶像','演唱会'],
    ['드라마','k-drama','kdrama','촬영지','filming','ドラマ','ロケ地','电视剧','取景地'],
    ['디저트','dessert','베이커리','bakery','빵','케이크','cake','빙수','bingsu','デザート','スイーツ','パン','甜点','面包','冰沙'],
    ['가족','family','아이','kids','children','어린이','家族','子供','家庭','亲子','孩子'],
    ['커플','couple','데이트','date','romantic','로맨틱','カップル','デート','情侣','约会'],
    ['가성비','budget','저렴','cheap','value','실속','安い','格安','平价','实惠'],
    ['럭셔리','luxury','고급','premium','미쉐린','michelin','高級','ラグジュアリー','奢华','高档','米其林'],
    ['교통','transport','지하철','subway','버스','bus','ktx','택시','taxi','地下鉄','交通','地铁','公交'],
    ['사진','photo','인생샷','인스타','instagram','포토','snapshot','写真','インスタ','照片','拍照'],
    ['비건','vegan','채식','vegetarian','할랄','halal','ビーガン','菜食','素食','清真'],
    ['온천','스파','spa','찜질방','jjimjilbang','사우나','sauna','massage','마사지','웰니스','wellness','温泉','マッサージ','汗蒸幕','按摩','水疗']
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
    if (activeTags.length) p.set('tag', activeTags.join(','));
    if (activeAreas.length) p.set('area', activeAreas.join(','));
    if (searchQuery) p.set('q', searchQuery);
    var qs = p.toString();
    try { history.replaceState(null, '', qs ? ('?' + qs) : location.pathname); } catch (e) {}
  }
  function readURL() {
    var p = new URLSearchParams(location.search);
    if (p.get('cat')) activeCategories = p.get('cat').split(',').filter(Boolean);
    if (p.get('tag')) activeTags = p.get('tag').split(',').filter(Boolean);
    if (p.get('area')) activeAreas = p.get('area').split(',').filter(Boolean);
    if (p.get('q')) searchQuery = p.get('q');
  }
  function restoreActiveButtons() {
    activeCategories.forEach(function(c) {
      var b = document.querySelector('.filter-btn[data-category="' + c + '"]');
      if (b) { b.classList.add('active'); b.setAttribute('aria-pressed', 'true'); }
    });
    activeTags.forEach(function(tg) { var t = document.querySelector('.tag-btn[data-tag="' + tg + '"]'); if (t) t.classList.add('active'); });
    activeAreas.forEach(function(ar) { var a = document.querySelector('.area-btn[data-area="' + ar + '"]'); if (a) a.classList.add('active'); });
    if (searchQuery) { var s = document.getElementById('search-input'); if (s) s.value = searchQuery; }
  }

  function init() {
    fetch(DATA_PATH)
      .then(r => r.json())
      .then(data => {
        // 언어판 부재 콘텐츠는 해당 허브에서 숨김 (broken link 방지)
        if (AVAIL_FLAG) data = data.filter(function(it) { return it[AVAIL_FLAG] !== false; });
        window.__contents = data;
        readURL();
        bindFilters(data);
        bindSearch(data);
        bindFavToggle(data);
        bindViewToggle(data);
        decorateFilterButtons();
        populateSearchSuggestions(data);
        restoreActiveButtons();
        bindFilterToggle();   // restoreActiveButtons 이후 — active 복원된 fold 자동 열기
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

  // 뷰 토글(그리드/섹션) 주입 — HTML 수정 없이 검색바에 (2026-07-10 P3)
  function bindViewToggle(data) {
    var bar = document.querySelector('.search-bar');
    if (!bar || document.getElementById('view-toggle')) return;
    var wrap = document.createElement('div');
    wrap.id = 'view-toggle'; wrap.className = 'view-toggle';
    wrap.innerHTML =
      '<button data-view="grid" title="' + T('vGrid') + '" aria-label="grid">▦</button>' +
      '<button data-view="section" title="' + T('vSection') + '" aria-label="section">☰</button>';
    var stats = bar.querySelector('.stats-link');
    if (stats) bar.insertBefore(wrap, stats); else bar.appendChild(wrap);
    function sync() {
      wrap.querySelectorAll('button').forEach(function(b) { b.classList.toggle('active', b.dataset.view === viewMode); });
    }
    sync();
    wrap.querySelectorAll('button').forEach(function(b) {
      b.addEventListener('click', function() {
        viewMode = this.dataset.view;
        try { localStorage.setItem('kc_view', viewMode); } catch (e) {}
        currentPage = 1; sync(); applyFilters(data);
      });
    });
  }

  // 접이식 필터 (B5, 2026-08-16): 네이티브 <details class="filter-fold"> 사용 — JS 불필요.
  // area 필터가 접힘 상태에서 활성일 때 details를 자동으로 열어 현재 상태를 보이게만 보조.
  function bindFilterToggle() {
    if (activeAreas.length || activeTags.length) {
      document.querySelectorAll('details.filter-fold').forEach(function(d) {
        if (d.querySelector('.area-btn.active, .tag-btn.active')) d.open = true;
      });
    }
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
    return LANG;
  }

  function updateCount(filtered, total) {
    const el = document.getElementById('result-count');
    if (!el) return;
    if (filtered === total) {
      el.textContent = total + T('guides');
    } else {
      el.textContent = filtered + ' / ' + total + T('guides');
    }
  }

  // 카테고리 라벨: 허브의 현지화된 필터 버튼 텍스트를 재사용 (라벨 SoT = 마크업 1곳)
  var CAT_LABEL_FALLBACK = {
    A: 'Neighborhood', B: 'Nature', C: 'Food', D: 'Culture', E: 'Beauty',
    F: 'Shopping', G: 'K-Content', H: 'Practical', I: 'Nightlife'
  };
  var CAT_LABEL_KR = {
    A: '동네', B: '자연', C: '먹거리', D: '문화', E: '뷰티',
    F: '쇼핑', G: 'K-콘텐츠', H: '실용', I: '나이트'
  };
  function catLabelFor(cat) {
    var b = document.querySelector('.filter-btn[data-category="' + cat + '"]');
    if (b && b.textContent.trim()) return b.textContent.trim();
    return (LANG === 'kr' ? CAT_LABEL_KR : CAT_LABEL_FALLBACK)[cat] || cat;
  }
  function pickField(item, base) {
    return item[base + '_' + LANG] || item[base + '_en'] || item[base + '_kr'] || '';
  }
  var ASSET_PREFIX = IS_SUBDIR ? '../' : '';
  function coverInnerHTML(item) {
    // 실사진(image 보유 249편) 우선, 실패 시 그라디언트 fallback 유지 (재점검 §7 D2)
    if (!item.image) return '';
    return '<img src="' + ASSET_PREFIX + item.image + '" alt="" loading="lazy" ' +
      'onerror="this.remove()">';
  }
  function coverGradient(item, color) {
    // 동일 카테고리 연속 시 커버 변별력 확보 — id 해시로 각도·톤 미세 변주 (재점검 §7 D3)
    var h = 0, s = String(item.id);
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
    var angle = 105 + (h % 71);                       // 105~175deg
    var alpha = ['b3', 'c4', 'd5', 'e6'][h % 4];      // 두 번째 스톱 톤
    return 'linear-gradient(' + angle + 'deg,' + color + ' 0%,' + color + alpha + ' 100%)';
  }
  function cleanSummary(title, summary) {
    // 구형 summary "제목 — ISSUE NN 시리즈" 중복 노출 완화 폴백 (재점검 §7 D4)
    if (!summary) return '';
    if (summary.indexOf(title) === 0) {
      var rest = summary.slice(title.length).replace(/^[\s—–-]+/, '');
      if (rest.length < 12 || /^ISSUE\s*\d+/i.test(rest)) return '';
      return rest;
    }
    return summary;
  }
  function cardHTML(item) {
    var title = pickField(item, 'title');
    var summary = cleanSummary(title, pickField(item, 'summary'));
    var color = CAT_COLORS[item.category] || '#D94C53';
    var detailHref = CONTENT_PREFIX + item.slug + LANG_SUFFIX + '.html';
    var favClass = isFavorite(item.id) ? 'fav-btn active' : 'fav-btn';
    var newBadge = isNew(item) ? '<span class="new-badge">NEW</span>' : '';
    var tagsHtml = item.tags.slice(0, 3).map(function(t) { return '<span>' + t + '</span>'; }).join('');
    return '<div class="card-wrap">' +
      '<button class="' + favClass + '" data-id="' + item.id + '" aria-label="favorite" title="' + T('fav') + '">★</button>' +
      '<a href="' + detailHref + '" class="card" data-category="' + item.category + '" data-tags="' + item.tags.join(',') + '">' +
      '<div class="card-cover" style="background:' + coverGradient(item, color) + ';">' +
      coverInnerHTML(item) +
      '<span class="cat-badge">' + catLabelFor(item.category) + '</span>' + newBadge +
      catIconSVG(item.category) + '</div>' +
      '<div class="card-body"><h3>' + title + '</h3><p>' + summary + '</p>' +
      '<div class="card-tags">' + tagsHtml + '</div></div></a></div>';
  }
  function bindFavButtons(root) {
    (root || document.getElementById('card-grid')).querySelectorAll('.fav-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        toggleFavorite(this.dataset.id); this.classList.toggle('active');
      });
    });
  }
  var CAT_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
  function renderSectioned(items) {
    var grid = document.getElementById('card-grid');
    var byCat = {};
    items.forEach(function(it) { (byCat[it.category] = byCat[it.category] || []).push(it); });
    grid.classList.add('as-sections');   // 컨테이너 3열 그리드 해제 (섹션이 grid item 되는 것 방지)
    grid.innerHTML = '';
    // 섹션별 지연 렌더 (2026-08-17 점검): 1,169장 통 DOM 렌더 → 뷰포트 접근 섹션만 카드 채움
    var sections = [];
    CAT_ORDER.forEach(function(cat) {
      var list = byCat[cat]; if (!list || !list.length) return;
      var sec = document.createElement('section');
      sec.className = 'cat-section';
      sec.innerHTML = '<h2 class="cat-section-h">' +
        '<span class="cat-dot" style="background:' + (CAT_COLORS[cat] || '#D94C53') + '"></span>' +
        catLabelFor(cat) + ' <span class="cat-section-n">' + list.length + '</span></h2>' +
        '<div class="cat-section-grid"></div>';
      grid.appendChild(sec);
      sections.push({ el: sec, list: list, done: false });
    });
    function fill(s) {
      if (s.done) return;
      s.done = true;
      var g = s.el.querySelector('.cat-section-grid');
      g.innerHTML = s.list.map(cardHTML).join('');
      bindFavButtons(g);
    }
    if ('IntersectionObserver' in window && sections.length > 1) {
      fill(sections[0]);
      var sio = new IntersectionObserver(function(entries) {
        entries.forEach(function(en) {
          if (!en.isIntersecting) return;
          sio.unobserve(en.target);
          for (var i = 0; i < sections.length; i++) {
            if (sections[i].el === en.target) { fill(sections[i]); break; }
          }
        });
      }, { rootMargin: '600px' });
      sections.slice(1).forEach(function(s) { sio.observe(s.el); });
    } else {
      sections.forEach(fill);
    }
    renderLoadMore(0);   // 섹션뷰는 더보기 없음(전체 그룹 표시)
  }

  function renderCards(items) {
    const grid = document.getElementById('card-grid');
    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = 1;

    if (!totalItems) {
      var q = (searchQuery || '').replace(/</g, '&lt;');
      var msg;
      if (searchQuery) {
        msg = T('noResult') + '"<b>' + q + '</b>"' +
          '<br><span style="font-size:.9em;color:var(--text-soft)">' + T('hint') + '</span>';
      } else {
        msg = T('noMatch');
      }
      grid.classList.remove('as-sections');   // 섹션뷰에서 0건 진입 시 잔존 클래스 제거 (2026-08-17)
      grid.innerHTML = '<div class="no-results">' + msg + '</div>';
      renderLoadMore(0);
      return;
    }

    // 섹션 뷰: 카테고리별 그룹(더보기 없음). 검색 중엔 관련도순 유지 위해 그리드.
    if (viewMode === 'section' && !searchQuery) {
      renderSectioned(items);
      return;
    }

    grid.classList.remove('as-sections');   // 그리드 모드 복귀
    // 더보기 방식(B4, 2026-08-16): 1페이지부터 현재 페이지까지 누적 표시 — 통째 재렌더가 가장 단순
    const pageItems = items.slice(0, currentPage * PAGE_SIZE);
    grid.innerHTML = pageItems.map(cardHTML).join('');
    bindFavButtons();

    renderLoadMore(totalItems);
  }

  // B4 (2026-08-16): 페이지네이션 → "더보기 + 뷰포트 진입 시 자동 로드" (footer 도달 보장형 무한스크롤)
  var loadMoreIO = null;   // 재렌더 시 이전 observer 해제용 (2026-08-17 누수 수정)
  function renderLoadMore(totalItems) {
    const el = document.getElementById('pagination');
    if (!el) return;
    if (loadMoreIO) { loadMoreIO.disconnect(); loadMoreIO = null; }
    const shown = Math.min(currentPage * PAGE_SIZE, totalItems);
    if (!totalItems || shown >= totalItems) {
      el.innerHTML = '';
      return;
    }
    el.innerHTML = '<button class="load-more-btn" id="load-more">' + T('loadMore') +
      ' <span class="load-more-n">(+' + Math.min(PAGE_SIZE, totalItems - shown) + ' / ' +
      (totalItems - shown) + T('remaining') + ')</span></button>';
    var btn = document.getElementById('load-more');
    btn.addEventListener('click', function() {
      currentPage++;
      applyFilters(window.__contents);   // 스크롤 위치 유지(누적 렌더라 그리드가 아래로만 자람)
    });
    // 버튼이 뷰포트에 들어오면 자동 로드 — 재렌더 시 상단에서 이전 observer disconnect
    if ('IntersectionObserver' in window) {
      loadMoreIO = new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting) { loadMoreIO.disconnect(); loadMoreIO = null; btn.click(); }
      }, { rootMargin: '300px' });
      loadMoreIO.observe(btn);
    }
  }

  function applyFilters(data) {
    let filtered = data;
    if (activeCategories.length) {
      filtered = filtered.filter(function(item) { return activeCategories.indexOf(item.category) !== -1; });
    }
    if (activeTags.length) {
      filtered = filtered.filter(function(item) {
        return activeTags.some(function(t) { return item.tags.indexOf(t) !== -1; });
      });
    }
    if (activeAreas.length) {
      filtered = filtered.filter(function(item) {
        return activeAreas.some(function(a) { return item.tags.indexOf(a) !== -1; });
      });
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

    // 검색 또는 정렬 active 시 중간 랜딩 nav 숨기고 card-grid 바로 노출
    // (B5 수정 2026-08-16: .area-bar는 제외 — 접기 패널 안으로 이동, 숨기면 area 필터 해제 불가 버그)
    var midSections = document.querySelectorAll('.area-landing-nav, .series-fold, .kc-routes, .kc-season');
    var sortBy = (document.getElementById('sort-select') || {}).value;
    var isActive = !!searchQuery || !!sortBy || activeCategories.length || activeTags.length || activeAreas.length || showFavoritesOnly;
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
        var ti = activeTags.indexOf(tag);
        if (ti !== -1) { activeTags.splice(ti, 1); this.classList.remove('active'); }
        else { activeTags.push(tag); this.classList.add('active'); }
        this.setAttribute('aria-pressed', ti === -1 ? 'true' : 'false');
        currentPage = 1;
        syncURL();
        applyFilters(data);
      });
    });
    document.querySelectorAll('.area-btn').forEach(function(btn) {
      btn.addEventListener('click', function () {
        var area = this.dataset.area;
        var ai = activeAreas.indexOf(area);
        if (ai !== -1) { activeAreas.splice(ai, 1); this.classList.remove('active'); }
        else { activeAreas.push(area); this.classList.add('active'); }
        this.setAttribute('aria-pressed', ai === -1 ? 'true' : 'false');
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
