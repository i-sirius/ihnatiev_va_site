(() => {
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

  function renderParagraphs({
    selector,
    paragraphs,
    site = window.SITE || {}
  } = {}) {
    if (!Array.isArray(paragraphs)) {
      return;
    }

    const detailsUi = site.ui?.details || {};
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

    aboutPhoto.querySelector(".about-photo-links")?.remove();

    const researchLinks =
      activityId === "1" && Array.isArray(site.meta?.headerLinks)
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
    const homeTitle = `${site.meta.homeTitle} — ${site.meta.homeSubtitle}`;

    document.documentElement.lang = site.currentLocale || site.defaultLocale || "uk";
    setText("[data-site-title]", site.meta.siteTitle);
    setText("[data-site-subtitle]", site.meta.homeSubtitle);
    setText("[data-home-about-heading]", site.home.aboutHeading);
    setText("[data-home-activities-heading]", site.home.activitiesHeading);
    setText("[data-activity-card-link]", site.ui?.buttons?.open || "Перейти");
    updateImage("[data-home-about-image]", site.home.aboutImage);
    initHomeAboutLightbox(site.home.aboutImage);
    renderParagraphs({
      selector: "[data-home-about-paragraphs]",
      paragraphs: site.home.aboutParagraphs,
      site
    });

    setText("[data-activity-videos-heading]", site.ui?.activitySections?.videos || "Відео");
    setText("[data-activity-photos-heading]", site.ui?.activitySections?.photos || "Фото");
    setText("[data-activity-files-heading]", site.ui?.activitySections?.files || "Файли");

    Object.entries(site.activities).forEach(([id, activity]) => {
      setText(`[data-activity-name='${id}']`, activity.name);
      setText(`[data-activity-card-description='${id}']`, activity.cardDescription);
    });

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

    if (pageType === "home") {
      document.title = homeTitle;
    }
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

    const activity = site.activities?.[activityId];
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

  function applyDownloadsPage({
    site = window.SITE || {},
    pageType,
    setText = () => {},
    loadDownloadsGroups = () => {}
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
    loadDownloadsGroups("files/downloads/files.json", "[data-downloads-groups]", site.downloads.groups || null);
  }

  function applyContactPage({
    pageType,
    site = window.SITE || {},
    setText = () => {},
    escapeHtml = (value) => String(value),
    getSocialIconMarkup = () => ""
  } = {}) {
    window.SiteContactPage?.apply({
      pageType,
      site,
      setText,
      escapeHtml,
      getSocialIconMarkup
    });
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

    const mobileMenu = site.menu?.mobile || {};

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

    document.querySelector(selector)?.setAttribute("aria-current", "page");
  }

  window.SitePageContent = {
    applyActiveMenuState,
    applyActivityPage,
    applyContactPage,
    applyDownloadsPage,
    applyGlobalContent,
    applyMenuLabels,
    initDetailsInteractions,
    renderActivityResearchLinks,
    renderParagraphs,
    updateImage
  };
})();
