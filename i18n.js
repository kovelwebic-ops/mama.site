/* =========================================================
   i18n.js — словник інтерфейсу UA / PL.

   Тут лежать ТІЛЬКИ підписи інтерфейсу. Назви й склади товарів
   беруться з полів name_pl / desc_pl у products.js — вони поки
   порожні, тож підставляється українське.
   ========================================================= */

(function (global) {
  'use strict';

  var UA = {
    tagline:     'Домашня кондитерка · Польща',
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
    categories:  'Категорії',
    language:    'Мова',
    menu:        'Меню',
    close:       'Закрити',
    product:     'Товар',
    onRequest:   'Ціна за запитом',
    byName:      'За назвою',
    priceUp:     'Ціна ↑',
    priceDown:   'Ціна ↓',
    density:     'Щільність',
    nothing:     'Нічого не знайдено',
    notFound:    'Товар не знайдено'
  };

  var PL = {
    tagline:     'Domowa cukiernia · Polska',
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
    categories:  'Kategorie',
    language:    'Język',
    menu:        'Menu',
    close:       'Zamknij',
    product:     'Produkt',
    onRequest:   'Cena na zapytanie',
    byName:      'Po nazwie',
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
