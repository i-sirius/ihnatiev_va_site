const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
(async () => {
  const probes = [], timers = new Map();
  let nextTimer = 0;
  const context = { window: {
    setTimeout(fn) { timers.set(++nextTimer, fn); return nextTimer; },
    clearTimeout(id) { timers.delete(id); }
  }, Image: class { constructor() { probes.push(this); } } };
  vm.runInNewContext(fs.readFileSync('js/content-loader.js', 'utf8'), context);
  const good = { src: 'good.jpg' };
  const result = context.window.SiteContentLoader.filterAvailableImages([good, {src:'stalled.jpg'}, {src:'broken.jpg'}]);
  probes[0].onload();
  probes[2].onerror();
  assert.equal(timers.size, 1);
  const lateLoad = probes[1].onload;
  for (const expire of [...timers.values()]) expire();
  assert.deepEqual(Array.from(await result), [good]);
  lateLoad();
  assert.equal(timers.size, 0);
  assert.equal(probes[1].onload, null);
  let reloads = 0, sent = 0;
  const listeners = {};
  const updateContext = {
    window: { location: { reload() { reloads++; } } },
    navigator: { serviceWorker: { controller: null, addEventListener: (name, fn) => { listeners[name] = fn; } } },
    document: { hidden: true }
  };
  vm.runInNewContext(fs.readFileSync('js/app-update.js', 'utf8'), updateContext);
  const registration = { waiting: null, addEventListener() {} };
  const updater = updateContext.window.SiteAppUpdate;
  updater.handleRegistration(registration);
  updateContext.navigator.serviceWorker.controller = {};
  listeners.controllerchange();
  assert.equal(reloads, 0, 'First installation must not reload');
  listeners.controllerchange();
  assert.equal(reloads, 0, 'Another tab updating must not reload this tab');
  registration.waiting = { postMessage(message) { assert.equal(message.type, 'SKIP_WAITING'); sent++; } };
  updater.activateWaitingWorker();
  assert.equal(sent, 1);
  listeners.controllerchange();
  listeners.controllerchange();
  assert.equal(reloads, 1, 'Explicit update must reload exactly once');
  console.log('UI lifecycle checks passed: stalled images, late callbacks, first installation, explicit update.');
})().catch(error => { console.error(error); process.exitCode = 1; });
