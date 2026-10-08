/*
 * Share landing page logic for /kismet-pages/open (open/index.html and the
 * 404.html fallback that GitHub Pages serves for every /open/<sub-path>).
 *
 * Bounce behaviour (unchanged from the first version of these pages):
 *   Android with the app installed: the verified App Link opens the app and
 *     this page never loads.
 *   Android without the app: this page tries sezgi://<path><query> once with
 *     location.replace, then offers Google Play.
 *   iOS: Android-only message, no install button.
 *   Desktop: message plus the Google Play button.
 *
 * Path mapping mirrors lib/core/utils/deep_link.dart:
 *   /kismet-pages/open             -> sezgi:///
 *   /kismet-pages/open?ref=ABC     -> sezgi:///?ref=ABC
 *   /kismet-pages/open/burc/koc    -> sezgi:///burc/koc
 *   /kismet-pages/open/<fortune>   -> sezgi:///<fortune>
 *
 * Shared content: ?q=<quote> and ?card=<card or symbol name> are shown as
 * plain text (textContent only, never parsed as markup), trimmed and capped. URL
 * content is never executed or inserted as markup.
 *
 * The functions are exported for node so tools/test_open.js can check them.
 */
(function (root) {
  'use strict';

  var PACKAGE = 'com.yinyangstudio.kismet';
  var STORE_URL = 'https://play.google.com/store/apps/details?id=' + PACKAGE;
  var PREFIX = '/kismet-pages/open';
  var LANGS = ['en', 'tr', 'es', 'fr', 'de', 'pt', 'ru', 'ar', 'hi', 'ja'];
  var QUOTE_MAX = 280;
  var CARD_MAX = 60;

  var STRINGS = {
    en: {
      tagline: 'Tarot, coffee cup reading, dreams and your daily horoscope',
      shared: 'Someone shared a line from their reading',
      opening: 'Opening Sezgi. If it is not installed, get it from Google Play.',
      invalid: 'This link did not lead anywhere. You can still install Sezgi.',
      ios: 'Sezgi is on Android for now. iOS is on the way.',
      desktop: 'Sezgi runs on Android. Open this link on your phone, or install it from Google Play.',
      install: 'Get it on Google Play',
      open: 'Open in Sezgi',
      ai: 'Readings are written by AI, for reflection and entertainment.'
    },
    tr: {
      tagline: 'Kahve falı, tarot, rüya tabiri ve günlük burç yorumu',
      shared: 'Biri falından bir cümle paylaştı',
      opening: 'Sezgi açılıyor. Yüklü değilse Google Play\'den indirebilirsin.',
      invalid: 'Bu bağlantı bir yere çıkmadı. Sezgi\'yi yine de indirebilirsin.',
      ios: 'Sezgi şimdilik Android\'de. iOS sürümü yolda.',
      desktop: 'Sezgi Android\'de çalışır. Bu bağlantıyı telefonunda aç ya da Google Play\'den indir.',
      install: 'Google Play\'den indir',
      open: 'Sezgi\'de aç',
      ai: 'Yorumları yapay zekâ yazar; kendini dinlemen ve keyif alman içindir.'
    },
    es: {
      tagline: 'Tarot, lectura del café, sueños y tu horóscopo diario',
      shared: 'Alguien compartió una frase de su lectura',
      opening: 'Abriendo Sezgi. Si no la tienes instalada, descárgala en Google Play.',
      invalid: 'Este enlace no lleva a ninguna parte. Aun así puedes instalar Sezgi.',
      ios: 'Por ahora Sezgi está en Android. iOS está en camino.',
      desktop: 'Sezgi funciona en Android. Abre este enlace en tu teléfono o instálala desde Google Play.',
      install: 'Disponible en Google Play',
      open: 'Abrir en Sezgi',
      ai: 'Las lecturas las escribe una IA, para reflexionar y entretenerte.'
    },
    fr: {
      tagline: 'Tarot, marc de café, rêves et ton horoscope du jour',
      shared: 'Quelqu’un a partagé une phrase de sa lecture',
      opening: 'Ouverture de Sezgi. Si l’app n’est pas installée, télécharge-la sur Google Play.',
      invalid: 'Ce lien ne mène nulle part. Tu peux quand même installer Sezgi.',
      ios: 'Sezgi est pour l’instant sur Android. iOS arrive bientôt.',
      desktop: 'Sezgi fonctionne sur Android. Ouvre ce lien sur ton téléphone ou installe l’app depuis Google Play.',
      install: 'Disponible sur Google Play',
      open: 'Ouvrir dans Sezgi',
      ai: 'Les lectures sont écrites par une IA, pour réfléchir et se divertir.'
    },
    de: {
      tagline: 'Tarot, Kaffeesatz, Träume und dein Tageshoroskop',
      shared: 'Jemand hat einen Satz aus seiner Deutung geteilt',
      opening: 'Sezgi wird geöffnet. Ist die App nicht installiert, hol sie dir bei Google Play.',
      invalid: 'Dieser Link führt nirgendwohin. Du kannst Sezgi trotzdem installieren.',
      ios: 'Sezgi gibt es vorerst für Android. iOS ist unterwegs.',
      desktop: 'Sezgi läuft auf Android. Öffne diesen Link auf deinem Handy oder installiere die App über Google Play.',
      install: 'Jetzt bei Google Play',
      open: 'In Sezgi öffnen',
      ai: 'Die Deutungen schreibt eine KI, zum Nachdenken und zur Unterhaltung.'
    },
    pt: {
      tagline: 'Tarot, borra de café, sonhos e seu horóscopo do dia',
      shared: 'Alguém compartilhou uma frase da própria leitura',
      opening: 'Abrindo o Sezgi. Se ele não estiver instalado, baixe no Google Play.',
      invalid: 'Este link não leva a lugar nenhum. Você ainda pode instalar o Sezgi.',
      ios: 'Por enquanto o Sezgi está no Android. O iOS está a caminho.',
      desktop: 'O Sezgi funciona no Android. Abra este link no celular ou instale pelo Google Play.',
      install: 'Disponível no Google Play',
      open: 'Abrir no Sezgi',
      ai: 'As leituras são escritas por IA, para reflexão e entretenimento.'
    },
    ru: {
      tagline: 'Таро, гадание на кофейной гуще, сны и гороскоп на сегодня',
      shared: 'Кто-то поделился строкой из своего гадания',
      opening: 'Открываем Sezgi. Если приложение не установлено, скачай его в Google Play.',
      invalid: 'Эта ссылка никуда не ведёт. Sezgi всё равно можно установить.',
      ios: 'Пока Sezgi есть только на Android. Версия для iOS в пути.',
      desktop: 'Sezgi работает на Android. Открой ссылку на телефоне или установи приложение из Google Play.',
      install: 'Скачать в Google Play',
      open: 'Открыть в Sezgi',
      ai: 'Толкования пишет ИИ, для размышления и развлечения.'
    },
    ar: {
      tagline: 'التاروت وقراءة الفنجان وتفسير الأحلام وحظك اليوم',
      shared: 'شارك أحدهم سطرًا من قراءته',
      opening: 'جارٍ فتح Sezgi. إذا لم يكن مثبّتًا، نزّله من Google Play.',
      invalid: 'هذا الرابط لا يؤدي إلى أي مكان. لا يزال بإمكانك تثبيت Sezgi.',
      ios: 'Sezgi متاح على Android حاليًا، ونسخة iOS في الطريق.',
      desktop: 'يعمل Sezgi على Android. افتح هذا الرابط على هاتفك أو ثبّته من Google Play.',
      install: 'احصل عليه من Google Play',
      open: 'افتح في Sezgi',
      ai: 'يكتب الذكاء الاصطناعي القراءات للتأمل والترفيه.'
    },
    hi: {
      tagline: 'टैरो, कॉफ़ी कप पठन, सपनों का अर्थ और आज का राशिफल',
      shared: 'किसी ने अपने पठन से एक पंक्ति साझा की है',
      opening: 'Sezgi खुल रहा है। अगर यह इंस्टॉल नहीं है, तो Google Play से लीजिए।',
      invalid: 'यह लिंक कहीं नहीं ले जाता। फिर भी आप Sezgi इंस्टॉल कर सकते हैं।',
      ios: 'Sezgi अभी Android पर है। iOS जल्द आ रहा है।',
      desktop: 'Sezgi Android पर चलता है। यह लिंक अपने फ़ोन पर खोलिए या Google Play से इंस्टॉल कीजिए।',
      install: 'Google Play पर पाएँ',
      open: 'Sezgi में खोलें',
      ai: 'पठन AI लिखता है, चिंतन और मनोरंजन के लिए।'
    },
    ja: {
      tagline: 'タロット占い、コーヒー占い、夢占い、今日の星座占い',
      shared: '占いの一文がシェアされました',
      opening: 'Sezgiを開いています。インストールしていない場合は、Google Playから入手できます。',
      invalid: 'このリンクの行き先が見つかりませんでした。Sezgiのインストールはこちらから。',
      ios: 'Sezgiはいまのところ Android 版のみです。iOS 版は準備中です。',
      desktop: 'SezgiはAndroidアプリです。スマートフォンでこのリンクを開くか、Google Playからインストールしてください。',
      install: 'Google Play で手に入れよう',
      open: 'Sezgiで開く',
      ai: '読み解きはAIが書いています。ふり返りと楽しみのためのものです。'
    }
  };

  /** App path for a page path, or null when the path is not under /open. */
  function appPathFromPagePath(rawPath) {
    if (rawPath === PREFIX || rawPath === PREFIX + '/') return '/';
    if (typeof rawPath === 'string' && rawPath.indexOf(PREFIX + '/') === 0) {
      return rawPath.slice(PREFIX.length);
    }
    return null;
  }

  /** sezgi:// URL for the page, query passed through unchanged. */
  function appUrlFor(pathname, search) {
    var appPath = appPathFromPagePath(pathname);
    return appPath === null ? null : 'sezgi://' + appPath + (search || '');
  }

  /** First supported language from navigator.languages, else English. */
  function pickLang(languages) {
    var list = languages || [];
    for (var i = 0; i < list.length; i++) {
      var code = String(list[i] || '').toLowerCase().split(/[-_]/)[0];
      if (LANGS.indexOf(code) !== -1) return code;
    }
    return 'en';
  }

  /** Same rule as sanitizeReferralCode in lib/app/router.dart. */
  function sanitizeRef(raw) {
    if (raw === null || raw === undefined) return null;
    var code = String(raw).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!code) return null;
    return code.length > 6 ? code.slice(0, 6) : code;
  }

  /** Play link; with a ref code the install referrer carries it. */
  function storeUrlFor(ref) {
    if (!ref) return STORE_URL;
    return STORE_URL + '&referrer=utm_source%3Dshare%26ref%3D' + encodeURIComponent(ref);
  }

  /** Plain display text: no control characters, collapsed spaces, capped. */
  function cleanText(raw, max) {
    if (raw === null || raw === undefined) return '';
    var text = String(raw)
      .replace(/[\u0000-\u001F\u007F-\u009F​-‏‪-‮⁦-⁩]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length > max) text = text.slice(0, max - 1).trim() + '…';
    return text;
  }

  /** Everything the page shows, computed from the location and the browser. */
  function buildModel(loc, nav) {
    var params = new URLSearchParams(loc.search || '');
    var ua = String(nav.userAgent || '').toLowerCase();
    var isAndroid = /android/.test(ua);
    var isIOS = /iphone|ipad|ipod/.test(ua);
    var lang = pickLang(nav.languages && nav.languages.length ? nav.languages : [nav.language]);
    var t = STRINGS[lang];
    var appUrl = appUrlFor(loc.pathname, loc.search);
    var ref = sanitizeRef(params.get('ref'));

    var message;
    var platform;
    if (isAndroid && appUrl !== null) {
      platform = 'android';
      message = t.opening;
    } else if (isAndroid) {
      platform = 'android-invalid';
      message = t.invalid;
    } else if (isIOS) {
      platform = 'ios';
      message = t.ios;
    } else {
      platform = 'desktop';
      message = t.desktop;
    }

    return {
      lang: lang,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
      strings: t,
      platform: platform,
      appUrl: appUrl,
      bounce: platform === 'android',
      storeUrl: storeUrlFor(ref),
      showInstall: platform !== 'ios',
      showOpen: platform === 'android',
      message: message,
      quote: cleanText(params.get('q'), QUOTE_MAX),
      card: cleanText(params.get('card'), CARD_MAX)
    };
  }

  function setText(doc, id, text) {
    var el = doc.getElementById(id);
    if (el) el.textContent = text;
    return el;
  }

  function render(doc, win) {
    var m = buildModel(win.location, win.navigator);
    if (m.bounce) {
      try { win.location.replace(m.appUrl); } catch (_) {}
    }
    doc.documentElement.lang = m.lang;
    doc.documentElement.dir = m.dir;
    setText(doc, 'tagline', m.strings.tagline);
    setText(doc, 'message', m.message);
    setText(doc, 'ai', m.strings.ai);

    var install = setText(doc, 'cta', m.strings.install);
    if (install) {
      install.href = m.storeUrl;
      install.hidden = !m.showInstall;
    }
    var open = setText(doc, 'open', m.strings.open);
    if (open) {
      if (m.showOpen) open.href = m.appUrl;
      open.hidden = !m.showOpen;
    }

    var box = doc.getElementById('shared');
    if (box && (m.quote || m.card)) {
      setText(doc, 'shared-label', m.strings.shared);
      var q = setText(doc, 'shared-quote', m.quote);
      if (q) q.hidden = !m.quote;
      var c = setText(doc, 'shared-card', m.card);
      if (c) c.hidden = !m.card;
      box.hidden = false;
    }
  }

  var api = {
    appPathFromPagePath: appPathFromPagePath,
    appUrlFor: appUrlFor,
    pickLang: pickLang,
    sanitizeRef: sanitizeRef,
    storeUrlFor: storeUrlFor,
    cleanText: cleanText,
    buildModel: buildModel,
    render: render,
    STRINGS: STRINGS,
    LANGS: LANGS
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else if (root && root.document) {
    render(root.document, root);
  }
})(typeof window !== 'undefined' ? window : this);
