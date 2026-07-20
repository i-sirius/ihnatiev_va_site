(function () {
  var TEXTS = {
    uk: {
      refreshPage: "Оновити сторінку",
      checking: "Перевіряємо оновлення...",
      updateAvailable: "Доступне оновлення сайту",
      updateDescription: "Оновіть сторінку, щоб побачити нові публікації та матеріали.",
      update: "Оновити",
      later: "Пізніше",
      upToDate: "Версія актуальна",
      offline: "Немає з'єднання. Відкрито збережену версію.",
      unable: "Не вдалося перевірити оновлення"
    },
    en: {
      refreshPage: "Refresh page",
      checking: "Checking for updates...",
      updateAvailable: "Site update available",
      updateDescription: "Refresh the page to see new publications and materials.",
      update: "Update",
      later: "Later",
      upToDate: "The site is up to date",
      offline: "No connection. The saved version is open.",
      unable: "Unable to check for updates"
    }
  };
  var AUTO_CHECK_INTERVAL = 25 * 60 * 1000;
  var AUTO_CHECK_THROTTLE = 90 * 1000;
  var MANUAL_RESET_DELAY = 2200;
  var WAITING_DISMISS_PREFIX = "site-update-later:";
  var initialized = false;
  var registration = null;
  var registrationListenersBound = false;
  var refreshButton = null;
  var refreshButtonLabel = null;
  var toastBackdrop = null;
  var toast = null;
  var toastTitle = null;
  var toastDescription = null;
  var toastUpdateButton = null;
  var toastLaterButton = null;
  var toastHideTimer = 0;
  var periodicTimer = 0;
  var updateCheckInFlight = false;
  var manualRefreshInProgress = false;
  var updateReloadStarted = false;
  var controllerChangeBound = false;
  var waitingWorker = null;
  var lastAutoCheckAt = 0;

  function getLocale() {
    if (window.SITE && window.SITE.currentLocale === "en") {
      return "en";
    }

    return document.documentElement.lang === "en" ? "en" : "uk";
  }

  function getText(key) {
    var locale = getLocale();
    var texts = TEXTS[locale] || TEXTS.uk;

    return texts[key] || TEXTS.uk[key] || "";
  }

  function isStandaloneMode() {
    var standalone = false;
    var iosStandalone = false;

    if (window.matchMedia) {
      standalone = window.matchMedia("(display-mode: standalone)").matches;
    }

    if (window.navigator) {
      iosStandalone = window.navigator.standalone === true;
    }

    return standalone || iosStandalone;
  }

  function clearTimer(timer) {
    if (timer) {
      window.clearTimeout(timer);
    }
  }

  function setButtonState(stateKey, disabled) {
    var isChecking = stateKey === "checking";

    if (!refreshButton) {
      return;
    }

    refreshButton.disabled = Boolean(disabled);
    refreshButton.classList.toggle("is-checking", isChecking);
    refreshButton.setAttribute("aria-busy", isChecking ? "true" : "false");
    refreshButton.setAttribute("aria-label", getText("refreshPage"));
    refreshButton.title = getText("refreshPage");

    if (refreshButtonLabel) {
      refreshButtonLabel.textContent = getText("refreshPage");
    }
  }

  function resetManualRefreshState() {
    manualRefreshInProgress = false;
    setButtonState("refreshPage", false);
  }

  function getWaitingDismissKey(worker) {
    var scriptUrl = worker && worker.scriptURL ? worker.scriptURL : "current";

    return WAITING_DISMISS_PREFIX + scriptUrl;
  }

  function wasWaitingDismissed(worker) {
    var dismissed = false;

    try {
      dismissed = sessionStorage.getItem(getWaitingDismissKey(worker)) === "1";
    } catch (error) {
      dismissed = false;
    }

    return dismissed;
  }

  function rememberWaitingDismissed(worker) {
    try {
      sessionStorage.setItem(getWaitingDismissKey(worker), "1");
    } catch (error) {
      // Session storage may be unavailable in private or restricted modes.
    }
  }

  function ensureHeaderControls() {
    var header = document.querySelector(".site-header");
    var controls;

    if (!header) {
      return null;
    }

    controls = header.querySelector(".site-header-controls");
    if (!controls) {
      controls = document.createElement("div");
      controls.className = "site-header-controls";
      header.appendChild(controls);
    }

    controls.classList.add("has-app-refresh");
    return controls;
  }

  function ensureRefreshButton() {
    var controls = ensureHeaderControls();
    var icon;
    var svg;
    var path;

    if (!controls) {
      return;
    }

    refreshButton = controls.querySelector("[data-app-refresh]");
    if (!refreshButton) {
      refreshButton = document.createElement("button");
      refreshButton.type = "button";
      refreshButton.className = "app-refresh-button";
      refreshButton.setAttribute("data-app-refresh", "");

      icon = document.createElement("span");
      icon.className = "app-refresh-button-icon";
      icon.setAttribute("aria-hidden", "true");

      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("focusable", "false");
      svg.setAttribute("aria-hidden", "true");

      path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M20 11a8 8 0 0 0-14.3-4.9L4 8m0 0V3m0 5h5m-5 5a8 8 0 0 0 14.3 4.9L20 16m0 0v5m0-5h-5");
      svg.appendChild(path);
      icon.appendChild(svg);

      refreshButtonLabel = document.createElement("span");
      refreshButtonLabel.className = "app-refresh-button-label";

      refreshButton.appendChild(icon);
      refreshButton.appendChild(refreshButtonLabel);
      controls.appendChild(refreshButton);
    } else {
      refreshButtonLabel = refreshButton.querySelector(".app-refresh-button-label");
    }

    setButtonState("refreshPage", false);

    if (refreshButton.dataset.bound === "true") {
      return;
    }

    refreshButton.addEventListener("click", function () {
      refreshApplication();
    });
    refreshButton.dataset.bound = "true";
  }

  function ensureToast() {
    var actions;

    if (toast) {
      return;
    }

    toastBackdrop = document.querySelector("[data-app-update-backdrop]");
    if (!toastBackdrop) {
      toastBackdrop = document.createElement("div");
      toastBackdrop.className = "app-update-backdrop";
      toastBackdrop.setAttribute("data-app-update-backdrop", "");
      toastBackdrop.setAttribute("aria-hidden", "true");
      toastBackdrop.hidden = true;
      document.body.appendChild(toastBackdrop);
    }

    toast = document.querySelector("[data-app-update-toast]");
    if (!toast) {
      toast = document.createElement("section");
      toast.className = "app-update-toast";
      toast.setAttribute("data-app-update-toast", "");
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      toast.hidden = true;

      toastTitle = document.createElement("strong");
      toastTitle.className = "app-update-toast-title";
      toastTitle.setAttribute("data-app-update-title", "");

      toastDescription = document.createElement("p");
      toastDescription.className = "app-update-toast-description";
      toastDescription.setAttribute("data-app-update-description", "");

      actions = document.createElement("div");
      actions.className = "app-update-toast-actions";

      toastUpdateButton = document.createElement("button");
      toastUpdateButton.type = "button";
      toastUpdateButton.className = "app-update-toast-button is-primary";
      toastUpdateButton.setAttribute("data-app-update-activate", "");

      toastLaterButton = document.createElement("button");
      toastLaterButton.type = "button";
      toastLaterButton.className = "app-update-toast-button";
      toastLaterButton.setAttribute("data-app-update-later", "");

      actions.appendChild(toastUpdateButton);
      actions.appendChild(toastLaterButton);
      toast.appendChild(toastTitle);
      toast.appendChild(toastDescription);
      toast.appendChild(actions);
      document.body.appendChild(toast);
    } else {
      toastTitle = toast.querySelector("[data-app-update-title]");
      toastDescription = toast.querySelector("[data-app-update-description]");
      toastUpdateButton = toast.querySelector("[data-app-update-activate]");
      toastLaterButton = toast.querySelector("[data-app-update-later]");
    }

    if (toastUpdateButton && toastUpdateButton.dataset.bound !== "true") {
      toastUpdateButton.addEventListener("click", function () {
        activateWaitingWorker();
      });
      toastUpdateButton.dataset.bound = "true";
    }

    if (toastLaterButton && toastLaterButton.dataset.bound !== "true") {
      toastLaterButton.addEventListener("click", function () {
        if (waitingWorker) {
          rememberWaitingDismissed(waitingWorker);
        }
        hideUpdateAvailable();
      });
      toastLaterButton.dataset.bound = "true";
    }

    updateTexts();
  }

  function updateTexts() {
    if (refreshButton) {
      setButtonState(manualRefreshInProgress ? "checking" : "refreshPage", manualRefreshInProgress);
    }

    if (toastTitle) {
      toastTitle.textContent = getText("updateAvailable");
    }

    if (toastDescription) {
      toastDescription.textContent = getText("updateDescription");
    }

    if (toastUpdateButton) {
      toastUpdateButton.textContent = getText("update");
      toastUpdateButton.setAttribute("aria-label", getText("update"));
      toastUpdateButton.title = getText("update");
    }

    if (toastLaterButton) {
      toastLaterButton.textContent = getText("later");
      toastLaterButton.setAttribute("aria-label", getText("later"));
      toastLaterButton.title = getText("later");
    }
  }

  function showStatusMessage(key) {
    ensureToast();
    clearTimer(toastHideTimer);

    if (!toast || !toastTitle || !toastDescription) {
      return;
    }

    toastTitle.textContent = getText(key);
    toastDescription.textContent = "";
    if (toastUpdateButton) {
      toastUpdateButton.hidden = true;
    }
    if (toastLaterButton) {
      toastLaterButton.hidden = true;
    }
    toast.hidden = false;
    toast.classList.add("is-visible");
    toast.classList.remove("is-update-available");
    toast.classList.add("is-status-only");
    if (toastBackdrop) {
      toastBackdrop.classList.remove("is-visible");
      toastBackdrop.hidden = true;
    }

    toastHideTimer = window.setTimeout(function () {
      if (!waitingWorker) {
        hideUpdateAvailable();
      }
    }, MANUAL_RESET_DELAY);
  }

  function showUpdateAvailable(worker) {
    waitingWorker = worker || waitingWorker;

    if (!waitingWorker || wasWaitingDismissed(waitingWorker)) {
      return;
    }

    ensureToast();
    updateTexts();

    if (toastUpdateButton) {
      toastUpdateButton.hidden = false;
    }
    if (toastLaterButton) {
      toastLaterButton.hidden = false;
    }
    if (toast) {
      clearTimer(toastHideTimer);
      toast.hidden = false;
      toast.classList.add("is-visible");
      toast.classList.add("is-update-available");
      toast.classList.remove("is-status-only");
    }
    if (toastBackdrop) {
      toastBackdrop.hidden = false;
      window.setTimeout(function () {
        if (toastBackdrop && toast && toast.classList.contains("is-update-available")) {
          toastBackdrop.classList.add("is-visible");
        }
      }, 20);
    }
  }

  function hideUpdateAvailable() {
    clearTimer(toastHideTimer);
    toastHideTimer = 0;

    if (!toast) {
      return;
    }

    toast.classList.remove("is-visible", "is-update-available", "is-status-only");
    toast.hidden = true;
    if (toastBackdrop) {
      toastBackdrop.classList.remove("is-visible");
      toastBackdrop.hidden = true;
    }
    if (toastUpdateButton) {
      toastUpdateButton.hidden = false;
    }
    if (toastLaterButton) {
      toastLaterButton.hidden = false;
    }
  }

  function bindControllerChange() {
    if (!navigator.serviceWorker || controllerChangeBound) {
      return;
    }

    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (updateReloadStarted) {
        return;
      }

      updateReloadStarted = true;
      window.location.reload();
    });
    controllerChangeBound = true;
  }

  function handleInstalledWorker(worker, showNotification) {
    if (!worker || worker.state !== "installed") {
      return false;
    }

    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
      return false;
    }

    waitingWorker = worker;
    if (showNotification) {
      showUpdateAvailable(worker);
    }

    return true;
  }

  function watchInstallingWorker(worker, showNotification) {
    if (!worker) {
      return Promise.resolve(false);
    }

    return new Promise(function (resolve) {
      var resolved = false;

      function finish(value) {
        if (resolved) {
          return;
        }

        resolved = true;
        resolve(value);
      }

      function onStateChange() {
        if (worker.state === "installed") {
          finish(handleInstalledWorker(worker, showNotification));
        } else if (worker.state === "redundant") {
          finish(false);
        }
      }

      worker.addEventListener("statechange", onStateChange);
      onStateChange();
      window.setTimeout(function () {
        finish(false);
      }, 4000);
    });
  }

  function bindRegistration(nextRegistration) {
    registration = nextRegistration || registration;

    if (!registration || registrationListenersBound) {
      return;
    }

    registrationListenersBound = true;
    bindControllerChange();

    if (registration.waiting && navigator.serviceWorker && navigator.serviceWorker.controller) {
      showUpdateAvailable(registration.waiting);
    }

    registration.addEventListener("updatefound", function () {
      var installingWorker = registration.installing;

      watchInstallingWorker(installingWorker, true);
    });
  }

  function getRegistration() {
    if (registration) {
      return Promise.resolve(registration);
    }

    if (!navigator.serviceWorker || typeof navigator.serviceWorker.getRegistration !== "function") {
      return Promise.resolve(null);
    }

    return navigator.serviceWorker.getRegistration().then(function (nextRegistration) {
      if (nextRegistration) {
        bindRegistration(nextRegistration);
      }

      return nextRegistration;
    });
  }

  function activateWaitingWorker() {
    var worker = waitingWorker || (registration && registration.waiting);

    if (!worker) {
      window.location.reload();
      return;
    }

    bindControllerChange();
    worker.postMessage({ type: "SKIP_WAITING" });
  }

  function reloadWithoutUpdate() {
    if (updateReloadStarted) {
      return;
    }

    updateReloadStarted = true;
    window.location.reload();
  }

  function checkRegistrationForUpdate(isManual) {
    if (updateCheckInFlight) {
      return Promise.resolve(false);
    }

    updateCheckInFlight = true;

    return getRegistration()
      .then(function (activeRegistration) {
        if (!activeRegistration) {
          return false;
        }

        bindRegistration(activeRegistration);

        if (activeRegistration.waiting) {
          waitingWorker = activeRegistration.waiting;
          if (isManual) {
            activateWaitingWorker();
          } else {
            showUpdateAvailable(activeRegistration.waiting);
          }
          return true;
        }

        return activeRegistration.update().then(function () {
          var worker = activeRegistration.waiting || activeRegistration.installing;

          if (activeRegistration.waiting) {
            waitingWorker = activeRegistration.waiting;
            if (isManual) {
              activateWaitingWorker();
            } else {
              showUpdateAvailable(activeRegistration.waiting);
            }
            return true;
          }

          return watchInstallingWorker(worker, !isManual).then(function (hasUpdate) {
            if (hasUpdate && isManual) {
              activateWaitingWorker();
            }

            return hasUpdate;
          });
        });
      })
      .then(function (hasUpdate) {
        updateCheckInFlight = false;
        return hasUpdate;
      })
      .catch(function () {
        updateCheckInFlight = false;
        if (isManual) {
          throw new Error("update-check-failed");
        }
        return false;
      });
  }

  function refreshApplication() {
    if (manualRefreshInProgress) {
      return;
    }

    manualRefreshInProgress = true;
    setButtonState("checking", true);
    showStatusMessage("checking");

    if (window.navigator && window.navigator.onLine === false) {
      showStatusMessage("offline");
      window.setTimeout(resetManualRefreshState, MANUAL_RESET_DELAY);
      return;
    }

    if (!navigator.serviceWorker) {
      reloadWithoutUpdate();
      return;
    }

    checkRegistrationForUpdate(true).then(function (hasUpdate) {
      if (hasUpdate) {
        return;
      }

      reloadWithoutUpdate();
    }).catch(function () {
      showStatusMessage("unable");
      window.setTimeout(resetManualRefreshState, MANUAL_RESET_DELAY);
    });
  }

  function scheduleAutoCheck(reason) {
    var now = Date.now();

    if (!registration || updateCheckInFlight || document.hidden) {
      return;
    }

    if (reason !== "initial" && now - lastAutoCheckAt < AUTO_CHECK_THROTTLE) {
      return;
    }

    lastAutoCheckAt = now;
    window.setTimeout(function () {
      if (window.navigator && window.navigator.onLine === false) {
        return;
      }

      checkRegistrationForUpdate(false);
    }, 800);
  }

  function bindAutoChecks() {
    document.addEventListener("visibilitychange", function () {
      if (document.hidden === false) {
        scheduleAutoCheck("visibility");
      }
    });

    window.addEventListener("focus", function () {
      scheduleAutoCheck("focus");
    });

    window.addEventListener("online", function () {
      scheduleAutoCheck("online");
    });

    if (!periodicTimer) {
      periodicTimer = window.setInterval(function () {
        scheduleAutoCheck("periodic");
      }, AUTO_CHECK_INTERVAL);
    }
  }

  function bindLocaleRefresh() {
    document.addEventListener("click", function (event) {
      var target = event.target;
      var option = target && target.closest ? target.closest("[data-language-option]") : null;

      if (option) {
        window.setTimeout(updateTexts, 60);
      }
    });

    if (window.MutationObserver) {
      new MutationObserver(function () {
        updateTexts();
      }).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["lang"]
      });
    }
  }

  function init(options) {
    if (!initialized) {
      initialized = true;
      ensureRefreshButton();
      ensureToast();
      bindLocaleRefresh();
      bindAutoChecks();
      document.documentElement.classList.toggle("is-standalone-app", isStandaloneMode());
    } else {
      ensureRefreshButton();
      updateTexts();
    }

    if (options && options.registration) {
      bindRegistration(options.registration);
      scheduleAutoCheck("initial");
    }
  }

  function handleRegistration(nextRegistration) {
    bindRegistration(nextRegistration);
    scheduleAutoCheck("initial");
  }

  function handleUnsupported() {
    ensureRefreshButton();
    updateTexts();
  }

  window.SiteAppUpdate = {
    init: init,
    handleRegistration: handleRegistration,
    handleUnsupported: handleUnsupported,
    refreshApplication: refreshApplication,
    checkForAppUpdate: function () {
      return checkRegistrationForUpdate(false);
    },
    showUpdateAvailable: showUpdateAvailable,
    hideUpdateAvailable: hideUpdateAvailable,
    activateWaitingWorker: activateWaitingWorker
  };
}());
