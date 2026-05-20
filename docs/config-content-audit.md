# Audit remaining config.js content

Version: `0.6.25a`

Scope: this audit maps what still lives in `config.js`, what is already backed by JSON/CMS, and what should or should not be extracted next.

Non-goals: no Decap OAuth, Worker, DNS, GitHub OAuth, visual design, CSS architecture, frontend effects, or CMS collection structure changes in this package.

## Executive Summary

`config.js` is now a mixed layer:

- a fallback content bundle for pages that already load JSON/CMS content;
- a localization fallback for Ukrainian and English;
- a runtime/system configuration file for locale, storage, visitor counter, and build metadata;
- a remaining home for several editor-facing content groups that have not yet been extracted.

The Decap/CMS block is in a stable state after the first real publish and BOM hotfix. The next content work should stay incremental. The lowest-risk next extraction is a small `social-links` or `site-links` package that unifies profile/social links currently duplicated between `SITE.meta.headerLinks` and `SITE.contact.socials.items`.

## Content Map

| `config.js` section | What it contains | Current role | JSON/CMS status | Recommendation |
| --- | --- | --- | --- | --- |
| `SITE.meta.buildVersion`, `buildDate`, `year` | Release and footer metadata | System/release config | Not CMS content | Keep in `config.js`; update only with releases |
| `SITE.meta.siteTitle`, `ownerName`, `homeTitle`, `homeSubtitle` | Site identity and header title text | Stable content plus layout input | Not extracted | Keep for now; later consider `site-meta.json` only after header fallback policy is clear |
| `SITE.meta.headerLinks` | YouTube, Facebook, Telegram, Web of Science, ORCID, Google Scholar profile URLs | Shared profile links for header/social UI | Not extracted | Good next small candidate, together with contact social links |
| `SITE.menu.desktop`, `SITE.menu.mobile` | Navigation labels | UI/localization fallback | Not extracted | Keep for now; extract later with a broader UI labels package |
| `SITE.home` | About heading, author photo alt, about paragraphs, activities heading | Editorial fallback | Already extracted to `files/content/home.json` | CMS-ready; keep fallback in `config.js` |
| `SITE.activities[*].name`, `cardDescription`, `heroImage.alt` | Activity names, home-card copy, hero alt text | Editorial fallback | Already extracted to `files/content/activities.json` | CMS-ready; keep fallback in `config.js` |
| `SITE.activities[*].pageDescription` | Long activity page text, details blocks, education content, publication fallback container | Editorial content plus renderer schema | Mostly not extracted; publications list is extracted separately | Do not move casually; plan a dedicated schema if extracted |
| Activity 1 publications list | 85 publication entries, labels, filters | Fallback for publications details | Extracted to `files/content/publications.json` | Keep fallback until no-fetch/offline policy is decided |
| `SITE.activities[*].links` | Activity profile links, currently important for priestly ministry | Editorial links with UI icon dependency | Not extracted | Consider later with social/profile links if schema covers activity-scoped links |
| `SITE.downloads` | Downloads page title, heading, intro | Editorial fallback | Already extracted to `files/content/pages.json` | CMS-ready; keep fallback in `config.js` |
| `SITE.contact` simple page fields | Contact title, heading, intro, form field labels, Formspree subject | Editorial fallback | Mostly extracted to `files/content/pages.json` | CMS-ready for simple text; keep validation/status labels in `SITE.ui` |
| `SITE.contact.socials.items` | Contact social/profile links | Editorial links with icon dependency | Not extracted | Good next small candidate with `SITE.meta.headerLinks` |
| `SITE.ui.details` | Expand/collapse labels and aria text | UI labels used by multiple details renderers | Not extracted | Keep until UI labels package |
| `SITE.ui.gallery`, `documentPreview`, `downloads`, `video` | Gallery, preview, downloads, YouTube UI labels | UI labels and fallback text | Not extracted | Keep until UI labels package; some labels are behavior-sensitive |
| `SITE.ui.theme`, `language`, `header`, `footer` | Theme/language/header/footer UI text | Runtime UI labels | Not extracted | Keep for now |
| `SITE.ui.contact` | Contact form validation and status strings | Runtime validation/UI feedback | Not extracted | Keep for now; editor can easily break validation tone/meaning |
| `SITE.youtubeChannelId` | YouTube channel source for live feed | Runtime/content integration config | Not CMS content yet | Keep in `config.js` |
| `SITE.youtubeFallbackVideos` | Fallback YouTube videos | Runtime fallback content | Not extracted | Keep for now; extract only with a video-feed/content package |
| `SITE_BASE`, `SITE_EN` | Locale fallback composition | Localization implementation detail | Not CMS content | Do not touch except as part of intentional locale refactor |
| `SITE_RUNTIME` | Locale keys, storage keys, visitor counter API config | Runtime/system config | Not CMS content | Do not touch |
| Locale/runtime functions | Clone, merge, locale selection, storage sync | Runtime code | Not CMS content | Do not touch in content extraction packages |

## Already CMS-Ready

These groups already have JSON/CMS entry points and should be treated as migrated, with `config.js` serving as fallback:

- Home/about content: `files/content/home.json`, collection `home_content`.
- Activity names, card descriptions, and hero alt text: `files/content/activities.json`, collection `activities_content`.
- Simple Downloads and Contact page copy: `files/content/pages.json`, collection `pages_content`.
- Publications summary, filter labels, type labels, and publication items: `files/content/publications.json`, collection `publications_content`.
- Activity galleries: `files/media/activity1/photos.json`, `files/media/activity2/photos.json`, `files/media/activity3/photos.json`.
- Educational activity files: `files/activity2/files.json`.
- Download materials: `files/downloads/files.json`.

## Safe Next Extraction

Recommended next package: `0.6.25b - extract social/profile links`.

Why this is the safest next piece:

- The data is small and structured.
- It avoids long rich text and nested details schemas.
- It reduces duplication between header profile links and contact social links.
- It is useful for the editor because URLs change more naturally than UI labels.

Suggested shape:

- Add `files/content/social-links.json` or `files/content/site-links.json`.
- Keep the existing `config.js` links as fallback.
- Load the JSON after locale resolution, the same way other content JSON overlays fallback data.
- Validate known IDs in `check-content`: `youtube`, `facebook`, `telegram`, `webofscience`, `orcid`, `googlescholar`.
- Use select fields for IDs in CMS so an editor cannot typo an icon key.
- Keep `SITE.youtubeChannelId` separate for now because it controls feed behavior, not only a public link.

Second candidate after that: extract activity page long descriptions into a dedicated `activity-pages.json`. This has higher editorial value, but it is riskier because it includes nested details blocks and HTML-bearing strings.

## Keep For Now

The following groups should stay in `config.js` until they have a tighter schema or a dedicated package:

- Activity page `pageDescription` blocks.
- Publication fallback copy inside activity 1.
- UI labels for gallery, document preview, downloads, video, theme, language, header, footer.
- Contact validation/status messages.
- YouTube channel and fallback videos.
- Navigation labels.
- Site title/subtitle/header identity text.

## Do Not Touch As Content

These are system/runtime concerns and should not be moved into editor-facing CMS collections:

- `buildVersion`, `buildDate`, and release metadata.
- `SITE_RUNTIME.defaultLocale`, `supportedLocales`, `storageKeys`, and `locales`.
- Visitor counter API configuration.
- Locale merge/clone/apply functions.
- PWA/service worker behavior and cache logic.
- Decap OAuth, Worker, DNS, and GitHub OAuth settings.

## Admin Config UX Review

Current state:

- Collection names are understandable and match the site structure.
- The tested Decap publish path confirms that the current collections are operational.
- Publications have a useful structured `type` select and bounded `year`.
- Existing media/file widgets are appropriate for galleries, educational files, and downloads.

Suggested future improvements:

- Add short `description` or `hint` fields to collections that explain what affects the public site and what is fallback-only.
- Add hints for multilingual fields so editors understand when English can be left blank and when it should be translated.
- Change `downloads.monographs.purchase.mode` from a free string to a select if only `contact` is supported.
- Add clearer hints for image alt text and file labels.
- If social/profile links are extracted, use select fields for known link IDs and validate URLs in `check-content`.
- Keep raw nested page-description structures out of CMS until the schema is intentionally designed.

## Risks

- `config.js` still contains duplicated fallback publication content. This is useful for resilience, but it increases maintenance cost.
- Moving UI labels too early can make validation, accessibility labels, and controls easier to break.
- Activity page long descriptions are editorially important but structurally complex.
- The console can display Ukrainian text with mojibake depending on PowerShell encoding. This audit does not treat terminal display as a file-encoding problem.

## Decision

The next practical extraction should be social/profile links. It is small, editor-relevant, and lower risk than moving long activity page content or broad UI labels.
