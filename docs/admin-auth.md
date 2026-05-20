# Налаштування входу в адмін-панель

Адмін-панель Decap CMS доступна за адресою:

```text
https://iva.net.ua/admin/
```

Для GitHub login потрібен OAuth proxy. Через проблему з nameserver-ами домену `iva.net.ua` тимчасово використовується прямий Cloudflare Workers endpoint:

```text
https://decap-auth.pollux-twin.workers.dev
```

У `admin/config.yml` має бути:

```yaml
backend:
  name: github
  repo: i-sirius/ihnatiev_va_site
  branch: main
  site_domain: iva.net.ua
  base_url: https://decap-auth.pollux-twin.workers.dev
  auth_endpoint: /auth
```

## GitHub OAuth App

У GitHub OAuth App мають бути вказані:

- `Homepage URL`: `https://decap-auth.pollux-twin.workers.dev`
- `Authorization callback URL`: `https://decap-auth.pollux-twin.workers.dev/callback`

Потрібно зберегти:

- `Client ID`
- `Client Secret`

`Client Secret` не можна додавати в репозиторій.

## Cloudflare Worker

Worker має мати секрети:

```powershell
npx wrangler secret put GITHUB_OAUTH_ID
npx wrangler secret put GITHUB_OAUTH_SECRET
```

Значення:

- `GITHUB_OAUTH_ID` = GitHub OAuth App Client ID
- `GITHUB_OAUTH_SECRET` = GitHub OAuth App Client Secret

Якщо пізніше nameserver-и `iva.net.ua` будуть виправлені, можна повернути custom domain `https://decap.iva.net.ua`, але тоді треба одночасно оновити:

- `admin/config.yml`;
- GitHub OAuth App URLs;
- `scripts/check-content.js`;
- `scripts/check-content.ps1`;
- `docs/admin-test-checklist.md`;
- `docs/admin-smoke-test-report.md`.

## Доступ редактора

Редактор має мати GitHub-акаунт із правом запису в репозиторій `i-sirius/ihnatiev_va_site`.

Мінімальний сценарій:

1. Додати редактора як collaborator у GitHub repo.
2. Відкрити `https://iva.net.ua/admin/`.
3. Натиснути `Login with GitHub`.
4. Відредагувати потрібні файли в адмін-панелі.
5. Через `publish_mode: editorial_workflow` опублікувати зміну.

## Перевірка

1. Відкрити `https://decap-auth.pollux-twin.workers.dev`.
2. Переконатися, що Worker відповідає.
3. Відкрити `https://iva.net.ua/admin/`.
4. Натиснути `Login with GitHub`.
5. Після авторизації має відкритися CMS з усіма колекціями.

Якщо після login CMS пише, що репозиторій не знайдено, перевірити:

- `repo: i-sirius/ihnatiev_va_site` у `admin/config.yml`;
- чи редактор має доступ до репозиторію;
- чи Worker налаштований для потрібного GitHub OAuth App;
- чи GitHub OAuth App callback URL збігається з active Workers endpoint.
