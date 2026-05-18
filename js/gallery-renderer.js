(() => {
  const activityLightboxState = {
    items: [],
    galleryPromise: null
  };

  function ensureLightbox(site = window.SITE || {}) {
    return window.SiteGalleryLightbox?.ensure({
      site
    });
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

  function renderGallery({
    selector,
    images,
    site = window.SITE || {},
    escapeHtml = (value) => String(value)
  } = {}) {
    if (!Array.isArray(images)) {
      return;
    }

    document.querySelectorAll(selector).forEach((element) => {
      const count = images.length;
      if (!count) {
        element.style.removeProperty("--gallery-columns");
        element.innerHTML = `<p class="gallery-empty">${escapeHtml(
          site.ui?.gallery?.empty || "Фото тимчасово відсутні."
        )}</p>`;
        return;
      }

      const columns = Math.min(Math.max(count, 1), 5);
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

      const lightbox = ensureLightbox(site);
      element.querySelectorAll("[data-gallery-index]").forEach((button) => {
        button.addEventListener("click", () => {
          lightbox?.showItems(images, Number(button.dataset.galleryIndex || "0"));
        });
      });

      applyPortraitState(element);
    });
  }

  function initActivityHeroLightbox({ image, site = window.SITE || {} } = {}) {
    const hero = document.querySelector("[data-activity-hero-image]");
    if (!hero || !image?.src) {
      return;
    }

    const lightbox = ensureLightbox(site);
    const showHero = () => {
      const heroItem = {
        src: hero.currentSrc || hero.src || image.src,
        alt: hero.alt || image.alt || ""
      };
      const galleryItems = activityLightboxState.items.filter((item) => item?.src !== heroItem.src);

      lightbox?.showItems([
        heroItem,
        ...galleryItems
      ], 0);
    };
    const openHero = () => {
      if (activityLightboxState.galleryPromise) {
        activityLightboxState.galleryPromise.finally(showHero);
        return;
      }

      showHero();
    };

    activityLightboxState.items = [
      {
        src: image.src,
        alt: image.alt || ""
      },
      ...activityLightboxState.items.filter((item) => item?.src !== image.src)
    ];

    hero.classList.add("is-clickable");
    hero.tabIndex = 0;
    hero.setAttribute("role", "button");
    hero.setAttribute("aria-label", site.ui?.gallery?.open || image.alt || "Відкрити фото");

    if (hero.dataset.heroLightboxBound === "true") {
      return;
    }

    hero.addEventListener("click", openHero);
    hero.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      openHero();
    });
    hero.dataset.heroLightboxBound = "true";
  }

  function initHomeAboutLightbox({
    image,
    pageType = document.body.dataset.page,
    site = window.SITE || {}
  } = {}) {
    const aboutImage = document.querySelector("[data-home-about-image]");
    if (pageType !== "home" || !aboutImage || !image?.src) {
      return;
    }

    const lightbox = ensureLightbox(site);
    const openImage = () => {
      lightbox?.showItems([
        {
          src: aboutImage.currentSrc || aboutImage.src || image.src,
          alt: aboutImage.alt || image.alt || ""
        }
      ], 0);
    };

    aboutImage.classList.add("is-clickable");
    aboutImage.tabIndex = 0;
    aboutImage.setAttribute("role", "button");
    aboutImage.setAttribute("aria-label", site.ui?.gallery?.open || image.alt || "Відкрити фото");

    if (aboutImage.dataset.homeLightboxBound === "true") {
      return;
    }

    aboutImage.addEventListener("click", openImage);
    aboutImage.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      openImage();
    });
    aboutImage.dataset.homeLightboxBound = "true";
  }

  function setActivityLightboxGalleryItems({
    images,
    pageType = document.body.dataset.page
  } = {}) {
    if (pageType !== "activity") {
      return;
    }

    const hero = document.querySelector("[data-activity-hero-image]");
    const heroItem = hero
      ? {
          src: hero.currentSrc || hero.src || "",
          alt: hero.alt || ""
        }
      : null;
    const galleryItems = Array.isArray(images) ? images.filter((item) => item?.src) : [];

    activityLightboxState.items = [
      ...(heroItem?.src ? [heroItem] : []),
      ...galleryItems.filter((item) => item.src !== heroItem?.src)
    ];
  }

  function setActivityGalleryPromise(promise) {
    activityLightboxState.galleryPromise = promise || null;
  }

  window.SiteGalleryRenderer = {
    applyPortraitState,
    initActivityHeroLightbox,
    initHomeAboutLightbox,
    renderGallery,
    setActivityGalleryPromise,
    setActivityLightboxGalleryItems
  };
})();
