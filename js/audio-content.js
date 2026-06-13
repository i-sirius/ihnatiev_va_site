(() => {
  const AUDIO_DATA_PATH = "files/content/audio.json";
  const AUDIO_SECTION = "church";
  const AUDIO_CATEGORY = "sermons";
  const UI_TEXT = {
    uk: {
      empty: "Аудіозаписи проповідей буде додано після перевірки формату.",
      audioLabelPrefix: "Аудіозапис",
      fallbackTitle: "Аудіозапис проповіді",
      text: "Текст",
      transcript: "Конспект",
      unsupported: "Ваш браузер не підтримує аудіопрогравач."
    },
    en: {
      empty: "Sermon audio recordings. Materials will be added gradually.",
      audioLabelPrefix: "Audio recording",
      fallbackTitle: "Sermon audio recording",
      text: "Text",
      transcript: "Transcript",
      unsupported: "Your browser does not support the audio player."
    }
  };
  var audioHashScrollTimers = [];
  var audioHashLoadHandler = null;
  const siteUtils = window.SiteUtils || {};
  const isSafeUrl = siteUtils.isSafeUrl || function (value) {
    var raw = String(value || "").trim();
    var normalized;
    var schemeMatch;

    if (!raw) {
      return false;
    }

    normalized = raw.replace(/[\u0000-\u001F\u007F\s]+/g, "").toLowerCase();
    schemeMatch = normalized.match(/^([a-z][a-z0-9+.-]*):/);

    return !schemeMatch || schemeMatch[1] === "http" || schemeMatch[1] === "https";
  };

  function getAudioType(src) {
    var cleanSrc = String(src || "").split("#")[0].split("?")[0].toLowerCase();

    if (/\.m4a$|\.mp4$|\.aac$/.test(cleanSrc)) {
      return "audio/mp4";
    }

    if (/\.ogg$|\.oga$/.test(cleanSrc)) {
      return "audio/ogg";
    }

    if (/\.wav$/.test(cleanSrc)) {
      return "audio/wav";
    }

    return "audio/mpeg";
  }

  function getLocale() {
    return document.documentElement.lang === "en" ? "en" : "uk";
  }

  function getUiText(key) {
    var locale = getLocale();
    var texts = UI_TEXT[locale] || UI_TEXT.uk;

    return texts[key] || UI_TEXT.uk[key] || "";
  }

  function getLocalizedField(item, fieldName) {
    var locale = getLocale();
    var localizedName = fieldName + "En";
    var localizedValue;
    var fallbackValue;

    if (!item || typeof item !== "object") {
      return "";
    }

    localizedValue = locale === "en" ? item[localizedName] : "";
    fallbackValue = item[fieldName];

    if (typeof localizedValue === "string" && localizedValue.trim()) {
      return localizedValue;
    }

    return typeof fallbackValue === "string" ? fallbackValue : "";
  }

  function getLocalizedTags(item) {
    if (getLocale() === "en" && Array.isArray(item.tagsEn) && item.tagsEn.length) {
      return item.tagsEn;
    }

    return item.tags;
  }

  function normalizeItems(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && typeof payload === "object" && Array.isArray(payload.items)) {
      return payload.items;
    }

    return [];
  }

  function isRenderableAudioItem(item) {
    return Boolean(
      item &&
        typeof item === "object" &&
        item.enabled !== false &&
        item.section === AUDIO_SECTION &&
        item.category === AUDIO_CATEGORY &&
        typeof item.src === "string" &&
        item.src.trim() &&
        isSafeUrl(item.src)
    );
  }

  function createTextElement(tagName, text, className) {
    var element = document.createElement(tagName);

    if (className) {
      element.className = className;
    }

    element.textContent = text;
    return element;
  }

  function createMeta(item) {
    var metaParts = [];
    var meta = document.createElement("p");

    meta.className = "audio-card-meta";

    if (item.date) {
      metaParts.push(item.date);
    }

    if (item.duration) {
      metaParts.push(item.duration);
    }

    meta.textContent = metaParts.join(" · ");
    return metaParts.length ? meta : null;
  }

  function createTags(tags) {
    var list;

    if (!Array.isArray(tags) || !tags.length) {
      return null;
    }

    list = document.createElement("ul");
    list.className = "audio-tags";

    tags.forEach(function (tag) {
      if (typeof tag !== "string" || !tag.trim()) {
        return;
      }

      list.appendChild(createTagItem(tag.trim()));
    });

    return list.children.length ? list : null;
  }

  function createTagItem(tag) {
    var item = document.createElement("li");
    var link = document.createElement("a");
    var query = encodeURIComponent(tag).replace(/'/g, "%27");

    link.className = "audio-tag-link";
    link.href = "search.html?q=" + query;
    link.textContent = tag;
    item.appendChild(link);

    return item;
  }

  function createActionLink(url, label) {
    var link;

    if (!url || !isSafeUrl(url)) {
      return null;
    }

    link = document.createElement("a");
    link.className = "audio-card-link";
    link.href = String(url).trim();
    link.textContent = label;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  }

  function getAudioCardId(item) {
    var id = item && item.id ? String(item.id).trim() : "";

    return id ? "audio-" + id : "";
  }

  function createAudioCard(item) {
    var card = document.createElement("article");
    var cardId = getAudioCardId(item);
    var locale = getLocale();
    var localizedTitle = getLocalizedField(item, "title") || getUiText("fallbackTitle");
    var title = createTextElement("h3", localizedTitle, "audio-card-title");
    var meta = createMeta(item);
    var audio = document.createElement("audio");
    var source = document.createElement("source");
    var actions = document.createElement("div");
    var textLink = createActionLink(item.textUrl, getUiText("text"));
    var transcriptLink = createActionLink(item.transcriptUrl, getUiText("transcript"));
    var tags = createTags(getLocalizedTags(item));
    var description = getLocalizedField(item, "description");

    card.className = "audio-card";
    card.lang = locale;
    if (cardId) {
      card.id = cardId;
    }
    card.appendChild(title);

    if (meta) {
      card.appendChild(meta);
    }

    if (description) {
      card.appendChild(createTextElement("p", description, "audio-card-description"));
    }

    audio.controls = true;
    audio.preload = "metadata";
    audio.lang = locale;
    audio.setAttribute("aria-label", getUiText("audioLabelPrefix") + ": " + localizedTitle);
    source.src = item.src.trim();
    source.type = item.type || getAudioType(item.src);
    audio.appendChild(source);
    audio.appendChild(document.createTextNode(getUiText("unsupported")));
    card.appendChild(audio);

    actions.className = "audio-card-actions";
    if (textLink) {
      actions.appendChild(textLink);
    }
    if (transcriptLink) {
      actions.appendChild(transcriptLink);
    }
    if (actions.children.length) {
      card.appendChild(actions);
    }

    if (tags) {
      card.appendChild(tags);
    }

    return card;
  }

  function clearTargetCards(container) {
    var targets = container.querySelectorAll(".audio-card--target");
    var index;

    for (index = 0; index < targets.length; index += 1) {
      targets[index].classList.remove("audio-card--target");
    }
  }

  function scrollToAudioTarget(target) {
    var rect;
    var top;

    if (!target || !target.getBoundingClientRect || !window.scrollTo) {
      return;
    }

    rect = target.getBoundingClientRect();
    top = rect.top + (window.pageYOffset || document.documentElement.scrollTop || 0) - 90;
    if (top < 0) {
      top = 0;
    }
    window.scrollTo(0, top);
  }

  function isAudioHash(hash) {
    return hash === "#sermons-audio" || hash.indexOf("#audio-") === 0;
  }

  function getAudioHashTarget(container, hash) {
    if (hash === "#sermons-audio") {
      return container;
    }

    if (hash.indexOf("#audio-") === 0) {
      return document.getElementById(hash.slice(1));
    }

    return null;
  }

  function clearScheduledAudioHashScrolls() {
    var index;

    for (index = 0; index < audioHashScrollTimers.length; index += 1) {
      window.clearTimeout(audioHashScrollTimers[index]);
    }
    audioHashScrollTimers = [];

    if (audioHashLoadHandler) {
      window.removeEventListener("load", audioHashLoadHandler);
      audioHashLoadHandler = null;
    }
  }

  function scheduleAudioHashScroll(container, hash) {
    var delays = [0, 250, 700, 1500, 2500];
    var index;

    clearScheduledAudioHashScrolls();

    if (!isAudioHash(hash)) {
      return;
    }

    function runScheduledScroll() {
      var target;

      if ((window.location.hash || "") !== hash) {
        return;
      }

      target = getAudioHashTarget(container, hash);
      if (target) {
        scrollToAudioTarget(target);
      }
    }

    for (index = 0; index < delays.length; index += 1) {
      audioHashScrollTimers.push(window.setTimeout(runScheduledScroll, delays[index]));
    }

    if (document.readyState !== "complete" && !audioHashLoadHandler) {
      audioHashLoadHandler = function () {
        runScheduledScroll();
        window.removeEventListener("load", audioHashLoadHandler);
        audioHashLoadHandler = null;
      };
      window.addEventListener("load", audioHashLoadHandler);
    }
  }

  function handleAudioHash(container) {
    var hash = window.location.hash || "";
    var target = null;

    if (!isAudioHash(hash)) {
      clearTargetCards(container);
      clearScheduledAudioHashScrolls();
      return;
    }

    container.open = true;
    clearTargetCards(container);

    target = getAudioHashTarget(container, hash);
    if (target && hash.indexOf("#audio-") === 0) {
      target.classList.add("audio-card--target");
    }

    scheduleAudioHashScroll(container, hash);
  }

  function setEmptyState(container, message) {
    var list = container.querySelector("[data-audio-list]");

    if (!list) {
      return;
    }

    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }

    list.appendChild(createTextElement("p", message || getUiText("empty"), "audio-empty"));
  }

  function renderAudioItems(container, items) {
    var list = container.querySelector("[data-audio-list]");
    var renderableItems = items.filter(isRenderableAudioItem);

    if (!list) {
      return;
    }

    if (!renderableItems.length) {
      setEmptyState(container, getUiText("empty"));
      handleAudioHash(container);
      return;
    }

    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }

    renderableItems.forEach(function (item) {
      list.appendChild(createAudioCard(item));
    });

    handleAudioHash(container);
  }

  function initAudioContent() {
    var container = document.querySelector('[data-audio-section="church-sermons"]');

    if (!container) {
      return;
    }

    handleAudioHash(container);
    window.addEventListener("hashchange", function () {
      handleAudioHash(container);
    });

    if (!window.fetch) {
      return;
    }

    fetch(AUDIO_DATA_PATH)
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Failed to load audio content");
        }
        return response.json();
      })
      .then(function (payload) {
        renderAudioItems(container, normalizeItems(payload));
      })
      .catch(function () {
        setEmptyState(container, getUiText("empty"));
        handleAudioHash(container);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAudioContent);
  } else {
    initAudioContent();
  }
})();
