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

  function render(navEl) {
    // Preserve the brand/logo if the page put it inside the nav; we only
    // replace the link list. Standalone pages use a bare <nav> for links.
    var html = ITEMS.map(function (it) {
      var active = isActive(it) ? ' aria-current="page"' : '';
      return '<a href="' + it.href + '"' + active + '>' + it.label + '</a>';
    }).join('');
    navEl.innerHTML = html;
  }

  function run() {
    var navs = document.querySelectorAll('[data-cr-nav]');
    for (var i = 0; i < navs.length; i++) render(navs[i]);
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
