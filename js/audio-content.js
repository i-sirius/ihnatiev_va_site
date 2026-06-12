(() => {
  const AUDIO_DATA_PATH = "files/content/audio.json";
  const AUDIO_SECTION = "church";
  const AUDIO_CATEGORY = "sermons";
  const EMPTY_MESSAGE = "Аудіозаписи проповідей буде додано після перевірки формату відображення.";
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

      list.appendChild(createTextElement("li", tag.trim(), ""));
    });

    return list.children.length ? list : null;
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

  function createAudioCard(item) {
    var card = document.createElement("article");
    var title = createTextElement("h3", item.title || "Аудіозапис проповіді", "audio-card-title");
    var meta = createMeta(item);
    var audio = document.createElement("audio");
    var source = document.createElement("source");
    var actions = document.createElement("div");
    var downloadLink = createActionLink(item.downloadUrl, "Завантажити");
    var transcriptLink = createActionLink(item.transcriptUrl, "Текст");
    var tags = createTags(item.tags);

    card.className = "audio-card";
    card.appendChild(title);

    if (meta) {
      card.appendChild(meta);
    }

    if (item.description) {
      card.appendChild(createTextElement("p", item.description, "audio-card-description"));
    }

    audio.controls = true;
    audio.preload = "metadata";
    source.src = item.src.trim();
    source.type = item.type || getAudioType(item.src);
    audio.appendChild(source);
    audio.appendChild(document.createTextNode("Ваш браузер не підтримує аудіопрогравач."));
    card.appendChild(audio);

    actions.className = "audio-card-actions";
    if (downloadLink) {
      actions.appendChild(downloadLink);
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

  function setEmptyState(container, message) {
    var list = container.querySelector("[data-audio-list]");

    if (!list) {
      return;
    }

    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }

    list.appendChild(createTextElement("p", message || EMPTY_MESSAGE, "audio-empty"));
  }

  function renderAudioItems(container, items) {
    var list = container.querySelector("[data-audio-list]");
    var renderableItems = items.filter(isRenderableAudioItem);

    if (!list) {
      return;
    }

    if (!renderableItems.length) {
      setEmptyState(container, EMPTY_MESSAGE);
      return;
    }

    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }

    renderableItems.forEach(function (item) {
      list.appendChild(createAudioCard(item));
    });
  }

  function initAudioContent() {
    var container = document.querySelector('[data-audio-section="church-sermons"]');

    if (!container || !window.fetch) {
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
        setEmptyState(container, EMPTY_MESSAGE);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAudioContent);
  } else {
    initAudioContent();
  }
})();
