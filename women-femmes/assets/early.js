/* Runs before the page renders: language, colours and text size, so the page does not flash. */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  function pref(k) { try { return localStorage.getItem('wph-' + k); } catch (e) { return null; } }
  var lang = null;
  try { lang = new URLSearchParams(location.search).get('lang'); } catch (e) { lang = null; }
  if (lang !== 'fr' && lang !== 'en') lang = pref('lang');
  if (lang !== 'fr' && lang !== 'en') lang = (navigator.language || 'en').toLowerCase().indexOf('fr') === 0 ? 'fr' : 'en';
  root.setAttribute('lang', lang === 'fr' ? 'fr-CA' : 'en-CA');
  var t = pref('theme');
  if (t !== 'light' && t !== 'dark' && t !== 'contrast') {
    t = (window.matchMedia && window.matchMedia('(prefers-contrast: more)').matches) ? 'contrast'
      : ((window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light');
  }
  root.setAttribute('data-theme', t);
  var s = Number(pref('size') || 0);
  if (s > 0 && s < 4) root.classList.add('fs-' + s);
  if (pref('easy') === '1') root.classList.add('easy');
  if (pref('altfont') === '1') root.classList.add('altfont');
})();
