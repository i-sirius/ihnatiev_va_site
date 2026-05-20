# Basic SEO Audit

Version: `0.6.26a`

Scope: first static SEO foundation for `https://iva.net.ua` without design, CSS, CMS schema, OAuth, DNS, or content-structure changes.

## Public Pages

| Page | Title | Description |
| --- | --- | --- |
| `/` | `Віталій Ігнатьєв — філософ, викладач, священнослужитель` | Персональний сайт Віталія Ігнатьєва: наукова, освітня та духовна діяльність, публікації, матеріали й контакти. |
| `/activity1.html` | `Наукова активність \| Віталій Ігнатьєв` | Наукова активність Віталія Ігнатьєва: дослідження, публікації, відео й матеріали з філософії та філософії релігії. |
| `/activity2.html` | `Освітня діяльність \| Віталій Ігнатьєв` | Освітня діяльність Віталія Ігнатьєва: викладання філософії, навчальні матеріали й файли для студентів. |
| `/activity3.html` | `Священнослужіння \| Віталій Ігнатьєв` | Священнослужіння Віталія Ігнатьєва: біографічні відомості, служіння, нагороди та фото. |
| `/downloads.html` | `Завантаження \| Віталій Ігнатьєв` | Матеріали для завантаження: монографії, статті та навчальні файли Віталія Ігнатьєва. |
| `/contact.html` | `Контакти \| Віталій Ігнатьєв` | Контакти Віталія Ігнатьєва: форма повідомлення та профільні посилання. |

Each public page now has:

- a static unique title;
- `meta name="description"`;
- `link rel="canonical"`;
- Open Graph title, description, type, URL, and image;
- Twitter/X card metadata.

## Admin Page

`/admin/` is not included in SEO indexing. `admin/index.html` keeps robots protection and uses `noindex,nofollow`.

## Robots And Sitemap

Added `robots.txt`:

- allows public site crawling;
- disallows `/admin/`;
- points to `https://iva.net.ua/sitemap.xml`.

Added `sitemap.xml` with only public pages:

- `/`;
- `/activity1.html`;
- `/activity2.html`;
- `/activity3.html`;
- `/downloads.html`;
- `/contact.html`.

## Structured Data

The home page includes conservative JSON-LD `Person` data:

- name and alternate name;
- short description;
- site URL;
- image;
- `sameAs` links from existing profile/social data.

No broader schema types were added in this package.

## Future Work

- Connect and verify Google Search Console.
- Decide whether SEO texts should move to JSON/CMS after the static foundation proves stable.
- Add analytics only after a privacy/consent decision.
- Consider richer schema for publications, downloads, and PDFs later.
- Add SEO-specific metadata for important downloadable PDFs if needed.

## 0.6.27a Validation

Checked pages:

- `index.html`
- `activity1.html`
- `activity2.html`
- `activity3.html`
- `downloads.html`
- `contact.html`
- `admin/index.html`

Public page status:

- each public page has exactly one `<title>`;
- each public page has `meta name="description"`;
- each public page has an absolute canonical URL on `https://iva.net.ua`;
- each public page has Open Graph title, description, type, URL, and image;
- each public page has Twitter/X card metadata;
- `og:url` matches the page canonical URL;
- `og:image` / `twitter:image` point to existing local files;
- public pages do not include accidental `noindex`.

Admin status:

- `admin/index.html` has `noindex,nofollow`;
- `/admin/` is not present in `sitemap.xml`;
- admin does not expose Open Graph or JSON-LD public metadata.

Robots and sitemap status:

- `robots.txt` exists at the site root;
- `robots.txt` includes `Sitemap: https://iva.net.ua/sitemap.xml`;
- `robots.txt` disallows `/admin/` but does not block the public root;
- `sitemap.xml` exists at the site root;
- `sitemap.xml` includes only the six public URLs;
- `sitemap.xml` does not include `/admin/`, localhost, `127.0.0.1`, GitHub Pages URLs, `http://`, or duplicates;
- `lastmod` is not used yet, so there is no manual update policy to maintain.

Structured data status:

- home page JSON-LD parses as valid JSON;
- JSON-LD uses the conservative `Person` type;
- `url` and `image` point to `https://iva.net.ua`;
- `sameAs` uses existing real profile/social links and excludes disabled links.

Automation added:

- `scripts/check-content.js` and `scripts/check-content.ps1` now check the SEO foundation: public meta tags, canonical and OG URLs, image references, admin `noindex`, robots, sitemap, and home JSON-LD.

Future work:

- verify Google Search Console ownership;
- decide whether to add Google Analytics or another privacy-aware analytics option;
- expand schema.org only where the source data is reliable;
- add SEO treatment for important PDF/download materials;
- prepare richer social preview images if needed.
