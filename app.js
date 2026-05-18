document.addEventListener("DOMContentLoaded", () => {
  const pageType = document.body.dataset.page;
  const activityId = document.body.dataset.activityId;
  const themeAssets = {
    light: "files/media/logo-light.png",
    dark: "files/media/logo-dark.png"
  };
  const homeFallbackImage = SITE?.home?.aboutImage || {
    src: "files/media/about-me-photo.jpg",
    alt: "Фото"
  };
  let currentActivityLightboxItems = [];
  let currentActivityGalleryPromise = null;

  function setText(selector, value) {
    if (value == null) {
      return;
    }

    document.querySelectorAll(selector).forEach((element) => {
      element.textContent = value;
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getLocalizedValue(value, fallback = "") {
    if (value == null) {
      return fallback;
    }

    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "object" && !Array.isArray(value)) {
      const locale = SITE.currentLocale || SITE.defaultLocale || "uk";
      const defaultLocale = SITE.defaultLocale || "uk";
      const localizedValue =
        value[locale] ??
        value[defaultLocale] ??
        Object.values(value).find((item) => typeof item === "string");
      return typeof localizedValue === "string" ? localizedValue : fallback;
    }

    return fallback;
  }

  function renderParagraphs(selector, paragraphs) {
    if (!Array.isArray(paragraphs)) {
      return;
    }

    const detailsUi = SITE.ui?.details || {};
    const defaultDetailsSummary = detailsUi.summary || "Деталі";
    const defaultExpandLabel = detailsUi.expand || "РОЗГОРНУТИ";
    const defaultCloseLabel = detailsUi.collapse || "ЗГОРНУТИ";

    document.querySelectorAll(selector).forEach((element) => {
      element.innerHTML = paragraphs
        .map((paragraph) => {
          if (typeof paragraph === "string") {
            return `<p>${paragraph}</p>`;
          }

          if (paragraph?.type === "details") {
            const items = Array.isArray(paragraph.items)
              ? paragraph.items.map((item) => `<li>${item}</li>`).join("")
              : "";
            const description = paragraph.description
              ? `<p class="about-details-description">${paragraph.description}</p>`
              : "";

            return `
              <details class="about-details">
                <summary>
                  <span class="about-details-summary-text">${paragraph.summary || defaultDetailsSummary}</span>
                  <span class="about-details-arrow" aria-hidden="true">
                    <span class="about-details-arrow-icon"></span>
                    <span class="about-details-arrow-label" data-open-label="${defaultExpandLabel}" data-close-label="${defaultCloseLabel}">${defaultExpandLabel}</span>
                  </span>
                </summary>
                <div class="about-details-body">
                  ${description}
                  <ol class="about-details-list">${items}</ol>
                </div>
              </details>
            `;
          }

          if (paragraph?.type === "content-details") {
            const description = paragraph.description
              ? `<p class="about-details-description">${paragraph.description}</p>`
              : "";
            const contentParagraphs = Array.isArray(paragraph.paragraphs)
              ? paragraph.paragraphs.map((item) => `<p>${item}</p>`).join("")
              : "";
            const summaryText =
              paragraph.summary ||
              detailsUi.contentSummary ||
              "Показано скорочену версію. Нижче можна прочитати повний текст.";
            const actionLabel =
              paragraph.actionLabel || detailsUi.contentAction || "Читати далі...";
            const closeLabel =
              paragraph.closeLabel || detailsUi.contentCollapse || "Згорнути";

            return `
              <details class="about-details about-details-content">
                <summary>
                  <span class="about-details-summary-text">${summaryText}</span>
                  <span class="about-details-arrow" aria-hidden="true">
                    <span class="about-details-arrow-icon"></span>
                    <span class="about-details-arrow-label" data-open-label="${actionLabel}" data-close-label="${closeLabel}">${actionLabel}</span>
                  </span>
                </summary>
                <div class="about-details-body">
                  ${description}
                  <div class="about-details-copy">${contentParagraphs}</div>
                </div>
              </details>
            `;
          }

          return "";
        })
        .join("");
    });
  }

  function initDetailsInteractions() {
    document.querySelectorAll(".about-details").forEach((details) => {
      if (details.dataset.enhanced === "true") {
        return;
      }

      details.dataset.enhanced = "true";
      details.addEventListener("toggle", () => {
        if (details.open) {
          return;
        }

        window.requestAnimationFrame(() => {
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        });
      });
    });
  }

  function updateImage(selector, image, fallbackImage = null) {
    const source = image || fallbackImage;
    if (!source) {
      return;
    }

    document.querySelectorAll(selector).forEach((element) => {
      element.alt = source.alt || "";
      element.src = source.src;

      if (fallbackImage?.src) {
        element.onerror = () => {
          element.onerror = null;
          element.src = fallbackImage.src;
          element.alt = fallbackImage.alt || source.alt || "";
        };
      }
    });
  }

  function ensureLightbox() {
    return window.SiteGalleryLightbox?.ensure({
      site: SITE
    });
  }

  function ensureDocumentLightbox() {
    return window.SiteDocumentLightbox?.ensure({
      site: SITE,
      getLocalizedValue,
      getDownloadFileType
    });
  }

  function applyPortraitState(container) {
    container.querySelectorAll("img").forEach((image) => {
      const markOrientation = () => {
        const isPortrait = image.naturalHeight > image.naturalWidth;
        image.closest(".gallery-item")?.classList.toggle("is-portrait", isPortrait);
      };

      if (image.complete) {
        markOrientation();
      } else {
        image.addEventListener("load", markOrientation, { once: true });
      }
    });
  }

  function renderGallery(selector, images) {
    if (!Array.isArray(images)) {
      return;
    }

    document.querySelectorAll(selector).forEach((element) => {
      const count = images.length;
      if (!count) {
        element.style.removeProperty("--gallery-columns");
        element.innerHTML = `<p class="gallery-empty">${escapeHtml(
          SITE.ui?.gallery?.empty || "Фото тимчасово відсутні."
        )}</p>`;
        return;
      }

      const columns = Math.min(Math.max(count, 1), 5);
      element.style.setProperty("--gallery-columns", String(columns));
      element.innerHTML = images
        .map(
          (image, index) => `
            <button class="gallery-item" type="button" data-gallery-index="${index}">
              <img src="${image.src}" alt="${image.alt || ""}" loading="lazy">
            </button>
          `
        )
        .join("");

      const lightbox = ensureLightbox();
      element.querySelectorAll("[data-gallery-index]").forEach((button) => {
        button.addEventListener("click", () => {
          lightbox?.showItems(images, Number(button.dataset.galleryIndex || "0"));
        });
      });

      applyPortraitState(element);
    });
  }

  function initActivityHeroLightbox(image) {
    const hero = document.querySelector("[data-activity-hero-image]");
    if (!hero || !image?.src) {
      return;
    }

    const lightbox = ensureLightbox();
    const showHero = () => {
      const heroItem = {
        src: hero.currentSrc || hero.src || image.src,
        alt: hero.alt || image.alt || ""
      };
      const galleryItems = currentActivityLightboxItems.filter((item) => item?.src !== heroItem.src);

      lightbox?.showItems([
        heroItem,
        ...galleryItems
      ], 0);
    };
    const openHero = () => {
      if (currentActivityGalleryPromise) {
        currentActivityGalleryPromise.finally(showHero);
        return;
      }

      showHero();
    };

    currentActivityLightboxItems = [
      {
        src: image.src,
        alt: image.alt || ""
      },
      ...currentActivityLightboxItems.filter((item) => item?.src !== image.src)
    ];

    hero.classList.add("is-clickable");
    hero.tabIndex = 0;
    hero.setAttribute("role", "button");
    hero.setAttribute("aria-label", SITE.ui?.gallery?.open || image.alt || "Відкрити фото");

    if (hero.dataset.heroLightboxBound === "true") {
      return;
    }

    hero.addEventListener("click", openHero);
    hero.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      openHero();
    });
    hero.dataset.heroLightboxBound = "true";
  }

  function initHomeAboutLightbox(image) {
    const aboutImage = document.querySelector("[data-home-about-image]");
    if (pageType !== "home" || !aboutImage || !image?.src) {
      return;
    }

    const lightbox = ensureLightbox();
    const openImage = () => {
      lightbox?.showItems([
        {
          src: aboutImage.currentSrc || aboutImage.src || image.src,
          alt: aboutImage.alt || image.alt || ""
        }
      ], 0);
    };

    aboutImage.classList.add("is-clickable");
    aboutImage.tabIndex = 0;
    aboutImage.setAttribute("role", "button");
    aboutImage.setAttribute("aria-label", SITE.ui?.gallery?.open || image.alt || "Відкрити фото");

    if (aboutImage.dataset.homeLightboxBound === "true") {
      return;
    }

    aboutImage.addEventListener("click", openImage);
    aboutImage.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      openImage();
    });
    aboutImage.dataset.homeLightboxBound = "true";
  }

  function setActivityLightboxGalleryItems(images) {
    if (pageType !== "activity") {
      return;
    }

    const hero = document.querySelector("[data-activity-hero-image]");
    const heroItem = hero
      ? {
          src: hero.currentSrc || hero.src || "",
          alt: hero.alt || ""
        }
      : null;
    const galleryItems = Array.isArray(images) ? images.filter((item) => item?.src) : [];

    currentActivityLightboxItems = [
      ...(heroItem?.src ? [heroItem] : []),
      ...galleryItems.filter((item) => item.src !== heroItem?.src)
    ];
  }

  function getDownloadsRenderer() {
    return window.SiteDownloadsRenderer?.create({
      site: SITE,
      getLocalizedValue,
      escapeHtml
    });
  }

  function renderDownloads(selector, files) {
    getDownloadsRenderer()?.renderList(selector, files);
  }

  function getDownloadFileType(file = {}) {
    return getDownloadsRenderer()?.getFileType(file) || "FILE";
  }

  function renderDownloadsGroups(selector, groups) {
    getDownloadsRenderer()?.renderGroups(selector, groups);
  }

  function fetchJson(url) {
    return fetch(url).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load ${url}`);
      }

      return response.json();
    });
  }

  function normalizeJsonList(payload, keys = []) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && typeof payload === "object") {
      const matchedKey = keys.find((key) => Array.isArray(payload[key]));
      return matchedKey ? payload[matchedKey] : [];
    }

    return [];
  }

  function filterAvailableImages(images) {
    if (!Array.isArray(images) || !images.length) {
      return Promise.resolve([]);
    }

    return Promise.all(
      images.map(
        (image) =>
          new Promise((resolve) => {
            if (!image?.src) {
              resolve(null);
              return;
            }

            const probe = new Image();
            probe.onload = () => resolve(image);
            probe.onerror = () => resolve(null);
            probe.src = image.src;
          })
      )
    ).then((resolvedImages) => resolvedImages.filter(Boolean));
  }

  function loadActivityGallery(id) {
    const selector = "[data-activity-gallery]";

    currentActivityGalleryPromise = fetchJson(`files/media/activity${id}/photos.json`)
      .then((images) => {
        const galleryImages = normalizeJsonList(images, ["images", "photos"]);
        return filterAvailableImages(galleryImages).then((availableImages) => {
          setActivityLightboxGalleryItems(availableImages);
          renderGallery(selector, availableImages);
          return availableImages;
        });
      })
      .catch(() => {
        setActivityLightboxGalleryItems([]);
        renderGallery(selector, []);
        return [];
      })
      .finally(() => {
        currentActivityGalleryPromise = null;
      });
  }

  function loadFileList(path, selector, fallbackFiles = []) {
    fetchJson(path)
      .then((files) => {
        const fileList = normalizeJsonList(files, ["files", "items"]);
        renderDownloads(selector, fileList.length ? fileList : fallbackFiles);
      })
      .catch(() => {
        renderDownloads(selector, fallbackFiles);
      });
  }

  function loadDownloadsGroups(path, selector, fallbackGroups = null) {
    fetchJson(path)
      .then((groups) => {
        if (groups && typeof groups === "object" && !Array.isArray(groups)) {
          renderDownloadsGroups(selector, groups);
          return;
        }

        if (fallbackGroups && typeof fallbackGroups === "object") {
          renderDownloadsGroups(selector, fallbackGroups);
        }
      })
      .catch(() => {
        if (fallbackGroups && typeof fallbackGroups === "object") {
          renderDownloadsGroups(selector, fallbackGroups);
        }
      });
  }

  function initDownloadPreviewTriggers() {
    const lightbox = ensureDocumentLightbox();

    if (document.body.dataset.downloadPreviewReady === "true") {
      return;
    }

    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-download-preview]");
      if (!trigger) {
        return;
      }

      event.preventDefault();
      lightbox?.showPreview({
        href: trigger.getAttribute("data-preview-href") || "",
        label: trigger.getAttribute("data-preview-label") || "",
        type: trigger.getAttribute("data-preview-type") || ""
      });
    });

    document.body.dataset.downloadPreviewReady = "true";
  }

  function loadYoutubeFeed() {
    window.SiteYoutubeFeed?.load({
      site: SITE,
      selector: "[data-activity-videos]",
      getLocalizedValue,
      escapeHtml
    });
  }

  function ensureHeaderControls() {
    const header = document.querySelector(".site-header");
    if (!header) {
      return null;
    }

    let controls = header.querySelector(".site-header-controls");
    if (!controls) {
      controls = document.createElement("div");
      controls.className = "site-header-controls";
      header.appendChild(controls);
    }

    return controls;
  }

  function initLanguageToggle() {
    const controls = ensureHeaderControls();
    if (!controls) {
      return;
    }

    let toggle = controls.querySelector("[data-language-toggle]");
    if (!toggle) {
      toggle = document.createElement("div");
      toggle.className = "language-toggle";
      toggle.setAttribute("data-language-toggle", "");
      toggle.innerHTML = `
        <span class="language-toggle-label" data-language-toggle-label></span>
        <div class="language-toggle-options" role="group" data-language-toggle-options></div>
      `;
      controls.appendChild(toggle);
    }

    const label = toggle.querySelector("[data-language-toggle-label]");
    const optionsWrap = toggle.querySelector("[data-language-toggle-options]");
    const languageUi = SITE.ui?.language || {};

    if (label) {
      const currentLocaleCode =
        SITE.currentLocale === "uk"
          ? "УКР"
          : SITE.currentLocale === "en"
            ? "EN"
            : SITE.currentLocale?.toUpperCase();
      label.textContent = `${languageUi.label || "Мова"}: ${currentLocaleCode || ""}`;
    }

    if (optionsWrap) {
      optionsWrap.setAttribute("aria-label", languageUi.toggle || "Перемкнути мову");
      const supportedLocales = Array.isArray(SITE.supportedLocales)
        ? SITE.supportedLocales
        : [SITE.defaultLocale || "uk"];

      optionsWrap.innerHTML = supportedLocales
        .map((locale) => {
          const optionLabel = getLocalizedValue(languageUi.options?.[locale], locale.toUpperCase()) ||
            locale.toUpperCase();
          const localeName = getLocalizedValue(languageUi.names?.[locale], locale.toUpperCase()) ||
            locale.toUpperCase();
          const localeFlagClass = locale === "uk" ? "is-uk" : locale === "en" ? "is-en" : "";
          const isActive = locale === SITE.currentLocale;

          return `
            <button
              class="language-toggle-option${isActive ? " is-active" : ""}"
              type="button"
              data-language-option="${locale}"
              aria-pressed="${isActive ? "true" : "false"}"
              aria-label="${escapeHtml(localeName)}"
              title="${escapeHtml(localeName)}"
            >
              ${localeFlagClass ? `<span class="language-toggle-flag ${localeFlagClass}" aria-hidden="true"></span>` : `<span class="language-toggle-code">${escapeHtml(optionLabel)}</span>`}
            </button>
          `;
        })
        .join("");
    }

    if (toggle.dataset.bound === "true") {
      return;
    }

    toggle.addEventListener("click", (event) => {
      const button = event.target.closest("[data-language-option]");
      if (!button) {
        return;
      }

      const nextLocale = button.getAttribute("data-language-option") || SITE.defaultLocale || "uk";
      if (nextLocale === SITE.currentLocale) {
        return;
      }

      applySiteLocale(nextLocale);
      applyAllContent();
    });

    toggle.dataset.bound = "true";
  }

  function initThemeToggle() {
    const controls = ensureHeaderControls();
    if (!controls) {
      return;
    }

    const savedTheme = localStorage.getItem("site-theme");
    const theme = savedTheme || document.documentElement.getAttribute("data-theme") || "light";
    document.documentElement.setAttribute("data-theme", theme);

    let toggle = controls.querySelector(".theme-toggle");
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "theme-toggle";
      toggle.innerHTML = `
        <span class="theme-toggle-label" data-theme-toggle-label></span>
        <span class="theme-toggle-track">
          <span class="theme-toggle-track-icon is-sun" aria-hidden="true"></span>
          <span class="theme-toggle-thumb"></span>
          <span class="theme-toggle-track-icon is-moon" aria-hidden="true"></span>
        </span>
      `;
      controls.appendChild(toggle);
    }

    const toggleLabel = toggle.querySelector("[data-theme-toggle-label]");

    function updateThemeToggleLabel(currentTheme) {
      const themeUi = SITE.ui?.theme || {};
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      const currentThemeIcon = currentTheme === "dark" ? "🌙" : "☀️";
      const currentThemeText =
        currentTheme === "dark"
          ? themeUi.nextDark || "Темна тема"
          : themeUi.nextLight || "Світла тема";
      toggleLabel.innerHTML = `
        <span class="theme-toggle-icon" aria-hidden="true">${currentThemeIcon}</span>
        <span class="theme-toggle-text">${currentThemeText}</span>
      `;
      toggle.setAttribute(
        "aria-label",
        nextTheme === "dark"
          ? themeUi.enableDark || "Увімкнути темну тему"
          : themeUi.enableLight || "Увімкнути світлу тему"
      );
      toggle.title = themeUi.toggle || "Перемкнути тему";
    }

    toggle.classList.toggle("is-dark", theme === "dark");
    updateThemeToggleLabel(theme);

    if (toggle.dataset.bound === "true") {
      return;
    }

    toggle.addEventListener("click", () => {
      const nextTheme =
        document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", nextTheme);
      localStorage.setItem("site-theme", nextTheme);
      toggle.classList.toggle("is-dark", nextTheme === "dark");
      updateThemeToggleLabel(nextTheme);
      applyThemeAssets(nextTheme);
    });

    toggle.dataset.bound = "true";
  }

  function applyThemeAssets(theme = "light") {
    const asset = theme === "dark" ? themeAssets.dark : themeAssets.light;

    document.querySelectorAll("[data-site-brand-logo]").forEach((element) => {
      element.src = asset;
    });

    let favicon = document.querySelector("[data-site-favicon]");

    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      favicon.type = "image/png";
      favicon.setAttribute("data-site-favicon", "");
      document.head.appendChild(favicon);
    }

    favicon.href = asset;
  }

  function initHeaderBrand() {
    const header = document.querySelector(".site-header");
    if (!header) {
      return;
    }

    let brand = header.querySelector(".site-brand-link");
    if (!brand) {
      brand = document.createElement("a");
      brand.className = "site-brand-link";
      brand.href = "index.html";
      brand.innerHTML = `
        <img
          class="site-brand-logo"
          data-site-brand-logo
          src="${themeAssets.light}"
          alt=""
        >
      `;
      header.appendChild(brand);
    }

    const brandLabel = SITE.meta?.homeTitle || SITE.meta?.siteTitle || "Ігнатьєв Віталій";
    brand.setAttribute("aria-label", brandLabel);
    const image = brand.querySelector("[data-site-brand-logo]");
    if (image) {
      image.alt = brandLabel;
    }
  }

  function getSocialIconMarkup(id, className = "contact-social-icon") {
    if (id === "youtube") {
      return `
        <svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.4.5A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8ZM9.6 15.8V8.2l6.5 3.8-6.5 3.8Z"/>
        </svg>
      `;
    }

    if (id === "facebook") {
      return `
        <svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M13.6 22v-8.2h2.8l.4-3.2h-3.2V8.6c0-.9.3-1.6 1.7-1.6H17V4.1c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2v2.4H7.8v3.2h2.7V22h3.1Z"/>
        </svg>
      `;
    }

    if (id === "webofscience") {
      return `
        <svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="#050505" d="M3.9 6.1c1.6-.5 3.4-.5 5.5-.2-.9 1.8-1.3 3.8-1.3 6.1s.4 4.3 1.3 6.1c-2.1.3-3.9.3-5.5-.2A15 15 0 0 1 3.2 12c0-2.1.2-4.1.7-5.9Z"/>
          <path fill="#6036c8" d="M10.2 3.1c4.1.8 7.4 2.7 10.2 5.9l-2.8 3.2c-2.2-2.8-5.1-4.7-8.6-5.6l1.2-3.5Z"/>
          <path fill="#08a600" d="M17.6 11.8l2.8 3.2c-2.8 3.2-6.1 5.1-10.2 5.9L9 17.4c3.5-.9 6.4-2.8 8.6-5.6Z"/>
        </svg>
      `;
    }

    if (id === "orcid") {
      return `
        <svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="10" fill="#a6ce39"/>
          <circle cx="7.7" cy="7.2" r="1.15" fill="#ffffff"/>
          <path fill="#ffffff" d="M6.8 10h1.8v7H6.8zM11 7.5h3.2c3 0 5.1 1.9 5.1 4.5S17.2 16.5 14.2 16.5H11v-9Zm1.8 1.7v5.6h1.3c2 0 3.3-1.1 3.3-2.8s-1.3-2.8-3.3-2.8h-1.3Z"/>
        </svg>
      `;
    }

    if (id === "googlescholar") {
      return `
        <svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M12 2 1.5 7.3 12 12.6l8.5-4.3v5.3H22V7.3L12 2Zm-6.8 9.5V15c0 2.5 3.1 4.5 6.8 4.5s6.8-2 6.8-4.5v-3.5L12 15l-6.8-3.5Zm3 4.1h1.6c.2 1 1.1 1.6 2.3 1.6 1.3 0 2.2-.7 2.2-1.6s-.9-1.6-2.2-1.6c-.6 0-1.2.1-1.6.4l-.7-1c.6-.5 1.5-.7 2.4-.7 2.1 0 3.6 1.1 3.6 2.9 0 1.8-1.5 2.9-3.8 2.9-2 0-3.4-1-3.8-2.9Z"/>
        </svg>
      `;
    }

    if (id === "church") {
      return `
        <svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M11.3 1.5h1.4v1.7h1.7v1.3h-1.7v2h-1.4v-2H9.6V3.2h1.7V1.5Zm-5.1 5h1.2v1.4h1.4v1.2H7.4v1.5H6.2V9.1H4.7V7.9h1.5V6.5Zm10.4 0h1.2v1.4h1.5v1.2h-1.5v1.5h-1.2V9.1h-1.4V7.9h1.4V6.5ZM12 7.2c-2.2 1.4-3.4 3-3.4 4.8 0 1.6 1.3 2.8 3.4 2.8s3.4-1.2 3.4-2.8c0-1.8-1.2-3.4-3.4-4.8ZM4.8 14h3.6v7H4.8v-7Zm4.5-.2h5.4V21h-1.8v-3.2a.9.9 0 0 0-1.8 0V21H9.3v-7.2Zm6.3.2h3.6v7h-3.6v-7Z"/>
        </svg>
      `;
    }

    return `
      <svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M21.6 4.3 2.9 11.5c-1.3.5-1.3 1.2-.2 1.5l4.8 1.5 1.9 6c.2.5.1.8.7.8.4 0 .6-.2.8-.4l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.2-15.2c.3-1.2-.4-1.8-1.2-1.4Zm-12.8 10-1-.3 10-6.3c.5-.3.9-.1.5.3l-8 7.2-.3 3.3-1.2-4.2Z"/>
      </svg>
    `;
  }

  function initHeaderSocials() {
    const header = document.querySelector(".site-header");
    const title = header?.querySelector("h1");
    if (!header || !title) {
      return;
    }

    const defaultYoutubeHref = SITE.youtubeChannelId
      ? `https://www.youtube.com/channel/${SITE.youtubeChannelId}`
      : "";
    const socials = Array.isArray(SITE.meta?.headerLinks)
      ? SITE.meta.headerLinks
      : [];
    const activeSocials = socials
      .map((item) => ({
        ...item,
        href: item.id === "youtube" ? item.href || defaultYoutubeHref : item.href || ""
      }))
      .filter((item) => item.href);

    let socialBar = header.querySelector(".site-header-socials");

    if (!activeSocials.length) {
      socialBar?.remove();
      return;
    }

    if (!socialBar) {
      socialBar = document.createElement("div");
      socialBar.className = "site-header-socials";
      title.insertAdjacentElement("afterend", socialBar);
    }

    socialBar.setAttribute("aria-label", SITE.ui?.header?.socialsLabel || "Соціальні мережі");
    socialBar.innerHTML = activeSocials
      .map(
        (item) => `
          <a
            class="site-header-social-link is-${item.id}"
            href="${item.href}"
            target="_blank"
            rel="noreferrer"
            aria-label="${item.label}"
            title="${item.label}"
          >
            ${getSocialIconMarkup(item.id, "site-header-social-icon")}
          </a>
        `
      )
      .join("");
  }

  function renderActivityResearchLinks(activity) {
    if (pageType !== "activity") {
      return;
    }

    const aboutPhoto = document.querySelector(".about-photo");
    if (!aboutPhoto) {
      return;
    }

    aboutPhoto.querySelector(".about-photo-links")?.remove();

    const researchLinks =
      activityId === "1" && Array.isArray(SITE.meta?.headerLinks)
        ? SITE.meta.headerLinks.filter(
            (item) =>
              item.id === "webofscience" || item.id === "orcid" || item.id === "googlescholar"
          )
        : [];
    const activityLinks = Array.isArray(activity.links) ? activity.links : [];
    const activeLinks = [...researchLinks, ...activityLinks].filter((item) => item.href);

    if (!activeLinks.length) {
      return;
    }

    const linksWrap = document.createElement("div");
    linksWrap.className = "about-photo-links";
    linksWrap.innerHTML = activeLinks
      .map(
        (item) => `
          <a
            class="about-photo-link is-${item.id}"
            href="${escapeHtml(item.href)}"
            target="_blank"
            rel="noreferrer"
            aria-label="${escapeHtml(item.label)}"
            title="${escapeHtml(item.label)}"
          >
            ${getSocialIconMarkup(item.id, "about-photo-link-icon")}
            <span>${escapeHtml(item.label)}</span>
          </a>
        `
      )
      .join("");

    aboutPhoto.appendChild(linksWrap);
  }

  function initHeaderScrollState() {
    const header = document.querySelector(".site-header");
    if (!header) {
      return;
    }

    const brand = header.querySelector(".site-brand-link");

    if (brand) {
      brand.href = pageType === "home" ? "#top" : "index.html";
      brand.title =
        pageType === "home"
          ? SITE.ui?.header?.backToTop || "Нагору сторінки"
          : SITE.ui?.header?.home || SITE.menu?.home || "Головна";
    }

    if (brand && pageType === "home" && !brand.dataset.scrollTopBound) {
      brand.addEventListener("click", (event) => {
        event.preventDefault();
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      });
      brand.dataset.scrollTopBound = "true";
    }

    if (header.dataset.scrollStateReady === "true") {
      return;
    }

    let ticking = false;
    let isCompact = false;
    let stateLockUntil = 0;
    let stateLockScrollY = window.scrollY;
    let lastEvaluatedScrollY = window.scrollY;

    const updateHeaderOffset = () => {
      document.documentElement.style.setProperty(
        "--site-header-offset",
        `${Math.ceil(header.getBoundingClientRect().height)}px`
      );
    };

    const syncHeaderState = () => {
      const currentScrollY = window.scrollY;
      const compactOnThreshold = window.innerWidth <= 900 ? 104 : 144;
      const compactOffThreshold = 12;
      const previousState = isCompact;

      if (!isCompact && currentScrollY > compactOnThreshold) {
        isCompact = true;
      } else if (isCompact && currentScrollY <= compactOffThreshold) {
        isCompact = false;
      }

      header.classList.toggle("is-compact", isCompact);
      updateHeaderOffset();

      if (previousState !== isCompact) {
        stateLockScrollY = currentScrollY;
        stateLockUntil = window.performance.now() + 420;
      }

      ticking = false;
    };

    const requestSync = () => {
      const currentScrollY = window.scrollY;
      const minimumScrollDelta = window.innerWidth <= 900 ? 14 : 22;
      const compactOffThreshold = 12;
      const forceTopSync = currentScrollY <= compactOffThreshold;

      if (
        !forceTopSync &&
        window.performance.now() < stateLockUntil &&
        Math.abs(currentScrollY - stateLockScrollY) < minimumScrollDelta
      ) {
        return;
      }

      if (!forceTopSync && Math.abs(currentScrollY - lastEvaluatedScrollY) < minimumScrollDelta) {
        return;
      }

      if (ticking) {
        return;
      }

      lastEvaluatedScrollY = currentScrollY;
      ticking = true;
      window.requestAnimationFrame(syncHeaderState);
    };

    const handleResize = () => {
      lastEvaluatedScrollY = window.scrollY;

      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(syncHeaderState);
    };

    header.dataset.scrollStateReady = "true";
    syncHeaderState();
    window.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
  }

  function applyGlobalContent() {
    const homeTitle = `${SITE.meta.homeTitle} — ${SITE.meta.homeSubtitle}`;

    document.documentElement.lang = SITE.currentLocale || SITE.defaultLocale || "uk";
    setText("[data-site-title]", SITE.meta.siteTitle);
    setText("[data-site-subtitle]", SITE.meta.homeSubtitle);
    setText("[data-home-about-heading]", SITE.home.aboutHeading);
    setText("[data-home-activities-heading]", SITE.home.activitiesHeading);
    setText("[data-activity-card-link]", SITE.ui?.buttons?.open || "Перейти");
    updateImage("[data-home-about-image]", SITE.home.aboutImage);
    initHomeAboutLightbox(SITE.home.aboutImage);
    renderParagraphs("[data-home-about-paragraphs]", SITE.home.aboutParagraphs);

    setText("[data-activity-videos-heading]", SITE.ui?.activitySections?.videos || "Відео");
    setText("[data-activity-photos-heading]", SITE.ui?.activitySections?.photos || "Фото");
    setText("[data-activity-files-heading]", SITE.ui?.activitySections?.files || "Файли");

    Object.entries(SITE.activities).forEach(([id, activity]) => {
      setText(`[data-activity-name='${id}']`, activity.name);
      setText(`[data-activity-card-description='${id}']`, activity.cardDescription);
    });

    const footerElement = document.querySelector("[data-footer]");
    const buildVersion = SITE.meta.buildVersion
      ? SITE.meta.buildVersion.startsWith("v.")
        ? SITE.meta.buildVersion
        : `v.${SITE.meta.buildVersion}`
      : "";
    const footerBuild = [buildVersion, SITE.meta.buildDate].filter(Boolean).join(".");
    const footerOwner = [SITE.meta.year ? `© ${SITE.meta.year}` : "", SITE.meta.ownerName]
      .filter(Boolean)
      .join(" ");

    if (footerElement) {
      footerElement.innerHTML = `
        <span class="footer-owner">${footerOwner}</span>
        ${footerBuild ? `
          <span class="footer-build">
            ${footerBuild}<span data-footer-counter-separator hidden>:</span><span class="footer-counter-value" data-footer-counter-value hidden></span>
          </span>
        ` : ""}
      `;
    }

    if (pageType === "home") {
      document.title = homeTitle;
    }
  }

  function applyActivityPage() {
    if (pageType !== "activity" || !activityId) {
      return;
    }

    const activity = SITE.activities?.[activityId];
    if (!activity) {
      return;
    }

    document.title = activity.name;
    setText("[data-activity-page-title]", activity.name);
    setText("[data-activity-page-heading]", activity.name);

    const heroImage = {
      src: `files/media/activity${activityId}/hero.jpg`,
      alt: activity.heroImage?.alt || activity.name
    };
    updateImage("[data-activity-hero-image]", heroImage, homeFallbackImage);
    initActivityHeroLightbox(heroImage);

    renderParagraphs("[data-activity-paragraphs]", activity.pageDescription);
    renderActivityResearchLinks(activity);
    initDetailsInteractions();
    loadActivityGallery(activityId);

    if (activityId === "1") {
      loadYoutubeFeed();
    }

    if (activityId === "2") {
      loadFileList("files/activity2/files.json", "[data-activity-files]", []);
    }
  }

  function applyDownloadsPage() {
    if (pageType !== "downloads") {
      return;
    }

    document.title = SITE.downloads.pageTitle;
    setText("[data-downloads-title]", SITE.downloads.pageTitle);
    setText("[data-downloads-heading]", SITE.downloads.heading);
    const downloadsIntro = document.querySelector("[data-downloads-intro]");
    if (downloadsIntro) {
      const intro = SITE.downloads.intro || "";
      downloadsIntro.textContent = intro;
      downloadsIntro.hidden = !intro.trim();
    }
    loadDownloadsGroups("files/downloads/files.json", "[data-downloads-groups]", SITE.downloads.groups || null);
  }

  function applyContactPage() {
    window.SiteContactPage?.apply({
      pageType,
      site: SITE,
      setText,
      escapeHtml,
      getSocialIconMarkup
    });
  }

  function applyMenuLabels() {
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

    const mobileMenu = SITE.menu?.mobile || {};

    setMenuItemLabel("[data-menu-home]", SITE.menu.home, mobileMenu.home);
    setMenuItemLabel("[data-menu-downloads]", SITE.menu.downloads, mobileMenu.downloads);
    setMenuItemLabel("[data-menu-contact]", SITE.menu.contact, mobileMenu.contact);

    Object.entries(SITE.activities).forEach(([id, activity]) => {
      setMenuItemLabel(
        `[data-menu-activity='${id}']`,
        activity.name,
        mobileMenu[`activity${id}`]
      );
    });
  }

  function applyActiveMenuState() {
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

    document.querySelector(selector)?.setAttribute("aria-current", "page");
  }

  function initMobileNavigation() {
    window.SiteMobileNavigation?.init();
  }

  function initLiquidDroplets() {
    window.SiteLiquidEffects?.initDroplets();
  }

  function initVideoLiquidLens() {
    window.SiteLiquidEffects?.initVideoLens();
  }

  function initVisitorCounter() {
    window.SiteVisitorCounter?.init({
      site: SITE
    });
  }

  function initPwa() {
    if (document.body.dataset.pwaReady === "true") {
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(() => {
        // Ignore registration failures on unsupported hosting modes.
      });
    }

    document.body.dataset.pwaReady = "true";
  }

  function applyAllContent() {
    applyGlobalContent();
    applyActivityPage();
    applyDownloadsPage();
    applyContactPage();
    applyMenuLabels();
    applyActiveMenuState();
    initMobileNavigation();
    initHeaderBrand();
    initHeaderSocials();
    initLanguageToggle();
    initThemeToggle();
    initHeaderScrollState();
    initDetailsInteractions();
    initDownloadPreviewTriggers();
    initLiquidDroplets();
    initVideoLiquidLens();
    initVisitorCounter();
    initPwa();
    applyThemeAssets(document.documentElement.getAttribute("data-theme") || "light");
  }

  fetch("menu.html")
    .then((response) => response.text())
    .then((html) => {
      const menu = document.getElementById("menu");
      if (menu) {
        menu.innerHTML = html;
      }

      applyAllContent();
    })
    .catch(() => {
      applyAllContent();
    });

  applyAllContent();
});
