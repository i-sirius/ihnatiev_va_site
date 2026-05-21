# Legacy browser compatibility audit

## Support target

`0.6.28a` treats legacy browser support as a readable fallback target. Older browsers do not need to reproduce every Liquid Glass, lens, blur, hover, or animation detail, but public pages should remain usable: navigation and text stay available, photos keep bounded sizes, and activities, downloads, publications, and contacts can be reached.

The first confirmed problem device is iPad Air 1 with iOS 12 Safari. It is the main real-device check for this pass, while the audit also looks for risks in older WebKit, Android WebView/Chrome, and older desktop Chromium/Edge engines.

Chrome 79 and older legacy Chromium became a second confirmed diagnostic target in `0.6.28c`: the home page could keep the technical placeholder `Основний текст буде підставлено з config.js.` when the content bootstrap stopped before the `config.js` fallback render.

## JS audit

The public JavaScript sweep covered `app.js`, `js/*.js`, and the early inline head script in the public HTML pages.

Found during the audit:

- optional chaining in public modules, which is a parse-time failure for iOS 12 Safari;
- nullish coalescing and `replaceAll()` in `js/site-utils.js`;
- `replaceChildren()` in document preview actions;
- an `AbortController` assumption and Promise `.finally()` usage in public async flows.

Not found in the audited public JS after the pass:

- `Object.fromEntries`;
- `Promise.allSettled`;
- dynamic `import()`;
- `Array.prototype.at`;
- `ResizeObserver`;
- `IntersectionObserver`.

Applied in `0.6.28a`:

- removed optional chaining and nullish coalescing from public JS loaded by the site;
- replaced `replaceAll()` with regex replacements and document preview `replaceChildren()` with `textContent`;
- added a plain fetch fallback when `AbortController` is unavailable;
- removed public runtime reliance on Promise `.finally()`.
- kept the `structuredClone` call in `config.js` behind a `typeof` feature check with JSON cloning as its old-browser fallback.

Follow-up in `0.6.28c`:

- removed a remaining nullish coalescing expression from `config.js`; Chrome 79 cannot parse it, so `SITE` never initialized and `app.js` could not reach the home fallback render;
- `?debug=legacy` now writes concise console milestones for app boot, config fallback rendering, menu loading, and home JSON/fallback rendering without adding visible production UI.

The source still uses normal project-era ES2015+ syntax such as `const`, arrow functions, template literals, destructuring, spread, and `Object.entries`. That is acceptable for the iOS 12 target, but a much older browser family would need a separate transpiled legacy build rather than another small hand patch.

## CSS audit

Layout and visual CSS uses modern features heavily:

- `min()`, `max()`, and `clamp()`;
- `color-mix()`;
- grid and flex layouts with `gap`;
- `aspect-ratio`;
- `backdrop-filter` and `-webkit-backdrop-filter`;
- sticky header/details behavior and glass/lens layers.

The sweep did not find `dvh`, `svh`, `lvh`, or `:has()` in the current CSS.

Applied in `0.6.28a`:

- `.panel` receives a plain `calc()` width and simple border/background before modern `min()` and glass declarations;
- the about/activity photo column receives a fixed width fallback before `clamp()`, so an unsupported `clamp()` does not let the photo dominate a flex row;
- contact/profile button font sizes and the contact panel width receive simple fallbacks before their modern values;
- the legacy mode reduces blur/lens layers and uses ordinary panel/card backgrounds;
- the legacy mode replaces the missing about-row flex gap with explicit spacing and lets gallery images use natural height.

Checked again in `0.6.28b` after an iOS 15 renderer showed a transparent mobile nav and an unreadable light-theme details button:

- direct `color-mix()` backgrounds are also a contrast risk when an old engine drops the whole background declaration;
- mobile bottom navigation now gets an explicit solid legacy surface plus solid item/active-item surfaces;
- details expand/collapse buttons, header controls, publication filter chips/file actions, download chips/actions, gallery empty state, and disabled contact link state receive targeted old-browser colors instead of relying on glass tokens or direct `color-mix()` surfaces.

## Legacy mode

Every public page runs a small early feature test before CSS is loaded. If the browser cannot report support for the current `color-mix()`, `min()`, and `clamp()` baseline, `<html>` receives:

- `legacy-browser`;
- `no-modern-effects`.

The same mode can be forced for diagnostics with `?debug=legacy`, for example on a local or production public page. It does not show any debug UI to normal visitors. Liquid droplet and video lens JS do not initialize under `no-modern-effects`.

In `0.6.28c`, the same query flag also emits `[legacy-init]` console steps. If `app DOMContentLoaded` appears but `home content rendered from config fallback` does not, check the first script parser/runtime error above it.

## Real iPad Air 1 smoke-test follow-up

The `0.6.28e` pass follows an actual iPad Air 1 / iOS 12 Safari smoke-test:

- bottom navigation looked present but ambiguous because the old-device path could still combine lens state, icons-only fitting, and mask-drawn icons;
- the publications expand/collapse action kept a split glass appearance that was too visually heavy for a service control in the fallback view;
- downloads relied on the title preview trigger and parent row hover/focus styles, which made a touched filename appear to activate the download action while embedded PDF preview remained unreliable.

Applied in `0.6.28e`:

- `no-modern-effects` mobile navigation stays on short visible labels, drops the nav lens surface, and uses plain button backgrounds and active state;
- publication toggles use one solid surface with a quiet arrow and no partial glass segment;
- legacy downloads render file names as non-preview summaries with explicit `Open file` and `Download` actions plus a short note that preview is skipped.

Opening the file in a separate tab/window is the acceptable old-iPad download fallback. Modern browsers keep the inline document preview path.

## iOS PDF preview fallback

The `0.6.28f` pass handles a separate mobile WebKit PDF limitation observed on iPhone and iPad: an embedded PDF preview may look like a one-page document even when the file has more pages.

- downloads keep the inline document lightbox preview on modern desktop browsers;
- PDF entries on iPhone/iPad and PDF entries under `no-modern-effects` avoid the embedded PDF path;
- the iOS PDF row shows a short localized note plus explicit `Open PDF` and `Download` actions;
- legacy downloads keep the plainer `Open file` and `Download` actions added in `0.6.28e`.

This is a narrow PDF-preview workaround. The direct-PDF branch detects classic iOS user agents and touch iPadOS desktop-style agents only for PDF actions; it does not change the general design fallback rules for the rest of the site.

## Real-device checks

Start with these public pages on iPad Air 1 / iOS 12 Safari:

1. `index.html`: header, about photo, activity cards, language/theme controls, and bottom navigation.
2. `activity1.html`: hero photo, publications details/filtering, publication attachment button, gallery, video fallback, and menu.
3. `activity2.html`: hero photo, educational files, preview/download actions, and gallery.
4. `activity3.html`: hero photo, profile link, and gallery.
5. `downloads.html`: grouped downloads, document preview fallback, and download buttons.
6. `contact.html`: contact form, compact social/profile links, and validation messages.

For Chrome 79 or an older Chromium emulator, start with `index.html?debug=legacy` and confirm the home placeholder is replaced before checking `activity1.html`, `downloads.html`, and `contact.html`.

On a Mac, Safari Web Inspector can attach to the old iPad and reveal parser/runtime errors. Without a Mac, compare the normal page and `?debug=legacy` mode, and record the first visible failure: missing menu, unbounded photo, unreadable panel, broken download action, or script error shown by the browser console if available.

## Remaining risks

- The legacy mode is a fallback layer, not a full compatibility build.
- Some decorative modern CSS declarations remain intentionally untouched; unsupported declarations should be skipped in favor of the new simpler fallbacks.
- Hover-only glass treatments on video/contact/download controls remain decorative; the default legacy surfaces are the readability baseline.
- Browsers that cannot parse the remaining ES2015+ JavaScript may still need a dedicated build or a smaller static-navigation fallback in a future package.
- Final confidence for iOS 12 requires real-device verification on the confirmed iPad.
