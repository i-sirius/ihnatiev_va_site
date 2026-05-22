(() => {
  function canPreviewDownloadFile(fileType = "FILE") {
    const normalizedType = String(fileType).toUpperCase();
    return ["PDF", "PNG", "JPG", "JPEG", "WEBP", "GIF", "TXT", "HTM", "HTML"].indexOf(
      normalizedType
    ) !== -1;
  }

  function isIOSPdfEnvironment() {
    const userAgent = navigator.userAgent || "";
    const platform = navigator.platform || "";
    const isClassicIOS = /iPad|iPhone|iPod/i.test(userAgent);
    const isIPadDesktopAgent = platform === "MacIntel" && navigator.maxTouchPoints > 1;

    return isClassicIOS || isIPadDesktopAgent;
  }

  function isStandaloneAppMode() {
    const standaloneDisplayMode =
      window.matchMedia &&
      window.matchMedia("(display-mode: standalone)").matches;

    return standaloneDisplayMode || window.navigator.standalone === true;
  }

  // iOS handles linked PDFs better than multi-page PDFs embedded in our lightbox.
  function shouldUseDirectPdfActions(fileType = "FILE") {
    if (String(fileType).toUpperCase() !== "PDF") {
      return false;
    }

    if (document.documentElement.classList.contains("no-modern-effects")) {
      return true;
    }

    return isIOSPdfEnvironment();
  }

  function shouldUseStandalonePdfPanel(fileType = "FILE") {
    return (
      String(fileType).toUpperCase() === "PDF" &&
      !document.documentElement.classList.contains("no-modern-effects") &&
      isIOSPdfEnvironment() &&
      isStandaloneAppMode()
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

    let standalonePanel = document.querySelector("[data-pdf-standalone-panel]");

    if (!standalonePanel) {
      standalonePanel = document.createElement("div");
      standalonePanel.className = "pdf-standalone-panel";
      standalonePanel.hidden = true;
      standalonePanel.setAttribute("data-pdf-standalone-panel", "");
      standalonePanel.innerHTML = `
        <section
          class="pdf-standalone-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdf-standalone-title"
          aria-describedby="pdf-standalone-text"
        >
          <h2 id="pdf-standalone-title" data-pdf-standalone-title></h2>
          <p id="pdf-standalone-text" data-pdf-standalone-text></p>
          <div class="pdf-standalone-actions">
            <a
              class="pdf-standalone-action is-primary"
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              data-pdf-standalone-open
            ></a>
            <button class="pdf-standalone-action" type="button" data-pdf-standalone-share></button>
            <button class="pdf-standalone-action" type="button" data-pdf-standalone-copy></button>
            <button class="pdf-standalone-action" type="button" data-pdf-standalone-close></button>
          </div>
          <label class="pdf-standalone-copy-field" data-pdf-standalone-copy-fallback hidden>
            <span data-pdf-standalone-copy-label></span>
            <input type="text" readonly data-pdf-standalone-copy-input>
          </label>
          <p class="pdf-standalone-copy-status" aria-live="polite" data-pdf-standalone-copy-status></p>
        </section>
      `;
      document.body.appendChild(standalonePanel);
    }

    const previewUi = site.ui && site.ui.documentPreview || {};
    standalonePanel.previewUi = previewUi;
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
    const standaloneTitle = standalonePanel.querySelector("[data-pdf-standalone-title]");
    const standaloneText = standalonePanel.querySelector("[data-pdf-standalone-text]");
    const standaloneOpen = standalonePanel.querySelector("[data-pdf-standalone-open]");
    const standaloneShare = standalonePanel.querySelector("[data-pdf-standalone-share]");
    const standaloneCopy = standalonePanel.querySelector("[data-pdf-standalone-copy]");
    const standaloneClose = standalonePanel.querySelector("[data-pdf-standalone-close]");
    const standaloneCopyFallback = standalonePanel.querySelector("[data-pdf-standalone-copy-fallback]");
    const standaloneCopyLabel = standalonePanel.querySelector("[data-pdf-standalone-copy-label]");
    const standaloneCopyInput = standalonePanel.querySelector("[data-pdf-standalone-copy-input]");
    const standaloneCopyStatus = standalonePanel.querySelector("[data-pdf-standalone-copy-status]");

    function closeLightbox() {
      lightbox.hidden = true;
      document.body.classList.remove("lightbox-open");
      frame && frame.setAttribute("hidden", "");
      fallback && fallback.setAttribute("hidden", "");

      if (frame) {
        frame.src = "about:blank";
      }
    }

    function getAbsoluteFileHref(href = "") {
      try {
        return new URL(href, window.location.href).href;
      } catch (error) {
        return href;
      }
    }

    function getStandalonePanelUi() {
      return standalonePanel.previewUi || {};
    }

    function resetStandaloneCopyState() {
      const panelUi = getStandalonePanelUi();

      if (standaloneCopy) {
        standaloneCopy.textContent =
          panelUi.pdfStandaloneCopy || "Скопіювати посилання";
      }

      if (standaloneCopyFallback) {
        standaloneCopyFallback.hidden = true;
      }

      if (standaloneCopyStatus) {
        standaloneCopyStatus.textContent = "";
      }

      if (standalonePanel.copyLabelTimer) {
        window.clearTimeout(standalonePanel.copyLabelTimer);
        standalonePanel.copyLabelTimer = 0;
      }
    }

    function closeStandalonePdfPanel({ restoreFocus = true } = {}) {
      standalonePanel.hidden = true;
      document.body.classList.remove("pdf-standalone-open");
      resetStandaloneCopyState();

      if (
        restoreFocus &&
        standalonePanel.returnFocus &&
        typeof standalonePanel.returnFocus.focus === "function"
      ) {
        standalonePanel.returnFocus.focus();
      }

      standalonePanel.pdfFile = null;
      standalonePanel.returnFocus = null;
    }

    function showStandaloneCopyFallback(href = "") {
      if (!standaloneCopyFallback || !standaloneCopyInput) {
        return;
      }

      standaloneCopyFallback.hidden = false;
      standaloneCopyInput.value = href;
      standaloneCopyInput.focus();
      standaloneCopyInput.select();

      if (typeof standaloneCopyInput.setSelectionRange === "function") {
        standaloneCopyInput.setSelectionRange(0, href.length);
      }
    }

    function markStandaloneLinkCopied() {
      const panelUi = getStandalonePanelUi();
      const copiedText = panelUi.pdfStandaloneCopied || "Посилання скопійовано";

      if (standaloneCopy) {
        standaloneCopy.textContent = copiedText;
      }

      if (standaloneCopyStatus) {
        standaloneCopyStatus.textContent = copiedText;
      }

      if (standalonePanel.copyLabelTimer) {
        window.clearTimeout(standalonePanel.copyLabelTimer);
      }

      standalonePanel.copyLabelTimer = window.setTimeout(() => {
        if (standaloneCopy) {
          standaloneCopy.textContent =
            panelUi.pdfStandaloneCopy || "Скопіювати посилання";
        }
      }, 1800);
    }

    function showStandalonePdfPanel(file = {}, returnFocus = null) {
      const href = file.href || "#";
      const label =
        getLocalizedValue(file.label, "") ||
        href ||
        (previewUi.fileFallbackLabel || "Файл");
      const absoluteHref = getAbsoluteFileHref(href);

      standalonePanel.pdfFile = {
        href,
        absoluteHref,
        label
      };
      standalonePanel.returnFocus = returnFocus || document.activeElement;
      resetStandaloneCopyState();

      if (standaloneTitle) {
        standaloneTitle.textContent =
          previewUi.pdfStandaloneTitle || previewUi.pdfOpen || "Відкрити PDF";
      }

      if (standaloneText) {
        standaloneText.textContent =
          previewUi.pdfStandaloneText ||
          "Перегляд PDF у режимі додатка відкриється як окрема сторінка. Щоб повернутися на сайт, скористайтесь жестом Назад або закрийте перегляд і поверніться до додатка.";
      }

      if (standaloneOpen) {
        standaloneOpen.href = href;
        standaloneOpen.textContent =
          previewUi.pdfStandaloneOpen || previewUi.pdfOpen || "Відкрити PDF";
      }

      if (standaloneShare) {
        standaloneShare.hidden = typeof navigator.share !== "function";
        standaloneShare.textContent =
          previewUi.pdfStandaloneShare || "Поділитися";
      }

      if (standaloneCopy) {
        standaloneCopy.textContent =
          previewUi.pdfStandaloneCopy || "Скопіювати посилання";
      }

      if (standaloneClose) {
        standaloneClose.textContent =
          previewUi.pdfStandaloneClose || previewUi.close || "Закрити";
      }

      if (standaloneCopyLabel) {
        standaloneCopyLabel.textContent =
          previewUi.pdfStandaloneCopy || "Скопіювати посилання";
      }

      if (standaloneCopyInput) {
        standaloneCopyInput.value = absoluteHref;
        standaloneCopyInput.setAttribute(
          "aria-label",
          previewUi.pdfStandaloneCopy || "Скопіювати посилання"
        );
      }

      standalonePanel.hidden = false;
      document.body.classList.add("pdf-standalone-open");

      if (standaloneOpen) {
        standaloneOpen.focus();
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
        if (!standalonePanel.hidden && event.key === "Escape") {
          closeStandalonePdfPanel();
          return;
        }

        if (lightbox.hidden) {
          return;
        }

        if (event.key === "Escape") {
          closeLightbox();
        }
      });

      lightbox.dataset.bound = "true";
    }

    if (standalonePanel.dataset.bound !== "true") {
      standalonePanel.addEventListener("click", (event) => {
        if (event.target === standalonePanel) {
          closeStandalonePdfPanel();
        }
      });

      standaloneOpen && standaloneOpen.addEventListener("click", () => {
        closeStandalonePdfPanel({ restoreFocus: false });
      });

      standaloneShare && standaloneShare.addEventListener("click", () => {
        const file = standalonePanel.pdfFile;
        const panelUi = getStandalonePanelUi();

        if (!file || typeof navigator.share !== "function") {
          return;
        }

        try {
          const sharePromise = navigator.share({
            title: file.label || panelUi.pdfStandaloneTitle || "PDF",
            text: file.label || panelUi.pdfStandaloneTitle || "PDF",
            url: file.absoluteHref || file.href
          });

          sharePromise && sharePromise.then(null, () => {
            // The share sheet can be cancelled without changing the page.
          });
        } catch (error) {
          // Keep the panel available if sharing is blocked.
        }
      });

      standaloneCopy && standaloneCopy.addEventListener("click", () => {
        const file = standalonePanel.pdfFile;
        const href = file && (file.absoluteHref || file.href);

        if (!href) {
          return;
        }

        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          try {
            navigator.clipboard.writeText(href).then(
              markStandaloneLinkCopied,
              () => showStandaloneCopyFallback(href)
            );
          } catch (error) {
            showStandaloneCopyFallback(href);
          }
          return;
        }

        showStandaloneCopyFallback(href);
      });

      standaloneClose && standaloneClose.addEventListener("click", () => {
        closeStandalonePdfPanel();
      });

      standalonePanel.dataset.bound = "true";
    }

    lightbox.showPreview = showPreview;
    lightbox.showStandalonePdfPanel = showStandalonePdfPanel;
    return lightbox;
  }

  window.SiteDocumentLightbox = {
    canPreviewDownloadFile,
    shouldUseDirectPdfActions,
    shouldUseStandalonePdfPanel,
    ensure: ensureDocumentLightbox
  };
})();
