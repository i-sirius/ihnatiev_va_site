(() => {
  function applyContactPage({
    pageType = document.body.dataset.page,
    site = window.SITE || {},
    setText = () => {},
    escapeHtml = (value) => String(value),
    getSocialIconMarkup = () => ""
  } = {}) {
    if (pageType !== "contact") {
      return;
    }

    const contactUi = site.ui?.contact || {};
    document.title = site.contact.pageTitle;
    setText("[data-contact-title]", site.contact.pageTitle);
    setText("[data-contact-heading]", site.contact.heading);
    setText("[data-contact-socials-title]", site.contact.socials?.title || "Мої соціальні мережі:");
    setText("[data-contact-intro]", contactUi.intro || site.contact.intro || "");
    setText("[data-contact-name-label]", site.contact.fields.name);
    setText("[data-contact-email-label]", site.contact.fields.email);
    setText("[data-contact-phone-label]", contactUi.phone || "Телефон");
    setText("[data-contact-subject-label]", contactUi.subject || "Тема");
    setText("[data-contact-message-label]", site.contact.fields.message);
    setText("[data-contact-submit]", site.contact.fields.submit);

    const socialsList = document.querySelector("[data-contact-socials-list]");
    if (socialsList) {
      const defaultYoutubeHref = site.youtubeChannelId
        ? `https://www.youtube.com/channel/${site.youtubeChannelId}`
        : "";
      const socials = Array.isArray(site.contact.socials?.items)
        ? site.contact.socials.items
        : [];

      socialsList.innerHTML = socials
        .map((item) => {
          const href = item.id === "youtube" ? item.href || defaultYoutubeHref : item.href || "";
          const isActive = Boolean(href);
          const status = isActive
            ? ""
            : `<span class="contact-social-status">${escapeHtml(
                contactUi.socialsComingSoon || "незабаром"
              )}</span>`;
          const commonClass = `contact-social-button is-${item.id}${isActive ? "" : " is-disabled"}`;
          const icon = getSocialIconMarkup(item.id, "contact-social-icon");

          if (!isActive) {
            return `
              <span class="${commonClass}" aria-disabled="true">
                ${icon}
                <span class="contact-social-label">${item.label}</span>
                ${status}
              </span>
            `;
          }

          return `
            <a class="${commonClass}" href="${href}" target="_blank" rel="noreferrer">
              ${icon}
              <span class="contact-social-label">${item.label}</span>
            </a>
          `;
        })
        .join("");
    }

    const form = document.querySelector("[data-contact-form]");
    const nameField = form?.querySelector("input[name='name']");
    const emailField = form?.querySelector("input[name='email']");
    const phoneField = form?.querySelector("input[name='phone']");
    const subjectField = form?.querySelector("input[name='subject']");
    const messageField = form?.querySelector("textarea[name='message']");
    const submitButton = form?.querySelector("[data-contact-submit]");
    const hiddenSubjectField = form?.querySelector("input[name='_subject']");
    const noteName = document.querySelector("[data-note-name]");
    const noteSubject = document.querySelector("[data-note-subject]");
    const noteMessage = document.querySelector("[data-contact-message-note]");
    const noteEmail = document.querySelector("[data-note-email]");
    const notePhone = document.querySelector("[data-note-phone]");
    const okName = document.querySelector("[data-ok-name]");
    const okSubject = document.querySelector("[data-ok-subject]");
    const okMessage = document.querySelector("[data-ok-message]");
    const okEmail = document.querySelector("[data-ok-email]");
    const okPhone = document.querySelector("[data-ok-phone]");
    const emailMark = document.querySelector("[data-mark-email]");
    const phoneMark = document.querySelector("[data-mark-phone]");

    function ensureLimitCounter(
      field,
      counterKey,
      containerSelector = ".field-label",
      legacySelector = "",
      extraClass = ""
    ) {
      if (!field) {
        return null;
      }

      const label = field.closest("label");
      if (!label) {
        return null;
      }

      let counterElement = label.querySelector(`[data-contact-counter="${counterKey}"]`);
      if (!counterElement && legacySelector) {
        counterElement = label.querySelector(legacySelector);
      }
      if (!counterElement) {
        counterElement = document.createElement("small");
        counterElement.hidden = true;
      }

      counterElement.setAttribute("data-contact-counter", counterKey);
      counterElement.className = `contact-counter contact-limit-counter${extraClass ? ` ${extraClass}` : ""}`;

      const container = containerSelector ? label.querySelector(containerSelector) : null;
      if (counterElement.parentElement !== container) {
        (container || label).appendChild(counterElement);
      }

      return counterElement;
    }

    const nameCounter = ensureLimitCounter(nameField, "name");
    const emailCounter = ensureLimitCounter(emailField, "email");
    const phoneCounter = ensureLimitCounter(phoneField, "phone");
    const subjectCounter = ensureLimitCounter(subjectField, "subject");
    const messageCounter = ensureLimitCounter(
      messageField,
      "message",
      "",
      "[data-contact-message-count]",
      "contact-limit-counter-under"
    );

    if (
      !form ||
      !nameField ||
      !emailField ||
      !phoneField ||
      !subjectField ||
      !messageField ||
      !submitButton ||
      !nameCounter ||
      !emailCounter ||
      !phoneCounter ||
      !subjectCounter ||
      !messageCounter ||
      !noteName ||
      !noteSubject ||
      !noteMessage ||
      !noteEmail ||
      !notePhone ||
      !okName ||
      !okSubject ||
      !okMessage ||
      !okEmail ||
      !okPhone ||
      !emailMark ||
      !phoneMark
    ) {
      return;
    }

    form.action = site.contact.formAction;
    if (hiddenSubjectField) {
      hiddenSubjectField.value = contactUi.formSubject || "Нове повідомлення із сайту";
    }

    noteName.textContent = contactUi.required || "Обов'язково для заповнення";
    noteSubject.textContent = contactUi.required || "Обов'язково для заповнення";
    noteMessage.textContent =
      contactUi.messageRequired || "Обов'язково для заповнення (не менше 25 символів)";
    noteEmail.textContent = contactUi.emailOrPhoneRequired || "Обов'язково: email або телефон";
    notePhone.textContent = contactUi.phoneOrEmailRequired || "Обов'язково: телефон або email";
    okName.textContent = `✓ ${contactUi.completed || "Заповнено"}`;
    okSubject.textContent = `✓ ${contactUi.completed || "Заповнено"}`;
    okMessage.textContent = `✓ ${contactUi.messageEnough || "Достатньо символів"}`;
    okEmail.textContent = `✓ ${contactUi.emailProvided || "Email вказано"}`;
    okPhone.textContent = `✓ ${contactUi.phoneProvided || "Телефон вказано"}`;

    if (form.dataset.enhanced === "true") {
      if (typeof form._applyContactPrefill === "function") {
        form._applyContactPrefill();
      }
      if (typeof form._autoResizeMessageField === "function") {
        form._autoResizeMessageField(false);
      }
      if (typeof form._updateContactState === "function") {
        form._updateContactState();
      }
      return;
    }

    form.dataset.enhanced = "true";

    function autoResizeMessageField(keepSubmitVisible = false) {
      const previousRect = messageField.getBoundingClientRect();
      const previousHeight = messageField.offsetHeight;
      messageField.style.height = "auto";
      messageField.style.height = `${messageField.scrollHeight}px`;

      const nextHeight = messageField.offsetHeight;
      const heightDelta = nextHeight - previousHeight;

      if (heightDelta < 0 && document.activeElement === messageField) {
        const nextRect = messageField.getBoundingClientRect();
        const bottomShift = nextRect.bottom - previousRect.bottom;

        if (bottomShift !== 0) {
          window.scrollBy({
            top: bottomShift,
            left: 0,
            behavior: "auto"
          });
        }
      }

      if (!keepSubmitVisible || heightDelta <= 0) {
        return;
      }

      const viewportPadding = 24;
      const submitRect = submitButton.getBoundingClientRect();
      const overflow = submitRect.bottom - (window.innerHeight - viewportPadding);

      if (overflow > 0) {
        window.scrollBy({
          top: overflow + 8,
          left: 0,
          behavior: "auto"
        });
      }
    }

    function updateLimitCounter(field, counterElement) {
      const currentContactUi = site.ui?.contact || {};
      const limit = Number(field.maxLength) || 0;
      if (!limit) {
        counterElement.hidden = true;
        counterElement.textContent = "";
        counterElement.style.removeProperty("--limit-counter-opacity");
        counterElement.classList.remove("is-exhausted");
        return;
      }

      const charsLeft = Math.max(limit - field.value.length, 0);
      const warnThreshold = Math.ceil(limit * 0.15);

      if (charsLeft <= warnThreshold) {
        const progress = 1 - charsLeft / Math.max(warnThreshold, 1);
        const opacity = charsLeft === 0 ? 0.96 : 0.18 + progress * 0.82;
        counterElement.hidden = false;
        counterElement.textContent =
          charsLeft === 0
            ? currentContactUi.limitExhausted || "ЛІМІТ ПО ТЕКСТУ ВИЧЕРПАНО"
            : `${currentContactUi.limitRemainingPrefix || ""}${charsLeft}${
                currentContactUi.limitRemainingSuffix || ""
              }`;
        counterElement.style.setProperty("--limit-counter-opacity", opacity.toFixed(3));
        counterElement.classList.toggle("is-exhausted", charsLeft === 0);
      } else {
        counterElement.hidden = true;
        counterElement.textContent = "";
        counterElement.style.removeProperty("--limit-counter-opacity");
        counterElement.classList.remove("is-exhausted");
      }
    }

    function triggerLimitFeedback(field) {
      field.classList.remove("field-limit-hit");
      void field.offsetWidth;
      field.classList.add("field-limit-hit");
    }

    const limitedFields = [
      nameField,
      emailField,
      phoneField,
      subjectField,
      messageField
    ];
    const limitCounters = [
      [nameField, nameCounter],
      [emailField, emailCounter],
      [phoneField, phoneCounter],
      [subjectField, subjectCounter],
      [messageField, messageCounter]
    ];

    function applyContactPrefill() {
      if (form.dataset.prefillApplied === "true") {
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const prefillMap = [
        [nameField, params.get("name")],
        [emailField, params.get("email")],
        [phoneField, params.get("phone")],
        [subjectField, params.get("subject")],
        [messageField, params.get("message")]
      ];

      prefillMap.forEach(([field, value]) => {
        if (field && value && !field.value.trim()) {
          field.value = value;
        }
      });

      form.dataset.prefillApplied = "true";
    }

    function updateContactState() {
      const currentContactUi = site.ui?.contact || {};
      const hasName = nameField.value.trim().length > 0;
      const hasSubject = subjectField.value.trim().length > 0;
      const emailValue = emailField.value.trim();
      const phoneValue = phoneField.value.trim();
      const phoneDigits = phoneValue.replace(/\D/g, "");
      const hasEmail = emailValue.length > 0;
      const hasPhone = phoneValue.length > 0;
      const emailValid = hasEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
      const phoneValid = hasPhone && phoneDigits.length >= 10;
      const hasValidContact = emailValid || phoneValid;
      const messageLength = messageField.value.trim().length;
      const messageValid = messageLength >= 25;
      const remaining = Math.max(25 - messageLength, 0);
      const formIsReady = hasName && hasSubject && hasValidContact && messageValid;

      emailField.setCustomValidity("");
      phoneField.setCustomValidity("");

      if (!hasValidContact) {
        if (hasEmail && !emailValid) {
          emailField.setCustomValidity(currentContactUi.invalidEmail || "Вкажіть коректний email");
        } else if (hasPhone && !phoneValid) {
          phoneField.setCustomValidity(
            currentContactUi.invalidPhone || "Вкажіть коректний номер телефону"
          );
        } else {
          const contactMessage =
            currentContactUi.provideEmailOrPhone || "Вкажіть email або телефон";
          emailField.setCustomValidity(contactMessage);
          phoneField.setCustomValidity(contactMessage);
        }
      }

      noteName.hidden = hasName;
      okName.hidden = !hasName;
      noteSubject.hidden = hasSubject;
      okSubject.hidden = !hasSubject;

      emailMark.hidden = hasValidContact;
      phoneMark.hidden = hasValidContact;

      if (emailValid) {
        noteEmail.hidden = true;
        okEmail.hidden = false;
      } else {
        okEmail.hidden = true;
        noteEmail.hidden = false;
        noteEmail.textContent = phoneValid
          ? currentContactUi.emailOptionalBecausePhone || "Необов'язково, бо телефон уже вказано"
          : hasEmail
            ? currentContactUi.invalidEmail || "Вкажіть коректний email"
            : currentContactUi.emailOrPhoneRequired || "Обов'язково: email або телефон";
      }

      if (phoneValid) {
        notePhone.hidden = true;
        okPhone.hidden = false;
      } else {
        okPhone.hidden = true;
        notePhone.hidden = false;
        notePhone.textContent = emailValid
          ? currentContactUi.phoneOptionalBecauseEmail || "Необов'язково, бо email уже вказано"
          : hasPhone
            ? currentContactUi.invalidPhone || "Вкажіть коректний номер телефону"
            : currentContactUi.phoneOrEmailRequired || "Обов'язково: телефон або email";
      }

      if (messageValid) {
        noteMessage.hidden = true;
        okMessage.hidden = false;
      } else {
        noteMessage.hidden = false;
        okMessage.hidden = true;
        noteMessage.textContent =
          messageLength > 0
            ? `${currentContactUi.messageRemainingPrefix || "Обов'язково для заповнення, напишіть хоча б ще "}${remaining}${currentContactUi.messageRemainingSuffix || " символів"}`
            : currentContactUi.messageRequired ||
              "Обов'язково для заповнення (не менше 25 символів)";
      }

      limitCounters.forEach(([field, counterElement]) => updateLimitCounter(field, counterElement));

      submitButton.disabled = !formIsReady;
    }

    [nameField, emailField, phoneField, subjectField, messageField].forEach((field) => {
      field.addEventListener("input", updateContactState);
      field.addEventListener("change", updateContactState);
    });

    limitedFields.forEach((field) => {
      field.addEventListener("beforeinput", (event) => {
        const limit = Number(field.maxLength) || 0;
        if (!limit || event.isComposing) {
          return;
        }

        const inputType = event.inputType || "";
        if (!inputType.startsWith("insert")) {
          return;
        }

        const selectionStart =
          typeof field.selectionStart === "number" ? field.selectionStart : field.value.length;
        const selectionEnd =
          typeof field.selectionEnd === "number" ? field.selectionEnd : field.value.length;
        const selectedLength = Math.max(selectionEnd - selectionStart, 0);

        if (field.value.length - selectedLength >= limit) {
          triggerLimitFeedback(field);
        }
      });

      field.addEventListener("animationend", () => {
        field.classList.remove("field-limit-hit");
      });
    });

    messageField.addEventListener("input", () => autoResizeMessageField(true));
    window.addEventListener("resize", () => autoResizeMessageField(false));

    form.addEventListener("submit", (event) => {
      updateContactState();

      if (submitButton.disabled) {
        event.preventDefault();

        if (!nameField.value.trim()) {
          nameField.reportValidity();
          return;
        }

        if (!subjectField.value.trim()) {
          subjectField.reportValidity();
          return;
        }

        if (emailField.validationMessage) {
          emailField.reportValidity();
          return;
        }

        if (phoneField.validationMessage) {
          phoneField.reportValidity();
          return;
        }

        messageField.reportValidity();
      }
    });

    form._applyContactPrefill = applyContactPrefill;
    form._autoResizeMessageField = autoResizeMessageField;
    form._updateContactState = updateContactState;

    applyContactPrefill();
    autoResizeMessageField(false);
    updateContactState();
  }

  window.SiteContactPage = {
    apply: applyContactPage
  };
})();
