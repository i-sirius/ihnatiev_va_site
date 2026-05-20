# Admin Smoke Test Report

Date: 2026-05-20
Tester: project owner + Codex
Build version: 0.6.24d
Environment: production
Status: passed with fixed encoding issue

## Automated Checks

- [x] `scripts/check-content.ps1` passed locally after the hotfix.
- [ ] `npm run check:content` was not available locally because `npm`/`node` were not available in this shell.
- [x] GitHub Action `Content check` passed for commit `67dfd17`.
- [x] GitHub Pages build/deployment passed for commit `67dfd17`.

Notes:

- Initial GitHub Action `Content check` failed after the first Decap publish because CMS-edited JSON files contained UTF-8 BOM.
- The issue was fixed in `v0.6.24d` / commit `67dfd17`.

## Local Backend

- [ ] `npx decap-server` local backend test was not part of this production smoke-test pass.
- [ ] Static local server was not part of this production smoke-test pass.
- [ ] `http://localhost:8080/admin/` was not part of this production smoke-test pass.
- [ ] Local CMS save was not part of this production smoke-test pass.

Notes:

- The completed smoke-test was the real production Decap CMS flow through `/admin/`.

## Production OAuth

- [x] `https://decap.iva.net.ua` responds as the active OAuth proxy.
- [x] `https://iva.net.ua/admin/` opens Decap CMS.
- [x] GitHub OAuth login works through `https://decap.iva.net.ua`.
- [x] Editorial workflow created a test draft/edit.
- [x] Publish worked.
- [x] Decap created and merged PR #1.
- [x] Decap workflow created merge commit `97b1929`.

Notes:

- The first publish confirmed the Decap workflow is operational end to end.
- The follow-up encoding hotfix confirmed the CI guard now passes after the CMS publish.

## Collections

- [x] `home_content`
- [x] `activities_content`
- [x] `pages_content`
- [x] `publications_content`
- [x] `gallery_activity1`
- [x] `gallery_activity2`
- [x] `gallery_activity3`
- [x] `activity2_files`
- [x] `downloads`

## Test Edits

- [ ] Home content
- [x] Activities content
- [ ] Pages content
- [ ] Publications content
- [ ] Gallery alt text
- [ ] Activity files form
- [ ] Downloads form

Test edit description:

- Decap CMS created branch `cms/activities_content/activities`.
- Decap commit `8dc34a5` updated the `activities_content` collection.
- Decap merged PR #1 into `main`, producing merge commit `97b1929`.

## Issues

- Fixed: CMS-edited JSON files were saved with UTF-8 BOM, causing `JSON.parse()` in GitHub Actions to fail.
- Fixed in `v0.6.24d` / commit `67dfd17`: BOM removed from affected JSON files and `check-content` now reports BOM explicitly.
- Final result: GitHub Actions `Content check` passed successfully for `67dfd17`.
