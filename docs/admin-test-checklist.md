# Перевірка адмін-панелі

Цей протокол потрібен після змін у `admin/config.yml`, JSON-контенті, OAuth proxy або CMS-колекціях. Автоматичні пункти можна виконати з репозиторію; OAuth/login частину потрібно пройти вручну у браузері.

## 1. Preflight

1. Переконатися, що робоча гілка актуальна і немає випадкових незбережених змін.
2. Запустити локальну перевірку контенту:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-content.ps1
   ```

3. Якщо доступний Node.js, додатково запустити CI-версію:

   ```powershell
   npm run check:content
   ```

4. Перевірити, що скрипти підтверджують:

   - валідність JSON і `manifest.webmanifest`;
   - існування локальних HTML/CSS/service worker посилань;
   - базові GitHub/OAuth налаштування Decap CMS;
   - наявність усіх очікуваних CMS-колекцій;
   - наявність усіх `file`, `media_folder` і `public_folder` шляхів;
   - поля `text`, `year`, `type` і типові опції колекції наукових праць.

## 2. Local Backend Smoke Test

1. Запустити Decap local backend proxy з кореня репозиторію:

   ```powershell
   npx decap-server
   ```

2. В іншому терміналі підняти статичний сервер сайту:

   ```powershell
   python -m http.server 8080
   ```

3. Відкрити:

   ```text
   http://localhost:8080/admin/
   ```

4. Перевірити, що відкриваються колекції:

   - `home_content`;
   - `activities_content`;
   - `pages_content`;
   - `publications_content`;
   - `gallery_activity1`;
   - `gallery_activity2`;
   - `gallery_activity3`;
   - `activity2_files`;
   - `downloads`.

5. Зробити по одній безпечній тестовій зміні:

   - у `home_content` змінити alt-текст або один короткий абзац;
   - в `activities_content` змінити короткий опис однієї картки;
   - у `pages_content` змінити intro або label поля;
   - у `publications_content` змінити текст, рік або тип одного запису;
   - у будь-якій gallery-колекції змінити alt-текст фото;
   - в `activity2_files` або `downloads` перевірити відкриття форми редагування без обов'язкового додавання нового файла.

6. Зберегти зміни через CMS і переглянути `git diff`.
7. Запустити `check-content.ps1` ще раз.
8. Відкрити сайт локально і перевірити сторінки, яких торкались зміни.
9. Якщо тестові зміни не мають лишатися в репозиторії, прибрати їх перед комітом.

## 3. Production OAuth Smoke Test

1. Перевірити, що OAuth proxy відповідає:

   ```text
   https://decap-auth.pollux-twin.workers.dev
   ```

2. Відкрити production CMS:

   ```text
   https://iva.net.ua/admin/
   ```

3. Натиснути `Login with GitHub` і пройти авторизацію.
4. Переконатися, що після login видно ті самі 9 колекцій.
5. Створити мінімальну тестову зміну через editorial workflow.
6. Перевірити, що CMS створює зміну в GitHub.
7. Після publish/merge перевірити GitHub Action `Content check`.
8. Переконатися на сайті, що зміна відображається або успішно прибрана.

## 4. Звіт

Результат ручної перевірки фіксується у `docs/admin-smoke-test-report.md`: дата, середовище, які колекції відкрились, які тестові зміни зроблено, чи пройшов `Content check`, і які проблеми знайдено.
