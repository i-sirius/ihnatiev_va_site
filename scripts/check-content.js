#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const errors = [];
const checked = {
  json: 0,
  references: 0,
  adminPaths: 0,
  bom: 0
};

const SKIP_DIRS = new Set([".git", "node_modules"]);
const reportedBomFiles = new Set();
const SITE_ORIGIN = "https://iva.net.ua";
const SITEMAP_URL = `${SITE_ORIGIN}/sitemap.xml`;
const PUBLIC_HTML_PAGES = [
  ["index.html", `${SITE_ORIGIN}/`],
  ["activity1.html", `${SITE_ORIGIN}/activity1.html`],
  ["activity2.html", `${SITE_ORIGIN}/activity2.html`],
  ["activity3.html", `${SITE_ORIGIN}/activity3.html`],
  ["downloads.html", `${SITE_ORIGIN}/downloads.html`],
  ["contact.html", `${SITE_ORIGIN}/contact.html`]
];
const EXPECTED_SITEMAP_URLS = PUBLIC_HTML_PAGES.map(([, url]) => url);
const TECHNICAL_URL_PATTERN = /(?:localhost|127\.0\.0\.1|github\.io|githubusercontent\.com)/i;

function toPosix(value) {
  return value.replace(/\\/g, "/");
}

function fromRoot(...parts) {
  return path.join(root, ...parts);
}

function existsRelative(relativePath) {
  const normalized = stripUrlParts(relativePath).replace(/^\.\//, "").replace(/^\/+/, "");
  return fs.existsSync(fromRoot(normalized));
}

function stripUrlParts(value) {
  return String(value).split("#")[0].split("?")[0];
}

function isExternalOrVirtual(value) {
  const raw = String(value || "").trim();
  return (
    !raw ||
    raw.startsWith("#") ||
    raw.startsWith("data:") ||
    raw.startsWith("mailto:") ||
    raw.startsWith("tel:") ||
    raw.startsWith("javascript:") ||
    /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
  );
}

function decodePath(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function fail(message) {
  errors.push(message);
}

function readJson(relativePath) {
  checked.json += 1;
  try {
    let source = fs.readFileSync(fromRoot(relativePath), "utf8");
    if (source.startsWith("\uFEFF")) {
      source = source.replace(/^\uFEFF/, "");
      if (!reportedBomFiles.has(relativePath)) {
        checked.bom += 1;
        reportedBomFiles.add(relativePath);
        fail(`${relativePath}: contains UTF-8 BOM; save as UTF-8 without BOM`);
      }
    }

    return JSON.parse(source);
  } catch (error) {
    fail(`${relativePath}: invalid JSON (${error.message})`);
    return null;
  }
}

function walk(directory = root) {
  const results = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(absolutePath));
    } else {
      results.push(absolutePath);
    }
  }

  return results;
}

function relativeToRoot(absolutePath) {
  return toPosix(path.relative(root, absolutePath));
}

function checkReference(sourceFile, referencedPath, context) {
  if (isExternalOrVirtual(referencedPath)) {
    return;
  }

  const cleanPath = decodePath(stripUrlParts(referencedPath));
  if (!cleanPath || cleanPath === ".") {
    return;
  }

  checked.references += 1;
  if (!existsRelative(cleanPath)) {
    fail(`${sourceFile}: missing local file "${referencedPath}" (${context})`);
  }
}

function checkCmsMediaPath(relativePath, value, context, expectedPrefix) {
  if (!value) {
    return;
  }

  const normalized = String(value).replace(/\\/g, "/");
  if (normalized.startsWith("admin/") || normalized.startsWith("/admin/")) {
    fail(`${relativePath}: ${context} must not point into admin/`);
  }

  [
    "files/media/activity1/files/media/activity1",
    "files/media/activity2/files/media/activity2",
    "files/media/activity3/files/media/activity3",
    "files/activity2/files/activity2",
    "files/downloads/files/downloads",
    "files/publications/files/publications",
    "files/content/files/publications"
  ].forEach((duplicatePath) => {
    if (normalized.includes(duplicatePath)) {
      fail(`${relativePath}: ${context} contains duplicated CMS media path "${duplicatePath}"`);
    }
  });

  if (expectedPrefix && !normalized.startsWith(expectedPrefix)) {
    fail(`${relativePath}: ${context} must use root-relative path "${expectedPrefix}..."`);
  }
}

function checkPublicationFileReference(relativePath, value, context) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return;
  }

  if (typeof value !== "string") {
    fail(`${relativePath}: ${context} must be a string when present`);
    return;
  }

  const normalized = value.trim().replace(/\\/g, "/");
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(normalized) || normalized.startsWith("//")) {
    fail(`${relativePath}: ${context} must be a local file, not an external URL`);
    return;
  }

  checkCmsMediaPath(relativePath, normalized, context, "files/publications/");

  const cleanPath = stripUrlParts(normalized);
  if (!/\.(pdf|doc|docx)$/i.test(cleanPath)) {
    fail(`${relativePath}: ${context} must use .pdf, .doc, or .docx`);
  }

  checkReference(relativePath, normalized, context);
}

function checkJsonFiles() {
  for (const absolutePath of walk()) {
    const relativePath = relativeToRoot(absolutePath);
    if (relativePath.endsWith(".json") || relativePath.endsWith(".webmanifest")) {
      readJson(relativePath);
    }
  }
}

function normalizeList(payload, keys) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    for (const key of keys) {
      if (Array.isArray(payload[key])) {
        return payload[key];
      }
    }
  }

  return [];
}

function checkPhotoManifest(relativePath) {
  const payload = readJson(relativePath);
  const images = normalizeList(payload, ["images", "photos"]);
  const activityMatch = relativePath.match(/^files\/media\/activity(\d+)\/photos\.json$/);
  const expectedPrefix = activityMatch ? `/files/media/activity${activityMatch[1]}/` : "";

  images.forEach((image, index) => {
    if (image && image.src) {
      checkCmsMediaPath(relativePath, image.src, `images[${index}].src`, expectedPrefix);
      checkReference(relativePath, image.src, `images[${index}].src`);
    }
  });
}

function checkActivityFiles(relativePath) {
  const payload = readJson(relativePath);
  const files = normalizeList(payload, ["files", "items"]);

  files.forEach((file, index) => {
    if (file && file.href) {
      checkCmsMediaPath(relativePath, file.href, `files[${index}].href`, "/files/activity2/");
      checkReference(relativePath, file.href, `files[${index}].href`);
    }
  });
}

function checkDownloads(relativePath) {
  const payload = readJson(relativePath);
  if (!payload || typeof payload !== "object") {
    return;
  }

  const monographs = Array.isArray(payload.monographs) ? payload.monographs : [];
  monographs.forEach((file, index) => {
    if (file && file.href) {
      checkCmsMediaPath(relativePath, file.href, `monographs[${index}].href`, "/files/downloads/");
      checkReference(relativePath, file.href, `monographs[${index}].href`);
    }
  });

  const groups = Array.isArray(payload.articles) ? payload.articles : [];
  groups.forEach((group, groupIndex) => {
    const files = Array.isArray(group.files) ? group.files : [];
    files.forEach((file, fileIndex) => {
      if (file && file.href) {
        checkCmsMediaPath(
          relativePath,
          file.href,
          `articles[${groupIndex}].files[${fileIndex}].href`,
          "/files/downloads/"
        );
        checkReference(
          relativePath,
          file.href,
          `articles[${groupIndex}].files[${fileIndex}].href`
        );
      }
    });
  });
}

function isNonEmptyString(value) {
  return typeof value === "string" && Boolean(value.trim());
}

function isHttpUrl(value) {
  if (!isNonEmptyString(value)) {
    return true;
  }

  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function checkHomeContent(relativePath) {
  const payload = readJson(relativePath);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    fail(`${relativePath}: expected an object with uk/en home content`);
    return;
  }

  ["uk", "en"].forEach((locale) => {
    const home = payload[locale];
    if (!home || typeof home !== "object" || Array.isArray(home)) {
      fail(`${relativePath}: missing ${locale} content object`);
      return;
    }

    ["aboutHeading", "activitiesHeading"].forEach((key) => {
      if (!isNonEmptyString(home[key])) {
        fail(`${relativePath}: ${locale}.${key} must be a non-empty string`);
      }
    });

    if (!home.aboutImage || typeof home.aboutImage !== "object" || Array.isArray(home.aboutImage)) {
      fail(`${relativePath}: ${locale}.aboutImage must be an object`);
    } else if (!isNonEmptyString(home.aboutImage.alt)) {
      fail(`${relativePath}: ${locale}.aboutImage.alt must be a non-empty string`);
    }

    if (!Array.isArray(home.aboutParagraphs) || !home.aboutParagraphs.length) {
      fail(`${relativePath}: ${locale}.aboutParagraphs must be a non-empty array`);
      return;
    }

    home.aboutParagraphs.forEach((paragraph, index) => {
      if (!isNonEmptyString(paragraph)) {
        fail(`${relativePath}: ${locale}.aboutParagraphs[${index}] must be a non-empty string`);
      }
    });
  });
}

function checkActivitiesContent(relativePath) {
  const payload = readJson(relativePath);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    fail(`${relativePath}: expected an object with uk/en activity content`);
    return;
  }

  ["uk", "en"].forEach((locale) => {
    const activities = payload[locale];
    if (!activities || typeof activities !== "object" || Array.isArray(activities)) {
      fail(`${relativePath}: missing ${locale} activities object`);
      return;
    }

    ["1", "2", "3"].forEach((id) => {
      const activity = activities[id];
      if (!activity || typeof activity !== "object" || Array.isArray(activity)) {
        fail(`${relativePath}: missing ${locale}.${id} activity object`);
        return;
      }

      ["name", "cardDescription"].forEach((key) => {
        if (!isNonEmptyString(activity[key])) {
          fail(`${relativePath}: ${locale}.${id}.${key} must be a non-empty string`);
        }
      });

      if (
        !activity.heroImage ||
        typeof activity.heroImage !== "object" ||
        Array.isArray(activity.heroImage)
      ) {
        fail(`${relativePath}: ${locale}.${id}.heroImage must be an object`);
      } else if (!isNonEmptyString(activity.heroImage.alt)) {
        fail(`${relativePath}: ${locale}.${id}.heroImage.alt must be a non-empty string`);
      }
    });
  });
}

function checkPagesContent(relativePath) {
  const payload = readJson(relativePath);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    fail(`${relativePath}: expected an object with uk/en page content`);
    return;
  }

  ["uk", "en"].forEach((locale) => {
    const pages = payload[locale];
    if (!pages || typeof pages !== "object" || Array.isArray(pages)) {
      fail(`${relativePath}: missing ${locale} pages object`);
      return;
    }

    const downloads = pages.downloads;
    if (!downloads || typeof downloads !== "object" || Array.isArray(downloads)) {
      fail(`${relativePath}: missing ${locale}.downloads object`);
    } else {
      ["pageTitle", "heading"].forEach((key) => {
        if (!isNonEmptyString(downloads[key])) {
          fail(`${relativePath}: ${locale}.downloads.${key} must be a non-empty string`);
        }
      });
    }

    const contact = pages.contact;
    if (!contact || typeof contact !== "object" || Array.isArray(contact)) {
      fail(`${relativePath}: missing ${locale}.contact object`);
      return;
    }

    ["pageTitle", "heading", "intro", "formSubject"].forEach((key) => {
      if (!isNonEmptyString(contact[key])) {
        fail(`${relativePath}: ${locale}.contact.${key} must be a non-empty string`);
      }
    });

    if (!contact.socials || !isNonEmptyString(contact.socials.title)) {
      fail(`${relativePath}: ${locale}.contact.socials.title must be a non-empty string`);
    }

    const fields = contact.fields;
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      fail(`${relativePath}: ${locale}.contact.fields must be an object`);
      return;
    }

    ["name", "email", "phone", "subject", "message", "submit"].forEach((key) => {
      if (!isNonEmptyString(fields[key])) {
        fail(`${relativePath}: ${locale}.contact.fields.${key} must be a non-empty string`);
      }
    });
  });
}

function checkPublicationsContent(relativePath) {
  const payload = readJson(relativePath);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    fail(`${relativePath}: expected an object with uk/en labels and publication items`);
    return;
  }

  const knownTypes = new Set(["article", "conference", "monograph", "teaching", "other"]);

  ["uk", "en"].forEach((locale) => {
    const labels = payload[locale];
    if (!labels || typeof labels !== "object" || Array.isArray(labels)) {
      fail(`${relativePath}: missing ${locale} labels object`);
      return;
    }

    ["summary", "description"].forEach((key) => {
      if (!isNonEmptyString(labels[key])) {
        fail(`${relativePath}: ${locale}.${key} must be a non-empty string`);
      }
    });

    [
      "searchLabel",
      "searchPlaceholder",
      "yearLabel",
      "typeLabel",
      "allYearsLabel",
      "allTypesLabel",
      "fileLabel",
      "emptyLabel"
    ].forEach((key) => {
      if (labels[key] !== undefined && !isNonEmptyString(labels[key])) {
        fail(`${relativePath}: ${locale}.${key} must be a non-empty string when present`);
      }
    });

    if (labels.typeLabels !== undefined) {
      if (!labels.typeLabels || typeof labels.typeLabels !== "object" || Array.isArray(labels.typeLabels)) {
        fail(`${relativePath}: ${locale}.typeLabels must be an object when present`);
      } else {
        knownTypes.forEach((type) => {
          if (!isNonEmptyString(labels.typeLabels[type])) {
            fail(`${relativePath}: ${locale}.typeLabels.${type} must be a non-empty string`);
          }
        });
      }
    }
  });

  if (!Array.isArray(payload.items) || !payload.items.length) {
    fail(`${relativePath}: items must be a non-empty array`);
    return;
  }

  payload.items.forEach((item, index) => {
    if (isNonEmptyString(item)) {
      return;
    }

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      fail(`${relativePath}: items[${index}] must be a string or object`);
      return;
    }

    if (!isNonEmptyString(item.text)) {
      fail(`${relativePath}: items[${index}].text must be a non-empty string`);
    }

    if (item.year !== undefined && item.year !== null && String(item.year).trim() !== "") {
      const year = Number(item.year);
      if (!Number.isInteger(year) || year < 1900 || year > 2100) {
        fail(`${relativePath}: items[${index}].year must be a year between 1900 and 2100`);
      }

      if (year === 1984 && /ISSN\s+1984-6754/i.test(item.text || "")) {
        fail(`${relativePath}: items[${index}].year looks like the ISSN 1984-6754, not the publication year`);
      }
    }

    if (item.type !== undefined && !knownTypes.has(item.type)) {
      fail(`${relativePath}: items[${index}].type must be one of ${Array.from(knownTypes).join(", ")}`);
    }

    if (item.file !== undefined) {
      checkPublicationFileReference(relativePath, item.file, `items[${index}].file`);
    }
  });
}

function checkSocialLinksContent(relativePath) {
  const payload = readJson(relativePath);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    fail(`${relativePath}: expected an object with links array`);
    return;
  }

  const knownIds = new Set([
    "youtube",
    "facebook",
    "telegram",
    "webofscience",
    "orcid",
    "googlescholar"
  ]);
  const seenIds = new Set();
  const links = normalizeList(payload, ["links", "items"]);

  if (!links.length) {
    fail(`${relativePath}: links must be a non-empty array`);
    return;
  }

  links.forEach((link, index) => {
    if (!link || typeof link !== "object" || Array.isArray(link)) {
      fail(`${relativePath}: links[${index}] must be an object`);
      return;
    }

    if (!knownIds.has(link.id)) {
      fail(`${relativePath}: links[${index}].id must be one of ${Array.from(knownIds).join(", ")}`);
    } else if (seenIds.has(link.id)) {
      fail(`${relativePath}: links[${index}].id duplicates "${link.id}"`);
    } else {
      seenIds.add(link.id);
    }

    if (!link.label || typeof link.label !== "object" || Array.isArray(link.label)) {
      fail(`${relativePath}: links[${index}].label must be an object`);
    } else {
      ["uk", "en"].forEach((locale) => {
        if (!isNonEmptyString(link.label[locale])) {
          fail(`${relativePath}: links[${index}].label.${locale} must be a non-empty string`);
        }
      });
    }

    if (link.href !== undefined && typeof link.href !== "string") {
      fail(`${relativePath}: links[${index}].href must be a string when present`);
    } else if (!isHttpUrl(link.href || "")) {
      fail(`${relativePath}: links[${index}].href must be an http(s) URL or empty`);
    }

    if (link.enabled !== undefined && typeof link.enabled !== "boolean") {
      fail(`${relativePath}: links[${index}].enabled must be boolean when present`);
    }

    if (link.description !== undefined && typeof link.description !== "string") {
      fail(`${relativePath}: links[${index}].description must be a string when present`);
    }
  });
}

function checkKnownContentManifests() {
  checkHomeContent("files/content/home.json");
  checkActivitiesContent("files/content/activities.json");
  checkPagesContent("files/content/pages.json");
  checkPublicationsContent("files/content/publications.json");
  checkSocialLinksContent("files/content/social-links.json");
  checkPhotoManifest("files/media/activity1/photos.json");
  checkPhotoManifest("files/media/activity2/photos.json");
  checkPhotoManifest("files/media/activity3/photos.json");
  checkActivityFiles("files/activity2/files.json");
  checkDownloads("files/downloads/files.json");
}

function resolveFromSource(sourceFile, value) {
  const cleanValue = decodePath(stripUrlParts(value)).replace(/^\.\//, "");
  if (cleanValue.startsWith("/")) {
    return cleanValue.slice(1);
  }

  return toPosix(path.normalize(path.join(path.dirname(sourceFile), cleanValue)));
}

function checkHtmlLocalLinks() {
  const attributePattern = /\b(?:href|src|action)=["']([^"']+)["']/gi;

  for (const absolutePath of walk()) {
    const sourceFile = relativeToRoot(absolutePath);
    if (!sourceFile.endsWith(".html")) {
      continue;
    }

    const html = fs.readFileSync(absolutePath, "utf8");
    for (const match of html.matchAll(attributePattern)) {
      const value = match[1];
      if (isExternalOrVirtual(value)) {
        continue;
      }

      checkReference(sourceFile, resolveFromSource(sourceFile, value), `HTML attribute ${value}`);
    }
  }
}

function checkCssUrls() {
  const urlPattern = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;

  for (const absolutePath of walk()) {
    const sourceFile = relativeToRoot(absolutePath);
    if (!sourceFile.endsWith(".css")) {
      continue;
    }

    const css = fs.readFileSync(absolutePath, "utf8");
    for (const match of css.matchAll(urlPattern)) {
      const value = match[1];
      if (isExternalOrVirtual(value)) {
        continue;
      }

      checkReference(sourceFile, resolveFromSource(sourceFile, value), `CSS url(${value})`);
    }
  }
}

function checkManifest() {
  const manifest = readJson("manifest.webmanifest");
  if (!manifest || typeof manifest !== "object") {
    return;
  }

  if (manifest.start_url) {
    checkReference("manifest.webmanifest", manifest.start_url, "start_url");
  }

  if (Array.isArray(manifest.icons)) {
    manifest.icons.forEach((icon, index) => {
      if (icon && icon.src) {
        checkReference("manifest.webmanifest", icon.src, `icons[${index}].src`);
      }
    });
  }
}

function checkServiceWorkerShell() {
  const sourceFile = "sw.js";
  const source = fs.readFileSync(fromRoot(sourceFile), "utf8");
  const shellItemPattern = /["'](\.\/[^"']+)["']/g;

  for (const match of source.matchAll(shellItemPattern)) {
    const value = match[1];
    const cleanValue = value.replace(/^\.\//, "");

    if (!cleanValue || cleanValue === ".") {
      continue;
    }

    checkReference(sourceFile, cleanValue, `APP_SHELL item ${value}`);
  }
}

function readText(relativePath) {
  return fs.readFileSync(fromRoot(relativePath), "utf8");
}

function checkNoBom(relativePath) {
  if (readText(relativePath).startsWith("\uFEFF")) {
    fail(`${relativePath}: contains UTF-8 BOM; save as UTF-8 without BOM`);
  }
}

function getHtmlAttribute(tag, attribute) {
  const pattern = new RegExp(`\\b${escapeRegExp(attribute)}\\s*=\\s*["']([^"']*)["']`, "i");
  const match = tag.match(pattern);
  return match ? match[1] : "";
}

function getHtmlTags(source, tagName) {
  return Array.from(source.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, "gi")), (match) => match[0]);
}

function getMetaContent(source, attribute, value) {
  const expectedValue = value.toLowerCase();
  const tag = getHtmlTags(source, "meta").find((metaTag) => {
    return getHtmlAttribute(metaTag, attribute).toLowerCase() === expectedValue;
  });
  return tag ? getHtmlAttribute(tag, "content") : "";
}

function getCanonicalUrl(source) {
  const canonicalTags = getHtmlTags(source, "link").filter((tag) => {
    return getHtmlAttribute(tag, "rel").toLowerCase().split(/\s+/).includes("canonical");
  });
  return {
    count: canonicalTags.length,
    value: canonicalTags.length ? getHtmlAttribute(canonicalTags[0], "href") : ""
  };
}

function validatePublicUrl(sourceFile, value, context, expectedUrl = "") {
  if (!value) {
    fail(`${sourceFile}: missing ${context}`);
    return;
  }

  if (!value.startsWith(`${SITE_ORIGIN}/`) && value !== `${SITE_ORIGIN}/`) {
    fail(`${sourceFile}: ${context} must use ${SITE_ORIGIN}`);
  }

  if (value.startsWith("http://")) {
    fail(`${sourceFile}: ${context} must not use http://`);
  }

  if (TECHNICAL_URL_PATTERN.test(value)) {
    fail(`${sourceFile}: ${context} must not use localhost, GitHub Pages, or technical URLs`);
  }

  if (value.includes("/admin/")) {
    fail(`${sourceFile}: ${context} must not point to /admin/`);
  }

  if (expectedUrl && value !== expectedUrl) {
    fail(`${sourceFile}: ${context} must be ${expectedUrl}`);
  }
}

function checkSiteImageReference(sourceFile, value, context) {
  if (!value) {
    return;
  }

  if (TECHNICAL_URL_PATTERN.test(value) || value.startsWith("http://")) {
    fail(`${sourceFile}: ${context} must not use a technical or http:// URL`);
    return;
  }

  if (value.startsWith(`${SITE_ORIGIN}/`)) {
    checkReference(sourceFile, value.slice(SITE_ORIGIN.length + 1), context);
  } else if (!isExternalOrVirtual(value)) {
    checkReference(sourceFile, resolveFromSource(sourceFile, value), context);
  }
}

function checkPublicHtmlSeo() {
  PUBLIC_HTML_PAGES.forEach(([sourceFile, expectedUrl]) => {
    if (!existsRelative(sourceFile)) {
      fail(`${sourceFile}: missing public HTML page`);
      return;
    }

    const source = readText(sourceFile);
    const titleCount = (source.match(/<title\b[^>]*>/gi) || []).length;
    if (titleCount !== 1) {
      fail(`${sourceFile}: expected exactly one <title>, found ${titleCount}`);
    }

    if (!getMetaContent(source, "name", "description")) {
      fail(`${sourceFile}: missing meta description`);
    }

    const canonical = getCanonicalUrl(source);
    if (canonical.count !== 1) {
      fail(`${sourceFile}: expected exactly one canonical link, found ${canonical.count}`);
    }
    validatePublicUrl(sourceFile, canonical.value, "canonical URL", expectedUrl);

    ["og:title", "og:description", "og:type", "og:url"].forEach((property) => {
      if (!getMetaContent(source, "property", property)) {
        fail(`${sourceFile}: missing ${property}`);
      }
    });

    const ogUrl = getMetaContent(source, "property", "og:url");
    validatePublicUrl(sourceFile, ogUrl, "og:url", canonical.value || expectedUrl);

    const ogImage = getMetaContent(source, "property", "og:image");
    if (ogImage) {
      checkSiteImageReference(sourceFile, ogImage, "og:image");
    }

    const twitterTags = getHtmlTags(source, "meta").filter((tag) => getHtmlAttribute(tag, "name").toLowerCase().startsWith("twitter:"));
    if (twitterTags.length) {
      ["twitter:card", "twitter:title", "twitter:description"].forEach((name) => {
        if (!getMetaContent(source, "name", name)) {
          fail(`${sourceFile}: missing ${name}`);
        }
      });

      const twitterImage = getMetaContent(source, "name", "twitter:image");
      if (twitterImage) {
        checkSiteImageReference(sourceFile, twitterImage, "twitter:image");
      }
    }

    const robots = getMetaContent(source, "name", "robots").toLowerCase();
    if (robots.includes("noindex")) {
      fail(`${sourceFile}: public page must not include noindex`);
    }
  });
}

function checkAdminSeo() {
  const sourceFile = "admin/index.html";
  if (!existsRelative(sourceFile)) {
    fail(`${sourceFile}: missing admin HTML page`);
    return;
  }

  const source = readText(sourceFile);
  const robots = getMetaContent(source, "name", "robots").toLowerCase().replace(/\s+/g, "");
  if (!robots.includes("noindex") || !robots.includes("nofollow")) {
    fail(`${sourceFile}: admin page must include noindex,nofollow`);
  }

  if (/property=["']og:/i.test(source) || /type=["']application\/ld\+json["']/i.test(source)) {
    fail(`${sourceFile}: admin page must not expose Open Graph or JSON-LD public metadata`);
  }
}

function checkRobotsTxt() {
  const sourceFile = "robots.txt";
  if (!existsRelative(sourceFile)) {
    fail(`${sourceFile}: missing robots.txt`);
    return;
  }

  checkNoBom(sourceFile);
  const source = readText(sourceFile);
  if (!source.includes(`Sitemap: ${SITEMAP_URL}`)) {
    fail(`${sourceFile}: missing Sitemap: ${SITEMAP_URL}`);
  }

  if (!/^\s*Disallow:\s*\/admin\/?\s*$/im.test(source)) {
    fail(`${sourceFile}: must disallow /admin/`);
  }

  if (/^\s*Disallow:\s*\/\s*$/im.test(source)) {
    fail(`${sourceFile}: must not block the public site root`);
  }
}

function checkSitemapXml() {
  const sourceFile = "sitemap.xml";
  if (!existsRelative(sourceFile)) {
    fail(`${sourceFile}: missing sitemap.xml`);
    return;
  }

  checkNoBom(sourceFile);
  const source = readText(sourceFile);
  if (!/<urlset\b[^>]*xmlns=["']http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9["']/i.test(source)) {
    fail(`${sourceFile}: missing sitemap urlset namespace`);
  }

  if (source.includes("/admin/") || TECHNICAL_URL_PATTERN.test(source) || /<loc>\s*http:\/\//i.test(source)) {
    fail(`${sourceFile}: must not contain /admin/, technical URLs, or http:// URLs`);
  }

  const urls = Array.from(source.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi), (match) => match[1]);
  const duplicates = urls.filter((url, index) => urls.indexOf(url) !== index);
  if (duplicates.length) {
    fail(`${sourceFile}: duplicated URLs: ${Array.from(new Set(duplicates)).join(", ")}`);
  }

  EXPECTED_SITEMAP_URLS.forEach((url) => {
    if (!urls.includes(url)) {
      fail(`${sourceFile}: missing ${url}`);
    }
  });

  urls.forEach((url) => {
    if (!EXPECTED_SITEMAP_URLS.includes(url)) {
      fail(`${sourceFile}: unexpected URL ${url}`);
    }
  });

  for (const match of source.matchAll(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/gi)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(match[1])) {
      fail(`${sourceFile}: invalid lastmod date "${match[1]}"`);
    }
  }
}

function checkHomeJsonLd() {
  const sourceFile = "index.html";
  const source = readText(sourceFile);
  const scriptMatch = source.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!scriptMatch) {
    fail(`${sourceFile}: missing JSON-LD Person data`);
    return;
  }

  let payload = null;
  try {
    payload = JSON.parse(scriptMatch[1]);
  } catch (error) {
    fail(`${sourceFile}: invalid JSON-LD (${error.message})`);
    return;
  }

  if (payload["@type"] !== "Person") {
    fail(`${sourceFile}: JSON-LD @type must be Person`);
  }

  validatePublicUrl(sourceFile, payload.url || "", "JSON-LD url", `${SITE_ORIGIN}/`);
  checkSiteImageReference(sourceFile, payload.image || "", "JSON-LD image");

  const sameAs = Array.isArray(payload.sameAs) ? payload.sameAs : [];
  if (!sameAs.length) {
    fail(`${sourceFile}: JSON-LD sameAs must include profile links`);
  }

  sameAs.forEach((url, index) => {
    if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
      fail(`${sourceFile}: JSON-LD sameAs[${index}] must be an http(s) URL`);
      return;
    }

    if (TECHNICAL_URL_PATTERN.test(url)) {
      fail(`${sourceFile}: JSON-LD sameAs[${index}] must not use technical URLs`);
    }
  });

  const socialLinks = readJson("files/content/social-links.json");
  const links = Array.isArray(socialLinks?.links) ? socialLinks.links : [];
  links.forEach((link, index) => {
    if (!link || typeof link !== "object") {
      return;
    }

    const href = typeof link.href === "string" ? link.href.trim() : "";
    if (!href) {
      return;
    }

    if (link.enabled === false && sameAs.includes(href)) {
      fail(`${sourceFile}: JSON-LD sameAs must not include disabled social link "${href}"`);
    }

    if (link.enabled !== false && !sameAs.includes(href)) {
      fail(`${sourceFile}: JSON-LD sameAs should include enabled social link "${href}" (social-links.json links[${index}])`);
    }
  });
}

function checkSeoFoundation() {
  checkPublicHtmlSeo();
  checkAdminSeo();
  checkRobotsTxt();
  checkSitemapXml();
  checkHomeJsonLd();
}

function unquoteYamlValue(value) {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function checkAdminLine(sourceFile, source, key, value, message) {
  const pattern = new RegExp(`^\\s*${escapeRegExp(key)}:\\s*${escapeRegExp(value)}\\s*$`, "m");
  if (!pattern.test(source)) {
    fail(`${sourceFile}: ${message}`);
  }
}

function resolveAdminMediaPath(value) {
  if (value.startsWith("../")) {
    return `files/${value.slice(3)}`;
  }

  return value;
}

function checkAdminCollection(sourceFile, source, name) {
  const pattern = new RegExp(`^\\s*-\\s*name:\\s*${escapeRegExp(name)}\\s*$`, "m");
  if (!pattern.test(source)) {
    fail(`${sourceFile}: missing CMS collection "${name}"`);
  }
}

function checkAdminConfig() {
  const sourceFile = "admin/config.yml";

  if (!existsRelative(sourceFile)) {
    fail(`${sourceFile}: missing Decap CMS config`);
    return;
  }

  const source = fs.readFileSync(fromRoot(sourceFile), "utf8");
  const requiredPatterns = [
    [/^\s*name:\s*github\s*$/m, "backend.name must be github"],
    [/^\s*repo:\s*i-sirius\/ihnatiev_va_site\s*$/m, "backend.repo must target i-sirius/ihnatiev_va_site"],
    [/^\s*branch:\s*main\s*$/m, "backend.branch must be main"],
    [
      /^\s*base_url:\s*https:\/\/decap\.iva\.net\.ua\s*$/m,
      "backend.base_url must use the active OAuth proxy"
    ],
    [/^\s*auth_endpoint:\s*\/auth\s*$/m, "backend.auth_endpoint must be /auth"],
    [/^\s*local_backend:\s*true\s*$/m, "local_backend must stay enabled for local CMS testing"],
    [/^\s*publish_mode:\s*editorial_workflow\s*$/m, "publish_mode must be editorial_workflow"]
  ];

  requiredPatterns.forEach(([pattern, message]) => {
    if (!pattern.test(source)) {
      fail(`${sourceFile}: ${message}`);
    }
  });

  const pathPattern = /^\s*(file|media_folder|public_folder):\s*([^#\r\n]+)/gm;
  for (const match of source.matchAll(pathPattern)) {
    const key = match[1];
    const value = unquoteYamlValue(match[2]);

    if (!value || isExternalOrVirtual(value)) {
      continue;
    }

    checked.adminPaths += 1;
    const pathToCheck = resolveAdminMediaPath(value);
    if (!existsRelative(pathToCheck)) {
      fail(`${sourceFile}: missing ${key} path "${value}"`);
    }
  }

  [
    "home_content",
    "activities_content",
    "pages_content",
    "publications_content",
    "social_links",
    "gallery_activity1",
    "gallery_activity2",
    "gallery_activity3",
    "activity2_files",
    "downloads"
  ].forEach((name) => checkAdminCollection(sourceFile, source, name));

  [
    "files/content/home.json",
    "files/content/activities.json",
    "files/content/pages.json",
    "files/content/publications.json",
    "files/content/social-links.json",
    "files/media/activity1/photos.json",
    "files/media/activity2/photos.json",
    "files/media/activity3/photos.json",
    "files/activity2/files.json",
    "files/downloads/files.json"
  ].forEach((relativePath) => {
    checkAdminLine(sourceFile, source, "file", relativePath, `missing CMS file-backed entry "${relativePath}"`);
  });

  [
    ["media_folder", "files/media/uploads"],
    ["public_folder", "/files/media/uploads"],
    ["media_folder", "files/media/activity1"],
    ["public_folder", "/files/media/activity1"],
    ["media_folder", "files/media/activity2"],
    ["public_folder", "/files/media/activity2"],
    ["media_folder", "files/media/activity3"],
    ["public_folder", "/files/media/activity3"],
    ["media_folder", "files/activity2"],
    ["public_folder", "/files/activity2"],
    ["media_folder", "files/downloads"],
    ["public_folder", "/files/downloads"],
    ["media_folder", "../publications"],
    ["public_folder", "files/publications"]
  ].forEach(([key, value]) => {
    checkAdminLine(sourceFile, source, key, value, `missing CMS ${key} "${value}"`);
  });

  [
    [/^\s*name:\s*items\s*$/m, "publications collection must expose items list"],
    [/\bname:\s*text\b/m, "publications items must expose text field"],
    [/\bname:\s*year\b/m, "publications items must expose year field"],
    [/\bname:\s*year\b[\s\S]*?\bwidget:\s*string\b/m, "publications year field must stay a string widget"],
    [/\^\$\|\^\(19\|20\|21\)\\\\d\{2\}\$/m, "publications year field must allow empty or 4-digit years"],
    [/^\s*name:\s*type\s*$/m, "publications items must expose type field"],
    [/^\s*widget:\s*select\s*$/m, "publications type field must stay a select widget"],
    [/^\s*name:\s*file\s*$/m, "publications items must expose optional file field"],
    [/\bname:\s*file\b[\s\S]*?\bwidget:\s*file\b/m, "publications file field must stay a file widget"],
    [/\bname:\s*file\b[\s\S]*?\brequired:\s*false\b/m, "publications file field must stay optional"],
    [/\bname:\s*file\b[\s\S]*?\bchoose_url:\s*false\b/m, "publications file field must keep choose_url disabled"],
    [/\bvalue:\s*article\b/m, "publications type options must include article"],
    [/\bvalue:\s*conference\b/m, "publications type options must include conference"],
    [/\bvalue:\s*monograph\b/m, "publications type options must include monograph"],
    [/\bvalue:\s*teaching\b/m, "publications type options must include teaching"],
    [/\bvalue:\s*other\b/m, "publications type options must include other"]
  ].forEach(([pattern, message]) => {
    if (!pattern.test(source)) {
      fail(`${sourceFile}: ${message}`);
    }
  });
}

checkJsonFiles();
checkKnownContentManifests();
checkHtmlLocalLinks();
checkCssUrls();
checkManifest();
checkServiceWorkerShell();
checkAdminConfig();
checkSeoFoundation();

if (errors.length) {
  console.error("Content check failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Content check passed: ${checked.json} JSON files parsed, ${checked.references} local references checked, ${checked.adminPaths} admin paths checked.`
);
