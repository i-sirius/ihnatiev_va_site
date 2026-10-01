"""Refresh factual daily calendar data from Blagovist (used by Rivne UOC).
Usage: python scripts/sync-church-calendar.py 2026 2027
Only dates, commemorations, fasting labels and Scripture references are stored.
No remote HTML, scripts, images, homilies or prayer translations are embedded.
"""
import concurrent.futures
import datetime as dt
import html.parser
import json
import pathlib
import re
import sys
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "files/content/church-calendar"
SOURCE = "https://blagovist.info/calendar/"

class Text(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(); self.parts = []
    def handle_starttag(self, tag, attrs):
        if tag in ("br", "p", "div"): self.parts.append(" ")
    def handle_endtag(self, tag):
        if tag in ("p", "div", "span"): self.parts.append(" ")
    def handle_data(self, data): self.parts.append(data)

def plain(value):
    parser = Text(); parser.feed(value or "")
    return re.sub(r"\s+", " ", "".join(parser.parts)).strip()

class Readings(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(); self.items=[]; self.href=None; self.label=[]
    def handle_starttag(self, tag, attrs):
        if tag == "a":
            href=dict(attrs).get("href", "")
            self.href=href if href.startswith("https://blagovist.info/bibliia?") else None
            self.label=[]
    def handle_data(self, data):
        if self.href: self.label.append(data)
    def handle_endtag(self, tag):
        if tag == "a" and self.href:
            item={"label": plain("".join(self.label)), "url": self.href}
            if item not in self.items: self.items.append(item)
            self.href=None

def fetch_day(day):
    url=SOURCE+"jsCalData.php?dofcet="+str(day.year)+"-"+str(day.month)+"-"+str(day.day)
    for attempt in range(3):
        try:
            req=urllib.request.Request(url, headers={"User-Agent":"IVA-Calendar-Sync/1.0"})
            with urllib.request.urlopen(req, timeout=25) as response:
                data=json.loads(response.read().decode("utf-8").split("|",1)[-1])
            if data.get("procDate") != day.isoformat() or not data.get("saints"):
                raise ValueError("Unexpected date or empty commemorations: "+day.isoformat())
            readings=Readings(); readings.feed(data.get("evang", ""))
            return day.isoformat(), {
                "day": plain(data.get("day")), "week": plain(data.get("week")),
                "tone": plain(data.get("tone")), "fasting": plain(data.get("trapeza")),
                "saints": plain(data.get("saints")), "readings": readings.items,
                "holiday": bool(data.get("holiday"))
            }
        except Exception:
            if attempt == 2: raise
            time.sleep(1+attempt)

def main(years):
    OUT.mkdir(parents=True, exist_ok=True)
    for year in years:
        start=dt.date(year,1,1);end=dt.date(year+1,1,1)
        days=[start+dt.timedelta(days=i) for i in range((end-start).days)]
        results={}
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            for key,entry in pool.map(fetch_day, days):
                results[key]=entry
                if len(results)%60==0: print(year, len(results), "days", flush=True)
        payload={"year":year,"source":SOURCE,"retrievedAt":dt.datetime.now(dt.timezone.utc).isoformat(),"days":results}
        path=OUT/(str(year)+".json");temp=path.with_suffix(".tmp")
        temp.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        temp.replace(path)
        print(year, "complete:",len(results),"days",flush=True)
    available=sorted(int(p.stem) for p in OUT.glob("[0-9][0-9][0-9][0-9].json"))
    (OUT/"index.json").write_text(json.dumps({"years":available,"source":SOURCE},indent=2)+"\n",encoding="utf-8")

if __name__ == "__main__":
    main([int(value) for value in sys.argv[1:]] or [dt.date.today().year,dt.date.today().year+1])
