(() => {
  const youtubeFeedTimeoutMs = 6000;
  var VIDEO_SUPPORT_DOCS = {
    "_W5SGM5gTQk": {
      url: "/files/video-docs/activity1/personhood-without-christ.pdf",
      label: "Матеріали",
      labelEn: "Materials",
      type: "pdf"
    },
    /*
    "YOUTUBE_VIDEO_ID": {
      url: "/files/video-docs/activity1/rashism-yak-forma-etnofiletizmu.pdf",
      label: "Матеріали",
      labelEn: "Materials",
      type: "pdf"
    }
    */
    "bL44iPuxY84": {
      url: "/files/video-docs/activity1/hesychasm-and-frequent-communion.pdf",
      label: "Матеріали",
      labelEn: "Materials",
      type: "pdf"
    },
    "Q8KNXpftoJE": {
      url: "/files/video-docs/activity1/corporeality-and-synergy.pdf",
      label: "Матеріали",
      labelEn: "Materials",
      type: "pdf"
    },
    "9UyBUqF-GWY": {
      url: "/files/video-docs/activity1/rashism-yak-forma-etnofiletizmu.pdf",
      label: "Матеріали",
      labelEn: "Materials",
      type: "pdf"
    },
    "cfcq_70pfKI": {
      url: "/files/video-docs/activity1/theological-enology.pdf",
      label: "Матеріали",
      labelEn: "Materials",
      type: "pdf"
    }
  };
  let youtubeFeedRequest = 0;

  function formatVideoViews(value, viewsLabel, locale = "uk") {
    if (value === null || value === undefined || value === "") {
      return "";
    }
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      return "";
    }

    try {
      return `${new Intl.NumberFormat(locale).format(numericValue)} ${viewsLabel}`;
    } catch {
      return `${numericValue} ${viewsLabel}`;
    }
  }

  function fetchWithTimeout(url, responseParser, timeoutMs = youtubeFeedTimeoutMs) {
    let controller = null;
    let timeoutId = null;
    const fetchOptions = {};
    const timeoutPromise = new Promise((resolve, reject) => {
      timeoutId = window.setTimeout(() => {
        if (controller) {
          controller.abort();
        }
        reject(new Error(`Request timed out for ${url}`));
      }, timeoutMs);
    });

    if (window.AbortController) {
      controller = new AbortController();
      fetchOptions.signal = controller.signal;
    }

    const requestPromise = fetch(url, fetchOptions)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed for ${url}`);
        }

        return responseParser(response);
      });

    return Promise.race([requestPromise, timeoutPromise]).then(
      (result) => {
        window.clearTimeout(timeoutId);
        return result;
      },
      (error) => {
        window.clearTimeout(timeoutId);
        throw error;
      }
    );
  }

  function fetchYoutubeFeedXml(channelId, options = {}) {
    const retryToken = options.retryToken ? String(options.retryToken) : "";
    const cacheBuster = retryToken ? `retry=${encodeURIComponent(retryToken)}` : `t=${Date.now()}`;
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}&${cacheBuster}`;
    const getUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;
    const rawUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
    const attempts = [
      () =>
        fetchWithTimeout(getUrl, (response) => response.json()).then((payload) => {
          if (payload && typeof payload.contents === "string" && payload.contents.trim()) {
            return payload.contents;
          }

          throw new Error("Empty AllOrigins get payload");
        }),
      () => fetchWithTimeout(rawUrl, (response) => response.text())
    ];

    let chain = Promise.reject(new Error("Initial YouTube feed attempt"));
    attempts.forEach((attempt) => {
      chain = chain.catch(() => attempt());
    });

    return chain;
  }

  function fetchLocalVideoIndex() {
    return fetchWithTimeout("files/content/video-index.json", (response) => response.json(), 3000)
      .then((payload) => {
        const items = payload && Array.isArray(payload.items) ? payload.items : [];

        return items
          .filter((item) => item && item.enabled !== false && (item.id || item.videoId || item.url))
          .sort((a, b) => (Date.parse(b.publishedAt || b.date) || 0) - (Date.parse(a.publishedAt || a.date) || 0))
          .map((item) => {
            const videoId = item.videoId || item.id || getYoutubeVideoId(item);

            if (!videoId) {
              return null;
            }

            return {
              videoId,
              title: {
                uk: item.title || item.titleEn || "YouTube video",
                en: item.titleEn || item.title || "YouTube video"
              },
              thumbnail: `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`,
              url: item.url || `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
              supportDocuments: Array.isArray(item.supportDocuments)
                ? item.supportDocuments.filter((doc) => doc && doc.enabled !== false && doc.url)
                : [],
              viewCount: item.viewCount ?? null,
              viewCountUpdatedAt: item.viewCountUpdatedAt || ""
            };
          })
          .filter(Boolean)
          .slice(0, 6);
      });
  }

  function getYoutubeVideoId(video) {
    const url = video && video.url ? String(video.url) : "";

    if (video && video.videoId) {
      return String(video.videoId);
    }

    const watchMatch = url.match(/[?&]v=([^&#]+)/);
    if (watchMatch && watchMatch[1]) {
      return watchMatch[1];
    }

    const shortMatch = url.match(/youtu\.be\/([^?&#]+)/);
    if (shortMatch && shortMatch[1]) {
      return shortMatch[1];
    }

    return "";
  }

  function createYoutubeFeed({
    site = window.SITE || {},
    selector = "[data-activity-videos]",
    getLocalizedValue = (value, fallback = "") => value || fallback,
    escapeHtml = (value) => String(value)
  } = {}) {
    let lastRenderedVideos = [];
    let catalogueVideos = [];
    let loading = false;
    var videoTargetTimer = 0;
    var videoTargetAttempt = 0;
    var videoResolvedTargetId = "";
    var videoPendingScrollId = "";

    function getVideoUi() {
      return site.ui && site.ui.video ? site.ui.video : {};
    }

    function getVideoLocale() {
      return site.currentLocale === "en" ? "en" : "uk";
    }

    function getVideoErrorText() {
      return getVideoLocale() === "en"
        ? "Could not load the latest videos. Fallback links are shown."
        : "Не вдалося завантажити актуальні відео. Показано резервні посилання.";
    }

    function getRetryText() {
      return getVideoLocale() === "en" ? "Try again" : "Спробувати ще раз";
    }

    function getWatchAriaLabel(title) {
      return getVideoLocale() === "en" ? `Watch video: ${title}` : `Дивитись відео: ${title}`;
    }

    function getSupportDocForVideo(video) {
      const videoId = getYoutubeVideoId(video);
      const attachedDoc = Array.isArray(video.supportDocuments)
        ? video.supportDocuments.find((doc) => doc && doc.enabled !== false && doc.url)
        : null;
      const fallbackDoc = videoId ? VIDEO_SUPPORT_DOCS[videoId] : null;

      if (attachedDoc) {
        return {
          url: attachedDoc.url,
          label: attachedDoc.title || attachedDoc.label || "Матеріали",
          labelEn: attachedDoc.titleEn || attachedDoc.labelEn || "Materials",
          type: attachedDoc.type || "pdf"
        };
      }

      return fallbackDoc && fallbackDoc.url ? fallbackDoc : null;
    }

    function getSupportDocLabel(doc) {
      const fallbackLabel = getVideoLocale() === "en" ? "Materials" : "Матеріали";

      if (getVideoLocale() === "en") {
        return doc.labelEn || doc.label || fallbackLabel;
      }

      return doc.label || fallbackLabel;
    }

    function getFallbackVideos(channelId) {
      if (Array.isArray(site.youtubeFallbackVideos) && site.youtubeFallbackVideos.length) {
        return site.youtubeFallbackVideos;
      }

      return [
        {
          title: getVideoUi().playlist || "Плейлист каналу",
          url: "https://youtube.com/playlist?list=PLJiTnA91mVyQTsyn7L64mxggDWd4H63gH&si=PLaUlRCYsZ0n6Mfo"
        },
        {
          title: getVideoUi().openChannel || "Відкрити канал",
          url: channelId ? `https://www.youtube.com/channel/${channelId}` : "https://www.youtube.com"
        }
      ];
    }

    function getTargetVideoIdFromHash() {
      const rawHash = window.location && window.location.hash ? window.location.hash.slice(1) : "";
      if (!rawHash) {
        return "";
      }

      try {
        return decodeURIComponent(rawHash);
      } catch (error) {
        return rawHash;
      }
    }

    function getComfortHeaderOffset() {
      var headerOffsetValue = "";
      var headerOffset = 0;
      var header = document.querySelector(".site-header");

      try {
        headerOffsetValue = getComputedStyle(document.documentElement)
          .getPropertyValue("--site-header-offset")
          .trim();
        headerOffset = parseFloat(headerOffsetValue) || 0;
      } catch (error) {
        headerOffset = 0;
      }

      if (!headerOffset && header && header.getBoundingClientRect) {
        headerOffset = header.getBoundingClientRect().height || 0;
      }

      return headerOffset;
    }

    function findParentDetails(element) {
      var current = element;

      while (current && current !== document.body) {
        if (current.tagName && current.tagName.toLowerCase() === "details") {
          return current;
        }
        current = current.parentNode;
      }

      return null;
    }

    function ensureTargetSectionOpen(target) {
      var details = findParentDetails(target);

      if (details && !details.open) {
        details.open = true;
        if (typeof window.CustomEvent === "function") {
          window.dispatchEvent(new CustomEvent("site:layout-shift"));
        }
      }
    }

    function isVisibleVideoTarget(target) {
      var rect;

      if (!target || !target.getBoundingClientRect) {
        return false;
      }

      rect = target.getBoundingClientRect();
      if (rect.height <= 0 || rect.width <= 0) {
        return false;
      }

      if (target.offsetParent === null && getComputedStyle(target).position !== "fixed") {
        return false;
      }

      return true;
    }

    function scrollTargetIntoComfortView(target) {
      var rect;
      var headerOffset;
      var viewportHeight;
      var comfortOffset;
      var top;

      if (!target || !target.getBoundingClientRect || !window.scrollTo) {
        return;
      }

      rect = target.getBoundingClientRect();
      headerOffset = getComfortHeaderOffset();
      viewportHeight = window.innerHeight || document.documentElement.clientHeight || 720;
      comfortOffset = Math.max(96, Math.floor(viewportHeight * 0.32));
      top = rect.top + (window.pageYOffset || document.documentElement.scrollTop || 0) - headerOffset - comfortOffset;
      window.scrollTo(0, Math.max(0, top));
    }

    function markTargetVideoCard(target) {
      if (!target) {
        return;
      }

      if (target.classList) {
        target.classList.add("is-targeted");
      } else if (target.className.indexOf("is-targeted") < 0) {
        target.className += " is-targeted";
      }

      target.setAttribute("tabindex", "-1");
      target.style.scrollMarginTop = "96px";
      target.style.outline = "2px solid rgba(145, 110, 42, 0.5)";
      target.style.outlineOffset = "4px";

      window.setTimeout(() => {
        if (target.classList) {
          target.classList.remove("is-targeted");
        }
        target.style.outline = "";
        target.style.outlineOffset = "";
      }, 2800);
    }

    function resolveTargetVideoCard() {
      var targetId = getTargetVideoIdFromHash();
      var target;

      if (!targetId || targetId.indexOf("video-") !== 0) {
        return true;
      }

      target = document.getElementById(targetId);
      if (!target) {
        return false;
      }

      ensureTargetSectionOpen(target);
      if (!isVisibleVideoTarget(target)) {
        return false;
      }

      if (videoResolvedTargetId === targetId) {
        return true;
      }

      videoResolvedTargetId = targetId;
      videoPendingScrollId = "";
      scrollTargetIntoComfortView(target);
      markTargetVideoCard(target);
      return true;
    }

    function scheduleTargetVideoCardScroll() {
      var targetId = getTargetVideoIdFromHash();
      var maxAttempts = 22;

      if (!targetId || targetId.indexOf("video-") !== 0) {
        return;
      }

      if (videoTargetTimer) {
        window.clearTimeout(videoTargetTimer);
        videoTargetTimer = 0;
      }

      if (videoPendingScrollId !== targetId) {
        videoTargetAttempt = 0;
        videoPendingScrollId = targetId;
      }

      function tryResolve() {
        var resolved = false;

        try {
          resolved = resolveTargetVideoCard();
        } catch (error) {
          resolved = true;
        }

        videoTargetAttempt += 1;
        if (resolved || videoTargetAttempt >= maxAttempts) {
          videoTargetTimer = 0;
          return;
        }

        videoTargetTimer = window.setTimeout(tryResolve, videoTargetAttempt < 3 ? 120 : 220);
      }

      videoTargetTimer = window.setTimeout(tryResolve, 120);
    }

    function renderVideoCards(videos) {
      if (!Array.isArray(videos)) {
        return;
      }

      const videoUi = getVideoUi();
      const watchLabel = videoUi.watch || "ДИВИТИСЬ";
      const fallbackTitle = videoUi.fallbackTitle || "YouTube";
      const viewsLabel = videoUi.views || "переглядів";
      const validVideos = videos.filter((video) => video && video.url);

      if (validVideos.length) {
        lastRenderedVideos = validVideos.slice(0, 6);
      }

      document.querySelectorAll(selector).forEach((element) => {
        element.innerHTML = validVideos
          .map((video) => {
            const title = getLocalizedValue(
              video.title && typeof video.title === "object"
                ? video.title[getVideoLocale()] || video.title.uk || video.title.en
                : video.title,
              fallbackTitle
            );
            const url = escapeHtml(video.url);
            const videoId = getYoutubeVideoId(video);
            const cardId = videoId ? `video-${videoId}` : "";
            const cardAttributes = cardId
              ? ` id="${escapeHtml(cardId)}" data-video-id="${escapeHtml(videoId)}"`
              : "";
            const thumbnail = video.thumbnail ? escapeHtml(video.thumbnail) : "";
            const viewsText = formatVideoViews(
              video.viewCount,
              viewsLabel,
              site.currentLocale || "uk"
            );
            const supportDoc = getSupportDocForVideo(video);
            const watchAriaLabel = getWatchAriaLabel(title);
            const actionMarkup = viewsText
              ? `
                <span class="video-card-link-icon is-youtube" aria-hidden="true"></span>
                <span class="video-card-link-copy">
                  <span class="video-card-link-label">${escapeHtml(watchLabel)}</span>
                  <span class="video-card-link-views">${escapeHtml(viewsText)}</span>
                </span>
              `
              : `
                <span class="video-card-link-icon is-youtube" aria-hidden="true"></span>
                <span class="video-card-link-copy">
                  <span class="video-card-link-label">${escapeHtml(watchLabel)}</span>
                </span>
              `;
            const supportDocMarkup = supportDoc
              ? `
                <button class="button-link video-card-doc-link" type="button"
                  data-video-document-preview
                  data-document-href="${escapeHtml(supportDoc.url)}"
                  data-document-type="${escapeHtml(getSupportDocType(supportDoc))}"
                  data-document-title="${escapeHtml(getSupportDocLabel(supportDoc))}"
                  title="${escapeHtml(getSupportDocLabel(supportDoc))}">
                  ${getSupportDocIconMarkup(getSupportDocType(supportDoc))}
                  <span class="video-card-doc-title">${escapeHtml(
                    getSupportDocLabel(supportDoc)
                  )}</span>
                </button>
              `
              : "";
            const thumb = video.thumbnail
              ? `<a class="video-card-media" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(watchAriaLabel)}"><img class="video-card-thumb" src="${thumbnail}" alt="${escapeHtml(title)}" loading="lazy" decoding="async"></a>`
              : `<a class="video-card-media" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(watchAriaLabel)}"><span class="video-card-thumb video-card-thumb-fallback">${escapeHtml(fallbackTitle)}</span></a>`;

            return `
              <article class="activity-card video-card"${cardAttributes}>
                ${thumb}
                <h3>${escapeHtml(title)}</h3>
                <div class="video-card-actions">
                  <a class="button-link video-card-link" href="${url}" target="_blank" rel="noopener noreferrer">${actionMarkup}</a>
                  ${supportDocMarkup}
                </div>
              </article>
            `;
          })
          .join("");
      });

      scheduleTargetVideoCardScroll();
    }

    function renderFallbackLinks(videos) {
      const fallbackTitle = getVideoUi().fallbackTitle || "YouTube";

      document.querySelectorAll(selector).forEach((element) => {
        element.innerHTML = videos
          .filter((video) => video && video.url)
          .map((video) => {
            const title = getLocalizedValue(
              video.title && typeof video.title === "object"
                ? video.title[getVideoLocale()] || video.title.uk || video.title.en
                : video.title,
              fallbackTitle
            );
            const url = escapeHtml(video.url);

            return `
              <a class="button-link video-fallback-link" href="${url}" target="_blank" rel="noopener noreferrer">
                <span class="video-card-link-icon" aria-hidden="true"></span>
                <span class="video-card-link-copy">
                  <span class="video-card-link-label">${escapeHtml(title)}</span>
                </span>
              </a>
            `;
          })
          .join("");
      });
    }

    function renderStatus(statusText = "", options = {}) {
      const fallbackText =
        statusText === ""
          ? ""
          : statusText ||
            getVideoUi().fallbackText ||
            "Канал доступний за посиланням нижче.";

      document.querySelectorAll(selector).forEach((element) => {
        let status = element.querySelector("[data-youtube-status]");
        let message = null;
        let retryButton = null;

        if (!status) {
          status = document.createElement("div");
          status.className = "video-status-text";
          status.setAttribute("data-youtube-status", "");
          element.insertBefore(status, element.firstChild);
        }

        status.classList.toggle("is-loading", Boolean(options.loading));
        status.classList.toggle("is-error", Boolean(options.error));
        status.textContent = "";

        if (fallbackText) {
          message = document.createElement("span");
          message.className = "video-status-message";
          message.textContent = fallbackText;
          status.appendChild(message);
        }

        if (options.retry) {
          retryButton = document.createElement("button");
          retryButton.className = "button-link video-retry-button";
          retryButton.type = "button";
          retryButton.textContent = getRetryText();
          retryButton.disabled = Boolean(options.retryDisabled || options.loading);
          retryButton.addEventListener("click", () => {
            retryButton.disabled = true;
            load({ retry: true });
          });
          status.appendChild(retryButton);
        }

        status.hidden = !fallbackText;
      });
    }

    function renderFallback(channelId, statusText = "", options = {}) {
      renderFallbackLinks(getFallbackVideos(channelId));
      renderStatus(statusText, options);
    }

    function getCacheKey(channelId) {
      const buildVersion = site && site.meta && site.meta.buildVersion
        ? String(site.meta.buildVersion)
        : "default";
      return `youtube-feed:v2:${buildVersion}:${channelId}`;
    }

    function readCache(channelId) {
      try {
        const parsed = JSON.parse(localStorage.getItem(getCacheKey(channelId)) || "null");
        return parsed && Array.isArray(parsed.videos)
          ? parsed.videos.filter((video) => video && video.url).slice(0, 6)
          : [];
      } catch {
        return [];
      }
    }

    function writeCache(channelId, videos) {
      try {
        localStorage.setItem(
          getCacheKey(channelId),
          JSON.stringify({
            updatedAt: Date.now(),
            videos
          })
        );
      } catch {
        // Ignore storage errors and continue rendering normally.
      }
    }

    function normalizeFeedItems(xmlText) {
      const xml = new DOMParser().parseFromString(xmlText, "application/xml");
      if (xml.querySelector("parsererror")) {
        throw new Error("Invalid YouTube XML");
      }

      return Array.from(xml.querySelectorAll("entry"))
        .slice(0, 6)
        .map((item) => {
          const namespacedVideoIdNode = item.getElementsByTagName("yt:videoId")[0];
          const videoIdNode = item.getElementsByTagName("videoId")[0];
          const titleNode = item.querySelector("title");
          const namespacedStatisticsNode = item.getElementsByTagName("media:statistics")[0];
          const statisticsNode = item.getElementsByTagName("statistics")[0];
          const videoId =
            (namespacedVideoIdNode && namespacedVideoIdNode.textContent
              ? namespacedVideoIdNode.textContent.trim()
              : "") ||
            (videoIdNode && videoIdNode.textContent ? videoIdNode.textContent.trim() : "");

          if (!videoId) {
            return null;
          }

          return {
            videoId,
            title: {
              uk: titleNode && titleNode.textContent ? titleNode.textContent.trim() : getVideoUi().fallbackTitle || "YouTube video",
              en: titleNode && titleNode.textContent ? titleNode.textContent.trim() : getVideoUi().fallbackTitle || "YouTube video"
            },
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            viewCount:
              (namespacedStatisticsNode && namespacedStatisticsNode.getAttribute("views")) ||
              (statisticsNode && statisticsNode.getAttribute("views")) ||
              null,
            viewCountUpdatedAt: new Date().toISOString()
          };
        })
        .filter(Boolean);
    }

    function mergeVideoMetadata(videos, savedVideos = []) {
      return videos.map((video) => {
        const id = getYoutubeVideoId(video);
        const canonical = catalogueVideos.find((item) => getYoutubeVideoId(item) === id);
        const candidates = [video, ...savedVideos, ...catalogueVideos, ...lastRenderedVideos]
          .filter((item) => getYoutubeVideoId(item) === id && item.viewCount !== null
            && item.viewCount !== undefined && String(item.viewCount).trim() !== ""
            && Number.isFinite(Number(item.viewCount)) && Number(item.viewCount) >= 0)
          .sort((a, b) => (Date.parse(b.viewCountUpdatedAt) || 0) - (Date.parse(a.viewCountUpdatedAt) || 0));
        const stats = candidates[0];
        return {
          ...video,
          title: canonical ? canonical.title : video.title,
          supportDocuments: canonical && Array.isArray(canonical.supportDocuments)
            ? canonical.supportDocuments
            : (video.supportDocuments || []),
          viewCount: stats ? Number(stats.viewCount) : null,
          viewCountUpdatedAt: stats ? stats.viewCountUpdatedAt : ""
        };
      });
    }

    function load(options = {}) {
      const target = document.querySelector(selector);
      const channelId = site.youtubeChannelId;
      if (!target || !channelId || loading) {
        return Promise.resolve();
      }

      loading = true;
      const request = ++youtubeFeedRequest;
      const isCurrent = () => request === youtubeFeedRequest;
      const cachedVideos = readCache(channelId);
      if (cachedVideos.length) {
        renderVideoCards(cachedVideos);
      } else {
        renderFallback(channelId);
      }
      renderStatus("");

      // Load our own catalogue first; the visitor never waits for the RSS proxy.
      return fetchLocalVideoIndex()
        .then((localVideos) => {
          if (isCurrent() && localVideos.length) {
            catalogueVideos = localVideos;
            const videos = mergeVideoMetadata(localVideos, cachedVideos);
            renderVideoCards(videos);
            writeCache(channelId, videos);
            renderVideoSyncStatus();
          }
        })
        .catch(() => {
          // Keep cached cards or usable channel links if the local file is unavailable.
        })
        .then(() => {
          if (!isCurrent()) {
            return;
          }
          return fetchYoutubeFeedXml(channelId, {
            retryToken: options.retry ? Date.now() : ""
          }).then((xmlText) => {
            if (!isCurrent()) {
              return;
            }
            const videos = mergeVideoMetadata(normalizeFeedItems(xmlText));
            if (!videos.length) {
              throw new Error("Empty YouTube feed");
            }
            writeCache(channelId, videos);
            renderVideoCards(videos);
            renderStatus("");
            renderVideoSyncStatus();
          });
        })
        .catch(() => {
          // A background refresh failure is not a page error when cards are available.
          if (isCurrent() && !lastRenderedVideos.length) {
            renderFallback(channelId, getVideoErrorText(), { error: true, retry: true });
          }
        })
        .then(() => {
          loading = false;
        });
    }

    function renderVideoSyncStatus() {
      const label = getVideoLocale() === "en"
        ? "Videos checked"
        : "Відео перевірено";
      const date = new Intl.DateTimeFormat(getVideoLocale() === "en" ? "en-GB" : "uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }).format(new Date());

      document.querySelectorAll(selector).forEach((element) => {
        let status = element.querySelector("[data-youtube-status]");
        if (!status) {
          status = document.createElement("div");
          status.className = "video-status-text";
          status.setAttribute("data-youtube-status", "");
          element.insertBefore(status, element.firstChild);
        }

        status.className = "video-status-text is-sync";
        status.textContent = `${label} · ${date}`;
        status.hidden = false;
      });
    }

    function getSupportDocType(doc) {
      const explicit = doc && doc.type ? String(doc.type).trim().toUpperCase() : "";
      if (explicit) {
        return explicit;
      }

      const match = String(doc && doc.url ? doc.url : "").match(/\.([a-z0-9]{2,5})(?:$|[?#])/i);
      return match ? match[1].toUpperCase() : "FILE";
    }

    function getSupportDocIconMarkup(type) {
      const normalized = String(type || "FILE").toUpperCase();

      if (normalized === "PDF") {
        return '<svg class="video-card-doc-icon is-pdf" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6 2.8h8.4L20 8.4V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4.8a2 2 0 0 1 2-2Zm7.8 1.8v4.3h4.3L13.8 4.6ZM8 17.8v-6h2.6c1.5 0 2.4.8 2.4 2.1 0 1.4-.9 2.2-2.4 2.2H9.5v1.7H8Zm1.5-3h1c.6 0 1-.3 1-.9s-.4-.8-1-.8h-1v1.7Zm4.4 3v-6h2.3c1.9 0 3.2 1.2 3.2 3s-1.3 3-3.2 3h-2.3Zm1.5-1.3h.7c1.1 0 1.8-.7 1.8-1.8s-.7-1.8-1.8-1.8h-.7v3.6Zm4.7 1.3v-6h3.9v1.3h-2.4v1.2h2.1v1.3h-2.1v2.2h-1.5Z"/></svg>';
      }

      if (normalized === "DOC" || normalized === "DOCX" || normalized === "WORD") {
        return '<svg class="video-card-doc-icon is-doc" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6 2.8h8.4L20 8.4V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4.8a2 2 0 0 1 2-2Zm7.8 1.8v4.3h4.3L13.8 4.6ZM7.8 17.8v-6H10c1.9 0 3.1 1.2 3.1 3s-1.2 3-3.1 3H7.8Zm1.5-1.3H10c1 0 1.6-.6 1.6-1.7S11 13.1 10 13.1H9.3v3.4Zm7.2 1.4c-1.7 0-2.8-1.2-2.8-3.1s1.1-3.1 2.8-3.1 2.8 1.2 2.8 3.1-1.1 3.1-2.8 3.1Z"/></svg>';
      }

      return '<svg class="video-card-doc-icon is-file" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6 2.8h8.4L20 8.4V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4.8a2 2 0 0 1 2-2Zm7.8 1.8v4.3h4.3L13.8 4.6ZM8 17.7v-5.8h1.5v4.5h2.6v1.3H8Zm5-5.8h1.5v5.8H13v-5.8Zm2.8 0h4.1v1.3h-2.6v1h2.2v1.3h-2.2v2.2h-1.5v-5.8Z"/></svg>';
    }

    function bindSupportDocPreview() {
      document.querySelectorAll(selector).forEach((element) => {
        if (element.dataset.videoDocumentPreviewBound === "true") {
          return;
        }

        element.dataset.videoDocumentPreviewBound = "true";
        element.addEventListener("click", (event) => {
          const trigger = event.target.closest("[data-video-document-preview]");
          if (!trigger) {
            return;
          }

          event.preventDefault();
          const href = trigger.dataset.documentHref || "";
          const type = trigger.dataset.documentType || "FILE";
          const label = trigger.dataset.documentTitle || "";

          if (type === "PDF" && window.SiteDocumentLightbox && typeof window.SiteDocumentLightbox.ensure === "function") {
            const lightbox = window.SiteDocumentLightbox.ensure({
              site,
              getLocalizedValue: getLocalizedValue,
              getDownloadFileType: () => "PDF"
            });
            lightbox.showPreview({ href, label, type: "PDF" });
            return;
          }

          if (href) {
            window.open(href, "_blank", "noopener");
          }
        });
      });
    }

    bindSupportDocPreview();
  }

  createYoutubeFeed({
    site: window.SITE,
    selector: "[data-activity-videos]",
    getLocalizedValue: (value, fallback) => value || fallback,
    escapeHtml: (value) => String(value)
  });
})();
