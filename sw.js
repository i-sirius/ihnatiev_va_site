const CACHE_NAME = "ihnatiev-site-v0.6.20c-r1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./activity1.html",
  "./activity2.html",
  "./activity3.html",
  "./downloads.html",
  "./contact.html",
  "./menu.html",
  "./css/theme.css",
  "./css/base.css",
  "./css/layout.css",
  "./css/components.css",
  "./css/content.css",
  "./css/styles.css",
  "./config.js",
  "./js/site-utils.js",
  "./js/gallery-lightbox.js",
  "./js/gallery-renderer.js",
  "./js/document-lightbox.js",
  "./js/downloads-renderer.js",
  "./js/content-loader.js",
  "./js/youtube-feed.js",
  "./js/mobile-navigation.js",
  "./js/contact-page.js",
  "./js/visitor-counter.js",
  "./js/liquid-effects.js",
  "./js/social-icons.js",
  "./js/header-ui.js",
  "./js/page-content.js",
  "./js/menu-loader.js",
  "./app.js",
  "./manifest.webmanifest",
  "./files/media/icon-192.png",
  "./files/media/icon-512.png",
  "./files/media/logo-light.png",
  "./files/media/logo-dark.png",
  "./files/media/about-me-photo.jpg"
];

function isCacheableAsset(requestUrl) {
  return /\.(?:css|js|json|png|jpg|jpeg|webp|gif|svg|ico)$/i.test(requestUrl.pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          return cachedResponse || caches.match("./index.html");
        })
    );
    return;
  }

  if (!isCacheableAsset(requestUrl)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkFetch;
    })
  );
});
