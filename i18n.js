/* =========================================================
   i18n.js — словник інтерфейсу UA / PL.

   Тут лежать ТІЛЬКИ підписи інтерфейсу. Назви й склади товарів
   беруться з полів name_pl / desc_pl у products.js — вони поки
   порожні, тож підставляється українське.
   ========================================================= */

(function (global) {
  'use strict';

  var UA = {
    tagline:     'Домашня кондитерка · Живець, Польща',
    scroll:      'Прокрутіть',
    allProducts: 'Всі товари',
    search:      'Пошук',
    searchHint:  'Почніть вводити назву або інгредієнт',
    order:       'Замовити',
    back:        'Назад',
    sklad:       'Склад',
    other:       'Інші товари',
    contacts:    'Контакти',
    categories:  'Категорії',

    /* ⚠ ЧЕРНЕТКА. Умови вигадані як заглушка — замовниця має
       підтвердити терміни, розмір передоплати й зону доставки. */
    orderTerms:    'Умови замовлення',
    orderList: [
      'Замовлення приймаємо щонайменше за 3 дні',
      'Складний декор і великі торти — за 7 днів',
      'Замовлення підтверджуємо після узгодження деталей'
    ],
    deliveryTerms: 'Умови доставки',
    deliveryList: [
      'Самовивіз — за попередньою домовленістю',
      'Доставка по Живцю — вартість узгоджуємо окремо',
      'Торти видаємо у спеціальній упаковці'
    ],

    madeToOrder: 'Кожне замовлення обговорюємо індивідуально',

    /* ⚠ ЧЕРНЕТКА. Текст написаний з того, що видно на самому сайті
       (місто, склад каталогу) — жодних вигаданих фактів про досвід
       чи навчання. Замовниця має переписати своїми словами. */
    aboutTitle1: 'Домашня кондитерка',
    aboutText1:  'Słodkie Marzenia — маленька домашня кондитерка в Живці. Тут немає конвеєра й готової вітрини: кожен торт, чізкейк і коробочка зефіру робляться руками під конкретне замовлення.',
    aboutTitle2: 'Під ваше свято',
    aboutText2:  'У каталозі понад пʼятдесят позицій — від класичного медовика до мусових десертів і зефірних букетів. Смак, розмір і оформлення підбираємо окремо, щоб десерт підійшов саме до вашої дати.',
    photoStub:   'Фото',

    menu:        'Меню',
    close:       'Закрити',
    product:     'Товар',
    onRequest:   'Ціна за запитом',
    sortDefault: 'Рекомендовані',
    priceUp:     'Ціна ↑',
    priceDown:   'Ціна ↓',
    nothing:     'Нічого не знайдено',
    notFound:    'Товар не знайдено'
  };

  var PL = {
    tagline:     'Domowa cukiernia · Żywiec, Polska',
    scroll:      'Przewiń',
    allProducts: 'Wszystkie produkty',
    search:      'Szukaj',
    searchHint:  'Zacznij wpisywać nazwę lub składnik',
    order:       'Zamów',
    back:        'Wróć',
    sklad:       'Skład',
    other:       'Inne produkty',
    contacts:    'Kontakt',
    categories:  'Kategorie',

    orderTerms:    'Warunki zamówienia',
    orderList: [
      'Zamówienia przyjmujemy minimum 3 dni wcześniej',
      'Skomplikowany dekor i duże torty — 7 dni wcześniej',
      'Zamówienie potwierdzamy po ustaleniu szczegółów'
    ],
    deliveryTerms: 'Warunki dostawy',
    deliveryList: [
      'Odbiór osobisty po wcześniejszym uzgodnieniu',
      'Dostawa na terenie Żywca — koszt ustalamy indywidualnie',
      'Torty wydajemy w specjalnym opakowaniu'
    ],

    madeToOrder: 'Każde zamówienie ustalamy indywidualnie',

    aboutTitle1: 'Domowa cukiernia',
    aboutText1:  'Słodkie Marzenia to mała domowa cukiernia w Żywcu. Nie ma tu taśmy produkcyjnej ani gotowej witryny: każdy tort, sernik i pudełko pianek powstają ręcznie pod konkretne zamówienie.',
    aboutTitle2: 'Na Twoją okazję',
    aboutText2:  'W katalogu jest ponad pięćdziesiąt pozycji — od klasycznego miodownika po desery musowe i bukiety z pianek. Smak, rozmiar i dekor dobieramy osobno, żeby deser pasował właśnie do Twojej daty.',
    photoStub:   'Zdjęcie',

    menu:        'Menu',
    close:       'Zamknij',
    product:     'Produkt',
    onRequest:   'Cena na zapytanie',
    sortDefault: 'Polecane',
    priceUp:     'Cena ↑',
    priceDown:   'Cena ↓',
    nothing:     'Nic nie znaleziono',
    notFound:    'Nie znaleziono produktu'
  };

  /* «51 позиція» / «51 pozycja» — відмінювання числівника */
  function plural(n, lang) {
    var d1 = n % 10, d2 = n % 100, w;
    if (lang === 'pl') {
      w = (n === 1) ? 'pozycja'
        : (d1 >= 2 && d1 <= 4 && !(d2 >= 12 && d2 <= 14)) ? 'pozycje' : 'pozycji';
    } else {
      w = (d1 === 1 && d2 !== 11) ? 'позиція'
        : (d1 >= 2 && d1 <= 4 && !(d2 >= 12 && d2 <= 14)) ? 'позиції' : 'позицій';
    }
    return n + ' ' + w;
  }

  global.SM_I18N = { ua: UA, pl: PL };
  global.SM_PLURAL = plural;

})(window);
