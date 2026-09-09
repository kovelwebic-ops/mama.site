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
    hi: 0,          // активний десерт у каруселі на головній
    sel: {},        // вибрані варіанти на сторінці товару
    open: null,     // 'menu' | 'search' | 'modal' | null
    ftr: {}         // розгорнуті блоки умов у футері (тільки мобільна)
  };

  /* Мову вгадуємо з налаштувань самого пристрою. navigator.languages —
     це список мов інтерфейсу системи й браузера, а не регіон за IP:
     українець із польською сімкою в Живці все одно побачить
     українську, і навпаки. Нічого не питаємо й нікуди не ходимо —
     значення вже є в браузері.

     Усе, що не польське й не кириличне, лишається на українській:
     це мова, якою кондитерка говорить за замовчуванням. */
  function detectLang() {
    var list;
    try {
      list = (navigator.languages && navigator.languages.length)
        ? navigator.languages
        : [navigator.language || ''];
    } catch (e) { return 'ua'; }

    for (var i = 0; i < list.length; i++) {
      var tag = String(list[i] || '').toLowerCase();
      if (tag.indexOf('pl') === 0) return 'pl';
      if (tag.indexOf('uk') === 0 || tag.indexOf('ru') === 0) return 'ua';
    }
    return 'ua';
  }

  S.lang = detectLang();

  /* Свій вибір головніший за вгадану мову: щойно людина перемкнула
     UA/PL руками, автовизначення більше не втручається. */
  try {
    var saved = localStorage.getItem('sm-lang');
    if (saved === 'pl' || saved === 'ua') S.lang = saved;
  } catch (e) { /* file:// без localStorage — лишається вгадана мова */ }

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
  /* Просто підпис: сама адреса живе в href, поки контакту немає —
     лінк приглушений. Що це посилання, показує підкреслення, а не
     стрілка: стрілок на сторінці набиралось по три-чотири підряд і
     вони читались як список кроків, а не як контакти. */
  function contactRows() {
    return CONTACTS.map(function (c) {
      return '<a class="t-micro' + (c.href ? '' : ' is-empty') + '"' + cAttrs(c) + '>'
        + esc(vl(c)) + '</a>';
    }).join('');
  }

  /* ---------------- іконки ---------------- */

  var ICON_SEARCH = '<svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">'
    + '<circle cx="7" cy="7" r="5.4" stroke="currentColor" stroke-width="1.4"/>'
    + '<line x1="11.2" y1="11.2" x2="16" y2="16" stroke="currentColor" stroke-width="1.4"/></svg>';

  /* Слухавка, а не конверт: пошти в контактах немає й ніколи не було,
     тож конверт обіцяв не те. Замовляють дзвінком або в месенджері. */
  var ICON_PHONE = '<svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">'
    + '<path d="M3.4 3.1c0-.7.6-1.3 1.3-1.3h1.6c.6 0 1.1.4 1.2.9l.6 2.3c.1.4 0 .9-.4 1.1l-1.2.8c.8 1.6 2.1 2.9 3.7 3.7l.8-1.2c.2-.4.7-.5 1.1-.4l2.3.6c.5.1.9.6.9 1.2v1.6c0 .7-.6 1.3-1.3 1.3-6.9 0-10.6-3.7-10.6-10.6z"'
    + ' stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';

  /* ---------------- картка товару ---------------- */

  /* Перші картки майже завжди у видимій частині екрана, тож lazy на них
     лише відкладає промальовування: браузер спершу рахує розкладку і аж
     потім починає качати. Вантажимо їх одразу, решту — ліниво.
     Другий індекс приходить із .map(), який кличе cardHTML. */
  var EAGER_CARDS = 8;

  function cardHTML(p, i) {
    /* Просто знімаємо lazy, без fetchpriority: високий пріоритет на
       вісьмох картинках одночасно нічого не пришвидшує — вони лише
       конкурують між собою. Він лишається для однієї головної. */
    var load = i < EAGER_CARDS ? '' : ' loading="lazy"';
    var alt = p.photos.length > 1
      ? '<img class="card-alt" src="' + esc(p.photos[1]) + '" alt="" loading="lazy" decoding="async">' : '';
    return '<a class="card rv" href="' + prodHref(p) + '">'
      + '<span class="card-ph"><img src="' + esc(p.photos[0]) + '" alt="' + esc(nm(p)) + '"'
      + load + ' decoding="async">' + alt + '</span>'
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

  /* Яка категорія зараз відкрита — і на сторінці каталогу, і на
     сторінці товару (там її дає сам товар). Потрібно, щоб у шапці
     було видно, де людина перебуває. */
  function activeCat() {
    if (document.body.dataset.page === 'catalog') {
      var c = catById(qs('cat'));
      return c ? c.id : CATS[0].id;
    }
    return CURRENT ? CURRENT.cat : '';
  }

  function renderHeader() {
    var active = activeCat();
    var cats = CATS.map(function (c) {
      return '<a class="' + (c.id === active ? 'on' : '') + '" href="' + catHref(c.id) + '">'
        + esc(nm(c)) + '</a>';
    }).join('');

    document.getElementById('hdr').innerHTML =
      '<div class="hdr-in">'
      + '<div class="hdr-l">'
      + '<button class="burger" type="button" data-act="menu" aria-label="' + esc(L('menu')) + '"><span></span><span></span><span></span></button>'
      + '<nav class="hdr-cats t-micro">' + cats + '</nav>'
      + '</div>'
      + '<a class="mark" href="index.html">SŁODKIE MARZENIA</a>'
      + '<div class="hdr-r">'
      /* На телефоні лупа ховається, а конверт лишається: пошук
         переїжджає першим рядком у меню під бургером, тож у шапці
         справа стоїть один зрозумілий значок, а не два дрібних. */
      + '<button class="icon hdr-search" type="button" data-act="search" aria-label="' + esc(L('search')) + '">' + ICON_SEARCH + '</button>'
      + '<button class="icon hdr-contact" type="button" data-act="modal" aria-label="' + esc(L('contacts')) + '">' + ICON_PHONE + '</button>'
      + '<div class="lang hdr-lang">' + langHTML() + '</div>'
      + '</div></div>';
  }

  /* Умови — цілий абзац тексту на кожен блок. На десктопі вони просто
     стоять колонками, а на телефоні розгортались у стіну, більшу за
     решту футера разом узяту, тож там заголовок стає кнопкою і список
     розкривається по тапу. Одна й та сама розмітка на обох ширинах:
     що показувати, вирішує CSS — на десктопі кнопка не натискається. */
  function termsCol(titleKey, listKey) {
    var li = L(listKey).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    var on = !!S.ftr[titleKey];
    return '<div class="ftr-col ftr-acc' + (on ? ' is-open' : '') + '">'
      + '<button class="ftr-head ftr-lab t-micro" type="button" data-act="ftr" data-v="' + titleKey + '"'
      + ' aria-expanded="' + on + '">' + esc(L(titleKey)) + '<i aria-hidden="true"></i></button>'
      + '<ul class="ftr-terms">' + li + '</ul></div>';
  }

  /* Копірайт лишається англійською в обох мовах — так просив замовник.
     Рік беремо поточний, щоб футер не застарів у січні. */
  var SITE_DOMAIN = 'Slodkiemarzenia.pl';
  var AUTHOR = { name: 'Andrii Voitiuk', href: 'https://t.me/kovelwebic' };

  function renderFooter() {
    var copy = '© ' + new Date().getFullYear() + ' ' + SITE_DOMAIN + ' · All rights reserved';

    document.getElementById('ftr').innerHTML =
      '<div class="ftr-in">'
      + '<div class="ftr-col brand">'
      + '<b>SŁODKIE MARZENIA</b>'
      + '<span class="t-micro muted">' + esc(L('tagline')) + '</span>'
      + '</div>'
      + termsCol('orderTerms', 'orderList')
      + termsCol('deliveryTerms', 'deliveryList')
      + '<div class="ftr-col ftr-links">'
      + '<span class="t-micro ftr-lab">' + esc(L('contacts')) + '</span>'
      + '<div class="ftr-links-row">' + contactRows() + '</div>'
      + '</div>'
      + '</div>'
      /* Копірайт стоїть окремим рядком під усіма колонками, а не в
         колонці бренду: це службовий рядок про весь сайт, і в колонці
         він читався як частина контактів кондитерки. Підпис автора —
         на тому ж рівні праворуч. */
      + '<div class="ftr-bottom">'
      + '<span class="ftr-copy">' + esc(copy) + '</span>'
      + '<span class="ftr-copy ftr-credit">Created by '
      + '<a href="' + esc(AUTHOR.href) + '" target="_blank" rel="noopener">' + esc(AUTHOR.name) + '</a>'
      + '</span></div>';
  }

  /* ---------------- головна ---------------- */

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
    return '<div class="about-row rv' + mod + '">'
      + '<div class="about-ph"><span class="t-micro muted">' + esc(L('photoStub')) + '</span></div>'
      + '<div class="about-txt">'
      + '<h2 class="t-sect">' + esc(L('aboutTitle' + n)) + '</h2>'
      + '<p>' + esc(L('aboutText' + n)) + '</p>'
      + '</div></div>';
  }

  /* ---------------- карусель на головній ----------------
     П'ять десертів по колу: один спереду, два приглушені з боків,
     решта чекає за кадром. Позицію кожного задає лише клас, тож
     переїзд анімує CSS, а нам лишається переставляти класи. */

  var HERO_N = 5;
  var HERO_ITEMS = [];
  var HERO_TIMER = null;
  var HERO_STEP = 5200;

  function heroSlot(rel, n) {
    if (rel === 0) return 'is-front';
    if (rel === 1) return 'is-right';
    if (rel === n - 1) return 'is-left';
    return (rel <= n / 2) ? 'is-far-right' : 'is-far-left';
  }

  /* Оновлюємо на місці, а не перемальовуємо: інакше нові вузли
     з'явилися б одразу в кінцевій позиції й переходу не було б. */
  function heroSync() {
    var n = HERO_ITEMS.length;
    if (!n) return;

    [].forEach.call(document.querySelectorAll('.hero-slide'), function (el, i) {
      var rel = (i - S.hi + n) % n;
      el.className = 'hero-slide ' + heroSlot(rel, n);
      /* За кадром картка не має ловити ні палець, ні Tab. */
      el.setAttribute('aria-hidden', rel === 0 ? 'false' : 'true');
      el.tabIndex = rel === 0 ? 0 : -1;
    });

    var p = HERO_ITEMS[S.hi];
    var nmEl = document.querySelector('.hero-name');
    var prEl = document.querySelector('.hero-price');
    if (nmEl) nmEl.textContent = nm(p);
    if (prEl) prEl.textContent = priceText(p);
  }

  function heroGo(d) {
    var n = HERO_ITEMS.length;
    if (!n) return;
    S.hi = (S.hi + d + n) % n;
    heroSync();
  }

  /* Саме обертання і є причиною тут затриматись, тож воно йде саме.
     Курсор над каруселлю й будь-який ручний крок відсувають таймер —
     інакше воно поїхало б з-під пальця. */
  function heroAuto() {
    clearInterval(HERO_TIMER);
    try { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
    if (HERO_ITEMS.length < 2) return;
    HERO_TIMER = setInterval(function () { heroGo(1); }, HERO_STEP);
  }

  function bindHero() {
    var stage = document.querySelector('.hero-stage');
    if (!stage) return;
    stage.addEventListener('mouseenter', function () { clearInterval(HERO_TIMER); });
    stage.addEventListener('mouseleave', heroAuto);
    heroAuto();
  }

  function heroHTML() {
    var slides = HERO_ITEMS.map(function (p, i) {
      var rel = (i - S.hi + HERO_ITEMS.length) % HERO_ITEMS.length;
      return '<a class="hero-slide ' + heroSlot(rel, HERO_ITEMS.length) + '"'
        + ' data-i="' + i + '" href="' + prodHref(p) + '" tabindex="' + (rel === 0 ? 0 : -1) + '">'
        + '<img src="' + esc(p.photos[0]) + '" alt="' + esc(nm(p)) + '"'
        + (i === S.hi ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async">'
        + '</a>';
    }).join('');

    var cur = HERO_ITEMS[S.hi];

    return '<div class="hero-stage">'
      + '<div class="hero-slides">' + slides + '</div>'
      + '<div class="hero-nav">'
      + '<button class="hero-arrow" type="button" data-act="hero" data-v="-1" aria-label="&larr;">&lsaquo;</button>'
      + '<span class="hero-meta">'
      + '<span class="hero-name">' + esc(nm(cur)) + '</span>'
      + '<span class="hero-price">' + esc(priceText(cur)) + '</span>'
      + '</span>'
      + '<button class="hero-arrow" type="button" data-act="hero" data-v="1" aria-label="&rarr;">&rsaquo;</button>'
      + '</div></div>';
  }

  /* Головна: герой → дві стрічки → блок про кондитерку → футер. */
  function renderHome() {
    var a = PRODUCTS.filter(function (p) { return p.cat === 'cakes'; }).slice(0, 10);
    var b = PRODUCTS.filter(function (p) { return p.cat !== 'cakes'; }).slice(0, 10);

    /* Перші позиції в категорії — ті, які замовниця поставила першими
       сама, тож у вітрину йдуть саме вони. */
    HERO_ITEMS = sortItems(inCat('cakes'), true).slice(0, HERO_N);
    if (S.hi >= HERO_ITEMS.length) S.hi = 0;

    document.getElementById('main').innerHTML =
      '<section class="hero"><div class="wrap hero-in">'
      + '<div class="hero-txt">'
      + '<span class="t-micro muted">' + esc(L('tagline')) + '</span>'
      + '<h1 class="t-hero">SŁODKIE<br>MARZENIA</h1>'
      + '<p class="hero-lead">' + esc(L('heroLead')) + '</p>'
      + '<a class="hero-cta" href="' + catHref('cakes') + '">'
      + '<span>' + esc(L('chooseDessert')) + '</span><i aria-hidden="true">&rarr;</i></a>'
      + '</div>'
      + heroHTML()
      + '</div></section>'

      + '<section class="strips">' + stripHTML(a, 'l') + stripHTML(b, 'r') + '</section>'

      + '<section class="wrap about">'
      + aboutRow(1, '') + aboutRow(2, ' is-flipped')
      + '</section>';

    bindHero();
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

  /* Спільної сторінки «Всі товари» більше немає: каталог завжди
     показує конкретну категорію. Порожній або невідомий ?cat=
     відкриває першу — так у людини завжди є контекст, де вона є. */
  function renderCatalog() {
    var cat = catById(qs('cat')) || CATS[0];
    var catId = cat.id;

    var items = sortItems(inCat(catId), true);

    var chips = CATS.map(function (c) {
      return '<a class="chip t-micro' + (catId === c.id ? ' on' : '') + '" href="' + catHref(c.id) + '">' + esc(nm(c)) + '</a>';
    }).join('');

    var sorts = [['name', 'sortDefault'], ['priceUp', 'priceUp'], ['priceDown', 'priceDown']].map(function (s) {
      return '<button type="button" data-act="sort" data-v="' + s[0] + '" class="' + (S.sort === s[0] ? 'on' : '') + '">' + esc(L(s[1])) + '</button>';
    }).join('');

    /* Категорії з підкатегоріями (зефір) показуємо секціями, решту —
       однією сіткою. Сортування діє всередині кожної секції. */
    var subs = SUBCATS[catId];
    var body;
    if (subs) {
      body = subs.map(function (s) {
        var part = items.filter(function (p) { return p.sub === s.id; });
        if (!part.length) return '';
        return '<div class="sub">'
          + '<span class="sub-head t-micro">' + esc(nm(s)) + '</span>'
          + '<div class="grid">' + part.map(cardHTML).join('') + '</div></div>';
      }).join('');
    } else {
      body = '<div class="grid">' + items.map(cardHTML).join('') + '</div>';
    }

    document.getElementById('main').innerHTML =
      '<section class="wrap">'
      + '<h1 class="t-hero cat-head">' + esc(nm(cat)) + '</h1>'
      + '<div class="bar">'
      + '<div class="chips">' + chips + '</div>'
      + '<div class="bar-r"><div class="sorts">' + sorts + '</div></div>'
      + '</div>'
      + body
      + '</section>';

    document.title = nm(cat) + ' — Słodkie Marzenia';
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
        + '<p class="t-micro muted empty"><a href="' + catHref(CATS[0].id) + '">' + esc(nm(CATS[0])) + ' &rarr;</a></p></section>';
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

    /* Показуємо всю решту категорії, а не обрізану стрічку: сторінка
       товару стає продовженням каталогу, і людині не треба вертатись
       назад, щоб побачити інші варіанти. Порядок — той самий, що й
       у каталозі. */
    var others = sortItems(
      inCat(p.cat).filter(function (o) { return o.id !== p.id; }), true
    );

    main.innerHTML =
      '<section class="wrap pdp">'

      + '<div class="pdp-l">'
      + '<a class="t-micro muted" href="' + back + '">&larr; ' + esc(L('back')) + '</a>'
      + '<h1 class="t-prod">' + esc(prodTitle(p, S.sel)) + '</h1>'
      + skladHTML(p, 'desk')
      + '</div>'

      + '<div class="pdp-c">'
      + '<div class="gal"><img src="' + esc(p.photos[S.gi]) + '" alt="' + esc(prodTitle(p, S.sel)) + '" fetchpriority="high" decoding="async">' + arrows + '</div>'
      + dots
      + '</div>'

      + '<div class="pdp-r">'
      + '<div>'
      + '<div class="price">' + esc(priceText(p, S.sel)) + '</div>'
      + (note ? '<div class="t-sklad muted" style="margin-top:8px">' + esc(note) + '</div>' : '')
      + '</div>'
      + variantsHTML(p)
      + '<button class="btn-order" type="button" data-act="modal">' + esc(L('order')) + '</button>'
      + '<span class="made-to-order muted">' + esc(L('madeToOrder')) + '</span>'
      /* на мобільному склад стоїть між кнопкою і соцмережами, на десктопі — у лівій колонці */
      + skladHTML(p, 'mob')
      + '<div class="links">' + contactRows() + '</div>'
      + '</div>'

      + '</section>'

      + (others.length
        ? '<section class="wrap others"><h2 class="t-sect rv">' + esc(L('other')) + '</h2>'
        + '<div class="grid">' + others.map(cardHTML).join('') + '</div></section>'
        : '');

    bindGallery();
    document.title = prodTitle(p, S.sel) + ' — Słodkie Marzenia';
  }

  /* ---------------- перехід на сторінку товару ----------------
     Плитка кольору фону затягує екран, під нею відбувається перехід,
     на новій сторінці вона розходиться. Тільки десктоп: на телефоні
     перехід і так миттєвий, а зайвий шар лише з'їдав би батарею.  */

  var TILE_FLAG = 'sm-tiles';

  /* На телефоні перехід коротший: там кожен зайвий кадр між тапом і
     новою сторінкою читається як гальмо, а не як плавність. */
  function narrow() {
    try { return matchMedia('(max-width: 1100px)').matches; } catch (e) { return false; }
  }
  function tileIn()    { return narrow() ? 300 : 450; }   /* чекаємо, поки плитка зійдеться */
  function tileSpread(){ return narrow() ? 120 : 220; }   /* розкид витримок між плитками */

  /* Переходимо з анімацією між своїми сторінками. Зовнішні лінки,
     tel: і якорі лишаємо браузеру. */
  function isLocalPage(href) {
    return /^(index|catalog|product)\.html(\?|#|$)/.test(href || '');
  }

  function isSamePage(href) {
    try { return new URL(href, location.href).href === location.href; }
    catch (e) { return false; }
  }

  function tilesAllowed() {
    try {
      return !matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    var spread = tileSpread();
    for (var i = 0; i < cols * rows; i++) {
      var t = document.createElement('i');
      t.style.transitionDelay = Math.round(Math.random() * spread) + 'ms';
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
    setTimeout(function () { location.href = href; }, tileIn());
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

  /* Розкриття навмисно швидше за закриття: поки плитка сходиться,
     людина ще дивиться на попередню сторінку, а поки розходиться —
     вже чекає на нову. Симетричні витримки тут читались би як гальмо. */
  function tilesReveal(wrap) {
    if (!wrap) return;
    var spread = Math.round(tileSpread() * .6);
    [].forEach.call(wrap.children, function (t) {
      t.style.transitionDelay = Math.round(Math.random() * spread) + 'ms';
    });
    reflow(wrap);              /* фіксуємо стан «закрито» */
    wrap.classList.add('is-out');
    wrap.classList.remove('is-on');
    setTimeout(function () { wrap.remove(); }, 420);
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

  /* Перемикання фото й варіантів міняє лише те, що справді змінилось:
     саме фото, крапки, назву, ціну й активні пігулки. Раніше тут
     перемальовувалась уся сторінка — разом із «Іншими товарами», тобто
     кожен свайп наново піднімав десяток картинок і збивав анімацію
     появи. Заразом це дає фото плавну заміну замість ривка. */
  function refreshProduct() {
    var p = CURRENT;
    if (!p) return;
    var title = prodTitle(p, S.sel);

    var img = document.querySelector('.gal img');
    if (img) {
      var src = p.photos[S.gi];
      if (img.getAttribute('src') !== src) {
        img.setAttribute('src', src);
        img.classList.remove('is-swap');
        void img.offsetWidth;            /* перезапуск анімації */
        img.classList.add('is-swap');
      }
      img.alt = title;
    }

    var h = document.querySelector('.t-prod');
    if (h) h.textContent = title;

    var pr = document.querySelector('.price');
    if (pr) pr.textContent = priceText(p, S.sel);

    [].forEach.call(document.querySelectorAll('.dots button'), function (b, i) {
      b.className = (i === S.gi) ? 'on' : '';
    });

    if (p.variants) {
      [].forEach.call(document.querySelectorAll('.varblock'), function (vb, vi) {
        var v = p.variants[vi];
        if (!v) return;
        [].forEach.call(vb.querySelectorAll('.pill'), function (b, oi) {
          b.className = 'pill' + ((S.sel[v.id] || 0) === oi ? ' on' : '');
        });
      });
    }

    document.title = title + ' — Słodkie Marzenia';
  }

  function step(d) {
    var n = CURRENT.photos.length;
    S.gi = (S.gi + d + n) % n;
    syncPhotoVar();
    refreshProduct();
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
      }).join('');

      /* UA/PL стоїть у верхньому рядку меню, поруч із хрестиком: у
         підвалі меню, під контактами, його просто не знаходили. */
      html = '<div class="sheet">'
        + '<div class="sheet-bar sheet-bar-menu">'
        + '<div class="lang lang-menu">' + langHTML() + '</div>'
        + '<button class="sheet-close" type="button" data-act="close" aria-label="' + esc(L('close')) + '">&times;</button></div>'
        + '<button class="menu-search t-micro" type="button" data-act="search">'
        + ICON_SEARCH + '<span>' + esc(L('search')) + '</span></button>'
        + '<nav class="menu-links">' + links + '</nav>'
        + '<div class="links" style="margin-top:48px">' + contactRows() + '</div>'
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
    /* Результати пошуку показуємо одразу, без спостерігача: оверлей
       має власну прокрутку, і покладатись тут на перетин з вікном —
       зайвий ризик лишити людину з порожнім екраном. */
    revealNow(ov);
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
    bindReveal();
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

    /* Клік по боковому десерту в каруселі повертає його наперед, а не
       веде на сторінку: спершу людина хоче роздивитись. Перевірка йде
       найпершою — картка це <a>, і без неї її перехопив би загальний
       обробник посилань нижче. */
    var slide = e.target.closest && e.target.closest('.hero-slide');
    if (slide && !slide.classList.contains('is-front')) {
      e.preventDefault();
      S.hi = +slide.dataset.i;
      heroSync();
      heroAuto();
      return;
    }

    /* Будь-який перехід між сторінками сайту — спершу плитка, потім
       навігація: картка товару, розділ у шапці, чіп, «Назад», вордмарк.
       Модифікатори й середню кнопку не чіпаємо: «відкрити в новій
       вкладці» має працювати як завжди. Посилання на поточну сторінку
       пропускаємо — інакше активний чіп перезавантажував би її. */
    var link = e.target.closest && e.target.closest('a[href]');
    if (link && tilesAllowed() && e.button === 0
        && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      var href = link.getAttribute('href');
      if (isLocalPage(href) && !isSamePage(href)) {
        e.preventDefault();
        tilesCover(href);
        return;
      }
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

    if (act === 'hero') { heroGo(+el.dataset.v); heroAuto(); return; }

    if (act === 'ftr')  { S.ftr[el.dataset.v] = !S.ftr[el.dataset.v]; renderFooter(); return; }

    if (act === 'sort') { S.sort = el.dataset.v; renderCatalog(); bindReveal(); return; }

    if (act === 'gal') { step(+el.dataset.v); return; }
    if (act === 'dot') { S.gi = +el.dataset.v; syncPhotoVar(); refreshProduct(); return; }

    if (act === 'pill') {
      var v = CURRENT.variants[+el.dataset.v];
      var oi = +el.dataset.o;
      S.sel[v.id] = oi;
      if (CURRENT.photoVar === v.id && v.options[oi].photo != null) S.gi = v.options[oi].photo;
      refreshProduct();
      return;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && S.open) { S.open = null; S.q = ''; renderOverlays(); }
  });

  /* ---------------- поява при прокрутці ----------------
     Розмітка приходить із класом .rv (прихований стан), спостерігач
     додає .is-in. Якщо IntersectionObserver недоступний — показуємо
     все одразу: анімація не варта того, щоб через неї зник каталог. */

  var RV_OBS = null;

  function revealNow(root) {
    [].forEach.call(root.querySelectorAll('.rv'), function (el) {
      el.classList.add('is-in');
    });
  }

  function bindReveal() {
    if (!window.IntersectionObserver) { revealNow(document); return; }

    if (!RV_OBS) {
      RV_OBS = new IntersectionObserver(function (entries, obs) {
        /* Сходинка затримки всередині одного спрацювання: ряд карток
           проявляється хвилею, а не всі разом. Стеля — щоб довгий
           хвіст не тягнувся секунду. */
        var n = 0;
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.style.transitionDelay = Math.min(n++, 5) * 60 + 'ms';
          en.target.classList.add('is-in');
          obs.unobserve(en.target);
        });
      }, { rootMargin: '0px 0px -8% 0px' });
    }

    [].forEach.call(document.querySelectorAll('.rv:not(.is-in)'), function (el) {
      RV_OBS.observe(el);
    });
  }

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
