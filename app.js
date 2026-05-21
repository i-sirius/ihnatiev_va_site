document.addEventListener("DOMContentLoaded", () => {
  const pageType = document.body.dataset.page;
  const activityId = document.body.dataset.activityId;
  const { escapeHtml, getLocalizedValue, setText } = window.SiteUtils;
  const themeAssets = {
    light: "files/media/logo-light.png",
    dark: "files/media/logo-dark.png"
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

  function renderDownloadsGroups(selector, groups) {
    const renderer = getDownloadsRenderer();
    if (renderer) {
      renderer.renderGroups(selector, groups);
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

  function loadDownloadsGroups(path, selector, fallbackGroups = null) {
    if (window.SiteContentLoader) {
      window.SiteContentLoader.loadDownloadsGroups({
        path,
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

  function renderCurrentActivityParagraphs() {
    const activity = SITE.activities && SITE.activities[activityId];
    if (pageType !== "activity" || !activity || !activity.pageDescription) {
      return;
    }

    if (window.SitePageContent) {
      window.SitePageContent.renderParagraphs({
        selector: "[data-activity-paragraphs]",
        paragraphs: activity.pageDescription,
        site: SITE
      });
      window.SitePageContent.initDetailsInteractions();
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
      const trigger = event.target.closest("[data-download-preview]");
      if (!trigger) {
        return;
      }

      event.preventDefault();
      if (lightbox) {
        lightbox.showPreview({
          href: trigger.getAttribute("data-preview-href") || "",
          label: trigger.getAttribute("data-preview-label") || "",
          type: trigger.getAttribute("data-preview-type") || ""
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
          applySiteLocale(nextLocale);
          applyAllContent();
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
      window.SiteHeaderUi.initThemeToggle({
        site: SITE,
        applyThemeAssets
      });
      window.SiteHeaderUi.initScrollState({
        site: SITE,
        pageType
      });
    }
    if (window.SitePageContent) {
      window.SitePageContent.initDetailsInteractions();
    }
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

  if (window.SiteMenuLoader) {
    window.SiteMenuLoader.load({
      onComplete: applyAllContent
    });
  }
  applyAllContent();
});
