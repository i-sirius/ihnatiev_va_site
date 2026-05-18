(() => {
  let visitorCounterValue = null;
  let visitorCounterPromise = null;

  function formatVisitorCounter(value, site = window.SITE || {}) {
    const locale = site.currentLocale === "en" ? "en-US" : "uk-UA";
    return new Intl.NumberFormat(locale).format(value);
  }

  function initVisitorCounter({ site = window.SITE || {} } = {}) {
    const valueElement = document.querySelector("[data-footer-counter-value]");
    const separatorElement = document.querySelector("[data-footer-counter-separator]");
    if (!valueElement) {
      return;
    }

    function setCounterText(value, visible = true) {
      valueElement.textContent = value;
      valueElement.hidden = !visible;

      if (separatorElement) {
        separatorElement.hidden = !visible;
      }
    }

    if (!site.visitCounter?.enabled) {
      setCounterText("");
      return;
    }

    if (visitorCounterValue != null) {
      setCounterText(formatVisitorCounter(visitorCounterValue, site));
      return;
    }

    setCounterText("", false);

    if (!visitorCounterPromise) {
      const counterConfig = site.visitCounter || {};
      const storageKeys = site.storageKeys || {};
      const apiBase = counterConfig.apiBase || "https://api.countapi.xyz";
      const namespace = encodeURIComponent(counterConfig.namespace || "default");
      const key = encodeURIComponent(counterConfig.key || "site-visits");
      const sessionKey = storageKeys.counterSession || "site-visit-counted";
      const cacheKey = storageKeys.counterCache || "site-visit-count-cache";
      let shouldIncrement = true;

      try {
        shouldIncrement = sessionStorage.getItem(sessionKey) !== "true";
      } catch {
        shouldIncrement = true;
      }

      const endpoint = `${apiBase}/${shouldIncrement ? "hit" : "get"}/${namespace}/${key}`;

      visitorCounterPromise = fetch(endpoint)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Counter request failed with ${response.status}`);
          }

          return response.json();
        })
        .then((payload) => {
          const value = Number(payload?.value);
          if (!Number.isFinite(value)) {
            throw new Error("Invalid counter response");
          }

          visitorCounterValue = value;

          try {
            localStorage.setItem(cacheKey, String(value));
            sessionStorage.setItem(sessionKey, "true");
          } catch {
            // Ignore storage write issues; the visible counter is still usable.
          }

          return value;
        })
        .catch((error) => {
          try {
            const rawCachedValue = localStorage.getItem(cacheKey);

            if (rawCachedValue !== null) {
              const cachedValue = Number(rawCachedValue);

              if (Number.isFinite(cachedValue) && cachedValue > 0) {
                visitorCounterValue = cachedValue;
                return cachedValue;
              }
            }
          } catch {
            // Ignore cache access issues and fall through to the caller.
          }

          throw error;
        });
    }

    visitorCounterPromise
      .then((value) => {
        setCounterText(formatVisitorCounter(value, site));
      })
      .catch(() => {
        setCounterText("");
      });
  }

  window.SiteVisitorCounter = {
    init: initVisitorCounter
  };
})();
