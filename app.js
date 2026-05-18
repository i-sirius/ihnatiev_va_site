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

  function initDetailsInteractions() {
    window.SitePageContent?.initDetailsInteractions();
  }

  function ensureDocumentLightbox() {
    return window.SiteDocumentLightbox?.ensure({
      site: SITE,
      getLocalizedValue,
      getDownloadFileType
    });
  }

  function renderGallery(selector, images) {
    window.SiteGalleryRenderer?.renderGallery({
      selector,
      images,
      site: SITE,
      escapeHtml
    });
  }

  function initActivityHeroLightbox(image) {
    window.SiteGalleryRenderer?.initActivityHeroLightbox({
      image,
      site: SITE
    });
  }

  function initHomeAboutLightbox(image) {
    window.SiteGalleryRenderer?.initHomeAboutLightbox({
      image,
      pageType,
      site: SITE
    });
  }

  function setActivityLightboxGalleryItems(images) {
    window.SiteGalleryRenderer?.setActivityLightboxGalleryItems({
      images,
      pageType
    });
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

  function loadActivityGallery(id) {
    window.SiteContentLoader?.loadActivityGallery({
      id,
      renderGallery,
      setActivityLightboxGalleryItems,
      setActivityGalleryPromise: (promise) =>
        window.SiteGalleryRenderer?.setActivityGalleryPromise(promise)
    });
  }

  function loadFileList(path, selector, fallbackFiles = []) {
    window.SiteContentLoader?.loadFileList({
      path,
      selector,
      fallbackFiles,
      renderDownloads
    });
  }

  function loadDownloadsGroups(path, selector, fallbackGroups = null) {
    window.SiteContentLoader?.loadDownloadsGroups({
      path,
      selector,
      fallbackGroups,
      renderDownloadsGroups
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

  function initHeaderScrollState() {
    window.SiteHeaderUi?.initScrollState({
      site: SITE,
      pageType
    });
  }

  function applyGlobalContent() {
    window.SitePageContent?.applyGlobalContent({
      site: SITE,
      pageType,
      setText,
      initHomeAboutLightbox
    });
  }

  function applyActivityPage() {
    window.SitePageContent?.applyActivityPage({
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
  }

  function applyDownloadsPage() {
    window.SitePageContent?.applyDownloadsPage({
      site: SITE,
      pageType,
      setText,
      loadDownloadsGroups
    });
  }

  function applyContactPage() {
    window.SitePageContent?.applyContactPage({
      pageType,
      site: SITE,
      setText,
      escapeHtml,
      getSocialIconMarkup
    });
  }

  function applyMenuLabels() {
    window.SitePageContent?.applyMenuLabels({
      site: SITE
    });
  }

  function applyActiveMenuState() {
    window.SitePageContent?.applyActiveMenuState({
      pageType,
      activityId
    });
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
