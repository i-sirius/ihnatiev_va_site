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

  function normalizeActivitiesContent(payload, locale = "uk", fallbackActivities = {}) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return fallbackActivities;
    }

    const localizedActivities = payload[locale] || payload.uk || {};
    if (
      !localizedActivities ||
      typeof localizedActivities !== "object" ||
      Array.isArray(localizedActivities)
    ) {
      return fallbackActivities;
    }

    return Object.entries(fallbackActivities).reduce((activities, [id, fallbackActivity]) => {
      const localizedActivity = localizedActivities[id] || {};
      if (!localizedActivity || typeof localizedActivity !== "object" || Array.isArray(localizedActivity)) {
        activities[id] = fallbackActivity;
        return activities;
      }

      activities[id] = {
        ...fallbackActivity,
        ...localizedActivity,
        heroImage: {
          ...(fallbackActivity.heroImage || {}),
          ...(localizedActivity.heroImage || {})
        }
      };
      return activities;
    }, {});
  }

  function loadActivitiesContent({
    path = "files/content/activities.json",
    locale = "uk",
    fallbackActivities = {}
  } = {}) {
    return fetchJson(path)
      .then((payload) => normalizeActivitiesContent(payload, locale, fallbackActivities))
      .catch(() => fallbackActivities);
  }

  function normalizePagesContent(payload, locale = "uk", fallbackSite = {}) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return {};
    }

    const localizedPages = payload[locale] || payload.uk || {};
    if (!localizedPages || typeof localizedPages !== "object" || Array.isArray(localizedPages)) {
      return {};
    }

    const downloads = localizedPages.downloads && typeof localizedPages.downloads === "object"
      ? {
          ...(fallbackSite.downloads || {}),
          ...localizedPages.downloads
        }
      : fallbackSite.downloads;
    const localizedContact = localizedPages.contact && typeof localizedPages.contact === "object"
      ? localizedPages.contact
      : null;
    const contact = localizedContact
      ? {
          ...(fallbackSite.contact || {}),
          ...localizedContact,
          socials: {
            ...(fallbackSite.contact?.socials || {}),
            ...(localizedContact.socials || {})
          },
          fields: {
            ...(fallbackSite.contact?.fields || {}),
            ...(localizedContact.fields || {})
          }
        }
      : fallbackSite.contact;

    return { downloads, contact };
  }

  function loadPagesContent({
    path = "files/content/pages.json",
    locale = "uk",
    fallbackSite = {}
  } = {}) {
    return fetchJson(path)
      .then((payload) => normalizePagesContent(payload, locale, fallbackSite))
      .catch(() => ({}));
  }

  function normalizePublicationsItems(items, fallbackItems = []) {
    const sourceItems = Array.isArray(items) ? items : fallbackItems;

    if (!Array.isArray(sourceItems)) {
      return [];
    }

    return sourceItems
      .map((item) => {
        if (typeof item === "string") {
          return { text: item };
        }

        if (!item || typeof item !== "object") {
          return null;
        }

        const text = item.text || item.item || "";
        if (!text) {
          return null;
        }

        return {
          text,
          year: item.year || "",
          type: item.type || "other"
        };
      })
      .filter(Boolean);
  }

  function normalizePublicationsContent(payload, locale = "uk", fallbackPublications = {}) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return fallbackPublications;
    }

    const localizedLabels = payload[locale] || payload.uk || {};
    const items = normalizePublicationsItems(payload.items, fallbackPublications.items);

    return {
      ...fallbackPublications,
      ...localizedLabels,
      variant: "publications",
      items: items.length ? items : normalizePublicationsItems(fallbackPublications.items)
    };
  }

  function loadPublicationsContent({
    path = "files/content/publications.json",
    locale = "uk",
    fallbackPublications = {}
  } = {}) {
    return fetchJson(path)
      .then((payload) => normalizePublicationsContent(payload, locale, fallbackPublications))
      .catch(() => fallbackPublications);
  }

  window.SiteContentLoader = {
    fetchJson,
    filterAvailableImages,
    loadActivitiesContent,
    loadActivityGallery,
    loadDownloadsGroups,
    loadFileList,
    loadHomeContent,
    loadPagesContent,
    loadPublicationsContent,
    normalizeJsonList
  };
})();
