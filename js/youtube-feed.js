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
    function getFallbackVideos(channelId) {
      if (Array.isArray(site.youtubeFallbackVideos) && site.youtubeFallbackVideos.length) {
        return site.youtubeFallbackVideos;
      }

      return [
        {
          title: site.ui?.video?.playlist || "Плейлист каналу",
          url: "https://youtube.com/playlist?list=PLJiTnA91mVyQTsyn7L64mxggDWd4H63gH&si=PLaUlRCYsZ0n6Mfo"
        },
        {
          title: site.ui?.video?.openChannel || "Відкрити канал",
          url: channelId ? `https://www.youtube.com/channel/${channelId}` : "https://www.youtube.com"
        }
      ];
    }

    function renderVideoCards(videos) {
      if (!Array.isArray(videos)) {
        return;
      }

      const watchLabel = site.ui?.video?.watch || "ДИВИТИСЬ";
      const fallbackTitle = site.ui?.video?.fallbackTitle || "YouTube";
      const viewsLabel = site.ui?.video?.views || "переглядів";

      document.querySelectorAll(selector).forEach((element) => {
        element.innerHTML = videos
          .filter((video) => video?.url)
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
      const fallbackTitle = site.ui?.video?.fallbackTitle || "YouTube";

      document.querySelectorAll(selector).forEach((element) => {
        element.innerHTML = videos
          .filter((video) => video?.url)
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
            site.ui?.video?.fallbackText ||
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
        const updatedAt = Number(parsed?.updatedAt) || 0;
        const videos = Array.isArray(parsed?.videos) ? parsed.videos.slice(0, 6) : [];

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
          const videoId =
            item.getElementsByTagName("yt:videoId")[0]?.textContent?.trim() ||
            item.getElementsByTagName("videoId")[0]?.textContent?.trim();

          if (!videoId) {
            return null;
          }

          return {
            title:
              item.querySelector("title")?.textContent?.trim() ||
              site.ui?.video?.fallbackTitle ||
              "YouTube video",
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            viewCount:
              item.getElementsByTagName("media:statistics")[0]?.getAttribute("views") ||
              item.getElementsByTagName("statistics")[0]?.getAttribute("views") ||
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

        renderStatus(site.ui?.video?.cachedText, {
          loading: true
        });
      } else if (fallbackVideos.length) {
        renderFallback(channelId, site.ui?.video?.updating, {
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
            renderStatus(site.ui?.video?.cachedFallbackText || site.ui?.video?.cachedText);
          } else if (!cachedVideos.length) {
            renderFallback(channelId, site.ui?.video?.fallbackText);
          }
        })
        .catch(() => {
          if (cachedVideos.length) {
            renderStatus(site.ui?.video?.cachedFallbackText || site.ui?.video?.cachedText);
          } else {
            renderFallback(channelId, site.ui?.video?.fallbackText);
          }
        })
        .finally(() => {
          youtubeFeedLoading = false;
        });
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
