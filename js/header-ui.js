(() => {
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

  function initLanguageToggle({
    site = window.SITE || {},
    getLocalizedValue = (value, fallback = "") => value || fallback,
    escapeHtml = (value) => String(value),
    onLocaleChange = () => {}
  } = {}) {
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
    const languageUi = site.ui?.language || {};

    if (label) {
      const currentLocaleCode =
        site.currentLocale === "uk"
          ? "УКР"
          : site.currentLocale === "en"
            ? "EN"
            : site.currentLocale?.toUpperCase();
      label.textContent = `${languageUi.label || "Мова"}: ${currentLocaleCode || ""}`;
    }

    if (optionsWrap) {
      optionsWrap.setAttribute("aria-label", languageUi.toggle || "Перемкнути мову");
      const supportedLocales = Array.isArray(site.supportedLocales)
        ? site.supportedLocales
        : [site.defaultLocale || "uk"];

      optionsWrap.innerHTML = supportedLocales
        .map((locale) => {
          const optionLabel =
            getLocalizedValue(languageUi.options?.[locale], locale.toUpperCase()) ||
            locale.toUpperCase();
          const localeName =
            getLocalizedValue(languageUi.names?.[locale], locale.toUpperCase()) ||
            locale.toUpperCase();
          const localeFlagClass = locale === "uk" ? "is-uk" : locale === "en" ? "is-en" : "";
          const isActive = locale === site.currentLocale;

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

      const nextLocale = button.getAttribute("data-language-option") || site.defaultLocale || "uk";
      if (nextLocale === site.currentLocale) {
        return;
      }

      onLocaleChange(nextLocale);
    });

    toggle.dataset.bound = "true";
  }

  function initThemeToggle({
    site = window.SITE || {},
    applyThemeAssets = () => {}
  } = {}) {
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
      const themeUi = site.ui?.theme || {};
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

  function applyThemeAssets({ theme = "light", themeAssets = {} } = {}) {
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

  function initHeaderBrand({ site = window.SITE || {}, themeAssets = {} } = {}) {
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

    const brandLabel = site.meta?.homeTitle || site.meta?.siteTitle || "Ігнатьєв Віталій";
    brand.setAttribute("aria-label", brandLabel);
    const image = brand.querySelector("[data-site-brand-logo]");
    if (image) {
      image.alt = brandLabel;
    }
  }

  function initHeaderSocials({
    site = window.SITE || {},
    getSocialIconMarkup = () => ""
  } = {}) {
    const header = document.querySelector(".site-header");
    const title = header?.querySelector("h1");
    if (!header || !title) {
      return;
    }

    const defaultYoutubeHref = site.youtubeChannelId
      ? `https://www.youtube.com/channel/${site.youtubeChannelId}`
      : "";
    const socials = Array.isArray(site.meta?.headerLinks)
      ? site.meta.headerLinks
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

    socialBar.setAttribute("aria-label", site.ui?.header?.socialsLabel || "Соціальні мережі");
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

  function initHeaderScrollState({
    site = window.SITE || {},
    pageType = document.body.dataset.page
  } = {}) {
    const header = document.querySelector(".site-header");
    if (!header) {
      return;
    }

    const brand = header.querySelector(".site-brand-link");

    if (brand) {
      brand.href = pageType === "home" ? "#top" : "index.html";
      brand.title =
        pageType === "home"
          ? site.ui?.header?.backToTop || "Нагору сторінки"
          : site.ui?.header?.home || site.menu?.home || "Головна";
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

  window.SiteHeaderUi = {
    applyThemeAssets,
    ensureControls: ensureHeaderControls,
    initBrand: initHeaderBrand,
    initLanguageToggle,
    initScrollState: initHeaderScrollState,
    initSocials: initHeaderSocials,
    initThemeToggle
  };
})();
