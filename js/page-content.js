(() => {
  const publicationTypeOrder = ["monograph", "article", "conference", "teaching", "other"];
  const allowedRichTextTags = new Set(["STRONG", "B", "EM", "I", "BR"]);
  const droppedRichTextTags = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED"]);
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

  function getSafeClassSuffix(value, fallback = "item") {
    return String(value || fallback).replace(/[^a-z0-9_-]/gi, "") || fallback;
  }

  function appendSafeRichText(parent, value = "") {
    const template = document.createElement("template");
    template.innerHTML = String(value);

    function appendNode(node, target) {
      if (node.nodeType === Node.TEXT_NODE) {
        target.appendChild(document.createTextNode(node.textContent || ""));
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      const tagName = node.tagName;
      if (droppedRichTextTags.has(tagName)) {
        return;
      }

      if (tagName === "BR") {
        target.appendChild(document.createElement("br"));
        return;
      }

      const nextTarget = allowedRichTextTags.has(tagName)
        ? document.createElement(tagName.toLowerCase())
        : target;

      Array.from(node.childNodes).forEach((child) => appendNode(child, nextTarget));

      if (nextTarget !== target) {
        target.appendChild(nextTarget);
      }
    }

    Array.from(template.content.childNodes).forEach((node) => appendNode(node, parent));
  }

  function createTextElement(tagName, text = "", className = "") {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    element.textContent = text;
    return element;
  }

  function replaceElementChildren(element, nodes) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }

    nodes.forEach((node) => {
      element.appendChild(node);
    });
  }

  function createDetailsArrow(openLabel, closeLabel) {
    const arrow = document.createElement("span");
    arrow.className = "about-details-arrow";
    arrow.setAttribute("aria-hidden", "true");

    const icon = document.createElement("span");
    icon.className = "about-details-arrow-icon";

    const label = document.createElement("span");
    label.className = "about-details-arrow-label";
    label.dataset.openLabel = openLabel;
    label.dataset.closeLabel = closeLabel;
    label.textContent = openLabel;

    arrow.appendChild(icon);
    arrow.appendChild(label);
    return arrow;
  }

  function updateImage(selector, image, fallbackImage = null) {
    const source = image || fallbackImage;
    if (!source) {
      return;
    }

    document.querySelectorAll(selector).forEach((element) => {
      element.alt = source.alt || "";
      if (
        !setSafeUrlAttribute(element, "src", source.src) &&
        fallbackImage &&
        fallbackImage.src
      ) {
        setSafeUrlAttribute(element, "src", fallbackImage.src);
      }

      if (fallbackImage && fallbackImage.src) {
        element.onerror = () => {
          element.onerror = null;
          if (setSafeUrlAttribute(element, "src", fallbackImage.src)) {
            element.alt = fallbackImage.alt || source.alt || "";
          }
        };
      }
    });
  }

  function escapeHtml(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizePublicationItem(item) {
    if (typeof item === "string") {
      return { text: item, year: "", type: "other" };
    }

    if (!item || typeof item !== "object") {
      return null;
    }

    const text = item.text || item.item || "";
    if (!text) {
      return null;
    }

    return {
      text,
      year: item.year || "",
      type: item.type || "other",
      file: typeof item.file === "string" ? item.file : ""
    };
  }

  function getPublicationTypeLabel(type, labels = {}) {
    return labels[type] || labels.other || type || "";
  }

  function renderPublicationTools(paragraph, items) {
    const years = [...new Set(items.map((item) => item.year).filter(Boolean))]
      .sort((a, b) => Number(b) - Number(a));
    const types = [...new Set(items.map((item) => item.type).filter(Boolean))]
      .sort((a, b) => publicationTypeOrder.indexOf(a) - publicationTypeOrder.indexOf(b));
    const typeLabels = paragraph.typeLabels || {};

    const tools = document.createElement("div");
    tools.className = "about-publications-tools";
    tools.setAttribute("data-publication-tools", "");

    const searchLabel = document.createElement("label");
    searchLabel.className = "about-publications-field";
    searchLabel.appendChild(createTextElement("span", paragraph.searchLabel || "Пошук"));

    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.setAttribute("data-publication-search", "");
    searchInput.placeholder = paragraph.searchPlaceholder || "";
    searchInput.autocomplete = "off";
    searchLabel.appendChild(searchInput);

    const yearLabel = document.createElement("label");
    yearLabel.className = "about-publications-field";
    yearLabel.appendChild(createTextElement("span", paragraph.yearLabel || "Рік"));

    const yearSelect = document.createElement("select");
    yearSelect.setAttribute("data-publication-year", "");
    yearSelect.appendChild(new Option(paragraph.allYearsLabel || "Усі роки", ""));
    years.forEach((year) => {
      yearSelect.appendChild(new Option(year, year));
    });
    yearLabel.appendChild(yearSelect);

    const typeLabel = document.createElement("label");
    typeLabel.className = "about-publications-field";
    typeLabel.appendChild(createTextElement("span", paragraph.typeLabel || "Тип"));

    const typeSelect = document.createElement("select");
    typeSelect.setAttribute("data-publication-type", "");
    typeSelect.appendChild(new Option(paragraph.allTypesLabel || "Усі типи", ""));
    types.forEach((type) => {
      typeSelect.appendChild(new Option(getPublicationTypeLabel(type, typeLabels), type));
    });
    typeLabel.appendChild(typeSelect);

    tools.appendChild(searchLabel);
    tools.appendChild(yearLabel);
    tools.appendChild(typeLabel);
    return tools;
  }

  function createPublicationItem(paragraph, item) {
    const typeLabels = paragraph.typeLabels || {};
    const fileLabel =
      paragraph.fileLabel ||
      (window.SITE && window.SITE.currentLocale === "en" ? "Download file" : "Завантажити файл");
    const isEn = window.SITE && window.SITE.currentLocale === "en";
    const copyLabel = 
      (window.SITE && window.SITE.ui && window.SITE.ui.documentPreview && window.SITE.ui.documentPreview.copyCitation) || 
      (isEn ? "Copy" : "Копіювати");
    const copyAria = 
      (window.SITE && window.SITE.ui && window.SITE.ui.documentPreview && window.SITE.ui.documentPreview.copyCitationAria) || 
      (isEn ? "Copy citation" : "Скопіювати цитування");

    const typeLabel = getPublicationTypeLabel(item.type, typeLabels);
    const searchText = [item.text, item.year, item.type, typeLabel].filter(Boolean).join(" ");
    const listItem = document.createElement("li");
    listItem.setAttribute("data-publication-item", "");
    listItem.dataset.publicationYear = item.year || "";
    listItem.dataset.publicationType = item.type || "";
    listItem.dataset.publicationSearch = searchText.toLocaleLowerCase();

    const meta = document.createElement("span");
    meta.className = "about-publication-meta";

    const copyButton = document.createElement("button");
    copyButton.className = "about-publication-copy";
    copyButton.type = "button";
    copyButton.dataset.copyCitation = item.text || "";
    copyButton.setAttribute("aria-label", copyAria);
    copyButton.title = copyLabel;
    copyButton.innerHTML = `
      <svg class="copy-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="16" height="16">
        <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
      </svg>
      <svg class="check-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="16" height="16">
        <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
    `;
    meta.appendChild(copyButton);

    if (item.year) {
      const yearButton = document.createElement("button");
      yearButton.type = "button";
      yearButton.dataset.publicationFilterYear = item.year;
      yearButton.setAttribute("aria-label", `Filter publications by ${item.year}`);
      yearButton.textContent = item.year;
      meta.appendChild(yearButton);
    }

    if (typeLabel) {
      const typeButton = document.createElement("button");
      typeButton.type = "button";
      typeButton.dataset.publicationFilterType = item.type || "";
      typeButton.setAttribute("aria-label", `Filter publications by ${typeLabel}`);
      typeButton.textContent = typeLabel;
      meta.appendChild(typeButton);
    }

    const text = createTextElement("span", item.text || "", "about-publication-text");
    listItem.appendChild(meta);
    listItem.appendChild(text);

    if (item.file && isSafeUrl(item.file)) {
      const fileLink = createTextElement("a", fileLabel, "about-publication-file");
      setSafeUrlAttribute(fileLink, "href", item.file);
      fileLink.target = "_blank";
      fileLink.rel = "noopener noreferrer";
      listItem.appendChild(fileLink);
    }

    return listItem;
  }

  function renderParagraphs({
    selector,
    paragraphs,
    site = window.SITE || {}
  } = {}) {
    if (!Array.isArray(paragraphs)) {
      return;
    }

    const detailsUi = site.ui && site.ui.details ? site.ui.details : {};
    const defaultDetailsSummary = detailsUi.summary || "Деталі";
    const defaultExpandLabel = detailsUi.expand || "РОЗГОРНУТИ";
    const defaultCloseLabel = detailsUi.collapse || "ЗГОРНУТИ";

    function createDetailsParagraph(paragraph) {
      const publicationItems = Array.isArray(paragraph.items)
        ? paragraph.items.map(normalizePublicationItem).filter(Boolean)
        : [];
      const isPublicationList =
        paragraph.variant === "publications" && publicationItems.length;
      const details = document.createElement("details");
      details.className = `about-details${isPublicationList ? " about-details-publications" : ""}`;

      const summary = document.createElement("summary");
      summary.appendChild(
        createTextElement(
          "span",
          paragraph.summary || defaultDetailsSummary,
          "about-details-summary-text"
        )
      );
      summary.appendChild(createDetailsArrow(defaultExpandLabel, defaultCloseLabel));

      const body = document.createElement("div");
      body.className = "about-details-body";

      if (paragraph.description) {
        body.appendChild(
          createTextElement("p", paragraph.description, "about-details-description")
        );
      }

      if (isPublicationList) {
        body.appendChild(renderPublicationTools(paragraph, publicationItems));
      }

      const list = document.createElement("ol");
      list.className = `about-details-list${isPublicationList ? " about-publications-list" : ""}`;

      if (isPublicationList) {
        publicationItems.forEach((item) => list.appendChild(createPublicationItem(paragraph, item)));
      } else if (Array.isArray(paragraph.items)) {
        paragraph.items.forEach((item) => {
          const listItem = document.createElement("li");
          appendSafeRichText(listItem, item);
          list.appendChild(listItem);
        });
      }

      body.appendChild(list);

      if (isPublicationList) {
        const emptyMessage = createTextElement(
          "p",
          paragraph.emptyLabel || "Нічого не знайдено",
          "about-publications-empty"
        );
        emptyMessage.setAttribute("data-publication-empty", "");
        emptyMessage.hidden = true;
        body.appendChild(emptyMessage);
      }

      details.appendChild(summary);
      details.appendChild(body);
      return details;
    }

    function createContentDetailsParagraph(paragraph) {
      const summaryText =
        paragraph.summary ||
        detailsUi.contentSummary ||
        "Показано скорочену версію. Нижче можна прочитати повний текст.";
      const actionLabel =
        paragraph.actionLabel || detailsUi.contentAction || "Читати далі...";
      const closeLabel =
        paragraph.closeLabel || detailsUi.contentCollapse || "Згорнути";
      const details = document.createElement("details");
      details.className = "about-details about-details-content";

      const summary = document.createElement("summary");
      summary.appendChild(
        createTextElement("span", summaryText, "about-details-summary-text")
      );
      summary.appendChild(createDetailsArrow(actionLabel, closeLabel));

      const body = document.createElement("div");
      body.className = "about-details-body";

      if (paragraph.description) {
        body.appendChild(
          createTextElement("p", paragraph.description, "about-details-description")
        );
      }

      const copy = document.createElement("div");
      copy.className = "about-details-copy";
      if (Array.isArray(paragraph.paragraphs)) {
        paragraph.paragraphs.forEach((item) => {
          const itemParagraph = document.createElement("p");
          appendSafeRichText(itemParagraph, item);
          copy.appendChild(itemParagraph);
        });
      }
      body.appendChild(copy);

      details.appendChild(summary);
      details.appendChild(body);
      return details;
    }

    function createParagraphNode(paragraph) {
      if (typeof paragraph === "string") {
        const element = document.createElement("p");
        appendSafeRichText(element, paragraph);
        return element;
      }

      if (paragraph && paragraph.type === "details") {
        return createDetailsParagraph(paragraph);
      }

      if (paragraph && paragraph.type === "content-details") {
        return createContentDetailsParagraph(paragraph);
      }

      return null;
    }

    document.querySelectorAll(selector).forEach((element) => {
      const nodes = paragraphs.map(createParagraphNode).filter(Boolean);
      replaceElementChildren(element, nodes);
    });
  }

  function initPublicationFilters(details) {
    if (!details.classList.contains("about-details-publications") || details.dataset.publicationsReady === "true") {
      return;
    }

    const searchInput = details.querySelector("[data-publication-search]");
    const yearSelect = details.querySelector("[data-publication-year]");
    const typeSelect = details.querySelector("[data-publication-type]");
    const items = Array.from(details.querySelectorAll("[data-publication-item]"));
    const emptyMessage = details.querySelector("[data-publication-empty]");

    if (!items.length) {
      return;
    }

    const scrollToPublicationTools = () => {
      const target = details.querySelector("[data-publication-tools]") || details;
      const headerOffsetValue = getComputedStyle(document.documentElement)
        .getPropertyValue("--site-header-offset")
        .trim();
      const headerOffset = Number.parseFloat(headerOffsetValue) || 0;
      const reducedMotionQuery = window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
      const prefersReducedMotion = reducedMotionQuery && reducedMotionQuery.matches;
      const top = target.getBoundingClientRect().top + window.scrollY - headerOffset - 12;

      window.requestAnimationFrame(() => {
        window.scrollTo({
          top: Math.max(0, top),
          behavior: prefersReducedMotion ? "auto" : "smooth"
        });
      });
    };

    const applyFilters = () => {
      const query = (searchInput && searchInput.value ? searchInput.value : "")
        .trim()
        .toLocaleLowerCase();
      const year = yearSelect && yearSelect.value ? yearSelect.value : "";
      const type = typeSelect && typeSelect.value ? typeSelect.value : "";
      let visibleCount = 0;

      items.forEach((item) => {
        const matchesQuery =
          !query ||
          (item.dataset.publicationSearch && item.dataset.publicationSearch.indexOf(query) !== -1);
        const matchesYear = !year || item.dataset.publicationYear === year;
        const matchesType = !type || item.dataset.publicationType === type;
        const isVisible = matchesQuery && matchesYear && matchesType;

        item.hidden = !isVisible;
        if (isVisible) {
          visibleCount += 1;
        }
      });

      if (emptyMessage) {
        emptyMessage.hidden = visibleCount > 0;
      }

      window.requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent("site:layout-shift"));
      });
    };

    if (searchInput) {
      searchInput.addEventListener("input", applyFilters);
    }
    if (yearSelect) {
      yearSelect.addEventListener("change", () => {
        applyFilters();
        scrollToPublicationTools();
      });
    }
    if (typeSelect) {
      typeSelect.addEventListener("change", () => {
        applyFilters();
        scrollToPublicationTools();
      });
    }
    details.addEventListener("click", (event) => {
      const yearButton = event.target.closest("[data-publication-filter-year]");
      const typeButton = event.target.closest("[data-publication-filter-type]");

      if (!yearButton && !typeButton) {
        return;
      }

      event.preventDefault();

      if (searchInput) {
        searchInput.value = "";
      }

      if (yearButton && yearSelect) {
        yearSelect.value = yearButton.dataset.publicationFilterYear || "";
        if (typeSelect) {
          typeSelect.value = "";
        }
      }

      if (typeButton && typeSelect) {
        typeSelect.value = typeButton.dataset.publicationFilterType || "";
        if (yearSelect) {
          yearSelect.value = "";
        }
      }

      applyFilters();
      scrollToPublicationTools();
    });
    details.dataset.publicationsReady = "true";
  }

  function initDetailsInteractions() {
    document.querySelectorAll(".about-details").forEach((details) => {
      initPublicationFilters(details);

      if (details.dataset.enhanced === "true") {
        return;
      }

      details.dataset.enhanced = "true";
      details.addEventListener("toggle", () => {
        window.dispatchEvent(new CustomEvent("site:layout-shift"));

        if (details.open) {
          return;
        }

        window.requestAnimationFrame(() => {
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        });
      });
    });
  }

  function renderHomeContent({
    home = {},
    site = window.SITE || {},
    setText = () => {},
    initHomeAboutLightbox = () => {}
  } = {}) {
    setText("[data-home-about-heading]", home.aboutHeading);
    setText("[data-home-activities-heading]", home.activitiesHeading);
    updateImage("[data-home-about-image]", home.aboutImage);
    initHomeAboutLightbox(home.aboutImage);
    renderParagraphs({
      selector: "[data-home-about-paragraphs]",
      paragraphs: home.aboutParagraphs,
      site
    });
  }

  function renderActivitySummaries({
    site = window.SITE || {},
    setText = () => {}
  } = {}) {
    Object.entries(site.activities || {}).forEach(([id, activity]) => {
      setText(`[data-activity-name='${id}']`, activity.name);
      setText(`[data-activity-card-description='${id}']`, activity.cardDescription);
    });
  }

  function renderActivityResearchLinks({
    activity,
    activityId,
    pageType,
    site = window.SITE || {},
    escapeHtml = (value) => String(value),
    getSocialIconMarkup = () => ""
  } = {}) {
    if (pageType !== "activity") {
      return;
    }

    const aboutPhoto = document.querySelector(".about-photo");
    if (!aboutPhoto) {
      return;
    }

    const previousLinks = aboutPhoto.querySelector(".about-photo-links");
    if (previousLinks) {
      previousLinks.remove();
    }

    const researchLinks =
      activityId === "1" && site.meta && Array.isArray(site.meta.headerLinks)
        ? site.meta.headerLinks.filter(
            (item) =>
              item.id === "webofscience" || item.id === "orcid" || item.id === "googlescholar"
          )
        : [];
    const activityLinks = Array.isArray(activity.links) ? activity.links : [];
    const activeLinks = [...researchLinks, ...activityLinks].filter((item) => item.href && isSafeUrl(item.href));

    if (!activeLinks.length) {
      return;
    }

    const linksWrap = document.createElement("div");
    linksWrap.className = "about-photo-links";

    activeLinks.forEach((item) => {
      const link = document.createElement("a");
      link.className = `about-photo-link is-${getSafeClassSuffix(item.id)}`;
      setSafeUrlAttribute(link, "href", item.href);
      link.target = "_blank";
      link.rel = "noreferrer";
      link.setAttribute("aria-label", item.label || "");
      link.title = item.label || "";
      link.insertAdjacentHTML("beforeend", getSocialIconMarkup(item.id, "about-photo-link-icon"));
      link.appendChild(createTextElement("span", item.label || ""));
      linksWrap.appendChild(link);
    });

    aboutPhoto.appendChild(linksWrap);
  }

  function applyGlobalContent({
    site = window.SITE || {},
    pageType,
    setText = () => {},
    initHomeAboutLightbox = () => {},
  } = {}) {
    document.documentElement.lang = site.currentLocale || site.defaultLocale || "uk";
    if (pageType === "home") {
      document.title = `${site.meta.homeTitle} — ${site.meta.homeSubtitle}`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", site.meta.siteDescription || "");
    }

    setText("[data-site-title]", site.meta.siteTitle);
    setText("[data-site-subtitle]", site.meta.homeSubtitle);
    setText(
      "[data-activity-card-link]",
      site.ui && site.ui.buttons && site.ui.buttons.open ? site.ui.buttons.open : "Перейти"
    );

    const fallbackHome = site.home || {};
    renderHomeContent({
      home: fallbackHome,
      site,
      setText,
      initHomeAboutLightbox
    });
    if (window.SiteLegacyDebugLog) {
      window.SiteLegacyDebugLog("home content rendered from config fallback");
    }

    if (pageType === "home") {
      const contentLocale = site.currentLocale || site.defaultLocale || "uk";
      const loadHomeContent =
        window.SiteContentLoader && window.SiteContentLoader.loadHomeContent;

      if (typeof loadHomeContent === "function") {
        loadHomeContent({
          locale: contentLocale,
          fallbackHome
        }).then((homeContent) => {
          const activeLocale = site.currentLocale || site.defaultLocale || "uk";
          if (activeLocale !== contentLocale) {
            return;
          }

          site.home = homeContent;
          renderHomeContent({
            home: homeContent,
            site,
            setText,
            initHomeAboutLightbox
          });
          if (window.SiteLegacyDebugLog) {
            window.SiteLegacyDebugLog("home content rendered from JSON or JSON fallback");
          }
          initDetailsInteractions();
        });
      }
    }

    const activitySections = site.ui && site.ui.activitySections ? site.ui.activitySections : {};
    setText("[data-activity-videos-heading]", activitySections.videos || "Відео");
    setText("[data-activity-photos-heading]", activitySections.photos || "Фото");
    setText("[data-activity-files-heading]", activitySections.files || "Файли");
    renderActivitySummaries({ site, setText });

    const footerElement = document.querySelector("[data-footer]");
    const buildVersion = site.meta.buildVersion
      ? site.meta.buildVersion.startsWith("v.")
        ? site.meta.buildVersion
        : `v.${site.meta.buildVersion}`
      : "";
    const footerBuild = [buildVersion, site.meta.buildDate].filter(Boolean).join(".");
    const authorName = site.meta.authorRealName || "Віталій Ігнатьєв";
    const developerName = site.meta.siteDeveloperName || "";
    const developerText = developerName ? ` · сайт: ${developerName}` : "";
    const footerOwner = [site.meta.year ? `© ${site.meta.year}` : "", authorName]
      .filter(Boolean)
      .join(" ") + developerText;

    if (footerElement) {
      const owner = createTextElement("span", footerOwner, "footer-owner");
      const nodes = [owner];

      if (footerBuild) {
        const build = createTextElement("span", footerBuild, "footer-build");
        const separator = createTextElement("span", ":", "");
        separator.setAttribute("data-footer-counter-separator", "");
        separator.hidden = true;
        const counter = document.createElement("span");
        counter.className = "footer-counter-value";
        counter.setAttribute("data-footer-counter-value", "");
        counter.hidden = true;
        build.appendChild(separator);
        build.appendChild(counter);
        nodes.push(build);
      }

      replaceElementChildren(footerElement, nodes);
    }
  }

  function applyActivityChrome({
    site = window.SITE || {},
    pageType,
    activityId,
    homeFallbackImage,
    setText = () => {},
    initActivityHeroLightbox = () => {}
  } = {}) {
    if (pageType !== "activity" || !activityId) {
      return null;
    }

    const activity = site.activities && site.activities[activityId];
    if (!activity) {
      return null;
    }

    document.title = activity.name;
    setText("[data-activity-page-title]", activity.name);
    setText("[data-activity-page-heading]", activity.name);

    const heroImage = {
      src: `files/media/activity${activityId}/hero.jpg`,
      alt: activity.heroImage && activity.heroImage.alt ? activity.heroImage.alt : activity.name
    };
    updateImage("[data-activity-hero-image]", heroImage, homeFallbackImage);
    initActivityHeroLightbox(heroImage);
    return activity;
  }

  function applyActivityPage({
    site = window.SITE || {},
    pageType,
    activityId,
    homeFallbackImage,
    setText = () => {},
    escapeHtml = (value) => String(value),
    getSocialIconMarkup = () => "",
    initActivityHeroLightbox = () => {},
    loadActivityGallery = () => {},
    loadFileList = () => {},
    loadYoutubeFeed = () => {}
  } = {}) {
    if (pageType !== "activity" || !activityId) {
      return;
    }

    const activity = site.activities && site.activities[activityId];
    if (!activity) {
      return;
    }

    applyActivityChrome({
      site,
      pageType,
      activityId,
      homeFallbackImage,
      setText,
      initActivityHeroLightbox
    });

    renderParagraphs({
      selector: "[data-activity-paragraphs]",
      paragraphs: activity.pageDescription,
      site
    });
    renderActivityResearchLinks({
      activity,
      activityId,
      pageType,
      site,
      escapeHtml,
      getSocialIconMarkup
    });
    initDetailsInteractions();
    loadActivityGallery(activityId);

    if (activityId === "1") {
      loadYoutubeFeed();
    }

    if (activityId === "2") {
      loadFileList("files/activity2/files.json", "[data-activity-files]", []);
    }
  }

  function renderDownloadsPageChrome({
    site = window.SITE || {},
    pageType,
    setText = () => {}
  } = {}) {
    if (pageType !== "downloads") {
      return;
    }

    document.title = site.downloads.pageTitle;
    setText("[data-downloads-title]", site.downloads.pageTitle);
    setText("[data-downloads-heading]", site.downloads.heading);
    const downloadsIntro = document.querySelector("[data-downloads-intro]");
    if (downloadsIntro) {
      const intro = site.downloads.intro || "";
      downloadsIntro.textContent = intro;
      downloadsIntro.hidden = !intro.trim();
    }
  }

  function applyDownloadsPage({
    site = window.SITE || {},
    pageType,
    setText = () => {},
    loadDownloadsGroups = () => {}
  } = {}) {
    if (pageType !== "downloads") {
      return;
    }

    renderDownloadsPageChrome({ site, pageType, setText });
    loadDownloadsGroups(
      "files/downloads/files.json",
      "[data-downloads-groups]",
      site.downloads.groups || null,
      "files/downloads/search-index.json"
    );
  }

  function applyContactPage({
    pageType,
    site = window.SITE || {},
    setText = () => {},
    escapeHtml = (value) => String(value),
    getSocialIconMarkup = () => ""
  } = {}) {
    if (window.SiteContactPage) {
      window.SiteContactPage.apply({
        pageType,
        site,
        setText,
        escapeHtml,
        getSocialIconMarkup
      });
    }
  }

  function applyMenuLabels({ site = window.SITE || {} } = {}) {
    function setMenuItemLabel(selector, label, mobileLabel = label) {
      if (label == null) {
        return;
      }

      document.querySelectorAll(selector).forEach((element) => {
        element.textContent = label;
        element.setAttribute("aria-label", label);
        element.setAttribute("title", label);
        element.setAttribute("data-mobile-label", mobileLabel || label);
      });
    }

    const mobileMenu = site.menu && site.menu.mobile ? site.menu.mobile : {};

    setMenuItemLabel("[data-menu-home]", site.menu.home, mobileMenu.home);
    setMenuItemLabel("[data-menu-downloads]", site.menu.downloads, mobileMenu.downloads);
    setMenuItemLabel("[data-menu-contact]", site.menu.contact, mobileMenu.contact);

    Object.entries(site.activities).forEach(([id, activity]) => {
      setMenuItemLabel(
        `[data-menu-activity='${id}']`,
        activity.name,
        mobileMenu[`activity${id}`]
      );
    });
  }

  function applyActiveMenuState({ pageType, activityId } = {}) {
    document
      .querySelectorAll("nav a[aria-current='page']")
      .forEach((element) => element.removeAttribute("aria-current"));

    let selector = "";

    if (pageType === "home") {
      selector = "[data-menu-home]";
    } else if (pageType === "downloads") {
      selector = "[data-menu-downloads]";
    } else if (pageType === "contact") {
      selector = "[data-menu-contact]";
    } else if (pageType === "activity" && activityId) {
      selector = `[data-menu-activity='${activityId}']`;
    }

    if (!selector) {
      return;
    }

    const activeItem = document.querySelector(selector);
    if (activeItem) {
      activeItem.setAttribute("aria-current", "page");
    }
  }

  window.SitePageContent = {
    applyActiveMenuState,
    applyActivityChrome,
    applyActivityPage,
    applyContactPage,
    applyDownloadsPage,
    applyGlobalContent,
    applyMenuLabels,
    initDetailsInteractions,
    renderDownloadsPageChrome,
    renderActivitySummaries,
    renderActivityResearchLinks,
    renderParagraphs,
    updateImage
  };
})();
