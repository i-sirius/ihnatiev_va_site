(() => {
  const fallbackMenuHtml = `
<nav>
  <a href="index.html" data-menu-home>Головна</a>
  <a href="activity1.html" data-menu-activity="1">Наука</a>
  <a href="activity2.html" data-menu-activity="2">Освіта</a>
  <a href="activity3.html" data-menu-activity="3">Церква</a>
  <a href="downloads.html" data-menu-downloads>Завантаження</a>
  <a href="contact.html" data-menu-contact>Контакти</a>
</nav>`;

  function ensureFallbackMenu(targetId) {
    const menu = document.getElementById(targetId);
    if (menu && !menu.querySelector("nav")) {
      menu.innerHTML = fallbackMenuHtml;
    }
  }

  function load({
    path = "menu.html",
    targetId = "menu",
    onComplete = () => {},
    timeoutMs = 2500
  } = {}) {
    let completed = false;
    let timeoutId = 0;

    function finish(useFallback) {
      if (completed) {
        return;
      }

      completed = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      if (useFallback) {
        ensureFallbackMenu(targetId);
      }

      onComplete();
    }

    timeoutId = window.setTimeout(() => {
      finish(true);
    }, timeoutMs);

    if (typeof fetch !== "function") {
      finish(true);
      return;
    }

    fetch(path)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${path}`);
        }

        return response.text();
      })
      .then((html) => {
        if (completed) {
          return;
        }

        const menu = document.getElementById(targetId);
        if (menu) {
          menu.innerHTML = html;
        }

        finish(false);
      })
      .catch(() => {
        finish(true);
      });
  }

  window.SiteMenuLoader = {
    load
  };
})();
