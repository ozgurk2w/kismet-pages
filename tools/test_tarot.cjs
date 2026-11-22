const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function visit(userAgent, pathname, touches = 0, file = 'open/tarot/index.html') {
  const siteRoot = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(siteRoot, file), 'utf8');
  const script = html.match(/<script(?: src="([^"]*)")?>([\s\S]*?)<\/script>/);
  const code = script[1]
    ? fs.readFileSync(path.join(siteRoot, script[1].replace('/kismet-pages/', '')), 'utf8')
    : script[2];
  const nodes = {};
  for (const match of html.matchAll(/<(p|a) id="([^"]+)"([^>]*)>([^<]*)<\/\1>/g)) {
    const [, , id, attrs, label] = match;
    nodes[id] = { textContent: label, hidden: /\bhidden\b/.test(attrs) };
  }
  const navigations = [];
  const listeners = {};
  const location = {
    pathname, search: '?ref=ABC123&q=private', hash: '#card',
    replace: url => navigations.push(url)
  };
  const document = {
    getElementById: id => nodes[id],
    addEventListener: (name, callback) => listeners[name] = callback
  };
  let pending;
  const env = { navigator: { userAgent, maxTouchPoints: touches }, document,
    window: { document, location, addEventListener: document.addEventListener },
    location, URL, URLSearchParams,
    setTimeout: callback => { pending = callback; return 1; },
    clearTimeout: () => { pending = null; }
  };
  vm.runInNewContext(code, env);
  return { nodes, navigations, listeners, document, expire: () => pending?.() };
}

for (const page of ['/kismet-pages/open/tarot', '/kismet-pages/open/tarot/']) {
  for (const [platform, ua, touch] of [['iPhone','iPhone',1],['iPad desktop mode','Macintosh',5]]) {
    test(platform + ' stays on the availability message at ' + page, () => {
      const site = visit(ua, page, touch);
      site.expire();
      assert.deepEqual(site.navigations, []);
      assert.equal(site.nodes.store.hidden, true);
      assert.equal(site.nodes.open.hidden, true);
      assert.match(site.nodes.status.textContent, /available.*Android/);
    });
  }
  test('Android retains the Tarot destination and attribution at ' + page, () => {
    const site = visit('Android', page);
    assert.equal(site.navigations[0], 'sezgi:///tarot?ref=ABC123&q=private#card');
    site.expire();
    const fallback = new URL(site.navigations[1]);
    assert.equal(fallback.hostname, 'play.google.com');
    assert.equal(fallback.searchParams.get('referrer'), 'ref=ABC123');
  });
  for (const entry of ['404.html', 'open/index.html']) {
    test(entry + ' dispatches Tarot to the same entry page at ' + page, () => {
      const site = visit('iPhone', page, 1, entry);
      site.expire();
      assert.deepEqual(site.navigations, [
        '/kismet-pages/open/tarot/index.html?ref=ABC123&q=private#card'
      ]);
    });
  }
}
test('opening the app cancels the Android store timer', () => {
  const site = visit('Android', '/kismet-pages/open/tarot/');
  site.document.hidden = true;
  site.listeners.visibilitychange();
  site.expire();
  assert.equal(site.navigations.length, 1);
});
test('desktop has an explicit store link and stays on the page', () => {
  const site = visit('Macintosh', '/kismet-pages/open/tarot/');
  site.expire();
  assert.deepEqual(site.navigations, []);
  assert.equal(site.nodes.store.hidden, false);
});
