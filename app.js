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
  /* Простий рядок-заклик «Facebook →», без окремого підпису значення:
     сам URL/tel: живе в href, поки контакту немає — лінк приглушений. */
  function contactRows(list, withValue) {
    return (list || CONTACTS).map(function (c) {
      var val = (withValue && c.value) ? '<span class="cval">' + esc(c.value) + '</span>' : '';
      return '<a class="t-micro' + (c.href ? '' : ' is-empty') + '"' + cAttrs(c) + '>'
        + esc(vl(c)) + '<span class="arrow" aria-hidden="true">&rarr;</span>' + val + '</a>';
    }).join('');
  }
  /* Короткий список під кнопкою «Замовити» на сторінці товару —
     лише два найшвидші канали зв'язку, решта каналів лишається
     в шапці/футері/модалці (contactRows() без аргументу). */
  function quickContacts() {
    return CONTACTS.filter(function (c) {
      return c.id === 'facebook' || c.id === 'telegram' || c.id === 'phone';
    });
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

  function renderFooter() {
    document.getElementById('ftr').innerHTML =
      '<div class="ftr-in">'
      + '<div class="ftr-col brand">'
      + '<b>SŁODKIE MARZENIA</b>'
      + '<span class="t-micro muted">' + esc(L('tagline')) + '</span>'
      + '</div>'
      + termsCol('orderTerms', 'orderList')
      + termsCol('deliveryTerms', 'deliveryList')
      + '<div class="ftr-col ftr-links">'
      + '<span class="t-micro muted">' + esc(L('contacts')) + '</span>' + contactRows(null, true)
      + '<div class="lang">' + langHTML() + '</div>'
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

  /* Головна поки що коротка: герой → дві стрічки → футер. Блоки категорій
     і заклик «Всі товари» прибрані — на їх місце піде інший контент. */
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

      + '<section class="strips">' + stripHTML(a, 'l') + stripHTML(b, 'r') + '</section>';

    document.title = 'Słodkie Marzenia — ' + L('tagline');
  }

  /* ---------------- каталог ---------------- */

  function sortItems(arr) {
    var loc = S.lang === 'pl' ? 'pl' : 'uk';
    if (S.sort === 'name') {
      /* Там, де замовник задав порядок вручну (поле order), він головніший
         за алфавіт — інакше найефектніші позиції тонули б у списку. */
      arr.sort(function (x, y) {
        if (x.order != null && y.order != null) return x.order - y.order;
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

    var items = sortItems(PRODUCTS.filter(function (p) { return !catId || p.cat === catId; }));

    var chips = ['<a class="chip t-micro' + (catId ? '' : ' on') + '" href="' + catHref('') + '">' + esc(L('allProducts')) + '</a>']
      .concat(CATS.map(function (c) {
        return '<a class="chip t-micro' + (catId === c.id ? ' on' : '') + '" href="' + catHref(c.id) + '">' + esc(nm(c)) + '</a>';
      })).join('');

    var sorts = [['name', 'byName'], ['priceUp', 'priceUp'], ['priceDown', 'priceDown']].map(function (s) {
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

  function skladHTML(p, where) {
    var parts = ds(p).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var li = parts.map(function (t) {
      return '<li class="t-sklad"><i>&middot;</i><span>' + esc(t) + '</span></li>';
    }).join('');
    /* Трайфли міряються в мілілітрах — це об'єм, а не вага. */
    var w = p.weight
      ? '<span class="t-sklad muted">'
        + esc(L(/мл/.test(p.weight) ? 'volume' : 'weight')) + ': ' + esc(units(p.weight))
        + '</span>' : '';
    return '<div class="sklad sklad-' + where + '">'
      + '<span class="t-micro muted">' + esc(L('sklad')) + '</span>'
      + '<ul>' + li + '</ul>' + w + '</div>';
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
      /* на мобільному склад стоїть між кнопкою і соцмережами, на десктопі — у лівій колонці */
      + skladHTML(p, 'mob')
      + '<div class="links">' + contactRows(quickContacts()) + '</div>'
      + '</div>'

      + '</section>'

      + (others.length
        ? '<section class="wrap others"><h2 class="t-sect">' + esc(L('other')) + '</h2>'
        + '<div class="rail">' + others.map(cardHTML).join('') + '</div></section>'
        : '');

    bindGallery();
    document.title = prodTitle(p, S.sel) + ' — Słodkie Marzenia';
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

  function searchResults() {
    var q = S.q.trim().toLowerCase();
    if (!q) return null;
    return PRODUCTS.filter(function (p) {
      var hay = [p.name, p.name_pl, p.desc, p.desc_pl].join(' ');
      if (p.variants) p.variants.forEach(function (v) {
        v.options.forEach(function (o) { hay += ' ' + o.label + ' ' + (o.label_pl || ''); });
      });
      return hay.toLowerCase().indexOf(q) !== -1;
    });
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
        body = '<div class="search-cats">' + CATS.map(function (c) {
          return '<a href="' + catHref(c.id) + '">' + esc(nm(c)) + '</a>';
        }).join('') + '</div>';
      } else if (res.length) {
        body = '<div class="grid search-grid">' + res.map(cardHTML).join('') + '</div>';
      } else {
        body = '';
      }
      var hint = res == null ? L('searchHint') : (res.length ? plural(res.length) : L('nothing'));

      html = '<div class="sheet">'
        + '<div class="wrap" style="padding:0">'
        + '<div class="sheet-bar"><button class="sheet-close" type="button" data-act="close" aria-label="' + esc(L('close')) + '">&times;</button></div>'
        + '<input class="search-input" id="sq" type="text" value="' + esc(S.q) + '" placeholder="' + esc(L('search')) + '" autocomplete="off">'
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

  renderAll();
  watchScroll();

})();
