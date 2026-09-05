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
    weight:      'Вага',
    volume:      'Об’єм',
    other:       'Інші товари',
    contacts:    'Контакти',

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

    language:    'Мова',
    menu:        'Меню',
    close:       'Закрити',
    product:     'Товар',
    onRequest:   'Ціна за запитом',
    sortDefault: 'Рекомендовані',
    priceUp:     'Ціна ↑',
    priceDown:   'Ціна ↓',
    density:     'Щільність',
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
    weight:      'Waga',
    volume:      'Objętość',
    other:       'Inne produkty',
    contacts:    'Kontakt',

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

    language:    'Język',
    menu:        'Menu',
    close:       'Zamknij',
    product:     'Produkt',
    onRequest:   'Cena na zapytanie',
    sortDefault: 'Polecane',
    priceUp:     'Cena ↑',
    priceDown:   'Cena ↓',
    density:     'Gęstość',
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
