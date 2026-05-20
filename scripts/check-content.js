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

    if (item.year !== undefined && item.year !== null) {
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
  });
}

function checkKnownContentManifests() {
  checkHomeContent("files/content/home.json");
  checkActivitiesContent("files/content/activities.json");
  checkPagesContent("files/content/pages.json");
  checkPublicationsContent("files/content/publications.json");
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function checkAdminLine(sourceFile, source, key, value, message) {
  const pattern = new RegExp(`^\\s*${escapeRegExp(key)}:\\s*${escapeRegExp(value)}\\s*$`, "m");
  if (!pattern.test(source)) {
    fail(`${sourceFile}: ${message}`);
  }
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
    if (!existsRelative(value)) {
      fail(`${sourceFile}: missing ${key} path "${value}"`);
    }
  }

  [
    "home_content",
    "activities_content",
    "pages_content",
    "publications_content",
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
    ["public_folder", "files/media/uploads"],
    ["media_folder", "files/media/activity1"],
    ["public_folder", "files/media/activity1"],
    ["media_folder", "files/media/activity2"],
    ["public_folder", "files/media/activity2"],
    ["media_folder", "files/media/activity3"],
    ["public_folder", "files/media/activity3"],
    ["media_folder", "files/activity2"],
    ["public_folder", "files/activity2"],
    ["media_folder", "files/downloads"],
    ["public_folder", "files/downloads"]
  ].forEach(([key, value]) => {
    checkAdminLine(sourceFile, source, key, value, `missing CMS ${key} "${value}"`);
  });

  [
    [/^\s*name:\s*items\s*$/m, "publications collection must expose items list"],
    [/\bname:\s*text\b/m, "publications items must expose text field"],
    [/\bname:\s*year\b/m, "publications items must expose year field"],
    [/^\s*name:\s*type\s*$/m, "publications items must expose type field"],
    [/^\s*widget:\s*select\s*$/m, "publications type field must stay a select widget"],
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

if (errors.length) {
  console.error("Content check failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Content check passed: ${checked.json} JSON files parsed, ${checked.references} local references checked, ${checked.adminPaths} admin paths checked.`
);
