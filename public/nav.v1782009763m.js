// SINGLE SOURCE OF TRUTH for the site nav bar.
//
// Every standalone page (links / wiki / whitepaper / contributions) and the
// dashboard chrome render their nav from THIS list. To change the nav, edit
// CR_NAV_ITEMS here — nowhere else. Pages must not hand-write <a> nav links.
//
// Usage in a standalone page:
//   <nav class="nav" data-cr-nav aria-label="Main navigation"></nav>
//   <script src="/nav.js" defer></script>
// nav.js fills every [data-cr-nav] with the canonical links and marks the
// current page active by pathname/hash.
(function () {
  // Canonical nav. `match` is how we decide the active item for the current
  // page: a pathname prefix or a hash.
  var ITEMS = [
    { href: '/#play', label: 'Play', match: { hash: 'play', home: true } },
    { href: '/#highscores', label: 'High Scores', match: { hash: 'highscores' } },
    { href: '/wiki.html', label: 'Wiki', match: { hash: 'wiki', path: '/wiki' } },
    { href: '/#news', label: 'News', match: { hash: 'news' } },
    { href: '/contributions.html', label: 'Contributions', match: { hash: 'contributions', path: '/contributions' } },
    { href: '/#download', label: 'Download', match: { hash: 'download' } },
    { href: '/links.html', label: 'Links', match: { hash: 'links', path: '/links' } },
    { href: '/whitepaper.html', label: 'White Paper', match: { hash: 'whitepaper', path: '/whitepaper' } },
    { href: '/#login', label: 'Login/Register', match: { hash: 'login' } },
  ];

  function isActive(item) {
    var path = location.pathname.toLowerCase();
    var m = item.match || {};
    if (m.path && path.indexOf(m.path) === 0) return true;
    // On the home page, no standalone path matches; leave hash-actives to the SPA.
    return false;
  }

  // Inject self-contained nav styles ONCE, so the nav looks correct on every
  // page regardless of that page's own .nav CSS (which was clashing — washed
  // out, overlapping text). High contrast, wraps, scoped to .cr-nav.
  function ensureStyle() {
    if (document.getElementById('cr-nav-style')) return;
    var s = document.createElement('style');
    s.id = 'cr-nav-style';
    // Pixel-match the homepage .nav-link look (Cinzel serif, gold, glow) so the
    // standalone pages are visually identical to the homepage nav. Values are
    // the resolved homepage CSS vars (standalone pages don't define them).
    s.textContent =
      '.cr-nav{display:flex;flex-wrap:wrap;align-items:center;gap:8px;justify-content:flex-end}' +
      '.cr-nav a{display:inline-flex;align-items:center;justify-content:center;min-height:32px;' +
      'padding:6px 16px;border:1px solid transparent;border-radius:4px;background:transparent;' +
      'color:#998d6a;text-decoration:none;white-space:nowrap;' +
      "font-family:'Cinzel','Palatino Linotype',Palatino,Georgia,serif;font-size:13.5px;letter-spacing:.5px;" +
      'transition:color .2s,border-color .2s,box-shadow .2s,background-color .2s}' +
      '.cr-nav a:hover,.cr-nav a:focus-visible{color:#ffd100;border-color:#c8a838;' +
      'box-shadow:0 0 8px rgba(255,209,0,.2);background-color:rgba(255,209,0,.03);outline:none}' +
      '.cr-nav a[aria-current="page"]{color:#ffd100;border-color:#c8a838;' +
      'background:linear-gradient(180deg,rgba(200,168,56,.2) 0%,rgba(110,90,42,.05) 60%,rgba(11,11,18,.4) 100%);' +
      'box-shadow:inset 0 0 5px rgba(255,209,0,.15),0 0 8px rgba(255,209,0,.2)}' +
      '@media(max-width:820px){.cr-nav{justify-content:center;width:100%}}';
    document.head.appendChild(s);
  }

  function render(navEl) {
    ensureStyle();
    // Own the class so host-page .nav rules can't wash it out.
    navEl.classList.add('cr-nav');
    var html = ITEMS.map(function (it) {
      var active = isActive(it) ? ' aria-current="page"' : '';
      return '<a href="' + it.href + '"' + active + '>' + it.label + '</a>';
    }).join('');
    navEl.innerHTML = html;
  }

  function run() {
    // Standalone pages: fill the [data-cr-nav] placeholder with link-nav.
    var navs = document.querySelectorAll('[data-cr-nav]');
    for (var i = 0; i < navs.length; i++) render(navs[i]);

    // Homepage SPA: the nav buttons are interactive (in-page view switches), so
    // we DON'T replace them — we keep their labels in sync with this single
    // source instead, so the homepage can never drift from the standalone pages.
    // Match the existing .homepage-nav .nav-list items to ITEMS by order.
    var spaList = document.querySelector('.homepage-nav .nav-list');
    if (spaList) {
      var spaLinks = spaList.querySelectorAll('.nav-link');
      // Only resync if the count matches (same item set) — otherwise leave the
      // hand-authored markup alone rather than mangle it.
      if (spaLinks.length === ITEMS.length) {
        for (var j = 0; j < spaLinks.length; j++) {
          // Preserve i18n: if the element has data-i18n, the translator owns the
          // text; only set text when there's no translation key.
          if (!spaLinks[j].hasAttribute('data-i18n')) spaLinks[j].textContent = ITEMS[j].label;
        }
      }
    }
  }

  // Expose the canonical list so the in-app SPA / dashboard chrome can reuse it
  // instead of keeping its own copy.
  window.CR_NAV_ITEMS = ITEMS;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
