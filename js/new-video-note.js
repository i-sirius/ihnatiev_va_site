(() => {
  const note = document.querySelector("[data-new-video-note]");
  if (!note) return;
  const lifetime = 3 * 24 * 60 * 60 * 1000;
  const storageKey = "site:new-video-dismissed";
  const link = note.querySelector("[data-new-video-link]");
  const close = note.querySelector("[data-new-video-close]");
  let video = null;
  let dismissed = false;
  let timer;

  function hide() {
    note.hidden = true;
    clearTimeout(timer);
  }

  function dismiss() {
    dismissed = true;
    try { localStorage.setItem(storageKey, video.id); } catch { /* Storage may be disabled. */ }
    hide();
  }

  function render() {
    if (!video || dismissed) return;
    const remaining = Date.parse(video.publishedAt) + lifetime - Date.now();
    if (remaining <= 0) { hide(); return; }
    const english = document.documentElement.lang === "en";
    note.querySelector("[data-new-video-label]").textContent = english ? "New video aboard!" : "Новий відос на борту!";
    note.querySelector("[data-new-video-title]").textContent = english
      ? video.titleEn || video.title
      : video.title || video.titleEn;
    close.setAttribute("aria-label", english ? "Dismiss new video notice" : "Приховати повідомлення про нове відео");
    link.href = `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`;
    link.title = note.querySelector("[data-new-video-title]").textContent;
    note.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(hide, remaining);
  }

  link.addEventListener("click", dismiss);
  link.addEventListener("auxclick", (event) => { if (event.button === 1) dismiss(); });
  close.addEventListener("click", dismiss);
  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  window.addEventListener("pageshow", render);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
  window.addEventListener("storage", (event) => {
    if (video && event.key === storageKey && event.newValue === video.id) { dismissed = true; hide(); }
  });

  fetch("files/content/video-index.json")
    .then((response) => { if (!response.ok) throw new Error("Unavailable"); return response.json(); })
    .then((payload) => {
      const now = Date.now();
      video = (Array.isArray(payload.items) ? payload.items : [])
        .filter((item) => item && item.enabled !== false && /^[A-Za-z0-9_-]{11}$/.test(item.id || "")
          && now >= Date.parse(item.publishedAt) && now - Date.parse(item.publishedAt) < lifetime)
        .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))[0];
      if (!video) return;
      try { dismissed = localStorage.getItem(storageKey) === video.id; } catch { /* Use this page's state. */ }
      render();
    })
    .catch(() => { /* The optional notice stays hidden when content is unavailable. */ });
})();
