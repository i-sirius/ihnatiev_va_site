(() => {
  const siteUtils = window.SiteUtils || {};
  const setSafeUrlAttribute = siteUtils.setSafeUrlAttribute || ((element, attribute, value) => {
    const raw = String(value || "").trim();
    const normalized = raw.replace(/[\u0000-\u001F\u007F\s]+/g, "").toLowerCase();
    const schemeMatch = normalized.match(/^([a-z][a-z0-9+.-]*):/);
    if (!element || !raw || (schemeMatch && schemeMatch[1] !== "http" && schemeMatch[1] !== "https")) {
      return false;
    }
    element.setAttribute(attribute, raw);
    return true;
  });

  function getLocale(site) {
    return site.currentLocale || site.defaultLocale || document.documentElement.lang || "uk";
  }

  function getLocalizedValue(value, locale, fallback = "") {
    if (value == null) {
      return fallback;
    }
    if (typeof value === "string") {
      return value || fallback;
    }
    if (Array.isArray(value)) {
      return value.map((item) => getLocalizedValue(item, locale, "")).filter(Boolean).join(" ");
    }
    if (typeof value === "object") {
      if (value[locale] != null) {
        return getLocalizedValue(value[locale], locale, fallback);
      }
      if (value.uk != null) {
        return getLocalizedValue(value.uk, locale, fallback);
      }
      if (value.en != null) {
        return getLocalizedValue(value.en, locale, fallback);
      }
      return Object.keys(value)
        .map((key) => getLocalizedValue(value[key], locale, ""))
        .filter(Boolean)
        .join(" ") || fallback;
    }
    return fallback;
  }

  function getAllLocalizedValues(value) {
    if (value == null) {
      return [];
    }
    if (typeof value === "string") {
      return value ? [value] : [];
    }
    if (Array.isArray(value)) {
      return value.reduce((result, item) => result.concat(getAllLocalizedValues(item)), []);
    }
    if (typeof value === "object") {
      return Object.keys(value).reduce((result, key) => result.concat(getAllLocalizedValues(value[key])), []);
    }
    return [];
  }

  function normalizeSearchText(value, locale) {
    return String(value || "")
      .toLocaleLowerCase(locale)
      .replace(/[’ʼ`´]/g, "'")
      .replace(/[“”«»"\.,;:!?()[\]{}<>/\\|]+/g, " ")
      .replace(/[‐‑‒–—―-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  var SEARCH_STOP_WORDS = {
    "\u0456": true,
    "\u0439": true,
    "\u0442\u0430": true,
    "\u0432": true,
    "\u0443": true,
    "\u043d\u0430": true,
    "\u0437\u0430": true,
    "\u043d\u0435": true,
    "\u0434\u043e": true,
    "\u0432\u0456\u0434": true,
    "\u043f\u043e": true,
    "\u0437": true,
    "\u0456\u0437": true,
    "\u0437\u0456": true,
    "\u0449\u043e": true,
    "\u044f\u043a": true,
    "\u0446\u0435": true,
    "\u0438": true,
    "\u0441": true,
    "\u043e\u0442": true,
    "\u044d\u0442\u043e": true,
    "the": true,
    "a": true,
    "an": true,
    "and": true,
    "or": true,
    "of": true,
    "in": true,
    "on": true,
    "to": true,
    "for": true
  };

  function isMeaningfulSearchWord(word) {
    return !!word && word.length >= 3 && !SEARCH_STOP_WORDS[word];
  }

  function getSearchWords(query, locale) {
    const normalized = normalizeSearchText(query, locale);
    return normalized ? normalized.split(" ").filter(isMeaningfulSearchWord) : [];
  }

  function isSearchWordCharacter(character) {
    if (!character) {
      return false;
    }

    const code = character.charCodeAt(0);
    return (
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      (code >= 0x0400 && code <= 0x052F) ||
      code === 0x0027 ||
      code === 0x2019 ||
      code === 0x02BC
    );
  }

  function isBoundaryMatch(text, index, length) {
    const before = index > 0 ? text.charAt(index - 1) : "";
    const after = index + length < text.length ? text.charAt(index + length) : "";
    return !isSearchWordCharacter(before) && !isSearchWordCharacter(after);
  }

  function findBoundaryMatch(text, word, start) {
    let index = text.indexOf(word, start);
    while (index >= 0) {
      if (isBoundaryMatch(text, index, word.length)) {
        return index;
      }
      index = text.indexOf(word, index + 1);
    }
    return -1;
  }

  function getInitialSearchQuery() {
    try {
      if (typeof URLSearchParams !== "function") {
        return "";
      }

      const query = new URLSearchParams(window.location.search).get("q") || "";
      return query && query.trim().length > 1 ? query : "";
    } catch (error) {
      return "";
    }
  }

  function clearSearchQueryParam() {
    try {
      if (typeof URLSearchParams !== "function" || !window.history || !window.history.replaceState) {
        return;
      }

      const params = new URLSearchParams(window.location.search);
      if (!params.has("q")) {
        return;
      }

      params.delete("q");
      const query = params.toString();
      const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash || ""}`;
      window.history.replaceState(null, document.title, nextUrl);
    } catch (error) {
      // URL cleanup is progressive enhancement only.
    }
  }

  function getPageSearchText(record) {
    const pageSearch = record && Array.isArray(record.pageSearch) ? record.pageSearch : [];
    const parts = [];

    pageSearch.forEach((entry) => {
      if (entry && entry.text) {
        parts.push(String(entry.text));
      }
    });

    return parts.join(" ");
  }

  function addWeightedValues(fields, value, weight) {
    getAllLocalizedValues(value).forEach((item) => {
      if (item) {
        fields.push({ text: item, weight });
      }
    });
  }

  function addWeightedText(fields, value, weight) {
    const text = String(value || "").trim();
    if (text) {
      fields.push({ text, weight });
    }
  }

  function getRecordFields(record, locale) {
    const fields = [];

    addWeightedValues(fields, record.title, 120);
    addWeightedText(fields, record.titleEn, 115);
    addWeightedValues(fields, record.keywords, 90);
    addWeightedValues(fields, record.aliases, 85);
    addWeightedValues(fields, record.tags, 82);
    addWeightedValues(fields, record.topics, 78);
    addWeightedValues(fields, record.section, 55);
    addWeightedValues(fields, record.description, 48);
    addWeightedText(fields, record.descriptionEn, 46);
    addWeightedValues(fields, record.summary, 44);
    addWeightedValues(fields, record.bibliography, 34);
    addWeightedValues(fields, record.searchText, 24);
    addWeightedValues(fields, record.normalizedText, 20);
    addWeightedText(fields, getPageSearchText(record), 18);
    addWeightedValues(fields, record.category, 28);
    addWeightedText(fields, record.fileType, 24);
    addWeightedText(fields, record.language, 18);
    addWeightedText(fields, record.videoId, 30);
    addWeightedText(fields, record.documentType, 26);
    addWeightedText(fields, record.href, 10);
    addWeightedText(fields, record.url, 8);

    return fields
      .map((field) => ({
        text: normalizeSearchText(field.text, locale),
        weight: field.weight
      }))
      .filter((field) => field.text);
  }

  function getTypeWeight(type) {
    const normalizedType = String(type || "page");
    const weights = {
      page: 70,
      section: 60,
      video: 52,
      audio: 48,
      download: 38,
      document: 34,
      publication: 28,
      activity: 45
    };

    return weights[normalizedType] || 20;
  }

  function hasPdfQuery(words) {
    for (let index = 0; index < words.length; index += 1) {
      if (words[index] === "pdf" || words[index] === "\u043f\u0434\u0444") {
        return true;
      }
    }
    return false;
  }

  function isPdfRecord(record, locale) {
    const fileType = normalizeSearchText(record && record.fileType, locale);
    const href = String(record && (record.href || record.url) || "").toLowerCase();
    return fileType === "pdf" || /\.pdf(?:$|[?#])/i.test(href);
  }

  function scoreRecord(record, words, query, locale) {
    const fields = getRecordFields(record, locale);
    const meaningfulPhrase = words.join(" ");
    const recordType = String(record.type || "");
    let score = getTypeWeight(record.type);
    let matchedAllWords = true;

    if (words.length > 1) {
      fields.forEach((field) => {
        const phraseIndex = field.text.indexOf(meaningfulPhrase);
        if (phraseIndex < 0) {
          return;
        }

        let phraseScore = field.weight * (words.length + 2);
        if (field.text === meaningfulPhrase) {
          phraseScore *= 4;
        } else if (phraseIndex === 0) {
          phraseScore *= 2;
        }
        score += phraseScore;
      });
    }

    words.forEach((word) => {
      let bestWordScore = 0;

      fields.forEach((field) => {
        const index = field.text.indexOf(word);
        if (index < 0) {
          return;
        }

        let fieldScore = field.weight;
        if (field.text === word || field.text === meaningfulPhrase) {
          fieldScore *= 4;
        } else if (meaningfulPhrase && field.text.indexOf(meaningfulPhrase) === 0) {
          fieldScore *= 3;
        } else if (index === 0) {
          fieldScore *= 2;
        }

        if (fieldScore > bestWordScore) {
          bestWordScore = fieldScore;
        }
      });

      if (!bestWordScore) {
        matchedAllWords = false;
      }

      score += bestWordScore;
    });

    if (!matchedAllWords) {
      return 0;
    }

    const rankBoost = Number(record.rankBoost || 0);
    if (!isNaN(rankBoost) && isFinite(rankBoost)) {
      score += rankBoost;
    }

    if (hasPdfQuery(words)) {
      if ((recordType === "document" || recordType === "download") && isPdfRecord(record, locale)) {
        score += 650;
      } else if (recordType === "video" && words.length === 1) {
        score -= 450;
      }
    }

    return score;
  }

  function getSnippetSource(record, words, locale) {
    const pageSearch = record && Array.isArray(record.pageSearch) ? record.pageSearch : [];

    for (let pageIndex = 0; pageIndex < pageSearch.length; pageIndex += 1) {
      const text = pageSearch[pageIndex] && pageSearch[pageIndex].text
        ? String(pageSearch[pageIndex].text)
        : "";
      const normalizedText = normalizeSearchText(text, locale);
      for (let wordIndex = 0; wordIndex < words.length; wordIndex += 1) {
        if (normalizedText.indexOf(words[wordIndex]) !== -1) {
          return text;
        }
      }
    }

    return (
      getLocalizedValue(record.description, locale, "") ||
      getLocalizedValue(record.searchText, locale, "") ||
      getLocalizedValue(record.title, locale, "")
    );
  }

  function getSnippet(record, words, locale) {
    const source = getSnippetSource(record, words, locale);
    const normalizedSource = String(source || "").toLocaleLowerCase(locale);
    let matchIndex = -1;
    let matchLength = 0;

    for (let index = 0; index < words.length; index += 1) {
      const termIndex = findBoundaryMatch(normalizedSource, words[index], 0);
      if (termIndex >= 0 && (matchIndex < 0 || termIndex < matchIndex)) {
        matchIndex = termIndex;
        matchLength = words[index].length;
      }
    }

    if (matchIndex < 0) {
      return source.slice(0, 240);
    }

    const start = Math.max(0, matchIndex - 90);
    const end = Math.min(source.length, matchIndex + matchLength + 150);
    return `${start > 0 ? "... " : ""}${source.slice(start, end)}${end < source.length ? " ..." : ""}`;
  }

  function appendHighlightedText(element, text, words, locale) {
    const source = String(text || "");
    const normalizedSource = source.toLocaleLowerCase(locale);
    let position = 0;

    element.textContent = "";

    if (!source || !words.length) {
      element.textContent = source;
      return;
    }

    while (position < source.length) {
      let nextIndex = -1;
      let nextWord = "";

      for (let index = 0; index < words.length; index += 1) {
        const word = words[index];
        const wordIndex = findBoundaryMatch(normalizedSource, word, position);
        if (wordIndex >= 0 && (nextIndex < 0 || wordIndex < nextIndex)) {
          nextIndex = wordIndex;
          nextWord = word;
        }
      }

      if (nextIndex < 0) {
        element.appendChild(document.createTextNode(source.slice(position)));
        break;
      }

      if (nextIndex > position) {
        element.appendChild(document.createTextNode(source.slice(position, nextIndex)));
      }

      const mark = document.createElement("mark");
      mark.textContent = source.slice(nextIndex, nextIndex + nextWord.length);
      element.appendChild(mark);
      position = nextIndex + nextWord.length;
    }
  }

  function encodeQueryValue(value) {
    return encodeURIComponent(String(value || "")).replace(/'/g, "%27");
  }

  function getDownloadItemId(record) {
    const id = String(record && record.id || "").trim();
    if (id.indexOf("downloads-") === 0) {
      return id.slice("downloads-".length);
    }
    return id;
  }

  function appendUrlParams(url, params) {
    const parts = [];
    Object.keys(params || {}).forEach((key) => {
      const value = params[key];
      if (value != null && String(value).trim()) {
        parts.push(`${encodeQueryValue(key)}=${encodeQueryValue(value)}`);
      }
    });

    if (!parts.length) {
      return url;
    }

    return `${url}${url.indexOf("?") === -1 ? "?" : "&"}${parts.join("&")}`;
  }

  function getResultUrl(record, query, locale) {
    const baseUrl = record.url || "#";
    if (record.type === "publication" && baseUrl.indexOf("activity1.html") === 0 && baseUrl.indexOf("#") < 0) {
      return "activity1.html#publications";
    }

    if (record.type !== "download" || baseUrl.indexOf("downloads.html") !== 0) {
      return baseUrl;
    }

    const cleanBaseUrl = baseUrl.split("?")[0].split("#")[0] || "downloads.html";
    return appendUrlParams(cleanBaseUrl, {
      item: getDownloadItemId(record),
      search: query || getLocalizedValue(record.title, locale, record.titleEn || "")
    });
  }

  function getLocalizedFallback(locale, values) {
    if (values && values[locale]) {
      return values[locale];
    }
    return values && values.uk ? values.uk : "";
  }

  function getResultActionLabel(record, locale, ui) {
    const type = String(record.type || "page");
    const labels = ui.actionLabels || ui.actions || {};
    let key = "go";

    if (type === "video") {
      key = "watch";
    } else if (type === "audio") {
      key = "listen";
    } else if (type === "document") {
      key = "openMaterial";
    } else if (type === "download" || type === "publication") {
      key = "goToList";
    }

    const configured = getLocalizedValue(labels[key], locale, "");
    const fallbackLabels = {
      go: {
        uk: "\u041f\u0435\u0440\u0435\u0439\u0442\u0438",
        en: "Go"
      },
      watch: {
        uk: "\u041f\u0435\u0440\u0435\u0433\u043b\u044f\u043d\u0443\u0442\u0438",
        en: "Watch"
      },
      listen: {
        uk: "\u041f\u0440\u043e\u0441\u043b\u0443\u0445\u0430\u0442\u0438",
        en: "Listen"
      },
      openFile: {
        uk: "\u0412\u0456\u0434\u043a\u0440\u0438\u0442\u0438 \u0444\u0430\u0439\u043b",
        en: "Open file"
      },
      openMaterial: {
        uk: "\u0412\u0456\u0434\u043a\u0440\u0438\u0442\u0438 \u043c\u0430\u0442\u0435\u0440\u0456\u0430\u043b",
        en: "Open material"
      },
      goToList: {
        uk: "\u041f\u0435\u0440\u0435\u0439\u0442\u0438 \u0434\u043e \u0441\u043f\u0438\u0441\u043a\u0443",
        en: "Go to list"
      }
    };

    return configured || getLocalizedFallback(locale, fallbackLabels[key]) || ui.open || "Open";
  }

  function getResultTypeLabel(type, locale, ui) {
    const normalizedType = String(type || "page").trim() || "page";
    const labels = ui.typeLabels || ui.types || {};
    const label = getLocalizedValue(labels[normalizedType], locale, "");
    const fallbackLabels = {
      uk: {
        page: "Сторінка",
        activity: "Діяльність",
        section: "Розділ",
        publication: "Публікація",
        download: "Файл",
        audio: "Аудіо",
        video: "Відео",
        document: "Матеріал"
      },
      en: {
        page: "Page",
        activity: "Activity",
        section: "Section",
        publication: "Publication",
        download: "File",
        audio: "Audio",
        video: "Video",
        document: "Material"
      }
    };

    if (label) {
      return label;
    }

    if (fallbackLabels[locale] && fallbackLabels[locale][normalizedType]) {
      return fallbackLabels[locale][normalizedType];
    }
    if (fallbackLabels.uk[normalizedType]) {
      return fallbackLabels.uk[normalizedType];
    }

    return normalizedType
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase(locale));
  }

  function getResultMeta(record, locale, ui) {
    const parts = [getResultTypeLabel(record.type, locale, ui)];
    const section = getLocalizedValue(record.section, locale, "");
    const category = getLocalizedValue(record.category, locale, "") || getLocalizedValue(record.documentType, locale, "");

    [section, category].forEach((item) => {
      const text = typeof item === "string" ? item.trim() : "";
      if (text && parts.indexOf(text) === -1) {
        parts.push(text);
      }
    });

    return parts.join(" · ");
  }

  function copyRecord(record) {
    const copy = {};
    Object.keys(record || {}).forEach((key) => {
      copy[key] = record[key];
    });
    return copy;
  }

  function mergeDownloadRecord(baseRecord, downloadRecord) {
    const merged = copyRecord(baseRecord || {});
    const fields = [
      "href",
      "fileName",
      "collection",
      "category",
      "title",
      "titleEn",
      "description",
      "descriptionEn",
      "topics",
      "tags",
      "keywords",
      "aliases",
      "summary",
      "bibliography",
      "searchText",
      "normalizedText",
      "lang",
      "fileType",
      "language",
      "rankBoost",
      "pageSearch",
      "extractedText"
    ];

    fields.forEach((field) => {
      if (downloadRecord && downloadRecord[field] != null) {
        merged[field] = downloadRecord[field];
      }
    });

    merged.type = "download";
    merged.url = merged.url || "downloads.html";
    if (!merged.id && downloadRecord && downloadRecord.id) {
      merged.id = `downloads-${downloadRecord.id}`;
    }

    return merged;
  }

  function addLookupKey(lookup, key, index) {
    const normalizedKey = String(key || "").trim();
    if (normalizedKey) {
      lookup[normalizedKey] = index;
    }
  }

  function mergeDownloadsIndex(siteItems, downloadsPayload) {
    const mergedItems = Array.isArray(siteItems) ? siteItems.slice() : [];
    const lookup = {};
    const downloadItems = downloadsPayload && Array.isArray(downloadsPayload.items)
      ? downloadsPayload.items
      : [];

    mergedItems.forEach((record, index) => {
      if (!record || record.type !== "download") {
        return;
      }

      addLookupKey(lookup, record.id, index);
      addLookupKey(lookup, record.href, index);
      if (record.id && String(record.id).indexOf("downloads-") === 0) {
        addLookupKey(lookup, String(record.id).slice("downloads-".length), index);
      }
    });

    downloadItems.forEach((downloadRecord) => {
      if (!downloadRecord) {
        return;
      }

      const id = downloadRecord.id || "";
      const index = lookup[downloadRecord.href] != null
        ? lookup[downloadRecord.href]
        : lookup[id] != null
          ? lookup[id]
          : lookup[`downloads-${id}`];

      if (index != null) {
        mergedItems[index] = mergeDownloadRecord(mergedItems[index], downloadRecord);
      } else if (downloadRecord.href) {
        mergedItems.push(mergeDownloadRecord({
          id: id ? `downloads-${id}` : `downloads-extra-${mergedItems.length + 1}`,
          type: "download",
          url: "downloads.html"
        }, downloadRecord));
      }
    });

    return mergedItems;
  }

  function createResult(record, words, query, locale, ui) {
    const article = document.createElement("article");
    const meta = document.createElement("div");
    const title = document.createElement("h3");
    const snippet = document.createElement("p");
    const link = document.createElement("a");
    const type = record.type || "page";

    article.className = "site-search-result";
    meta.className = "site-search-result-meta";
    title.className = "site-search-result-title";
    snippet.className = "site-search-result-snippet";
    link.className = "site-search-result-link";

    meta.textContent = getResultMeta(record, locale, ui);
    appendHighlightedText(title, getLocalizedValue(record.title, locale, record.titleEn || ""), words, locale);
    appendHighlightedText(snippet, getSnippet(record, words, locale), words, locale);
    link.textContent = getResultActionLabel(record, locale, ui);
    if (!setSafeUrlAttribute(link, "href", getResultUrl(record, query, locale))) {
      link.setAttribute("href", "#");
      link.setAttribute("aria-disabled", "true");
    }

    article.appendChild(meta);
    article.appendChild(title);
    article.appendChild(snippet);
    article.appendChild(link);
    return article;
  }

  function init() {
    if (document.body.dataset.page !== "search") {
      return;
    }

    const site = window.SITE || {};
    const ui = site.ui && site.ui.siteSearch ? site.ui.siteSearch : {};
    const input = document.querySelector("[data-site-search-input]");
    const results = document.querySelector("[data-site-search-results]");
    const status = document.querySelector("[data-site-search-status]");
    const field = input && input.closest ? input.closest(".site-search-field") : input ? input.parentElement : null;
    const clearButton = document.createElement("button");
    const clearIcon = document.createElement("span");
    const clearLabel = document.createElement("span");
    let indexItems = [];
    let baseIndexItems = [];
    let downloadsIndexLoaded = false;
    let downloadsIndexLoading = false;
    let searchTimer = 0;

    if (!input || !results || !status) {
      return;
    }

    function updateClearState() {
      clearButton.hidden = !input.value;
    }

    function applyChrome() {
      const locale = getLocale(site);
      const title = ui.pageTitle || "Пошук";
      document.title = `${title} | ${site.meta && site.meta.siteTitle ? site.meta.siteTitle : "Віталій Ігнатьєв"}`;
      input.placeholder = ui.placeholder || "Пошук по сайту...";
      input.setAttribute("aria-label", input.placeholder);
      clearButton.setAttribute("aria-label", ui.searchClear || "Очистити пошук");
      clearButton.setAttribute("title", ui.searchClear || "Очистити пошук");
      const titleElement = document.querySelector("[data-search-title]");
      const headingElement = document.querySelector("[data-search-heading]");
      const introElement = document.querySelector("[data-search-intro]");
      const labelElement = document.querySelector("[data-search-field-label]");
      if (titleElement) {
        titleElement.textContent = title;
      }
      if (headingElement) {
        headingElement.textContent = ui.heading || title;
      }
      if (introElement) {
        introElement.textContent = ui.intro || "";
      }
      if (labelElement) {
        labelElement.textContent = ui.placeholder || title;
      }
      status.textContent = ui.emptyInitial || "";
      document.documentElement.lang = locale;
      updateClearState();
    }

    function render(query) {
      const locale = getLocale(site);
      const words = getSearchWords(query, locale);
      const hasQuery = !!normalizeSearchText(query, locale);
      results.textContent = "";

      if (!words.length) {
        status.textContent = hasQuery
          ? (ui.emptySpecific || getLocalizedFallback(locale, {
            uk: "\u0412\u0432\u0435\u0434\u0456\u0442\u044c \u0431\u0456\u043b\u044c\u0448 \u043a\u043e\u043d\u043a\u0440\u0435\u0442\u043d\u0438\u0439 \u0437\u0430\u043f\u0438\u0442.",
            en: "Enter a more specific query."
          }))
          : (ui.emptyInitial || "Введіть запит із двох або більше символів.");
        return;
      }

      if (!downloadsIndexLoaded && !downloadsIndexLoading) {
        loadDownloadsIndex(() => {
          render(input.value || "");
        });
      }

      const matches = indexItems
        .map((record, index) => ({
          record,
          index,
          score: scoreRecord(record, words, query, locale)
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }

          return a.index - b.index;
        });

      if (!matches.length) {
        status.textContent = ui.emptyResults || "Нічого не знайдено.";
        return;
      }

      status.textContent = "";
      matches.slice(0, 60).forEach((item) => {
        results.appendChild(createResult(item.record, words, query, locale, ui));
      });
    }

    function loadDownloadsIndex(onComplete) {
      if (downloadsIndexLoaded || downloadsIndexLoading || typeof fetch !== "function") {
        return;
      }

      downloadsIndexLoading = true;
      fetch("files/downloads/search-index.json")
        .then((response) => {
          if (!response.ok) {
            throw new Error("downloads search index unavailable");
          }
          return response.json();
        })
        .then((payload) => {
          indexItems = mergeDownloadsIndex(baseIndexItems, payload);
          downloadsIndexLoaded = true;
          downloadsIndexLoading = false;
          if (typeof onComplete === "function") {
            onComplete();
          }
        })
        .catch(() => {
          downloadsIndexLoaded = true;
          downloadsIndexLoading = false;
        });
    }

    window.SiteSearchPage = {
      refresh: () => {
        applyChrome();
        render(input.value || "");
      }
    };

    input.addEventListener("input", () => {
      updateClearState();
      if (searchTimer) {
        window.clearTimeout(searchTimer);
      }
      searchTimer = window.setTimeout(() => {
        searchTimer = 0;
        render(input.value || "");
      }, 300);
    });

    clearButton.type = "button";
    clearButton.className = "site-search-clear";
    clearButton.hidden = true;
    clearIcon.className = "site-search-clear-icon";
    clearIcon.setAttribute("aria-hidden", "true");
    clearIcon.textContent = ui.searchClearShort || "×";
    clearLabel.className = "site-search-clear-label";
    clearLabel.textContent = ui.searchClearButton || "Очистити";
    clearButton.appendChild(clearIcon);
    clearButton.appendChild(clearLabel);
    clearButton.addEventListener("click", (event) => {
      event.preventDefault();
      if (searchTimer) {
        window.clearTimeout(searchTimer);
        searchTimer = 0;
      }
      input.value = "";
      updateClearState();
      clearSearchQueryParam();
      render("");
      input.focus();
    });

    if (field) {
      field.appendChild(clearButton);
    }

    input.value = getInitialSearchQuery();
    applyChrome();

    if (typeof fetch !== "function") {
      status.textContent = ui.unavailable || "Пошуковий індекс тимчасово недоступний.";
      return;
    }

    fetch("files/search/site-search-index.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("search index unavailable");
        }
        return response.json();
      })
      .then((payload) => {
        baseIndexItems = payload && Array.isArray(payload.items) ? payload.items : [];
        indexItems = baseIndexItems;
        render(input.value || "");
      })
      .catch(() => {
        status.textContent = ui.unavailable || "Пошуковий індекс тимчасово недоступний.";
      });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
