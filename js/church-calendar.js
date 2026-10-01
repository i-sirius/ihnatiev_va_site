(() => {
  "use strict";
  const host = document.querySelector("#church-calendar");
  const C = window.ChurchCalendar;
  if (!host || !C) return;
  const q = (name) => host.querySelector(`[data-cal-${name}]`);
  const cache = new Map();
  let years = [], mode = "simple", request = 0, currentData = null;
  const kyivToday = () => {
    const parts = new Intl.DateTimeFormat("en", { timeZone: "Europe/Kyiv", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type).value;
    return `${get("year")}-${get("month")}-${get("day")}`;
  };
  let selected = kyivToday();
  try { if (localStorage.getItem("site:church-calendar-mode") === "full") mode = "full"; } catch {}
  const en = () => document.documentElement.lang === "en";
  const tr = (uk, english) => en() ? english : uk;
  const date = (key) => new Date(`${key}T00:00:00Z`);
  const supported = (key) => years.includes(date(key).getUTCFullYear());
  const el = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  function format(day, options = { day: "numeric", month: "long" }) {
    return new Intl.DateTimeFormat(en() ? "en-GB" : "uk-UA", { ...options, timeZone: "UTC" }).format(day);
  }
  function dual(key) {
    const day = date(key), old = C.toJulian(day);
    return `${format(day)} (${format(C.utc(old.year, old.month, old.day))} ${tr("ст. ст.", "O.S.")})`;
  }
  function allEvents() { return years.flatMap((year) => C.events(year)); }
  function setStatus(text) { q("status").textContent = text; }
  function updateLabels() {
    host.querySelector("h2").textContent = tr("Православний календар", "Orthodox Calendar");
    q("intro").textContent = tr("За старим стилем · Українська Православна Церква", "Old Style · Ukrainian Orthodox Church");
    q("modes").setAttribute("aria-label", tr("Режим календаря", "Calendar view"));
    host.querySelectorAll("[data-cal-mode]").forEach((button) => {
      button.textContent = button.dataset.calMode === "simple" ? tr("Спрощений", "Simple") : tr("Повний", "Full");
      button.setAttribute("aria-pressed", String(button.dataset.calMode === mode));
    });
    q("date-label").textContent = tr("Дата", "Date");
    q("range").textContent = years.length ? tr("Доступні роки: ", "Available years: ") + years.join(", ") : "";
    q("today").textContent = tr("Сьогодні", "Today");
    [["prev","Попередній день","Previous day"],["next","Наступний день","Next day"],["month-prev","Попередній місяць","Previous month"],["month-next","Наступний місяць","Next month"]]
      .forEach(([name,uk,english]) => q(name).setAttribute("aria-label", tr(uk,english)));
    q("legend").textContent = tr("Крапка — велике свято або початок посту. Оберіть день, щоб побачити подробиці.", "A dot marks a major feast or the beginning of a fast. Select a day for details.");
    q("source-label").textContent = tr("Джерело щоденних відомостей: ", "Daily calendar source: ");
    q("source-context").textContent = tr(" — календар, який використовує ", " — also used by the ");
    q("diocese").textContent = tr("Рівненська єпархія УПЦ", "Rivne Diocese of the UOC");
  }
  function renderDay() {
    const target = q("day"); target.replaceChildren();
    const heading = el("h3", dual(selected));
    target.append(heading, el("p", format(date(selected), { weekday: "long", year: "numeric" }), "church-calendar-date-meta"));
    const events = allEvents().filter((event) => event.date === selected);
    events.forEach((event) => target.append(el("p", en() ? event.en : event.uk, "church-calendar-feast")));
    if (currentData) {
      if (currentData.week) target.append(el("p", currentData.week, "church-calendar-week"));
      if (currentData.fasting) target.append(el("p", currentData.fasting, "church-calendar-fasting"));
      if (mode === "full") {
        if (en()) target.append(el("p", "Daily commemorations and references are provided in Ukrainian.", "church-calendar-date-meta"));
        target.append(el("h4", tr("Свята та пам’яті святих", "Feasts and Saints")), el("p", currentData.saints));
        if (currentData.tone) target.append(el("p", currentData.tone));
        if (currentData.readings && currentData.readings.length) {
          target.append(el("h4", tr("Біблійні читання", "Scripture Readings")));
          const readings = el("div", undefined, "church-calendar-readings");
          currentData.readings.forEach((reading) => {
            if (!/^https:\/\/blagovist\.info\/bibliia\?/.test(reading.url)) return;
            const link = el("a", reading.label); link.href = reading.url; link.target = "_blank"; link.rel = "noopener";
            readings.append(link);
          });
          target.append(readings);
        }
      }
    }
  }
  function renderUpcoming() {
    const target = q("upcoming"); target.replaceChildren(); target.hidden = mode === "full";
    if (mode === "full") return;
    target.append(el("h3", tr("Найближчі свята й початки постів", "Upcoming Feasts and Fasts")));
    const events = allEvents().filter((event) => event.date >= selected).slice(0, 6);
    const list = el("ul", undefined, "church-calendar-upcoming");
    events.forEach((event) => {
      const item = el("li"), button = el("button"); button.type = "button";
      button.append(el("span", dual(event.date), "church-calendar-upcoming-date"), el("span", en() ? event.en : event.uk));
      button.addEventListener("click", () => select(event.date)); item.append(button); list.append(item);
    });
    target.append(list);
    if (!events.length) target.append(el("p", tr("У доступному періоді більше немає свят із короткого переліку.", "No further major feasts in the available period.")));
  }
  function monthTarget(delta) {
    const day = date(selected); return C.key(C.utc(day.getUTCFullYear(), day.getUTCMonth() + 1 + delta, 1));
  }
  function renderMonth() {
    q("month").hidden = mode !== "full";
    if (mode !== "full") return;
    const day = date(selected), year = day.getUTCFullYear(), month = day.getUTCMonth() + 1;
    q("month-title").textContent = format(day, { year: "numeric", month: "long" });
    q("month-prev").disabled = !supported(monthTarget(-1)); q("month-next").disabled = !supported(monthTarget(1));
    const weekdays = q("weekdays"); weekdays.replaceChildren();
    for (let i = 0; i < 7; i++) weekdays.append(el("span", format(C.add(C.utc(2026, 1, 5), i), { weekday: "short" })));
    const grid = q("grid"); grid.replaceChildren();
    const offset = (C.utc(year, month, 1).getUTCDay() + 6) % 7;
    for (let i = 0; i < offset; i++) { const gap = el("span"); gap.setAttribute("aria-hidden","true"); grid.append(gap); }
    const marked = new Set(C.events(year).map((event) => event.date));
    const today = kyivToday();
    for (let n = 1; n <= C.utc(year, month + 1, 0).getUTCDate(); n++) {
      const value = C.key(C.utc(year, month, n)), old = C.toJulian(date(value));
      const button = el("button", undefined, "church-calendar-cell"); button.type = "button";
      button.append(el("span", String(n)), el("small", String(old.day)));
      button.setAttribute("aria-label", dual(value)); button.setAttribute("aria-pressed", String(value === selected));
      if (value === today) button.setAttribute("aria-current", "date");
      if (marked.has(value)) button.classList.add("has-feast");
      button.addEventListener("click", () => { select(value); }); grid.append(button);
    }
  }
  function render() {
    updateLabels(); q("date").value = selected;
    q("prev").disabled = !supported(C.key(C.add(date(selected),-1)));
    q("next").disabled = !supported(C.key(C.add(date(selected),1)));
    q("today").disabled = !supported(kyivToday());
    renderMonth(); renderDay(); renderUpcoming();
  }
  async function getJson(path) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 7000);
    try { const response = await fetch(path, { signal: controller.signal }); if (!response.ok) throw new Error("Unavailable"); return await response.json(); }
    finally { clearTimeout(timer); }
  }
  function loadYear(year) {
    if (!cache.has(year)) cache.set(year, getJson(`files/content/church-calendar/${year}.json`).catch((error) => { cache.delete(year); throw error; }));
    return cache.get(year);
  }
  function select(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date(value).getTime()) || C.key(date(value)) !== value) return;
    selected = value; currentData = null; const token = ++request; render();
    if (!supported(value)) { setStatus(tr("Щоденні дані на цей рік ще не додано. Оберіть дату в доступному періоді.", "Daily data for this year is not yet available. Please choose a date in the supported period.")); return; }
    setStatus(tr("Завантаження календаря…", "Loading calendar…"));
    loadYear(date(value).getUTCFullYear()).then((payload) => {
      if (token !== request) return;
      currentData = payload.days && payload.days[value];
      if (!currentData) throw new Error("Missing day");
      setStatus(""); renderDay();
    }).catch(() => {
      if (token !== request) return;
      setStatus(tr("Не вдалося завантажити подробиці дня. Повторіть вибір дати або відкрийте джерело нижче.", "Daily details could not be loaded. Select the date again or open the source below."));
    });
  }
  host.querySelectorAll("[data-cal-mode]").forEach((button) => button.addEventListener("click", () => {
    mode = button.dataset.calMode;
    try { localStorage.setItem("site:church-calendar-mode", mode); } catch {}
    render();
  }));
  q("date").addEventListener("change", () => select(q("date").value));
  q("prev").addEventListener("click", () => select(C.key(C.add(date(selected),-1))));
  q("next").addEventListener("click", () => select(C.key(C.add(date(selected),1))));
  q("today").addEventListener("click", () => select(kyivToday()));
  q("month-prev").addEventListener("click", () => select(monthTarget(-1)));
  q("month-next").addEventListener("click", () => select(monthTarget(1)));
  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  render(); setStatus(tr("Завантаження календаря…", "Loading calendar…"));
  getJson("files/content/church-calendar/index.json").then((index) => {
    years = index.years.filter(Number.isInteger).sort((a,b) => a-b);
    if (!years.length) throw new Error("No years");
    q("date").min = `${years[0]}-01-01`; q("date").max = `${years[years.length-1]}-12-31`;
    select(selected);
  }).catch(() => setStatus(tr("Календар тимчасово недоступний. Відкрийте джерело нижче або оновіть сторінку.", "Calendar unavailable. Open the source below or reload the page.")));
})();
