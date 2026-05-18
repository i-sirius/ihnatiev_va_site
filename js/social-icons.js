(() => {
  function getSocialIconMarkup(id, className = "contact-social-icon") {
    if (id === "youtube") {
      return `
        <svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.4.5A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8ZM9.6 15.8V8.2l6.5 3.8-6.5 3.8Z"/>
        </svg>
      `;
    }

    if (id === "facebook") {
      return `
        <svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M13.6 22v-8.2h2.8l.4-3.2h-3.2V8.6c0-.9.3-1.6 1.7-1.6H17V4.1c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2v2.4H7.8v3.2h2.7V22h3.1Z"/>
        </svg>
      `;
    }

    if (id === "webofscience") {
      return `
        <svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="#050505" d="M3.9 6.1c1.6-.5 3.4-.5 5.5-.2-.9 1.8-1.3 3.8-1.3 6.1s.4 4.3 1.3 6.1c-2.1.3-3.9.3-5.5-.2A15 15 0 0 1 3.2 12c0-2.1.2-4.1.7-5.9Z"/>
          <path fill="#6036c8" d="M10.2 3.1c4.1.8 7.4 2.7 10.2 5.9l-2.8 3.2c-2.2-2.8-5.1-4.7-8.6-5.6l1.2-3.5Z"/>
          <path fill="#08a600" d="M17.6 11.8l2.8 3.2c-2.8 3.2-6.1 5.1-10.2 5.9L9 17.4c3.5-.9 6.4-2.8 8.6-5.6Z"/>
        </svg>
      `;
    }

    if (id === "orcid") {
      return `
        <svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="10" fill="#a6ce39"/>
          <circle cx="7.7" cy="7.2" r="1.15" fill="#ffffff"/>
          <path fill="#ffffff" d="M6.8 10h1.8v7H6.8zM11 7.5h3.2c3 0 5.1 1.9 5.1 4.5S17.2 16.5 14.2 16.5H11v-9Zm1.8 1.7v5.6h1.3c2 0 3.3-1.1 3.3-2.8s-1.3-2.8-3.3-2.8h-1.3Z"/>
        </svg>
      `;
    }

    if (id === "googlescholar") {
      return `
        <svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M12 2 1.5 7.3 12 12.6l8.5-4.3v5.3H22V7.3L12 2Zm-6.8 9.5V15c0 2.5 3.1 4.5 6.8 4.5s6.8-2 6.8-4.5v-3.5L12 15l-6.8-3.5Zm3 4.1h1.6c.2 1 1.1 1.6 2.3 1.6 1.3 0 2.2-.7 2.2-1.6s-.9-1.6-2.2-1.6c-.6 0-1.2.1-1.6.4l-.7-1c.6-.5 1.5-.7 2.4-.7 2.1 0 3.6 1.1 3.6 2.9 0 1.8-1.5 2.9-3.8 2.9-2 0-3.4-1-3.8-2.9Z"/>
        </svg>
      `;
    }

    if (id === "church") {
      return `
        <svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M11.3 1.5h1.4v1.7h1.7v1.3h-1.7v2h-1.4v-2H9.6V3.2h1.7V1.5Zm-5.1 5h1.2v1.4h1.4v1.2H7.4v1.5H6.2V9.1H4.7V7.9h1.5V6.5Zm10.4 0h1.2v1.4h1.5v1.2h-1.5v1.5h-1.2V9.1h-1.4V7.9h1.4V6.5ZM12 7.2c-2.2 1.4-3.4 3-3.4 4.8 0 1.6 1.3 2.8 3.4 2.8s3.4-1.2 3.4-2.8c0-1.8-1.2-3.4-3.4-4.8ZM4.8 14h3.6v7H4.8v-7Zm4.5-.2h5.4V21h-1.8v-3.2a.9.9 0 0 0-1.8 0V21H9.3v-7.2Zm6.3.2h3.6v7h-3.6v-7Z"/>
        </svg>
      `;
    }

    return `
      <svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M21.6 4.3 2.9 11.5c-1.3.5-1.3 1.2-.2 1.5l4.8 1.5 1.9 6c.2.5.1.8.7.8.4 0 .6-.2.8-.4l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.2-15.2c.3-1.2-.4-1.8-1.2-1.4Zm-12.8 10-1-.3 10-6.3c.5-.3.9-.1.5.3l-8 7.2-.3 3.3-1.2-4.2Z"/>
      </svg>
    `;
  }

  window.SiteSocialIcons = {
    getMarkup: getSocialIconMarkup
  };
})();
