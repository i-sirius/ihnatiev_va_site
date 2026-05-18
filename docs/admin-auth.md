# Налаштування входу в адмін-панель

Адмін-панель Decap CMS доступна за адресою:

```text
https://iva.net.ua/admin/
```

Щоб кнопка `Login with GitHub` працювала на GitHub Pages, потрібен окремий OAuth proxy. GitHub OAuth не можна безпечно завершити тільки в статичному HTML/JS, тому секрет GitHub OAuth App має зберігатися на серверній стороні. Для цього проєкту підготовлено адресу:

```text
https://decap.iva.net.ua
```

У `admin/config.yml` уже прописано:

```yaml
backend:
  name: github
  repo: i-sirius/ihnatiev_va_site
  branch: main
  site_domain: iva.net.ua
  base_url: https://decap.iva.net.ua
  auth_endpoint: /auth
```

## 1. GitHub OAuth App

У GitHub потрібно створити OAuth App:

- `Application name`: `Ihnatiev Site CMS`
- `Homepage URL`: `https://decap.iva.net.ua`
- `Authorization callback URL`: `https://decap.iva.net.ua/callback`

Після створення треба зберегти:

- `Client ID`
- `Client Secret`

`Client Secret` не можна додавати в репозиторій.

## 2. Cloudflare Worker OAuth Proxy

Рекомендований варіант для цього сайту: Cloudflare Worker з decap-proxy.

Базовий сценарій:

```powershell
git clone https://github.com/sterlingwes/decap-proxy.git
cd decap-proxy
copy wrangler.toml.sample wrangler.toml
```

У `wrangler.toml` потрібно вказати домен proxy:

```toml
name = "ihnatiev-decap-proxy"
route = { pattern = "decap.iva.net.ua", zone_name = "iva.net.ua", custom_domain = true }
workers_dev = false
```

Якщо репозиторій приватний, у конфігурації proxy потрібно також увімкнути режим private repo згідно з інструкцією decap-proxy.

Після цього додати секрети Worker:

```powershell
npx wrangler secret put GITHUB_OAUTH_ID
npx wrangler secret put GITHUB_OAUTH_SECRET
```

Значення:

- `GITHUB_OAUTH_ID` = GitHub OAuth App Client ID
- `GITHUB_OAUTH_SECRET` = GitHub OAuth App Client Secret

Потім деплой:

```powershell
npx wrangler deploy
```

## 3. Доступ редактора

Редактор має мати GitHub-акаунт із правом запису в репозиторій `i-sirius/ihnatiev_va_site`.

Мінімальний варіант:

- додати редактора як collaborator у GitHub repo;
- після цього редактор відкриває `https://iva.net.ua/admin/`;
- натискає `Login with GitHub`;
- редагує потрібні файли в адмін-панелі.

Через `publish_mode: editorial_workflow` зміни можуть створюватися як чернетки/публікації в CMS, а не одразу як пряме ручне редагування файлів.

## 4. Перевірка

Після деплою proxy:

1. Відкрити `https://decap.iva.net.ua`.
2. Переконатися, що Worker відповідає.
3. Відкрити `https://iva.net.ua/admin/`.
4. Натиснути `Login with GitHub`.
5. Після авторизації має відкритися CMS з колекціями галерей і файлів.

Якщо після логіну CMS пише, що репозиторій не знайдено, перевірити:

- `repo: i-sirius/ihnatiev_va_site` у `admin/config.yml`;
- чи редактор має доступ до репозиторію;
- чи proxy налаштований для private repo, якщо репозиторій приватний.
