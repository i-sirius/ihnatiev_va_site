#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const errors = [];
const checked = {
  json: 0,
  references: 0,
  adminPaths: 0
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

function isNonEmptyString(value) {
  return typeof value === "string" && Boolean(value.trim());
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

function checkKnownContentManifests() {
  checkHomeContent("files/content/home.json");
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

function unquoteYamlValue(value) {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "");
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
    [/^\s*base_url:\s*https:\/\/decap\.iva\.net\.ua\s*$/m, "backend.base_url must use the OAuth proxy"],
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
    if (!existsRelative(value)) {
      fail(`${sourceFile}: missing ${key} path "${value}"`);
    }
  }
}

checkJsonFiles();
checkKnownContentManifests();
checkHtmlLocalLinks();
checkCssUrls();
checkManifest();
checkServiceWorkerShell();
checkAdminConfig();

if (errors.length) {
  console.error("Content check failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Content check passed: ${checked.json} JSON files parsed, ${checked.references} local references checked, ${checked.adminPaths} admin paths checked.`
);
