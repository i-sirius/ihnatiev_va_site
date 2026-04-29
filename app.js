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

  function renderParagraphs(selector, paragraphs) {
    if (!Array.isArray(paragraphs)) {
      return;
    }

    const defaultDetailsSummary = "\u0414\u0435\u0442\u0430\u043b\u0456";
    const defaultExpandLabel = "\u0420\u041e\u0417\u0413\u041e\u0420\u041d\u0423\u0422\u0418";
    const defaultCloseLabel = "\u0417\u0413\u041e\u0420\u041d\u0423\u0422\u0418";

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
              "\u041f\u043e\u043a\u0430\u0437\u0430\u043d\u043e \u0441\u043a\u043e\u0440\u043e\u0447\u0435\u043d\u0443 \u0432\u0435\u0440\u0441\u0456\u044e. \u041d\u0438\u0436\u0447\u0435 \u043c\u043e\u0436\u043d\u0430 \u043f\u0440\u043e\u0447\u0438\u0442\u0430\u0442\u0438 \u043f\u043e\u0432\u043d\u0438\u0439 \u0442\u0435\u043a\u0441\u0442.";
            const actionLabel =
              paragraph.actionLabel || "\u0427\u0438\u0442\u0430\u0442\u0438 \u0434\u0430\u043b\u0456...";
            const closeLabel =
              paragraph.closeLabel || "\u0417\u0433\u043e\u0440\u043d\u0443\u0442\u0438";

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

    if (lightbox) {
      return lightbox;
    }

    lightbox = document.createElement("div");
    lightbox.className = "gallery-lightbox";
    lightbox.hidden = true;
    lightbox.setAttribute("data-gallery-lightbox", "");
    lightbox.innerHTML = `
      <div class="lightbox-stage">
        <div class="lightbox-toolbar">
          <button class="lightbox-close" type="button" aria-label="Закрити" data-lightbox-close>×</button>
        </div>
        <div class="lightbox-content">
          <button class="lightbox-nav prev" type="button" aria-label="Попереднє фото" data-lightbox-prev>‹</button>
          <figure class="lightbox-figure">
            <img src="" alt="" data-lightbox-image>
            <figcaption class="lightbox-caption" data-lightbox-caption hidden></figcaption>
          </figure>
          <button class="lightbox-nav next" type="button" aria-label="Наступне фото" data-lightbox-next>›</button>
        </div>
      </div>
    `;
    document.body.appendChild(lightbox);

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

    if (lightbox) {
      return lightbox;
    }

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
            >Відкрити окремо</a>
            <a
              class="document-lightbox-link is-download"
              href="#"
              download
              data-document-download
            >Завантажити</a>
            <button class="lightbox-close" type="button" aria-label="Закрити" data-document-close>×</button>
          </div>
        </div>
        <div class="document-lightbox-view">
          <iframe
            class="document-lightbox-frame"
            title="Попередній перегляд файла"
            data-document-frame
            hidden
          ></iframe>
          <div class="document-lightbox-fallback" data-document-fallback hidden>
            <p class="document-lightbox-fallback-title">Попередній перегляд у вікні сайту для цього формату недоступний.</p>
            <p class="document-lightbox-fallback-text">Можна відкрити файл окремо або одразу завантажити його кнопкою вище.</p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(lightbox);

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
      const label = file.label || href || "Файл";
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
        element.innerHTML = `<p class="gallery-empty">Фото тимчасово відсутні.</p>`;
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
    const source = `${file.href || ""} ${file.label || ""}`;
    const match = source.match(/\.([a-z0-9]{2,5})(?:$|[?#\s])/i);
    return (match?.[1] || "file").toUpperCase();
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
    const label = file.label || file.href || "Файл";
    const safeHref = escapeHtml(href);
    const safeLabel = escapeHtml(label);
    const safeType = escapeHtml(fileType);

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
            aria-label="Переглянути ${safeLabel}"
          >
            <span class="download-link-main">
              <span class="download-filetype" aria-hidden="true">
                ${getDownloadFileIconMarkup(fileType)}
              </span>
              <span class="download-link-text">${safeLabel}</span>
            </span>
          </button>
          <a
            class="download-link-action"
            href="${safeHref}"
            download
            aria-label="Завантажити ${safeLabel}"
            title="Завантажити"
          >↓</a>
        </div>
      </li>
    `;
  }

  function renderDownloadGroupFiles(files = []) {
    if (!Array.isArray(files) || !files.length) {
      return `<p class="download-group-empty">Файли тимчасово відсутні.</p>`;
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

      element.innerHTML = `
        <section class="download-group download-group-main">
          <h3 class="download-group-title">МОНОГРАФІЇ</h3>
          ${renderDownloadGroupFiles(monographs)}
        </section>
        <section class="download-group download-group-main">
          <h3 class="download-group-title">СТАТТІ</h3>
          <div class="download-subgroups">
            ${articleGroups
              .map(
                (group) => `
                  <details class="download-subgroup">
                    <summary>
                      <span class="download-subgroup-title">${group.title || "РОЗДІЛ"}</span>
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

    const watchLabel = "\u0414\u0418\u0412\u0418\u0422\u0418\u0421\u042c";

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
    const playlistLabel = "\u041f\u043b\u0435\u0439\u043b\u0438\u0441\u0442 \u043a\u0430\u043d\u0430\u043b\u0443";
    const watchLabel = "\u0414\u0418\u0412\u0418\u0422\u0418\u0421\u042c";

    document.querySelectorAll(selector).forEach((element) => {
      element.innerHTML = `
        <a class="activity-card video-card video-card-fallback" href="${playlistUrl}" target="_blank" rel="noopener noreferrer">
          <div class="video-card-thumb video-card-thumb-fallback">YouTube</div>
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
    if (document.body.dataset.downloadPreviewReady === "true") {
      return;
    }

    const lightbox = ensureDocumentLightbox();

    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-download-preview]");
      if (!trigger) {
        return;
      }

      event.preventDefault();
      lightbox.showPreview({
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
              title: item.querySelector("title")?.textContent?.trim() || "YouTube video",
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

  function initThemeToggle() {
    const header = document.querySelector(".site-header");
    if (!header || header.querySelector(".theme-toggle")) {
      return;
    }

    const savedTheme = localStorage.getItem("site-theme");
    const theme = savedTheme || document.documentElement.getAttribute("data-theme") || "light";
    document.documentElement.setAttribute("data-theme", theme);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "theme-toggle";
    toggle.setAttribute("aria-label", "Перемкнути тему");
    toggle.innerHTML = `
      <span class="theme-toggle-label" data-theme-toggle-label></span>
      <span class="theme-toggle-track">
        <span class="theme-toggle-thumb"></span>
      </span>
    `;

    const toggleLabel = toggle.querySelector("[data-theme-toggle-label]");

    function updateThemeToggleLabel(currentTheme) {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      const nextThemeIcon = nextTheme === "dark" ? "🌙" : "☀️";
      const nextThemeText = nextTheme === "dark" ? "Темна тема" : "Світла тема";
      toggleLabel.innerHTML = `
        <span class="theme-toggle-icon" aria-hidden="true">${nextThemeIcon}</span>
        <span class="theme-toggle-text">${nextThemeText}</span>
      `;
      toggle.setAttribute("aria-label", `Увімкнути ${nextTheme === "dark" ? "темну" : "світлу"} тему`);
    }

    if (theme === "dark") {
      toggle.classList.add("is-dark");
    }

    updateThemeToggleLabel(theme);

    toggle.addEventListener("click", () => {
      const nextTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", nextTheme);
      localStorage.setItem("site-theme", nextTheme);
      toggle.classList.toggle("is-dark", nextTheme === "dark");
      updateThemeToggleLabel(nextTheme);
      applyThemeAssets(nextTheme);
    });

    header.appendChild(toggle);
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
    if (!header || header.querySelector(".site-brand-link")) {
      return;
    }

    const brand = document.createElement("a");
    brand.className = "site-brand-link";
    brand.href = "index.html";
    brand.setAttribute("aria-label", SITE.meta?.homeTitle || "Ігнатьєв Віталій");
    brand.innerHTML = `
      <img
        class="site-brand-logo"
        data-site-brand-logo
        src="${themeAssets.light}"
        alt="${SITE.meta?.homeTitle || "Ігнатьєв Віталій"}"
      >
    `;
    header.appendChild(brand);
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
    if (!header || !title || header.querySelector(".site-header-socials")) {
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

    if (!activeSocials.length) {
      return;
    }

    const socialBar = document.createElement("div");
    socialBar.className = "site-header-socials";
    socialBar.setAttribute("aria-label", "Соціальні мережі");
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

    title.insertAdjacentElement("afterend", socialBar);
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

    if (brand && !brand.dataset.scrollTopBound) {
      brand.href = "#top";
      brand.title = "Нагору сторінки";
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

    setText("[data-site-title]", SITE.meta.siteTitle);
    setText("[data-site-subtitle]", SITE.meta.homeSubtitle);
    setText("[data-home-about-heading]", SITE.home.aboutHeading);
    setText("[data-home-activities-heading]", SITE.home.activitiesHeading);
    updateImage("[data-home-about-image]", SITE.home.aboutImage);
    renderParagraphs("[data-home-about-paragraphs]", SITE.home.aboutParagraphs);

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

    document.title = SITE.contact.pageTitle;
    setText("[data-contact-title]", SITE.contact.pageTitle);
    setText("[data-contact-heading]", SITE.contact.heading);
    setText("[data-contact-socials-title]", SITE.contact.socials?.title || "Мої соціальні мережі:");
    setText("[data-contact-name-label]", SITE.contact.fields.name);
    setText("[data-contact-email-label]", SITE.contact.fields.email);
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
          const status = isActive ? "" : '<span class="contact-social-status">незабаром</span>';
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

    if (form.dataset.enhanced === "true") {
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
          charsLeft === 0 ? "ЛІМІТ ПО ТЕКСТУ ВИЧЕРПАНО" : `Залишилось ${charsLeft} симв.`;
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

    function updateContactState() {
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
          emailField.setCustomValidity("Вкажіть коректний email");
        } else if (hasPhone && !phoneValid) {
          phoneField.setCustomValidity("Вкажіть коректний номер телефону");
        } else {
          emailField.setCustomValidity("Вкажіть email або телефон");
          phoneField.setCustomValidity("Вкажіть email або телефон");
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
          ? "Необов'язково, бо телефон уже вказано"
          : hasEmail
            ? "Вкажіть коректний email"
            : "Обов'язково: email або телефон";
      }

      if (phoneValid) {
        notePhone.hidden = true;
        okPhone.hidden = false;
      } else {
        okPhone.hidden = true;
        notePhone.hidden = false;
        notePhone.textContent = emailValid
          ? "Необов'язково, бо email уже вказано"
          : hasPhone
            ? "Вкажіть коректний номер телефону"
            : "Обов'язково: телефон або email";
      }

      if (messageValid) {
        noteMessage.hidden = true;
        okMessage.hidden = false;
      } else {
        noteMessage.hidden = false;
        okMessage.hidden = true;
        noteMessage.textContent =
          messageLength > 0
            ? `Обов'язково для заповнення, напишіть хоча б ще ${remaining} символів`
            : "Обов'язково для заповнення (не менше 25 символів)";
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

  function applyAllContent() {
    applyGlobalContent();
    applyActivityPage();
    applyDownloadsPage();
    applyContactPage();
    applyMenuLabels();
    applyActiveMenuState();
    initHeaderBrand();
    initHeaderSocials();
    initThemeToggle();
    initHeaderScrollState();
    initDetailsInteractions();
    initDownloadPreviewTriggers();
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
