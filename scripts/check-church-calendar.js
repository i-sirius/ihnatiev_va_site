const assert = require("node:assert/strict");
const fs = require("node:fs");
const C = require("../js/church-calendar-engine.js");

// Paschal dates cross-checked against https://www.oca.org/fs/paschal-cycle.
for (const [year, expected] of [[2026,"2026-04-12"],[2027,"2027-05-02"],[2028,"2028-04-16"],[2029,"2029-04-08"],[2030,"2030-04-28"]]) {
  assert.equal(C.key(C.pascha(year)), expected);
}
assert.equal(C.key(C.fromJulian(2025,12,25)), "2026-01-07");
assert.deepEqual(C.toJulian(C.utc(2026,1,7)), {year:2025,month:12,day:25});
assert.deepEqual(C.toJulian(C.utc(2026,10,1)), {year:2026,month:9,day:18});
assert.equal(C.key(C.fromJulian(2100,12,25)), "2101-01-08");
for (let year=2026;year<=2027;year++) {
  const events=C.events(year);
  for (const [key,word] of [[`${year}-01-07`,"Різдво Христове"],[`${year}-10-14`,"Покров Пресвятої Богородиці"]]) {
    assert.ok(events.some(e=>e.date===key && e.uk===word));
  }
  assert.equal(events.find(e=>e.en==="Palm Sunday").date,C.key(C.add(C.pascha(year),-7)));
  assert.equal(events.find(e=>e.en==="Pentecost").date,C.key(C.add(C.pascha(year),49)));
}
const base="files/content/church-calendar/";
const manifest=JSON.parse(fs.readFileSync(base+"index.json","utf8"));
for (const year of manifest.years) {
  const payload=JSON.parse(fs.readFileSync(base+year+".json","utf8"));
  const start=C.utc(year,1,1),end=C.utc(year+1,1,1);
  assert.equal(Object.keys(payload.days).length,(end-start)/C.DAY);
  for (let d=start;d<end;d=C.add(d,1)) {
    const day=payload.days[C.key(d)];assert.ok(day && day.day && day.saints, C.key(d));
    assert.ok(!/<(?:script|iframe|img)\b/i.test(JSON.stringify(day)),"Remote HTML must not be embedded");
    for (const reading of day.readings) assert.ok(reading.url.startsWith("https://blagovist.info/bibliia?"));
    const j=C.toJulian(d);assert.equal(C.key(C.fromJulian(j.year,j.month,j.day)),C.key(d));
  }
  assert.match(payload.days[`${year}-01-07`].day,/25 грудня/);
  assert.match(payload.days[`${year}-01-07`].saints,/РІЗДВО/);
  assert.match(payload.days[C.key(C.pascha(year))].saints,/ПАСХА|ВОСКРЕСІННЯ/i);
}
console.log("Church calendar passed: Pascha, Julian dates, year boundaries and complete daily data.");
