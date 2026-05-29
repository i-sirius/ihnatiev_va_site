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
            <div class="document-lightbox-search-hit" data-document-search-hit hidden>
              <div class="document-lightbox-search-meta">
                <span data-document-search-label></span>
                <mark data-document-search-term></mark>
                <span data-document-search-page></span>
              </div>
              <p data-document-search-snippet></p>
              <div class="document-lightbox-search-controls" data-document-search-controls hidden>
                <button type="button" data-document-search-prev></button>
                <span data-document-search-count></span>
                <button type="button" data-document-search-next></button>
              </div>
            </div>
            <div class="document-lightbox-text-search" data-document-text-search hidden>
              <div class="document-lightbox-text-search-title" data-document-text-search-title></div>
              <p data-document-text-search-body></p>
            </div>
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
    const searchHit = lightbox.querySelector("[data-document-search-hit]");
    const searchLabel = lightbox.querySelector("[data-document-search-label]");
    const searchTerm = lightbox.querySelector("[data-document-search-term]");
    const searchPage = lightbox.querySelector("[data-document-search-page]");
    const searchSnippet = lightbox.querySelector("[data-document-search-snippet]");
    const searchControls = lightbox.querySelector("[data-document-search-controls]");
    const searchPrev = lightbox.querySelector("[data-document-search-prev]");
    const searchNext = lightbox.querySelector("[data-document-search-next]");
    const searchCount = lightbox.querySelector("[data-document-search-count]");
    const textSearch = lightbox.querySelector("[data-document-text-search]");
    const textSearchTitle = lightbox.querySelector("[data-document-text-search-title]");
    const textSearchBody = lightbox.querySelector("[data-document-text-search-body]");
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
        if (frame.previewRefreshTimer) {
          window.clearTimeout(frame.previewRefreshTimer);
          frame.previewRefreshTimer = 0;
        }
        frame.src = "about:blank";
        frame.dataset.currentPreviewHref = "";
      }
    }

    function getAbsoluteFileHref(href = "") {
      try {
        return new URL(href, window.location.href).href;
      } catch (error) {
        return href;
      }
    }

    function getPdfPreviewHref(href = "", search = "", page = "") {
      const cleanHref = String(href || "").split("#")[0];
      const parts = ["toolbar=1", "navpanes=0", "view=FitH"];
      const normalizedSearch = String(search || "").trim();
      const pageNumber = parseInt(page, 10);

      if (pageNumber > 0) {
        parts.unshift(`page=${pageNumber}`);
      }

      if (normalizedSearch) {
        parts.push(`search=${encodeURIComponent(normalizedSearch).replace(/'/g, "%27")}`);
      }

      return `${cleanHref}#${parts.join("&")}`;
    }

    function getPreviewBaseHref(href = "") {
      return String(href || "").split("#")[0];
    }

    function refreshPdfPreviewFrame(targetFrame, nextHref = "", forceHashRefresh = false) {
      if (!targetFrame || !nextHref) {
        return;
      }

      const currentHref = targetFrame.dataset.currentPreviewHref || "";
      const sameHref = currentHref === nextHref;
      const sameBase =
        currentHref &&
        getPreviewBaseHref(currentHref) === getPreviewBaseHref(nextHref);

      if (sameHref) {
        return;
      }

      if (targetFrame.previewRefreshTimer) {
        window.clearTimeout(targetFrame.previewRefreshTimer);
        targetFrame.previewRefreshTimer = 0;
      }

      targetFrame.dataset.currentPreviewHref = nextHref;

      if (forceHashRefresh && sameBase) {
        targetFrame.src = "about:blank";
        targetFrame.previewRefreshTimer = window.setTimeout(() => {
          targetFrame.previewRefreshTimer = 0;
          if (targetFrame.dataset.currentPreviewHref === nextHref) {
            targetFrame.src = nextHref;
          }
        }, 30);
        return;
      }

      targetFrame.src = nextHref;
    }

    function getSearchWords(search = "") {
      const normalizedSearch = normalizeSearchText(search);
      return normalizedSearch
        ? normalizedSearch.split(" ").filter((word) => word.length >= 2)
        : [];
    }

    function getUniqueSearchWords(search = "") {
      const words = getSearchWords(search);
      const uniqueWords = [];

      for (let index = 0; index < words.length; index += 1) {
        if (uniqueWords.indexOf(words[index]) === -1) {
          uniqueWords.push(words[index]);
        }
      }

      return uniqueWords;
    }

    function getFirstSearchTerm(search = "") {
      const words = getUniqueSearchWords(search);
      return words.length ? words[0] : String(search || "").trim();
    }

    function getHitSearchTerm(hit = {}, fallbackSearch = "") {
      const matchedTerms = Array.isArray(hit.matchedTerms) ? hit.matchedTerms : [];
      return matchedTerms.length ? matchedTerms[0] : getFirstSearchTerm(fallbackSearch);
    }

    function getMatchedTerms(text = "", words = []) {
      const normalizedText = normalizeSearchText(text);
      const matchedTerms = [];

      for (let index = 0; index < words.length; index += 1) {
        if (normalizedText.indexOf(words[index]) !== -1) {
          matchedTerms.push(words[index]);
        }
      }

      return matchedTerms;
    }

    function getTextSnippet(text = "", terms = []) {
      const source = String(text || "");
      const normalizedSource = normalizeSearchText(source);
      let matchIndex = -1;
      let matchLength = 0;

      for (let index = 0; index < terms.length; index += 1) {
        const termIndex = normalizedSource.indexOf(terms[index]);
        if (termIndex >= 0 && (matchIndex < 0 || termIndex < matchIndex)) {
          matchIndex = termIndex;
          matchLength = terms[index].length;
        }
      }

      if (matchIndex < 0) {
        return source.slice(0, 260);
      }

      const start = Math.max(0, matchIndex - 120);
      const end = Math.min(source.length, matchIndex + matchLength + 170);
      return `${start > 0 ? "... " : ""}${source.slice(start, end)}${end < source.length ? " ..." : ""}`;
    }

    function buildSearchHits({ href = "", search = "", page = "", snippet = "" } = {}) {
      const entry = getDownloadsIndexEntry(href);
      const pageSearch = entry && Array.isArray(entry.pageSearch) ? entry.pageSearch : [];
      const words = getUniqueSearchWords(search);
      const hits = [];
      const seenSnippets = [];
      const fallbackTerms = getMatchedTerms(snippet, words);
      const pageNumber = parseInt(page, 10);

      for (let index = 0; index < pageSearch.length; index += 1) {
        const pageEntry = pageSearch[index];
        const pageText = pageEntry && pageEntry.text ? String(pageEntry.text) : "";
        const matchedTerms = getMatchedTerms(pageText, words);

        if (!matchedTerms.length) {
          continue;
        }

        const nextSnippet = getTextSnippet(pageText, matchedTerms);
        const normalizedSnippet = normalizeSearchText(nextSnippet);

        if (seenSnippets.indexOf(normalizedSnippet) !== -1) {
          continue;
        }

        seenSnippets.push(normalizedSnippet);
        hits.push({
          page: pageEntry && pageEntry.page ? String(pageEntry.page) : "",
          snippet: nextSnippet,
          text: pageText,
          matchedTerms,
          score: matchedTerms.length
        });
      }

      hits.sort((first, second) => {
        if (second.score !== first.score) {
          return second.score - first.score;
        }

        return (parseInt(first.page, 10) || 0) - (parseInt(second.page, 10) || 0);
      });

      if (!hits.length && (snippet || pageNumber > 0)) {
        hits.push({
          page: pageNumber > 0 ? String(pageNumber) : "",
          snippet,
          text: "",
          matchedTerms: fallbackTerms.length ? fallbackTerms : [getFirstSearchTerm(search)].filter(Boolean),
          score: fallbackTerms.length
        });
      }

      return hits;
    }

    function renderSearchHit(hit = null, hitIndex = 0, hits = [], search = "") {
      const hasSearchHit = Boolean(hit && (hit.page || hit.snippet));
      if (!searchHit) {
        return;
      }

      if (!hasSearchHit) {
        searchHit.hidden = true;
        if (searchControls) {
          searchControls.hidden = true;
        }
        return;
      }

      if (searchLabel) {
        searchLabel.textContent = previewUi.searchHit || "Знайдено";
      }
      if (searchTerm) {
        const matchedTerms = hit && Array.isArray(hit.matchedTerms) ? hit.matchedTerms : [];
        searchTerm.textContent = matchedTerms.length ? matchedTerms.join(", ") : getFirstSearchTerm(search);
      }
      if (searchPage) {
        searchPage.textContent = hit.page
          ? `${previewUi.searchPage || "сторінка"} ${hit.page}`
          : "";
      }
      if (searchSnippet) {
        renderHighlightedText(searchSnippet, hit.snippet || "", hit.matchedTerms || getUniqueSearchWords(search));
      }

      if (searchControls && searchPrev && searchNext && searchCount) {
        const hasMultipleHits = hits.length > 1;
        searchControls.hidden = !hasMultipleHits;
        searchPrev.textContent = previewUi.searchPrevious || "< Попередній фрагмент";
        searchNext.textContent = previewUi.searchNext || "Наступний фрагмент >";
        searchCount.textContent = `${hitIndex + 1} / ${hits.length}`;
        searchPrev.disabled = !hasMultipleHits;
        searchNext.disabled = !hasMultipleHits;
        searchPrev.setAttribute("aria-label", previewUi.searchPreviousAria || "Попередній знайдений фрагмент");
        searchNext.setAttribute("aria-label", previewUi.searchNextAria || "Наступний знайдений фрагмент");
      }

      searchHit.hidden = false;
    }

    function normalizeSearchText(value = "") {
      return String(value || "")
        .toLocaleLowerCase(site.currentLocale || site.defaultLocale || "uk")
        .replace(/\s+/g, " ")
        .trim();
    }

    function getDownloadsIndexEntry(href = "") {
      const index = window.SiteDownloadsSearchIndex || {};
      return href && index[href] ? index[href] : null;
    }

    function findPageSearchEntry(entry, search = "", page = "") {
      const pageSearch = entry && Array.isArray(entry.pageSearch) ? entry.pageSearch : [];
      const pageNumber = parseInt(page, 10);
      const normalizedSearch = normalizeSearchText(search);
      let fallbackEntry = null;

      for (let index = 0; index < pageSearch.length; index += 1) {
        const pageEntry = pageSearch[index];
        const pageText = normalizeSearchText(pageEntry && pageEntry.text);

        if (pageNumber > 0 && pageEntry && pageEntry.page === pageNumber) {
          fallbackEntry = pageEntry;
          if (!normalizedSearch || pageText.indexOf(normalizedSearch) !== -1) {
            return pageEntry;
          }
        }

        if (!fallbackEntry && normalizedSearch && pageText.indexOf(normalizedSearch) !== -1) {
          fallbackEntry = pageEntry;
        }
      }

      return fallbackEntry;
    }

    function renderHighlightedText(container, text = "", search = "", scrollToFirst = false) {
      const source = String(text || "");
      const locale = site.currentLocale || site.defaultLocale || "uk";
      const normalizedSource = source.toLocaleLowerCase(locale);
      const terms = Array.isArray(search)
        ? search.filter(Boolean)
        : getUniqueSearchWords(search);

      container.textContent = "";

      if (!terms.length) {
        container.textContent = source;
        return;
      }

      let position = 0;
      let firstMark = null;

      while (position < source.length) {
        let nextIndex = -1;
        let nextTerm = "";

        for (let index = 0; index < terms.length; index += 1) {
          const term = String(terms[index] || "").toLocaleLowerCase(locale);
          const termIndex = term ? normalizedSource.indexOf(term, position) : -1;
          if (termIndex >= 0 && (nextIndex < 0 || termIndex < nextIndex)) {
            nextIndex = termIndex;
            nextTerm = term;
          }
        }

        if (nextIndex < 0) {
          container.appendChild(document.createTextNode(source.slice(position)));
          break;
        }

        if (nextIndex > position) {
          container.appendChild(document.createTextNode(source.slice(position, nextIndex)));
        }

        const mark = document.createElement("mark");
        mark.textContent = source.slice(nextIndex, nextIndex + nextTerm.length);
        container.appendChild(mark);
        if (!firstMark) {
          firstMark = mark;
        }

        position = nextIndex + nextTerm.length;
      }

      if (scrollToFirst) {
        window.setTimeout(() => {
          const scrollContainer = container.parentNode;
          if (firstMark && scrollContainer && typeof scrollContainer.scrollTop === "number") {
            scrollContainer.scrollTop = Math.max(0, firstMark.offsetTop - scrollContainer.offsetTop - 12);
          }
        }, 80);
      }
    }

    function renderTextSearch({ href = "", search = "", page = "" } = {}) {
      if (!textSearch || !textSearchBody) {
        return;
      }

      const entry = getDownloadsIndexEntry(href);
      const pageEntry = findPageSearchEntry(entry, search, page);

      if (!search || !pageEntry || !pageEntry.text) {
        textSearch.hidden = true;
        textSearchBody.textContent = "";
        return;
      }

      if (textSearchTitle) {
        textSearchTitle.textContent = `${previewUi.searchTextPage || "Текст PDF, сторінка"} ${pageEntry.page}`;
      }

      renderHighlightedText(textSearchBody, pageEntry.text, search, true);
      textSearch.hidden = false;
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
      const search = file.search || "";
      const page = file.page || "";
      const snippet = file.snippet || "";
      const searchHits = buildSearchHits({ href, search, page, snippet });
      const activeHit = searchHits.length ? searchHits[0] : null;
      const activeSearch = activeHit ? getHitSearchTerm(activeHit, search) : getFirstSearchTerm(search);
      const activePage = activeHit && activeHit.page ? activeHit.page : page;
      const previewHref = type === "PDF" ? getPdfPreviewHref(href, activeSearch, activePage) : href;

      if (title) {
        title.textContent = label;
      }

      if (filetype) {
        filetype.textContent = type;
      }

      if (openLink) {
        openLink.href = previewHref;
      }

      if (downloadLink) {
        downloadLink.href = href;
        downloadLink.setAttribute("download", "");
      }

      lightbox.searchHitState = {
        href,
        type,
        search,
        hits: searchHits,
        index: 0
      };

      renderSearchHit(activeHit, 0, searchHits, search);
      renderTextSearch({ href, search, page: activePage });

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
        if (type === "PDF") {
          refreshPdfPreviewFrame(frame, previewHref, false);
        } else {
          frame.dataset.currentPreviewHref = previewHref;
          frame.src = previewHref;
        }
      } else {
        frame && frame.setAttribute("hidden", "");

        if (frame) {
          frame.src = "about:blank";
          frame.dataset.currentPreviewHref = "";
        }

        fallback && fallback.removeAttribute("hidden");
      }

      lightbox.hidden = false;
      document.body.classList.add("lightbox-open");
    }

    function activateSearchHit(nextIndex) {
      const state = lightbox.searchHitState || {};
      const hits = Array.isArray(state.hits) ? state.hits : [];
      if (!hits.length) {
        return;
      }

      const index = (nextIndex + hits.length) % hits.length;
      const hit = hits[index];
      const previewHref = state.type === "PDF"
        ? getPdfPreviewHref(state.href, getHitSearchTerm(hit, state.search), hit.page)
        : state.href;

      state.index = index;
      lightbox.searchHitState = state;

      renderSearchHit(hit, index, hits, state.search);
      renderTextSearch({ href: state.href, search: state.search, page: hit.page });

      if (openLink) {
        openLink.href = previewHref;
      }

      if (frame && !frame.hidden) {
        if (state.type === "PDF") {
          refreshPdfPreviewFrame(frame, previewHref, true);
        } else {
          frame.dataset.currentPreviewHref = previewHref;
          frame.src = previewHref;
        }
      }
    }

    if (lightbox.dataset.bound !== "true") {
      lightbox.querySelector("[data-document-close]") && lightbox.querySelector("[data-document-close]").addEventListener("click", closeLightbox);

      searchPrev && searchPrev.addEventListener("click", () => {
        const state = lightbox.searchHitState || {};
        activateSearchHit((state.index || 0) - 1);
      });

      searchNext && searchNext.addEventListener("click", () => {
        const state = lightbox.searchHitState || {};
        activateSearchHit((state.index || 0) + 1);
      });

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
