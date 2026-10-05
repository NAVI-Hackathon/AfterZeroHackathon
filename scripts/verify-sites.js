import assert from 'node:assert/strict';

// Run after npm run dev:all. Checks boundaries, routes, assets and Vite's API proxy.
async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, url);
  return response;
}
const navi = 'http://127.0.0.1:5173';
const mock = 'http://127.0.0.1:3000';
const home = await (await get(navi)).text();
assert.match(home, /NAVI/);
await get(`${navi}/favicon.svg`);
const direct = await (await get('http://127.0.0.1:3001/api/health')).json();
const proxied = await (await get(`${navi}/api/health`)).json();
assert.equal(direct.status, 'ok');
assert.deepEqual(proxied, direct);
for (const path of ['/', '/services', '/services/forms', '/services/policy-change', '/services/policy-loan', '/services/claims', '/services/online', '/glossary']) {
  const html = await (await get(mock + path)).text();
  assert.match(html, /InsurHack 模擬網站，非官方/, path);
  assert.match(html, /data-tour-id=/, path);
  assert.doesNotMatch(html, /(?:src|href)="https:\/\/(?:life|my)\.cardif\.com\.tw/, path);
  if (path === '/') {
    const css = html.match(/href="([^" ]+\.css(?:\?[^" ]*)?)"/);
    assert.ok(css, 'Mock Website stylesheet');
    await get(new URL(css[1].replaceAll('&amp;', '&'), mock));
    await get(`${mock}/favicon.ico`);
  }
  console.log(`OK Mock Website ${path}`);
}
assert.equal((await fetch(`${mock}/api/health`)).status, 404);
console.log('OK NAVI / assets / API proxy; separate Mock Website routing');
