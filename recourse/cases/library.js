/* Filter the published selection locally. No search text is sent to a server. */
(() => {
  'use strict';
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function matches(c, f) {
    return (!f.ground || (c.grounds || []).includes(f.ground)) &&
      (!f.issue || (c.issues || []).includes(f.issue)) &&
      (!f.scope || c.scope === f.scope) && (!f.body || c.route === f.body) &&
      (!f.outcome || c.status === f.outcome) && (!f.q || normalize([
        c.title, c.citation, c.body, c.what, c.what_fr, c.factors, c.factors_fr,
        c.outcome, c.outcome_fr, c.scope, ...(c.issues || [])
      ].join(' ')).includes(normalize(f.q).trim()));
  }
  const csvCell = value => '"' + String(value ?? '').replace(/^[=+@-]/, x => "'" + x).replace(/"/g, '""') + '"';
  if (typeof module !== 'undefined') module.exports = {matches, normalize, csvCell};
  if (typeof document === 'undefined') return;
  const $ = id => document.getElementById(id), size = 12;
  let records = [], filtered = [], meta = null, page = 0, lang = document.documentElement.lang === 'fr' ? 'fr' : 'en';
  const t = (en, fr) => lang === 'fr' ? fr : en;
  const label = pair => Array.isArray(pair) ? pair[lang === 'fr' ? 1 : 0] : pair;
  const fields = {q: 'q', ground: 'f-ground', issue: 'f-issue', scope: 'f-scope', body: 'f-body', outcome: 'f-outcome'};
  function el(tag, text, parent, className) {
    const node = document.createElement(tag); if (text != null) node.textContent = text;
    if (className) node.className = className; if (parent) parent.appendChild(node); return node;
  }
  function source(parent, title, url) {
    try { if (new URL(url).protocol !== 'https:') return; } catch { return; }
    const a = el('a', title, parent); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
  }
  function options(id, mapping, all) {
    const select = $(id), previous = select.value; select.replaceChildren();
    const first = el('option', all, select); first.value = '';
    Object.entries(mapping).sort((a, b) => label(a[1]).localeCompare(label(b[1]), lang)).forEach(([key, pair]) => {
      const option = el('option', label(pair), select); option.value = key;
    }); select.value = previous;
    if (select.selectedIndex < 0) select.value = '';
  }
  function setOptions() {
    options('f-ground', meta.grounds, t('All grounds and themes', 'Tous les motifs et thèmes'));
    options('f-issue', meta.issues, t('All workplace issues', 'Toutes les questions'));
    options('f-scope', meta.scope, t('All employment contexts', 'Tous les contextes d’emploi'));
    options('f-body', Object.fromEntries(Object.entries(meta.routes).filter(([key]) => records.some(c => c.route === key)).map(([key, v]) => [key, v.name])), t('All decision-makers', 'Tous les organismes'));
    options('f-outcome', meta.outcomes, t('All results', 'Tous les résultats'));
    $('q').placeholder = t('Example: promotion, accommodation, a citation', 'Exemple : promotion, adaptation, une référence');
  }
  function getFilters() { return Object.fromEntries(Object.entries(fields).map(([key, id]) => [key, $(id).value.trim()])); }
  function apply(reset = true) {
    if (reset) page = 0;
    const f = getFilters(); filtered = records.filter(c => matches(c, f));
    page = Math.min(page, Math.max(0, Math.ceil(filtered.length / size) - 1));
    render();
  }
  function card(c, parent) {
    const a = el('article', null, parent, 'case'); a.id = c.id;
    el('p', label(meta.scope[c.scope]) || c.scope, a, 'case-context');
    el('h3', c.title, a); el('p', c.citation, a, 'citation');
    el('p', c.body, a, 'meta');
    el('p', t('Result: ', 'Résultat : ') + (label(meta.outcomes[c.status]) || c.status), a, 'result');
    const tags = el('p', null, a, 'tags');
    for (const g of c.grounds || []) el('span', label(meta.grounds[g]) || g, tags, 'tag');
    el('p', lang === 'fr' ? (c.what_fr || c.what) : c.what, a);
    const detail = el('details', null, a); el('summary', t('Reasons, result and source limits', 'Motifs, résultat et limites de la source'), detail);
    el('h4', t('What was considered', 'Facteurs examinés'), detail);
    el('p', lang === 'fr' ? (c.factors_fr || c.factors) : c.factors, detail);
    el('h4', t('What happened next', 'Suite du dossier'), detail);
    el('p', lang === 'fr' ? (c.outcome_fr || c.outcome) : c.outcome, detail);
    if (c.finding === 'not-separately-classified') el('p', t('The discrimination finding has not been separately classified. This result must not be read as proof of discrimination.', 'La conclusion sur la discrimination n’a pas été classifiée séparément. Ce résultat ne constitue pas une preuve de discrimination.'), detail, 'source-limit');
    if (['secondary-summary', 'representative-statement'].includes(c.sourceType)) el('p', t('This entry relies on a published secondary summary or representative statement. Consult the primary reasons before relying on it.', 'Cette entrée repose sur un résumé secondaire ou une déclaration de représentant. Consultez les motifs originaux avant de vous y fier.'), detail, 'source-limit');
    if (c.sourceNote) el('p', lang === 'fr' ? (c.sourceNote_fr || c.sourceNote) : c.sourceNote, detail, 'source-limit');
    el('p', t('Source type: ', 'Type de source : ') + ({'full-decision':t('Full decision', 'Décision intégrale'),'official-summary':t('Official summary', 'Sommaire officiel'),'official-decision':t('Official decision', 'Décision officielle'),'secondary-summary':t('Secondary summary', 'Résumé secondaire'),'representative-statement':t('Representative statement', 'Déclaration de représentant')}[c.sourceType] || c.sourceType || t('See source', 'Consulter la source')), detail, 'meta');
    if (/annual-report|\/nav.do|\/faq.html|search-human-rights-decisions|case-summaries|investigation-summaries|\/results\/?$|summaries-investigation/.test(c.url)) el('p', t('The source link opens a collection or report. Use the citation above to find the relevant record.', 'Le lien mène à une collection ou un rapport. Utilisez la référence ci-dessus pour trouver le dossier.'), a, 'meta');
    source(a, t('Open the source', 'Consulter la source'), lang === 'fr' ? (c.url_fr || c.url) : c.url);
  }
  function render() {
    const root = $('body-decisions'); root.replaceChildren();
    const start = page * size, end = Math.min(start + size, filtered.length);
    filtered.slice(start, end).forEach(c => card(c, root));
    $('showing').textContent = filtered.length ? t(`${start + 1}–${end} of ${filtered.length} matching records · ${records.length} in the library`, `${start + 1}–${end} sur ${filtered.length} dossiers correspondants · ${records.length} dans la bibliothèque`) : t('0 matching records', 'Aucun dossier correspondant');
    $('noresults').hidden = filtered.length > 0;
    $('previous-page').disabled = page === 0; $('next-page').disabled = end >= filtered.length;
    $('page-number').textContent = t(`Page ${page + 1} of ${Math.max(1, Math.ceil(filtered.length / size))}`, `Page ${page + 1} sur ${Math.max(1, Math.ceil(filtered.length / size))}`);
    $('download-results').disabled = !filtered.length;
  }
  function research() {
    const root = $('route-list'); root.replaceChildren();
    for (const [key, route] of Object.entries(meta.routes)) {
      const detail = el('details', null, root); el('summary', label(route.name), detail);
      for (const p of route.notes[lang === 'fr' ? 1 : 0]) el('p', p, detail);
      el('p', t('Indexed records: ', 'Dossiers indexés : ') + records.filter(c => c.route === key).length, detail, 'meta');
    }
    const counts = $('coverage-counts'); counts.replaceChildren();
    const table = el('table', null, counts); el('caption', t('Records by employment context', 'Dossiers par contexte d’emploi'), table);
    const head = el('tr', null, el('thead', null, table)); el('th', t('Context', 'Contexte'), head).scope = 'col'; el('th', t('Records', 'Dossiers'), head).scope = 'col';
    const body = el('tbody', null, table);
    for (const [key, pair] of Object.entries(meta.scope)) { const row = el('tr', null, body); el('th', label(pair), row).scope = 'row'; el('td', records.filter(c => c.scope === key).length, row); }
    $('a2aj-language').value = lang;
  }
  async function load() {
    $('library-error').hidden = true;
    $('showing').textContent = t('Loading records…', 'Chargement des dossiers…');
    try {
      const responses = await Promise.all([fetch('../data/cases.json', {credentials:'omit'}), fetch('./library-meta.json?v=20261116-5', {credentials:'omit'})]);
      if (responses.some(r => !r.ok)) throw Error('source unavailable');
      const [data, metadata] = await Promise.all(responses.map(r => r.json()));
      if (!Array.isArray(data.cases) || !metadata.routes) throw Error('invalid data');
      records = data.cases; meta = metadata; setOptions(); research(); apply();
      const id = decodeURIComponent(location.hash.slice(1)), index = filtered.findIndex(c => c.id === id);
      if (index >= 0) { page = Math.floor(index / size); render(); document.getElementById(id)?.scrollIntoView(); }
    } catch {
      $('library-error').hidden = false; $('showing').textContent = t('Records unavailable', 'Dossiers indisponibles');
    }
  }
  for (const id of Object.values(fields)) $(id).addEventListener(id === 'q' ? 'input' : 'change', () => { if (meta) apply(); });
  $('reset').addEventListener('click', () => { for (const id of Object.values(fields)) $(id).value = ''; if (meta) apply(); $('q').focus(); });
  for (const [id, delta] of [['previous-page', -1], ['next-page', 1]]) $(id).addEventListener('click', () => { page += delta; render(); $('results-heading').focus(); $('results-heading').scrollIntoView({block:'start'}); });
  $('download-results').addEventListener('click', () => {
    const header = [t('Title','Titre'),t('Citation','Référence'),t('Decision-maker','Organisme'),t('Context','Contexte'),t('Result','Résultat'),t('Facts','Faits'),t('Factors','Facteurs'),t('Outcome','Suite'),t('Source type','Type de source'),t('Source','Source')];
    const rows = filtered.map(c => [c.title,c.citation,c.body,label(meta.scope[c.scope]),label(meta.outcomes[c.status]),lang==='fr'?c.what_fr:c.what,lang==='fr'?c.factors_fr:c.factors,lang==='fr'?c.outcome_fr:c.outcome,c.sourceType,lang==='fr'?(c.url_fr||c.url):c.url]);
    const url = URL.createObjectURL(new Blob(['\ufeff'+[header,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const a = el('a'); a.href = url; a.download = lang==='fr'?'decisions-recours.csv':'recourse-decisions.csv'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  $('retry-library').addEventListener('click', load);
  document.addEventListener('recourse:language', event => {lang=event.detail;document.title=t('Decision library | Public service recourse','Bibliothèque des décisions | Recours dans la fonction publique');if(meta){setOptions();research();apply(false)}});
  load();
})();
