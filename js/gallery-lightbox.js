(() => {
  function ensureGalleryLightbox({ site = window.SITE || {} } = {}) {
    let lightbox = document.querySelector("[data-gallery-lightbox]");

    if (!lightbox) {
      lightbox = document.createElement("div");
      lightbox.className = "gallery-lightbox";
      lightbox.hidden = true;
      lightbox.setAttribute("data-gallery-lightbox", "");
      lightbox.innerHTML = `
        <div class="lightbox-stage">
          <div class="lightbox-toolbar">
            <button class="lightbox-close" type="button" data-lightbox-close>×</button>
          </div>
          <div class="lightbox-content">
            <button class="lightbox-nav prev" type="button" data-lightbox-prev>‹</button>
            <figure class="lightbox-figure">
              <img src="" alt="" data-lightbox-image>
              <figcaption class="lightbox-caption" data-lightbox-caption hidden></figcaption>
            </figure>
            <button class="lightbox-nav next" type="button" data-lightbox-next>›</button>
          </div>
        </div>
      `;
      document.body.appendChild(lightbox);
    }

    const galleryUi = site.ui?.gallery || {};
    lightbox.querySelector("[data-lightbox-close]")?.setAttribute(
      "aria-label",
      galleryUi.close || "Закрити"
    );
    lightbox.querySelector("[data-lightbox-prev]")?.setAttribute(
      "aria-label",
      galleryUi.previous || "Попереднє фото"
    );
    lightbox.querySelector("[data-lightbox-next]")?.setAttribute(
      "aria-label",
      galleryUi.next || "Наступне фото"
    );

    const image = lightbox.querySelector("[data-lightbox-image]");
    const caption = lightbox.querySelector("[data-lightbox-caption]");
    const prevButton = lightbox.querySelector("[data-lightbox-prev]");
    const nextButton = lightbox.querySelector("[data-lightbox-next]");
    const state = lightbox.galleryLightboxState || {
      items: [],
      index: 0
    };
    lightbox.galleryLightboxState = state;

    function updateLightboxImage() {
      const item = state.items[state.index];
      if (!item || !image) {
        return;
      }

      image.src = item.src;
      image.alt = item.alt || "";

      const hasNeighbors = state.items.length > 1;
      if (prevButton) {
        prevButton.hidden = !hasNeighbors;
        prevButton.disabled = !hasNeighbors;
      }
      if (nextButton) {
        nextButton.hidden = !hasNeighbors;
        nextButton.disabled = !hasNeighbors;
      }

      if (caption) {
        caption.textContent = item.alt || "";
        caption.hidden = !item.alt;
      }
    }

    function closeLightbox() {
      lightbox.hidden = true;
      document.body.classList.remove("lightbox-open");
    }

    function showByIndex(index) {
      if (!state.items.length) {
        return;
      }

      state.index = (index + state.items.length) % state.items.length;
      updateLightboxImage();
      lightbox.hidden = false;
      document.body.classList.add("lightbox-open");
    }

    function showItems(items = [], index = 0) {
      state.items = Array.isArray(items) ? items.filter((item) => item?.src) : [];
      showByIndex(index);
    }

    function refreshLightboxLayout() {
      if (lightbox.hidden) {
        return;
      }

      window.requestAnimationFrame(() => {
        updateLightboxImage();
        lightbox.scrollTo({ top: 0, left: 0, behavior: "auto" });
      });
    }

    if (lightbox.dataset.bound !== "true") {
      lightbox.querySelector("[data-lightbox-close]")?.addEventListener("click", closeLightbox);
      lightbox.querySelector("[data-lightbox-prev]")?.addEventListener("click", () => {
        if (state.items.length <= 1) {
          return;
        }

        showByIndex(state.index - 1);
      });
      lightbox.querySelector("[data-lightbox-next]")?.addEventListener("click", () => {
        if (state.items.length <= 1) {
          return;
        }

        showByIndex(state.index + 1);
      });

      lightbox.addEventListener("click", (event) => {
        if (event.target === lightbox) {
          closeLightbox();
        }
      });

      document.addEventListener("keydown", (event) => {
        if (lightbox.hidden) {
          return;
        }

        if (event.key === "Escape") {
          closeLightbox();
        }

        if (event.key === "ArrowLeft" && state.items.length > 1) {
          showByIndex(state.index - 1);
        }

        if (event.key === "ArrowRight" && state.items.length > 1) {
          showByIndex(state.index + 1);
        }
      });

      window.addEventListener("resize", refreshLightboxLayout, { passive: true });
      window.addEventListener("orientationchange", refreshLightboxLayout, { passive: true });

      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", refreshLightboxLayout, { passive: true });
      }

      lightbox.dataset.bound = "true";
    }

    lightbox.showByIndex = showByIndex;
    lightbox.showItems = showItems;
    lightbox.refreshLayout = refreshLightboxLayout;
    return lightbox;
  }

  window.SiteGalleryLightbox = {
    ensure: ensureGalleryLightbox
  };
})();
