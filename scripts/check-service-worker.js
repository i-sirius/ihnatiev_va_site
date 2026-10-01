const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('sw.js', 'utf8');
function setup({ cached, response, offline = false, quota = false, cacheUnavailable = false } = {}) {
  const listeners = {}, writes = [], deleted = [];
  const context = {
    URL, Response,
    self: { location: { origin: 'https://iva.net.ua' }, clients: { claim: async () => {} },
      addEventListener: (name, handler) => { listeners[name] = handler; } },
    caches: {
      match: async () => { if (cacheUnavailable) throw new Error("Storage blocked"); return cached && cached.clone(); },
      open: async () => ({ put: async (request, value) => {
        if (quota) throw new Error('QuotaExceededError');
        writes.push(await value.text());
      } }),
      keys: async () => ['ihnatiev-site-old', 'unrelated-app-cache'],
      delete: async (key) => deleted.push(key)
    },
    fetch: async () => { if (offline) throw new Error('offline'); return response.clone(); }
  };
  vm.runInNewContext(source, context);
  return { writes, deleted, async request(path, mode = 'cors', range = false) {
    let result;
    const background = [];
    listeners.fetch({ request: { method: 'GET', url: 'https://iva.net.ua' + path, mode,
      headers: new Headers(range ? { Range: 'bytes=0-10' } : {}) },
      respondWith: (promise) => { result = promise; }, waitUntil: (promise) => background.push(promise) });
    const resolved = await result;
    await Promise.all(background);
    return resolved;
  }, async activate() { let done; listeners.activate({ waitUntil: p => { done = p; } }); await done; } };
}
(async () => {
  for (const [path, mode] of [['/activity1.html', 'navigate'], ['/files/content/home.json', 'cors'], ['/app.js', 'cors']]) {
    for (const status of [404, 500, 503]) {
      const sw = setup({ cached: new Response('working'), response: new Response('error', { status }) });
      assert.equal(await (await sw.request(path, mode)).text(), 'working');
      assert.deepEqual(sw.writes, []);
    }
    const offline = setup({ cached: new Response('offline copy'), offline: true });
    assert.equal(await (await offline.request(path, mode)).text(), 'offline copy');
    const empty = setup({ offline: true });
    assert.equal((await empty.request(path, mode)).type, 'error');
    const quota = setup({ response: new Response('fresh'), quota: true });
    assert.equal(await (await quota.request(path, mode)).text(), 'fresh');
    const blocked = setup({ response: new Response('fresh'), cacheUnavailable: true, quota: true });
    assert.equal(await (await blocked.request(path, mode)).text(), 'fresh');
    const fresh = setup({ response: new Response('fresh') });
    assert.equal(await (await fresh.request(path, mode)).text(), 'fresh');
    assert.deepEqual(fresh.writes, ['fresh']);
  }
  const refresh = setup({ cached: new Response('old'), response: new Response('new') });
  assert.equal(await (await refresh.request('/app.js')).text(), 'old');
  assert.deepEqual(refresh.writes, ['new']);
  assert.equal(await refresh.request('/photo.jpg', 'cors', true), undefined);
  await refresh.activate();
  assert.deepEqual(refresh.deleted, ['ihnatiev-site-old']);
  console.log('Service worker checks passed: HTTP errors, offline, quota, background refresh, ranges, cache isolation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
