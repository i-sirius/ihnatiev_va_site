(() => {
  function canPreviewDownloadFile(fileType = "FILE") {
    const normalizedType = String(fileType).toUpperCase();
    return ["PDF", "PNG", "JPG", "JPEG", "WEBP", "GIF", "TXT", "HTM", "HTML"].indexOf(
      normalizedType
    ) !== -1;
  }

  // iOS handles linked PDFs better than multi-page PDFs embedded in our lightbox.
  function shouldUseDirectPdfActions(fileType = "FILE") {
    if (String(fileType).toUpperCase() !== "PDF") {
      return false;
    }

    if (document.documentElement.classList.contains("no-modern-effects")) {
      return true;
    }

    const userAgent = navigator.userAgent || "";
    const platform = navigator.platform || "";
    const isClassicIOS = /iPad|iPhone|iPod/i.test(userAgent);
    const isIPadDesktopAgent = platform === "MacIntel" && navigator.maxTouchPoints > 1;

    return isClassicIOS || isIPadDesktopAgent;
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
                rel="noopener noreferrer"
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

    const previewUi = site.ui && site.ui.documentPreview || {};
    const openAction = lightbox.querySelector("[data-document-open]");
    const downloadAction = lightbox.querySelector("[data-document-download]");
    if (openAction) {
      openAction.textContent = previewUi.open || "Відкрити окремо";
    }
    if (downloadAction) {
      downloadAction.textContent = previewUi.download || "Завантажити";
    }
    lightbox.querySelector("[data-document-close]") && lightbox.querySelector("[data-document-close]").setAttribute(
      "aria-label",
      previewUi.close || "Закрити"
    );
    lightbox.querySelector("[data-document-frame]") && lightbox.querySelector("[data-document-frame]").setAttribute(
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
      frame && frame.setAttribute("hidden", "");
      fallback && fallback.setAttribute("hidden", "");

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

      const useDirectPdfActions = shouldUseDirectPdfActions(type);

      if (openLink) {
        openLink.textContent = useDirectPdfActions
          ? previewUi.pdfOpen || previewUi.open || "Відкрити PDF"
          : previewUi.open || "Відкрити окремо";
      }

      if (fallbackTitle) {
        fallbackTitle.textContent =
          previewUi.unavailableTitle ||
          "Попередній перегляд у вікні сайту для цього формату недоступний.";
      }

      if (fallbackText) {
        fallbackText.textContent = useDirectPdfActions
          ? previewUi.pdfFallbackText ||
            "Перегляд PDF у цьому браузері може бути обмежений. Відкрийте файл окремо."
          : previewUi.unavailableText ||
            "Можна відкрити файл окремо або одразу завантажити його кнопкою вище.";
      }

      if (!useDirectPdfActions && canPreviewDownloadFile(type) && frame) {
        frame.hidden = false;
        fallback && fallback.setAttribute("hidden", "");
        frame.src = type === "PDF" ? `${href}#toolbar=1&navpanes=0&view=FitH` : href;
      } else {
        frame && frame.setAttribute("hidden", "");

        if (frame) {
          frame.src = "about:blank";
        }

        fallback && fallback.removeAttribute("hidden");
      }

      lightbox.hidden = false;
      document.body.classList.add("lightbox-open");
    }

    if (lightbox.dataset.bound !== "true") {
      lightbox.querySelector("[data-document-close]") && lightbox.querySelector("[data-document-close]").addEventListener("click", closeLightbox);

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
    shouldUseDirectPdfActions,
    ensure: ensureDocumentLightbox
  };
})();
