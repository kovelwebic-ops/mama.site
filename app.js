/* =========================================================
   app.js — рендер, галерея, варіанти, пошук, модалка, UA/PL.
   Один файл на всі три сторінки; сторінка визначається
   атрибутом data-page у <body>.
   ========================================================= */

(function () {
  'use strict';

  var CATS = window.SM_CATS;
  var SUBCATS = window.SM_SUBCATS;
  var PRODUCTS = window.SM_PRODUCTS;
  var CONTACTS = window.SM_CONTACTS;

  /* ---------------- стан ---------------- */

  var S = {
    lang: 'ua',
    sort: 'name',
    q: '',
    gi: 0,          // індекс поточного фото в галереї
    sel: {},        // вибрані варіанти на сторінці товару
    open: null      // 'menu' | 'search' | 'modal' | null
  };

  try {
    var saved = localStorage.getItem('sm-lang');
    if (saved === 'pl' || saved === 'ua') S.lang = saved;
  } catch (e) { /* file:// без localStorage — лишається 'ua' */ }

  /* ---------------- дрібні помічники ---------------- */

  var MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return MAP[c]; });
  }

  function L(k) { return window.SM_I18N[S.lang][k]; }
  function plural(n) { return window.SM_PLURAL(n, S.lang); }

  function nm(o) { return (S.lang === 'pl' && o.name_pl) ? o.name_pl : o.name; }
  function ds(p) { return (S.lang === 'pl' && p.desc_pl) ? p.desc_pl : p.desc; }
  function nt(p) { return (S.lang === 'pl' && p.note_pl) ? p.note_pl : (p.note || ''); }
  function vl(v) { return (S.lang === 'pl' && v.label_pl) ? v.label_pl : v.label; }

  /* Ваги й одиниці ціни відрізняються тільки скороченням, число те саме,
     тож тримати для них окремі поля в даних нема сенсу. Порядок важливий:
     «кг» треба замінити до того, як дійде черга до самотнього «г». */
  function units(s) {
    if (S.lang !== 'pl' || !s) return s;
    return String(s)
      .replace(/кг/g, 'kg')
      .replace(/мл/g, 'ml')
      .replace(/шт/g, 'szt')
      .replace(/(\d\s*)г(?=$|\/|\s)/g, '$1g');
  }

  function qs(k) {
    var m = new RegExp('[?&]' + k + '=([^&]*)').exec(location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
  }

  function catById(id) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i];
    return null;
  }
  function prodById(id) {
    for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i];
    return null;
  }
  function inCat(id) {
    return PRODUCTS.filter(function (p) { return p.cat === id; });
  }

  function catHref(id) { return 'catalog.html' + (id ? '?cat=' + id : ''); }
  function prodHref(p) { return 'product.html?id=' + encodeURIComponent(p.id); }

  /* Ціна з урахуванням вибраного варіанта. */
  function priceText(p, sel) {
    if (p.priceText) return p.priceText;
    if (p.price == null) return L('onRequest');
    var price = p.price;
    if (sel && p.variants) {
      p.variants.forEach(function (v) {
        var o = v.options[sel[v.id] || 0];
        if (o && o.price != null) price = o.price;
      });
    }
    return price + ' zł' + units(p.unit || '');
  }

  /* Назва товару з урахуванням варіанта, який її змінює (зефір поштучно). */
  function prodTitle(p, sel) {
    if (p.photoVar && p.variants) {
      for (var i = 0; i < p.variants.length; i++) {
        var v = p.variants[i];
        if (v.id !== p.photoVar) continue;
        var o = v.options[(sel || {})[v.id] || 0];
        if (o && o.title) return (S.lang === 'pl' && o.title_pl) ? o.title_pl : o.title;
      }
    }
    return nm(p);
  }

  /* ---------------- контакти ---------------- */

  function cAttrs(c) {
    return c.href
      ? ' href="' + esc(c.href) + '" target="_blank" rel="noopener"'
      : ' href="#" aria-disabled="true"';
  }
  /* Простий рядок-заклик «Facebook →»: сама адреса живе в href, поки
     контакту немає — лінк приглушений. Стрілку у футері ховає CSS. */
  function contactRows() {
    return CONTACTS.map(function (c) {
      return '<a class="t-micro' + (c.href ? '' : ' is-empty') + '"' + cAttrs(c) + '>'
        + esc(vl(c)) + '<span class="arrow" aria-hidden="true">&rarr;</span></a>';
    }).join('');
  }

  /* ---------------- іконки ---------------- */

  var ICON_SEARCH = '<svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">'
    + '<circle cx="7" cy="7" r="5.4" stroke="currentColor" stroke-width="1.4"/>'
    + '<line x1="11.2" y1="11.2" x2="16" y2="16" stroke="currentColor" stroke-width="1.4"/></svg>';

  var ICON_MAIL = '<svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">'
    + '<rect x="1" y="2.5" width="15" height="11" rx="2" stroke="currentColor" stroke-width="1.4"/>'
    + '<line x1="1.6" y1="4" x2="8.5" y2="9" stroke="currentColor" stroke-width="1.4"/>'
    + '<line x1="15.4" y1="4" x2="8.5" y2="9" stroke="currentColor" stroke-width="1.4"/></svg>';

  /* ---------------- картка товару ---------------- */

  function cardHTML(p) {
    var alt = p.photos.length > 1
      ? '<img class="card-alt" src="' + esc(p.photos[1]) + '" alt="" loading="lazy">' : '';
    return '<a class="card" href="' + prodHref(p) + '">'
      + '<span class="card-ph"><img src="' + esc(p.photos[0]) + '" alt="' + esc(nm(p)) + '" loading="lazy">' + alt + '</span>'
      + '<span class="card-txt">'
      + '<span class="card-name">' + esc(nm(p)) + '</span>'
      + '<span class="card-price">' + esc(priceText(p)) + '</span>'
      + '</span></a>';
  }

  /* ---------------- шапка / футер ---------------- */

  function langHTML() {
    return '<button type="button" data-act="lang" data-lang="ua" class="' + (S.lang === 'ua' ? 'on' : '') + '">UA</button>'
      + '<span class="sep">/</span>'
      + '<button type="button" data-act="lang" data-lang="pl" class="' + (S.lang === 'pl' ? 'on' : '') + '">PL</button>';
  }

  function renderHeader() {
    var cats = CATS.map(function (c) {
      return '<a href="' + catHref(c.id) + '">' + esc(nm(c)) + '</a>';
    }).join('');

    document.getElementById('hdr').innerHTML =
      '<div class="hdr-in">'
      + '<div class="hdr-l">'
      + '<button class="burger" type="button" data-act="menu" aria-label="' + esc(L('menu')) + '"><span></span><span></span></button>'
      + '<nav class="hdr-cats t-micro">' + cats + '</nav>'
      + '</div>'
      + '<a class="mark" href="index.html">SŁODKIE MARZENIA</a>'
      + '<div class="hdr-r">'
      + '<button class="icon" type="button" data-act="search" aria-label="' + esc(L('search')) + '">' + ICON_SEARCH + '</button>'
      + '<button class="icon hdr-contact" type="button" data-act="modal" aria-label="' + esc(L('contacts')) + '">' + ICON_MAIL + '</button>'
      + '<div class="lang hdr-lang">' + langHTML() + '</div>'
      + '</div></div>';
  }

  function termsCol(titleKey, listKey) {
    var li = L(listKey).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    return '<div class="ftr-col">'
      + '<span class="t-micro muted">' + esc(L(titleKey)) + '</span>'
      + '<ul class="ftr-terms">' + li + '</ul></div>';
  }

  /* Копірайт лишається англійською в обох мовах — так просив замовник.
     Рік беремо поточний, щоб футер не застарів у січні. */
  var SITE_DOMAIN = 'Slodkiemarzenia.pl';

  function renderFooter() {
    var copy = '© ' + new Date().getFullYear() + ' ' + SITE_DOMAIN + ' · All rights reserved';

    document.getElementById('ftr').innerHTML =
      '<div class="ftr-in">'
      + '<div class="ftr-col brand">'
      + '<b>SŁODKIE MARZENIA</b>'
      + '<span class="t-micro muted">' + esc(L('tagline')) + '</span>'
      + '<span class="ftr-copy">' + esc(copy) + '</span>'
      + '</div>'
      + termsCol('orderTerms', 'orderList')
      + termsCol('deliveryTerms', 'deliveryList')
      + '<div class="ftr-col ftr-links">'
      + '<span class="t-micro muted">' + esc(L('contacts')) + '</span>' + contactRows()
      + '</div>'
      + '</div>';
  }

  /* ---------------- головна ---------------- */

  function findProd(cat, name) {
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (PRODUCTS[i].cat === cat && PRODUCTS[i].name === name) return PRODUCTS[i];
    }
    return PRODUCTS[0];
  }

  function stripHTML(items, dir) {
    var half = items.map(function (p) {
      return '<img src="' + esc(p.photos[0]) + '" alt="" loading="lazy">';
    }).join('');
    return '<div class="strip strip-' + dir + '">'
      + '<div class="strip-track">'
      + '<div class="strip-half">' + half + '</div>'
      + '<div class="strip-half" aria-hidden="true">' + half + '</div>'
      + '</div></div>';
  }

  /* Блок «про кондитерку»: фото і текст міняються місцями через рядок.
     Замість фото поки рамка-заглушка — щоб замінити, постав на її
     місце <img class="about-ph" src="..."> з тим самим класом. */
  function aboutRow(n, mod) {
    return '<div class="about-row' + mod + '">'
      + '<div class="about-ph"><span class="t-micro muted">' + esc(L('photoStub')) + '</span></div>'
      + '<div class="about-txt">'
      + '<h2 class="t-sect">' + esc(L('aboutTitle' + n)) + '</h2>'
      + '<p>' + esc(L('aboutText' + n)) + '</p>'
      + '</div></div>';
  }

  /* Головна: герой → дві стрічки → блок про кондитерку → футер. */
  function renderHome() {
    var hero = findProd('cakes', 'Фісташка малина');

    var a = PRODUCTS.filter(function (p) { return p.cat === 'cakes'; }).slice(0, 10);
    var b = PRODUCTS.filter(function (p) { return p.cat !== 'cakes'; }).slice(0, 10);

    document.getElementById('main').innerHTML =
      '<section class="hero">'
      + '<img src="' + esc(hero.photos[0]) + '" alt="">'
      + '<div class="hero-txt">'
      + '<h1 class="t-hero">SŁODKIE<br>MARZENIA</h1>'
      + '<p class="t-micro muted">' + esc(L('tagline')) + '</p>'
      + '</div>'
      + '<div class="hero-scroll"><i></i><span class="t-micro muted">' + esc(L('scroll')) + '</span></div>'
      + '</section>'

      + '<section class="strips">' + stripHTML(a, 'l') + stripHTML(b, 'r') + '</section>'

      + '<section class="wrap about">'
      + aboutRow(1, '') + aboutRow(2, ' is-flipped')
      + '</section>';

    document.title = 'Słodkie Marzenia — ' + L('tagline');
  }

  /* ---------------- каталог ---------------- */

  /* curated — чи можна застосовувати ручний порядок (поле order).
     Він нумерується всередині категорії, тож на сторінці «Всі товари»
     номери різних категорій зіштовхнулись би між собою: там завжди
     алфавіт. Усередині категорії ручний порядок головніший за нього —
     інакше найефектніші позиції тонули б у списку. */
  function sortItems(arr, curated) {
    var loc = S.lang === 'pl' ? 'pl' : 'uk';
    if (S.sort === 'name') {
      arr.sort(function (x, y) {
        if (curated && x.order != null && y.order != null) return x.order - y.order;
        return nm(x).localeCompare(nm(y), loc);
      });
    } else {
      var dir = S.sort === 'priceUp' ? 1 : -1;
      arr.sort(function (x, y) {
        if (x.price == null && y.price == null) return 0;
        if (x.price == null) return 1;
        if (y.price == null) return -1;
        return (x.price - y.price) * dir;
      });
    }
    return arr;
  }

  function renderCatalog() {
    var catId = qs('cat');
    var cat = catById(catId);
    if (catId && !cat) catId = '';

    var items = sortItems(
      PRODUCTS.filter(function (p) { return !catId || p.cat === catId; }),
      !!catId
    );

    var chips = ['<a class="chip t-micro' + (catId ? '' : ' on') + '" href="' + catHref('') + '">' + esc(L('allProducts')) + '</a>']
      .concat(CATS.map(function (c) {
        return '<a class="chip t-micro' + (catId === c.id ? ' on' : '') + '" href="' + catHref(c.id) + '">' + esc(nm(c)) + '</a>';
      })).join('');

    var sorts = [['name', 'sortDefault'], ['priceUp', 'priceUp'], ['priceDown', 'priceDown']].map(function (s) {
      return '<button type="button" data-act="sort" data-v="' + s[0] + '" class="' + (S.sort === s[0] ? 'on' : '') + '">' + esc(L(s[1])) + '</button>';
    }).join('');

    /* Категорії з підкатегоріями (зефір) показуємо секціями, решту —
       однією сіткою. Сортування діє всередині кожної секції. */
    var subs = catId && SUBCATS[catId];
    var body;
    if (subs) {
      body = subs.map(function (s) {
        var part = items.filter(function (p) { return p.sub === s.id; });
        if (!part.length) return '';
        return '<div class="sub">'
          + '<span class="sub-head t-micro muted">' + esc(nm(s)) + '</span>'
          + '<div class="grid">' + part.map(cardHTML).join('') + '</div></div>';
      }).join('');
    } else {
      body = '<div class="grid">' + items.map(cardHTML).join('') + '</div>';
    }

    document.getElementById('main').innerHTML =
      '<section class="wrap">'
      + '<h1 class="t-hero cat-head">' + esc(cat ? nm(cat) : L('allProducts')) + '</h1>'
      + '<div class="bar">'
      + '<div class="chips">' + chips + '</div>'
      + '<div class="bar-r"><div class="sorts">' + sorts + '</div></div>'
      + '</div>'
      + body
      + '</section>';

    document.title = (cat ? nm(cat) : L('allProducts')) + ' — Słodkie Marzenia';
  }

  /* ---------------- сторінка товару ---------------- */

  /* Вагу й об'єм більше не показуємо: розмір узгоджується при
     замовленні. Поле weight у даних лишилось — воно ще знадобиться,
     якщо колись з'явиться окремий блок характеристик. */
  function skladHTML(p, where) {
    var parts = ds(p).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var li = parts.map(function (t) {
      return '<li class="t-sklad"><i>&middot;</i><span>' + esc(t) + '</span></li>';
    }).join('');
    return '<div class="sklad sklad-' + where + '">'
      + '<span class="t-micro muted">' + esc(L('sklad')) + '</span>'
      + '<ul>' + li + '</ul></div>';
  }

  function variantsHTML(p) {
    if (!p.variants) return '';
    return p.variants.map(function (v, vi) {
      var opts = v.options.map(function (o, oi) {
        var on = (S.sel[v.id] || 0) === oi;
        return '<button type="button" class="pill' + (on ? ' on' : '') + '" data-act="pill" data-v="' + vi + '" data-o="' + oi + '">'
          + esc((S.lang === 'pl' && o.label_pl) ? o.label_pl : o.label) + '</button>';
      }).join('');
      return '<div class="varblock"><span class="t-micro muted">' + esc(vl(v)) + '</span>'
        + '<div class="pills">' + opts + '</div></div>';
    }).join('');
  }

  function orderItemText(p) {
    var bits = [prodTitle(p, S.sel)];
    if (p.variants) {
      p.variants.forEach(function (v) {
        var o = v.options[S.sel[v.id] || 0];
        if (o) bits.push(vl(v) + ': ' + ((S.lang === 'pl' && o.label_pl) ? o.label_pl : o.label));
      });
    }
    return bits.join(' · ');
  }

  var CURRENT = null;   // товар поточної сторінки

  function renderProduct() {
    var p = CURRENT;
    var main = document.getElementById('main');

    if (!p) {
      main.innerHTML = '<section class="wrap"><h1 class="t-sect cat-head">' + esc(L('notFound')) + '</h1>'
        + '<p class="t-micro muted empty"><a href="' + catHref('') + '">' + esc(L('allProducts')) + ' &rarr;</a></p></section>';
      document.title = L('notFound') + ' — Słodkie Marzenia';
      return;
    }

    var gallery = p.photos.length > 1;
    var back = catHref(p.cat);
    var note = nt(p);

    var arrows = gallery
      ? '<button class="gal-arrow prev" type="button" data-act="gal" data-v="-1" aria-label="&larr;">&lsaquo;</button>'
      + '<button class="gal-arrow next" type="button" data-act="gal" data-v="1" aria-label="&rarr;">&rsaquo;</button>' : '';

    var dots = gallery
      ? '<div class="dots">' + p.photos.map(function (_, i) {
        return '<button type="button" data-act="dot" data-v="' + i + '" class="' + (i === S.gi ? 'on' : '') + '" aria-label="' + (i + 1) + '"></button>';
      }).join('') + '</div>' : '';

    var others = inCat(p.cat).filter(function (o) { return o.id !== p.id; }).slice(0, 12);

    main.innerHTML =
      '<section class="wrap pdp">'

      + '<div class="pdp-l">'
      + '<a class="t-micro muted" href="' + back + '">&larr; ' + esc(L('back')) + '</a>'
      + '<h1 class="t-prod">' + esc(prodTitle(p, S.sel)) + '</h1>'
      + skladHTML(p, 'desk')
      + '</div>'

      + '<div class="pdp-c">'
      + '<div class="gal"><img src="' + esc(p.photos[S.gi]) + '" alt="' + esc(prodTitle(p, S.sel)) + '">' + arrows + '</div>'
      + dots
      + '</div>'

      + '<div class="pdp-r">'
      + '<div>'
      + '<div class="price">' + esc(priceText(p, S.sel)) + '</div>'
      + (note ? '<div class="t-sklad muted" style="margin-top:8px">' + esc(note) + '</div>' : '')
      + '</div>'
      + variantsHTML(p)
      + '<button class="btn-order" type="button" data-act="modal">' + esc(L('order')) + '</button>'
      + '<span class="t-sklad muted made-to-order">' + esc(L('madeToOrder')) + '</span>'
      /* на мобільному склад стоїть між кнопкою і соцмережами, на десктопі — у лівій колонці */
      + skladHTML(p, 'mob')
      + '<div class="links">' + contactRows() + '</div>'
      + '</div>'

      + '</section>'

      + (others.length
        ? '<section class="wrap others"><h2 class="t-sect">' + esc(L('other')) + '</h2>'
        + '<div class="rail">' + others.map(cardHTML).join('') + '</div></section>'
        : '');

    bindGallery();
    /* Рейл «Інші товари» перебудовується разом зі сторінкою — щоразу
       вішаємо на нього прокрутку заново. */
    dragScroll(document.querySelector('.rail'));
    document.title = prodTitle(p, S.sel) + ' — Słodkie Marzenia';
  }

  /* ---------------- перехід на сторінку товару ----------------
     Плитка кольору фону затягує екран, під нею відбувається перехід,
     на новій сторінці вона розходиться. Тільки десктоп: на телефоні
     перехід і так миттєвий, а зайвий шар лише з'їдав би батарею.  */

  var TILE_FLAG = 'sm-tiles';
  var TILE_IN = 540;   /* поки плитка сходиться, потім переходимо */

  function tilesAllowed() {
    try {
      return !matchMedia('(prefers-reduced-motion: reduce)').matches
        && matchMedia('(min-width: 1101px)').matches;
    } catch (e) { return false; }
  }

  /* Плитки приблизно квадратні, ~190px — достатньо дрібно, щоб
     випадковий порядок читався, і достатньо крупно, щоб не плодити
     сотні вузлів. */
  function buildTiles() {
    var cols = Math.max(6, Math.round(innerWidth / 190));
    var rows = Math.max(4, Math.round(innerHeight / 190));
    var wrap = document.createElement('div');
    wrap.className = 'tiles';
    wrap.style.setProperty('--cols', cols);
    wrap.style.setProperty('--rows', rows);
    for (var i = 0; i < cols * rows; i++) {
      var t = document.createElement('i');
      t.style.transitionDelay = Math.round(Math.random() * 280) + 'ms';
      wrap.appendChild(t);
    }
    document.body.appendChild(wrap);
    return wrap;
  }

  /* Перемикаємо клас через примусовий reflow, а не через rAF: rAF не
     спрацьовує у прихованій вкладці, і анімація мовчки не стартувала б,
     тоді як таймер переходу все одно відпрацював би. */
  function reflow(el) { void el.offsetWidth; }

  /* Йдемо зі сторінки: показуємо плитку, і лише під нею навігуємо. */
  function tilesCover(href) {
    var wrap = buildTiles();
    try { sessionStorage.setItem(TILE_FLAG, '1'); } catch (e) {}
    reflow(wrap);
    wrap.classList.add('is-on');
    setTimeout(function () { location.href = href; }, TILE_IN);
  }

  /* Прийшли на сторінку: якщо перехід був анімований, малюємо плитку
     ДО першого рендеру — інакше на кадр блимне порожня сторінка. */
  function tilesArrive() {
    var flag = null;
    try {
      flag = sessionStorage.getItem(TILE_FLAG);
      sessionStorage.removeItem(TILE_FLAG);
    } catch (e) {}
    if (!flag || !tilesAllowed()) return null;
    var wrap = buildTiles();
    wrap.classList.add('is-on');
    return wrap;
  }

  function tilesReveal(wrap) {
    if (!wrap) return;
    reflow(wrap);              /* фіксуємо стан «закрито» */
    wrap.classList.remove('is-on');
    setTimeout(function () { wrap.remove(); }, 700);
  }

  /* ---------------- горизонтальна прокрутка мишею ----------------
     Смуги прокрутки на сайті приховані, а колесо миші гортає тільки
     по вертикалі — тож без цього «Інші товари» на десктопі не
     прокрутити взагалі. Пальцем працює нативно, тому мишу й тач
     розводимо: drag вмикаємо лише для pointerType === 'mouse'.     */
  function dragScroll(el) {
    if (!el) return;
    var down = false, startX = 0, startLeft = 0, moved = 0;

    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = 0;
      startX = e.clientX; startLeft = el.scrollLeft;
      el.classList.add('is-dragging');
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
    });

    el.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > moved) moved = Math.abs(dx);
      el.scrollLeft = startLeft - dx;
    });

    function end(e) {
      if (!down) return;
      down = false;
      el.classList.remove('is-dragging');
      try { el.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);

    /* Перетягування не має відкривати картку, на якій відпустили мишу. */
    el.addEventListener('click', function (e) {
      if (moved > 6) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    /* Вертикальне колесо → горизонтальна прокрутка, але на краю
       віддаємо подію сторінці, щоб гортання не «залипало» на стрічці. */
    el.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      var max = el.scrollWidth - el.clientWidth;
      var next = el.scrollLeft + e.deltaY;
      if (next < 0 || next > max) return;
      el.scrollLeft = next;
      e.preventDefault();
    }, { passive: false });
  }

  /* Пауза стрічок під курсором. CSS :hover теж це вміє, але тут
     стан явний — і його видно в DOM, коли треба перевірити. */
  function bindStrips() {
    [].forEach.call(document.querySelectorAll('.strip'), function (s) {
      s.addEventListener('mouseenter', function () { s.classList.add('is-paused'); });
      s.addEventListener('mouseleave', function () { s.classList.remove('is-paused'); });
      dragScroll(s);
    });
  }

  /* свайп пальцем і перетягування мишею по фото */
  function bindGallery() {
    var gal = document.querySelector('.gal');
    if (!gal || !CURRENT || CURRENT.photos.length < 2) return;
    var x0 = null;
    gal.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    gal.addEventListener('pointerup', function (e) {
      if (x0 == null) return;
      var dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
    });
    gal.addEventListener('pointercancel', function () { x0 = null; });
  }

  function step(d) {
    var n = CURRENT.photos.length;
    S.gi = (S.gi + d + n) % n;
    syncPhotoVar();
    renderProduct();
  }

  /* якщо фото прив'язані до блока вибору — тримаємо їх синхронно */
  function syncPhotoVar() {
    if (!CURRENT || !CURRENT.photoVar || !CURRENT.variants) return;
    CURRENT.variants.forEach(function (v) {
      if (v.id !== CURRENT.photoVar) return;
      for (var i = 0; i < v.options.length; i++) {
        if (v.options[i].photo === S.gi) { S.sel[v.id] = i; return; }
      }
    });
  }

  /* ---------------- оверлеї ---------------- */

  /* Індекс для пошуку. Категорію й підкатегорію додаємо навмисно:
     «торт» — найочевидніший запит, але цього слова немає в жодній
     назві товару, лише в назві категорії, тож без цього пошук на
     ньому мовчав. Обидві мови в індексі, тому «sernik» знаходить
     чізкейки і в українському інтерфейсі.                         */
  function haystack(p) {
    var bits = [p.name, p.name_pl, p.desc, p.desc_pl];

    var c = catById(p.cat);
    if (c) bits.push(c.name, c.name_pl);

    var subs = SUBCATS[p.cat] || [];
    subs.forEach(function (s) { if (s.id === p.sub) bits.push(s.name, s.name_pl); });

    if (p.variants) p.variants.forEach(function (v) {
      v.options.forEach(function (o) { bits.push(o.label, o.label_pl, o.title, o.title_pl); });
    });

    return bits.filter(Boolean).join(' ').toLowerCase();
  }

  function searchResults() {
    var q = S.q.trim().toLowerCase();
    if (!q) return null;
    return PRODUCTS.filter(function (p) { return haystack(p).indexOf(q) !== -1; });
  }

  function renderOverlays() {
    var ov = document.getElementById('ov');
    var html = '';

    if (S.open === 'menu') {
      var links = CATS.map(function (c) {
        return '<a href="' + catHref(c.id) + '">' + esc(nm(c)) + '</a>';
      }).join('') + '<a class="muted" href="' + catHref('') + '">' + esc(L('allProducts')) + '</a>';

      html = '<div class="sheet">'
        + '<div class="sheet-bar"><button class="sheet-close" type="button" data-act="close" aria-label="' + esc(L('close')) + '">&times;</button></div>'
        + '<nav class="menu-links">' + links + '</nav>'
        + '<div class="links" style="margin-top:48px">' + contactRows() + '</div>'
        + '<div class="lang" style="margin-top:32px">' + langHTML() + '</div>'
        + '</div>';
    }

    if (S.open === 'search') {
      var res = searchResults();
      var body;
      if (res == null) {
        /* Порожній запит — ті самі чіпи, що й у каталозі, замість стіни
           гігантських назв: і зрозуміліше, і не сперечається з полем. */
        body = '<div class="search-empty">'
          + '<span class="t-micro muted">' + esc(L('categories')) + '</span>'
          + '<div class="chips">' + CATS.map(function (c) {
            return '<a class="chip t-micro" href="' + catHref(c.id) + '">' + esc(nm(c)) + '</a>';
          }).join('') + '</div></div>';
      } else if (res.length) {
        body = '<div class="grid">' + res.map(cardHTML).join('') + '</div>';
      } else {
        body = '';
      }
      var hint = res == null ? L('searchHint') : (res.length ? plural(res.length) : L('nothing'));

      html = '<div class="sheet">'
        + '<div class="wrap" style="padding:0">'
        + '<div class="sheet-bar"><button class="sheet-close" type="button" data-act="close" aria-label="' + esc(L('close')) + '">&times;</button></div>'
        + '<div class="search-field">' + ICON_SEARCH
        + '<input class="search-input" id="sq" type="text" value="' + esc(S.q) + '" placeholder="' + esc(L('search')) + '" autocomplete="off">'
        + '</div>'
        + '<div class="search-hint t-micro muted">' + esc(hint) + '</div>'
        + body
        + '</div></div>';
    }

    if (S.open === 'modal') {
      var item = CURRENT ? orderItemText(CURRENT) : '';
      html = '<div class="modal-bg" data-act="backdrop">'
        + '<div class="modal">'
        + '<div class="modal-head"><b>' + esc(L('order')) + '</b>'
        + '<button class="sheet-close" type="button" data-act="close" aria-label="' + esc(L('close')) + '">&times;</button></div>'
        + (item ? '<div class="t-sklad muted">' + esc(L('product')) + ': <span style="color:var(--ink)">' + esc(item) + '</span></div>' : '')
        + '<div class="links">' + contactRows() + '</div>'
        + '</div></div>';
    }

    ov.innerHTML = html;
    document.body.classList.toggle('is-locked', !!S.open);

    if (S.open === 'search') {
      var inp = document.getElementById('sq');
      inp.addEventListener('input', function () { S.q = this.value; renderOverlays(); });
      inp.focus();
      var v = inp.value; inp.value = ''; inp.value = v;   // курсор у кінець
    }
  }

  /* ---------------- рендер усього ---------------- */

  function renderAll() {
    renderHeader();
    renderFooter();
    var page = document.body.dataset.page;
    if (page === 'home') renderHome();
    else if (page === 'catalog') renderCatalog();
    else renderProduct();
    renderOverlays();
    if (page === 'home') bindStrips();
  }

  function setLang(l) {
    if (l === S.lang) return;
    S.lang = l;
    try { localStorage.setItem('sm-lang', l); } catch (e) {}
    document.documentElement.lang = (l === 'pl') ? 'pl' : 'uk';
    renderAll();
  }

  /* ---------------- події ---------------- */

  document.addEventListener('click', function (e) {
    var noop = e.target.closest && e.target.closest('a[aria-disabled]');
    if (noop) { e.preventDefault(); return; }

    /* Клік по картці товару — не одразу перехід, а спершу плитка.
       Модифікатори й середню кнопку не чіпаємо: «відкрити в новій
       вкладці» має працювати як завжди. */
    var card = e.target.closest && e.target.closest('a.card');
    if (card && tilesAllowed() && e.button === 0
        && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      tilesCover(card.getAttribute('href'));
      return;
    }

    var el = e.target.closest && e.target.closest('[data-act]');
    if (!el) return;
    var act = el.dataset.act;

    if (act === 'lang')     { setLang(el.dataset.lang); return; }
    if (act === 'menu')     { S.open = 'menu';   renderOverlays(); return; }
    if (act === 'search')   { S.open = 'search'; renderOverlays(); return; }
    if (act === 'modal')    { S.open = 'modal';  renderOverlays(); return; }
    if (act === 'close')    { S.open = null; S.q = ''; renderOverlays(); return; }
    if (act === 'backdrop') { if (e.target === el) { S.open = null; renderOverlays(); } return; }

    if (act === 'sort') { S.sort = el.dataset.v; renderCatalog(); return; }

    if (act === 'gal') { step(+el.dataset.v); return; }
    if (act === 'dot') { S.gi = +el.dataset.v; syncPhotoVar(); renderProduct(); return; }

    if (act === 'pill') {
      var v = CURRENT.variants[+el.dataset.v];
      var oi = +el.dataset.o;
      S.sel[v.id] = oi;
      if (CURRENT.photoVar === v.id && v.options[oi].photo != null) S.gi = v.options[oi].photo;
      renderProduct();
      return;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && S.open) { S.open = null; S.q = ''; renderOverlays(); }
  });

  /* Волосяна лінія під шапкою з'являється, щойно сторінку зрушили.
     Стежимо за невидимою міткою на самому верху документа: це надійніше
     за подію scroll (вона не спрацьовує в деяких вбудованих переглядачах). */
  function watchScroll() {
    var hdr = document.getElementById('hdr');
    function set(on) { hdr.classList.toggle('is-scrolled', on); }

    var mark = document.createElement('i');
    mark.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:5px;pointer-events:none';
    document.body.appendChild(mark);

    if (window.IntersectionObserver) {
      new IntersectionObserver(function (e) { set(!e[0].isIntersecting); }).observe(mark);
    }
    window.addEventListener('scroll', function () { set(window.scrollY > 4); }, { passive: true });
    set(window.scrollY > 4);
  }

  /* ---------------- старт ---------------- */

  document.documentElement.lang = (S.lang === 'pl') ? 'pl' : 'uk';

  if (document.body.dataset.page === 'product') {
    CURRENT = prodById(qs('id'));
    if (CURRENT && CURRENT.variants) {
      CURRENT.variants.forEach(function (v) { S.sel[v.id] = 0; });
      syncPhotoVar();
    }
  }

  /* Плитку ставимо до renderAll: сторінка ще порожня, тож перехід
     виглядає суцільним, без спалаху вмісту між ними. */
  var arrived = tilesArrive();
  renderAll();
  watchScroll();
  tilesReveal(arrived);

})();
