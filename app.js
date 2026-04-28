document.addEventListener("DOMContentLoaded", () => {
  const pageType = document.body.dataset.page;
  const activityId = document.body.dataset.activityId;
  const themeAssets = {
    light: "files/media/logo-light.png",
    dark: "files/media/logo-dark.png"
  };
  const homeFallbackImage = SITE?.home?.aboutImage || {
    src: "files/media/about-me-photo.jpg",
    alt: "Фото"
  };
  let youtubeFeedLoading = false;
  let currentGalleryItems = [];
  let currentGalleryIndex = 0;

  function setText(selector, value) {
    if (value == null) {
      return;
    }

    document.querySelectorAll(selector).forEach((element) => {
      element.textContent = value;
    });
  }

  function renderParagraphs(selector, paragraphs) {
    if (!Array.isArray(paragraphs)) {
      return;
    }

    const defaultDetailsSummary = "\u0414\u0435\u0442\u0430\u043b\u0456";
    const defaultExpandLabel = "\u0420\u041e\u0417\u0413\u041e\u0420\u041d\u0423\u0422\u0418";
    const defaultCloseLabel = "\u0417\u0413\u041e\u0420\u041d\u0423\u0422\u0418";
    const defaultCloseAria = "\u0417\u0433\u043e\u0440\u043d\u0443\u0442\u0438 \u0441\u043f\u0438\u0441\u043e\u043a";

    document.querySelectorAll(selector).forEach((element) => {
      element.innerHTML = paragraphs
        .map((paragraph) => {
          if (typeof paragraph === "string") {
            return `<p>${paragraph}</p>`;
          }

          if (paragraph?.type === "details") {
            const items = Array.isArray(paragraph.items)
              ? paragraph.items.map((item) => `<li>${item}</li>`).join("")
              : "";
            const description = paragraph.description
              ? `<p class="about-details-description">${paragraph.description}</p>`
              : "";

            return `
              <details class="about-details">
                <summary>
                  <span class="about-details-summary-text">${paragraph.summary || defaultDetailsSummary}</span>
                  <span class="about-details-arrow" aria-hidden="true">
                    <span class="about-details-arrow-icon"></span>
                    <span class="about-details-arrow-label" data-label="${defaultExpandLabel}">${defaultExpandLabel}</span>
                  </span>
                </summary>
                <div class="about-details-body">
                  <div class="about-details-tools">
                    <button type="button" class="about-details-close" aria-label="${defaultCloseAria}">
                      <span class="about-details-close-icon"></span>
                      <span class="about-details-close-label">${defaultCloseLabel}</span>
                    </button>
                  </div>
                  ${description}
                  <ol class="about-details-list">${items}</ol>
                </div>
              </details>
            `;
          }

          if (paragraph?.type === "content-details") {
            const description = paragraph.description
              ? `<p class="about-details-description">${paragraph.description}</p>`
              : "";
            const contentParagraphs = Array.isArray(paragraph.paragraphs)
              ? paragraph.paragraphs.map((item) => `<p>${item}</p>`).join("")
              : "";
            const summaryText =
              paragraph.summary ||
              "\u041f\u043e\u043a\u0430\u0437\u0430\u043d\u043e \u0441\u043a\u043e\u0440\u043e\u0447\u0435\u043d\u0443 \u0432\u0435\u0440\u0441\u0456\u044e. \u041d\u0438\u0436\u0447\u0435 \u043c\u043e\u0436\u043d\u0430 \u043f\u0440\u043e\u0447\u0438\u0442\u0430\u0442\u0438 \u043f\u043e\u0432\u043d\u0438\u0439 \u0442\u0435\u043a\u0441\u0442.";
            const actionLabel =
              paragraph.actionLabel || "\u0427\u0438\u0442\u0430\u0442\u0438 \u0434\u0430\u043b\u0456...";
            const closeLabel =
              paragraph.closeLabel || "\u0417\u0433\u043e\u0440\u043d\u0443\u0442\u0438";

            return `
              <details class="about-details about-details-content">
                <summary>
                  <span class="about-details-summary-text">${summaryText}</span>
                  <span class="about-details-arrow" aria-hidden="true">
                    <span class="about-details-arrow-icon"></span>
                    <span class="about-details-arrow-label" data-open-label="${actionLabel}" data-close-label="${closeLabel}">${actionLabel}</span>
                  </span>
                </summary>
                <div class="about-details-body">
                  ${description}
                  <div class="about-details-copy">${contentParagraphs}</div>
                </div>
              </details>
            `;
          }

          return "";
        })
        .join("");
    });
  }

  function initDetailsInteractions() {
    document.querySelectorAll(".about-details").forEach((details) => {
      if (details.dataset.enhanced === "true") {
        return;
      }

      details.dataset.enhanced = "true";
      const closeButton = details.querySelector(".about-details-close");

      closeButton?.addEventListener("click", () => {
        details.open = false;
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      });
    });
  }

  function updateImage(selector, image, fallbackImage = null) {
    const source = image || fallbackImage;
    if (!source) {
      return;
    }

    document.querySelectorAll(selector).forEach((element) => {
      element.alt = source.alt || "";
      element.src = source.src;

      if (fallbackImage?.src) {
        element.onerror = () => {
          element.onerror = null;
          element.src = fallbackImage.src;
          element.alt = fallbackImage.alt || source.alt || "";
        };
      }
    });
  }

  function ensureLightbox() {
    let lightbox = document.querySelector("[data-gallery-lightbox]");

    if (lightbox) {
      return lightbox;
    }

    lightbox = document.createElement("div");
    lightbox.className = "gallery-lightbox";
    lightbox.hidden = true;
    lightbox.setAttribute("data-gallery-lightbox", "");
    lightbox.innerHTML = `
      <button class="lightbox-close" type="button" aria-label="Закрити" data-lightbox-close>×</button>
      <button class="lightbox-nav prev" type="button" aria-label="Попереднє фото" data-lightbox-prev>‹</button>
      <figure class="lightbox-figure">
        <img src="" alt="" data-lightbox-image>
      </figure>
      <button class="lightbox-nav next" type="button" aria-label="Наступне фото" data-lightbox-next>›</button>
    `;
    document.body.appendChild(lightbox);

    const image = lightbox.querySelector("[data-lightbox-image]");

    function updateLightboxImage() {
      const item = currentGalleryItems[currentGalleryIndex];
      if (!item || !image) {
        return;
      }

      image.src = item.src;
      image.alt = item.alt || "";
    }

    function closeLightbox() {
      lightbox.hidden = true;
      document.body.classList.remove("lightbox-open");
    }

    function showByIndex(index) {
      if (!currentGalleryItems.length) {
        return;
      }

      currentGalleryIndex =
        (index + currentGalleryItems.length) % currentGalleryItems.length;
      updateLightboxImage();
      lightbox.hidden = false;
      document.body.classList.add("lightbox-open");
    }

    lightbox.querySelector("[data-lightbox-close]")?.addEventListener("click", closeLightbox);
    lightbox.querySelector("[data-lightbox-prev]")?.addEventListener("click", () => {
      showByIndex(currentGalleryIndex - 1);
    });
    lightbox.querySelector("[data-lightbox-next]")?.addEventListener("click", () => {
      showByIndex(currentGalleryIndex + 1);
    });

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

      if (event.key === "ArrowLeft") {
        showByIndex(currentGalleryIndex - 1);
      }

      if (event.key === "ArrowRight") {
        showByIndex(currentGalleryIndex + 1);
      }
    });

    lightbox.showByIndex = showByIndex;
    return lightbox;
  }

  function applyPortraitState(container) {
    container.querySelectorAll("img").forEach((image) => {
      const markOrientation = () => {
        const isPortrait = image.naturalHeight > image.naturalWidth;
        image.closest(".gallery-item")?.classList.toggle("is-portrait", isPortrait);
      };

      if (image.complete) {
        markOrientation();
      } else {
        image.addEventListener("load", markOrientation, { once: true });
      }
    });
  }

  function renderGallery(selector, images) {
    if (!Array.isArray(images)) {
      return;
    }

    document.querySelectorAll(selector).forEach((element) => {
      const count = images.length;
      const columns = Math.min(Math.max(count, 1), 4);
      element.style.setProperty("--gallery-columns", String(columns));
      element.innerHTML = images
        .map(
          (image, index) => `
            <button class="gallery-item" type="button" data-gallery-index="${index}">
              <img src="${image.src}" alt="${image.alt || ""}" loading="lazy">
            </button>
          `
        )
        .join("");

      const lightbox = ensureLightbox();
      element.querySelectorAll("[data-gallery-index]").forEach((button) => {
        button.addEventListener("click", () => {
          currentGalleryItems = images;
          currentGalleryIndex = Number(button.dataset.galleryIndex || "0");
          lightbox.showByIndex(currentGalleryIndex);
        });
      });

      applyPortraitState(element);
    });
  }

  function renderDownloads(selector, files) {
    if (!Array.isArray(files)) {
      return;
    }

    document.querySelectorAll(selector).forEach((element) => {
      element.innerHTML = files
        .map(
          (file) => `
            <li>
              <a href="${file.href}" download>
                <span>${file.label}</span>
              </a>
            </li>
          `
        )
        .join("");
    });
  }

  function renderVideoCards(selector, videos) {
    if (!Array.isArray(videos)) {
      return;
    }

    const watchLabel = "\u0414\u0418\u0412\u0418\u0422\u0418\u0421\u042c";

    document.querySelectorAll(selector).forEach((element) => {
      element.innerHTML = videos
        .map(
          (video) => `
            <a class="activity-card video-card" href="${video.url}" target="_blank" rel="noopener noreferrer">
              <img class="video-card-thumb" src="${video.thumbnail}" alt="${video.title}" loading="lazy">
              <h3>${video.title}</h3>
              <span class="button-link video-card-link">${watchLabel}</span>
            </a>
          `
        )
        .join("");
    });
  }

  function renderYoutubeFallback(selector) {
    const playlistUrl =
      "https://youtube.com/playlist?list=PLJiTnA91mVyQTsyn7L64mxggDWd4H63gH&si=PLaUlRCYsZ0n6Mfo";
    const playlistLabel = "\u041f\u043b\u0435\u0439\u043b\u0438\u0441\u0442 \u043a\u0430\u043d\u0430\u043b\u0443";
    const watchLabel = "\u0414\u0418\u0412\u0418\u0422\u0418\u0421\u042c";

    document.querySelectorAll(selector).forEach((element) => {
      element.innerHTML = `
        <a class="activity-card video-card video-card-fallback" href="${playlistUrl}" target="_blank" rel="noopener noreferrer">
          <div class="video-card-thumb video-card-thumb-fallback">YouTube</div>
          <h3>${playlistLabel}</h3>
          <span class="button-link video-card-link">${watchLabel}</span>
        </a>
      `;
    });
  }

  function renderYoutubeLoading(selector) {
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

  function getYoutubeCacheKey(channelId) {
    return `youtube-feed:${channelId}`;
  }

  function readYoutubeCache(channelId) {
    try {
      const raw = localStorage.getItem(getYoutubeCacheKey(channelId));
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.videos) ? parsed.videos.slice(0, 6) : [];
    } catch {
      return [];
    }
  }

  function writeYoutubeCache(channelId, videos) {
    try {
      localStorage.setItem(
        getYoutubeCacheKey(channelId),
        JSON.stringify({
          updatedAt: Date.now(),
          videos
        })
      );
    } catch {
      // Ignore storage errors and continue rendering normally.
    }
  }

  function fetchWithTimeout(url, responseParser, timeoutMs = 9000) {
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
      () => fetchWithTimeout(rawUrl, (response) => response.text()),
      () =>
        fetchWithTimeout(getUrl, (response) => response.json(), 12000).then((payload) => {
          if (typeof payload?.contents === "string" && payload.contents.trim()) {
            return payload.contents;
          }

          throw new Error("Retry AllOrigins get payload is empty");
        }),
      () => fetchWithTimeout(rawUrl, (response) => response.text(), 12000)
    ];

    let chain = Promise.reject(new Error("Initial YouTube feed attempt"));
    attempts.forEach((attempt) => {
      chain = chain.catch(() => attempt());
    });

    return chain;
  }

  function fetchJson(url) {
    return fetch(url).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load ${url}`);
      }

      return response.json();
    });
  }

  function loadActivityGallery(id) {
    const selector = "[data-activity-gallery]";
    const activity = SITE.activities?.[id];
    const fallbackImages = Array.isArray(activity?.gallery) ? activity.gallery : [];

    fetchJson(`files/media/activity${id}/photos.json`)
      .then((images) => {
        renderGallery(selector, Array.isArray(images) ? images : fallbackImages);
      })
      .catch(() => {
        renderGallery(selector, fallbackImages);
      });
  }

  function loadFileList(path, selector, fallbackFiles = []) {
    fetchJson(path)
      .then((files) => {
        renderDownloads(selector, Array.isArray(files) ? files : fallbackFiles);
      })
      .catch(() => {
        renderDownloads(selector, fallbackFiles);
      });
  }

  function loadYoutubeFeed() {
    const target = document.querySelector("[data-activity-videos]");
    const channelId = SITE.youtubeChannelId;

    if (!target || !channelId || youtubeFeedLoading) {
      return;
    }

    youtubeFeedLoading = true;
    const cachedVideos = readYoutubeCache(channelId);

    if (cachedVideos.length) {
      renderVideoCards("[data-activity-videos]", cachedVideos);
    } else {
      renderYoutubeLoading("[data-activity-videos]");
    }

    fetchYoutubeFeedXml(channelId)
      .then((xmlText) => {
        const xml = new DOMParser().parseFromString(xmlText, "application/xml");
        if (xml.querySelector("parsererror")) {
          throw new Error("Invalid YouTube XML");
        }

        const items = Array.from(xml.querySelectorAll("entry")).slice(0, 6);
        const videos = items
          .map((item) => {
            const videoId =
              item.getElementsByTagName("yt:videoId")[0]?.textContent?.trim() ||
              item.getElementsByTagName("videoId")[0]?.textContent?.trim();

            if (!videoId) {
              return null;
            }

            return {
              title: item.querySelector("title")?.textContent?.trim() || "YouTube video",
              thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              url: `https://www.youtube.com/watch?v=${videoId}`
            };
          })
          .filter(Boolean);

        if (videos.length) {
          writeYoutubeCache(channelId, videos);
          renderVideoCards("[data-activity-videos]", videos);
        } else {
          renderYoutubeFallback("[data-activity-videos]");
        }
      })
      .catch(() => {
        if (cachedVideos.length) {
          renderVideoCards("[data-activity-videos]", cachedVideos);
        } else {
          renderYoutubeFallback("[data-activity-videos]");
        }
      })
      .finally(() => {
        youtubeFeedLoading = false;
      });
  }

  function initThemeToggle() {
    const header = document.querySelector(".site-header");
    if (!header || header.querySelector(".theme-toggle")) {
      return;
    }

    const savedTheme = localStorage.getItem("site-theme");
    const theme = savedTheme || document.documentElement.getAttribute("data-theme") || "light";
    document.documentElement.setAttribute("data-theme", theme);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "theme-toggle";
    toggle.setAttribute("aria-label", "Перемкнути тему");
    toggle.innerHTML = `
      <span class="theme-toggle-track">
        <span class="theme-toggle-thumb"></span>
      </span>
    `;

    if (theme === "dark") {
      toggle.classList.add("is-dark");
    }

    toggle.addEventListener("click", () => {
      const nextTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", nextTheme);
      localStorage.setItem("site-theme", nextTheme);
      toggle.classList.toggle("is-dark", nextTheme === "dark");
      applyThemeAssets(nextTheme);
    });

    header.appendChild(toggle);
  }

  function applyThemeAssets(theme = "light") {
    const asset = theme === "dark" ? themeAssets.dark : themeAssets.light;

    document.querySelectorAll("[data-site-brand-logo]").forEach((element) => {
      element.src = asset;
    });

    let favicon = document.querySelector("[data-site-favicon]");

    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      favicon.type = "image/png";
      favicon.setAttribute("data-site-favicon", "");
      document.head.appendChild(favicon);
    }

    favicon.href = asset;
  }

  function initHeaderBrand() {
    const header = document.querySelector(".site-header");
    if (!header || header.querySelector(".site-brand-link")) {
      return;
    }

    const brand = document.createElement("a");
    brand.className = "site-brand-link";
    brand.href = "index.html";
    brand.setAttribute("aria-label", SITE.meta?.homeTitle || "Ігнатьєв Віталій");
    brand.innerHTML = `
      <img
        class="site-brand-logo"
        data-site-brand-logo
        src="${themeAssets.light}"
        alt="${SITE.meta?.homeTitle || "Ігнатьєв Віталій"}"
      >
    `;
    header.appendChild(brand);
  }

  function applyGlobalContent() {
    const homeTitle = `${SITE.meta.homeTitle} — ${SITE.meta.homeSubtitle}`;

    setText("[data-site-title]", SITE.meta.siteTitle);
    setText("[data-site-subtitle]", SITE.meta.homeSubtitle);
    setText("[data-home-about-heading]", SITE.home.aboutHeading);
    setText("[data-home-activities-heading]", SITE.home.activitiesHeading);
    updateImage("[data-home-about-image]", SITE.home.aboutImage);
    renderParagraphs("[data-home-about-paragraphs]", SITE.home.aboutParagraphs);

    Object.entries(SITE.activities).forEach(([id, activity]) => {
      setText(`[data-activity-name='${id}']`, activity.name);
      setText(`[data-activity-card-description='${id}']`, activity.cardDescription);
    });

    setText("[data-footer]", `© ${SITE.meta.year} ${SITE.meta.ownerName}`);

    if (pageType === "home") {
      document.title = homeTitle;
    }
  }

  function applyActivityPage() {
    if (pageType !== "activity" || !activityId) {
      return;
    }

    const activity = SITE.activities?.[activityId];
    if (!activity) {
      return;
    }

    document.title = activity.name;
    setText("[data-activity-page-title]", activity.name);
    setText("[data-activity-page-heading]", activity.name);

    const heroImage = {
      src: `files/media/activity${activityId}/hero.jpg`,
      alt: activity.heroImage?.alt || activity.name
    };
    updateImage("[data-activity-hero-image]", heroImage, homeFallbackImage);

    renderParagraphs("[data-activity-paragraphs]", activity.pageDescription);
    initDetailsInteractions();
    loadActivityGallery(activityId);

    if (activityId === "1") {
      loadYoutubeFeed();
    }

    if (activityId === "2") {
      loadFileList("files/activity2/files.json", "[data-activity-files]", []);
    }
  }

  function applyDownloadsPage() {
    if (pageType !== "downloads") {
      return;
    }

    document.title = SITE.downloads.pageTitle;
    setText("[data-downloads-title]", SITE.downloads.pageTitle);
    setText("[data-downloads-heading]", SITE.downloads.heading);
    setText("[data-downloads-intro]", SITE.downloads.intro);
    loadFileList("files/downloads/files.json", "[data-downloads-list]", []);
  }

  function applyContactPage() {
    if (pageType !== "contact") {
      return;
    }

    document.title = SITE.contact.pageTitle;
    setText("[data-contact-title]", SITE.contact.pageTitle);
    setText("[data-contact-heading]", SITE.contact.heading);
    setText("[data-contact-name-label]", SITE.contact.fields.name);
    setText("[data-contact-email-label]", SITE.contact.fields.email);
    setText("[data-contact-message-label]", SITE.contact.fields.message);
    setText("[data-contact-submit]", SITE.contact.fields.submit);

    const form = document.querySelector("[data-contact-form]");
    const nameField = form?.querySelector("input[name='name']");
    const emailField = form?.querySelector("input[name='email']");
    const phoneField = form?.querySelector("input[name='phone']");
    const subjectField = form?.querySelector("input[name='subject']");
    const messageField = form?.querySelector("textarea[name='message']");
    const submitButton = form?.querySelector("[data-contact-submit]");
    const counter = document.querySelector("[data-contact-message-count]");
    const noteName = document.querySelector("[data-note-name]");
    const noteSubject = document.querySelector("[data-note-subject]");
    const noteMessage = document.querySelector("[data-contact-message-note]");
    const noteEmail = document.querySelector("[data-note-email]");
    const notePhone = document.querySelector("[data-note-phone]");
    const okName = document.querySelector("[data-ok-name]");
    const okSubject = document.querySelector("[data-ok-subject]");
    const okMessage = document.querySelector("[data-ok-message]");
    const okEmail = document.querySelector("[data-ok-email]");
    const okPhone = document.querySelector("[data-ok-phone]");
    const emailMark = document.querySelector("[data-mark-email]");
    const phoneMark = document.querySelector("[data-mark-phone]");

    if (
      !form ||
      !nameField ||
      !emailField ||
      !phoneField ||
      !subjectField ||
      !messageField ||
      !submitButton ||
      !counter ||
      !noteName ||
      !noteSubject ||
      !noteMessage ||
      !noteEmail ||
      !notePhone ||
      !okName ||
      !okSubject ||
      !okMessage ||
      !okEmail ||
      !okPhone ||
      !emailMark ||
      !phoneMark
    ) {
      return;
    }

    form.action = SITE.contact.formAction;

    function updateContactState() {
      const hasName = nameField.value.trim().length > 0;
      const hasSubject = subjectField.value.trim().length > 0;
      const emailValue = emailField.value.trim();
      const phoneValue = phoneField.value.trim();
      const phoneDigits = phoneValue.replace(/\D/g, "");
      const hasEmail = emailValue.length > 0;
      const hasPhone = phoneValue.length > 0;
      const emailValid = hasEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
      const phoneValid = hasPhone && phoneDigits.length >= 10;
      const hasValidContact = emailValid || phoneValid;
      const messageLength = messageField.value.trim().length;
      const messageValid = messageLength >= 25;
      const remaining = Math.max(25 - messageLength, 0);
      const formIsReady = hasName && hasSubject && hasValidContact && messageValid;

      emailField.setCustomValidity("");
      phoneField.setCustomValidity("");

      if (!hasValidContact) {
        if (hasEmail && !emailValid) {
          emailField.setCustomValidity("Вкажіть коректний email");
        } else if (hasPhone && !phoneValid) {
          phoneField.setCustomValidity("Вкажіть коректний номер телефону");
        } else {
          emailField.setCustomValidity("Вкажіть email або телефон");
          phoneField.setCustomValidity("Вкажіть email або телефон");
        }
      }

      noteName.hidden = hasName;
      okName.hidden = !hasName;
      noteSubject.hidden = hasSubject;
      okSubject.hidden = !hasSubject;

      emailMark.hidden = hasValidContact;
      phoneMark.hidden = hasValidContact;

      if (emailValid) {
        noteEmail.hidden = true;
        okEmail.hidden = false;
      } else {
        okEmail.hidden = true;
        noteEmail.hidden = false;
        noteEmail.textContent = phoneValid
          ? "Необов'язково, бо телефон уже вказано"
          : hasEmail
            ? "Вкажіть коректний email"
            : "Обов'язково: email або телефон";
      }

      if (phoneValid) {
        notePhone.hidden = true;
        okPhone.hidden = false;
      } else {
        okPhone.hidden = true;
        notePhone.hidden = false;
        notePhone.textContent = emailValid
          ? "Необов'язково, бо email уже вказано"
          : hasPhone
            ? "Вкажіть коректний номер телефону"
            : "Обов'язково: телефон або email";
      }

      if (messageValid) {
        noteMessage.hidden = true;
        okMessage.hidden = false;
      } else {
        noteMessage.hidden = false;
        okMessage.hidden = true;
        noteMessage.textContent =
          messageLength > 0
            ? `Обов'язково для заповнення, напишіть хоча б ще ${remaining} символів`
            : "Обов'язково для заповнення (не менше 25 символів)";
      }

      counter.textContent = `${messageLength} / 25+`;
      submitButton.disabled = !formIsReady;
    }

    [nameField, emailField, phoneField, subjectField, messageField].forEach((field) => {
      field.addEventListener("input", updateContactState);
      field.addEventListener("change", updateContactState);
    });

    form.addEventListener("submit", (event) => {
      updateContactState();

      if (submitButton.disabled) {
        event.preventDefault();

        if (!nameField.value.trim()) {
          nameField.reportValidity();
          return;
        }

        if (!subjectField.value.trim()) {
          subjectField.reportValidity();
          return;
        }

        if (emailField.validationMessage) {
          emailField.reportValidity();
          return;
        }

        if (phoneField.validationMessage) {
          phoneField.reportValidity();
          return;
        }

        messageField.reportValidity();
      }
    });

    updateContactState();
  }

  function applyMenuLabels() {
    setText("[data-menu-home]", SITE.menu.home);
    setText("[data-menu-downloads]", SITE.menu.downloads);
    setText("[data-menu-contact]", SITE.menu.contact);

    Object.entries(SITE.activities).forEach(([id, activity]) => {
      setText(`[data-menu-activity='${id}']`, activity.name);
    });
  }

  function applyAllContent() {
    applyGlobalContent();
    applyActivityPage();
    applyDownloadsPage();
    applyContactPage();
    applyMenuLabels();
    initHeaderBrand();
    initThemeToggle();
    initDetailsInteractions();
    applyThemeAssets(document.documentElement.getAttribute("data-theme") || "light");
  }

  fetch("menu.html")
    .then((response) => response.text())
    .then((html) => {
      const menu = document.getElementById("menu");
      if (menu) {
        menu.innerHTML = html;
      }

      applyAllContent();
    })
    .catch(() => {
      applyAllContent();
    });

  applyAllContent();
});
