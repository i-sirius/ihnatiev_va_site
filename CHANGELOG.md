# Changelog

## 0.6.26f

**Hotfix site-relative шляхів вкладень праць.**

- Шлях вкладення у `publications.json` переведено з `/files/publications/...` на site-relative `files/publications/...`.
- `public_folder` для Decap-вкладень праць синхронізовано з цією політикою, щоб наступні upload-и записували шлях без початкового `/`.
- `check-content` тепер приймає тільки `files/publications/...` для файлів праць і продовжує ловити відсутні файли, зовнішні URL, `admin/` та дубльовані `files/.../files/...`.
- Оновлено build-версію до `0.6.26f` і кеш service worker до `v0.6.26f-r1`.

## 0.6.26e

**Hotfix upload-шляху файлів наукових праць.**

- Виправлено `media_folder` для вкладень праць у Decap: файли з `publications.json` тепер завантажуються в `files/publications/`, а не в помилкову вкладену папку `files/content/files/publications/`.
- PDF, доданий через CMS для праці про філософську антропологію, перенесено у фактичну папку, на яку вже посилається JSON: `/files/publications/`.
- `check-content` додатково ловить помилковий шлях `files/content/files/publications`, щоб повторний upload-regression не пройшов непоміченим.
- Оновлено build-версію до `0.6.26e` і кеш service worker до `v0.6.26e-r1`.

## 0.6.26d

**Опціональні файли для наукових праць.**

- До запису наукової праці в Decap CMS додано необов'язкове поле `file` для локального PDF/DOC/DOCX у папці `/files/publications/`.
- Рендер списку праць показує кнопку `Завантажити файл` / `Download file` тільки для записів із прикріпленим файлом; старі записи без файла лишаються без змін.
- `check-content` перевіряє вкладення праць: локальний root-relative шлях, відсутність `admin/` і дубльованих `files/.../files/...`, дозволене розширення й наявність файла.
- Оновлено інструкцію редактора щодо додавання файлів до праць і права на публікацію.
- Оновлено build-версію до `0.6.26d` і кеш service worker до `v0.6.26d-r1`.

## 0.6.26c

**Hotfix Decap save для списку праць.**

- У CMS-колекції наукових праць поле року переведено з необов'язкового number widget на string із перевіркою `порожньо або 4 цифри`, щоб Decap не падав на записах із невідомим роком.
- Поточну структуру `publications.json` не змінено; сайт і `check-content` надалі приймають числові, текстові або порожні роки.
- Для `/admin/` додано явний favicon link, щоб прибрати зайвий `favicon.ico 404` із Console під час діагностики.
- Оновлено build-версію до `0.6.26c` і кеш service worker до `v0.6.26c-r1`.

## 0.6.26b

**Hotfix Decap media paths і save regression.**

- CMS-managed media/file значення у JSON переведено на root-relative шляхи `/files/...`, щоб Decap preview не шукав їх відносно `/admin/`.
- `public_folder` для Decap media/file колекцій зроблено root-relative, а `media_folder` лишено repo-relative, щоб Decap не складав дубльовані шляхи на кшталт `files/media/activity1/files/media/activity1`.
- `check-content` посилено перевірками проти `admin/`-шляхів, дубльованих media path і не root-relative CMS media/file значень.
- Оновлено build-версію до `0.6.26b` і кеш service worker до `v0.6.26b-r1`.

## 0.6.26a

**Базовий SEO foundation.**

- Публічні HTML-сторінки отримали унікальні статичні title/description, canonical URL, Open Graph і Twitter/X card meta-теги.
- Для головної сторінки додано обережний JSON-LD `Person` із наявними profile/social посиланнями без надмірних schema-полів.
- Додано `robots.txt`, `sitemap.xml` лише з публічними сторінками та `docs/seo-audit.md`; `/admin/` лишено поза індексацією через `noindex,nofollow`.
- Оновлено build-версію до `0.6.26a` і кеш service worker до `v0.6.26a-r1`.

## 0.6.25d

**Українські підказки для Decap file/image полів.**

- Для галерей, освітніх файлів і матеріалів завантаження додано українські пояснення до file/image widgets із розшифруванням англомовних кнопок Decap.
- У локальних file/image полях вимкнено `Replace with URL` через штатний `choose_url: false`, щоб редактор обирав файли з медіатеки й не ламав локальні шляхи.
- Додано `docs/admin-editor-guide.md` з короткою інструкцією для редактора: вхід, draft, publish, заміна/видалення файлів і службові поля, які не варто змінювати без потреби.
- Оновлено build-версію до `0.6.25d` і кеш service worker до `v0.6.25d-r1`.

## 0.6.25c

**Audit і UX-підказки для Decap CMS.**

- Переглянуто CMS-колекції з точки зору редактора й додано короткі `description`/`hint` для важливих текстових, URL, alt і службових полів.
- Довгі CMS-списки зроблено згорнутими за замовчуванням із читабельними `summary`, щоб редактору було легше орієнтуватися.
- Для profile/social URL додано pattern-підказку, а режим кнопки запиту книги обмежено select-значенням `contact` без зміни JSON-структури.
- Оновлено build-версію до `0.6.25c` і кеш service worker до `v0.6.25c-r1`.

## 0.6.25b

**Виніс social/profile links у CMS JSON.**

- Додано `files/content/social-links.json` як канонічний JSON для YouTube, Facebook, Telegram, Web of Science, ORCID і Google Scholar.
- Шапка, контакти й профільні посилання наукового розділу тепер можуть оновлюватися з JSON, зберігаючи fallback зі старих списків у `config.js`.
- Додано CMS-колекцію `Профільні посилання` та перевірку структури social-links у JS/PowerShell content check.
- Оновлено build-версію до `0.6.25b` і кеш service worker до `v0.6.25b-r1`.

## 0.6.25a

**Audit залишкового контенту `config.js`.**

- Додано `docs/config-content-audit.md` з картою секцій `config.js`, їхнім CMS-статусом і ризиками подальшого винесення.
- Розділено залишки на вже CMS-ready, безпечні наступні кандидати, тимчасові fallback-и та runtime/system config.
- Наступним найменш ризиковим пакетом рекомендовано винесення social/profile links у JSON/CMS без зміни OAuth, DNS, дизайну чи структури наявних колекцій.
- Оновлено build-версію до `0.6.25a` і кеш service worker до `v0.6.25a-r1`.

## 0.6.24g

**Hotfix розділювача кнопки details.**

- Лівий сегмент стрілки зроблено сталої вузької ширини, щоб divider не проходив крізь текст `Розгорнути`/`Згорнути`.
- Напис тепер центрується в основній текстовій частині кнопки, відділеній від іконкового відсіку.
- Оновлено build-версію до `0.6.24g` і кеш service worker до `v0.6.24g-r1`.

## 0.6.24f

**Сегментована кнопка розгортання details.**

- Стрілку `Розгорнути`/`Згорнути` винесено в окрему ліву третину кнопки замість круглої іконки.
- Сегмент стрілки змінює відтінок у відкритому стані, а текст лишається центрованим по всій кнопці.
- Оновлено build-версію до `0.6.24f` і кеш service worker до `v0.6.24f-r1`.

## 0.6.24e

**Стилізована кнопка розгортання details.**

- Кнопку `Розгорнути`/`Згорнути` перебудовано на трьохколонкову сітку, щоб текст завжди центрувався відносно всієї кнопки.
- Літерні `v`/`^` замінено на окрему круглу chevron-іконку зі стабільним місцем у кнопці.
- Оновлено build-версію до `0.6.24e` і кеш service worker до `v0.6.24e-r1`.

## 0.6.24d

**Hotfix BOM після першого Decap publish.**

- Після реального Decap CMS publish прибрано UTF-8 BOM із JSON-файлів, які зламали GitHub Action `Content check`.
- `check-content` тепер перед `JSON.parse()` прибирає тільки початковий `\uFEFF`, але окремо падає з явною помилкою, якщо JSON містить BOM.
- PowerShell-перевірку синхронізовано з JS-перевіркою, щоб локальний Windows-check ловив той самий випадок.
- Оновлено build-версію до `0.6.24d` і кеш service worker до `v0.6.24d-r1`.

## 0.6.24c

**Повернення OAuth proxy на домен `decap.iva.net.ua`.**

- Decap CMS повернено з прямого Workers endpoint на custom domain `https://decap.iva.net.ua` після рішення перенести NS `iva.net.ua` на Cloudflare.
- `check-content` знову перевіряє доменний OAuth proxy разом із `auth_endpoint: /auth`.
- Оновлено OAuth-документацію, admin smoke-test протокол і шаблон звіту під доменний endpoint.
- Оновлено build-версію до `0.6.24c` і кеш service worker до `v0.6.24c-r1`.

## 0.6.24b

**Hotfix OAuth proxy для адмін-панелі.**

- Decap CMS переведено з доменного proxy `https://decap.iva.net.ua` на робочий Cloudflare Workers endpoint `https://decap-auth.pollux-twin.workers.dev` через проблему з nameserver-ами домену.
- `check-content` тепер перевіряє активний Workers OAuth proxy і зберігає `auth_endpoint: /auth`.
- Оновлено адмін-чеклист, smoke-test report і OAuth-документацію під новий proxy endpoint.
- Оновлено build-версію до `0.6.24b` і кеш service worker до `v0.6.24b-r1`.

## 0.6.24a

**Admin end-to-end protocol і сильніші CMS-перевірки.**

- Оновлено адмін-чеклист до покрокового local/prod smoke-test протоколу з preflight, тестовими CMS-правками й post-check.
- Додано `docs/admin-smoke-test-report.md` як шаблон звіту для ручної перевірки Decap CMS/OAuth.
- `check-content` тепер перевіряє очікувані CMS-колекції, file-backed JSON, media/public folders і ключові поля/опції колекції наукових праць.
- Оновлено build-версію до `0.6.24a` і кеш service worker до `v0.6.24a-r1`.

## 0.6.23l

**Hotfix фільтрів списку праць на середній ширині.**

- Для проміжних desktop/tablet ширин блок фільтрів наукових праць переходить у 2+1 grid до мобільного breakpoint.
- Фільтр типу більше не впирається в правий край плитки перед переходом у вузький режим.
- Оновлено build-версію до `0.6.23l` і кеш service worker до `v0.6.23l-r1`.

## 0.6.23k

**Клікабельні бейджі праць і щільніший старт запису.**

- У списку наукових праць текст запису тепер починається одразу після порядкового номера без порожнього першого рядка.
- Рік і тип публікації перенесено в правий верхній кут плитки як стабільні meta-бейджі.
- Бейджі стали клікабельними: клік по року показує всі праці за цей рік, клік по типу — всі праці цього типу.
- Оновлено build-версію до `0.6.23k` і кеш service worker до `v0.6.23k-r1`.

## 0.6.23j

**Стабільні meta-бейджі у списку праць.**

- Meta-колонку списку наукових праць зроблено сталої ширини, щоб текст усіх записів починався з однієї вертикалі.
- Рік і тип публікації тепер займають повну ширину meta-колонки й центруються всередині бейджів.
- Довгі типи на кшталт `Навчальні матеріали` можуть переноситись у два рядки без розширення колонки.
- Оновлено build-версію до `0.6.23j` і кеш service worker до `v0.6.23j-r1`.

## 0.6.23i

**Центрування full-шапки і компактніший список праць.**

- У full-header стані з home-in-brand заголовок сторінки тепер центрується реальним `auto`-відступом, а не лишається в ліво вирівняному обмеженому блоці.
- У списку наукових праць рік і тип публікації складено вертикально в meta-колонку, щоб основний текст мав більше ширини.
- Трохи зменшено meta-badge-и праць, зберігаючи читабельність і фільтрацію без зміни структури JSON.
- Оновлено build-версію до `0.6.23i` і кеш service worker до `v0.6.23i-r1`.

## 0.6.23h

**Hotfix compact-шапки і publications-пошуку.**

- Скорочено український placeholder пошуку в списку праць, щоб він повністю вміщувався в полі.
- На широких і ультрашироких compact-ширинах language/theme controls переведено в горизонтальний ряд і відцентровано по висоті шапки.
- Compact brand/home-кнопка в темній темі отримала прозоріший glass-стиль замість сірого фону.
- Оновлено build-версію до `0.6.23h` і кеш service worker до `v0.6.23h-r1`.

## 0.6.23g

**Hotfix років у списку праць.**

- Для двох записів Synesis виправлено рік із помилкового `1984` на фактичний `2024`; `1984` був частиною ISSN `1984-6754`, а не роком публікації.
- Ці записи віднесено до типу `Стаття`, щоб вони коректно фільтрувались у списку наукових праць.
- `check-content` тепер ловить випадок, коли ISSN `1984-6754` помилково потрапляє в поле року.
- Оновлено build-версію до `0.6.23g` і кеш service worker до `v0.6.23g-r1`.

## 0.6.23f

**Структурування списку наукових праць.**

- `publications.json` розширено метаданими `year` і `type` для кожної з 85 праць, зберігаючи сумісність зі старим рядковим форматом.
- У розгорнутому списку праць додано пошук, фільтр за роком, фільтр за типом і візуальні meta-badge для швидшого перегляду довгого списку.
- CMS-колекцію `Наукові праці` оновлено під редагування тексту, року й типу публікації, а `check-content` перевіряє нову структуру.
- Оновлено build-версію до `0.6.23f` і кеш service worker до `v0.6.23f-r1`.

## 0.6.23e

**Hotfix видимості CTA у відеокартках.**

- Video-lens у блоці відео тепер скидається після scroll і зміни висоти сторінки через розгортання/згортання details.
- Текст і YouTube-іконку CTA у відеокартках переведено в стабільний composited-шар, щоб підпис `ДИВИТИСЬ` не зникав до першого hover після згортання списку праць.
- Оновлено build-версію до `0.6.23e` і кеш service worker до `v0.6.23e-r1`.

## 0.6.23d

**Виніс списку наукових праць.**

- Додано `files/content/publications.json` зі summary/description і 85 пунктами списку наукових праць.
- Сторінка наукової активності рендерить fallback зі старого `config.js`, а потім оновлює тільки publications-details із JSON без повторного запуску галереї чи YouTube.
- Додано CMS-колекцію `Наукові праці` для редагування заголовка, опису й пунктів списку.
- `check-content` тепер перевіряє структуру `publications.json`; файл додано в service worker precache і CMS checklist.
- Оновлено build-версію до `0.6.23d` і кеш service worker до `v0.6.23d-r1`.

## 0.6.23c

**Виніс простих текстів Downloads/Contact.**

- Додано `files/content/pages.json` для заголовків, intro й базових label-ів сторінок `Завантаження` та `Контакти` українською й англійською.
- Downloads і Contact рендерять fallback з `config.js`, а потім оновлюють сторінкові тексти з JSON без перенесення складних validation-повідомлень.
- Contact form тепер може брати phone/subject labels і Formspree subject із сторінкового JSON.
- Додано CMS-колекцію `Сторінки` для редагування цих простих текстів.
- `check-content` тепер перевіряє структуру `pages.json`; файл додано в service worker precache і CMS checklist.
- Оновлено build-версію до `0.6.23c` і кеш service worker до `v0.6.23c-r1`.

## 0.6.23b

**Виніс простих текстів розділів діяльності.**

- Додано `files/content/activities.json` з назвами, короткими описами карток і hero alt-текстами для трьох розділів українською й англійською.
- Activity-навігація, home-картки й заголовок поточної activity-сторінки оновлюються з JSON поверх fallback-даних із `config.js`.
- Додано CMS-колекцію `Розділи діяльності` для редагування цих простих текстів.
- `check-content` тепер перевіряє структуру `activities.json`; файл додано в service worker precache і CMS checklist.
- Оновлено build-версію до `0.6.23b` і кеш service worker до `v0.6.23b-r1`.

## 0.6.23a

**Перший виніс home-контенту з `config.js`.**

- Додано `files/content/home.json` з home/about текстами українською й англійською.
- Головна сторінка рендерить fallback з `config.js`, а потім підтягує JSON-контент без ламання старої схеми.
- Додано CMS-колекцію для редагування заголовків, alt-тексту фото й абзаців блоку про автора.
- `check-content` тепер перевіряє структуру `home.json`; файл додано в service worker precache і CMS checklist.
- Оновлено build-версію до `0.6.23a` і кеш service worker до `v0.6.23a-r1`.

## 0.6.22b

**Контроль Decap CMS-конфіга.**

- `check-content` тепер перевіряє базові налаштування `admin/config.yml`: GitHub backend, repo, OAuth proxy, `local_backend`, `publish_mode` і локальні CMS-шляхи.
- Додано локальний PowerShell-аналог цієї перевірки, щоб CI і Windows-перевірка ловили однакові помилки.
- Додано `files/media/uploads/.gitkeep`, щоб загальний CMS upload folder існував у репозиторії.
- Додано чеклист `docs/admin-test-checklist.md` для local backend і продакшн OAuth-перевірки.
- Оновлено build-версію до `0.6.22b` і кеш service worker до `v0.6.22b-r1`.

## 0.6.22a

**Баланс home-brand і правих перемикачів.**

- У великому некомпактному `is-home-in-brand` стані ліва brand/home-кнопка стала вищою, а логотип у ній помітно більшим.
- Хатинку і логотип залишено вгорі, підпис лишився окремим нижнім рядком.
- Праву панель перемикачів у цьому стані повернуто до вертикального центру шапки на desktop/tablet ширинах.
- Оновлено build-версію до `0.6.22a` і кеш service worker до `v0.6.22a-r1`.

## 0.6.22

**Стабільний home-режим brand-кнопки.**

- Home-in-brand режим винесено в окремий стан шапки `is-home-in-brand`, який працює на всіх сторінках і локалях, а не лише на home-сторінці.
- Після переходу `Головна` в brand-кнопку пункт не повертається в nav при зміні активного розділу, доки не зміниться ширина екрана.
- Brand/home-кнопку перебудовано вертикально: зверху хатинка з логотипом, нижче локалізований підпис `Головна сторінка` / `Home page`.
- Оновлено build-версію до `0.6.22` і кеш service worker до `v0.6.22-r1`.

## 0.6.21z

**Явний home-label у split-шапці.**

- У `is-title-split` full-header brand/home-кнопка отримала видимий підпис `Головна`, а не лише іконку будинку.
- Підпис береться з локалізованого меню й показується тільки у некомпактній верхній шапці.
- Home-кнопку трохи розширено й збалансовано за логотипом, підписом та іконкою, щоб вона читалась як окрема дія.
- Оновлено build-версію до `0.6.21z` і кеш service worker до `v0.6.21z-r1`.

## 0.6.21y

**Home-кнопка для compact-controls стану.**

- У `is-title-split` full-header пункт `Головна` прибрано з nav-рядка й перенесено в ліву brand/home-кнопку.
- Ліва home-кнопка в цьому стані центрується по висоті шапки та отримує помітнішу іконку будинку, ніж у мобільній версії.
- Широке дворядкове меню після перенесення `Головна` перебудовано на 3+2 пункти без порожнього місця під home.
- Оновлено build-версію до `0.6.21y` і кеш service worker до `v0.6.21y-r1`.

## 0.6.21x

**Системні responsive-стани full-шапки.**

- Перемикачі мови й теми у верхній шапці переведено на вертикальну розкладку замість горизонтальних моментів.
- Cramped-режим home-шапки тепер вмикається, якщо не влазить не лише заголовок, а й повний рядок меню.
- Для широкого cramped-стану додано акуратне дворядкове меню; для standard-стану заголовок зроблено ближчим до вузького/mobile ритму.
- Оновлено build-версію до `0.6.21x` і кеш service worker до `v0.6.21x-r1`.

## 0.6.21w

**Автоматичний перенос home-підзаголовка.**

- Додано вимірювання home-заголовка: якщо `Віталій Ігнатьєв - філософ, викладач, священнослужитель` не вміщається в один рядок, шапка автоматично переходить у дворядковий title/subtitle режим.
- Дворядковий режим більше не прив'язаний тільки до `901–1180px`, а працює на всіх desktop/tablet ширинах, де повний рядок реально не влазить.
- Після resize/scroll і зміни локалі layout заголовка повторно синхронізується перед оновленням висоти шапки.
- Оновлено build-версію до `0.6.21w` і кеш service worker до `v0.6.21w-r1`.

## 0.6.21v

**Ущільнення середньої full-шапки.**

- У full-header на `901–1180px` головний заголовок розділено на ім'я та опис у два рядки; дефіс між ними приховано.
- Зменшено social icons і spacing у соцрядку для компактнішої середньої шапки.
- Дворядкове меню ущільнено: зменшено розмір пунктів і зближено `Завантаження`/`Контакти` в центрі другого рядка.
- Оновлено build-версію до `0.6.21v` і кеш service worker до `v0.6.21v-r1`.

## 0.6.21u

**Жорстке кругле clipping для compact-перемикачів.**

- Для compact language/theme controls додано `overflow: hidden`, `clip-path: circle(...)` і `background-clip`, щоб glass/backdrop-шари не малювали квадратні куточки.
- У compact-режимі сам `button.theme-toggle` примусово лишається прозорим у normal/hover/focus станах.
- Оновлено build-версію до `0.6.21u` і кеш service worker до `v0.6.21u-r1`.

## 0.6.21t

**Hotfix залишкової glass-підкладки compact controls.**

- Вимкнено `::before/::after` droplet-шари для `.site-header-controls` у compact-header.
- Прибрано залишкові куточки спільної підкладки між language і theme controls.
- Оновлено build-версію до `0.6.21t` і кеш service worker до `v0.6.21t-r1`.

## 0.6.21s

**Дворядкове середнє меню і круглі compact-перемикачі.**

- Для full-header на `901–1180px` меню переведено в явний дворядковий grid до того, як `Контакти` починають переноситись самостійно.
- `Головна` у цьому режимі прибрана з nav-рядків і доступна через ліву brand/home-кнопку з іконкою будинку.
- Compact-перемикачі більше не мають спільної прямокутної підкладки; мова і тема малюються як окремі круглі controls одного масштабу.
- Оновлено build-версію до `0.6.21s` і кеш service worker до `v0.6.21s-r1`.

## 0.6.21r

**Стабілізація compact-перемикачів і YouTube-типографіки.**

- Вирівняно масштаб compact-перемикачів у шапці: вертикальний standard-стан тепер використовує 34px control-size і трохи вищу підкладку, а не 44px з full-режиму.
- Прибрано видиму квадратну підкладку theme-toggle у compact-header; іконка теми центрується всередині спільної скляної підкладки.
- Для відеокарток застосовано YouTube-like stack `YouTube Sans / Roboto / Arial` без зовнішніх font-залежностей.
- Оновлено build-версію до `0.6.21r` і кеш service worker до `v0.6.21r-r1`.

## 0.6.21q

**Перестановка compact-станів перемикачів шапки.**

- У compact-header поміняно місцями wide і standard розкладки блоку перемикачів.
- Для `1181–1360px` compact controls тепер лишаються горизонтальними компактними кружечками.
- Для `901–1180px` compact controls переходять у вертикальну колонку, щоб не конкурувати з меню.
- Оновлено build-версію до `0.6.21q` і кеш service worker до `v0.6.21q-r1`.

## 0.6.21p

**Underlap blur для full-шапки перед згортанням.**

- Додано scroll-progress для full-шапки до compact-порогу.
- Коли контент починає підлізати під прозору шапку, blur, матовість, border і тінь поступово посилюються.
- Це має прибрати ситуацію, де назва розділу читається крізь меню перед згортанням шапки.
- Оновлено build-версію до `0.6.21p` і кеш service worker до `v0.6.21p-r1`.

## 0.6.21o

**Плавніший перехід шапки між full і compact.**

- Додано короткі проміжні стани `is-expanding-header` і `is-collapsing-header` для переходу шапки.
- Під час розгортання з compact у full заголовок сторінки тимчасово прозорий, щоб не накладатися на меню й соцкнопки.
- Після завершення transition повторно синхронізується `--site-header-offset`.
- Оновлено build-версію до `0.6.21o` і кеш service worker до `v0.6.21o-r1`.

## 0.6.21n

**Уніфікація типографіки відеокарток.**

- Відеокартки переведено на єдиний UI-шрифт Manrope, щоб заголовок/дата, CTA і кількість переглядів не виглядали різними шрифтами.
- Для YouTube CTA зменшено letter-spacing і прибрано scale-стрибок тексту на hover/focus.
- Кількість переглядів зроблено легшою за вагою, але в тому самому шрифтовому ритмі.
- Оновлено build-версію до `0.6.21n` і кеш service worker до `v0.6.21n-r1`.

## 0.6.21m

**Cache hygiene для локальних шрифтів.**

- Прибрано font-файли й OFL license txt з `APP_SHELL`, щоб service worker install не тягнув майже мегабайтний Literata одразу.
- Шрифти залишаються кешованими через runtime cache pattern для `ttf/woff/woff2/otf`, коли браузер реально їх запитує.
- Критичний shell сайту залишено у precache без зміни офлайн-логіки сторінок.
- Оновлено build-версію до `0.6.21m` і кеш service worker до `v0.6.21m-r1`.

## 0.6.21l

**Mobile-pass після візуального полегшення.**

- На мобільних ширинах панелі зроблено компактнішими: менше padding, м'якший radius і спокійніші заголовки.
- Прибрано зайвий правий відступ у розгорнутих текстових блоках about/details.
- Contact і Downloads отримали компактніші mobile spacing-и після desktop-полірування.
- Оновлено build-версію до `0.6.21l` і кеш service worker до `v0.6.21l-r1`.

## 0.6.21k

**Полегшення active-станів навігації.**

- Трохи зменшено letter-spacing у desktop-меню після повернення Manrope для UI.
- Полегшено активну пігулку desktop-меню: менше блиску, золотої підсвітки й тіні.
- Зменшено тінь compact-header і пом'якшено mobile-nav background/lens.
- Оновлено build-версію до `0.6.21k` і кеш service worker до `v0.6.21k-r1`.

## 0.6.21j

**Легше оформлення завантажень.**

- Зменшено візуальну вагу download-row: трохи менші відступи, радіуси, тіні й hover-підсвітка.
- Пом'якшено монографічні та article-групи: легші рамки, фони й spacing між секціями.
- Акордеони статей зроблено компактнішими, щоб список читався спокійніше.
- Оновлено build-версію до `0.6.21j` і кеш service worker до `v0.6.21j-r1`.

## 0.6.21i

**Легше візуальне налаштування контактної форми.**

- Зроблено контактний блок трохи повітрянішим: збільшено внутрішні відступи й пом'якшено social panel.
- Службові підказки полів зменшено й зроблено спокійнішими, щоб форма не виглядала як технічна анкета.
- Вступ до форми, divider, `/` між Email і Телефон та submit-кнопку зроблено менш важкими.
- Оновлено build-версію до `0.6.21i` і кеш service worker до `v0.6.21i-r1`.

## 0.6.21h

**Легка гібридна типографіка.**

- Повернуто Manrope як основний `body/UI` шрифт для меню, форм, кнопок, downloads і службових підписів.
- Додано `--font-content` на Literata для біографічного й описового тексту, де засічки додають академічний характер.
- `--font-display` залишено на класичному системному stack `Constantia / Palatino / Georgia` для заголовків.
- Contact intro залишено UI-шрифтом, щоб форма виглядала легше й не перевантажувалась засічками.
- Оновлено build-версію до `0.6.21h` і кеш service worker до `v0.6.21h-r1`.

## 0.6.21g

**Мікро UX-правка контактної форми.**

- Вирівняно `/` між Email і Телефон по центру висоти input-рядка, а не всього label-блоку.
- Оновлено build-версію до `0.6.21g` і кеш service worker до `v0.6.21g-r1`.

## 0.6.21f

**Підсилення заголовків і спокійніші підказки контактної форми.**

- Трохи піднято вагу display-заголовків і головного заголовка шапки після повернення класичного serif stack.
- Контактна форма більше не показує всі службові підказки одразу: required/validation notes з'являються після взаємодії з полем.
- Позитивні стани заповнення залишено видимими після коректного вводу.
- Оновлено build-версію до `0.6.21f` і кеш service worker до `v0.6.21f-r1`.

## 0.6.21e

**Serif body + класичний display-stack для заголовків.**

- Залишено Literata основним шрифтом для body, меню, UI, форм і описового тексту.
- Для `--font-display` повернуто старий системний stack `Constantia / Palatino / Georgia`, який краще виглядав у заголовках шапки.
- Оновлено build-версію до `0.6.21e` і кеш service worker до `v0.6.21e-r1`.

## 0.6.21d

**Єдиний serif-напрям типографіки.**

- Literata зроблено основним шрифтом для body, UI, меню, форм, описів і заголовків.
- Прибрано активне розділення між Manrope для інтерфейсу і Literata для контенту, щоб сайт виглядав цілісніше.
- Manrope залишено локально підключеним як запасний шрифт для можливого повернення до sans-serif UI.
- Оновлено build-версію до `0.6.21d` і кеш service worker до `v0.6.21d-r1`.

## 0.6.21c

**Уніфікація типографіки після пробного пакета.**

- Залишено Manrope основним шрифтом для меню, UI, форм, описів і звичайного тексту.
- Literata залишено як акцент для великих заголовків, щоб сайт не змішував кілька голосів у контенті.
- Прибрано display-шрифт з описових блоків, карток діяльності, contact intro і panel paragraphs.
- Прибрано третій condensed font stack з мобільного меню; condensed labels тепер теж використовують Manrope.
- Оновлено build-версію до `0.6.21c` і кеш service worker до `v0.6.21c-r1`.

## 0.6.21b

**Тонке налаштування типографіки після пробного пакета.**

- Полегшено заголовок шапки: зменшено вагу, розмір і letter-spacing, щоб H1 не домінував над сторінкою.
- Зменшено letter-spacing у desktop-меню та мобільному заголовку для спокійнішого читання.
- Downloads зроблено менш важкими: довгі назви файлів повернуто до UI-шрифту Manrope, а spacing у групах зменшено.
- Довгим описовим блокам додано більше line-height.
- Оновлено build-версію до `0.6.21b` і кеш service worker до `v0.6.21b-r1`.

## 0.6.21a

**Пробний типографічний пакет Literata + Manrope.**

- Додано локальні шрифти `Literata` і `Manrope` у `files/fonts/` разом з OFL license файлами.
- Підключено шрифти через `@font-face` без зовнішнього CDN.
- Додано змінну `--font-ui`; body/UI/меню переведено на Manrope, заголовки й описові блоки — на Literata.
- Додано font-файли в APP_SHELL service worker і runtime cache pattern.
- Оновлено build-версію до `0.6.21a` і кеш service worker до `v0.6.21a-r1`.

## 0.6.20m

**UX-hotfix скляної лінзи меню після CSS-рефакторингу.**

- Додано instant-появу для першого hover desktop-дроплета, щоб скляна лінза не летіла з дефолтної позиції.
- Для mobile-nav перший вхід курсора в меню і повернення до active-пункту тепер оновлюють лінзу без горизонтального перельоту.
- Плавний рух між пунктами всередині меню залишено.
- Оновлено build-версію до `0.6.20m` і кеш service worker до `v0.6.20m-r1`.

## 0.6.20l

**Дванадцятий безпечний крок розділення `css/styles.css`: мобільний шар.**

- Винесено залишкові mobile/responsive override-и у `css/responsive.css`.
- `css/styles.css` залишено CSS-агрегатором з послідовністю `@import`.
- `responsive.css` підключається останнім, щоб зберегти фінальний каскад мобільних правил.
- Додано новий CSS-файл в APP_SHELL service worker.
- Оновлено build-версію до `0.6.20l` і кеш service worker до `v0.6.20l-r1`.

## 0.6.20k

**Одинадцятий безпечний крок розділення `css/styles.css` і помітніша типографіка.**

- Винесено desktop/mobile header, brand, language/theme controls, header socials і mobile nav у `css/header.css`.
- `css/styles.css` підключає `header.css` після effects styles; контентні mobile-правила залишено на місці.
- Посилено display font stack до Constantia/Palatino/Georgia і трохи піднято вагу заголовка шапки.
- Додано новий CSS-файл в APP_SHELL service worker.
- Оновлено build-версію до `0.6.20k` і кеш service worker до `v0.6.20k-r1`.

## 0.6.20j

**Десятий безпечний крок розділення `css/styles.css` і старт стилізованої типографіки.**

- Винесено shared droplet/lens і action-glass hover/focus правила у `css/effects.css`.
- `css/styles.css` підключає `effects.css` після contact styles; header/layout блоки залишено на місці.
- Додано CSS-змінні `--font-body` і `--font-display`.
- Для `h1`/`h2` увімкнено системний display-шрифт Georgia/serif без зовнішніх CDN-залежностей.
- Додано новий CSS-файл в APP_SHELL service worker.
- Оновлено build-версію до `0.6.20j` і кеш service worker до `v0.6.20j-r1`.

## 0.6.20i

**Дев'ятий безпечний крок розділення `css/styles.css`.**

- Винесено contact panel, contact socials, social buttons і contact form поля у `css/contact.css`.
- Винесено contact mobile-адаптацію panel/socials/form у `css/contact.css`.
- `css/styles.css` підключає `contact.css` після downloads styles; shared droplet/lens і action-glass правила залишено на місці для окремого кроку.
- Додано новий CSS-файл в APP_SHELL service worker.
- Оновлено build-версію до `0.6.20i` і кеш service worker до `v0.6.20i-r1`.

## 0.6.20h

**Восьмий безпечний крок розділення `css/styles.css`.**

- Винесено downloads list/row/actions, file icons, grouped downloads і subgroup accordion у `css/downloads.css`.
- Винесено мобільну адаптацію download-row/actions у `css/downloads.css`.
- `css/styles.css` підключає `downloads.css` після document lightbox styles; спільні action-glass правила для кількох секцій залишено на місці.
- Додано новий CSS-файл в APP_SHELL service worker.
- Оновлено build-версію до `0.6.20h` і кеш service worker до `v0.6.20h-r1`.

## 0.6.20g

**Сьомий безпечний крок розділення `css/styles.css` і точкова UX-правка меню.**

- Винесено document lightbox, toolbar/actions, iframe/fallback і mobile-адаптацію у `css/document-lightbox.css`.
- `css/styles.css` підключає `document-lightbox.css` після video styles; спільні glass-hover правила поки залишено на місці.
- Виправлено поведінку скляної лінзи меню: напрямок руху тепер вмикається тільки коли лінза реально переходить між пунктами, без “вильоту” при першому наведенні зверху або знизу.
- Додано новий CSS-файл в APP_SHELL service worker.
- Оновлено build-версію до `0.6.20g` і кеш service worker до `v0.6.20g-r1`.

## 0.6.20f

**Шостий безпечний крок розділення `css/styles.css`.**

- Винесено video gallery, video lens, video cards, fallback/loading стани й video keyframes у `css/video.css`.
- `css/styles.css` підключає `video.css` після gallery styles.
- Downloads, document lightbox, contact і header блоки залишено на місці.
- Додано новий CSS-файл в APP_SHELL service worker.
- Оновлено build-версію до `0.6.20f` і кеш service worker до `v0.6.20f-r1`.

## 0.6.20e

**П'ятий безпечний крок розділення `css/styles.css`.**

- Винесено photo gallery і базовий gallery lightbox у `css/gallery.css`.
- `css/styles.css` підключає `gallery.css` після activity styles.
- Video cards, document lightbox, downloads, contact і header блоки залишено на місці.
- Додано новий CSS-файл в APP_SHELL service worker.
- Оновлено build-версію до `0.6.20e` і кеш service worker до `v0.6.20e-r1`.

## 0.6.20d

**Четвертий безпечний крок розділення `css/styles.css`.**

- Винесено картки напрямів діяльності `.activity-cards` і `.activity-card` у `css/activity.css`.
- Спільне правило `.activity-cards, .video-gallery` розділено без зміни поведінки: video grid залишився у `css/styles.css`, activity grid переїхав у `css/activity.css`.
- Gallery, video cards, downloads, contact і header блоки залишено на місці.
- Додано новий CSS-файл в APP_SHELL service worker.
- Оновлено build-версію до `0.6.20d` і кеш service worker до `v0.6.20d-r1`.

## 0.6.20c

**Третій безпечний крок розділення `css/styles.css`.**

- Винесено about/content блоки у `css/content.css`: layout фото й тексту, профільні посилання, details/collapsible content.
- `css/styles.css` підключає `content.css` після theme/base/layout/components.
- Складні activity cards, video, gallery, downloads, contact і header блоки залишено на місці.
- Додано новий CSS-файл в APP_SHELL service worker.
- Оновлено build-версію до `0.6.20c` і кеш service worker до `v0.6.20c-r1`.

## 0.6.20b

**Другий безпечний крок розділення `css/styles.css`.**

- Винесено базові правила глобальних кнопок `.button-link` і `button` у `css/components.css`.
- Винесено базові стилі футера, build-версії та footer counter у `css/components.css`.
- `css/styles.css` підключає `components.css` після theme/base/layout, а складні contact/download/gallery/header блоки залишено на місці.
- Додано новий CSS-файл в APP_SHELL service worker.
- Оновлено build-версію до `0.6.20b` і кеш service worker до `v0.6.20b-r1`.

## 0.6.20a

**Перший безпечний крок розділення `css/styles.css`.**

- Винесено CSS-змінні, light/dark theme tokens і кольорові токени у `css/theme.css`.
- Винесено reset/base/html/body/link/code правила у `css/base.css`.
- Винесено базові layout-контейнери `main` і `.panel` у `css/layout.css`.
- `css/styles.css` підключає нові файли через `@import` на початку, а складні блоки gallery/downloads/contact/header поки залишено на місці.
- Додано нові CSS-файли в APP_SHELL service worker.
- Оновлено build-версію до `0.6.20a` і кеш service worker до `v0.6.20a-r1`.

## 0.6.19c16

**Фінальна чистка `app.js` після модульного рефакторингу.**

- Винесено спільні helper-и `setText`, `escapeHtml`, `getLocalizedValue` у `js/site-utils.js`.
- Винесено завантаження `menu.html` у `js/menu-loader.js`.
- `app.js` залишено оркестратором DOMContentLoaded/init і запуску модулів.
- Додано нові JS-файли у HTML-сторінки та APP_SHELL service worker.
- Оновлено build-версію до `0.6.19c16` і кеш service worker до `v0.6.19c16-r1`.

## 0.6.19c15

**Чотирнадцятий малий рефакторинг `app.js`.**

- Прибрано прості wrapper-и в `app.js`, які лише дублювали виклики до вже винесених модулів.
- `applyAllContent()` тепер напряму викликає page/header/mobile/effects/counter модулі й краще показує порядок ініціалізації.
- Залишено helper-и, які реально збирають залежності або повторно використовуються.
- Оновлено build-версію до `0.6.19c15` і кеш service worker до `v0.6.19c15-r1`.

## 0.6.19c14

**Тринадцятий малий рефакторинг `app.js`.**

- Винесено page applicators, menu labels/active state, details rendering і page image helpers у `js/page-content.js`.
- `app.js` залишає wrapper-и для передачі залежностей у сторінковий модуль.
- Додано новий JS-файл у HTML-сторінки та APP_SHELL service worker.
- Оновлено build-версію до `0.6.19c14` і кеш service worker до `v0.6.19c14-r1`.

## 0.6.19c13

**Дванадцятий малий рефакторинг `app.js`.**

- Винесено JSON-завантаження, нормалізацію списків, перевірку доступних зображень і content loaders у `js/content-loader.js`.
- `app.js` залишає короткі wrapper-и для activity gallery, activity files і downloads groups.
- Додано новий JS-файл у HTML-сторінки та APP_SHELL service worker.
- Оновлено build-версію до `0.6.19c13` і кеш service worker до `v0.6.19c13-r1`.

## 0.6.19c12

**Одинадцятий малий рефакторинг `app.js`.**

- Винесено рендер галерей, portrait state, home/about lightbox і activity hero lightbox у `js/gallery-renderer.js`.
- Стан activity lightbox-галереї тепер живе в gallery renderer, а `app.js` залишає короткі wrapper-и.
- Додано новий JS-файл у HTML-сторінки та APP_SHELL service worker.
- Оновлено build-версію до `0.6.19c12` і кеш service worker до `v0.6.19c12-r1`.

## 0.6.19c11

**Десятий малий рефакторинг `app.js`.**

- Винесено header controls, language/theme toggles, brand, header socials і compact-scroll state у `js/header-ui.js`.
- `app.js` залишає короткі wrapper-и для запуску header-модуля і передачі потрібних helper-функцій.
- Додано новий JS-файл у HTML-сторінки та APP_SHELL service worker.
- Оновлено build-версію до `0.6.19c11` і кеш service worker до `v0.6.19c11-r1`.

## 0.6.19c10

**Дев'ятий малий рефакторинг `app.js`.**

- Винесено SVG-шаблони соціальних іконок у `js/social-icons.js`.
- `app.js` залишає короткий wrapper `getSocialIconMarkup()` для header, контактів і activity links.
- Додано новий JS-файл у HTML-сторінки та APP_SHELL service worker.
- Оновлено build-версію до `0.6.19c10` і кеш service worker до `v0.6.19c10-r1`.

## 0.6.19c9

**Восьмий малий рефакторинг `app.js`.**

- Винесено liquid droplet і video lens UI-ефекти у `js/liquid-effects.js`.
- `app.js` залишає короткі wrapper-и `initLiquidDroplets()` і `initVideoLiquidLens()`.
- Додано новий JS-файл у HTML-сторінки та APP_SHELL service worker.
- Оновлено build-версію до `0.6.19c9` і кеш service worker до `v0.6.19c9-r1`.

## 0.6.19c8

**Сьомий малий рефакторинг `app.js`.**

- Винесено visitor counter футера, кешування і session-прапорець у `js/visitor-counter.js`.
- `app.js` залишає короткий wrapper `initVisitorCounter()` для запуску модуля.
- Додано новий JS-файл у HTML-сторінки та APP_SHELL service worker.
- Оновлено build-версію до `0.6.19c8` і кеш service worker до `v0.6.19c8-r1`.

## 0.6.19c7

**Шостий малий рефакторинг `app.js`.**

- Винесено логіку контактної сторінки, соціальних посилань і валідації форми у `js/contact-page.js`.
- `app.js` залишає короткий wrapper `applyContactPage()` з передачею потрібних helper-функцій.
- Додано новий JS-файл у HTML-сторінки та APP_SHELL service worker.
- Оновлено build-версію до `0.6.19c7` і кеш service worker до `v0.6.19c7-r1`.

## 0.6.19c6

**П'ятий малий рефакторинг `app.js`.**

- Винесено mobile navigation, перенесення меню в нижню панель і mobile lens у `js/mobile-navigation.js`.
- `app.js` залишає короткий wrapper `initMobileNavigation()` після застосування label/active state меню.
- Додано новий JS-файл у HTML-сторінки та APP_SHELL service worker.
- Оновлено build-версію до `0.6.19c6` і кеш service worker до `v0.6.19c6-r1`.

## 0.6.19c5

**Четвертий малий рефакторинг `app.js`.**

- Винесено YouTube feed, кеш, fallback і рендер відеокарток у `js/youtube-feed.js`.
- `app.js` залишає короткий wrapper `loadYoutubeFeed()` для запуску модуля на сторінці активності.
- Додано новий JS-файл у HTML-сторінки та APP_SHELL service worker.
- Оновлено build-версію до `0.6.19c5` і кеш service worker до `v0.6.19c5-r1`.

## 0.6.19c4

**Третій малий рефакторинг `app.js`.**

- Винесено рендер списків і груп завантажень у `js/downloads-renderer.js`.
- `app.js` залишає wrapper-и для завантаження JSON, preview-тригерів і визначення типу файла.
- Додано новий JS-файл у HTML-сторінки та APP_SHELL service worker.
- Оновлено build-версію до `0.6.19c4` і кеш service worker до `v0.6.19c4-r1`.

## 0.6.19c3

**Другий малий рефакторинг `app.js`.**

- Винесено gallery lightbox для фото у `js/gallery-lightbox.js`.
- `app.js` тепер передає модулю список зображень і стартовий індекс, без власного стану відкритої галереї.
- Додано новий JS-файл у HTML-сторінки та APP_SHELL service worker.
- Оновлено build-версію до `0.6.19c3` і кеш service worker до `v0.6.19c3-r1`.

## 0.6.19c2

**Перший малий рефакторинг `app.js`.**

- Винесено document preview/lightbox у `js/document-lightbox.js`.
- `app.js` залишає тонкий wrapper для підключення існуючих залежностей і поведінки.
- Додано новий JS-файл у HTML-сторінки та APP_SHELL service worker.
- Оновлено build-версію до `0.6.19c2` і кеш service worker до `v0.6.19c2-r1`.

## 0.6.19c1

**Контроль перед рефакторингом `app.js`.**

- Додано `scripts/check-content.js` для перевірки валідності JSON, локальних файлів із JSON, HTML/CSS/manifest/service worker посилань.
- Додано npm-команду `npm run check:content`.
- Додано GitHub Action `Content check`, щоб перевірка запускалась на push/PR.
- Оновлено build-версію до `0.6.19c1` і кеш service worker до `v0.6.19c1-r1`.

## 0.6.19b

**Чистка контентного техборгу.**

- Прибрано з живого `photos.json` три заготовки для неіснуючих фото `activity1-photo7/8/9.jpg`, щоб не створювати зайві 404-запити.
- Видалено застарілий fallback-блок `SITE.downloads.files` з `config.js`; завантаження тепер ведуться через `files/downloads/files.json` і CMS.
- README уточнено під процес редагування через `/admin/` без попереднього прописування неіснуючих файлів.
- Оновлено build-версію до `0.6.19b` і кеш service worker до `v0.6.19b-r1`.

## 0.6.19

**Перший крок до адмін-панелі та чистки підтримки.**

- Додано основу Decap CMS у `/admin/` для майбутнього нетехнічного редагування галерей, освітніх файлів і матеріалів завантаження.
- Налаштовано CMS-конфіг під GitHub OAuth proxy `https://decap.iva.net.ua` і додано інструкцію `docs/admin-auth.md`.
- JSON галерей і освітніх файлів переведено у CMS-зручну структуру з ключами `images`/`files`; `app.js` зберігає сумісність зі старим форматом масиву.
- Для document-lightbox додано захист від повторного навішування event listener-ів.
- Оновлено build-версію до `0.6.19` і кеш service worker до `v0.6.19-r1`.

## 0.6.18g

**Hotfix уніфікації hover-станів кнопок.**

- Уніфіковано hover для профільних і action-кнопок у стилі вдалих блоків Наукової діяльності та Контактів.
- На hover/focus власна рамка кнопки розчиняється, щоб не конфліктувати зі скляним шаром.
- Прибрано надмірно спеціалізований hover для church-кнопки.
- Оновлено build-версію до `0.6.18g` і кеш service worker до `v0.6.18g-r1`.

## 0.6.18f

**Hotfix church-посилання в третій активності.**

- Полегшено hover-ефект кнопки профілю `orthodox-kr.org.ua`.
- Для church-кнопки вимкнено важкий action-glass накат, який давав несиметричну рамку.
- Оновлено build-версію до `0.6.18f` і кеш service worker до `v0.6.18f-r1`.

## 0.6.18e

**Hotfix плавності glass-наведення в меню.**

- Пом’якшено звичайний hover-стан пунктів меню, щоб він не конфліктував зі скляною лінзою.
- У режимі nav-lens пункт меню більше не підстрибує й не малює власну заливку поверх скла.
- Зроблено плавніший рух і слабший хвіст скляної лінзи меню.
- Оновлено build-версію до `0.6.18e` і кеш service worker до `v0.6.18e-r1`.

## 0.6.18d

**Hotfix посилання у розділі священнослужіння.**

- Посилання на профіль `orthodox-kr.org.ua` винесено з текстового абзацу в окрему скляну кнопку під фото.
- Рендер посилань активностей став спільним: третя активність використовує той самий формат, що й профільні посилання в науковому розділі.
- Оновлено build-версію до `0.6.18d` і кеш service worker до `v0.6.18d-r1`.

## 0.6.18c

**Hotfix мобільної кнопки завантаження.**

- На мобільній версії кнопка завантаження в PDF/download-блоці показує текст `Завантажити`, а не лише стрілку.
- Оновлено build-версію до `0.6.18c` і кеш service worker до `v0.6.18c-r1`.

## 0.6.18b

**Hotfix мобільних переносів у шапці.**

- Вимкнено дефісні переноси для мобільних заголовків шапки.
- Зменшено адаптивний розмір шрифту, щоб довгі слова на кшталт `Священнослужіння` не розривались дефісом.
- Оновлено build-версію до `0.6.18b` і кеш service worker до `v0.6.18b-r1`.

## 0.6.18a

**Hotfix мобільного заголовка.**

- Заборонено перенос усередині прізвища в мобільному заголовку головної сторінки.
- Оновлено build-версію до `0.6.18a` і кеш service worker до `v0.6.18a-r1`.

## 0.6.18

**Стабілізація responsive-шапки та фінальна поліровка перед переходом до 0.7.x.**

Версія `0.6.18` завершує серію 0.6.x як цілісний стан сайту після експериментів з Liquid Glass:

- оформлено чотири стани шапки: `ultra-wide`, `wide`, `medium` і `mobile`;
- виправлено проміжні ширини, де логотип, меню й перемикачі могли виглядати як змішані режими;
- у мобільному стані логотип став зрозумілою home-кнопкою з мінімалістичною хатинкою;
- перемикачі мови й теми повернуті в горизонтальну мобільну панель і вирівняні за масштабом з home-кнопкою;
- у compact-режимі панель перемикачів отримала спільну скляну підкладку;
- уточнено мобільний заголовок головної сторінки: ім’я й опис краще розділяються за розміром;
- виправлено читабельність hover-станів у PDF/download-блоці;
- додано скляну анімацію для пунктів завантажень без перекриття тексту;
- оновлено кеш service worker до `v0.6.18-r14`.

## 0.6.17 - 0.6.17b

**Експериментальний дизайн з елементами Liquid Glass.**

Серія версій `0.6.17`, `0.6.17a` і `0.6.17b` присвячена перевірці скляної візуальної мови на сайті:

- скляні hover/glow-ефекти для меню, перемикачів, соцкнопок і action-кнопок;
- рухома glass/lens-анімація в меню шапки та мобільній нижній навігації;
- sticky-поведінка лінзи без стартового зальоту;
- адаптація ефектів для світлої й темної тем;
- виправлення контрасту, шарування та поведінки меню на проміжних і мобільних ширинах.

Позначення цієї серії: **Experimental Liquid Glass UI**.
