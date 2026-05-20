# Admin Smoke Test Report

Дата перевірки:
Перевірив:
Build version:
Середовище: local / production

## Automated Checks

- [ ] `scripts/check-content.ps1` пройшов.
- [ ] `npm run check:content` пройшов або причина пропуску записана нижче.
- [ ] GitHub Action `Content check` пройшов після publish/merge.

Примітки:

## Local Backend

- [ ] `npx decap-server` запущено.
- [ ] Статичний сервер сайту запущено.
- [ ] `http://localhost:8080/admin/` відкривається.
- [ ] CMS зберігає зміни в локальний репозиторій.

Примітки:

## Production OAuth

- [ ] `https://decap.iva.net.ua` відповідає.
- [ ] `https://iva.net.ua/admin/` відкривається.
- [ ] Login через GitHub успішний.
- [ ] Editorial workflow створює зміну в GitHub.
- [ ] Publish/merge працює.

Примітки:

## Collections

- [ ] `home_content`
- [ ] `activities_content`
- [ ] `pages_content`
- [ ] `publications_content`
- [ ] `gallery_activity1`
- [ ] `gallery_activity2`
- [ ] `gallery_activity3`
- [ ] `activity2_files`
- [ ] `downloads`

## Test Edits

- [ ] Home content
- [ ] Activities content
- [ ] Pages content
- [ ] Publications content
- [ ] Gallery alt text
- [ ] Activity files form
- [ ] Downloads form

Опис тестових змін:

## Issues

- Немає / описати нижче.
