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
      return `youtube-feed:v2:${channelId}`;
    }

    function readCacheEntry(key) {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || "null");
        const videos = parsed && Array.isArray(parsed.videos)
          ? parsed.videos.filter((video) => video && video.url).slice(0, 6)
          : [];
        return videos.length ? { videos, updatedAt: Number(parsed.updatedAt) || 0 } : null;
      } catch {
        return null;
      }
    }

    function readCache(channelId) {
      const cacheKey = getCacheKey(channelId);
      const cached = readCacheEntry(cacheKey);
      if (cached) {
        return cached.videos;
      }

      try {
        const previousCaches = Object.keys(localStorage)
          .filter((key) => key !== cacheKey && key.startsWith("youtube-feed:v2:") && key.endsWith(`:${channelId}`))
          .map(readCacheEntry)
          .filter(Boolean)
          .sort((a, b) => b.updatedAt - a.updatedAt);

        if (previousCaches.length) {
          const previousVideos = previousCaches.flatMap(({ videos }) => videos);
          return mergeVideoMetadata(previousCaches[0].videos, previousVideos);
        }
      } catch {
        // Storing video statistics is optional.
      }

      return [];
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
        ? "as of"
        : "станом на";
      const date = new Intl.DateTimeFormat(getVideoLocale() === "en" ? "en-GB" : "uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }).format(new Date());

      const heading = document.querySelector("[data-activity-videos-heading]");
      if (!heading) {
        return;
      }

      let status = heading.querySelector("[data-youtube-sync-status]");
      if (!status) {
        status = document.createElement("span");
        status.className = "activity-videos-sync-status";
        status.setAttribute("data-youtube-sync-status", "");
        heading.appendChild(status);
      }

      status.textContent = `(${label} ${date})`;
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
      let iconType = "file";
      let formatPath = "M7 13h10M7 17h8";

      if (type === "PDF") {
        iconType = "pdf";
        formatPath = "M5.8 17.5v-5.4h1.6a1.35 1.35 0 0 1 0 2.7H5.8 M10.6 17.5v-5.4h.9a2.05 2.05 0 0 1 2.05 2.05v1.3a2.05 2.05 0 0 1-2.05 2.05z M15.6 17.5v-5.4h2.8m-2.8 2.7h2.4";
      } else if (type === "DOC" || type === "DOCX" || type === "WORD") {
        iconType = "doc";
        formatPath = "M5.8 17.5v-5.4h.9a2.05 2.05 0 0 1 2.05 2.05v1.3a2.05 2.05 0 0 1-2.05 2.05z M12.1 12.1a1.45 1.45 0 0 1 1.45 1.45v2.5a1.45 1.45 0 0 1-2.9 0v-2.5a1.45 1.45 0 0 1 1.45-1.45z M18.4 12.1H17a1.45 1.45 0 0 0-1.45 1.45v2.5A1.45 1.45 0 0 0 17 17.5h1.4";
      }

      return `
        <svg class="video-card-doc-icon is-${iconType}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"
             fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
          <path stroke-width="1.5" d="M4.75 2.75H14l6.5 6.5V20a1.25 1.25 0 0 1-1.25 1.25H4.75A1.25 1.25 0 0 1 3.5 20V4a1.25 1.25 0 0 1 1.25-1.25Z M14 2.75v6.5h6.5"/>
          <path stroke-width="1.2" d="${formatPath}"/>
        </svg>
      `;
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

    return {
      load,
      renderVideoCards
    };
  }

  window.SiteYoutubeFeed = {
    create: createYoutubeFeed,
    load: function (options) {
      return createYoutubeFeed(options).load();
    }
  };
})();
