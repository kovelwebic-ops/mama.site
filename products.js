/* =========================================================
   products.js — усі дані каталогу. Це джерело правди для сайту.
   Data.txt у папках з фото — людиночитна копія тих самих даних для
   замовниці; правлячи щось тут, онови і її.

   Поля товару:
     id        унікальний ключ, іде в product.html?id=
     cat       категорія
     name      назва UA          name_pl  назва PL (порожньо → береться UA)
     desc      склад UA          desc_pl  склад PL
     photos[]  шляхи до фото (перше — основне, друге показується на ховері)
     price     число zł, або null → «Ціна за запитом»
     unit      суфікс до ціни: '/кг', '/шт'
     priceText готовий рядок ціни, перекриває price (напр. '100–150 zł')
     weight    вага рядком
     note      примітка під ціною    note_pl
     variants  блоки пігулок вибору
     photoVar  id блока, вибір у якому міняє фото
     sub       підкатегорія (див. SUBCATS), order — місце в ній
   ========================================================= */

(function (global) {
  'use strict';

  function img(dir, file) { return encodeURI(dir + '/' + file); }

  /* ---------- категорії ---------- */

  var CATS = [
    { id: 'cakes',       name: 'Торти',    name_pl: 'Torty' },
    { id: 'cheesecakes', name: 'Чізкейки', name_pl: 'Serniki' },
    { id: 'mousse',      name: 'Мусові',   name_pl: 'Musowe' },
    { id: 'zefir',       name: 'Зефір',    name_pl: 'Pianki' },
    { id: 'candybar',    name: 'Кендібар', name_pl: 'Candy bar' }
  ];

  /* ---------- підкатегорії ----------
     Категорії, у яких забагато різнотипних позицій для однієї сітки.
     Каталог такої категорії розбивається на секції в цьому порядку;
     товар потрапляє в секцію за полем sub.                          */

  var SUBCATS = {
    zefir: [
      { id: 'bouquets', name: 'Букети',    name_pl: 'Bukiety' },
      { id: 'boxes',    name: 'Коробочки', name_pl: 'Pudełka' },
      { id: 'pieces',   name: 'Поштучно',  name_pl: 'Na sztuki' }
    ]
  };

  /* ---------- контакти ----------
     Скрізь показуємо тільки підпис; сама адреса живе в href.
     Порожній href → лінк неактивний і приглушений сірим.

     +380 50 143 56 46 — НЕ телефон для дзвінків, а лише адреса
     Telegram. Робочий номер для зв'язку — польський +48 787 208 935. */

  var CONTACTS = [
    { id: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=100027222292650' },
    { id: 'telegram', label: 'Telegram', href: 'https://t.me/+380501435646' },
    { id: 'phone',    label: 'Телефон',  label_pl: 'Telefon',
      href: 'tel:+48787208935' }
  ];

  var P = [];

  /* ---------- 1. Торти — 21 позиція, без варіантів, ціна за кг ---------- */

  /* Порядок у масиві = порядок на сайті (order береться з індексу).
     Перші шість вибрала замовниця, решта — за яскравістю зрізу:
     контрастні й кольорові вище, однотонні бежеві в кінці. */
  [
    ['Фісташка малина', 'Фісташка малина.jpg', 'Фісташковий бісквіт, фісташковий мус, малинове конфі, фісташковий крем чіз', 125],
    ['Снікерс', 'Снікерс.jpg', 'Шоколадний бісквіт, солона карамель, арахіс, крем чіз', 115],
    ['Шпинат полуниця', 'Шпинат полуниця.jpg', 'Шпинатний бісквіт, м’ятний мус, полуничне конфі, крем чіз маскарпоне', 125],
    ['Полуничне тріо', 'Полуничне тріо.jpg', 'Молочний бісквіт, полуничний мус, полуничне конфі, полуничне кюлі, крем чіз', 120],
    ['Малиновий рай', 'Малиновий рай.jpg', 'Бісквіт з додаванням малинового пюре, малиновий мус, кокосовий прошарок, малиновий крем', 120],
    ['Орео', 'Орео.jpg', 'Шоколадний бісквіт, чизкейк орео, мус орео, крем чіз', 115],
    ['Червоний оксамит', 'Червоний оксамит.jpg', 'Бісквіт червоний оксамит, вишневе конфі, полуничний ганаш, крем чіз, маскарпоне', 120],
    ['Вишня шоколад', 'Вишня шоколад.jpg', 'Бісквіт на молочному шоколаді, шоколадний крем чіз, вишня', 100],
    ['Кокос чорниця', 'Кокос чорниця.jpg', 'Кокосовий бісквіт, кокосовий мус, чорничне конфі, чорничний крем чіз', 120],
    ['Малина шоколад', 'Малина шоколад.jpg', 'Шоколадний бісквіт, малиновий мус з малиною в білому шоколаді, малинове конфі, крем чіз', 125],
    ['Дубайський шоколад', 'Дубайський шоколад.jpg', 'Шоколадний бісквіт, шоколадне кремю, начинка дубайський шоколад, фісташковий крем', 130],
    ['Монастирська вежа', 'Монастирська вежа.jpg', 'Пісочні трубочки з вишнею, зі сметанним кремом', 80],
    ['Лісові ягоди - шоколад', 'Лісові ягоди - шоколад.jpg', 'Молочний бісквіт, конфі лісові ягоди, мус на чорному шоколаді', 120],
    ['Лайм абрикос', 'Лайм абрикос.jpg', 'Шпинатно-лаймовий бісквіт, сметанно-вершковий крем, абрикосове конфі', 100],
    ['Чорниця лимон', 'Чорниця лимон.jpg', 'Лимонний бісквіт, чорничний мус, чорничне конфі, лимонний ганаш, крем чіз', 115],
    ['Молочна дівчинка', 'Молочна дівчинка.jpg', 'Коржі на згущеному молоці, крем чіз, маскарпоне, смородинове конфі', 110],
    ['Жіночі примхи', 'Жіночі примхи.jpg', 'Бісквіт шоколадний, горіховий, з маком, з родзинками, сметанний крем', 80],
    ['Медовик класичний', 'Медовик класичний.jpg', 'Медові коржі, вершково-сметанний крем', 80],
    ['Мед груша горгонзола', 'Мед груша горгонзола.jpg', 'Тонкі медово-мигдалеві коржі, карамелізована груша, сир горгонзола, сметанно медовий крем', 120],
    ['Наполеон', 'Наполеон.jpg', 'Листові коржі, крем пломбір', 80],
    ['Апельсиновий', 'Апельсиновий.jpg', 'Бісквіт з апельсиновою цедрою, легкий шоколадний крем, апельсиновий мус, апельсинове конфі', 110]
  ].forEach(function (c, i) {
    P.push({
      id: 'cake' + (i + 1), cat: 'cakes', order: i + 1,
      name: c[0], name_pl: '', desc: c[2], desc_pl: '',
      photos: [img('Cakes', c[1])],
      price: c[3], unit: '/кг'
    });
  });

  /* ---------- 2. Чізкейки — 5 позицій, вибір ваги міняє ціну ---------- */

  [
    ['Полуниця-лайм', 'Полуниця-лайм.jpg', 'Пісочна основа, чізкейк з цедрою лайму, полуничне конфі', 120],
    ['Вишня-шоколад', 'Вишня-шоколад.jpg', 'Пісочна основа, чізкейк на молочному чи темному шоколаді на вибір, вишневе конфі', 120],
    ['Фісташка-малина', 'Фісташка-малина.jpg', 'Пісочна основа з додаванням фісташок, фісташковий чізкейк, малинове конфі', 130],
    ['Снікерс', 'Снікерс.jpg', 'Шоколадна основа, чізкейк з арахісовою пастою, солона карамель і арахіс, шоколадна заливка', 130],
    ['Лохина-мигдаль', 'Лохина-мигдаль.jpg', 'Пісочна основа з шматочками мигдалю, чізкейк з мигдалевою пастою, конфі з лохини', 130]
  ].forEach(function (c, i) {
    var vars = [{
      id: 'weight', label: 'Вага', label_pl: 'Waga',
      options: [
        { label: '1,2 кг', label_pl: '1,2 kg', price: c[3] },
        { label: '600 г',  label_pl: '600 g',  price: 80 }
      ]
    }];
    if (c[0] === 'Вишня-шоколад') {
      vars.push({
        id: 'choc', label: 'Шоколад', label_pl: 'Czekolada',
        options: [
          { label: 'Молочний', label_pl: 'Mleczna' },
          { label: 'Темний',   label_pl: 'Gorzka' }
        ]
      });
    }
    P.push({
      id: 'chz' + (i + 1), cat: 'cheesecakes',
      name: c[0], name_pl: '', desc: c[2], desc_pl: '',
      photos: [img('Cheesecakes', c[1])],
      price: c[3], variants: vars
    });
  });

  /* ---------- 3. Мусові десерти — 6 позицій, 85 zł / 460 г ---------- */

  /* Порядок: спершу кольоровий велюр і контрастні зрізи, коричневі — далі. */
  [
    ['Полуничний', 'Полуничний.jpg', 'Бісквіт Дакуаз з кокосовою стружкою, полунична начинка, полуничний мус'],
    ['Фісташка малина', 'Фісташка малина.jpg', 'Фісташковий бісквіт, малинова начинка, фісташковий мус'],
    ['Лимонно полуничний', 'Лимонно полуничний.jpg', 'Молочний бісквіт, полуничне конфі, полуничний мус, лимонний мус'],
    ['Снікерс', 'Снікерс.jpg', 'Шоколадний бісквіт, солона карамель, арахіс, мус на молочному шоколаді'],
    ['Апельсинова ніжність', 'Апельсинова ніжність.jpg', 'Молочний бісквіт, апельсиновий крем, хрумкий прошарок, йогуртовий мус'],
    ['Баунті', 'Баунті.jpg', 'Шоколадний бісквіт, кокосова начинка, мус на темному шоколаді']
  ].forEach(function (c, i) {
    P.push({
      id: 'mus' + (i + 1), cat: 'mousse', order: i + 1,
      name: c[0], name_pl: '', desc: c[2], desc_pl: '',
      photos: [img('Мусові', c[1])],
      price: 85, weight: '460 г',
      note: 'Ціна вказана без декору. Вага 450–470 г залежно від форми',
      note_pl: 'Cena bez dekoru. Waga 450–470 g w zależności od formy'
    });
  });

  /* ---------- 4. Зефір ---------- */

  /* 9 смаків — спільні для «поштучно» і «морозива».
     Колонки: [підпис UA, фото, назва товару UA, підпис PL, назва PL] */
  var FL = [
    ['Класичний', 'Зефір класичний.jpg', 'Зефір класичний', 'Klasyczna', 'Pianka klasyczna'],
    ['Вишня',    'Зефір вишня.jpg',    'Зефір вишня',    'Wiśnia',      'Pianka wiśniowa'],
    ['Полуниця', 'Зефір полуниця.jpg', 'Зефір полуниця', 'Truskawka',   'Pianka truskawkowa'],
    ['Бурувка',  'Зефір бурувка.jpg',  'Зефір бурувка',  'Borówka',     'Pianka borówkowa'],
    ['Банан',    'Зефір банан.jpg',    'Зефір банан',    'Banan',       'Pianka bananowa'],
    ['Персик',   'Зефір персик.jpg',   'Зефір персик',   'Brzoskwinia', 'Pianka brzoskwiniowa'],
    ['Абрикос',  'Зефір абрикос.jpg',  'Зефір абрикос',  'Morela',      'Pianka morelowa'],
    ['Кава',     'Зефір кава.jpg',     'Зефір кава',     'Kawa',        'Pianka kawowa'],
    ['Слива',    'Зефір слива.jpg',    'Зефір слива',    'Śliwka',      'Pianka śliwkowa']
  ];

  /* а) одна сторінка на 9 смаків — вибір міняє фото і назву */
  P.push({
    id: 'zef-piece', cat: 'zefir', sub: 'pieces', order: 3,
    name: 'Зефір поштучно', name_pl: '',
    desc: 'Цукор, вода, інвертний сироп, фруктове/ягідне пюре, агар агар', desc_pl: '',
    photos: FL.map(function (f) { return img('Zefiry', f[1]); }),
    price: 8, unit: '/шт', weight: '60 г',
    photoVar: 'flavor',
    variants: [{
      id: 'flavor', label: 'Смак', label_pl: 'Smak',
      options: FL.map(function (f, i) {
        return { label: f[0], label_pl: f[3], photo: i, title: f[2], title_pl: f[4] };
      })
    }]
  });

  /* б) морозиво-зефір — два блоки вибору */
  P.push({
    id: 'zef-ice', cat: 'zefir', sub: 'pieces', order: 1,
    name: 'Морозиво зефір', name_pl: '',
    desc: 'Зефір класичний або фруктовий на вибір, шоколад, посипка', desc_pl: '',
    photos: [
      img('Zefiry', 'Морозиво зефір.jpg'),
      img('Zefiry', 'Морозиво зефір 1.jpg'),
      img('Zefiry', 'Морозиво зефір 2.jpg')
    ],
    price: 10, unit: '/шт', weight: '60 г/шт',
    note: 'Замовлення від 8 шт', note_pl: 'Zamówienie od 8 szt',
    photoVar: 'choc',
    variants: [
      {
        id: 'choc', label: 'Шоколад', label_pl: 'Czekolada',
        options: [
          { label: 'Молочний', label_pl: 'Mleczna', photo: 0 },
          { label: 'Білий',    label_pl: 'Biała',   photo: 1 },
          { label: 'Темний',   label_pl: 'Gorzka',  photo: 2 }
        ]
      },
      {
        id: 'flavor', label: 'Смак зефіру', label_pl: 'Smak pianki',
        options: FL.map(function (f) { return { label: f[0], label_pl: f[3] }; })
      }
    ]
  });

  /* в) решта 13 позицій — окремі сторінки без варіантів.
     Передостаннє поле — підкатегорія, останнє — порядок у ній
     (менше число = вище). Порядок ручний, за побажанням замовника:
     спершу найефектніші позиції, у коробочках — спершу подвійні. */
  [
    ['Букет зефіру 25 см', '25см букет.jpg', 'Квіти з зефіру, діаметр 25 см', 150, '', '', '', 'bouquets', 1],
    ['Букет зефіру 20 см', '20см букет.jpg', 'Квіти з зефіру, діаметр 20 см', 120, '', '', '', 'bouquets', 2],
    ['Дитячий букет', 'Дитячий.jpg', 'Зефірні фігурки та квіти, діаметр 16 см', 75, '', '', '', 'bouquets', 3],
    ['Коробочка подвійна 18 см', 'Подвійна коробка 2.jpg', 'Низ — завитки, зверху — квіти з зефіру, діаметр 18 см', 110, '', '', '', 'boxes', 1],
    ['Коробочка подвійна 16 см', 'Подвійна коробка.jpg', 'Низ — завитки, зверху — квіти з зефіру, діаметр 16 см', 90, '', '', '', 'boxes', 2],
    ['Подвійна коробочка 15 см', 'Подвійна коробка 3.jpg', 'Низ — завитки, зверху — квіти з зефіру, діаметр 15 см', 70, '', '', '', 'boxes', 3],
    ['Квіти на коробці', 'Коробочка 4.jpg', 'Квіти з зефіру на коробці, діаметр 12 см', 100, '', '', '', 'boxes', 4],
    ['Коробочка «Дитяча» тематична', 'Коробочка 3.jpg', 'Тематичне оформлення, наповнення залежить від діаметра', 100, '', '100–150 zł', 'Ціна залежить від діаметра', 'boxes', 5],
    ['Коробочка зефіру 16 см', 'Коробочка 2.jpg', 'Зефір у коробочці, діаметр 16 см', 80, '', '', '', 'boxes', 6],
    ['Коробочка зефіру 12х15 см', 'Коробочка 1.jpg', 'Зефір у коробочці, розмір 12х15 см', 70, '', '', '', 'boxes', 7],
    ['Сумочка з зефіром дитяча', 'Коробочка.jpg', 'Зефір у подарунковій сумочці, розмір 13х13 см', 60, '', '', '', 'boxes', 8],
    ['Коробочка на 8 завитків', 'Коробочка на 8 зефірів (смак на вибір).jpg', '8 завитків зефіру, смак на вибір', 60, '', '', '', 'boxes', 9],
    ['Зефірне печиво', 'Зефірне печиво.jpg', 'Зефіросендвічі з квітами з зефіру', 20, '/шт', '', 'Мінімальне замовлення 5 шт', 'pieces', 2]
  ].forEach(function (c, i) {
    P.push({
      id: 'zef' + (i + 1), cat: 'zefir', sub: c[7], order: c[8],
      name: c[0], name_pl: '', desc: c[2], desc_pl: '',
      photos: [img('Zefiry', c[1])],
      price: c[3], unit: c[4], priceText: c[5], note: c[6]
    });
  });

  /* ---------- 5. Кендібар — 6 трайфлів + 2 капкейки ----------
     Тексти й ціни з повідомлення замовниці від 05.09.2026.
     Усі трайфли — 90 мл, 10 zł; капкейки — 10 zł/шт.               */

  /* Трайфли попереду капкейків — так просила замовниця; усередині
     трайфлів спершу найконтрастніші стаканчики. */
  [
    ['Трайфл «Лісовий мох з малиною»', 'Лісовий мох з малиною.jpg', 'Шпинатний бісквіт, малинове конфі, малиновий крем', '90 мл'],
    ['Трайфл «Лісовий мох з полуницею»', 'Лісовий мох з полуницею.jpg', 'Шпинатно-лаймовий бісквіт, полуниця, крем', '90 мл'],
    ['Трайфл «Червоний оксамит»', 'Червоний оксамит.jpg', 'Бісквіт червоний оксамит, полуниця, крем', '90 мл'],
    ['Трайфл «Молочний з полуницею»', 'Молочний з полуницею.jpg', 'Молочний бісквіт, полуничне конфі, крем', '90 мл'],
    ['Трайфл «Вишня-шоколад»', 'Вишня-шоколад.jpg', 'Шоколадний бісквіт, вишнева начинка, білий або шоколадний крем', '90 мл'],
    ['Трайфл «Снікерс»', 'Снікерс.jpg', 'Шоколадний бісквіт, солона карамель, арахіс, крем', '90 мл'],
    ['Капкейки класичні', 'Капкейки класичні.jpg', 'Класичний бісквіт, полунична начинка, крем', ''],
    ['Капкейки шоколадні', 'Капкейки шоколадні.jpg', 'Шоколадний бісквіт, вишнева начинка, шоколадний крем', '']
  ].forEach(function (c, i) {
    P.push({
      id: 'cb' + (i + 1), cat: 'candybar', order: i + 1,
      name: c[0], name_pl: '', desc: c[2], desc_pl: '',
      photos: [img('Кендібар', c[1])],
      price: 10, unit: c[3] ? '' : '/шт', weight: c[3]
    });
  });

  /* Фото Zefiry/«Коробочка 5.jpg» і «Коробочка 6.jpg» лишаються в папці,
     але на сайті не показані — опису й ціни для них немає. Щоб додати,
     заведи для них звичайні позиції в блоці 4в вище. */

  /* ---------- польські назви й склади ----------
     Ключ — «категорія|українська назва» (назви повторюються між
     категоріями: «Снікерс» є і в тортах, і в чізкейках, і в мусових).
     Значення — [назва PL, склад PL].

     ⚠ ЧЕРНЕТКОВИЙ ПЕРЕКЛАД. Кондитерські терміни варто вичитати
     носієві мови — особливо назви-бренди («Damskie kaprysy»,
     «Leśny mech», «Pianka na patyku») і те, як місцевий покупець
     називає зефір: тут скрізь «pianka».                              */

  var PL = {
    /* торти */
    'cakes|Апельсиновий': ['Pomarańczowy', 'Biszkopt ze skórką pomarańczową, lekki krem czekoladowy, mus pomarańczowy, konfitura pomarańczowa'],
    'cakes|Вишня шоколад': ['Wiśnia i czekolada', 'Biszkopt na czekoladzie mlecznej, czekoladowy krem serkowy, wiśnie'],
    'cakes|Дубайський шоколад': ['Czekolada dubajska', 'Biszkopt czekoladowy, cremeux czekoladowe, nadzienie dubajskie, krem pistacjowy'],
    'cakes|Кокос чорниця': ['Kokos i jagoda', 'Biszkopt kokosowy, mus kokosowy, konfitura jagodowa, jagodowy krem serkowy'],
    'cakes|Малина шоколад': ['Malina i czekolada', 'Biszkopt czekoladowy, mus malinowy z maliną w białej czekoladzie, konfitura malinowa, krem serkowy'],
    'cakes|Малиновий рай': ['Malinowy raj', 'Biszkopt z przecierem malinowym, mus malinowy, warstwa kokosowa, krem malinowy'],
    'cakes|Мед груша горгонзола': ['Miód, gruszka i gorgonzola', 'Cienkie blaty miodowo-migdałowe, karmelizowana gruszka, ser gorgonzola, krem śmietankowo-miodowy'],
    'cakes|Медовик класичний': ['Miodownik klasyczny', 'Blaty miodowe, krem śmietankowy'],
    'cakes|Молочна дівчинка': ['Mleczna dziewczynka', 'Blaty na mleku skondensowanym, krem serkowy, mascarpone, konfitura z porzeczek'],
    'cakes|Наполеон': ['Napoleonka', 'Blaty z ciasta francuskiego, krem plombir'],
    'cakes|Орео': ['Oreo', 'Biszkopt czekoladowy, sernik Oreo, mus Oreo, krem serkowy'],
    'cakes|Полуничне тріо': ['Truskawkowe trio', 'Biszkopt mleczny, mus truskawkowy, konfitura truskawkowa, coulis truskawkowe, krem serkowy'],
    'cakes|Снікерс': ['Snickers', 'Biszkopt czekoladowy, solony karmel, orzeszki ziemne, krem serkowy'],
    'cakes|Фісташка малина': ['Pistacja i malina', 'Biszkopt pistacjowy, mus pistacjowy, konfitura malinowa, pistacjowy krem serkowy'],
    'cakes|Червоний оксамит': ['Red Velvet', 'Biszkopt Red Velvet, konfitura wiśniowa, ganache truskawkowy, krem serkowy, mascarpone'],
    'cakes|Чорниця лимон': ['Jagoda i cytryna', 'Biszkopt cytrynowy, mus jagodowy, konfitura jagodowa, ganache cytrynowy, krem serkowy'],
    'cakes|Шпинат полуниця': ['Szpinak i truskawka', 'Biszkopt szpinakowy, mus miętowy, konfitura truskawkowa, krem serkowy z mascarpone'],
    'cakes|Жіночі примхи': ['Damskie kaprysy', 'Biszkopt czekoladowy, orzechowy, z makiem, z rodzynkami, krem śmietankowy'],
    'cakes|Лайм абрикос': ['Limonka i morela', 'Biszkopt szpinakowo-limonkowy, krem śmietankowy, konfitura morelowa'],
    'cakes|Монастирська вежа': ['Wieża klasztorna', 'Kruche rurki z wiśniami, krem śmietankowy'],
    'cakes|Лісові ягоди - шоколад': ['Owoce leśne i czekolada', 'Biszkopt mleczny, konfitura z owoców leśnych, mus na gorzkiej czekoladzie'],

    /* чізкейки */
    'cheesecakes|Полуниця-лайм': ['Truskawka-limonka', 'Kruchy spód, sernik ze skórką z limonki, konfitura truskawkowa'],
    'cheesecakes|Вишня-шоколад': ['Wiśnia-czekolada', 'Kruchy spód, sernik na czekoladzie mlecznej lub gorzkiej do wyboru, konfitura wiśniowa'],
    'cheesecakes|Фісташка-малина': ['Pistacja-malina', 'Kruchy spód z pistacjami, sernik pistacjowy, konfitura malinowa'],
    'cheesecakes|Снікерс': ['Snickers', 'Spód czekoladowy, sernik z masłem orzechowym, solony karmel i orzeszki ziemne, polewa czekoladowa'],
    'cheesecakes|Лохина-мигдаль': ['Borówka-migdał', 'Kruchy spód z kawałkami migdałów, sernik z pastą migdałową, konfitura z borówek'],

    /* мусові */
    'mousse|Полуничний': ['Truskawkowy', 'Biszkopt dacquoise z wiórkami kokosowymi, nadzienie truskawkowe, mus truskawkowy'],
    'mousse|Баунті': ['Bounty', 'Biszkopt czekoladowy, nadzienie kokosowe, mus na gorzkiej czekoladzie'],
    'mousse|Фісташка малина': ['Pistacja i malina', 'Biszkopt pistacjowy, nadzienie malinowe, mus pistacjowy'],
    'mousse|Снікерс': ['Snickers', 'Biszkopt czekoladowy, solony karmel, orzeszki ziemne, mus na czekoladzie mlecznej'],
    'mousse|Апельсинова ніжність': ['Pomarańczowa delikatność', 'Biszkopt mleczny, krem pomarańczowy, chrupiąca warstwa, mus jogurtowy'],
    'mousse|Лимонно полуничний': ['Cytrynowo-truskawkowy', 'Biszkopt mleczny, konfitura truskawkowa, mus truskawkowy, mus cytrynowy'],

    /* зефір */
    'zefir|Зефір поштучно': ['Pianki na sztuki', 'Cukier, woda, syrop inwertowany, przecier owocowy, agar-agar'],
    'zefir|Морозиво зефір': ['Pianka na patyku', 'Pianka klasyczna lub owocowa do wyboru, czekolada, posypka'],
    'zefir|Букет зефіру 20 см': ['Bukiet z pianek 20 cm', 'Kwiaty z pianek, średnica 20 cm'],
    'zefir|Букет зефіру 25 см': ['Bukiet z pianek 25 cm', 'Kwiaty z pianek, średnica 25 cm'],
    'zefir|Дитячий букет': ['Bukiet dziecięcy', 'Figurki i kwiaty z pianek, średnica 16 cm'],
    'zefir|Зефірне печиво': ['Ciasteczka z pianką', 'Kanapeczki z pianek z kwiatami'],
    'zefir|Сумочка з зефіром дитяча': ['Torebka z piankami, dziecięca', 'Pianki w torebce prezentowej, rozmiar 13×13 cm'],
    'zefir|Коробочка зефіру 12х15 см': ['Pudełko pianek 12×15 cm', 'Pianki w pudełku, rozmiar 12×15 cm'],
    'zefir|Коробочка зефіру 16 см': ['Pudełko pianek 16 cm', 'Pianki w pudełku, średnica 16 cm'],
    'zefir|Коробочка «Дитяча» тематична': ['Pudełko tematyczne «Dziecięce»', 'Dekoracja tematyczna, zawartość zależy od średnicy'],
    'zefir|Квіти на коробці': ['Kwiaty na pudełku', 'Kwiaty z pianek na pudełku, średnica 12 cm'],
    'zefir|Коробочка на 8 завитків': ['Pudełko na 8 pianek', '8 pianek, smak do wyboru'],
    'zefir|Коробочка подвійна 16 см': ['Pudełko podwójne 16 cm', 'Na dole pianki, na górze kwiaty z pianek, średnica 16 cm'],
    'zefir|Коробочка подвійна 18 см': ['Pudełko podwójne 18 cm', 'Na dole pianki, na górze kwiaty z pianek, średnica 18 cm'],
    'zefir|Подвійна коробочка 15 см': ['Podwójne pudełko 15 cm', 'Na dole pianki, na górze kwiaty z pianek, średnica 15 cm'],

    /* кендібар */
    'candybar|Трайфл «Молочний з полуницею»': ['Trifle «Mleczny z truskawką»', 'Biszkopt mleczny, konfitura truskawkowa, krem'],
    'candybar|Трайфл «Лісовий мох з малиною»': ['Trifle «Leśny mech z maliną»', 'Biszkopt szpinakowy, konfitura malinowa, krem malinowy'],
    'candybar|Трайфл «Лісовий мох з полуницею»': ['Trifle «Leśny mech z truskawką»', 'Biszkopt szpinakowo-limonkowy, truskawki, krem'],
    'candybar|Трайфл «Вишня-шоколад»': ['Trifle «Wiśnia-czekolada»', 'Biszkopt czekoladowy, nadzienie wiśniowe, krem biały lub czekoladowy'],
    'candybar|Трайфл «Снікерс»': ['Trifle «Snickers»', 'Biszkopt czekoladowy, solony karmel, orzeszki ziemne, krem'],
    'candybar|Трайфл «Червоний оксамит»': ['Trifle «Red Velvet»', 'Biszkopt Red Velvet, truskawki, krem'],
    'candybar|Капкейки класичні': ['Babeczki klasyczne', 'Biszkopt klasyczny, nadzienie truskawkowe, krem'],
    'candybar|Капкейки шоколадні': ['Babeczki czekoladowe', 'Biszkopt czekoladowy, nadzienie wiśniowe, krem czekoladowy']
  };

  /* Примітки, які пишуться прямо в даних товару. */
  var NOTE_PL = {
    'Мінімальне замовлення 5 шт': 'Minimalne zamówienie 5 szt',
    'Ціна залежить від діаметра': 'Cena zależy od średnicy'
  };

  P.forEach(function (p) {
    var t = PL[p.cat + '|' + p.name];
    if (t) { p.name_pl = t[0]; p.desc_pl = t[1]; }
    if (p.note && !p.note_pl && NOTE_PL[p.note]) p.note_pl = NOTE_PL[p.note];
  });

  /* ---------- експорт ---------- */

  global.SM_CATS = CATS;
  global.SM_SUBCATS = SUBCATS;
  global.SM_CONTACTS = CONTACTS;
  global.SM_PRODUCTS = P;

})(window);
