(() => {
  function fetchJson(url) {
    return fetch(url).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load ${url}`);
      }

      return response.json();
    });
  }

  function normalizeJsonList(payload, keys = []) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && typeof payload === "object") {
      const matchedKey = keys.find((key) => Array.isArray(payload[key]));
      return matchedKey ? payload[matchedKey] : [];
    }

    return [];
  }

  function filterAvailableImages(images) {
    if (!Array.isArray(images) || !images.length) {
      return Promise.resolve([]);
    }

    return Promise.all(
      images.map(
        (image) =>
          new Promise((resolve) => {
            if (!image?.src) {
              resolve(null);
              return;
            }

            const probe = new Image();
            probe.onload = () => resolve(image);
            probe.onerror = () => resolve(null);
            probe.src = image.src;
          })
      )
    ).then((resolvedImages) => resolvedImages.filter(Boolean));
  }

  function loadActivityGallery({
    id,
    selector = "[data-activity-gallery]",
    renderGallery = () => {},
    setActivityLightboxGalleryItems = () => {},
    setActivityGalleryPromise = () => {}
  } = {}) {
    const galleryPromise = fetchJson(`files/media/activity${id}/photos.json`)
      .then((images) => {
        const galleryImages = normalizeJsonList(images, ["images", "photos"]);
        return filterAvailableImages(galleryImages).then((availableImages) => {
          setActivityLightboxGalleryItems(availableImages);
          renderGallery(selector, availableImages);
          return availableImages;
        });
      })
      .catch(() => {
        setActivityLightboxGalleryItems([]);
        renderGallery(selector, []);
        return [];
      })
      .finally(() => {
        setActivityGalleryPromise(null);
      });

    setActivityGalleryPromise(galleryPromise);
  }

  function loadFileList({
    path,
    selector,
    fallbackFiles = [],
    renderDownloads = () => {}
  } = {}) {
    fetchJson(path)
      .then((files) => {
        const fileList = normalizeJsonList(files, ["files", "items"]);
        renderDownloads(selector, fileList.length ? fileList : fallbackFiles);
      })
      .catch(() => {
        renderDownloads(selector, fallbackFiles);
      });
  }

  function loadDownloadsGroups({
    path,
    selector,
    fallbackGroups = null,
    renderDownloadsGroups = () => {}
  } = {}) {
    fetchJson(path)
      .then((groups) => {
        if (groups && typeof groups === "object" && !Array.isArray(groups)) {
          renderDownloadsGroups(selector, groups);
          return;
        }

        if (fallbackGroups && typeof fallbackGroups === "object") {
          renderDownloadsGroups(selector, fallbackGroups);
        }
      })
      .catch(() => {
        if (fallbackGroups && typeof fallbackGroups === "object") {
          renderDownloadsGroups(selector, fallbackGroups);
        }
      });
  }

  function normalizeHomeContent(payload, locale = "uk", fallbackHome = {}) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return fallbackHome;
    }

    const localizedHome = payload[locale] || payload.uk || {};
    if (!localizedHome || typeof localizedHome !== "object" || Array.isArray(localizedHome)) {
      return fallbackHome;
    }

    const nextHome = {
      ...fallbackHome,
      ...localizedHome,
      aboutImage: {
        ...(fallbackHome.aboutImage || {}),
        ...(localizedHome.aboutImage || {})
      }
    };

    if (!Array.isArray(localizedHome.aboutParagraphs)) {
      nextHome.aboutParagraphs = fallbackHome.aboutParagraphs;
    }

    return nextHome;
  }

  function loadHomeContent({
    path = "files/content/home.json",
    locale = "uk",
    fallbackHome = {}
  } = {}) {
    return fetchJson(path)
      .then((payload) => normalizeHomeContent(payload, locale, fallbackHome))
      .catch(() => fallbackHome);
  }

  window.SiteContentLoader = {
    fetchJson,
    filterAvailableImages,
    loadActivityGallery,
    loadDownloadsGroups,
    loadFileList,
    loadHomeContent,
    normalizeJsonList
  };
})();
