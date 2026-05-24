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
    const languageUi = site.ui && site.ui.language ? site.ui.language : {};

    if (label) {
      const currentLocaleCode =
        site.currentLocale === "uk"
          ? "УКР"
          : site.currentLocale === "en"
            ? "EN"
            : site.currentLocale
              ? site.currentLocale.toUpperCase()
              : "";
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
            getLocalizedValue(languageUi.options && languageUi.options[locale], locale.toUpperCase()) ||
            locale.toUpperCase();
          const localeName =
            getLocalizedValue(languageUi.names && languageUi.names[locale], locale.toUpperCase()) ||
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
              ${
                localeFlagClass
                  ? `<span class="language-toggle-flag ${localeFlagClass}" aria-hidden="true"></span><span class="language-toggle-code is-flag-fallback">${escapeHtml(
                      locale.toUpperCase()
                    )}</span>`
                  : `<span class="language-toggle-code">${escapeHtml(optionLabel)}</span>`
              }
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
      const themeUi = site.ui && site.ui.theme ? site.ui.theme : {};
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
      const currentTheme = localStorage.getItem("site-theme") || "light";
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      
      localStorage.setItem("site-theme", nextTheme);
      toggle.classList.toggle("is-dark", nextTheme === "dark");
      updateThemeToggleLabel(nextTheme);
      applyAccessibleTheme(); // Викликаємо загальний аплікатор замість прямого setAttribute
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

    const brandLabel =
      site.meta && (site.meta.homeTitle || site.meta.siteTitle)
        ? site.meta.homeTitle || site.meta.siteTitle
        : "Ігнатьєв Віталій";
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
    const title = header && header.querySelector("h1");
    if (!header || !title) {
      return;
    }

    const defaultYoutubeHref = site.youtubeChannelId
      ? `https://www.youtube.com/channel/${site.youtubeChannelId}`
      : "";
    const socials = site.meta && Array.isArray(site.meta.headerLinks)
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
      if (socialBar) {
        socialBar.remove();
      }
      return;
    }

    if (!socialBar) {
      socialBar = document.createElement("div");
      socialBar.className = "site-header-socials";
      title.insertAdjacentElement("afterend", socialBar);
    }

    const headerUi = site.ui && site.ui.header ? site.ui.header : {};
    socialBar.setAttribute("aria-label", headerUi.socialsLabel || "Соціальні мережі");
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

  function syncHomeTitleLayout(header = document.querySelector(".site-header")) {
    if (!header) {
      return;
    }

    const viewportWidth = Math.round(window.innerWidth || document.documentElement.clientWidth || 0);
    const previousViewportWidth = Number(header.dataset.headerLayoutWidth || 0);
    const widthUnchanged = Math.abs(previousViewportWidth - viewportWidth) < 1;
    const keepHomeInBrand = header.classList.contains("is-home-in-brand") && widthUnchanged;

    if (header.classList.contains("is-compact")) {
      return;
    }

    header.dataset.headerLayoutWidth = String(viewportWidth);

    if (keepHomeInBrand) {
      if (document.body.dataset.page === "home") {
        header.classList.add("is-title-split");
      } else {
        header.classList.remove("is-title-split");
      }

      return;
    }

    header.classList.remove("is-home-in-brand");

    const title = header.querySelector("h1");
    const nav = header.querySelector("nav");
    const titleText = title && title.querySelector("[data-site-title]");
    const separator = title && title.querySelector(".site-title-separator");
    const subtitle = title && title.querySelector("[data-site-subtitle]");
    const isHomePage = document.body.dataset.page === "home";

    if (!isHomePage) {
      header.classList.remove("is-title-split");
    }

    let titleOverflows = false;

    if (isHomePage && title && titleText && subtitle) {
      header.classList.remove("is-title-split");

      const titleStyles = window.getComputedStyle(title);
      const availableWidth =
        title.clientWidth -
        Number.parseFloat(titleStyles.paddingLeft || "0") -
        Number.parseFloat(titleStyles.paddingRight || "0");

      if (availableWidth > 0) {
        const probe = document.createElement("span");
        probe.style.position = "absolute";
        probe.style.left = "-9999px";
        probe.style.top = "0";
        probe.style.visibility = "hidden";
        probe.style.whiteSpace = "nowrap";
        probe.style.fontFamily = titleStyles.fontFamily;
        probe.style.fontSize = titleStyles.fontSize;
        probe.style.fontWeight = titleStyles.fontWeight;
        probe.style.letterSpacing = titleStyles.letterSpacing;
        probe.style.lineHeight = titleStyles.lineHeight;
        probe.style.textTransform = titleStyles.textTransform;
        probe.textContent = `${titleText.textContent || ""}${separator && separator.textContent ? separator.textContent : " -"} ${subtitle.textContent || ""}`;

        document.body.appendChild(probe);
        const requiredWidth = probe.getBoundingClientRect().width;
        probe.remove();

        titleOverflows = requiredWidth > availableWidth + 1;
      }
    }

    let navOverflows = false;

    if (nav) {
      const navStyles = window.getComputedStyle(nav);
      const navAvailableWidth =
        nav.clientWidth -
        Number.parseFloat(navStyles.paddingLeft || "0") -
        Number.parseFloat(navStyles.paddingRight || "0");
      const navRequiredWidth = Array.from(nav.querySelectorAll("a"))
        .filter((link) => window.getComputedStyle(link).display !== "none")
        .reduce((total, link) => {
          const linkStyles = window.getComputedStyle(link);
          const rect = link.getBoundingClientRect();

          return (
            total +
            rect.width +
            Number.parseFloat(linkStyles.marginLeft || "0") +
            Number.parseFloat(linkStyles.marginRight || "0")
          );
        }, 0);

      navOverflows = navAvailableWidth > 0 && navRequiredWidth > navAvailableWidth + 1;
    }

    const shouldMoveHomeToBrand = viewportWidth <= 1360 || titleOverflows || navOverflows;

    header.classList.toggle("is-home-in-brand", shouldMoveHomeToBrand);

    if (isHomePage) {
      header.classList.toggle("is-title-split", shouldMoveHomeToBrand || titleOverflows || navOverflows);
    }
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
      const headerUi = site.ui && site.ui.header ? site.ui.header : {};
      const menu = site.menu || {};
      const homeActionLabel = headerUi.home || menu.home || "Головна";
      const homePageLabel = headerUi.homePage || homeActionLabel;

      brand.href = pageType === "home" ? "#top" : "index.html";
      brand.dataset.homeLabel = homePageLabel;
      brand.title =
        pageType === "home"
          ? headerUi.backToTop || "Нагору сторінки"
          : homeActionLabel;
    }

    if (brand && pageType === "home" && !brand.dataset.scrollTopBound) {
      brand.addEventListener("click", (event) => {
        event.preventDefault();
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      });
      brand.dataset.scrollTopBound = "true";
    }

    syncHomeTitleLayout(header);

    if (header.dataset.scrollStateReady === "true") {
      return;
    }

    let ticking = false;
    let isCompact = false;
    let stateLockUntil = 0;
    let stateLockScrollY = window.scrollY;
    let lastEvaluatedScrollY = window.scrollY;
    let transitionStateTimer = 0;
    const transitionStateMs = 360;

    const updateHeaderOffset = () => {
      document.documentElement.style.setProperty(
        "--site-header-offset",
        `${Math.ceil(header.getBoundingClientRect().height)}px`
      );
    };

    const updateHeaderUnderlap = (currentScrollY, compactOnThreshold, compactOffThreshold) => {
      const underlapRange = Math.max(compactOnThreshold - compactOffThreshold, 1);
      const rawProgress = (currentScrollY - compactOffThreshold) / underlapRange;
      const underlapProgress = Math.min(Math.max(rawProgress, 0), 1);

      header.style.setProperty("--header-underlap-progress", underlapProgress.toFixed(3));
      header.style.setProperty("--header-underlap-blur", `${(underlapProgress * 18).toFixed(1)}px`);
      header.classList.toggle("is-over-content", currentScrollY > compactOffThreshold);
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

      updateHeaderUnderlap(currentScrollY, compactOnThreshold, compactOffThreshold);
      header.classList.toggle("is-compact", isCompact);
      syncHomeTitleLayout(header);
      updateHeaderOffset();

      if (previousState !== isCompact) {
        if (transitionStateTimer) {
          window.clearTimeout(transitionStateTimer);
        }

        header.classList.remove("is-expanding-header", "is-collapsing-header");
        header.classList.add(isCompact ? "is-collapsing-header" : "is-expanding-header");
        transitionStateTimer = window.setTimeout(() => {
          header.classList.remove("is-expanding-header", "is-collapsing-header");
          transitionStateTimer = 0;
          updateHeaderOffset();
        }, transitionStateMs);

        stateLockScrollY = currentScrollY;
        stateLockUntil = window.performance.now() + transitionStateMs + 80;
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

  function initAccessibleThemeToggle({ site = window.SITE || {}, applyAccessibleTheme = () => {} } = {}) {
    let toggle = document.querySelector("[data-accessible-theme-toggle]");
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "accessible-fab";
      toggle.setAttribute("data-accessible-theme-toggle", "");
      toggle.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path fill="currentColor" d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/>
        </svg>
        <span class="accessible-fab-label"></span>
      `;
      document.body.appendChild(toggle);
    }

    const labelSpan = toggle.querySelector(".accessible-fab-label");
    const update = (state) => {
      const themeUi = site.ui?.documentPreview?.accessibleTheme || {};
      if (labelSpan) {
        labelSpan.textContent = state 
          ? themeUi.disable || "Звичайна версія" 
          : themeUi.enable || "Спрощена версія";
      }
      toggle.title = labelSpan.textContent;
      toggle.classList.toggle("is-active", state);
    };

    toggle.onclick = (e) => {
      e.preventDefault();
      const next = localStorage.getItem("site-accessible") !== "true";
      localStorage.setItem("site-accessible", next);
      applyAccessibleTheme(next);
      update(next);
    };

    update(localStorage.getItem("site-accessible") === "true");
  }

  function applyAccessibleTheme(state = null) {
    const active = state !== null ? state : localStorage.getItem("site-accessible") === "true";
    const baseTheme = localStorage.getItem("site-theme") || "light";
    
    if (active) {
      document.documentElement.setAttribute("data-theme", "accessible");
    } else {
      document.documentElement.setAttribute("data-theme", baseTheme);
    }
  }

  window.SiteHeaderUi = {
    initAccessibleThemeToggle,
    applyAccessibleTheme,
    applyThemeAssets,
    ensureControls: ensureHeaderControls,
    initBrand: initHeaderBrand,
    initLanguageToggle,
    initScrollState: initHeaderScrollState,
    initSocials: initHeaderSocials,
    initThemeToggle,
    syncHomeTitleLayout
  };
})();
