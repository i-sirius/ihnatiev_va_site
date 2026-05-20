# Google Search Console Setup

Version: `0.6.27a`

This checklist prepares `https://iva.net.ua` for Google Search Console after the basic SEO foundation is in place.

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
- Future SEO work can add Search Console verification status, analytics decisions, richer schema.org data, PDF/download metadata, and stronger social preview images.
