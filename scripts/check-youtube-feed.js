#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const config = fs.readFileSync(path.join(root, "config.js"), "utf8");
const channelMatch = config.match(/\byoutubeChannelId:\s*["']([^"']+)["']/);

if (!channelMatch) {
  throw new Error("Could not find SITE.youtubeChannelId in config.js");
}

const channelId = channelMatch[1];
const cataloguePath = path.join(root, "files", "content", "video-index.json");
const catalogue = JSON.parse(fs.readFileSync(cataloguePath, "utf8"));
const knownIds = new Set(
  (Array.isArray(catalogue.items) ? catalogue.items : [])
    .filter((item) => item && item.enabled !== false)
    .map((item) => String(item.id || item.videoId || "").trim())
    .filter(Boolean)
);
const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;

async function main() {
  let response;
  try {
    response = await fetch(feedUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      throw new Error(`YouTube returned HTTP ${response.status}`);
    }
  } catch (error) {
    console.log(`::warning title=YouTube feed check unavailable::${error.message}`);
    return;
  }

  const xml = await response.text();
  const entryMatch = xml.match(/<entry\b[^>]*>([\s\S]*?)<\/entry>/i);
  const idMatch = entryMatch && entryMatch[1].match(/<(?:yt:)?videoId\b[^>]*>([^<]+)<\/(?:yt:)?videoId>/i);
  const latestId = idMatch && idMatch[1].trim();

  if (!latestId) {
    console.log("::warning title=YouTube feed check unavailable::The channel feed did not contain a latest video ID.");
    return;
  }

  if (knownIds.has(latestId)) {
    console.log(`YouTube catalogue is current; latest upload ${latestId} is listed.`);
    return;
  }

  console.log(
    `::warning title=New YouTube upload::Latest channel upload ${latestId} is missing from files/content/video-index.json. Review whether to add it to the site catalogue.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
