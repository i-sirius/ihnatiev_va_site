(() => {
  const youtubeCacheMaxAgeMs = 6 * 60 * 60 * 1000;
  const youtubeFeedTimeoutMs = 6000;
  var VIDEO_SUPPORT_DOCS = {
    /*
    "YOUTUBE_VIDEO_ID": {
      url: "/files/video-docs/activity1/example.pdf",
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
    "cfcq_70pfKI": {
      url: "/files/video-docs/activity1/theological-enology.pdf",
      label: "Матеріали",
      labelEn: "Materials",
      type: "pdf"
    }
  };
  let youtubeFeedLoading = false;

  function formatVideoViews(value, viewsLabel, locale = "uk") {
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
              viewCount: null
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
      const doc = videoId ? VIDEO_SUPPORT_DOCS[videoId] : null;

      if (!doc || !doc.url) {
        return null;
      }

      return doc;
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
            const title = getLocalizedValue(video.title, fallbackTitle);
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
                <a class="button-link video-card-doc-link" href="${escapeHtml(
                  supportDoc.url
                )}" target="_blank" rel="noopener">
                  <span class="video-card-doc-label">${escapeHtml(
                    getSupportDocLabel(supportDoc)
                  )}</span>
                </a>
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
            const title = getLocalizedValue(video.title, fallbackTitle);
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

    function renderLoading() {
      document.querySelectorAll(selector).forEach((element) => {
        element.innerHTML = Array.from({ length: 3 })
          .map(
            () => `
              <article class="activity-card video-card video-card-loading" aria-hidden="true">
                <div class="video-card-media video-card-media-loading">
                  <div class="video-card-thumb-loading"></div>
                </div>
                <div class="video-card-line video-card-line-title"></div>
                <div class="video-card-line video-card-line-button"></div>
              </article>
            `
          )
          .join("");
      });
    }

    function getCacheKey(channelId) {
      return `youtube-feed:${channelId}`;
    }

    function readCache(channelId) {
      try {
        const raw = localStorage.getItem(getCacheKey(channelId));
        if (!raw) {
          return {
            videos: [],
            updatedAt: 0,
            isFresh: false
          };
        }

        const parsed = JSON.parse(raw);
        const updatedAt = Number(parsed && parsed.updatedAt) || 0;
        const videos = parsed && Array.isArray(parsed.videos) ? parsed.videos.slice(0, 6) : [];

        return {
          videos,
          updatedAt,
          isFresh: videos.length > 0 && Date.now() - updatedAt < youtubeCacheMaxAgeMs
        };
      } catch {
        return {
          videos: [],
          updatedAt: 0,
          isFresh: false
        };
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
            title:
              (titleNode && titleNode.textContent ? titleNode.textContent.trim() : "") ||
              getVideoUi().fallbackTitle ||
              "YouTube video",
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            viewCount:
              (namespacedStatisticsNode && namespacedStatisticsNode.getAttribute("views")) ||
              (statisticsNode && statisticsNode.getAttribute("views")) ||
              null
          };
        })
        .filter(Boolean);
    }

    function renderFailure(channelId, cachedVideos) {
      const preservedVideos = cachedVideos.length ? cachedVideos : lastRenderedVideos;

      if (preservedVideos.length) {
        renderVideoCards(preservedVideos);
        renderStatus(getVideoErrorText(), {
          error: true,
          retry: true
        });
        return;
      }

      renderFallback(channelId, getVideoErrorText(), {
        error: true,
        retry: true
      });
    }

    function renderFailureWithLocalIndex(channelId, cachedVideos) {
      return fetchLocalVideoIndex()
        .then((localVideos) => {
          if (localVideos.length) {
            renderVideoCards(localVideos);
            renderStatus(getVideoErrorText(), {
              error: true,
              retry: true
            });
            return;
          }

          renderFailure(channelId, cachedVideos);
        })
        .catch(() => {
          renderFailure(channelId, cachedVideos);
        });
    }

    function load(options = {}) {
      const target = document.querySelector(selector);
      const channelId = site.youtubeChannelId;
      const isRetry = Boolean(options.retry);

      if (!target || !channelId || youtubeFeedLoading) {
        return;
      }

      youtubeFeedLoading = true;
      const cache = readCache(channelId);
      const cachedVideos = cache.videos;
      const fallbackVideos = getFallbackVideos(channelId);

      if (cachedVideos.length) {
        renderVideoCards(cachedVideos);
        if (cache.isFresh && !isRetry) {
          renderStatus("");
          youtubeFeedLoading = false;
          return;
        }

        renderStatus(isRetry ? getVideoUi().updating : getVideoUi().cachedText, {
          loading: true,
          retry: isRetry,
          retryDisabled: isRetry
        });
      } else if (fallbackVideos.length) {
        renderFallback(channelId, getVideoUi().updating, {
          loading: true,
          retry: isRetry,
          retryDisabled: isRetry
        });
      } else {
        renderLoading();
      }

      fetchYoutubeFeedXml(channelId, {
        retryToken: isRetry ? Date.now() : ""
      })
        .then((xmlText) => {
          const videos = normalizeFeedItems(xmlText);

          if (videos.length) {
            writeCache(channelId, videos);
            renderStatus("");
            renderVideoCards(videos);
          } else if (cachedVideos.length) {
            return renderFailureWithLocalIndex(channelId, cachedVideos);
          } else if (!cachedVideos.length) {
            return renderFailureWithLocalIndex(channelId, cachedVideos);
          }
        })
        .catch(() => {
          return renderFailureWithLocalIndex(channelId, cachedVideos);
        })
        .then(
          () => {
            youtubeFeedLoading = false;
          },
          () => {
            youtubeFeedLoading = false;
          }
        );
    }

    if (window.addEventListener) {
      window.addEventListener("hashchange", scheduleTargetVideoCardScroll);
    }

    return {
      load,
      renderVideoCards
    };
  }

  function loadYoutubeFeed(options = {}) {
    return createYoutubeFeed(options).load();
  }

  window.SiteYoutubeFeed = {
    create: createYoutubeFeed,
    load: loadYoutubeFeed
  };
})();
