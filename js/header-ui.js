(() => {
  const preferenceFallback = new Map();

  function readPreference(key) {
    if (preferenceFallback.has(key)) {
      return preferenceFallback.get(key);
    }
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writePreference(key, value) {
    const storedValue = String(value);
    try {
      localStorage.setItem(key, storedValue);
      preferenceFallback.delete(key);
    } catch {
      // Keep controls usable for this page when browser storage is blocked/full.
      preferenceFallback.set(key, storedValue);
    }
  }

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

    const savedTheme = readPreference("site-theme");
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
      const currentTheme = readPreference("site-theme") || "light";
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      
      writePreference("site-theme", nextTheme);
      toggle.classList.toggle("is-dark", nextTheme === "dark");
      updateThemeToggleLabel(nextTheme);
      applyAccessibleTheme(); // Викликаємо загальний аплікатор замість прямого setAttribute
      applyThemeAssets(nextTheme);
    });

    toggle.dataset.bound = "true";
  }

  function applyThemeAssets({ theme = "light", themeAssets = {} } = {}) {
    const asset = theme === "dark" ? themeAssets.dark : themeAssets.light;
    const faviconAsset = theme === "dark"
      ? (themeAssets.faviconDark || asset)
      : (themeAssets.faviconLight || asset);

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

    favicon.href = faviconAsset;
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
      .filter((item) => item.href && isSafeUrl(item.href));

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
    socialBar.textContent = "";
    activeSocials.forEach((item) => {
      const link = document.createElement("a");
      link.className = `site-header-social-link is-${getSafeClassSuffix(item.id)}`;
      setSafeUrlAttribute(link, "href", item.href);
      link.target = "_blank";
      link.rel = "noreferrer";
      link.setAttribute("aria-label", item.label || "");
      link.title = item.label || "";
      link.insertAdjacentHTML("beforeend", getSocialIconMarkup(item.id, "site-header-social-icon"));
      socialBar.appendChild(link);
    });
  }

  let requestHeaderLayout;

  function syncHomeTitleLayout() {
    if (requestHeaderLayout) requestHeaderLayout();
  }

  function measureHomeTitleLayout(header) {
    if (!header) {
      return;
    }

    const viewportWidth = Math.round(window.innerWidth || document.documentElement.clientWidth || 0);
    const isHomePage = document.body.dataset.page === "home";
    if (viewportWidth <= 1480) {
      header.classList.add("is-home-in-brand");
      header.classList.toggle("is-title-split", isHomePage);
      return;
    }

    header.classList.remove("is-home-in-brand");

    const title = header.querySelector("h1");
    const nav = header.querySelector("nav");
    const titleText = title && title.querySelector("[data-site-title]");
    const separator = title && title.querySelector(".site-title-separator");
    const subtitle = title && title.querySelector("[data-site-subtitle]");

    if (!isHomePage) {
      header.classList.remove("is-title-split");
    }

    let titleOverflows = false;

    const titleVisible = document.documentElement.getAttribute("data-theme") !== "accessible";
    if (isHomePage && titleVisible && title && titleText && subtitle) {
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

    const shouldMoveHomeToBrand = titleOverflows || navOverflows;

    header.classList.toggle("is-home-in-brand", shouldMoveHomeToBrand);

    if (isHomePage) {
      header.classList.toggle("is-title-split", shouldMoveHomeToBrand || titleOverflows || navOverflows);
    }
  }

  function headerItemBox(element, origin) {
    const box = element.getBoundingClientRect();
    return { x: box.left - origin.x, y: box.top - origin.y, w: box.width, h: box.height, borderX: element.clientLeft, borderY: element.clientTop };
  }

  function interpolateHeaderBox(start, end, progress, horizontal = progress) {
    return {
      x: start.x + (end.x - start.x) * horizontal,
      y: start.y + (end.y - start.y) * progress,
      w: start.w + (end.w - start.w) * progress,
      h: start.h + (end.h - start.h) * progress
    };
  }

  function moveHeaderRow(start, end, group, progress, columns, rows) {
    const box = interpolateHeaderBox(start, end, rows, columns);
    const from = group.expanded;
    const to = group.compact;
    const startCenter = from.y + from.h / 2;
    const endCenter = to.y + to.h / 2;
    // Keep the original rows apart until their destination columns are clear.
    box.y += (endCenter - startCenter) * (progress - rows);
    box.w = start.w + (end.w - start.w) * columns;
    return box;
  }

  function positionHeaderItem(item, box, origin, layout) {
    const parent = item.parent;
    const parentBox = parent ? parent.frameBox : origin;
    const border = parent ? parent[layout] : origin;
    const style = item.element.style;
    style.setProperty("--header-item-x", `${(box.x - parentBox.x - border.borderX).toFixed(3)}px`);
    style.setProperty("--header-item-y", `${(box.y - parentBox.y - border.borderY).toFixed(3)}px`);
    style.setProperty("--header-item-width", `${box.w.toFixed(3)}px`);
    style.setProperty("--header-item-height", `${box.h.toFixed(3)}px`);
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

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (brand && pageType === "home" && !brand.dataset.scrollTopBound) {
      brand.addEventListener("click", (event) => {
        if (!("scrollBehavior" in document.documentElement.style)) {
          return;
        }

        event.preventDefault();
        window.scrollTo({ top: 0, left: 0, behavior: reducedMotion.matches ? "instant" : "smooth" });
      });
      brand.dataset.scrollTopBound = "true";
    }

    if (header.dataset.scrollStateReady === "true") {
      return;
    }

    const root = document.documentElement;
    const slot = document.createElement("div");
    slot.className = "site-header-slot";
    slot.style.height = `${header.getBoundingClientRect().height}px`;
    header.parentNode.insertBefore(slot, header);
    slot.appendChild(header);
    const collapseDuration = 260;
    const expandDuration = 240;
    let frame = 0;
    let scrollPosition = Math.max(0, window.scrollY);
    let viewportWidth = window.innerWidth;
    let layoutWidth = root.clientWidth;
    let layoutDirty = true;
    let expandedHeight;
    let compactHeight;
    let expandedPaddingTop;
    let headerBorderHeight;
    let compactLatched = false;
    let compactLayout = false;
    let transition = null;
    let progress = 0;
    let commandedY = null;
    let upwardInputUntil = 0;
    let revealRequested = false;
    let touchPoint = null;
    let touchScrollingUp = false;
    let touchRevealPending = false;
    let touchStillSince = null;
    let lastTime = 0;
    let lastProgress = -1;
    let lastCompactLayout;
    let lastUnderlap = -1;
    let motionItems = [];
    let headerBoxes;
    let headerWidth;
    let stickyHeadings = [];
    let visibleHeight = 0;
    const socialBar = header.querySelector(".site-header-socials");
    const fadingRows = [header.querySelector("h1"), socialBar].filter(Boolean);
    let activeLanguage;

    function updateStickyHeadings() {
      stickyHeadings = Array.from(document.querySelectorAll(".about-details[open] > summary"));
      stickyHeadings.forEach((heading) => heading.style.setProperty("--site-header-offset", `${visibleHeight}px`));
    }

    function measureLayout() {
      // The sticky slot holds its size while we sample the two authored layouts.
      header.setAttribute("data-header-measuring", "");
      header.removeAttribute("data-header-moving");
      header.classList.remove("is-compact");
      measureHomeTitleLayout(header);

      const controls = header.querySelector(".site-header-controls");
      activeLanguage = header.querySelector(".language-toggle-option.is-active");
      const nav = header.querySelector("nav");
      const logo = header.querySelector(".site-brand-logo");
      motionItems = Array.from(header.querySelectorAll(
        ".site-brand-link, .site-brand-logo, .site-header-controls, .site-header-controls .language-toggle, " +
        ".site-header-controls .theme-toggle, .site-header-controls [data-app-refresh], nav, nav a"
      )).map((element) => ({ element }));
      const controlGroup = motionItems.find((item) => item.element === controls);
      const navGroup = motionItems.find((item) => item.element === nav);
      const brandItem = motionItems.find((item) => item.element === brand);
      const expanded = header.getBoundingClientRect();
      headerWidth = expanded.width;
      expandedHeight = expanded.height;
      headerBoxes = { expanded: headerItemBox(header, expanded) };
      const expandedStyle = window.getComputedStyle(header);
      expandedPaddingTop = parseFloat(expandedStyle.paddingTop) || 0;
      headerBorderHeight = (parseFloat(expandedStyle.borderTopWidth) || 0) +
        (parseFloat(expandedStyle.borderBottomWidth) || 0);
      motionItems.forEach((item) => {
        item.expanded = headerItemBox(item.element, expanded);
        item.navLink = nav && nav.contains(item.element) && item !== navGroup;
        if (item.navLink) item.expandedFont = parseFloat(window.getComputedStyle(item.element).fontSize);
      });

      header.classList.add("is-compact");
      const compact = header.getBoundingClientRect();
      headerBoxes.compact = headerItemBox(header, compact);
      compactHeight = compact.height;
      motionItems.forEach((item) => {
        item.compact = headerItemBox(item.element, compact);
        item.controlGroup = item === controlGroup;
        item.control = controls && item.element.parentElement === controls;
        if (item.navLink) item.compactFont = parseFloat(window.getComputedStyle(item.element).fontSize);
        item.parent = item.control ? controlGroup : item.navLink ? navGroup : item.element === logo ? brandItem : null;
      });
      motionItems.forEach((item) => {
        const element = item.element;
        element.setAttribute("data-header-motion", "");
      });
      layoutDirty = false;
      lastProgress = -1;
      slot.style.height = `${expandedHeight}px`;
      updateStickyHeadings();
    }

    function renderProgress(progress) {
      if (progress === lastProgress && compactLayout === lastCompactLayout) {
        return;
      }
      // The taller wide dock needs to adopt its compact controls sooner.
      const fadeEnd = viewportWidth > 1480 && root.dataset.theme !== "accessible" ? 0.42 : 0.52;
      const socialFadeEnd = 0.36;
      const fade = Math.max(0, 1 - progress / fadeEnd);
      if (progress >= socialFadeEnd && lastProgress < socialFadeEnd && brand && socialBar && socialBar.contains(document.activeElement)) {
        brand.focus({ preventScroll: true });
      }
      lastProgress = progress;
      lastCompactLayout = compactLayout;
      visibleHeight = expandedHeight + (compactHeight - expandedHeight) * progress;
      const moving = progress > 0 && !compactLayout;
      const layout = progress >= fadeEnd ? "compact" : "expanded";
      const offset = `${visibleHeight}px`;
      const socialFade = Math.max(0, 1 - progress / socialFadeEnd);
      const opacity = fade.toFixed(3);
      const shift = `${(-8 * progress).toFixed(2)}px`;
      root.style.setProperty("--site-header-offset", offset);
      stickyHeadings.forEach((heading) => heading.style.setProperty("--site-header-offset", offset));
      fadingRows.forEach((element) => {
        element.style.setProperty("--header-title-opacity", element === socialBar ? socialFade.toFixed(3) : opacity);
        element.style.setProperty("--header-title-shift", shift);
      });
      header.classList.toggle("is-compact", layout === "compact");
      if (!moving) {
        header.removeAttribute("data-header-moving");
        header.classList.remove("is-header-content-hidden");
        return;
      }

      header.setAttribute("data-header-moving", layout);
      header.style.setProperty("--header-moving-height", offset);
      header.style.setProperty("--header-moving-padding-top", `${Math.min(expandedPaddingTop, Math.max(0, visibleHeight - headerBorderHeight))}px`);
      if (activeLanguage) {
        activeLanguage.style.setProperty("--header-title-opacity", opacity);
        activeLanguage.style.setProperty("--header-item-visibility", fade < 0.1 ? "hidden" : "visible");
      }
      header.classList.toggle("is-header-content-hidden", socialFade === 0);

      const columns = Math.min(progress / fadeEnd, 1);
      const rows = Math.max((progress - fadeEnd) / (1 - fadeEnd), 0);
      motionItems.forEach((item) => {
        const style = item.element.style;
        if (item.navLink) {
          const fontSize = item.expandedFont + (item.compactFont - item.expandedFont) * columns;
          style.setProperty("--header-item-font-size", `${fontSize.toFixed(3)}px`);
        }
        if (!item.compact.w || !item.expanded.w) {
          const itemFade = Math.max(0, 1 - progress / 0.2);
          const shown = item.expanded.w ? itemFade : rows;
          style.setProperty("--header-item-opacity", shown.toFixed(3));
          style.setProperty("--header-item-visibility", shown === 0 ? "hidden" : "visible");
          const native = item[layout];
          const parent = item.parent;
          item.frameBox = {
            ...native,
            y: parent ? native.y + parent.frameBox.y - parent[layout].y : native.y
          };
          positionHeaderItem(item, item.frameBox, headerBoxes[layout], layout);
          return;
        }

        style.removeProperty("--header-item-opacity");
        style.removeProperty("--header-item-visibility");
        const group = item.controlGroup ? item : item.control || item.navLink ? item.parent : null;
        const box = group
          ? moveHeaderRow(item.expanded, item.compact, group, progress, columns, rows)
          : interpolateHeaderBox(item.expanded, item.compact, progress);
        if (item.control) {
          // Keep each control's native content at its authored size as it travels.
          const native = item[layout];
          const center = box.x + box.w / 2;
          box.y += (box.h - native.h) / 2;
          if (viewportWidth > 900 &&
              item.expanded.y + item.expanded.h <= expandedHeight + 1 &&
              item.compact.y + item.compact.h <= compactHeight + 1) {
            box.y = Math.max(0, Math.min(box.y, visibleHeight - native.h));
          }
          box.x = Math.max(0, Math.min(center - native.w / 2, headerWidth - native.w - 4));
          box.w = native.w;
          box.h = native.h;
        }
        item.frameBox = box;
        positionHeaderItem(item, box, headerBoxes[layout], layout);
      });
    }

    function releaseScroll() {
      if (transition && transition.scrollFrom !== null) {
        transition.scrollFrom = null;
        root.removeAttribute("data-header-aligning");
      }
    }

    function cancelScrollIntent() {
      upwardInputUntil = 0;
      revealRequested = false;
      touchScrollingUp = false;
      touchRevealPending = false;
      releaseScroll();
    }

    function beginTransition(nextCompact, alignScroll, initial) {
      releaseScroll();
      compactLatched = nextCompact;
      const target = nextCompact ? 1 : 0;
      if (initial || progress === target) {
        progress = target;
        transition = null;
        return;
      }

      transition = {
        from: progress,
        target,
        elapsed: 0,
        duration: Math.max(70, (nextCompact ? collapseDuration : expandDuration) * Math.abs(target - progress)),
        scrollFrom: alignScroll ? scrollPosition : null,
        scrollX: alignScroll ? window.scrollX : 0
      };
      if (alignScroll) {
        root.setAttribute("data-header-aligning", "");
      }
    }

    function advanceTransition(delta) {
      const motion = transition;
      const t = reducedMotion.matches ? 1 : Math.min(1, (motion.elapsed += delta) / motion.duration);
      const eased = t * t * (3 - 2 * t);

      if (motion.scrollFrom !== null) {
        // Native upward input may get there first. Never scroll back down to
        // recover a frame, and reserve zero for the final shared frame.
        const nextY = t === 1 ? 0 : Math.max(1, Math.round(motion.scrollFrom * (1 - eased)));
        if (nextY < scrollPosition) {
          commandedY = nextY;
          window.scrollTo(motion.scrollX, nextY);
          scrollPosition = Math.max(0, window.scrollY);
        }
      }

      progress = t === 1 ? motion.target : motion.from + (motion.target - motion.from) * eased;
      if (t === 1) {
        releaseScroll();
        transition = null;
      }
    }

    function syncHeaderState(now, initial = false) {
      frame = 0;
      const delta = Math.min(28, Math.max(0, now - lastTime));
      lastTime = now;
      const wasDirty = layoutDirty;
      if (wasDirty) {
        measureLayout();
      }

      // Begin a collapse only where there is room for the compact endpoint.
      // The smaller return threshold keeps a reversal near the entry stable.
      const heightChange = expandedHeight - compactHeight;
      const clearance = Math.max(36, heightChange);
      const startThreshold = Math.max(Math.ceil(heightChange), Math.min(viewportWidth <= 900 ? 92 : 132, clearance + 10));
      const returnThreshold = Math.min(clearance, startThreshold - 8);
      const y = scrollPosition;
      if (touchScrollingUp && !touchPoint) {
        // If no scrollend arrives, wait for stable frames after release.
        // Each native scroll step starts the observation again.
        if (touchStillSince === null) touchStillSince = now;
        if (now - touchStillSince >= 48) touchScrollingUp = false;
      }
      if (compactLatched && y <= returnThreshold) {
        // Anchors, focus and restoration can change the header state without
        // handing over the scroll position. Only an upward gesture can do so.
        const alignScroll = y > 0 && (revealRequested || touchRevealPending);
        touchRevealPending = alignScroll && touchScrollingUp;
        if (!touchRevealPending) beginTransition(false, alignScroll, initial);
      } else if (!touchScrollingUp) {
        touchRevealPending = false;
        if (!compactLatched && y >= startThreshold) beginTransition(true, false, initial);
      }
      revealRequested = false;

      if (transition) {
        advanceTransition(delta);
      }
      compactLayout = progress === 1;

      const underlap = Math.round(Math.min(Math.max((scrollPosition - 12) / (clearance - 12), 0), 1) * 20);
      if (underlap !== lastUnderlap) {
        header.style.setProperty("--header-underlap-progress", String(underlap / 20));
        header.classList.toggle("is-over-content", underlap > 0);
        lastUnderlap = underlap;
      }
      renderProgress(progress);
      if (wasDirty) {
        header.removeAttribute("data-header-measuring");
      }
      if (transition || (touchScrollingUp && !touchPoint)) {
        requestSync();
      }
    }

    function requestSync() {
      if (!frame) {
        frame = window.requestAnimationFrame(syncHeaderState);
      }
    }

    function requestLayout() {
      layoutDirty = true;
      requestSync();
    }

    function handleResize() {
      const width = window.innerWidth;
      const contentWidth = root.clientWidth;
      if (width !== viewportWidth || contentWidth !== layoutWidth) {
        viewportWidth = width;
        layoutWidth = contentWidth;
        requestLayout();
      }
    }

    function handleScroll() {
      const y = Math.max(0, window.scrollY);
      // A scroll event generated by this frame must not rearm the gesture.
      const owned = y === commandedY;
      const previousY = scrollPosition;
      scrollPosition = y;
      commandedY = null;
      if (owned || y === previousY) {
        return;
      }
      const upward = y < previousY && (touchScrollingUp || window.performance.now() <= upwardInputUntil);
      if (touchScrollingUp) touchStillSince = null;
      else if (!upward) cancelScrollIntent();
      revealRequested = upward;
      requestSync();
    }

    function handleWheel(event) {
      if (!event.isTrusted || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        return;
      }
      if (event.deltaY < 0) {
        if (touchScrollingUp) cancelScrollIntent();
        upwardInputUntil = window.performance.now() + 140;
      }
      if (event.deltaY > 0) cancelScrollIntent();
    }

    function handleTouchStart(event) {
      cancelScrollIntent();
      touchPoint = event.isTrusted && event.touches.length === 1 ? event.touches[0] : null;
    }

    function handleTouchMove(event) {
      if (!event.isTrusted) return;
      if (!touchPoint || event.touches.length !== 1) {
        touchPoint = null;
        cancelScrollIntent();
        return;
      }
      const next = event.touches[0];
      const dy = next.clientY - touchPoint.clientY;
      const dx = next.clientX - touchPoint.clientX;
      if (Math.abs(dy) >= 1 && Math.abs(dy) > Math.abs(dx)) {
        if (dy > 0) {
          touchScrollingUp = true;
          touchStillSince = null;
        } else {
          cancelScrollIntent();
        }
      }
      touchPoint = next;
    }

    function handleTouchEnd() {
      touchPoint = null;
      if (touchScrollingUp) requestSync();
    }

    function handleScrollEnd() {
      if (touchScrollingUp && !touchPoint) {
        touchScrollingUp = false;
        requestSync();
      }
    }

    requestHeaderLayout = requestLayout;
    if (window.MutationObserver) {
      const observer = new MutationObserver(requestLayout);
      observer.observe(header, { childList: true, subtree: true });
      observer.observe(root, { attributes: true, attributeFilter: ["data-theme", "lang"] });
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(requestLayout);
    }
    if (typeof reducedMotion.addEventListener === "function") {
      reducedMotion.addEventListener("change", requestSync);
    } else if (typeof reducedMotion.addListener === "function") {
      reducedMotion.addListener(requestSync);
    }

    header.setAttribute("data-header-enhanced", "");
    header.dataset.scrollStateReady = "true";
    syncHeaderState(window.performance.now(), true);
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("scrollend", handleScrollEnd);
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", () => {
      touchPoint = null;
      cancelScrollIntent();
    }, { passive: true });
    ["pointerdown", "mousedown", "keydown", "focusin", "click", "hashchange", "popstate", "pageshow"].forEach((type) => {
      window.addEventListener(type, cancelScrollIntent, true);
    });
    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("orientationchange", requestLayout, { passive: true });
    document.addEventListener("toggle", (event) => {
      if (event.target.classList && event.target.classList.contains("about-details")) {
        updateStickyHeadings();
      }
    }, true);
  }

  function initAccessibleThemeToggle({ site = window.SITE || {}, applyAccessibleTheme = () => {} } = {}) {
    let toggle = document.querySelector("[data-accessible-theme-toggle]");
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "accessible-fab";
      toggle.setAttribute("data-accessible-theme-toggle", "");
      toggle.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8Z"/>
          <path d="M12 4a8 8 0 0 0 0 16V4Z"/>
        </svg>
        <span class="accessible-fab-label"></span>
      `;
      document.body.appendChild(toggle);
    }

    const labelSpan = toggle.querySelector(".accessible-fab-label");
    const update = (state) => {
      const themeUi = site.ui && site.ui.accessibility ? site.ui.accessibility : {};
      if (labelSpan) {
        labelSpan.textContent = state 
          ? themeUi.regular || "ЗВИЧАЙНА ВЕРСІЯ" 
          : themeUi.simplified || "СПРОЩЕНА ВЕРСІЯ";
      }
      if (typeof window.syncAccessibleFabTitle === "function") {
        window.syncAccessibleFabTitle();
      } else {
        toggle.title = labelSpan.textContent;
      }
      toggle.classList.toggle("is-active", state);
    };

    toggle.onclick = (e) => {
      e.preventDefault();
      const next = readPreference("site-accessible") !== "true";
      writePreference("site-accessible", next);
      applyAccessibleTheme(next);
      update(next);
    };

    update(readPreference("site-accessible") === "true");
  }

  function applyAccessibleTheme(state = null) {
    const active = state !== null ? state : readPreference("site-accessible") === "true";
    const baseTheme = readPreference("site-theme") || "light";
    
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
