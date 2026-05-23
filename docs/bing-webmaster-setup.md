# Bing Webmaster Tools Setup

Version: `0.6.29b`

This note records the Bing Webmaster Tools setup for `https://iva.net.ua/`.

## Status / Поточний стан

Bing Webmaster Tools is connected:

- site property is visible as `iva.net.ua/`;
- setup used import from Google Search Console or verification through the existing Google Search Console access;
- main public URLs were checked with URL Inspection;
- indexing requests were submitted for the main public URLs;
- sitemap should be monitored in the Bing Webmaster Tools `Sitemaps` section.

Expected sitemap:

`https://iva.net.ua/sitemap.xml`

## Checked URLs

The following URLs were inspected and submitted for indexing:

```text
https://iva.net.ua/
https://iva.net.ua/activity1.html
https://iva.net.ua/activity2.html
https://iva.net.ua/activity3.html
https://iva.net.ua/downloads.html
https://iva.net.ua/contact.html
```

Do not submit `/admin/` for indexing. It is not part of `sitemap.xml` and has `noindex,nofollow` in `admin/index.html`.

## Follow-up Checks / Подальші перевірки

Check Bing Webmaster Tools again after 1-3 days:

- `Search Performance`;
- `Sitemaps`;
- `URL Inspection`;
- `Site Explorer`;
- `Recommendations`.

Bing data can appear gradually. A submitted sitemap and indexing request are signals for crawling, not an immediate indexing guarantee.

## Maintenance Notes

- Keep `https://iva.net.ua/sitemap.xml` available and limited to public pages.
- Keep `/admin/` out of sitemap submissions.
- If Bing reports URL or sitemap errors, compare the issue with the Google Search Console state before changing site metadata.
- SEO metadata, robots, and sitemap files were not changed in this documentation package.
