(() => {
  function initLiquidDroplets() {
    if (document.documentElement.classList.contains("no-modern-effects") ||
        (window.matchMedia && window.matchMedia("(hover: none), (pointer: coarse)").matches)) {
      return;
    }

    const dropletGroups = [
      {
        list: document.querySelector("[data-contact-socials-list]"),
        itemSelector: ".contact-social-button:not(.is-disabled)",
        defaultToFirst: false
      },
      ...Array.from(document.querySelectorAll(".about-photo-links")).map((list) => ({
        list,
        itemSelector: ".about-photo-link",
        defaultToFirst: false
      })),
      ...Array.from(document.querySelectorAll(".site-header-socials")).map((list) => ({
        list,
        itemSelector: ".site-header-social-link",
        defaultToFirst: false
      })),
      ...Array.from(document.querySelectorAll(".site-header nav")).map((list) => ({
        list,
        itemSelector: "a",
        defaultToFirst: false,
        hoverDelay: 25
      })),
      ...Array.from(document.querySelectorAll(".site-header-controls")).map((list) => ({
        list,
        itemSelector: ".language-toggle-options, .theme-toggle-track",
        defaultToFirst: false
      }))
    ].filter(({ list }) => list);

    dropletGroups.forEach(({ list, itemSelector, defaultToFirst, hoverDelay = 0 }) => {
      if (list.refreshDroplet) {
        list.refreshDroplet();
        return;
      }
      let currentTarget = null;
      let dropletInstantTimer = 0;
      const activeTarget = () => list.matches(".site-header nav")
        ? list.querySelector("a[aria-current='page']") : null;
      let dropletFrame = 0;
      let pendingTarget = null;
      let dropletMotionTimer = 0;
      let dropletHoverTimer = 0;

      const cancelPending = () => {
        window.cancelAnimationFrame(dropletFrame);
        window.clearTimeout(dropletHoverTimer);
        window.clearTimeout(dropletMotionTimer);
        window.clearTimeout(dropletInstantTimer);
        dropletFrame = dropletHoverTimer = dropletMotionTimer = dropletInstantTimer = 0;
        pendingTarget = null;
      };
      const clearDroplet = () => {
        cancelPending();
        currentTarget = null;
        list.classList.remove(
          "is-droplet-ready",
          "is-droplet-instant",
          "is-droplet-in-motion",
          "is-droplet-moving-right",
          "is-droplet-moving-left"
        );
      };

      const syncDroplet = (target = null) => {
        dropletFrame = 0;

        const matchedTarget = target && typeof target.closest === "function"
          ? target.closest(itemSelector)
          : null;
        const dropletTarget =
          matchedTarget && list.contains(matchedTarget)
            ? matchedTarget
            : defaultToFirst
              ? list.querySelector(itemSelector)
              : activeTarget();

        if (!dropletTarget || !list.contains(dropletTarget)) {
          clearDroplet();
          return;
        }

        const listRect = list.getBoundingClientRect();
        const targetRect = dropletTarget.getBoundingClientRect();
        if (!targetRect.width || !targetRect.height) {
          clearDroplet();
          return;
        }
        currentTarget = dropletTarget;
        const bleed = list.matches(".site-header nav") ? 2 : 4;
        const targetStyle = window.getComputedStyle(dropletTarget);
        const accent = targetStyle.getPropertyValue("--social-accent").trim() || targetStyle.color;
        const wasReady = list.classList.contains("is-droplet-ready");
        const previousX = Number.parseFloat(list.style.getPropertyValue("--contact-droplet-x")) || 0;
        const nextX = targetRect.left - listRect.left - bleed;
        const previousY = Number.parseFloat(list.style.getPropertyValue("--contact-droplet-y")) || 0;
        const nextY = targetRect.top - listRect.top - bleed;
        const isMoving = wasReady && (Math.abs(nextX - previousX) > 2 || Math.abs(nextY - previousY) > 2);

        list.classList.toggle("is-droplet-instant", !wasReady);
        list.classList.toggle("is-droplet-moving-right", isMoving && nextX > previousX + 2);
        list.classList.toggle("is-droplet-moving-left", isMoving && nextX < previousX - 2);
        list.classList.toggle("is-droplet-in-motion", isMoving);

        if (dropletMotionTimer) {
          window.clearTimeout(dropletMotionTimer);
        }

        if (isMoving) {
          dropletMotionTimer = window.setTimeout(() => {
            list.classList.remove(
              "is-droplet-in-motion",
              "is-droplet-moving-right",
              "is-droplet-moving-left"
            );
            dropletMotionTimer = 0;
          }, 420);
        }

        list.style.setProperty("--contact-droplet-x", `${Math.round(nextX)}px`);
        list.style.setProperty("--contact-droplet-y", `${Math.round(targetRect.top - listRect.top - bleed)}px`);
        list.style.setProperty("--contact-droplet-width", `${Math.round(targetRect.width + bleed * 2)}px`);
        list.style.setProperty("--contact-droplet-height", `${Math.round(targetRect.height + bleed * 2)}px`);

        if (accent) {
          list.style.setProperty("--contact-droplet-accent", accent);
        }

        list.classList.add("is-droplet-ready");

        if (!wasReady) {
          dropletInstantTimer = window.setTimeout(() => {
            list.classList.remove("is-droplet-instant");
            dropletInstantTimer = 0;
          }, 32);
        }
      };

      const requestDroplet = (target = null) => {
        pendingTarget = target;

        if (dropletFrame) {
          return;
        }

        dropletFrame = window.requestAnimationFrame(() => {
          const targetElement = pendingTarget;
          pendingTarget = null;
          syncDroplet(targetElement);
        });
      };

      const requestStickyDroplet = (target = null, delay = hoverDelay) => {
        if (!delay) {
          requestDroplet(target);
          return;
        }

        if (dropletHoverTimer) {
          window.clearTimeout(dropletHoverTimer);
        }

        dropletHoverTimer = window.setTimeout(() => {
          dropletHoverTimer = 0;
          requestDroplet(target);
        }, delay);
      };

      if (list.dataset.dropletBound !== "true") {
        list.addEventListener("pointerover", (event) => {
          const button = event.target.closest(itemSelector);
          if (event.pointerType === "touch") return;
          if (button && button !== (event.relatedTarget && event.relatedTarget.closest
              ? event.relatedTarget.closest(itemSelector) : null)) {
            requestStickyDroplet(button);
          }
        });
        list.addEventListener("pointerleave", () => {
          cancelPending();
          const focused = list.contains(document.activeElement) ? document.activeElement : null;
          if (focused || activeTarget()) requestDroplet(focused || activeTarget());
          else clearDroplet();
        });
        list.addEventListener("focusin", (event) => {
          const button = event.target.closest(itemSelector);
          if (button) {
            window.clearTimeout(dropletHoverTimer);
            requestDroplet(button);
          }
        });
        list.addEventListener("focusout", (event) => {
          const next = event.relatedTarget;
          if (next && list.contains(next)) requestDroplet(next);
          else if (activeTarget()) requestDroplet(activeTarget());
          else clearDroplet();
        });
        list.refreshDroplet = () => requestDroplet(
          currentTarget && list.contains(currentTarget) ? currentTarget : activeTarget());
        window.addEventListener("resize", list.refreshDroplet, { passive: true });
        if (window.ResizeObserver) {
          const observer = new ResizeObserver(list.refreshDroplet);
          observer.observe(list);
        }
        list.dataset.dropletBound = "true";
      }

      if (defaultToFirst || activeTarget()) {
        requestDroplet();
      } else {
        clearDroplet();
      }
    });
  }

  function initVideoLiquidLens() {
    if (document.documentElement.classList.contains("no-modern-effects") ||
        (window.matchMedia && window.matchMedia("(hover: none), (pointer: coarse)").matches)) {
      return;
    }

    document.querySelectorAll(".video-gallery").forEach((gallery) => {
      if (gallery.dataset.videoLensBound === "true") return;
      let lensFrame = 0;
      let pendingTarget = null;
      let lensMotionTimer = 0;

      const clearLens = () => {
        gallery.classList.remove(
          "is-video-lens-ready",
          "is-video-lens-in-motion",
          "is-video-lens-moving-right",
          "is-video-lens-moving-left"
        );
      };

      const resetLens = () => {
        pendingTarget = null;

        if (lensFrame) {
          window.cancelAnimationFrame(lensFrame);
          lensFrame = 0;
        }

        if (lensMotionTimer) {
          window.clearTimeout(lensMotionTimer);
          lensMotionTimer = 0;
        }

        clearLens();
      };

      const getLensTarget = (target) => {
        const card = target && typeof target.closest === "function"
          ? target.closest(".video-card")
          : null;
        if (card && gallery.contains(card)) {
          return card.querySelector(".video-card-link");
        }

        const fallback = target && typeof target.closest === "function"
          ? target.closest(".video-fallback-link")
          : null;
        return fallback && gallery.contains(fallback) ? fallback : null;
      };

      const syncLens = (target = null) => {
        lensFrame = 0;

        const lensTarget = getLensTarget(target);

        if (!lensTarget) {
          clearLens();
          return;
        }

        const galleryRect = gallery.getBoundingClientRect();
        const targetRect = lensTarget.getBoundingClientRect();
        const bleedX = 10;
        const bleedY = 7;
        const previousX = Number.parseFloat(gallery.style.getPropertyValue("--video-lens-x")) || 0;
        const nextX = targetRect.left - galleryRect.left - bleedX;
        const isMoving = Math.abs(nextX - previousX) > 2;

        gallery.classList.toggle("is-video-lens-moving-right", nextX > previousX + 2);
        gallery.classList.toggle("is-video-lens-moving-left", nextX < previousX - 2);
        gallery.classList.toggle("is-video-lens-in-motion", isMoving);

        if (lensMotionTimer) {
          window.clearTimeout(lensMotionTimer);
        }

        if (isMoving) {
          lensMotionTimer = window.setTimeout(() => {
            gallery.classList.remove(
              "is-video-lens-in-motion",
              "is-video-lens-moving-right",
              "is-video-lens-moving-left"
            );
            lensMotionTimer = 0;
          }, 420);
        }

        gallery.style.setProperty("--video-lens-x", `${Math.round(nextX)}px`);
        gallery.style.setProperty("--video-lens-y", `${Math.round(targetRect.top - galleryRect.top - bleedY)}px`);
        gallery.style.setProperty("--video-lens-width", `${Math.round(targetRect.width + bleedX * 2)}px`);
        gallery.style.setProperty("--video-lens-height", `${Math.round(targetRect.height + bleedY * 2)}px`);
        gallery.classList.add("is-video-lens-ready");
      };

      const requestLens = (target = null) => {
        pendingTarget = target || pendingTarget;

        if (lensFrame) {
          return;
        }

        lensFrame = window.requestAnimationFrame(() => {
          const targetElement = pendingTarget;
          pendingTarget = null;
          syncLens(targetElement);
        });
      };

      if (gallery.dataset.videoLensBound !== "true") {
        gallery.addEventListener("pointerover", (event) => {
          if (event.pointerType === "touch") return;
          const target = getLensTarget(event.target);
          if (target && target !== getLensTarget(event.relatedTarget)) {
            requestLens(target);
          }
        });
        gallery.addEventListener("pointerleave", resetLens);
        gallery.addEventListener("focusin", (event) => {
          const target = getLensTarget(event.target);
          if (target) {
            requestLens(target);
          }
        });
        gallery.addEventListener("focusout", (event) => {
          const next = getLensTarget(event.relatedTarget);
          if (next) requestLens(next);
          else resetLens();
        });
        window.addEventListener("resize", () => requestLens(), { passive: true });
        window.addEventListener("scroll", resetLens, { passive: true });
        window.addEventListener("site:layout-shift", resetLens);
        gallery.dataset.videoLensBound = "true";
      }

      clearLens();
    });
  }

  window.SiteLiquidEffects = {
    initDroplets: initLiquidDroplets,
    initVideoLens: initVideoLiquidLens
  };
})();
