(() => {
  function getDownloadFileType(file = {}, getLocalizedValue = (value) => value || "") {
    const source = `${file.href || ""} ${getLocalizedValue(file.label, "")}`;
    const match = source.match(/\.([a-z0-9]{2,5})(?:$|[?#\s])/i);
    return (match?.[1] || "file").toUpperCase();
  }

  function createDownloadsRenderer({
    site = window.SITE || {},
    getLocalizedValue = (value, fallback = "") => value || fallback,
    escapeHtml = (value) => String(value)
  } = {}) {
    function getFileType(file = {}) {
      return getDownloadFileType(file, getLocalizedValue);
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

    function getFileIconMarkup(fileType = "FILE") {
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

    function renderListItem(file = {}) {
      const fileType = getFileType(file);
      const href = file.href || "#";
      const label =
        getLocalizedValue(file.label, "") ||
        file.href ||
        site.ui?.documentPreview?.fileFallbackLabel ||
        "Файл";
      const safeHref = escapeHtml(href);
      const safeLabel = escapeHtml(label);
      const safeType = escapeHtml(fileType);
      const previewUi = site.ui?.documentPreview || {};
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
          >
            <span aria-hidden="true">↓</span>
            <span class="download-link-action-text">${escapeHtml(previewUi.download || "Завантажити")}</span>
          </a>
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
                  ${getFileIconMarkup(fileType)}
                </span>
                <span class="download-link-text">${safeLabel}</span>
              </span>
            </button>
            <div class="download-actions">${actions.join("")}</div>
          </div>
        </li>
      `;
    }

    function renderGroupFiles(files = []) {
      if (!Array.isArray(files) || !files.length) {
        return `<p class="download-group-empty">${escapeHtml(
          site.ui?.downloads?.empty || "Файли тимчасово відсутні."
        )}</p>`;
      }

      return `
        <ul class="download-list">
          ${files.map((file) => renderListItem(file)).join("")}
        </ul>
      `;
    }

    function renderList(selector, files) {
      if (!Array.isArray(files)) {
        return;
      }

      document.querySelectorAll(selector).forEach((element) => {
        element.innerHTML = files.map((file) => renderListItem(file)).join("");
      });
    }

    function renderGroups(selector, groups) {
      if (!groups || typeof groups !== "object") {
        return;
      }

      document.querySelectorAll(selector).forEach((element) => {
        const monographs = Array.isArray(groups.monographs) ? groups.monographs : [];
        const articleGroups = Array.isArray(groups.articles) ? groups.articles : [];
        const downloadsUi = site.ui?.downloads || {};

        element.innerHTML = `
          <section class="download-group download-group-main">
            <h3 class="download-group-title">${escapeHtml(
              downloadsUi.monographsTitle || "МОНОГРАФІЇ"
            )}</h3>
            ${renderGroupFiles(monographs)}
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
                        ${renderGroupFiles(group.files)}
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

    return {
      getFileType,
      renderGroups,
      renderList
    };
  }

  window.SiteDownloadsRenderer = {
    create: createDownloadsRenderer,
    getFileType: getDownloadFileType
  };
})();
