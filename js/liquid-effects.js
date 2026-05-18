(() => {
  function initLiquidDroplets() {
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
        hoverDelay: 95
      })),
      ...Array.from(document.querySelectorAll(".site-header-controls")).map((list) => ({
        list,
        itemSelector: ".language-toggle-options, .theme-toggle-track",
        defaultToFirst: false
      }))
    ].filter(({ list }) => list);

    dropletGroups.forEach(({ list, itemSelector, defaultToFirst, hoverDelay = 0 }) => {
      let dropletFrame = 0;
      let pendingTarget = null;
      let dropletMotionTimer = 0;
      let dropletHoverTimer = 0;

      const clearDroplet = () => {
        list.classList.remove(
          "is-droplet-ready",
          "is-droplet-in-motion",
          "is-droplet-moving-right",
          "is-droplet-moving-left"
        );
      };

      const syncDroplet = (target = null) => {
        dropletFrame = 0;

        const matchedTarget = target?.closest?.(itemSelector);
        const dropletTarget =
          matchedTarget && list.contains(matchedTarget)
            ? matchedTarget
            : defaultToFirst
              ? list.querySelector(itemSelector)
              : null;

        if (!dropletTarget || !list.contains(dropletTarget)) {
          clearDroplet();
          return;
        }

        const listRect = list.getBoundingClientRect();
        const targetRect = dropletTarget.getBoundingClientRect();
        const bleed = 5;
        const targetStyle = window.getComputedStyle(dropletTarget);
        const accent = targetStyle.getPropertyValue("--social-accent").trim() || targetStyle.color;
        const wasReady = list.classList.contains("is-droplet-ready");
        const previousX = Number.parseFloat(list.style.getPropertyValue("--contact-droplet-x")) || 0;
        const nextX = targetRect.left - listRect.left - bleed;
        const isMoving = wasReady && Math.abs(nextX - previousX) > 2;

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
      };

      const requestDroplet = (target = null) => {
        pendingTarget = target || pendingTarget;

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
          if (button) {
            requestStickyDroplet(button);
          }
        });
        list.addEventListener("pointerleave", () => {
          if (dropletHoverTimer) {
            window.clearTimeout(dropletHoverTimer);
            dropletHoverTimer = 0;
          }

          if (defaultToFirst) {
            requestDroplet();
          } else {
            clearDroplet();
          }
        });
        list.addEventListener("focusin", (event) => {
          const button = event.target.closest(itemSelector);
          if (button) {
            requestDroplet(button);
          }
        });
        list.addEventListener("focusout", () => {
          if (defaultToFirst) {
            requestDroplet();
          } else {
            clearDroplet();
          }
        });
        window.addEventListener("resize", () => requestDroplet(), { passive: true });
        list.dataset.dropletBound = "true";
      }

      if (defaultToFirst) {
        requestDroplet();
      } else {
        clearDroplet();
      }
    });
  }

  function initVideoLiquidLens() {
    document.querySelectorAll(".video-gallery").forEach((gallery) => {
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

      const getLensTarget = (target) => {
        const card = target?.closest?.(".video-card");
        if (card && gallery.contains(card)) {
          return card.querySelector(".video-card-link");
        }

        const fallback = target?.closest?.(".video-fallback-link");
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
          const target = getLensTarget(event.target);
          if (target) {
            requestLens(target);
          }
        });
        gallery.addEventListener("pointerleave", clearLens);
        gallery.addEventListener("focusin", (event) => {
          const target = getLensTarget(event.target);
          if (target) {
            requestLens(target);
          }
        });
        gallery.addEventListener("focusout", clearLens);
        window.addEventListener("resize", () => requestLens(), { passive: true });
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
