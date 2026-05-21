# Google Search Console Setup

Version: `0.6.27b`

This checklist prepares `https://iva.net.ua` for Google Search Console after the basic SEO foundation is in place.

## Status / Поточний стан

Search Console is already connected:

- `Domain property` for `iva.net.ua` is verified;
- ownership was verified through the Google TXT record added in Cloudflare DNS;
- keep the Google TXT record in DNS so ownership verification remains valid;
- sitemap was submitted and checked: `https://iva.net.ua/sitemap.xml`;
- public URLs were checked with URL Inspection and indexing requests were sent for:
  - `https://iva.net.ua/`
  - `https://iva.net.ua/activity1.html`
  - `https://iva.net.ua/activity2.html`
  - `https://iva.net.ua/activity3.html`
  - `https://iva.net.ua/downloads.html`
  - `https://iva.net.ua/contact.html`
- the home page inspection confirmed that the URL is on Google, crawling and indexing are allowed, page loading succeeded, and HTTPS works.

Check again after 3-7 days:

- Sitemaps status;
- Page indexing reports;
- Performance / Search results data;
- URL Inspection for the key public pages.

## 1. Open Search Console

Go to Google Search Console:

`https://search.google.com/search-console`

Use the Google account that should manage the site.

## 2. Choose Property Type

Recommended option:

`Domain property` for `iva.net.ua`

Use this if DNS verification through Cloudflare is convenient. It covers the whole domain, including `https://iva.net.ua/` and any future subdomains.

Simpler fallback:

`URL prefix` for `https://iva.net.ua/`

Use this if it is easier to verify with an HTML file or meta tag. It covers this exact HTTPS site prefix.

## 3. Verify Ownership

For `Domain property`, add the TXT record provided by Google to DNS and wait until Google confirms it.

For `URL prefix`, follow one of Google's offered verification methods. Do not submit `/admin/` as a public URL.

## 4. Submit Sitemap

After verification, open the Sitemaps section and submit:

`https://iva.net.ua/sitemap.xml`

The sitemap currently includes only public pages:

- `https://iva.net.ua/`
- `https://iva.net.ua/activity1.html`
- `https://iva.net.ua/activity2.html`
- `https://iva.net.ua/activity3.html`
- `https://iva.net.ua/downloads.html`
- `https://iva.net.ua/contact.html`

## 5. Inspect Key URLs

Use URL Inspection for the first important pages:

- `https://iva.net.ua/`
- `https://iva.net.ua/activity1.html`
- `https://iva.net.ua/downloads.html`
- `https://iva.net.ua/contact.html`

If Google has not indexed a page yet, request indexing after confirming the live page loads correctly.

## 6. Notes

- Indexing can take time after sitemap submission.
- A sitemap is a strong hint for Google, not a guarantee of indexing.
- `/admin/` should not be submitted for indexing. It has `noindex,nofollow` in `admin/index.html` and is excluded from `sitemap.xml`.
- Future SEO work can track Search Console reports, analytics decisions, richer schema.org data, PDF/download metadata, and stronger social preview images.
