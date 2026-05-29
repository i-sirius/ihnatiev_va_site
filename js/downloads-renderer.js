(() => {
  const siteUtils = window.SiteUtils || {};
  const isSafeUrl = siteUtils.isSafeUrl || ((value) => {
    const raw = String(value || "").trim();
    if (!raw) return false;
    const normalized = raw.replace(/[\u0000-\u001F\u007F\s]+/g, "").toLowerCase();
    const schemeMatch = normalized.match(/^([a-z][a-z0-9+.-]*):/);
    return !schemeMatch || schemeMatch[1] === "http" || schemeMatch[1] === "https";
  });
  const setSafeUrlAttribute = siteUtils.setSafeUrlAttribute || ((element, attribute, value) => {
    if (!element || !isSafeUrl(value)) return false;
    element.setAttribute(attribute, String(value).trim());
    return true;
  });

  function getDownloadFileType(file = {}, getLocalizedValue = (value) => value || "") {
    if (file.type) {
      return String(getLocalizedValue(file.type, file.type) || file.type).toUpperCase();
    }

    const source = `${file.href || file.file || ""} ${getLocalizedValue(file.label || file.title, "")}`;
    const match = source.match(/\.([a-z0-9]{2,5})(?:$|[?#\s])/i);
    return (match && match[1] || "file").toUpperCase();
  }

  function createDownloadsRenderer({
    site = window.SITE || {},
    getLocalizedValue: externalGetLocalizedValue = (value, fallback = "") => value || fallback,
    searchIndex = null
  } = {}) {
    let currentSearchIndex = normalizeSearchIndex(searchIndex);

    function getRendererLocale() {
      return site.currentLocale || site.defaultLocale || "uk";
    }

    function getRendererDefaultLocale() {
      return site.defaultLocale || "uk";
    }

    function getLocalizedValue(value, fallback = "") {
      if (value == null) {
        return fallback;
      }

      if (typeof value === "string") {
        return value;
      }

      if (typeof value === "object" && !Array.isArray(value)) {
        const locale = getRendererLocale();
        const defaultLocale = getRendererDefaultLocale();
        const localizedValue =
          value[locale] != null
            ? value[locale]
            : value[defaultLocale] != null
              ? value[defaultLocale]
              : externalGetLocalizedValue(value, fallback);
        return typeof localizedValue === "string" ? localizedValue : fallback;
      }

      return fallback;
    }

    function getFileType(file = {}) {
      return getDownloadFileType(file, getLocalizedValue);
    }

    function getDownloadsUi() {
      return site.ui && site.ui.downloads ? site.ui.downloads : {};
    }

    function getPreviewUi() {
      return site.ui && site.ui.documentPreview ? site.ui.documentPreview : {};
    }

    function getLocalizedActionLabel(value, fallback = "") {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return getLocalizedValue(value, fallback) || fallback;
      }

      const locale = site.currentLocale || site.defaultLocale || "uk";
      const localizedValue = value[locale];
      return typeof localizedValue === "string" && localizedValue.trim()
        ? localizedValue
        : fallback;
    }

    function getFileHref(file = {}) {
      return file.href || file.file || "";
    }

    function getFileLabel(file = {}) {
      return (
        getLocalizedValue(file.title, "") ||
        getLocalizedValue(file.label, "") ||
        getFileHref(file) ||
        getPreviewUi().fileFallbackLabel ||
        "Файл"
      );
    }

    function getFieldText(value, fallback = "") {
      if (Array.isArray(value)) {
        return value.map((item) => getFieldText(item, "")).filter(Boolean).join(" ");
      }

      if (value && typeof value === "object") {
        const locale = getRendererLocale();
        const defaultLocale = getRendererDefaultLocale();
        if (value[locale] != null) {
          return getFieldText(value[locale], fallback);
        }
        if (value[defaultLocale] != null) {
          return getFieldText(value[defaultLocale], fallback);
        }
      }

      return getLocalizedValue(value, fallback) || fallback || "";
    }

    function getContentKind(file = {}) {
      return String(file.contentKind || "").toLowerCase();
    }

    function getTextLayerState(file = {}) {
      if (file.textLayer === true) {
        return "text";
      }
      if (file.textLayer === false) {
        return "scan";
      }
      return "";
    }

    function getFilePropertyLabels(file = {}) {
      const downloadsUi = getDownloadsUi();
      const contentKind = getContentKind(file);
      const textLayerState = getTextLayerState(file);
      const labels = [];

      if (textLayerState === "scan") {
        labels.push(downloadsUi.scanBadge || "Скан");
      } else if (textLayerState === "text") {
        labels.push(downloadsUi.textLayerBadge || "Текстовий шар");
      }

      if (contentKind === "mixed") {
        labels.push(downloadsUi.mixedBadge || "Змішаний");
      }

      if (file.pages) {
        labels.push(`${file.pages} ${downloadsUi.pagesBadge || "стор."}`);
      }

      return labels;
    }

    function normalizeSearchIndex(index) {
      const map = {};
      const items = index && Array.isArray(index.items) ? index.items : [];

      items.forEach((item) => {
        if (!item || !item.href) {
          return;
        }

        map[item.href] = item;
      });

      return map;
    }

    function getSearchIndexEntry(file = {}) {
      const href = getFileHref(file);
      return href && currentSearchIndex[href] ? currentSearchIndex[href] : null;
    }

    function normalizeSearchText(value) {
      return String(value || "")
        .toLocaleLowerCase(getRendererLocale())
        .replace(/\s+/g, " ")
        .trim();
    }

    function getSearchWords(query) {
      const normalized = normalizeSearchText(query);
      return normalized ? normalized.split(" ") : [];
    }

    function getInitialDownloadsParam(name) {
      try {
        if (typeof URLSearchParams !== "function") {
          return "";
        }
        return new URLSearchParams(window.location.search).get(name) || "";
      } catch (error) {
        return "";
      }
    }

    function getInitialDownloadsQuery() {
      const query = getInitialDownloadsParam("q");
      return query && query.trim().length > 1 ? query : "";
    }

    function getInitialDownloadsTopic() {
      const topic = getInitialDownloadsParam("topic");
      return topic && topic.trim() ? topic.trim() : "all";
    }

    function getTopicFilterDefinitions() {
      const downloadsUi = getDownloadsUi();
      const configuredFilters = downloadsUi.topicFilters;
      if (Array.isArray(configuredFilters) && configuredFilters.length) {
        return configuredFilters;
      }

      return [
        { topic: "all", label: "Усі" },
        { topic: "hesychasm", label: "Ісихазм" },
        { topic: "natiosophy", label: "Націософія" },
        { topic: "philosophy", label: "Філософія" },
        { topic: "theology", label: "Богослов’я" },
        { topic: "religious-studies", label: "Релігієзнавство" },
        { topic: "orthodox-tradition", label: "Православна традиція" },
        { topic: "anthropology", label: "Антропологія" },
        { topic: "metaphysics", label: "Метафізика" },
        { topic: "ontology", label: "Онтологія" },
        { topic: "epistemology", label: "Гносеологія" },
        { topic: "social-philosophy", label: "Соціальна філософія" },
        { topic: "secularity", label: "Секулярність" },
        { topic: "education", label: "Освіта" },
        { topic: "monographs", label: "Монографії" },
        { topic: "articles", label: "Статті" }
      ];
    }

    function getTopicLabel(topic) {
      const filters = getTopicFilterDefinitions();
      for (let index = 0; index < filters.length; index += 1) {
        const filter = filters[index];
        if (filter && filter.topic === topic) {
          return getLocalizedValue(filter.label, topic);
        }
      }

      return topic;
    }

    function getPriorityVisibleTopics() {
      const downloadsUi = getDownloadsUi();
      const configuredTopics = downloadsUi.topicFiltersPriorityVisibleTopics;

      if (Array.isArray(configuredTopics) && configuredTopics.length) {
        return configuredTopics.map((topic) => String(topic || "").trim()).filter(Boolean);
      }

      return [
        "hesychasm",
        "natiosophy",
        "philosophy",
        "theology",
        "religious-studies",
        "orthodox-tradition",
        "anthropology",
        "metaphysics",
        "ontology",
        "epistemology",
        "monographs",
        "articles"
      ];
    }

    function getMinVisibleTopicCount() {
      const downloadsUi = getDownloadsUi();
      const configuredCount = Number(downloadsUi.topicFiltersMinVisibleCount);

      if (isFinite(configuredCount) && configuredCount > 0) {
        return configuredCount;
      }

      return 2;
    }

    function isTopicVisible(topic, count) {
      const normalizedTopic = String(topic || "").trim();
      const topicCount = Number(count) || 0;

      if (!normalizedTopic || normalizedTopic === "all") {
        return true;
      }

      if (getPriorityVisibleTopics().indexOf(normalizedTopic) !== -1) {
        return topicCount > 0;
      }

      return topicCount >= getMinVisibleTopicCount();
    }

    function getFileTopics(file = {}, context = {}) {
      const topics = [];
      const values = Array.isArray(file.topics) ? file.topics : [];

      values.forEach((topic) => {
        const normalizedTopic = String(topic || "").trim();
        if (normalizedTopic && topics.indexOf(normalizedTopic) === -1) {
          topics.push(normalizedTopic);
        }
      });

      if (context.collection && topics.indexOf(context.collection) === -1) {
        topics.push(context.collection);
      }

      return topics;
    }

    function matchesTopic(file = {}, context = {}, topic = "all") {
      const activeTopic = String(topic || "all");
      if (!activeTopic || activeTopic === "all") {
        return true;
      }

      return getFileTopics(file, context).indexOf(activeTopic) !== -1;
    }

    function addTopicCount(counts, topic) {
      const key = String(topic || "").trim();
      if (!key) {
        return;
      }

      counts[key] = (counts[key] || 0) + 1;
    }

    function countFileTopics(counts, file = {}, context = {}) {
      const topics = getFileTopics(file, context);
      topics.forEach((topic) => addTopicCount(counts, topic));
    }

    function getTopicCounts(groups = {}) {
      const counts = {};
      const monographs = Array.isArray(groups.monographs) ? groups.monographs : [];
      const articleGroups = Array.isArray(groups.articles) ? groups.articles : [];

      monographs.forEach((file) => countFileTopics(counts, file, { collection: "monographs" }));
      articleGroups.forEach((group) => {
        const files = Array.isArray(group.files) ? group.files : [];
        files.forEach((file) => countFileTopics(counts, file, { collection: "articles" }));
      });

      return counts;
    }

    function getAvailableTopicFilters(groups = {}) {
      const definitions = getTopicFilterDefinitions();
      const counts = getTopicCounts(groups);
      const usedTopics = [];
      const filters = [];
      let total = 0;

      Object.keys(counts).forEach((topic) => {
        total += counts[topic];
      });

      definitions.forEach((filter) => {
        const topic = filter && filter.topic ? String(filter.topic) : "";
        if (!topic) {
          return;
        }

        if (topic === "all") {
          filters.push({ topic, label: filter.label, count: total });
          usedTopics.push(topic);
          return;
        }

        if (counts[topic] > 0 && isTopicVisible(topic, counts[topic])) {
          filters.push({ topic, label: filter.label, count: counts[topic] });
          usedTopics.push(topic);
        }
      });

      Object.keys(counts).sort().forEach((topic) => {
        if (usedTopics.indexOf(topic) !== -1) {
          return;
        }

        if (isTopicVisible(topic, counts[topic])) {
          filters.push({ topic, label: getTopicLabel(topic), count: counts[topic] });
        }
      });

      return filters;
    }

    function getSearchFields(file = {}, context = {}) {
      const fileType = getFileType(file);
      const indexEntry = getSearchIndexEntry(file);
      return [
        getFileLabel(file),
        getFieldText(file.description),
        getFieldText(file.keywords),
        getFieldText(file.topics),
        getFieldText(file.aliases),
        getFieldText(file.summary),
        getFieldText(file.bibliography),
        getFieldText(file.category, context.category || ""),
        getFieldText(file.searchText),
        indexEntry ? getFieldText(indexEntry.title) : "",
        indexEntry ? getFieldText(indexEntry.category) : "",
        indexEntry ? getFieldText(indexEntry.keywords) : "",
        indexEntry ? getFieldText(indexEntry.topics) : "",
        indexEntry ? getFieldText(indexEntry.aliases) : "",
        indexEntry ? getFieldText(indexEntry.summary) : "",
        indexEntry ? getFieldText(indexEntry.bibliography) : "",
        indexEntry ? getFieldText(indexEntry.searchText) : "",
        getFieldText(file.contentKind),
        indexEntry ? getFieldText(indexEntry.contentKind) : "",
        getTextLayerState(file),
        getFieldText(file.year),
        getFieldText(file.date),
        getFieldText(fileType),
        getFileHref(file)
      ].map(normalizeSearchText).filter(Boolean);
    }

    function matchesSearch(file = {}, context = {}, words = []) {
      if (!words.length) {
        return true;
      }

      const fields = getSearchFields(file, context);
      return words.every((word) =>
        fields.some((field) => field.indexOf(word) !== -1)
      );
    }

    function getSearchSnippet(text = "", term = "") {
      const source = String(text || "");
      const normalizedSource = normalizeSearchText(source);
      const normalizedTerm = normalizeSearchText(term);
      const index = normalizedTerm ? normalizedSource.indexOf(normalizedTerm) : -1;

      if (index < 0) {
        return source.slice(0, 220);
      }

      const start = Math.max(0, index - 90);
      const end = Math.min(source.length, index + normalizedTerm.length + 130);
      return `${start > 0 ? "... " : ""}${source.slice(start, end)}${end < source.length ? " ..." : ""}`;
    }

    function getPreviewSearchMatch(file = {}, query = "", context = {}) {
      const words = getSearchWords(query);
      if (!words.length) {
        return null;
      }

      const fields = getSearchFields(file, context);
      const indexEntry = getSearchIndexEntry(file);
      const pageSearch = indexEntry && Array.isArray(indexEntry.pageSearch)
        ? indexEntry.pageSearch
        : [];

      for (let index = 0; index < words.length; index += 1) {
        const word = words[index];
        if (word.length < 2) {
          continue;
        }

        for (let pageIndex = 0; pageIndex < pageSearch.length; pageIndex += 1) {
          const pageEntry = pageSearch[pageIndex];
          const pageText = normalizeSearchText(pageEntry && pageEntry.text);
          if (pageText && pageText.indexOf(word) !== -1) {
            return {
              term: word,
              page: pageEntry && pageEntry.page ? String(pageEntry.page) : "",
              snippet: getSearchSnippet(pageEntry && pageEntry.text, word)
            };
          }
        }

        if (fields.some((field) => field.indexOf(word) !== -1)) {
          return {
            term: word,
            page: "",
            snippet: ""
          };
        }
      }

      return null;
    }

    function getPurchaseHref(file = {}) {
      const purchase = file.purchase;
      if (!purchase || typeof purchase !== "object") {
        return "";
      }

      const directHref = getLocalizedValue(purchase.href, "");
      if (directHref) {
        return directHref;
      }

      if (purchase.mode !== "contact") {
        return "";
      }

      const params = new URLSearchParams();
      const subject = getLocalizedValue(purchase.subject, "");
      const message = getLocalizedValue(purchase.message, "");

      if (subject) {
        params.set("subject", subject);
      }

      if (message) {
        params.set("message", message);
      }

      const query = params.toString();
      return `contact.html${query ? `?${query}` : ""}`;
    }

    function getFileIconMarkup(fileType = "FILE") {
      const normalizedType = String(fileType).toUpperCase();

      if (normalizedType === "PDF") {
        return `
          <svg class="download-file-icon is-pdf" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path fill="currentColor" d="M6 2.8h8.4L20 8.4V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4.8a2 2 0 0 1 2-2Zm7.8 1.8v4.3h4.3L13.8 4.6ZM8 17.8v-6h2.6c1.5 0 2.4.8 2.4 2.1 0 1.4-.9 2.2-2.4 2.2H9.5v1.7H8Zm1.5-3h1c.6 0 1-.3 1-.9s-.4-.8-1-.8h-1v1.7Zm4.4 3v-6h2.3c1.9 0 3.2 1.2 3.2 3s-1.3 3-3.2 3h-2.3Zm1.5-1.3h.7c1.1 0 1.8-.7 1.8-1.8s-.7-1.8-1.8-1.8h-.7v3.6Zm4.7 1.3v-6h3.9v1.3h-2.4v1.2h2.1v1.3h-2.1v2.2h-1.5Z"/>
          </svg>
        `;
      }

      if (normalizedType === "DOC" || normalizedType === "DOCX") {
        return `
          <svg class="download-file-icon is-doc" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path fill="currentColor" d="M6 2.8h8.4L20 8.4V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4.8a2 2 0 0 1 2-2Zm7.8 1.8v4.3h4.3L13.8 4.6ZM7.8 17.8v-6H10c1.9 0 3.1 1.2 3.1 3s-1.2 3-3.1 3H7.8Zm1.5-1.3H10c1 0 1.6-.6 1.6-1.7S11 13.1 10 13.1H9.3v3.4Zm7.2 1.4c-1.7 0-2.8-1.2-2.8-3.1s1.1-3.1 2.8-3.1 2.8 1.2 2.8 3.1-1.1 3.1-2.8 3.1Zm0-1.3c.8 0 1.3-.7 1.3-1.8s-.5-1.8-1.3-1.8-1.3.7-1.3 1.8.5 1.8 1.3 1.8Z"/>
          </svg>
        `;
      }

      if (normalizedType === "DJVU" || normalizedType === "DJV") {
        return `
          <svg class="download-file-icon is-djvu" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path fill="currentColor" d="M6 2.8h8.4L20 8.4V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4.8a2 2 0 0 1 2-2Zm7.8 1.8v4.3h4.3L13.8 4.6ZM7.7 17.8v-6h1.5v4.7h2.3v1.3H7.7Zm5.2.1c-1 0-1.8-.3-2.4-.9l.8-1.1c.4.4.8.6 1.4.6.6 0 .9-.3.9-.8v-3.9h1.5v3.9c0 1.4-.8 2.2-2.2 2.2Zm5.2 0c-1.8 0-2.9-1.2-2.9-3.1s1.1-3.1 2.9-3.1c1 0 1.8.4 2.3 1l-.9 1c-.3-.4-.8-.7-1.4-.7-.9 0-1.4.7-1.4 1.8s.6 1.8 1.4 1.8c.6 0 1.1-.3 1.4-.7l.9 1c-.5.7-1.3 1-2.3 1Z"/>
          </svg>
        `;
      }

      return `
        <svg class="download-file-icon is-file" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M6 2.8h8.4L20 8.4V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4.8a2 2 0 0 1 2-2Zm7.8 1.8v4.3h4.3L13.8 4.6ZM8 17.7v-5.8h1.5v4.5h2.6v1.3H8Zm5-5.8h1.5v5.8H13v-5.8Zm2.8 0h4.1v1.3h-2.6v1h2.2v1.3h-2.2v2.2h-1.5v-5.8Z"/>
        </svg>
      `;
    }

    function shouldUseDirectPdfActions(fileType = "FILE") {
      return Boolean(
        window.SiteDocumentLightbox &&
          typeof window.SiteDocumentLightbox.shouldUseDirectPdfActions === "function" &&
          window.SiteDocumentLightbox.shouldUseDirectPdfActions(fileType)
      );
    }

    function shouldUseStandalonePdfPanel(fileType = "FILE") {
      return Boolean(
        window.SiteDocumentLightbox &&
          typeof window.SiteDocumentLightbox.shouldUseStandalonePdfPanel === "function" &&
          window.SiteDocumentLightbox.shouldUseStandalonePdfPanel(fileType)
      );
    }

    function createTextElement(tagName, text, className) {
      const element = document.createElement(tagName);
      if (className) {
        element.className = className;
      }
      element.textContent = text || "";
      return element;
    }

    function appendHighlightedText(element, text = "", query = "") {
      const source = String(text || "");
      const locale = getRendererLocale();
      const words = getSearchWords(query)
        .filter((word) => word.length >= 2)
        .sort((first, second) => second.length - first.length);

      if (!source || !words.length) {
        element.textContent = source;
        return;
      }

      const normalizedSource = source.toLocaleLowerCase(locale);
      let position = 0;

      while (position < source.length) {
        let nextIndex = -1;
        let nextWord = "";

        words.forEach((word) => {
          const index = normalizedSource.indexOf(word, position);
          if (index >= 0 && (nextIndex < 0 || index < nextIndex)) {
            nextIndex = index;
            nextWord = word;
          }
        });

        if (nextIndex < 0) {
          element.appendChild(document.createTextNode(source.slice(position)));
          break;
        }

        if (nextIndex > position) {
          element.appendChild(document.createTextNode(source.slice(position, nextIndex)));
        }

        const mark = document.createElement("mark");
        mark.className = "download-search-highlight";
        mark.textContent = source.slice(nextIndex, nextIndex + nextWord.length);
        element.appendChild(mark);
        position = nextIndex + nextWord.length;
      }
    }

    function createActionLink(className, label, href, options = {}) {
      const link = document.createElement("a");
      link.className = className;
      if (!setSafeUrlAttribute(link, "href", href)) {
        link.setAttribute("href", "#");
        link.setAttribute("aria-disabled", "true");
      }
      if (options.download) {
        link.setAttribute("download", "");
      }
      if (options.target) {
        link.target = options.target;
      }
      if (options.rel) {
        link.rel = options.rel;
      }
      if (options.ariaLabel) {
        link.setAttribute("aria-label", options.ariaLabel);
      }
      if (options.title) {
        link.title = options.title;
      }
      link.textContent = label || "";
      return link;
    }

    function createDownloadIcon(fileType, file = {}) {
      const fileTypeElement = document.createElement("span");
      const icon = document.createElement("span");
      const label = document.createElement("span");
      const properties = getFilePropertyLabels(file);

      fileTypeElement.className = "download-filetype";
      icon.className = "download-filetype-icon";
      label.className = "download-filetype-label";

      icon.insertAdjacentHTML("beforeend", getFileIconMarkup(fileType));
      label.textContent = fileType;

      fileTypeElement.appendChild(icon);
      fileTypeElement.appendChild(label);

      if (properties.length) {
        const tooltip = document.createElement("span");
        const text = properties.join(" · ");
        tooltip.className = "download-file-properties";
        tooltip.textContent = text;
        fileTypeElement.title = text;
        fileTypeElement.setAttribute("aria-label", text);
        fileTypeElement.appendChild(tooltip);
      } else {
        fileTypeElement.setAttribute("aria-hidden", "true");
      }

      return fileTypeElement;
    }

    function createDownloadSummary(file = {}, context = {}) {
      const fileType = getFileType(file);
      const href = getFileHref(file);
      const label = getFileLabel(file);
      const previewSearch = getPreviewSearchMatch(file, context.searchQuery || "", context);
      const useLegacyFileActions = document.documentElement.classList.contains("no-modern-effects");
      const useDirectPdfActions = shouldUseDirectPdfActions(fileType);
      const useSimpleFileActions = useLegacyFileActions || useDirectPdfActions;
      const previewUi = getPreviewUi();
      const directPdfNote =
        useDirectPdfActions && !useLegacyFileActions
          ? previewUi.pdfFallbackText ||
            "Перегляд PDF у цьому браузері може бути обмежений. Відкрийте файл окремо."
          : "";
      const summary = document.createElement(useSimpleFileActions ? "div" : "button");
      const main = document.createElement("span");
      const content = document.createElement("span");

      summary.className = useSimpleFileActions
        ? `download-preview-trigger download-direct-file${useLegacyFileActions ? " download-legacy-file" : " download-ios-pdf-file"}`
        : "download-preview-trigger";

      if (!useSimpleFileActions) {
        summary.type = "button";
        summary.setAttribute("data-download-preview", "");
        if (setSafeUrlAttribute(summary, "data-preview-href", href)) {
          summary.dataset.previewLabel = label;
          summary.dataset.previewType = fileType;
          if (previewSearch && previewSearch.term) {
            summary.dataset.previewSearch = context.searchQuery || previewSearch.term;
          }
          if (previewSearch && previewSearch.page) {
            summary.dataset.previewPage = previewSearch.page;
          }
          if (previewSearch && previewSearch.snippet) {
            summary.dataset.previewSnippet = previewSearch.snippet;
          }
        }
        summary.setAttribute("aria-label", `${previewUi.previewAria || "Переглянути"} ${label}`);
      }

      main.className = "download-link-main";
      content.className = "download-link-content";
      main.appendChild(createDownloadIcon(fileType, file));
      const labelElement = createTextElement("span", "", "download-link-text");
      appendHighlightedText(labelElement, label, context.searchQuery || "");
      content.appendChild(labelElement);
      main.appendChild(content);
      summary.appendChild(main);

      if (file.description) {
        const description = createTextElement("p", "", "download-description");
        appendHighlightedText(description, getFieldText(file.description), context.searchQuery || "");
        summary.appendChild(description);
      }

      if (directPdfNote) {
        summary.appendChild(createTextElement("p", directPdfNote, "download-pdf-fallback-note"));
      }

      return summary;
    }

    function createDownloadActions(file = {}) {
      const fileType = getFileType(file);
      const href = getFileHref(file);
      const label = getFileLabel(file);
      const useLegacyFileActions = document.documentElement.classList.contains("no-modern-effects");
      const useDirectPdfActions = shouldUseDirectPdfActions(fileType);
      const useStandalonePdfPanel = shouldUseStandalonePdfPanel(fileType);
      const useSimpleFileActions = useLegacyFileActions || useDirectPdfActions;
      const previewUi = getPreviewUi();
      const actions = document.createElement("div");
      const openLabel =
        useDirectPdfActions && !useLegacyFileActions
          ? previewUi.pdfOpen || "Відкрити PDF"
          : previewUi.legacyOpen || previewUi.open || "Відкрити файл";
      const purchaseLabel = getLocalizedActionLabel(
        file.purchase && file.purchase.label,
        previewUi.purchase || "Замовити e-book"
      );
      const purchaseHref = getPurchaseHref(file);

      actions.className = "download-actions";

      if (purchaseHref && isSafeUrl(purchaseHref)) {
        actions.appendChild(createActionLink(
          "download-purchase-action",
          purchaseLabel,
          purchaseHref,
          {
            ariaLabel: `${previewUi.purchaseAria || "Замовити"} ${label}`,
            title: previewUi.purchaseTitle || "Замовити електронну книгу"
          }
        ));
      }

      if (useSimpleFileActions) {
        const openLink = createActionLink(
          "download-open-action",
          openLabel,
          href,
          {
            target: "_blank",
            rel: "noopener noreferrer",
            ariaLabel: `${openLabel} ${label}`
          }
        );
        if (useStandalonePdfPanel && isSafeUrl(href)) {
          openLink.setAttribute("data-pdf-standalone-trigger", "");
          openLink.setAttribute("data-pdf-standalone-href", String(href).trim());
          openLink.setAttribute("data-pdf-standalone-label", label);
        }
        actions.appendChild(openLink);
      }

      const downloadLink = createActionLink(
        "download-link-action",
        "",
        href,
        {
          download: true,
          ariaLabel: `${previewUi.downloadAria || "Завантажити"} ${label}`,
          title: previewUi.download || "Завантажити"
        }
      );
      const arrow = document.createElement("span");
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "↓";
      downloadLink.appendChild(arrow);
      downloadLink.appendChild(createTextElement(
        "span",
        previewUi.download || "Завантажити",
        "download-link-action-text"
      ));
      actions.appendChild(downloadLink);

      return actions;
    }

    function createListItem(file = {}, context = {}) {
      const listItem = document.createElement("li");
      const row = document.createElement("div");

      row.className = "download-row";
      row.appendChild(createDownloadSummary(file, context));
      row.appendChild(createDownloadActions(file));
      listItem.appendChild(row);

      return listItem;
    }

    function createFileList(files = [], context = {}) {
      const list = document.createElement("ul");
      list.className = "download-list";
      files.forEach((file) => {
        list.appendChild(createListItem(file, context));
      });
      return list;
    }

    function createEmptyMessage(text, className) {
      return createTextElement("p", text, className || "download-group-empty");
    }

    function renderGroupFiles(container, files = [], context = {}) {
      const downloadsUi = getDownloadsUi();
      const previewUi = getPreviewUi();
      const emptyText = context.searchQuery
        ? downloadsUi.searchSectionEmpty || downloadsUi.searchEmpty || "Файлів за цим запитом зараз не знайдено."
        : downloadsUi.empty || "Файли тимчасово відсутні.";

      container.textContent = "";

      if (!Array.isArray(files) || !files.length) {
        container.appendChild(createEmptyMessage(
          emptyText,
          "download-group-empty"
        ));
        return;
      }

      if (document.documentElement.classList.contains("no-modern-effects")) {
        container.appendChild(createTextElement(
          "p",
          previewUi.legacyNote || "На цьому браузері файл відкриється окремо.",
          "download-legacy-note"
        ));
      }

      container.appendChild(createFileList(files, context));
    }

    function createSearchControls(onSearch) {
      const downloadsUi = getDownloadsUi();
      const search = document.createElement("div");
      const field = document.createElement("label");
      const input = document.createElement("input");
      let searchTimer = 0;
      let lastSearchValue = "";

      function runSearch(value) {
        const rawValue = value || "";
        const nextValue = rawValue.trim().length === 1 ? "" : rawValue;
        if (nextValue === lastSearchValue) {
          return;
        }

        lastSearchValue = nextValue;
        onSearch(nextValue);
      }

      function scheduleSearch(value) {
        if (searchTimer) {
          window.clearTimeout(searchTimer);
        }

        searchTimer = window.setTimeout(() => {
          searchTimer = 0;
          runSearch(value);
        }, 320);
      }

      search.className = "downloads-search";
      field.className = "downloads-search-field";

      input.type = "text";
      input.setAttribute("role", "searchbox");
      input.setAttribute("data-downloads-search-input", "");
      input.placeholder = downloadsUi.searchPlaceholder || "Пошук у завантаженнях...";
      input.setAttribute("aria-label", input.placeholder);
      input.autocomplete = "off";
      input.value = getInitialDownloadsQuery();

      input.addEventListener("input", () => {
        scheduleSearch(input.value || "");
      });

      field.appendChild(input);
      search.appendChild(field);

      return search;
    }

    function createTopicFilters(groups, activeTopic, onTopicChange) {
      const downloadsUi = getDownloadsUi();
      const filters = getAvailableTopicFilters(groups);
      const panel = document.createElement("div");
      const label = document.createElement("span");
      const wrap = document.createElement("div");

      panel.className = "downloads-topic-filter-panel";
      label.className = "downloads-topic-filter-label";
      label.textContent = downloadsUi.topicFiltersShortLabel || downloadsUi.topicFiltersLabel || "Теми";
      wrap.className = "downloads-topic-filters";
      wrap.setAttribute("aria-label", downloadsUi.topicFiltersLabel || "Фільтр за темою");
      panel.appendChild(label);

      filters.forEach((filter) => {
        const topic = filter && filter.topic ? String(filter.topic) : "all";
        const button = document.createElement("button");
        const buttonLabel = getLocalizedValue(filter && filter.label, topic);
        const count = filter && typeof filter.count === "number" ? filter.count : 0;

        button.type = "button";
        button.className = topic === activeTopic ? "downloads-topic-chip is-active" : "downloads-topic-chip";
        button.setAttribute("data-downloads-topic", topic);
        button.setAttribute("aria-pressed", topic === activeTopic ? "true" : "false");

        const labelText = document.createElement("span");
        labelText.className = "downloads-topic-chip-label";
        labelText.textContent = buttonLabel || topic;
        button.appendChild(labelText);

        if (topic !== "all" && count > 0) {
          const countText = document.createElement("span");
          countText.className = "downloads-topic-chip-count";
          countText.textContent = String(count);
          button.appendChild(countText);
        }

        button.addEventListener("click", () => {
          onTopicChange(topic);
        });
        wrap.appendChild(button);
      });

      panel.appendChild(wrap);
      return panel;
    }

    function filterMonographs(monographs, words, topic) {
      return monographs.filter((file) =>
        matchesTopic(file, { collection: "monographs" }, topic) &&
        matchesSearch(file, { category: getDownloadsUi().monographsTitle || "Монографії" }, words)
      );
    }

    function filterArticleGroups(articleGroups, words, topic) {
      return articleGroups
        .map((group) => {
          const category = getLocalizedValue(group.title, getDownloadsUi().subgroupFallback || "Розділ");
          const files = Array.isArray(group.files) ? group.files : [];
          return {
            title: group.title,
            category,
            files: files.filter((file) =>
              matchesTopic(file, { collection: "articles" }, topic) &&
              matchesSearch(file, { category }, words)
            )
          };
        })
        .filter((group) => group.files.length);
    }

    function countArticleFiles(articleGroups) {
      return articleGroups.reduce((count, group) => {
        const files = Array.isArray(group.files) ? group.files : [];
        return count + files.length;
      }, 0);
    }

    function renderGroupsInto(container, groups, query, topic = "all") {
      const downloadsUi = getDownloadsUi();
      const words = getSearchWords(query);
      const activeTopic = topic || "all";
      const monographs = Array.isArray(groups.monographs) ? groups.monographs : [];
      const articleGroups = Array.isArray(groups.articles) ? groups.articles : [];
      const filteredMonographs = filterMonographs(monographs, words, activeTopic);
      const filteredArticleGroups = filterArticleGroups(articleGroups, words, activeTopic);
      const totalMatches = filteredMonographs.length + countArticleFiles(filteredArticleGroups);
      const groupsWrap = document.createElement("div");
      const monographsSection = document.createElement("section");
      const articlesSection = document.createElement("section");
      const monographsBody = document.createElement("div");
      const subgroups = document.createElement("div");

      container.textContent = "";
      groupsWrap.className = "downloads-groups-list";

      if ((words.length || activeTopic !== "all") && !totalMatches) {
        container.appendChild(createEmptyMessage(
          downloadsUi.searchEmpty || downloadsUi.searchSectionEmpty || "Нічого не знайдено",
          "downloads-search-empty"
        ));
        return;
      }

      monographsSection.className = "download-group download-group-main";
      monographsSection.appendChild(createTextElement(
        "h3",
        downloadsUi.monographsTitle || "МОНОГРАФІЇ",
        "download-group-title"
      ));
      monographsBody.className = "download-group-body";
      renderGroupFiles(monographsBody, filteredMonographs, {
        category: downloadsUi.monographsTitle || "РњРѕРЅРѕРіСЂР°С„С–С—",
        searchQuery: query,
        topic: activeTopic
      });
      monographsSection.appendChild(monographsBody);
      groupsWrap.appendChild(monographsSection);

      articlesSection.className = "download-group download-group-main";
      articlesSection.appendChild(createTextElement(
        "h3",
        downloadsUi.articlesTitle || "СТАТТІ",
        "download-group-title"
      ));
      subgroups.className = "download-subgroups";

      filteredArticleGroups.forEach((group) => {
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        const body = document.createElement("div");

        details.className = "download-subgroup";
        if (words.length) {
          details.open = true;
        }
        summary.appendChild(createTextElement(
          "span",
          getLocalizedValue(group.title, downloadsUi.subgroupFallback || "РОЗДІЛ"),
          "download-subgroup-title"
        ));
        summary.appendChild(createTextElement("span", "", "download-subgroup-toggle"));
        body.className = "download-subgroup-body";
        renderGroupFiles(body, group.files, {
          category: group.category || "",
          searchQuery: query,
          topic: activeTopic
        });

        details.appendChild(summary);
        details.appendChild(body);
        subgroups.appendChild(details);
      });

      if (!filteredArticleGroups.length) {
        subgroups.appendChild(createEmptyMessage(
          words.length || activeTopic !== "all"
            ? downloadsUi.searchSectionEmpty || downloadsUi.searchEmpty || "Файлів за цим запитом зараз не знайдено."
            : downloadsUi.empty || "Файли тимчасово відсутні.",
          "download-group-empty"
        ));
      }

      articlesSection.appendChild(subgroups);
      groupsWrap.appendChild(articlesSection);
      container.appendChild(groupsWrap);
    }

    function renderList(selector, files) {
      if (!Array.isArray(files)) {
        return;
      }

      document.querySelectorAll(selector).forEach((element) => {
        element.textContent = "";
        element.appendChild(createFileList(files.filter((file) => isSafeUrl(getFileHref(file)))));
      });
    }

    function renderGroups(selector, groups, nextSearchIndex = null) {
      if (!groups || typeof groups !== "object") {
        return;
      }

      currentSearchIndex = normalizeSearchIndex(nextSearchIndex);
      window.SiteDownloadsSearchIndex = currentSearchIndex;

      document.querySelectorAll(selector).forEach((element) => {
        const results = document.createElement("div");
        const filters = document.createElement("div");
        const state = {
          query: getInitialDownloadsQuery(),
          topic: getInitialDownloadsTopic()
        };
        function renderCurrentGroups() {
          const availableFilters = getAvailableTopicFilters(groups);
          const hasActiveTopic = availableFilters.some((filter) => filter.topic === state.topic);
          if (!hasActiveTopic) {
            state.topic = "all";
          }

          filters.textContent = "";
          filters.appendChild(createTopicFilters(groups, state.topic, (topic) => {
            state.topic = topic || "all";
            renderCurrentGroups();
          }));
          renderGroupsInto(results, groups, state.query, state.topic);
        }
        const searchControls = createSearchControls((query) => {
          state.query = query;
          renderCurrentGroups();
        });
        const searchMount = document.querySelector("[data-downloads-search]");

        filters.className = "downloads-filter-controls";
        results.className = "downloads-search-results";

        element.textContent = "";
        if (searchMount) {
          searchMount.textContent = "";
          searchMount.appendChild(searchControls);
        } else {
          element.appendChild(searchControls);
        }
        element.appendChild(filters);
        element.appendChild(results);
        renderCurrentGroups();
      });
    }

    return {
      getFileType,
      renderGroups,
      renderList
    };
  }

  window.SiteDownloadsRenderer = {
    create: createDownloadsRenderer,
    getFileType: getDownloadFileType
  };
})();
