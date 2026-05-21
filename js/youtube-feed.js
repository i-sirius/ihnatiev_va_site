(() => {
  const youtubeCacheMaxAgeMs = 6 * 60 * 60 * 1000;
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

  function fetchWithTimeout(url, responseParser, timeoutMs = 4500) {
    if (!window.AbortController) {
      return fetch(url).then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed for ${url}`);
        }

        return responseParser(response);
      });
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed for ${url}`);
        }

        return responseParser(response);
      })
      .then(
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

  function fetchYoutubeFeedXml(channelId) {
    const cacheBuster = `t=${Date.now()}`;
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

  function createYoutubeFeed({
    site = window.SITE || {},
    selector = "[data-activity-videos]",
    getLocalizedValue = (value, fallback = "") => value || fallback,
    escapeHtml = (value) => String(value)
  } = {}) {
    function getVideoUi() {
      return site.ui && site.ui.video ? site.ui.video : {};
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

    function renderVideoCards(videos) {
      if (!Array.isArray(videos)) {
        return;
      }

      const videoUi = getVideoUi();
      const watchLabel = videoUi.watch || "ДИВИТИСЬ";
      const fallbackTitle = videoUi.fallbackTitle || "YouTube";
      const viewsLabel = videoUi.views || "переглядів";

      document.querySelectorAll(selector).forEach((element) => {
        element.innerHTML = videos
          .filter((video) => video && video.url)
          .map((video) => {
            const title = getLocalizedValue(video.title, fallbackTitle);
            const url = escapeHtml(video.url);
            const thumbnail = video.thumbnail ? escapeHtml(video.thumbnail) : "";
            const viewsText = formatVideoViews(
              video.viewCount,
              viewsLabel,
              site.currentLocale || "uk"
            );
            const actionMarkup = viewsText
              ? `
                <span class="video-card-link-icon" aria-hidden="true"></span>
                <span class="video-card-link-copy">
                  <span class="video-card-link-label">${escapeHtml(watchLabel)}</span>
                  <span class="video-card-link-views">${escapeHtml(viewsText)}</span>
                </span>
              `
              : `
                <span class="video-card-link-icon" aria-hidden="true"></span>
                <span class="video-card-link-copy">
                  <span class="video-card-link-label">${escapeHtml(watchLabel)}</span>
                </span>
              `;
            const thumb = video.thumbnail
              ? `<img class="video-card-thumb" src="${thumbnail}" alt="${escapeHtml(title)}" loading="lazy" decoding="async">`
              : `<div class="video-card-thumb video-card-thumb-fallback">${escapeHtml(fallbackTitle)}</div>`;

            return `
              <a class="activity-card video-card" href="${url}" target="_blank" rel="noopener noreferrer">
                ${thumb}
                <h3>${escapeHtml(title)}</h3>
                <span class="button-link video-card-link">${actionMarkup}</span>
              </a>
            `;
          })
          .join("");
      });
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
        if (!status) {
          status = document.createElement("div");
          status.className = "video-status-text";
          status.setAttribute("data-youtube-status", "");
          element.prepend(status);
        }

        status.classList.toggle("is-loading", Boolean(options.loading));
        status.textContent = fallbackText;
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
                <div class="video-card-thumb video-card-thumb-loading"></div>
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

    function load() {
      const target = document.querySelector(selector);
      const channelId = site.youtubeChannelId;

      if (!target || !channelId || youtubeFeedLoading) {
        return;
      }

      youtubeFeedLoading = true;
      const cache = readCache(channelId);
      const cachedVideos = cache.videos;
      const fallbackVideos = getFallbackVideos(channelId);

      if (cachedVideos.length) {
        renderVideoCards(cachedVideos);
        if (cache.isFresh) {
          renderStatus("");
          youtubeFeedLoading = false;
          return;
        }

        renderStatus(getVideoUi().cachedText, {
          loading: true
        });
      } else if (fallbackVideos.length) {
        renderFallback(channelId, getVideoUi().updating, {
          loading: true
        });
      } else {
        renderLoading();
      }

      fetchYoutubeFeedXml(channelId)
        .then((xmlText) => {
          const videos = normalizeFeedItems(xmlText);

          if (videos.length) {
            writeCache(channelId, videos);
            renderStatus("");
            renderVideoCards(videos);
          } else if (cachedVideos.length) {
            renderStatus(getVideoUi().cachedFallbackText || getVideoUi().cachedText);
          } else if (!cachedVideos.length) {
            renderFallback(channelId, getVideoUi().fallbackText);
          }
        })
        .catch(() => {
          if (cachedVideos.length) {
            renderStatus(getVideoUi().cachedFallbackText || getVideoUi().cachedText);
          } else {
            renderFallback(channelId, getVideoUi().fallbackText);
          }
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
