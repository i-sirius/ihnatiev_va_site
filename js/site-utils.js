(() => {
  function setText(selector, value) {
    if (value == null) {
      return;
    }

    document.querySelectorAll(selector).forEach((element) => {
      element.textContent = value;
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getLocalizedValue(value, fallback = "") {
    if (value == null) {
      return fallback;
    }

    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "object" && !Array.isArray(value)) {
      const site = window.SITE || {};
      const locale = site.currentLocale || site.defaultLocale || "uk";
      const defaultLocale = site.defaultLocale || "uk";
      const stringValue = Object.values(value).find((item) => typeof item === "string");
      const localizedValue =
        value[locale] != null
          ? value[locale]
          : value[defaultLocale] != null
            ? value[defaultLocale]
            : stringValue;
      return typeof localizedValue === "string" ? localizedValue : fallback;
    }

    return fallback;
  }

  function isSafeUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return false;
    }

    const normalized = raw.replace(/[\u0000-\u001F\u007F\s]+/g, "").toLowerCase();
    const schemeMatch = normalized.match(/^([a-z][a-z0-9+.-]*):/);

    if (!schemeMatch) {
      return true;
    }

    return schemeMatch[1] === "http" || schemeMatch[1] === "https";
  }

  function setSafeUrlAttribute(element, attribute, value) {
    if (!element || !isSafeUrl(value)) {
      return false;
    }

    element.setAttribute(attribute, String(value).trim());
    return true;
  }

  window.SiteUtils = {
    escapeHtml,
    getLocalizedValue,
    isSafeUrl,
    setSafeUrlAttribute,
    setText
  };
})();
