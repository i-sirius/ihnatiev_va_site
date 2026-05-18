# Changelog

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
