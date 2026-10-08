// Checks for assets/open.js. Run: node tools/test_open.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const o = require('../assets/open.js');

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/129 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15';
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129';
const nav = (ua, langs) => ({ userAgent: ua, languages: langs || ['en-US'], language: (langs || ['en-US'])[0] });
const loc = (pathname, search) => ({ pathname, search: search || '' });
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('path parsing', () => {
  assert.strictEqual(o.appPathFromPagePath('/kismet-pages/open'), '/');
  assert.strictEqual(o.appPathFromPagePath('/kismet-pages/open/'), '/');
  assert.strictEqual(o.appPathFromPagePath('/kismet-pages/open/tarot'), '/tarot');
  assert.strictEqual(o.appPathFromPagePath('/kismet-pages/open/burc/koc'), '/burc/koc');
  assert.strictEqual(o.appPathFromPagePath('/kismet-pages/openx'), null);
  assert.strictEqual(o.appPathFromPagePath('/kismet-pages/opened/tarot'), null);
  assert.strictEqual(o.appPathFromPagePath('/kismet-pages/privacy'), null);
  assert.strictEqual(o.appPathFromPagePath('/open/tarot'), null);
});

t('app url keeps the query', () => {
  assert.strictEqual(o.appUrlFor('/kismet-pages/open', ''), 'sezgi:///');
  assert.strictEqual(o.appUrlFor('/kismet-pages/open', '?ref=ABC123'), 'sezgi:///?ref=ABC123');
  assert.strictEqual(o.appUrlFor('/kismet-pages/open/burc/koc', '?q=x'), 'sezgi:///burc/koc?q=x');
  assert.strictEqual(o.appUrlFor('/kismet-pages/nope', '?ref=A'), null);
});

t('referral code sanitized like the app', () => {
  assert.strictEqual(o.sanitizeRef(' ab12cd '), 'AB12CD');
  assert.strictEqual(o.sanitizeRef('ab-12_cd9z'), 'AB12CD');
  assert.strictEqual(o.sanitizeRef('"><script>'), 'SCRIPT');
  assert.strictEqual(o.sanitizeRef('---'), null);
  assert.strictEqual(o.sanitizeRef(null), null);
});

t('play link carries the referrer', () => {
  const base = 'https://play.google.com/store/apps/details?id=com.yinyangstudio.kismet';
  assert.strictEqual(o.storeUrlFor(null), base);
  assert.strictEqual(o.storeUrlFor('AB12CD'), base + '&referrer=utm_source%3Dshare%26ref%3DAB12CD');
  const m = o.buildModel(loc('/kismet-pages/open', '?ref=ab12cd'), nav(ANDROID));
  assert.strictEqual(m.storeUrl, base + '&referrer=utm_source%3Dshare%26ref%3DAB12CD');
  const referrer = new URL(m.storeUrl).searchParams.get('referrer');
  assert.strictEqual(referrer, 'utm_source=share&ref=AB12CD');
});

t('platform behaviour', () => {
  let m = o.buildModel(loc('/kismet-pages/open/tarot', '?ref=X1'), nav(ANDROID));
  assert.strictEqual(m.bounce, true);
  assert.strictEqual(m.appUrl, 'sezgi:///tarot?ref=X1');
  assert.ok(m.showInstall && m.showOpen);
  m = o.buildModel(loc('/kismet-pages/whatever', ''), nav(ANDROID));
  assert.strictEqual(m.bounce, false);
  assert.strictEqual(m.platform, 'android-invalid');
  m = o.buildModel(loc('/kismet-pages/open', ''), nav(IPHONE));
  assert.strictEqual(m.bounce, false);
  assert.strictEqual(m.showInstall, false);
  m = o.buildModel(loc('/kismet-pages/open', ''), nav(DESKTOP));
  assert.strictEqual(m.bounce, false);
  assert.strictEqual(m.showInstall, true);
});

t('language pick and string tables', () => {
  assert.strictEqual(o.pickLang(['tr-TR', 'en']), 'tr');
  assert.strictEqual(o.pickLang(['nl-NL', 'pt-BR']), 'pt');
  assert.strictEqual(o.pickLang(['zh-CN']), 'en');
  assert.strictEqual(o.pickLang([]), 'en');
  assert.strictEqual(o.pickLang(['ja']), 'ja');
  assert.strictEqual(o.buildModel(loc('/kismet-pages/open', ''), nav(ANDROID, ['ar-EG'])).dir, 'rtl');
  const keys = Object.keys(o.STRINGS.en).sort();
  for (const l of o.LANGS) {
    assert.deepStrictEqual(Object.keys(o.STRINGS[l]).sort(), keys, l);
    for (const k of keys) {
      assert.ok(o.STRINGS[l][k].length > 0, l + '.' + k);
      assert.ok(!/remember|hatırla|recuerd|souvien|erinner|lembra|помн|تتذك|覚え|did not open/i.test(o.STRINGS[l][k]), l + '.' + k);
    }
  }
});

t('shared quote is plain, trimmed and capped', () => {
  const evil = '<img src=x onerror=alert(1)><script>alert(2)</script>';
  const search = '?q=' + encodeURIComponent(evil) + '&card=' + encodeURIComponent('The‮Star\n');
  const m = o.buildModel(loc('/kismet-pages/open/tarot', search), nav(ANDROID));
  // Kept as text; render() only ever assigns textContent.
  assert.strictEqual(m.quote, evil);
  assert.strictEqual(m.card, 'The Star');
  const long = o.cleanText('a'.repeat(1000), 280);
  assert.strictEqual(long.length, 280);
  assert.ok(long.endsWith('…'));
  assert.strictEqual(o.cleanText('  two\t\tlines\r\nhere ', 50), 'two lines here');
  assert.strictEqual(o.buildModel(loc('/kismet-pages/open', ''), nav(ANDROID)).quote, '');
});

t('render writes text only and bounces once on android', () => {
  const els = {};
  ['tagline', 'message', 'ai', 'cta', 'open', 'shared', 'shared-label', 'shared-quote', 'shared-card']
    .forEach((id) => { els[id] = { id, textContent: '', hidden: true, href: '' }; });
  const doc = { documentElement: {}, getElementById: (id) => els[id] || null };
  const replaced = [];
  const win = {
    location: {
      pathname: '/kismet-pages/open/tarot',
      search: '?ref=ab12cd&q=' + encodeURIComponent('<b>hi</b>'),
      replace: (u) => replaced.push(u),
    },
    navigator: nav(ANDROID, ['de-DE']),
  };
  o.render(doc, win);
  assert.deepStrictEqual(replaced, ['sezgi:///tarot?ref=ab12cd&q=%3Cb%3Ehi%3C%2Fb%3E']);
  assert.strictEqual(doc.documentElement.lang, 'de');
  assert.strictEqual(els['shared-quote'].textContent, '<b>hi</b>');
  assert.strictEqual(els.shared.hidden, false);
  assert.strictEqual(els['shared-card'].hidden, true);
  assert.ok(els.cta.href.endsWith('%26ref%3DAB12CD'));
  assert.strictEqual(els.open.href, replaced[0]);

  const replaced2 = [];
  o.render(doc, { location: { pathname: '/kismet-pages/open', search: '', replace: (u) => replaced2.push(u) }, navigator: nav(IPHONE) });
  assert.deepStrictEqual(replaced2, []);
  assert.strictEqual(els.cta.hidden, true);
});

t('no markup sinks; both pages share the script and meta', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'open.js'), 'utf8');
  assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function/.test(src));
  for (const f of ['open/index.html', '404.html']) {
    const html = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert.ok(html.includes('<script src="/kismet-pages/assets/open.js"></script>'), f);
    assert.ok(html.includes('og:image') && html.includes('twitter:card'), f);
  }
});

console.log(n + ' checks passed');
