(() => {
  function initMobileNavigation() {
    const menu = document.getElementById("menu");
    const nav = document.querySelector("#menu nav, .mobile-nav-host nav");

    if (!menu || !nav) {
      return;
    }

    let host = document.querySelector(".mobile-nav-host");
    if (!host) {
      host = document.createElement("div");
      host.className = "mobile-nav-host";
      document.body.appendChild(host);
    }

    const mobileQuery = window.matchMedia("(max-width: 900px)");
    let fitFrame = 0;

    const measureNavLabel = (() => {
      let measurer = null;

      return (link, label) => {
        if (!measurer) {
          measurer = document.createElement("span");
          measurer.style.position = "fixed";
          measurer.style.left = "-9999px";
          measurer.style.top = "-9999px";
          measurer.style.visibility = "hidden";
          measurer.style.whiteSpace = "nowrap";
          measurer.style.pointerEvents = "none";
          document.body.appendChild(measurer);
        }

        const textStyle = window.getComputedStyle(link, "::after");
        const textTransform = textStyle.textTransform;
        const renderedLabel = textTransform === "uppercase" ? label.toUpperCase() : label;

        measurer.style.fontFamily = textStyle.fontFamily;
        measurer.style.fontSize = textStyle.fontSize;
        measurer.style.fontWeight = textStyle.fontWeight;
        measurer.style.letterSpacing = textStyle.letterSpacing;
        measurer.textContent = renderedLabel;

        return Math.ceil(measurer.getBoundingClientRect().width);
      };
    })();

    let lensFrame = 0;
    let pendingLensTarget = null;
    let lensHoverTimer = 0;

    const syncNavigationLens = (target = null) => {
      lensFrame = 0;
      const currentNav = document.querySelector(".mobile-nav-host nav");

      if (!currentNav || !mobileQuery.matches) {
        document
          .querySelectorAll("nav.is-lens-ready")
          .forEach((navElement) =>
            navElement.classList.remove("is-lens-ready", "is-lens-settling", "is-lens-instant")
          );
        return;
      }

      const hoveredTarget = target?.closest?.("a");
      const lensTarget =
        hoveredTarget && currentNav.contains(hoveredTarget) && hoveredTarget.offsetParent !== null
          ? hoveredTarget
          : currentNav.querySelector("a[aria-current='page']");

      if (!lensTarget) {
        currentNav.classList.remove("is-lens-ready", "is-lens-settling", "is-lens-instant");
        return;
      }

      const navRect = currentNav.getBoundingClientRect();
      const targetRect = lensTarget.getBoundingClientRect();
      const wasReady = currentNav.classList.contains("is-lens-ready");

      if (!wasReady) {
        currentNav.classList.add("is-lens-settling", "is-lens-instant");
      }

      currentNav.style.setProperty("--nav-lens-x", `${Math.round(targetRect.left - navRect.left)}px`);
      currentNav.style.setProperty("--nav-lens-y", `${Math.round(targetRect.top - navRect.top)}px`);
      currentNav.style.setProperty("--nav-lens-width", `${Math.round(targetRect.width)}px`);
      currentNav.style.setProperty("--nav-lens-height", `${Math.round(targetRect.height)}px`);
      currentNav.classList.toggle("is-lens-current", lensTarget.matches("[aria-current='page']"));
      currentNav.classList.add("is-lens-ready");

      if (!wasReady) {
        window.setTimeout(() => {
          currentNav.classList.remove("is-lens-settling", "is-lens-instant");
        }, 90);
      }
    };

    const requestNavigationLens = (target = null) => {
      pendingLensTarget = target || pendingLensTarget;

      if (lensFrame) {
        return;
      }

      lensFrame = window.requestAnimationFrame(() => {
        const targetElement = pendingLensTarget;
        pendingLensTarget = null;
        syncNavigationLens(targetElement);
      });
    };

    const requestStickyNavigationLens = (target = null, delay = 95) => {
      if (lensHoverTimer) {
        window.clearTimeout(lensHoverTimer);
      }

      lensHoverTimer = window.setTimeout(() => {
        lensHoverTimer = 0;
        requestNavigationLens(target);
      }, delay);
    };

    const fitNavigationLabels = () => {
      fitFrame = 0;
      const currentNav = document.querySelector(".mobile-nav-host nav");
      const modeClasses = ["is-labels-only", "is-condensed-labels", "is-icons-only"];
      const currentMode = currentNav?.classList.contains("is-icons-only")
        ? "icons"
        : currentNav?.classList.contains("is-labels-only")
          ? "labels"
          : "mixed";
      const expandSpace = 14;

      if (!currentNav || !mobileQuery.matches) {
        document
          .querySelectorAll("nav.is-labels-only, nav.is-condensed-labels, nav.is-icons-only")
          .forEach((navElement) => navElement.classList.remove(...modeClasses));
        return;
      }

      currentNav.classList.remove(...modeClasses);

      const links = Array.from(currentNav.querySelectorAll("a")).filter(
        (link) => link.offsetParent !== null
      );

      const getFitData = (link) => {
        const label = link.getAttribute("data-mobile-label") || link.textContent.trim();
        if (!label) {
          return null;
        }

        const linkStyle = window.getComputedStyle(link);
        const iconStyle = window.getComputedStyle(link, "::before");
        const paddingX = parseFloat(linkStyle.paddingLeft) + parseFloat(linkStyle.paddingRight);
        const gap = parseFloat(linkStyle.gap) || 0;
        const iconWidth = parseFloat(iconStyle.width) || 0;
        const safetySpace = 7;

        return {
          label,
          labelWidth: measureNavLabel(link, label),
          availableWithIcon: link.clientWidth - paddingX - iconWidth - gap - safetySpace,
          availableWithoutIcon: link.clientWidth - paddingX - safetySpace,
        };
      };

      const allLabelsFit = (availableKey, extraSpace = 0) =>
        links.every((link) => {
          const fitData = getFitData(link);
          return !fitData || fitData.labelWidth <= fitData[availableKey] - extraSpace;
        });

      const mixedExtraSpace = currentMode === "mixed" ? 0 : expandSpace;
      if (allLabelsFit("availableWithIcon", mixedExtraSpace)) {
        requestNavigationLens();
        return;
      }

      currentNav.classList.add("is-labels-only");

      const labelsExtraSpace = currentMode === "icons" ? expandSpace : 0;
      if (allLabelsFit("availableWithoutIcon", labelsExtraSpace)) {
        requestNavigationLens();
        return;
      }

      currentNav.classList.add("is-condensed-labels");

      if (allLabelsFit("availableWithoutIcon", labelsExtraSpace)) {
        requestNavigationLens();
        return;
      }

      currentNav.classList.remove("is-labels-only", "is-condensed-labels");
      currentNav.classList.add("is-icons-only");
      requestNavigationLens();
    };

    const requestNavigationFit = () => {
      if (fitFrame) {
        return;
      }

      fitFrame = window.requestAnimationFrame(fitNavigationLabels);
    };

    const syncNavigationPlacement = () => {
      const currentNav = document.querySelector("#menu nav, .mobile-nav-host nav");

      if (!currentNav) {
        return;
      }

      if (mobileQuery.matches) {
        if (currentNav.parentElement !== host) {
          host.appendChild(currentNav);
        }
      } else if (currentNav.parentElement !== menu) {
        menu.appendChild(currentNav);
      }

      requestNavigationFit();
      requestNavigationLens();
    };

    syncNavigationPlacement();

    if (document.body.dataset.mobileNavReady === "true") {
      return;
    }

    if (typeof mobileQuery.addEventListener === "function") {
      mobileQuery.addEventListener("change", syncNavigationPlacement);
    } else {
      mobileQuery.addListener(syncNavigationPlacement);
    }

    nav.addEventListener("pointerover", (event) => {
      const link = event.target.closest("a");
      if (link) {
        requestStickyNavigationLens(link);
      }
    });
    nav.addEventListener("pointerleave", () => requestStickyNavigationLens(null, 90));
    nav.addEventListener("focusin", (event) => {
      const link = event.target.closest("a");
      if (link) {
        requestNavigationLens(link);
      }
    });
    nav.addEventListener("focusout", () => requestNavigationLens());

    window.addEventListener(
      "resize",
      () => {
        requestNavigationFit();
        requestNavigationLens();
      },
      { passive: true }
    );
    window.addEventListener(
      "orientationchange",
      () => {
        requestNavigationFit();
        requestNavigationLens();
      },
      { passive: true }
    );
    if (document.fonts?.ready) {
      document.fonts.ready
        .then(() => {
          requestNavigationFit();
          requestNavigationLens();
        })
        .catch(() => {});
    }

    document.body.dataset.mobileNavReady = "true";
  }

  window.SiteMobileNavigation = {
    init: initMobileNavigation
  };
})();
