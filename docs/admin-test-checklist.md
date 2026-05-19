# Перевірка адмін-панелі

Цей чеклист потрібен після змін у `admin/config.yml`, OAuth proxy або CMS-редагованих JSON-файлах.

## Локальна перевірка без GitHub OAuth

1. Встановити Decap local backend proxy:

   ```powershell
   npm install -g @decapcms/proxy-server
   ```

2. Запустити proxy з кореня репозиторію:

   ```powershell
   npx decap-server
   ```

3. В іншому терміналі підняти статичний сервер сайту, наприклад:

   ```powershell
   python -m http.server 8080
   ```

4. Відкрити:

   ```text
   http://localhost:8080/admin/
   ```

5. Перевірити, що відкриваються колекції:

   - `Головна сторінка`;
   - `Галерея: Наукова активність`;
   - `Галерея: Освітня діяльність`;
   - `Галерея: Священнослужіння`;
   - `Файли: Освітня діяльність`;
   - `Завантаження`.

6. Зробити тестову зміну в чернетці або локально:

   - змінити один абзац або alt-текст у `Головна сторінка`;
   - додати/змінити alt у фото;
   - додати тестовий файл в освітні матеріали;
   - додати тестовий запис у downloads.

7. Після тесту запустити:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-content.ps1
   ```

8. Якщо тестові зміни не мають лишатися в репозиторії, прибрати їх перед комітом.

## Продакшн-перевірка з GitHub OAuth

1. Переконатися, що `https://decap.iva.net.ua` відповідає.
2. Відкрити `https://iva.net.ua/admin/`.
3. Натиснути `Login with GitHub`.
4. Перевірити, що після авторизації видно CMS-колекції.
5. Створити мінімальну тестову чернетку через editorial workflow.
6. Переконатися, що CMS створює зміни в репозиторії.
7. Після merge/publish перевірити GitHub Action `Content check`.

## Що має ловити автоматична перевірка

Скрипт `check-content` тепер перевіряє не лише JSON/HTML/CSS/service worker, а й базові речі Decap CMS:

- наявність `admin/config.yml`;
- GitHub backend і репозиторій;
- OAuth proxy `https://decap.iva.net.ua`;
- `local_backend: true`;
- `publish_mode: editorial_workflow`;
- існування всіх `file`, `media_folder` і `public_folder` шляхів із CMS-конфіга.
