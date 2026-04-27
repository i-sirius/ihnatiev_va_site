document.addEventListener("DOMContentLoaded", () => {
  const pageType = document.body.dataset.page;
  const activityId = document.body.dataset.activityId;

  function setText(selector, value) {
    if (!value) {
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

    document.querySelectorAll(selector).forEach((element) => {
      element.innerHTML = paragraphs
        .map((paragraph) => `<p>${paragraph}</p>`)
        .join("");
    });
  }

  function renderGallery(selector, images) {
    if (!Array.isArray(images)) {
      return;
    }

    document.querySelectorAll(selector).forEach((element) => {
      element.innerHTML = images
        .map(
          (image) =>
            `<img src="${image.src}" alt="${image.alt}">`
        )
        .join("");
    });
  }

  function renderVideos(selector, videos) {
    if (!Array.isArray(videos)) {
      return;
    }

    document.querySelectorAll(selector).forEach((element) => {
      element.innerHTML = videos
        .map(
          (video) => `
            <div class="video-item">
              <iframe
                src="${video.embed}"
                title="${video.title}"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen>
              </iframe>
            </div>
          `
        )
        .join("");
    });
  }

  function renderDownloads(selector, files) {
    if (!Array.isArray(files)) {
      return;
    }

    document.querySelectorAll(selector).forEach((element) => {
      element.innerHTML = files
        .map(
          (file) =>
            `<li><a href="${file.href}" download>${file.label}</a></li>`
        )
        .join("");
    });
  }

  function updateImage(selector, image) {
    if (!image) {
      return;
    }

    document.querySelectorAll(selector).forEach((element) => {
      element.src = image.src;
      element.alt = image.alt;
    });
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

    const activity = SITE.activities[activityId];

    if (!activity) {
      return;
    }

    document.title = activity.name;
    setText("[data-activity-page-title]", activity.name);
    setText("[data-activity-page-heading]", activity.name);
    updateImage("[data-activity-hero-image]", activity.heroImage);
    renderParagraphs("[data-activity-paragraphs]", activity.pageDescription);
    renderGallery("[data-activity-gallery]", activity.gallery);
    renderVideos("[data-activity-videos]", activity.videos);
  }

  function applyDownloadsPage() {
    if (pageType !== "downloads") {
      return;
    }

    document.title = SITE.downloads.pageTitle;
    setText("[data-downloads-title]", SITE.downloads.pageTitle);
    setText("[data-downloads-heading]", SITE.downloads.heading);
    setText("[data-downloads-intro]", SITE.downloads.intro);
    renderDownloads("[data-downloads-list]", SITE.downloads.files);
  }

  function applyContactPage() {
    if (pageType !== "contact") {
      return;
    }

    document.title = SITE.contact.pageTitle;
    setText("[data-contact-title]", SITE.contact.pageTitle);
    setText("[data-contact-heading]", SITE.contact.heading);
    setText("[data-contact-intro]", SITE.contact.intro);
    setText("[data-contact-name-label]", SITE.contact.fields.name);
    setText("[data-contact-email-label]", SITE.contact.fields.email);
    setText("[data-contact-message-label]", SITE.contact.fields.message);
    setText("[data-contact-submit]", SITE.contact.fields.submit);

    const form = document.querySelector("[data-contact-form]");
    if (form) {
      form.action = SITE.contact.formAction;
    }
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
  }

  fetch("menu.html")
    .then((response) => response.text())
    .then((data) => {
      const menu = document.getElementById("menu");

      if (menu) {
        menu.innerHTML = data;
      }

      applyAllContent();
    })
    .catch(() => {
      applyAllContent();
    });

  applyAllContent();
});
