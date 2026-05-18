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
    return window.SiteHeaderUi?.ensureControls() || null;
  }

  function initLanguageToggle() {
    window.SiteHeaderUi?.initLanguageToggle({
      site: SITE,
      getLocalizedValue,
      escapeHtml,
      onLocaleChange: (nextLocale) => {
        applySiteLocale(nextLocale);
        applyAllContent();
      }
    });
  }

  function initThemeToggle() {
    window.SiteHeaderUi?.initThemeToggle({
      site: SITE,
      applyThemeAssets
    });
  }

  function applyThemeAssets(theme = "light") {
    window.SiteHeaderUi?.applyThemeAssets({
      theme,
      themeAssets
    });
  }

  function initHeaderBrand() {
    window.SiteHeaderUi?.initBrand({
      site: SITE,
      themeAssets
    });
  }

  function getSocialIconMarkup(id, className = "contact-social-icon") {
    return window.SiteSocialIcons?.getMarkup(id, className) || "";
  }

  function initHeaderSocials() {
    window.SiteHeaderUi?.initSocials({
      site: SITE,
      getSocialIconMarkup
    });
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
    window.SiteHeaderUi?.initScrollState({
      site: SITE,
      pageType
    });
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
