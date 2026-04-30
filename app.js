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
  let youtubeFeedLoading = false;
  let currentGalleryItems = [];
  let currentGalleryIndex = 0;
  let visitorCounterValue = null;
  let visitorCounterPromise = null;

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
    let lightbox = document.querySelector("[data-gallery-lightbox]");

    if (!lightbox) {
      lightbox = document.createElement("div");
      lightbox.className = "gallery-lightbox";
      lightbox.hidden = true;
      lightbox.setAttribute("data-gallery-lightbox", "");
      lightbox.innerHTML = `
        <div class="lightbox-stage">
          <div class="lightbox-toolbar">
            <button class="lightbox-close" type="button" data-lightbox-close>×</button>
          </div>
          <div class="lightbox-content">
            <button class="lightbox-nav prev" type="button" data-lightbox-prev>‹</button>
            <figure class="lightbox-figure">
              <img src="" alt="" data-lightbox-image>
              <figcaption class="lightbox-caption" data-lightbox-caption hidden></figcaption>
            </figure>
            <button class="lightbox-nav next" type="button" data-lightbox-next>›</button>
          </div>
        </div>
      `;
      document.body.appendChild(lightbox);
    }

    const galleryUi = SITE.ui?.gallery || {};
    lightbox.querySelector("[data-lightbox-close]")?.setAttribute(
      "aria-label",
      galleryUi.close || "Закрити"
    );
    lightbox.querySelector("[data-lightbox-prev]")?.setAttribute(
      "aria-label",
      galleryUi.previous || "Попереднє фото"
    );
    lightbox.querySelector("[data-lightbox-next]")?.setAttribute(
      "aria-label",
      galleryUi.next || "Наступне фото"
    );

    const image = lightbox.querySelector("[data-lightbox-image]");
    const caption = lightbox.querySelector("[data-lightbox-caption]");

    function updateLightboxImage() {
      const item = currentGalleryItems[currentGalleryIndex];
      if (!item || !image) {
        return;
      }

      image.src = item.src;
      image.alt = item.alt || "";

      if (caption) {
        caption.textContent = item.alt || "";
        caption.hidden = !item.alt;
      }
    }

    function closeLightbox() {
      lightbox.hidden = true;
      document.body.classList.remove("lightbox-open");
    }

    function showByIndex(index) {
      if (!currentGalleryItems.length) {
        return;
      }

      currentGalleryIndex =
        (index + currentGalleryItems.length) % currentGalleryItems.length;
      updateLightboxImage();
      lightbox.hidden = false;
      document.body.classList.add("lightbox-open");
    }

    lightbox.querySelector("[data-lightbox-close]")?.addEventListener("click", closeLightbox);
    lightbox.querySelector("[data-lightbox-prev]")?.addEventListener("click", () => {
      showByIndex(currentGalleryIndex - 1);
    });
    lightbox.querySelector("[data-lightbox-next]")?.addEventListener("click", () => {
      showByIndex(currentGalleryIndex + 1);
    });

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (lightbox.hidden) {
        return;
      }

      if (event.key === "Escape") {
        closeLightbox();
      }

      if (event.key === "ArrowLeft") {
        showByIndex(currentGalleryIndex - 1);
      }

      if (event.key === "ArrowRight") {
        showByIndex(currentGalleryIndex + 1);
      }
    });

    lightbox.showByIndex = showByIndex;
    return lightbox;
  }

  function canPreviewDownloadFile(fileType = "FILE") {
    const normalizedType = String(fileType).toUpperCase();
    return ["PDF", "PNG", "JPG", "JPEG", "WEBP", "GIF", "TXT", "HTM", "HTML"].includes(normalizedType);
  }

  function ensureDocumentLightbox() {
    let lightbox = document.querySelector("[data-document-lightbox]");

    if (!lightbox) {
      lightbox = document.createElement("div");
      lightbox.className = "gallery-lightbox document-lightbox";
      lightbox.hidden = true;
      lightbox.setAttribute("data-document-lightbox", "");
      lightbox.innerHTML = `
        <div class="lightbox-stage document-lightbox-stage">
          <div class="lightbox-toolbar document-lightbox-toolbar">
            <div class="document-lightbox-meta">
              <span class="document-lightbox-filetype" data-document-filetype></span>
              <span class="document-lightbox-title" data-document-title></span>
            </div>
            <div class="document-lightbox-actions">
              <a
                class="document-lightbox-link"
                href="#"
                target="_blank"
                rel="noreferrer"
                data-document-open
              ></a>
              <a
                class="document-lightbox-link is-download"
                href="#"
                download
                data-document-download
              ></a>
              <button class="lightbox-close" type="button" data-document-close>×</button>
            </div>
          </div>
          <div class="document-lightbox-view">
            <iframe
              class="document-lightbox-frame"
              data-document-frame
              hidden
            ></iframe>
            <div class="document-lightbox-fallback" data-document-fallback hidden>
              <p class="document-lightbox-fallback-title" data-document-fallback-title></p>
              <p class="document-lightbox-fallback-text" data-document-fallback-text></p>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(lightbox);
    }

    const previewUi = SITE.ui?.documentPreview || {};
    lightbox.querySelector("[data-document-open]")?.replaceChildren(
      document.createTextNode(previewUi.open || "Відкрити окремо")
    );
    lightbox.querySelector("[data-document-download]")?.replaceChildren(
      document.createTextNode(previewUi.download || "Завантажити")
    );
    lightbox.querySelector("[data-document-close]")?.setAttribute(
      "aria-label",
      previewUi.close || "Закрити"
    );
    lightbox.querySelector("[data-document-frame]")?.setAttribute(
      "title",
      previewUi.frameTitle || "Попередній перегляд файла"
    );
    const fallbackTitle = lightbox.querySelector("[data-document-fallback-title]");
    const fallbackText = lightbox.querySelector("[data-document-fallback-text]");
    if (fallbackTitle) {
      fallbackTitle.textContent =
        previewUi.unavailableTitle ||
        "Попередній перегляд у вікні сайту для цього формату недоступний.";
    }
    if (fallbackText) {
      fallbackText.textContent =
        previewUi.unavailableText ||
        "Можна відкрити файл окремо або одразу завантажити його кнопкою вище.";
    }

    const frame = lightbox.querySelector("[data-document-frame]");
    const fallback = lightbox.querySelector("[data-document-fallback]");
    const title = lightbox.querySelector("[data-document-title]");
    const filetype = lightbox.querySelector("[data-document-filetype]");
    const openLink = lightbox.querySelector("[data-document-open]");
    const downloadLink = lightbox.querySelector("[data-document-download]");

    function closeLightbox() {
      lightbox.hidden = true;
      document.body.classList.remove("lightbox-open");
      frame?.setAttribute("hidden", "");
      fallback?.setAttribute("hidden", "");

      if (frame) {
        frame.src = "about:blank";
      }
    }

    function showPreview(file = {}) {
      const href = file.href || "#";
      const label =
        getLocalizedValue(file.label, "") ||
        href ||
        (previewUi.fileFallbackLabel || "Файл");
      const type = getDownloadFileType(file);

      if (title) {
        title.textContent = label;
      }

      if (filetype) {
        filetype.textContent = type;
      }

      if (openLink) {
        openLink.href = href;
      }

      if (downloadLink) {
        downloadLink.href = href;
        downloadLink.setAttribute("download", "");
      }

      if (canPreviewDownloadFile(type) && frame) {
        frame.hidden = false;
        fallback?.setAttribute("hidden", "");
        frame.src = type === "PDF" ? `${href}#toolbar=1&navpanes=0&view=FitH` : href;
      } else {
        frame?.setAttribute("hidden", "");

        if (frame) {
          frame.src = "about:blank";
        }

        fallback?.removeAttribute("hidden");
      }

      lightbox.hidden = false;
      document.body.classList.add("lightbox-open");
    }

    lightbox.querySelector("[data-document-close]")?.addEventListener("click", closeLightbox);

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (lightbox.hidden) {
        return;
      }

      if (event.key === "Escape") {
        closeLightbox();
      }
    });

    lightbox.showPreview = showPreview;
    return lightbox;
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
          currentGalleryItems = images;
          currentGalleryIndex = Number(button.dataset.galleryIndex || "0");
          lightbox.showByIndex(currentGalleryIndex);
        });
      });

      applyPortraitState(element);
    });
  }

  function renderDownloads(selector, files) {
    if (!Array.isArray(files)) {
      return;
    }

    document.querySelectorAll(selector).forEach((element) => {
      element.innerHTML = files.map((file) => renderDownloadListItem(file)).join("");
    });
  }

  function getDownloadFileType(file = {}) {
    const source = `${file.href || ""} ${getLocalizedValue(file.label, "")}`;
    const match = source.match(/\.([a-z0-9]{2,5})(?:$|[?#\s])/i);
    return (match?.[1] || "file").toUpperCase();
  }

  function getPurchaseHref(file = {}) {
    const purchase = file.purchase;
    if (!purchase || typeof purchase !== "object") {
      return "";
    }

    const directHref = getLocalizedValue(purchase.href, "");
    if (directHref) {
      return directHref;
    }

    if (purchase.mode !== "contact") {
      return "";
    }

    const params = new URLSearchParams();
    const subject = getLocalizedValue(purchase.subject, "");
    const message = getLocalizedValue(purchase.message, "");

    if (subject) {
      params.set("subject", subject);
    }

    if (message) {
      params.set("message", message);
    }

    const query = params.toString();
    return `contact.html${query ? `?${query}` : ""}`;
  }

  function getDownloadFileIconMarkup(fileType = "FILE") {
    const normalizedType = String(fileType).toUpperCase();

    if (normalizedType === "PDF") {
      return `
        <svg class="download-file-icon is-pdf" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M6 2.8h8.4L20 8.4V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4.8a2 2 0 0 1 2-2Zm7.8 1.8v4.3h4.3L13.8 4.6ZM8 17.8v-6h2.6c1.5 0 2.4.8 2.4 2.1 0 1.4-.9 2.2-2.4 2.2H9.5v1.7H8Zm1.5-3h1c.6 0 1-.3 1-.9s-.4-.8-1-.8h-1v1.7Zm4.4 3v-6h2.3c1.9 0 3.2 1.2 3.2 3s-1.3 3-3.2 3h-2.3Zm1.5-1.3h.7c1.1 0 1.8-.7 1.8-1.8s-.7-1.8-1.8-1.8h-.7v3.6Zm4.7 1.3v-6h3.9v1.3h-2.4v1.2h2.1v1.3h-2.1v2.2h-1.5Z"/>
        </svg>
      `;
    }

    if (normalizedType === "DOC" || normalizedType === "DOCX") {
      return `
        <svg class="download-file-icon is-doc" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M6 2.8h8.4L20 8.4V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4.8a2 2 0 0 1 2-2Zm7.8 1.8v4.3h4.3L13.8 4.6ZM7.8 17.8v-6H10c1.9 0 3.1 1.2 3.1 3s-1.2 3-3.1 3H7.8Zm1.5-1.3H10c1 0 1.6-.6 1.6-1.7S11 13.1 10 13.1H9.3v3.4Zm7.2 1.4c-1.7 0-2.8-1.2-2.8-3.1s1.1-3.1 2.8-3.1 2.8 1.2 2.8 3.1-1.1 3.1-2.8 3.1Zm0-1.3c.8 0 1.3-.7 1.3-1.8s-.5-1.8-1.3-1.8-1.3.7-1.3 1.8.5 1.8 1.3 1.8Z"/>
        </svg>
      `;
    }

    if (normalizedType === "DJVU" || normalizedType === "DJV") {
      return `
        <svg class="download-file-icon is-djvu" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M6 2.8h8.4L20 8.4V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4.8a2 2 0 0 1 2-2Zm7.8 1.8v4.3h4.3L13.8 4.6ZM7.7 17.8v-6h1.5v4.7h2.3v1.3H7.7Zm5.2.1c-1 0-1.8-.3-2.4-.9l.8-1.1c.4.4.8.6 1.4.6.6 0 .9-.3.9-.8v-3.9h1.5v3.9c0 1.4-.8 2.2-2.2 2.2Zm5.2 0c-1.8 0-2.9-1.2-2.9-3.1s1.1-3.1 2.9-3.1c1 0 1.8.4 2.3 1l-.9 1c-.3-.4-.8-.7-1.4-.7-.9 0-1.4.7-1.4 1.8s.6 1.8 1.4 1.8c.6 0 1.1-.3 1.4-.7l.9 1c-.5.7-1.3 1-2.3 1Z"/>
        </svg>
      `;
    }

    return `
      <svg class="download-file-icon is-file" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M6 2.8h8.4L20 8.4V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4.8a2 2 0 0 1 2-2Zm7.8 1.8v4.3h4.3L13.8 4.6ZM8 17.7v-5.8h1.5v4.5h2.6v1.3H8Zm5-5.8h1.5v5.8H13v-5.8Zm2.8 0h4.1v1.3h-2.6v1h2.2v1.3h-2.2v2.2h-1.5v-5.8Z"/>
      </svg>
    `;
  }

  function renderDownloadListItem(file = {}) {
    const fileType = getDownloadFileType(file);
    const href = file.href || "#";
    const label =
      getLocalizedValue(file.label, "") ||
      file.href ||
      SITE.ui?.documentPreview?.fileFallbackLabel ||
      "Файл";
    const safeHref = escapeHtml(href);
    const safeLabel = escapeHtml(label);
    const safeType = escapeHtml(fileType);
    const previewUi = SITE.ui?.documentPreview || {};
    const purchaseLabel = getLocalizedValue(
      file.purchase?.label,
      previewUi.purchase || "Замовити e-book"
    );
    const purchaseHref = getPurchaseHref(file);
    const actions = [
      `
        <a
          class="download-link-action"
          href="${safeHref}"
          download
          aria-label="${escapeHtml(
            `${previewUi.downloadAria || "Завантажити"} ${label}`
          )}"
          title="${escapeHtml(previewUi.download || "Завантажити")}"
        >↓</a>
      `
    ];

    if (purchaseHref) {
      actions.unshift(`
        <a
          class="download-purchase-action"
          href="${escapeHtml(purchaseHref)}"
          aria-label="${escapeHtml(
            `${previewUi.purchaseAria || "Замовити"} ${label}`
          )}"
          title="${escapeHtml(previewUi.purchaseTitle || "Замовити електронну книгу")}"
        >${escapeHtml(purchaseLabel)}</a>
      `);
    }

    return `
      <li>
        <div class="download-row">
          <button
            class="download-preview-trigger"
            type="button"
            data-download-preview
            data-preview-href="${safeHref}"
            data-preview-label="${safeLabel}"
            data-preview-type="${safeType}"
            aria-label="${escapeHtml(
              `${previewUi.previewAria || "Переглянути"} ${label}`
            )}"
          >
            <span class="download-link-main">
              <span class="download-filetype" aria-hidden="true">
                ${getDownloadFileIconMarkup(fileType)}
              </span>
              <span class="download-link-text">${safeLabel}</span>
            </span>
          </button>
          <div class="download-actions">${actions.join("")}</div>
        </div>
      </li>
    `;
  }

  function renderDownloadGroupFiles(files = []) {
    if (!Array.isArray(files) || !files.length) {
      return `<p class="download-group-empty">${escapeHtml(
        SITE.ui?.downloads?.empty || "Файли тимчасово відсутні."
      )}</p>`;
    }

    return `
      <ul class="download-list">
        ${files.map((file) => renderDownloadListItem(file)).join("")}
      </ul>
    `;
  }

  function renderDownloadsGroups(selector, groups) {
    if (!groups || typeof groups !== "object") {
      return;
    }

    document.querySelectorAll(selector).forEach((element) => {
      const monographs = Array.isArray(groups.monographs) ? groups.monographs : [];
      const articleGroups = Array.isArray(groups.articles) ? groups.articles : [];
      const downloadsUi = SITE.ui?.downloads || {};

      element.innerHTML = `
        <section class="download-group download-group-main">
          <h3 class="download-group-title">${escapeHtml(
            downloadsUi.monographsTitle || "МОНОГРАФІЇ"
          )}</h3>
          ${renderDownloadGroupFiles(monographs)}
        </section>
        <section class="download-group download-group-main">
          <h3 class="download-group-title">${escapeHtml(
            downloadsUi.articlesTitle || "СТАТТІ"
          )}</h3>
          <div class="download-subgroups">
            ${articleGroups
              .map(
                (group) => `
                  <details class="download-subgroup">
                    <summary>
                      <span class="download-subgroup-title">${escapeHtml(
                        getLocalizedValue(
                          group.title,
                          downloadsUi.subgroupFallback || "РОЗДІЛ"
                        )
                      )}</span>
                      <span class="download-subgroup-toggle" aria-hidden="true"></span>
                    </summary>
                    <div class="download-subgroup-body">
                      ${renderDownloadGroupFiles(group.files)}
                    </div>
                  </details>
                `
              )
              .join("")}
          </div>
        </section>
      `;
    });
  }

  function renderVideoCards(selector, videos) {
    if (!Array.isArray(videos)) {
      return;
    }

    const watchLabel = SITE.ui?.video?.watch || "ДИВИТИСЬ";

    document.querySelectorAll(selector).forEach((element) => {
      element.innerHTML = videos
        .map(
          (video) => `
            <a class="activity-card video-card" href="${video.url}" target="_blank" rel="noopener noreferrer">
              <img class="video-card-thumb" src="${video.thumbnail}" alt="${video.title}" loading="lazy">
              <h3>${video.title}</h3>
              <span class="button-link video-card-link">${watchLabel}</span>
            </a>
          `
        )
        .join("");
    });
  }

  function renderYoutubeFallback(selector) {
    const playlistUrl =
      "https://youtube.com/playlist?list=PLJiTnA91mVyQTsyn7L64mxggDWd4H63gH&si=PLaUlRCYsZ0n6Mfo";
    const playlistLabel = SITE.ui?.video?.playlist || "Плейлист каналу";
    const watchLabel = SITE.ui?.video?.watch || "ДИВИТИСЬ";

    document.querySelectorAll(selector).forEach((element) => {
      element.innerHTML = `
        <a class="activity-card video-card video-card-fallback" href="${playlistUrl}" target="_blank" rel="noopener noreferrer">
          <div class="video-card-thumb video-card-thumb-fallback">${escapeHtml(
            SITE.ui?.video?.fallbackTitle || "YouTube"
          )}</div>
          <h3>${playlistLabel}</h3>
          <span class="button-link video-card-link">${watchLabel}</span>
        </a>
      `;
    });
  }

  function renderYoutubeLoading(selector) {
    document.querySelectorAll(selector).forEach((element) => {
      element.innerHTML = Array.from({ length: 3 })
        .map(
          () => `
            <article class="activity-card video-card video-card-loading" aria-hidden="true">
              <div class="video-card-thumb video-card-thumb-loading"></div>
              <div class="video-card-line video-card-line-title"></div>
              <div class="video-card-line video-card-line-button"></div>
            </article>
          `
        )
        .join("");
    });
  }

  function getYoutubeCacheKey(channelId) {
    return `youtube-feed:${channelId}`;
  }

  function readYoutubeCache(channelId) {
    try {
      const raw = localStorage.getItem(getYoutubeCacheKey(channelId));
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.videos) ? parsed.videos.slice(0, 6) : [];
    } catch {
      return [];
    }
  }

  function writeYoutubeCache(channelId, videos) {
    try {
      localStorage.setItem(
        getYoutubeCacheKey(channelId),
        JSON.stringify({
          updatedAt: Date.now(),
          videos
        })
      );
    } catch {
      // Ignore storage errors and continue rendering normally.
    }
  }

  function fetchWithTimeout(url, responseParser, timeoutMs = 9000) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed for ${url}`);
        }

        return responseParser(response);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });
  }

  function fetchYoutubeFeedXml(channelId) {
    const cacheBuster = `t=${Date.now()}`;
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}&${cacheBuster}`;
    const getUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;
    const rawUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
    const attempts = [
      () =>
        fetchWithTimeout(getUrl, (response) => response.json()).then((payload) => {
          if (typeof payload?.contents === "string" && payload.contents.trim()) {
            return payload.contents;
          }

          throw new Error("Empty AllOrigins get payload");
        }),
      () => fetchWithTimeout(rawUrl, (response) => response.text()),
      () =>
        fetchWithTimeout(getUrl, (response) => response.json(), 12000).then((payload) => {
          if (typeof payload?.contents === "string" && payload.contents.trim()) {
            return payload.contents;
          }

          throw new Error("Retry AllOrigins get payload is empty");
        }),
      () => fetchWithTimeout(rawUrl, (response) => response.text(), 12000)
    ];

    let chain = Promise.reject(new Error("Initial YouTube feed attempt"));
    attempts.forEach((attempt) => {
      chain = chain.catch(() => attempt());
    });

    return chain;
  }

  function fetchJson(url) {
    return fetch(url).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load ${url}`);
      }

      return response.json();
    });
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
    const activity = SITE.activities?.[id];
    const fallbackImages = Array.isArray(activity?.gallery) ? activity.gallery : [];

    fetchJson(`files/media/activity${id}/photos.json`)
      .then((images) => {
        const galleryImages = Array.isArray(images) ? images : fallbackImages;
        return filterAvailableImages(galleryImages).then((availableImages) => {
          renderGallery(selector, availableImages);
        });
      })
      .catch(() => {
        filterAvailableImages(fallbackImages).then((availableImages) => {
          renderGallery(selector, availableImages);
        });
      });
  }

  function loadFileList(path, selector, fallbackFiles = []) {
    fetchJson(path)
      .then((files) => {
        renderDownloads(selector, Array.isArray(files) ? files : fallbackFiles);
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
    ensureDocumentLightbox();

    if (document.body.dataset.downloadPreviewReady === "true") {
      return;
    }

    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-download-preview]");
      if (!trigger) {
        return;
      }

      event.preventDefault();
      ensureDocumentLightbox().showPreview({
        href: trigger.getAttribute("data-preview-href") || "",
        label: trigger.getAttribute("data-preview-label") || "",
        type: trigger.getAttribute("data-preview-type") || ""
      });
    });

    document.body.dataset.downloadPreviewReady = "true";
  }

  function loadYoutubeFeed() {
    const target = document.querySelector("[data-activity-videos]");
    const channelId = SITE.youtubeChannelId;

    if (!target || !channelId || youtubeFeedLoading) {
      return;
    }

    youtubeFeedLoading = true;
    const cachedVideos = readYoutubeCache(channelId);

    if (cachedVideos.length) {
      renderVideoCards("[data-activity-videos]", cachedVideos);
    } else {
      renderYoutubeLoading("[data-activity-videos]");
    }

    fetchYoutubeFeedXml(channelId)
      .then((xmlText) => {
        const xml = new DOMParser().parseFromString(xmlText, "application/xml");
        if (xml.querySelector("parsererror")) {
          throw new Error("Invalid YouTube XML");
        }

        const items = Array.from(xml.querySelectorAll("entry")).slice(0, 6);
        const videos = items
          .map((item) => {
            const videoId =
              item.getElementsByTagName("yt:videoId")[0]?.textContent?.trim() ||
              item.getElementsByTagName("videoId")[0]?.textContent?.trim();

            if (!videoId) {
              return null;
            }

            return {
              title:
                item.querySelector("title")?.textContent?.trim() ||
                SITE.ui?.video?.fallbackTitle ||
                "YouTube video",
              thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              url: `https://www.youtube.com/watch?v=${videoId}`
            };
          })
          .filter(Boolean);

        if (videos.length) {
          writeYoutubeCache(channelId, videos);
          renderVideoCards("[data-activity-videos]", videos);
        } else {
          renderYoutubeFallback("[data-activity-videos]");
        }
      })
      .catch(() => {
        if (cachedVideos.length) {
          renderVideoCards("[data-activity-videos]", cachedVideos);
        } else {
          renderYoutubeFallback("[data-activity-videos]");
        }
      })
      .finally(() => {
        youtubeFeedLoading = false;
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
      label.textContent = languageUi.label || "Мова";
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
          const isActive = locale === SITE.currentLocale;

          return `
            <button
              class="language-toggle-option${isActive ? " is-active" : ""}"
              type="button"
              data-language-option="${locale}"
              aria-pressed="${isActive ? "true" : "false"}"
              title="${escapeHtml(localeName)}"
            >${escapeHtml(optionLabel)}</button>
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
          <span class="theme-toggle-thumb"></span>
        </span>
      `;
      controls.appendChild(toggle);
    }

    const toggleLabel = toggle.querySelector("[data-theme-toggle-label]");
    const themeUi = SITE.ui?.theme || {};

    function updateThemeToggleLabel(currentTheme) {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      const nextThemeIcon = nextTheme === "dark" ? "🌙" : "☀️";
      const nextThemeText =
        nextTheme === "dark"
          ? themeUi.nextDark || "Темна тема"
          : themeUi.nextLight || "Світла тема";
      toggleLabel.innerHTML = `
        <span class="theme-toggle-icon" aria-hidden="true">${nextThemeIcon}</span>
        <span class="theme-toggle-text">${nextThemeText}</span>
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
          <path fill="currentColor" d="M3.7 5.4c1.2-1.6 3-2.4 5.1-2.4 2.5 0 4.5 1.2 6 3.5l1.4-2.1h4l-3.4 5 3.8 5.5h-4l-1.8-2.6c-1.3 1.7-3.2 2.6-5.5 2.6-2.2 0-4-.8-5.3-2.5C2.7 11 2 9.8 2 8.4c0-1 .3-2 .9-3Zm2.5 1.2c-.6.7-.9 1.5-.9 2.3 0 .9.3 1.7 1 2.4.7.7 1.5 1.1 2.5 1.1 1.6 0 2.9-.8 3.9-2.5-.9-1.7-2.2-2.6-3.9-2.6-1 0-1.8.4-2.6 1.1Zm11.2 9.2h4.2v4.2h-4.2z"/>
        </svg>
      `;
    }

    if (id === "orcid") {
      return `
        <svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2Zm-4 4.6a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Zm1.1 10.9H6.8v-7.4h2.3v7.4Zm7.4 0h-3.1l-2.8-4.2v4.2H8.4v-7.4h4.1c2 0 3.2 1.1 3.2 2.9 0 1.5-.8 2.4-2.1 2.7l2.9 4.2Zm-3.9-5.7h-2v1.8h2c.7 0 1.1-.4 1.1-.9s-.4-.9-1.1-.9Z"/>
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
    if (pageType !== "activity" || activityId !== "1") {
      return;
    }

    const aboutPhoto = document.querySelector(".about-photo");
    if (!aboutPhoto) {
      return;
    }

    aboutPhoto.querySelector(".about-photo-links")?.remove();

    const researchLinks = Array.isArray(SITE.meta?.headerLinks)
      ? SITE.meta.headerLinks.filter(
          (item) =>
            item.id === "webofscience" || item.id === "orcid" || item.id === "googlescholar"
        )
      : [];
    const activeLinks = researchLinks.filter((item) => item.href);

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
            href="${item.href}"
            target="_blank"
            rel="noreferrer"
            aria-label="${item.label}"
            title="${item.label}"
          >
            ${getSocialIconMarkup(item.id, "about-photo-link-icon")}
            <span>${item.label}</span>
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
      brand.href = "#top";
      brand.title = SITE.ui?.header?.backToTop || "Нагору сторінки";
    }

    if (brand && !brand.dataset.scrollTopBound) {
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
      const compactOnThreshold = window.innerWidth <= 700 ? 56 : 88;
      const compactOffThreshold = window.innerWidth <= 700 ? 32 : 60;
      const previousState = isCompact;

      if (!isCompact && currentScrollY > compactOnThreshold) {
        isCompact = true;
      } else if (isCompact && currentScrollY < compactOffThreshold) {
        isCompact = false;
      }

      header.classList.toggle("is-compact", isCompact);
      updateHeaderOffset();

      if (previousState !== isCompact) {
        stateLockScrollY = currentScrollY;
        stateLockUntil = window.performance.now() + 220;
      }

      ticking = false;
    };

    const requestSync = () => {
      const currentScrollY = window.scrollY;
      const minimumScrollDelta = window.innerWidth <= 700 ? 14 : 22;

      if (
        window.performance.now() < stateLockUntil &&
        Math.abs(currentScrollY - stateLockScrollY) < minimumScrollDelta
      ) {
        return;
      }

      if (Math.abs(currentScrollY - lastEvaluatedScrollY) < minimumScrollDelta) {
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
        ${footerBuild ? `<span class="footer-build">${footerBuild}</span>` : ""}
        <span class="footer-counter" data-footer-counter>
          <span class="footer-counter-label">${SITE.ui?.footer?.viewsLabel || "Відвідувань:"}</span>
          <span class="footer-counter-value" data-footer-counter-value>${SITE.ui?.footer?.loading || "оновлення..."}</span>
        </span>
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
    if (pageType !== "contact") {
      return;
    }

    const contactUi = SITE.ui?.contact || {};
    document.title = SITE.contact.pageTitle;
    setText("[data-contact-title]", SITE.contact.pageTitle);
    setText("[data-contact-heading]", SITE.contact.heading);
    setText("[data-contact-socials-title]", SITE.contact.socials?.title || "Мої соціальні мережі:");
    setText("[data-contact-intro]", contactUi.intro || SITE.contact.intro || "");
    setText("[data-contact-name-label]", SITE.contact.fields.name);
    setText("[data-contact-email-label]", SITE.contact.fields.email);
    setText("[data-contact-phone-label]", contactUi.phone || "Телефон");
    setText("[data-contact-subject-label]", contactUi.subject || "Тема");
    setText("[data-contact-message-label]", SITE.contact.fields.message);
    setText("[data-contact-submit]", SITE.contact.fields.submit);

    const socialsList = document.querySelector("[data-contact-socials-list]");
    if (socialsList) {
      const defaultYoutubeHref = SITE.youtubeChannelId
        ? `https://www.youtube.com/channel/${SITE.youtubeChannelId}`
        : "";
      const socials = Array.isArray(SITE.contact.socials?.items)
        ? SITE.contact.socials.items
        : [];

      socialsList.innerHTML = socials
        .map((item) => {
          const href = item.id === "youtube" ? item.href || defaultYoutubeHref : item.href || "";
          const isActive = Boolean(href);
          const status = isActive
            ? ""
            : `<span class="contact-social-status">${escapeHtml(
                contactUi.socialsComingSoon || "незабаром"
              )}</span>`;
          const commonClass = `contact-social-button is-${item.id}${isActive ? "" : " is-disabled"}`;
          const icon = getSocialIconMarkup(item.id, "contact-social-icon");

          if (!isActive) {
            return `
              <span class="${commonClass}" aria-disabled="true">
                ${icon}
                <span class="contact-social-label">${item.label}</span>
                ${status}
              </span>
            `;
          }

          return `
            <a class="${commonClass}" href="${href}" target="_blank" rel="noreferrer">
              ${icon}
              <span class="contact-social-label">${item.label}</span>
            </a>
          `;
        })
        .join("");
    }

    const form = document.querySelector("[data-contact-form]");
    const nameField = form?.querySelector("input[name='name']");
    const emailField = form?.querySelector("input[name='email']");
    const phoneField = form?.querySelector("input[name='phone']");
    const subjectField = form?.querySelector("input[name='subject']");
    const messageField = form?.querySelector("textarea[name='message']");
    const submitButton = form?.querySelector("[data-contact-submit]");
    const hiddenSubjectField = form?.querySelector("input[name='_subject']");
    const noteName = document.querySelector("[data-note-name]");
    const noteSubject = document.querySelector("[data-note-subject]");
    const noteMessage = document.querySelector("[data-contact-message-note]");
    const noteEmail = document.querySelector("[data-note-email]");
    const notePhone = document.querySelector("[data-note-phone]");
    const okName = document.querySelector("[data-ok-name]");
    const okSubject = document.querySelector("[data-ok-subject]");
    const okMessage = document.querySelector("[data-ok-message]");
    const okEmail = document.querySelector("[data-ok-email]");
    const okPhone = document.querySelector("[data-ok-phone]");
    const emailMark = document.querySelector("[data-mark-email]");
    const phoneMark = document.querySelector("[data-mark-phone]");

    function ensureLimitCounter(
      field,
      counterKey,
      containerSelector = ".field-label",
      legacySelector = "",
      extraClass = ""
    ) {
      if (!field) {
        return null;
      }

      const label = field.closest("label");
      if (!label) {
        return null;
      }

      let counterElement = label.querySelector(`[data-contact-counter="${counterKey}"]`);
      if (!counterElement && legacySelector) {
        counterElement = label.querySelector(legacySelector);
      }
      if (!counterElement) {
        counterElement = document.createElement("small");
        counterElement.hidden = true;
      }

      counterElement.setAttribute("data-contact-counter", counterKey);
      counterElement.className = `contact-counter contact-limit-counter${extraClass ? ` ${extraClass}` : ""}`;

      const container = containerSelector ? label.querySelector(containerSelector) : null;
      if (counterElement.parentElement !== container) {
        (container || label).appendChild(counterElement);
      }

      return counterElement;
    }

    const nameCounter = ensureLimitCounter(nameField, "name");
    const emailCounter = ensureLimitCounter(emailField, "email");
    const phoneCounter = ensureLimitCounter(phoneField, "phone");
    const subjectCounter = ensureLimitCounter(subjectField, "subject");
    const messageCounter = ensureLimitCounter(
      messageField,
      "message",
      "",
      "[data-contact-message-count]",
      "contact-limit-counter-under"
    );

    if (
      !form ||
      !nameField ||
      !emailField ||
      !phoneField ||
      !subjectField ||
      !messageField ||
      !submitButton ||
      !nameCounter ||
      !emailCounter ||
      !phoneCounter ||
      !subjectCounter ||
      !messageCounter ||
      !noteName ||
      !noteSubject ||
      !noteMessage ||
      !noteEmail ||
      !notePhone ||
      !okName ||
      !okSubject ||
      !okMessage ||
      !okEmail ||
      !okPhone ||
      !emailMark ||
      !phoneMark
    ) {
      return;
    }

    form.action = SITE.contact.formAction;
    if (hiddenSubjectField) {
      hiddenSubjectField.value = contactUi.formSubject || "Нове повідомлення із сайту";
    }

    noteName.textContent = contactUi.required || "Обов'язково для заповнення";
    noteSubject.textContent = contactUi.required || "Обов'язково для заповнення";
    noteMessage.textContent =
      contactUi.messageRequired || "Обов'язково для заповнення (не менше 25 символів)";
    noteEmail.textContent = contactUi.emailOrPhoneRequired || "Обов'язково: email або телефон";
    notePhone.textContent = contactUi.phoneOrEmailRequired || "Обов'язково: телефон або email";
    okName.textContent = `✓ ${contactUi.completed || "Заповнено"}`;
    okSubject.textContent = `✓ ${contactUi.completed || "Заповнено"}`;
    okMessage.textContent = `✓ ${contactUi.messageEnough || "Достатньо символів"}`;
    okEmail.textContent = `✓ ${contactUi.emailProvided || "Email вказано"}`;
    okPhone.textContent = `✓ ${contactUi.phoneProvided || "Телефон вказано"}`;

    if (form.dataset.enhanced === "true") {
      if (typeof form._applyContactPrefill === "function") {
        form._applyContactPrefill();
      }
      if (typeof form._autoResizeMessageField === "function") {
        form._autoResizeMessageField(false);
      }
      if (typeof form._updateContactState === "function") {
        form._updateContactState();
      }
      return;
    }

    form.dataset.enhanced = "true";

    function autoResizeMessageField(keepSubmitVisible = false) {
      const previousRect = messageField.getBoundingClientRect();
      const previousHeight = messageField.offsetHeight;
      messageField.style.height = "auto";
      messageField.style.height = `${messageField.scrollHeight}px`;

      const nextHeight = messageField.offsetHeight;
      const heightDelta = nextHeight - previousHeight;

      if (heightDelta < 0 && document.activeElement === messageField) {
        const nextRect = messageField.getBoundingClientRect();
        const bottomShift = nextRect.bottom - previousRect.bottom;

        if (bottomShift !== 0) {
          window.scrollBy({
            top: bottomShift,
            left: 0,
            behavior: "auto"
          });
        }
      }

      if (!keepSubmitVisible || heightDelta <= 0) {
        return;
      }

      const viewportPadding = 24;
      const submitRect = submitButton.getBoundingClientRect();
      const overflow = submitRect.bottom - (window.innerHeight - viewportPadding);

      if (overflow > 0) {
        window.scrollBy({
          top: overflow + 8,
          left: 0,
          behavior: "auto"
        });
      }
    }

    function updateLimitCounter(field, counterElement) {
      const currentContactUi = SITE.ui?.contact || {};
      const limit = Number(field.maxLength) || 0;
      if (!limit) {
        counterElement.hidden = true;
        counterElement.textContent = "";
        counterElement.style.removeProperty("--limit-counter-opacity");
        counterElement.classList.remove("is-exhausted");
        return;
      }

      const charsLeft = Math.max(limit - field.value.length, 0);
      const warnThreshold = Math.ceil(limit * 0.15);

      if (charsLeft <= warnThreshold) {
        const progress = 1 - charsLeft / Math.max(warnThreshold, 1);
        const opacity = charsLeft === 0 ? 0.96 : 0.18 + progress * 0.82;
        counterElement.hidden = false;
        counterElement.textContent =
          charsLeft === 0
            ? currentContactUi.limitExhausted || "ЛІМІТ ПО ТЕКСТУ ВИЧЕРПАНО"
            : `${currentContactUi.limitRemainingPrefix || ""}${charsLeft}${
                currentContactUi.limitRemainingSuffix || ""
              }`;
        counterElement.style.setProperty("--limit-counter-opacity", opacity.toFixed(3));
        counterElement.classList.toggle("is-exhausted", charsLeft === 0);
      } else {
        counterElement.hidden = true;
        counterElement.textContent = "";
        counterElement.style.removeProperty("--limit-counter-opacity");
        counterElement.classList.remove("is-exhausted");
      }
    }

    function triggerLimitFeedback(field) {
      field.classList.remove("field-limit-hit");
      void field.offsetWidth;
      field.classList.add("field-limit-hit");
    }

    const limitedFields = [
      nameField,
      emailField,
      phoneField,
      subjectField,
      messageField
    ];
    const limitCounters = [
      [nameField, nameCounter],
      [emailField, emailCounter],
      [phoneField, phoneCounter],
      [subjectField, subjectCounter],
      [messageField, messageCounter]
    ];

    function applyContactPrefill() {
      if (form.dataset.prefillApplied === "true") {
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const prefillMap = [
        [nameField, params.get("name")],
        [emailField, params.get("email")],
        [phoneField, params.get("phone")],
        [subjectField, params.get("subject")],
        [messageField, params.get("message")]
      ];

      prefillMap.forEach(([field, value]) => {
        if (field && value && !field.value.trim()) {
          field.value = value;
        }
      });

      form.dataset.prefillApplied = "true";
    }

    function updateContactState() {
      const currentContactUi = SITE.ui?.contact || {};
      const hasName = nameField.value.trim().length > 0;
      const hasSubject = subjectField.value.trim().length > 0;
      const emailValue = emailField.value.trim();
      const phoneValue = phoneField.value.trim();
      const phoneDigits = phoneValue.replace(/\D/g, "");
      const hasEmail = emailValue.length > 0;
      const hasPhone = phoneValue.length > 0;
      const emailValid = hasEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
      const phoneValid = hasPhone && phoneDigits.length >= 10;
      const hasValidContact = emailValid || phoneValid;
      const messageLength = messageField.value.trim().length;
      const messageValid = messageLength >= 25;
      const remaining = Math.max(25 - messageLength, 0);
      const formIsReady = hasName && hasSubject && hasValidContact && messageValid;

      emailField.setCustomValidity("");
      phoneField.setCustomValidity("");

      if (!hasValidContact) {
        if (hasEmail && !emailValid) {
          emailField.setCustomValidity(currentContactUi.invalidEmail || "Вкажіть коректний email");
        } else if (hasPhone && !phoneValid) {
          phoneField.setCustomValidity(
            currentContactUi.invalidPhone || "Вкажіть коректний номер телефону"
          );
        } else {
          const contactMessage =
            currentContactUi.provideEmailOrPhone || "Вкажіть email або телефон";
          emailField.setCustomValidity(contactMessage);
          phoneField.setCustomValidity(contactMessage);
        }
      }

      noteName.hidden = hasName;
      okName.hidden = !hasName;
      noteSubject.hidden = hasSubject;
      okSubject.hidden = !hasSubject;

      emailMark.hidden = hasValidContact;
      phoneMark.hidden = hasValidContact;

      if (emailValid) {
        noteEmail.hidden = true;
        okEmail.hidden = false;
      } else {
        okEmail.hidden = true;
        noteEmail.hidden = false;
        noteEmail.textContent = phoneValid
          ? currentContactUi.emailOptionalBecausePhone || "Необов'язково, бо телефон уже вказано"
          : hasEmail
            ? currentContactUi.invalidEmail || "Вкажіть коректний email"
            : currentContactUi.emailOrPhoneRequired || "Обов'язково: email або телефон";
      }

      if (phoneValid) {
        notePhone.hidden = true;
        okPhone.hidden = false;
      } else {
        okPhone.hidden = true;
        notePhone.hidden = false;
        notePhone.textContent = emailValid
          ? currentContactUi.phoneOptionalBecauseEmail || "Необов'язково, бо email уже вказано"
          : hasPhone
            ? currentContactUi.invalidPhone || "Вкажіть коректний номер телефону"
            : currentContactUi.phoneOrEmailRequired || "Обов'язково: телефон або email";
      }

      if (messageValid) {
        noteMessage.hidden = true;
        okMessage.hidden = false;
      } else {
        noteMessage.hidden = false;
        okMessage.hidden = true;
        noteMessage.textContent =
          messageLength > 0
            ? `${currentContactUi.messageRemainingPrefix || "Обов'язково для заповнення, напишіть хоча б ще "}${remaining}${currentContactUi.messageRemainingSuffix || " символів"}`
            : currentContactUi.messageRequired ||
              "Обов'язково для заповнення (не менше 25 символів)";
      }

      limitCounters.forEach(([field, counterElement]) => updateLimitCounter(field, counterElement));

      submitButton.disabled = !formIsReady;
    }

    [nameField, emailField, phoneField, subjectField, messageField].forEach((field) => {
      field.addEventListener("input", updateContactState);
      field.addEventListener("change", updateContactState);
    });

    limitedFields.forEach((field) => {
      field.addEventListener("beforeinput", (event) => {
        const limit = Number(field.maxLength) || 0;
        if (!limit || event.isComposing) {
          return;
        }

        const inputType = event.inputType || "";
        if (!inputType.startsWith("insert")) {
          return;
        }

        const selectionStart =
          typeof field.selectionStart === "number" ? field.selectionStart : field.value.length;
        const selectionEnd =
          typeof field.selectionEnd === "number" ? field.selectionEnd : field.value.length;
        const selectedLength = Math.max(selectionEnd - selectionStart, 0);

        if (field.value.length - selectedLength >= limit) {
          triggerLimitFeedback(field);
        }
      });

      field.addEventListener("animationend", () => {
        field.classList.remove("field-limit-hit");
      });
    });

    messageField.addEventListener("input", () => autoResizeMessageField(true));
    window.addEventListener("resize", () => autoResizeMessageField(false));

    form.addEventListener("submit", (event) => {
      updateContactState();

      if (submitButton.disabled) {
        event.preventDefault();

        if (!nameField.value.trim()) {
          nameField.reportValidity();
          return;
        }

        if (!subjectField.value.trim()) {
          subjectField.reportValidity();
          return;
        }

        if (emailField.validationMessage) {
          emailField.reportValidity();
          return;
        }

        if (phoneField.validationMessage) {
          phoneField.reportValidity();
          return;
        }

        messageField.reportValidity();
      }
    });

    form._applyContactPrefill = applyContactPrefill;
    form._autoResizeMessageField = autoResizeMessageField;
    form._updateContactState = updateContactState;

    applyContactPrefill();
    autoResizeMessageField(false);
    updateContactState();
  }

  function applyMenuLabels() {
    setText("[data-menu-home]", SITE.menu.home);
    setText("[data-menu-downloads]", SITE.menu.downloads);
    setText("[data-menu-contact]", SITE.menu.contact);

    Object.entries(SITE.activities).forEach(([id, activity]) => {
      setText(`[data-menu-activity='${id}']`, activity.name);
    });
  }

  function applyActiveMenuState() {
    document
      .querySelectorAll(".site-header nav a[aria-current='page']")
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

  function formatVisitorCounter(value) {
    const locale = SITE.currentLocale === "en" ? "en-US" : "uk-UA";
    return new Intl.NumberFormat(locale).format(value);
  }

  function initVisitorCounter() {
    const labelElement = document.querySelector(".footer-counter-label");
    const valueElement = document.querySelector("[data-footer-counter-value]");
    if (!labelElement || !valueElement) {
      return;
    }

    const footerUi = SITE.ui?.footer || {};
    labelElement.textContent = footerUi.viewsLabel || "Відвідувань:";

    if (!SITE.visitCounter?.enabled) {
      valueElement.textContent = footerUi.unavailable || "лічильник недоступний";
      return;
    }

    if (visitorCounterValue != null) {
      valueElement.textContent = formatVisitorCounter(visitorCounterValue);
      return;
    }

    valueElement.textContent = footerUi.loading || "оновлення...";

    if (!visitorCounterPromise) {
      const counterConfig = SITE.visitCounter || {};
      const storageKeys = SITE.storageKeys || {};
      const apiBase = counterConfig.apiBase || "https://api.countapi.xyz";
      const namespace = encodeURIComponent(counterConfig.namespace || "default");
      const key = encodeURIComponent(counterConfig.key || "site-visits");
      const sessionKey = storageKeys.counterSession || "site-visit-counted";
      const cacheKey = storageKeys.counterCache || "site-visit-count-cache";
      let shouldIncrement = true;

      try {
        shouldIncrement = sessionStorage.getItem(sessionKey) !== "true";
      } catch {
        shouldIncrement = true;
      }

      const endpoint = `${apiBase}/${shouldIncrement ? "hit" : "get"}/${namespace}/${key}`;

      visitorCounterPromise = fetch(endpoint)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Counter request failed with ${response.status}`);
          }

          return response.json();
        })
        .then((payload) => {
          const value = Number(payload?.value);
          if (!Number.isFinite(value)) {
            throw new Error("Invalid counter response");
          }

          visitorCounterValue = value;

          try {
            localStorage.setItem(cacheKey, String(value));
            sessionStorage.setItem(sessionKey, "true");
          } catch {
            // Ignore storage write issues; the visible counter is still usable.
          }

          return value;
        })
        .catch((error) => {
          try {
            const rawCachedValue = localStorage.getItem(cacheKey);

            if (rawCachedValue !== null) {
              const cachedValue = Number(rawCachedValue);

              if (Number.isFinite(cachedValue) && cachedValue > 0) {
                visitorCounterValue = cachedValue;
                return cachedValue;
              }
            }
          } catch {
            // Ignore cache access issues and fall through to the caller.
          }

          throw error;
        });
    }

    visitorCounterPromise
      .then((value) => {
        valueElement.textContent = formatVisitorCounter(value);
      })
      .catch(() => {
        valueElement.textContent = footerUi.unavailable || "лічильник недоступний";
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
    initHeaderBrand();
    initHeaderSocials();
    initLanguageToggle();
    initThemeToggle();
    initHeaderScrollState();
    initDetailsInteractions();
    initDownloadPreviewTriggers();
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
