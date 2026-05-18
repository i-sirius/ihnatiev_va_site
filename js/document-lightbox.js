(() => {
  function canPreviewDownloadFile(fileType = "FILE") {
    const normalizedType = String(fileType).toUpperCase();
    return ["PDF", "PNG", "JPG", "JPEG", "WEBP", "GIF", "TXT", "HTM", "HTML"].includes(
      normalizedType
    );
  }

  function ensureDocumentLightbox({
    site = window.SITE || {},
    getLocalizedValue = (value, fallback = "") => value || fallback,
    getDownloadFileType = () => "FILE"
  } = {}) {
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

    const previewUi = site.ui?.documentPreview || {};
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

    if (lightbox.dataset.bound !== "true") {
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

      lightbox.dataset.bound = "true";
    }

    lightbox.showPreview = showPreview;
    return lightbox;
  }

  window.SiteDocumentLightbox = {
    canPreviewDownloadFile,
    ensure: ensureDocumentLightbox
  };
})();
