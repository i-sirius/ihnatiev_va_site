﻿document.addEventListener("DOMContentLoaded", () => {
  const pageType = document.body.dataset.page;
  const activityId = document.body.dataset.activityId;
  const legacyDebugEnabled = /(?:^|[?&])debug=legacy(?:[=&]|$)/.test(window.location.search);

  function logLegacyStep(step) {
    if (
      legacyDebugEnabled &&
      window.console &&
      typeof window.console.info === "function"
    ) {
      window.console.info(`[legacy-init] ${step}`);
    }
  }

  logLegacyStep("app DOMContentLoaded");

  if (typeof SITE === "undefined") {
    logLegacyStep("config.js did not expose SITE; content bootstrap stopped");
    return;
  }

  if (!window.SiteUtils) {
    logLegacyStep("site-utils.js is unavailable; content bootstrap stopped");
    return;
  }

  if (legacyDebugEnabled) {
    window.SiteLegacyDebugLog = logLegacyStep;
  }

  function syncAccessibleFabTitle() {
    const fab = document.querySelector('.accessible-fab');
    if (!fab || !SITE.ui || !SITE.ui.accessibility) return;

    const isAccessible = document.documentElement.getAttribute('data-theme') === 'accessible';
    const labelText = isAccessible 
      ? SITE.ui.accessibility.regular 
      : SITE.ui.accessibility.simplified;
    fab.title = labelText;
    fab.setAttribute('aria-label', labelText);
  }
  window.syncAccessibleFabTitle = syncAccessibleFabTitle;

  function applyFooterContent() {
    const footer = document.querySelector('[data-footer]');
    if (!footer || !SITE.meta) return;
    const year = SITE.meta.year || '2026';
    const authorName = SITE.meta.authorRealName || 'Віталій Ігнатьєв';
    const developerName = SITE.meta.siteDeveloperName || "";
    const developerText = developerName ? ` · сайт: ${developerName}` : "";
    const owner = document.createTextNode(`© ${year} ${authorName}${developerText}`);
    const lineBreak = document.createElement("br");
    const build = document.createElement("span");
    const separator = document.createElement("span");
    const counter = document.createElement("span");

    build.className = "footer-build";
    build.appendChild(document.createTextNode(`v${SITE.meta.buildVersion}.${SITE.meta.buildDate} `));
    separator.setAttribute("data-footer-counter-separator", "");
    separator.hidden = true;
    separator.textContent = ":";
    counter.setAttribute("data-footer-counter-value", "");
    counter.hidden = true;
    build.appendChild(separator);
    build.appendChild(document.createTextNode(" "));
    build.appendChild(counter);

    while (footer.firstChild) {
      footer.removeChild(footer.firstChild);
    }
    footer.appendChild(owner);
    footer.appendChild(lineBreak);
    footer.appendChild(build);
  }

  const { escapeHtml, getLocalizedValue, setText } = window.SiteUtils;
  const themeAssets = {
    light: "files/media/logo-light.png",
    dark: "files/media/logo-dark.png",
    faviconLight: "/icons/favicon-light-32.png",
    faviconDark: "/icons/favicon-dark-32.png"
  };
  const homeFallbackImage = SITE && SITE.home && SITE.home.aboutImage || {
    src: "files/media/about-me-photo.jpg",
    alt: "Фото"
  };

  function ensureDocumentLightbox() {
    return window.SiteDocumentLightbox && window.SiteDocumentLightbox.ensure({
      site: SITE,
      getLocalizedValue,
      getDownloadFileType
    });
  }

  function renderGallery(selector, images) {
    if (window.SiteGalleryRenderer) {
      window.SiteGalleryRenderer.renderGallery({
        selector,
        images,
        site: SITE,
        escapeHtml
      });
    }
  }

  function initActivityHeroLightbox(image) {
    if (window.SiteGalleryRenderer) {
      window.SiteGalleryRenderer.initActivityHeroLightbox({
        image,
        site: SITE
      });
    }
  }

  function initHomeAboutLightbox(image) {
    if (window.SiteGalleryRenderer) {
      window.SiteGalleryRenderer.initHomeAboutLightbox({
        image,
        pageType,
        site: SITE
      });
    }
  }

  function setActivityLightboxGalleryItems(images) {
    if (window.SiteGalleryRenderer) {
      window.SiteGalleryRenderer.setActivityLightboxGalleryItems({
        images,
        pageType
      });
    }
  }

  function getDownloadsRenderer() {
    return window.SiteDownloadsRenderer && window.SiteDownloadsRenderer.create({
      site: SITE,
      getLocalizedValue,
      escapeHtml
    });
  }

  function renderDownloads(selector, files) {
    const renderer = getDownloadsRenderer();
    if (renderer) {
      renderer.renderList(selector, files);
    }
  }

  function getDownloadFileType(file = {}) {
    const renderer = getDownloadsRenderer();
    return renderer ? renderer.getFileType(file) : "FILE";
  }

  function renderDownloadsGroups(selector, groups, searchIndex = null) {
    const renderer = getDownloadsRenderer();
    if (renderer) {
      renderer.renderGroups(selector, groups, searchIndex);
    }
  }

  function loadActivityGallery(id) {
    if (window.SiteContentLoader) {
      window.SiteContentLoader.loadActivityGallery({
        id,
        renderGallery,
        setActivityLightboxGalleryItems,
        setActivityGalleryPromise: (promise) => {
          if (window.SiteGalleryRenderer) {
            window.SiteGalleryRenderer.setActivityGalleryPromise(promise);
          }
        }
      });
    }
  }

  function loadFileList(path, selector, fallbackFiles = []) {
    if (window.SiteContentLoader) {
      window.SiteContentLoader.loadFileList({
        path,
        selector,
        fallbackFiles,
        renderDownloads
      });
    }
  }

  function loadDownloadsGroups(path, selector, fallbackGroups = null, indexPath = "") {
    if (window.SiteContentLoader) {
      window.SiteContentLoader.loadDownloadsGroups({
        path,
        indexPath,
        selector,
        fallbackGroups,
        renderDownloadsGroups
      });
    }
  }

  function applyActivityTextChrome() {
    if (window.SitePageContent) {
      window.SitePageContent.renderActivitySummaries({
        site: SITE,
        setText
      });
      window.SitePageContent.applyActivityChrome({
        site: SITE,
        pageType,
        activityId,
        homeFallbackImage,
        setText,
        initActivityHeroLightbox
      });
      window.SitePageContent.applyMenuLabels({
        site: SITE
      });
      window.SitePageContent.applyActiveMenuState({
        pageType,
        activityId
      });
    }
    if (window.SiteHeaderUi && window.SiteHeaderUi.syncHomeTitleLayout) {
      window.SiteHeaderUi.syncHomeTitleLayout();
    }
  }

  function loadActivitiesContent() {
    const loadActivities = window.SiteContentLoader && window.SiteContentLoader.loadActivitiesContent;
    if (typeof loadActivities !== "function") {
      return;
    }

    const contentLocale = SITE.currentLocale || SITE.defaultLocale || "uk";
    loadActivities({
      locale: contentLocale,
      fallbackActivities: SITE.activities || {}
    }).then((activities) => {
      const activeLocale = SITE.currentLocale || SITE.defaultLocale || "uk";
      if (activeLocale !== contentLocale) {
        return;
      }

      SITE.activities = activities;
      applyActivityTextChrome();
    });
  }

  function applyPageTextChrome() {
    if (window.SitePageContent) {
      window.SitePageContent.renderDownloadsPageChrome({
        site: SITE,
        pageType,
        setText
      });
      window.SitePageContent.applyContactPage({
        pageType,
        site: SITE,
        setText,
        escapeHtml,
        getSocialIconMarkup
      });
    }
    if (window.SiteHeaderUi && window.SiteHeaderUi.syncHomeTitleLayout) {
      window.SiteHeaderUi.syncHomeTitleLayout();
    }
  }

  function applySocialLinksChrome() {
    if (window.SiteHeaderUi) {
      window.SiteHeaderUi.initSocials({
        site: SITE,
        getSocialIconMarkup
      });
    }
    if (window.SitePageContent) {
      window.SitePageContent.renderActivityResearchLinks({
        activity: SITE.activities && SITE.activities[activityId],
        activityId,
        pageType,
        site: SITE,
        escapeHtml,
        getSocialIconMarkup
      });
      window.SitePageContent.applyContactPage({
        pageType,
        site: SITE,
        setText,
        escapeHtml,
        getSocialIconMarkup
      });
    }
    if (window.SiteLiquidEffects) {
      window.SiteLiquidEffects.initDroplets();
    }
  }

  function loadSocialLinksContent() {
    const loadSocialLinks = window.SiteContentLoader && window.SiteContentLoader.loadSocialLinksContent;
    if (typeof loadSocialLinks !== "function") {
      return;
    }

    const contentLocale = SITE.currentLocale || SITE.defaultLocale || "uk";
    const fallbackLinks = SITE.meta && Array.isArray(SITE.meta.headerLinks)
      ? SITE.meta.headerLinks
      : [];
    loadSocialLinks({
      locale: contentLocale,
      fallbackLinks
    }).then((links) => {
      const activeLocale = SITE.currentLocale || SITE.defaultLocale || "uk";
      if (activeLocale !== contentLocale || !Array.isArray(links)) {
        return;
      }

      SITE.meta.headerLinks = links;
      SITE.contact.socials = {
        ...(SITE.contact.socials || {}),
        items: links
      };
      applySocialLinksChrome();
    });
  }

  function loadPagesContent() {
    const loadPages = window.SiteContentLoader && window.SiteContentLoader.loadPagesContent;
    if (typeof loadPages !== "function") {
      return;
    }

    const contentLocale = SITE.currentLocale || SITE.defaultLocale || "uk";
    loadPages({
      locale: contentLocale,
      fallbackSite: SITE
    }).then((pages) => {
      const activeLocale = SITE.currentLocale || SITE.defaultLocale || "uk";
      if (activeLocale !== contentLocale) {
        return;
      }

      if (pages.downloads) {
        SITE.downloads = pages.downloads;
      }

      if (pages.contact) {
        SITE.contact = pages.contact;
      }

      applyPageTextChrome();
    });
  }

  function getResearchPublicationsDetails() {
    const researchActivity = SITE.activities && SITE.activities[1];
    const researchDescription = researchActivity && researchActivity.pageDescription;
    if (!Array.isArray(researchDescription)) {
      return null;
    }

    return researchDescription.find((paragraph) => paragraph && paragraph.type === "details") || null;
  }

  function getHeaderOffset() {
    const headerOffsetValue = getComputedStyle(document.documentElement)
      .getPropertyValue("--site-header-offset")
      .trim();

    return Number.parseFloat(headerOffsetValue) || 0;
  }

  function getActivityDetailsElements() {
    if (pageType !== "activity") {
      return [];
    }

    return Array.from(document.querySelectorAll("[data-activity-paragraphs] .about-details"));
  }

  function captureActivityDetailsState() {
    const detailsElements = getActivityDetailsElements();
    const openIndexes = [];
    let contextIndex = -1;

    if (!detailsElements.length) {
      return null;
    }

    const headerOffset = getHeaderOffset();
    const viewportReference =
      window.scrollY + headerOffset + Math.min(window.innerHeight * 0.35, 220);

    detailsElements.forEach((details, index) => {
      if (!details.open) {
        return;
      }

      openIndexes.push(index);

      if (contextIndex !== -1) {
        return;
      }

      const rect = details.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const bottom = top + rect.height;

      if (viewportReference >= top - 48 && viewportReference <= bottom + 48) {
        contextIndex = index;
      }
    });

    if (!openIndexes.length) {
      return null;
    }

    return {
      contextIndex,
      openIndexes
    };
  }

  function restoreActivityDetailsState(state) {
    const openIndexes = state && Array.isArray(state.openIndexes) ? state.openIndexes : [];
    const detailsElements = getActivityDetailsElements();
    let contextDetails = null;

    if (!openIndexes.length || !detailsElements.length) {
      return;
    }

    openIndexes.forEach((index) => {
      const details = detailsElements[index];

      if (!details) {
        return;
      }

      details.open = true;

      if (index === state.contextIndex) {
        contextDetails = details;
      }
    });

    window.dispatchEvent(new CustomEvent("site:layout-shift"));

    if (!contextDetails) {
      return;
    }

    window.requestAnimationFrame(() => {
      const target =
        contextDetails.querySelector("[data-publication-tools]") ||
        contextDetails.querySelector("summary") ||
        contextDetails;
      const top = target.getBoundingClientRect().top + window.scrollY - getHeaderOffset() - 12;

      window.scrollTo({
        top: Math.max(0, top),
        left: 0,
        behavior: "auto"
      });
      window.dispatchEvent(new CustomEvent("site:layout-shift"));
    });
  }

  function renderCurrentActivityParagraphs() {
    const activity = SITE.activities && SITE.activities[activityId];
    if (pageType !== "activity" || !activity || !activity.pageDescription) {
      return;
    }

    const detailsState = captureActivityDetailsState();

    if (window.SitePageContent) {
      window.SitePageContent.renderParagraphs({
        selector: "[data-activity-paragraphs]",
        paragraphs: activity.pageDescription,
        site: SITE
      });
      window.SitePageContent.initDetailsInteractions();
      restoreActivityDetailsState(detailsState);
    }
  }

  function loadPublicationsContent() {
    if (pageType !== "activity" || activityId !== "1") {
      return;
    }

    const loadPublications = window.SiteContentLoader && window.SiteContentLoader.loadPublicationsContent;
    const fallbackPublications = getResearchPublicationsDetails();
    if (typeof loadPublications !== "function" || !fallbackPublications) {
      return;
    }

    const contentLocale = SITE.currentLocale || SITE.defaultLocale || "uk";
    loadPublications({
      locale: contentLocale,
      fallbackPublications
    }).then((publications) => {
      const activeLocale = SITE.currentLocale || SITE.defaultLocale || "uk";
      const publicationsDetails = getResearchPublicationsDetails();
      if (activeLocale !== contentLocale || !publicationsDetails) {
        return;
      }

      Object.assign(publicationsDetails, publications);
      renderCurrentActivityParagraphs();
    });
  }

  function initDownloadPreviewTriggers() {
    const lightbox = ensureDocumentLightbox();

    if (document.body.dataset.downloadPreviewReady === "true") {
      return;
    }

    document.addEventListener("click", (event) => {
      const standalonePdfTrigger = event.target.closest("[data-pdf-standalone-trigger]");
      if (
        standalonePdfTrigger &&
        lightbox &&
        typeof lightbox.showStandalonePdfPanel === "function"
      ) {
        event.preventDefault();
        lightbox.showStandalonePdfPanel({
          href: standalonePdfTrigger.getAttribute("data-pdf-standalone-href") || "",
          label: standalonePdfTrigger.getAttribute("data-pdf-standalone-label") || ""
        }, standalonePdfTrigger);
        return;
      }

      const copyTrigger = event.target.closest("[data-copy-citation]");
      if (copyTrigger && navigator.clipboard) {
        const text = copyTrigger.getAttribute("data-copy-citation");
        const originalTitle = copyTrigger.getAttribute("title");

        navigator.clipboard.writeText(text).then(() => {
          const successText = (SITE.ui && SITE.ui.documentPreview && SITE.ui.documentPreview.pdfStandaloneCopied) || "Copied";
          
          copyTrigger.classList.add("is-copied");
          copyTrigger.setAttribute("title", successText);
          setTimeout(() => {
            copyTrigger.setAttribute("title", originalTitle);
            copyTrigger.classList.remove("is-copied");
          }, 2000);
        });
      }

      const trigger = event.target.closest("[data-download-preview]");
      if (!trigger) {
        return;
      }

      event.preventDefault();
      if (lightbox) {
        lightbox.showPreview({
          href: trigger.getAttribute("data-preview-href") || "",
          label: trigger.getAttribute("data-preview-label") || "",
          type: trigger.getAttribute("data-preview-type") || "",
          search: trigger.getAttribute("data-preview-search") || "",
          page: trigger.getAttribute("data-preview-page") || "",
          snippet: trigger.getAttribute("data-preview-snippet") || ""
        });
      }
    });

    document.body.dataset.downloadPreviewReady = "true";
  }

  function loadYoutubeFeed() {
    if (window.SiteYoutubeFeed) {
      window.SiteYoutubeFeed.load({
        site: SITE,
        selector: "[data-activity-videos]",
        getLocalizedValue,
        escapeHtml
      });
    }
  }

  function initLanguageToggle() {
    if (window.SiteHeaderUi) {
      window.SiteHeaderUi.initLanguageToggle({
        site: SITE,
        getLocalizedValue,
        escapeHtml,
        onLocaleChange: (nextLocale) => {
          const detailsState = captureActivityDetailsState();

          applySiteLocale(nextLocale);
          applyAllContent({ activityDetailsState: detailsState });
        }
      });
    }
  }

  function applyThemeAssets(theme = "light") {
    if (window.SiteHeaderUi) {
      window.SiteHeaderUi.applyThemeAssets({
        theme,
        themeAssets
      });
    }
  }

  function getSocialIconMarkup(id, className = "contact-social-icon") {
    return window.SiteSocialIcons ? window.SiteSocialIcons.getMarkup(id, className) : "";
  }

  function initPwa() {
    var appUpdate = window.SiteAppUpdate;

    if (document.body.dataset.pwaReady === "true") {
      if (appUpdate && typeof appUpdate.init === "function") {
        appUpdate.init({ site: SITE });
      }
      return;
    }

    if (appUpdate && typeof appUpdate.init === "function") {
      appUpdate.init({ site: SITE });
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").then(function (registration) {
        if (appUpdate && typeof appUpdate.handleRegistration === "function") {
          appUpdate.handleRegistration(registration);
        }
      }).catch(function () {
        // Ignore registration failures on unsupported hosting modes.
      });
    } else if (appUpdate && typeof appUpdate.handleUnsupported === "function") {
      appUpdate.handleUnsupported();
    }

    document.body.dataset.pwaReady = "true";
  }

  function applyAllContent({ activityDetailsState = null } = {}) {
    logLegacyStep("apply config fallback content");

    if (window.SitePageContent) {
      window.SitePageContent.applyGlobalContent({
        site: SITE,
        pageType,
        setText,
        initHomeAboutLightbox
      });
      window.SitePageContent.applyActivityPage({
        site: SITE,
        pageType,
        activityId,
        homeFallbackImage,
        setText,
        escapeHtml,
        getSocialIconMarkup,
        initActivityHeroLightbox,
        loadActivityGallery,
        loadFileList,
        loadYoutubeFeed
      });
      window.SitePageContent.applyDownloadsPage({
        site: SITE,
        pageType,
        setText,
        loadDownloadsGroups
      });
      window.SitePageContent.applyContactPage({
        pageType,
        site: SITE,
        setText,
        escapeHtml,
        getSocialIconMarkup
      });
      window.SitePageContent.applyMenuLabels({
        site: SITE
      });
      window.SitePageContent.applyActiveMenuState({
        pageType,
        activityId
      });
    }
    loadActivitiesContent();
    loadPagesContent();
    loadSocialLinksContent();
    loadPublicationsContent();
    if (window.SiteMobileNavigation) {
      window.SiteMobileNavigation.init();
    }
    if (window.SiteHeaderUi) {
      window.SiteHeaderUi.initBrand({
        site: SITE,
        themeAssets
      });
      window.SiteHeaderUi.initSocials({
        site: SITE,
        getSocialIconMarkup
      });
    }
    initLanguageToggle();
    if (window.SiteHeaderUi) {
      window.SiteHeaderUi.initThemeToggle({ site: SITE, applyThemeAssets });
      window.SiteHeaderUi.initAccessibleThemeToggle({ site: SITE, applyAccessibleTheme: window.SiteHeaderUi.applyAccessibleTheme });
      window.SiteHeaderUi.applyAccessibleTheme();
      syncAccessibleFabTitle();
      window.SiteHeaderUi.initScrollState({
        site: SITE,
        pageType
      });
      applyFooterContent();
    }
    if (window.SitePageContent) {
      window.SitePageContent.initDetailsInteractions();
    }
    if (pageType === "search" && window.SiteSearchPage && typeof window.SiteSearchPage.refresh === "function") {
      window.SiteSearchPage.refresh();
    }
    restoreActivityDetailsState(activityDetailsState);
    initDownloadPreviewTriggers();
    if (window.SiteLiquidEffects) {
      window.SiteLiquidEffects.initDroplets();
      window.SiteLiquidEffects.initVideoLens();
    }
    if (window.SiteVisitorCounter) {
      window.SiteVisitorCounter.init({
        site: SITE
      });
    }
    initPwa();
    applyThemeAssets(document.documentElement.getAttribute("data-theme") || "light");
  }

  function runInitialContent() {
    if (document.body.dataset.initialContentApplied === "true") {
      return;
    }

    document.body.dataset.initialContentApplied = "true";
    applyAllContent();
  }

  if (window.SiteMenuLoader) {
    window.SiteMenuLoader.load({
      onComplete: () => {
        logLegacyStep("menu HTML loaded");
        runInitialContent();
      }
    });
  } else {
    runInitialContent();
  }
});
