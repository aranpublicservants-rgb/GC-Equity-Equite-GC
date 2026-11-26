/* Language and navigation only. Workplace answers are never stored here. */
(() => {
  'use strict';
  const root = document.documentElement;
  function sync() {
    const lang = root.lang === 'fr' ? 'fr' : 'en';
    for (const node of document.querySelectorAll('[data-en][data-fr]')) {
      node.textContent = node.dataset[lang];
    }
    const url = new URL(location.href);
    if (lang === 'fr') url.searchParams.set('lang', 'fr');
    else url.searchParams.delete('lang');
    history.replaceState(null, '', url);
    for (const a of document.querySelectorAll('a[href]')) {
      const raw = a.getAttribute('href');
      if (!raw || raw.startsWith('#') || a.hasAttribute('download')) continue;
      const dest = new URL(raw, location.href);
      if (dest.origin !== location.origin || !dest.pathname.includes('/recourse/')) continue;
      if (/\.(json|csv|txt|pdf|md)$/.test(dest.pathname)) continue;
      if (lang === 'fr') dest.searchParams.set('lang', 'fr');
      else dest.searchParams.delete('lang');
      a.setAttribute('href', dest.pathname + dest.search + dest.hash);
    }
    const button = document.getElementById('site-language');
    if (button) { button.textContent = lang === 'fr' ? 'English' : 'Français'; button.lang = lang === 'fr' ? 'en' : 'fr'; }
    document.dispatchEvent(new CustomEvent('recourse:language', {detail: lang}));
  }
  const requested = new URLSearchParams(location.search).get('lang');
  if (requested === 'fr') root.lang = 'fr';
  new MutationObserver(sync).observe(root, {attributes: true, attributeFilter: ['lang']});
  document.getElementById('site-language')?.addEventListener('click', () => { root.lang = root.lang === 'fr' ? 'en' : 'fr'; });
  // Guidance adds links after each answer. Carry the language through those too.
  document.addEventListener('click', event => {
    const a = event.target.closest?.('a[href]');
    if (!a || a.hasAttribute('download') || a.getAttribute('href').startsWith('#')) return;
    const dest = new URL(a.href, location.href);
    if (dest.origin !== location.origin || !dest.pathname.includes('/recourse/') || /\.(json|csv|txt|pdf|md)$/.test(dest.pathname)) return;
    if (root.lang === 'fr') dest.searchParams.set('lang', 'fr'); else dest.searchParams.delete('lang');
    a.href = dest.pathname + dest.search + dest.hash;
  }, true);
  function revealHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    let node = target;
    while (node) { if (node.tagName === 'DETAILS') node.open = true; node = node.parentElement; }
    if (['assistant','costs','directorysection'].includes(target.id)) target.querySelector('details')?.setAttribute('open', '');
    target.scrollIntoView({block: 'start'});
  }
  addEventListener('hashchange', revealHash);
  sync();
  if (location.hash) requestAnimationFrame(revealHash);
})();
