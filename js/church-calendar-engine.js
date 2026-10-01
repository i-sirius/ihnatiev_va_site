((root) => {
  "use strict";
  const DAY = 86400000;
  const utc = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
  const key = (date) => date.toISOString().slice(0, 10);
  const add = (date, days) => new Date(date.getTime() + days * DAY);
  function fromJulian(year, month, day) {
    const a = Math.floor((14 - month) / 12), y = year + 4800 - a, m = month + 12 * a - 3;
    const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
    return new Date((jdn - 2440588) * DAY);
  }
  function toJulian(date) {
    const c = Math.floor(date.getTime() / DAY) + 2440588 + 32082;
    const d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor(1461 * d / 4), m = Math.floor((5 * e + 2) / 153);
    return { year: d - 4800 + Math.floor(m / 10), month: m + 3 - 12 * Math.floor(m / 10), day: e - Math.floor((153 * m + 2) / 5) + 1 };
  }
  function pascha(year) {
    const a = year % 4, b = year % 7, c = year % 19, d = (19 * c + 15) % 30;
    const e = (2 * a + 4 * b - d + 34) % 7, total = d + e + 114;
    return fromJulian(year, Math.floor(total / 31), total % 31 + 1);
  }
  const fixed = [
    [12,25,"Різдво Христове","Nativity of Christ"],
    [1,1,"Обрізання Господнє. Святитель Василій Великий","Circumcision of Christ. St Basil the Great"],
    [1,6,"Богоявлення. Хрещення Господнє","Theophany. Baptism of Christ"],
    [2,2,"Стрітення Господнє","Meeting of the Lord"],
    [3,25,"Благовіщення Пресвятої Богородиці","Annunciation"],
    [6,24,"Різдво Іоанна Предтечі","Nativity of St John the Baptist"],
    [6,29,"Апостоли Петро і Павло","Apostles Peter and Paul"],
    [8,6,"Преображення Господнє","Transfiguration"],
    [8,15,"Успіння Пресвятої Богородиці","Dormition of the Mother of God"],
    [8,29,"Усікновення голови Іоанна Предтечі","Beheading of St John the Baptist"],
    [9,8,"Різдво Пресвятої Богородиці","Nativity of the Mother of God"],
    [9,14,"Воздвиження Хреста Господнього","Exaltation of the Holy Cross"],
    [10,1,"Покров Пресвятої Богородиці","Protection of the Mother of God"],
    [11,21,"Введення у храм Пресвятої Богородиці","Entry of the Mother of God into the Temple"],
    [12,6,"Святитель Миколай Чудотворець","St Nicholas the Wonderworker"]
  ];
  function events(year) {
    const result = [];
    function push(date, uk, en, kind = "feast") { result.push({ date: key(date), uk, en, kind }); }
    for (const jy of [year - 1, year]) {
      fixed.forEach(([m,d,uk,en]) => { const date = fromJulian(jy,m,d); if (date.getUTCFullYear() === year) push(date,uk,en); });
    }
    const easter = pascha(year);
    [[-7,"Вербна неділя. Вхід Господа в Єрусалим","Palm Sunday"],[0,"Пасха. Світле Христове Воскресіння","Pascha. Resurrection of Christ"],[39,"Вознесіння Господнє","Ascension"],[49,"Трійця. П’ятидесятниця","Pentecost"]]
      .forEach(([offset,uk,en]) => push(add(easter,offset),uk,en));
    [[add(easter,-48),"Початок Великого посту","Beginning of Great Lent"],[add(easter,57),"Початок Петрового посту","Beginning of the Apostles’ Fast"],[fromJulian(year,8,1),"Початок Успенського посту","Beginning of the Dormition Fast"],[fromJulian(year,11,15),"Початок Різдвяного посту","Beginning of the Nativity Fast"]]
      .forEach(([date,uk,en]) => push(date,uk,en,"fast"));
    return result.sort((a,b) => a.date.localeCompare(b.date));
  }
  const api = { DAY, utc, key, add, fromJulian, toJulian, pascha, events };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ChurchCalendar = api;
})(typeof window !== "undefined" ? window : globalThis);
