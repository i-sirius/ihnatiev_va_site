# Mobile and legacy stabilization

## Purpose

The `0.6.28a-q` cycle stabilized public pages for older browsers and mobile WebKit without turning the site into a legacy-first redesign. It focused on:

- legacy browser compatibility and content bootstrap failures;
- real-device checks on iPad Air 1 with iOS 12 Safari;
- iPhone and iPad PDF fallback behavior;
- mobile header and bottom navigation stability;
- keeping the modern glass design in browsers where it is reliable;
- providing a simpler readable fallback when modern effects are unstable.

The working rules are intentionally narrow:

- modern browsers keep the full visual path;
- legacy browsers get a stable readable fallback;
- iOS PDF preview should not be forced inline when WebKit presents a misleading one-page view;
- touch and no-hover navigation should not rely on desktop hover/lens behavior.

## Confirmed test devices

The stabilization cycle used these confirmed or reported test environments:

- iPad Air 1 / iOS 12 Safari;
- iPhone SE 3 / iOS 18;
- iPhone 13 / iOS 18.7.8;
- Chrome 79 and older Chromium through emulation or a browser service;
- modern desktop Chrome and Edge as the control path.

iPad Air 1 / iOS 12 Safari remains the main real-device legacy reference for this cycle.

## Version-by-version summary

### `0.6.28a` Legacy browser compatibility audit

- Removed parser-level public JS risks such as optional chaining and nullish coalescing from the audited public modules.
- Replaced risky `replaceAll()`, `replaceChildren()`, and public Promise `.finally()` usage.
- Added the feature-detected `legacy-browser` / `no-modern-effects` fallback path.
- Started the legacy browser audit and its manual verification notes.

### `0.6.28b` Harden legacy fallback surfaces

- Strengthened legacy control surfaces that could become too transparent in older Safari/WebKit.
- Added solid or semisolid fallback surfaces for buttons, badges, chips, panels, and mobile nav items.
- Kept the modern glass path intact for browsers that can render it.

### `0.6.28c` Fix legacy Chrome content init

- Removed a remaining `??` parser blocker from `config.js`.
- Restored fallback content rendering in Chrome 79 and older instead of leaving technical placeholder text on the page.
- Added concise `?debug=legacy` console milestones for initialization diagnostics.

### `0.6.28d` Fix mobile contact links grid

- Corrected mobile contact/profile links to a two-column layout at iPhone SE widths.
- Moved the one-column fallback down to genuinely narrow widths.
- Reduced the vertical weight of the contact links list without changing its data source.

### `0.6.28e` Fix real iPad legacy UX

- Simplified iPad Air 1 bottom navigation in legacy mode.
- Reduced the publications expand/collapse action to a stable legacy service button.
- Added explicit legacy download actions instead of depending on inline preview.
- Removed the confusing path where touching a filename visually activated the Download action.

### `0.6.28f` Improve iOS PDF preview fallback

- Stopped presenting iPhone and iPad users with a misleading embedded PDF preview that may show only the first page.
- Added direct `Open PDF` and `Download` actions for the iOS PDF path.
- Left the desktop modern document preview path unchanged.

### `0.6.28g` Improve standalone PDF open UX

- Added an explanatory PDF panel for iOS Home Screen / standalone mode.
- Made standalone PDF actions explicit: Open PDF, Share, Copy link, and Close.
- Kept ordinary iOS Safari direct-open behavior and desktop preview behavior unchanged.

### `0.6.28h` Align header navigation controls

- Started a first header-control alignment pass.
- The follow-up mobile checks showed that the actual imbalance was specific to mobile side controls.

### `0.6.28i` Align mobile floating header controls

- Tried a shared panel for the right language/theme mobile controls.
- The result was heavier than the previous separate controls and reduced the pleasant interaction feel.

### `0.6.28j` Stack mobile brand controls

- Restored right-side language and theme controls as separate round actions.
- Rebuilt the left Home/IVA mobile area as a vertical pair.
- Gave the mobile header a more symmetric side-stack structure.

### `0.6.28k` Add mobile header stack backings

- Added light glass backing rails behind the left and right mobile stacks.
- Preserved separate right-side control interactions.
- Kept legacy fallback surfaces independent from blur and `color-mix()`.

### `0.6.28l` Unify mobile home brand control

- Made the left Home/IVA stack one logical Home/Brand control.
- Left language and theme as two distinct right-side actions.
- Removed the visual suggestion of two separate left click zones.

### `0.6.28m` Polish mobile header and profile links

- Reduced side-stack height and visual weight.
- Placed the three activity1 profile links below the hero photo into a compact three-column mobile row.
- Avoided contact and desktop layout changes while doing so.

### `0.6.28n` Contain mobile header stacks

- Brought both mobile side stacks inside the header band.
- Tightened gap, padding, and chrome reserve with safe-area-aware header containment.
- Kept tap target intent and the balance found in `0.6.28m`.

### `0.6.28o` Fix iPad legacy layout regressions

- Made collapsed downloads subgroup headings visible in legacy mode.
- Moved left Home/IVA behavior back into header context instead of viewport-fixed behavior.
- Kept right language/theme side controls in the same header context.
- Added a visible legacy language fallback label: `UK` / `EN`.

### `0.6.28p` Improve legacy download labels

- Stopped EN downloads from inheriting Ukrainian purchase-action labels.
- Made legacy downloads cards more vertical and readable.
- Enlarged and centered the uppercase `UK` / `EN` language fallback.

### `0.6.28q` Steady mobile nav page transitions

- Prevented touch/no-hover navigation from starting a hover lens move before a static page change.
- Kept hover lens behavior only for devices with real hover.
- Cleared delayed lens motion on tap so the transition does not show a glass lens between menu items.

## Current accepted design rules

### Mobile header

- The left side is one vertical Home/Brand control.
- Home sits above `iva`, and the whole left control links to the home page.
- The right side keeps two separate actions: language and theme.
- The right side should not be merged back into a heavy panel without a new confirmed defect.
- Both side groups are header-bound instead of floating independently over body content.
- Legacy mode uses solid or semisolid fallback surfaces.

### Bottom navigation

- Touch/no-hover devices should not run desktop hover/lens motion during a static page transition.
- The active item must stay visually stable.
- A lens should not be shown in an in-between transition state on tap.
- Do not redesign the bottom navigation again without a new concrete defect.

### Downloads

- Modern desktop can keep document preview.
- iOS, mobile fallback, and legacy paths prefer explicit Open file / Download actions.
- Inline iOS PDF preview is not the primary mobile path.
- A filename must not silently behave like the Download action.
- Legacy download cards stay vertical and readable instead of table-like.

### PDF on iOS

- Ordinary iOS Safari may open a PDF directly.
- iOS Home Screen / standalone mode shows the explanatory PDF panel first.
- The standalone panel offers Open PDF, Share, Copy link, and Close.
- Desktop PDF lightbox behavior is outside this mobile fallback path.

### Language switch

- Modern path uses the flag control.
- Legacy path exposes `UK` / `EN`.
- The language action must never look like an empty button.

## Manual smoke-test checklist

### Modern mobile Safari on iPhone 13

Check:

- `index.html`;
- `activity1.html`;
- `activity2.html`;
- `activity3.html`;
- `downloads.html`;
- `contact.html`.

Confirm:

- side controls stay inside the mobile header band;
- side controls do not cover the title;
- bottom-nav transitions do not show a lens glitch;
- contact social links are not covered by header controls.

### iPad Air 1 / iOS 12

Check:

- `index.html?debug=legacy`;
- `activity1.html?debug=legacy`;
- `downloads.html?debug=legacy`;
- `contact.html?debug=legacy`.

Confirm:

- Home/IVA is not fixed separately to the viewport;
- language/theme controls are not fixed separately from header context;
- downloads headings remain visible;
- the `UK` / `EN` language fallback remains visible;
- downloads cards read clearly;
- Open file and Download are distinct actions.

### iOS Home Screen / standalone

Check `downloads.html` and confirm:

- PDF Open action shows the standalone explanation panel;
- Open PDF, Share, Copy link, and Close are usable;
- the user is not dropped into a PDF without context.

### Desktop Chrome and Edge

Confirm:

- desktop PDF preview still works;
- desktop header behavior is unchanged;
- hover effects remain available;
- desktop navigation has no mobile fallback regression.

## Known limitations and accepted trade-offs

- Legacy mode does not attempt to reproduce the full modern glass design.
- iOS embedded PDF preview can be limited, so direct Open PDF fallback is accepted.
- Older Safari and iOS 12 receive simpler visual surfaces.
- Chrome 79 and older are supported at the level of successful initialization and readable content, not full modern visual parity.
- Browsers older than the current hand-patched target would need a separate transpiled legacy build instead of more scattered syntax patches.

## Do not change without reason

Do not touch these areas again without a new confirmed screenshot, reproducible bug, or explicit design decision:

- mobile header layout;
- side-stack positioning;
- bottom-nav lens behavior;
- iOS PDF fallback;
- legacy downloads layout;
- the `UK` / `EN` language fallback.

These surfaces passed many small corrective passes and are easy to destabilize by well-intended polishing.

## Files and areas touched during the cycle

The cycle most often touched:

- `css/header.css`;
- `css/responsive.css`;
- `css/content.css`;
- `css/contact.css`;
- `css/downloads.css`;
- `css/document-lightbox.css`;
- `js/mobile-navigation.js`;
- `js/downloads-renderer.js`;
- `js/document-lightbox.js`;
- `js/header-ui.js`;
- `js/page-content.js`;
- `config.js`;
- `sw.js`;
- `CHANGELOG.md`;
- `docs/legacy-browser-compatibility-audit.md`.
