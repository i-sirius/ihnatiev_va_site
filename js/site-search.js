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

  function normalizeSearchText(value, locale) {
    return String(value || "")
      .toLocaleLowerCase(locale)
      .replace(/\s+/g, " ")
      .trim();
  }

  function getSearchWords(query, locale) {
    const normalized = normalizeSearchText(query, locale);
    return normalized ? normalized.split(" ").filter((word) => word.length >= 2) : [];
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

  function getRecordFields(record, locale) {
    return [
      getLocalizedValue(record.title, locale, ""),
      getLocalizedValue(record.section, locale, ""),
      getLocalizedValue(record.description, locale, ""),
      getLocalizedValue(record.keywords, locale, ""),
      getLocalizedValue(record.aliases, locale, ""),
      getLocalizedValue(record.summary, locale, ""),
      getLocalizedValue(record.bibliography, locale, ""),
      getLocalizedValue(record.searchText, locale, ""),
      getPageSearchText(record),
      Array.isArray(record.topics) ? record.topics.join(" ") : "",
      record.href || "",
      record.url || ""
    ].map((field) => normalizeSearchText(field, locale)).filter(Boolean);
  }

  function matchesRecord(record, words, locale) {
    const fields = getRecordFields(record, locale);
    return words.every((word) =>
      fields.some((field) => field.indexOf(word) !== -1)
    );
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
    const normalizedSource = normalizeSearchText(source, locale);
    let matchIndex = -1;
    let matchLength = 0;

    for (let index = 0; index < words.length; index += 1) {
      const termIndex = normalizedSource.indexOf(words[index]);
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
        const wordIndex = normalizedSource.indexOf(word, position);
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

  function getResultUrl(record, query) {
    const baseUrl = record.url || "#";
    if (record.type !== "download" || !query || baseUrl.indexOf("downloads.html") !== 0) {
      return baseUrl;
    }

    return `${baseUrl}?q=${encodeURIComponent(query).replace(/'/g, "%27")}`;
  }

  function getResultTypeLabel(type, locale, ui) {
    const normalizedType = String(type || "page").trim() || "page";
    const labels = ui.typeLabels || ui.types || {};
    const label = getLocalizedValue(labels[normalizedType], locale, "");

    if (label) {
      return label;
    }

    if (normalizedType === "audio") {
      return locale === "en" ? "Audio / Sermons" : "Аудіо / Проповіді";
    }

    return normalizedType
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase(locale));
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
      "description",
      "topics",
      "keywords",
      "aliases",
      "summary",
      "bibliography",
      "searchText",
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

    meta.textContent = getResultTypeLabel(type, locale, ui);
    appendHighlightedText(title, getLocalizedValue(record.title, locale, ""), words, locale);
    appendHighlightedText(snippet, getSnippet(record, words, locale), words, locale);
    link.textContent = ui.open || "Відкрити";
    if (!setSafeUrlAttribute(link, "href", getResultUrl(record, query))) {
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
      results.textContent = "";

      if (!words.length) {
        status.textContent = ui.emptyInitial || "Введіть запит із двох або більше символів.";
        return;
      }

      if (!downloadsIndexLoaded && !downloadsIndexLoading) {
        loadDownloadsIndex(() => {
          render(input.value || "");
        });
      }

      const matches = indexItems.filter((record) => matchesRecord(record, words, locale));
      if (!matches.length) {
        status.textContent = ui.emptyResults || "Нічого не знайдено.";
        return;
      }

      status.textContent = "";
      matches.slice(0, 60).forEach((record) => {
        results.appendChild(createResult(record, words, query, locale, ui));
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
