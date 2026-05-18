#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const errors = [];
const checked = {
  json: 0,
  references: 0
};

const SKIP_DIRS = new Set([".git", "node_modules"]);

function toPosix(value) {
  return value.replace(/\\/g, "/");
}

function fromRoot(...parts) {
  return path.join(root, ...parts);
}

function existsRelative(relativePath) {
  const normalized = stripUrlParts(relativePath).replace(/^\.\//, "");
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
    return JSON.parse(fs.readFileSync(fromRoot(relativePath), "utf8"));
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

  images.forEach((image, index) => {
    if (image && image.src) {
      checkReference(relativePath, image.src, `images[${index}].src`);
    }
  });
}

function checkActivityFiles(relativePath) {
  const payload = readJson(relativePath);
  const files = normalizeList(payload, ["files", "items"]);

  files.forEach((file, index) => {
    if (file && file.href) {
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
      checkReference(relativePath, file.href, `monographs[${index}].href`);
    }
  });

  const groups = Array.isArray(payload.articles) ? payload.articles : [];
  groups.forEach((group, groupIndex) => {
    const files = Array.isArray(group.files) ? group.files : [];
    files.forEach((file, fileIndex) => {
      if (file && file.href) {
        checkReference(
          relativePath,
          file.href,
          `articles[${groupIndex}].files[${fileIndex}].href`
        );
      }
    });
  });
}

function checkKnownContentManifests() {
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

checkJsonFiles();
checkKnownContentManifests();
checkHtmlLocalLinks();
checkCssUrls();
checkManifest();
checkServiceWorkerShell();

if (errors.length) {
  console.error("Content check failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Content check passed: ${checked.json} JSON files parsed, ${checked.references} local references checked.`
);
