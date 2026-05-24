(() => {
  const publicationTypeOrder = ["monograph", "article", "conference", "teaching", "other"];

  function updateImage(selector, image, fallbackImage = null) {
    const source = image || fallbackImage;
    if (!source) {
      return;
    }

    document.querySelectorAll(selector).forEach((element) => {
      element.alt = source.alt || "";
      element.src = source.src;

      if (fallbackImage && fallbackImage.src) {
        element.onerror = () => {
          element.onerror = null;
          element.src = fallbackImage.src;
          element.alt = fallbackImage.alt || source.alt || "";
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

    const yearOptions = years
      .map((year) => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`)
      .join("");
    const typeOptions = types
      .map((type) => {
        const label = getPublicationTypeLabel(type, typeLabels);
        return `<option value="${escapeHtml(type)}">${escapeHtml(label)}</option>`;
      })
      .join("");

    return `
      <div class="about-publications-tools" data-publication-tools>
        <label class="about-publications-field">
          <span>${escapeHtml(paragraph.searchLabel || "Пошук")}</span>
          <input
            type="search"
            data-publication-search
            placeholder="${escapeHtml(paragraph.searchPlaceholder || "")}"
            autocomplete="off"
          >
        </label>
        <label class="about-publications-field">
          <span>${escapeHtml(paragraph.yearLabel || "Рік")}</span>
          <select data-publication-year>
            <option value="">${escapeHtml(paragraph.allYearsLabel || "Усі роки")}</option>
            ${yearOptions}
          </select>
        </label>
        <label class="about-publications-field">
          <span>${escapeHtml(paragraph.typeLabel || "Тип")}</span>
          <select data-publication-type>
            <option value="">${escapeHtml(paragraph.allTypesLabel || "Усі типи")}</option>
            ${typeOptions}
          </select>
        </label>
      </div>
    `;
  }

  function renderPublicationItems(paragraph, items) {
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

    return items
      .map((item) => {
        const typeLabel = getPublicationTypeLabel(item.type, typeLabels);
        const searchText = [item.text, item.year, item.type, typeLabel].filter(Boolean).join(" ");
        const fileLink = item.file
          ? `<a class="about-publication-file" href="${escapeHtml(item.file)}" target="_blank" rel="noopener noreferrer">${escapeHtml(fileLabel)}</a>`
          : "";

        return `
          <li
            data-publication-item
            data-publication-year="${escapeHtml(item.year)}"
            data-publication-type="${escapeHtml(item.type)}"
            data-publication-search="${escapeHtml(searchText.toLocaleLowerCase())}"
          >
            <span class="about-publication-meta">
              <button
                class="about-publication-copy"
                type="button"
                data-copy-citation="${escapeHtml(item.text)}"
                aria-label="${escapeHtml(copyAria)}"
                title="${escapeHtml(copyLabel)}"
              >
                <svg class="copy-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="16" height="16">
                  <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>
                <svg class="check-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="16" height="16">
                  <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </button>
              ${item.year ? `<button type="button" data-publication-filter-year="${escapeHtml(item.year)}" aria-label="Filter publications by ${escapeHtml(item.year)}">${escapeHtml(item.year)}</button>` : ""}
              ${typeLabel ? `<button type="button" data-publication-filter-type="${escapeHtml(item.type)}" aria-label="Filter publications by ${escapeHtml(typeLabel)}">${escapeHtml(typeLabel)}</button>` : ""}
            </span>
            <span class="about-publication-text">${escapeHtml(item.text)}</span>
            ${fileLink}
          </li>
        `;
      })
      .join("");
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

    document.querySelectorAll(selector).forEach((element) => {
      element.innerHTML = paragraphs
        .map((paragraph) => {
          if (typeof paragraph === "string") {
            return `<p>${paragraph}</p>`;
          }

          if (paragraph && paragraph.type === "details") {
            const publicationItems = Array.isArray(paragraph.items)
              ? paragraph.items.map(normalizePublicationItem).filter(Boolean)
              : [];
            const isPublicationList =
              paragraph.variant === "publications" && publicationItems.length;
            const items = isPublicationList
              ? renderPublicationItems(paragraph, publicationItems)
              : Array.isArray(paragraph.items)
                ? paragraph.items.map((item) => `<li>${item}</li>`).join("")
                : "";
            const tools = isPublicationList
              ? renderPublicationTools(paragraph, publicationItems)
              : "";
            const emptyMessage = isPublicationList
              ? `<p class="about-publications-empty" data-publication-empty hidden>${escapeHtml(paragraph.emptyLabel || "Нічого не знайдено")}</p>`
              : "";
            const description = paragraph.description
              ? `<p class="about-details-description">${paragraph.description}</p>`
              : "";

            return `
              <details class="about-details${isPublicationList ? " about-details-publications" : ""}">
                <summary>
                  <span class="about-details-summary-text">${paragraph.summary || defaultDetailsSummary}</span>
                  <span class="about-details-arrow" aria-hidden="true">
                    <span class="about-details-arrow-icon"></span>
                    <span class="about-details-arrow-label" data-open-label="${defaultExpandLabel}" data-close-label="${defaultCloseLabel}">${defaultExpandLabel}</span>
                  </span>
                </summary>
                <div class="about-details-body">
                  ${description}
                  ${tools}
                  <ol class="about-details-list${isPublicationList ? " about-publications-list" : ""}">${items}</ol>
                  ${emptyMessage}
                </div>
              </details>
            `;
          }

          if (paragraph && paragraph.type === "content-details") {
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
    const footerOwner = [site.meta.year ? `© ${site.meta.year}` : "", site.meta.ownerName]
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
    loadDownloadsGroups("files/downloads/files.json", "[data-downloads-groups]", site.downloads.groups || null);
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
