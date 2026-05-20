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
