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
    { href: '/#wiki', label: 'Wiki', match: { hash: 'wiki', path: '/wiki' } },
    { href: '/#news', label: 'News', match: { hash: 'news' } },
    { href: '/contributions.html', label: 'Contributions', match: { path: '/contributions' } },
    { href: '/#download', label: 'Download', match: { hash: 'download' } },
    { href: '/links.html', label: 'Links', match: { path: '/links' } },
    { href: '/whitepaper.html', label: 'White Paper', match: { path: '/whitepaper' } },
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
    s.textContent =
      '.cr-nav{display:flex;flex-wrap:wrap;align-items:center;gap:4px;justify-content:flex-end}' +
      '.cr-nav a{display:inline-block;padding:8px 12px;border-radius:6px;color:#e8dcc0;' +
      'text-decoration:none;font:700 13px/1 "Segoe UI",system-ui,sans-serif;letter-spacing:.4px;' +
      'white-space:nowrap;border:1px solid transparent;transition:color .12s,background .12s}' +
      '.cr-nav a:hover,.cr-nav a:focus-visible{color:#ffd166;background:rgba(255,209,102,.12);' +
      'border-color:rgba(255,209,102,.4);outline:none}' +
      '.cr-nav a[aria-current="page"]{color:#ffd166;background:rgba(255,209,102,.16);' +
      'box-shadow:inset 0 -2px 0 #ffd166}' +
      '@media(max-width:820px){.cr-nav{justify-content:flex-start}.cr-nav a{padding:6px 9px;font-size:12px}}';
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
