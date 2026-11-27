/* Results over time (PSES 2018 to 2024) for the dedicated DFO, DND and ISC pages.
   Data: assets/department-survey-trends/<id>.json, built from the published subset 1 file
   of each survey cycle by scripts/build-department-survey-trends.py. A question is
   followed back only where the published wording is identical; values are copied as
   published. Usage: <script src="../assets/department-trends.js" data-org="dfo" defer>. */
(() => {
  'use strict';
  const me = document.currentScript, org = me && me.dataset.org;
  // The dedicated pages share their header with generated pages: run only on the page named.
  if (!org || !new RegExp('/' + org + '/(index\\.html)?$').test(location.pathname)) return;
  const base = new URL('.', me.src);
  const SECTIONS = [
    {en: 'experience', fr: 'experience-fr', qs: ['Q12','Q24','Q25','Q42','Q43','Q45','Q47','Q49','Q51','Q52','Q53','Q77','Q78','Q81']},
    {en: 'harassment', fr: 'harcelement', qs: ['Q58','Q65','Q24','Q42','Q63','Q70','Q72']},
    {en: 'accommodation', fr: 'mesures-adaptation', qs: ['Q84','Q85','Q86','Q87','Q88','Q44e','Q73p','Q73q']}
  ];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const L = (l, en, fr) => l === 'fr' ? fr : en;
  const cycleName = (c, l) => l === 'fr' && c === '2022-23' ? '2022-2023' : c;
  const pct = (v, l) => v === '' || v === undefined ? L(l, 'Not published', 'Non publié') : Number(v).toLocaleString(l === 'fr' ? 'fr-CA' : 'en-CA') + (l === 'fr' ? ' %' : '%');
  function block(T, rows, gaps, l, title) {
    const head = [L(l, 'Question (2024 wording)', 'Question (libellé de 2024)'), ...T.cycles.map(c => cycleName(c, l))];
    const body = rows.map(r => '<tr><th scope="row">' + esc(r[l]) + '</th>' + T.cycles.map(c => {
      const v = r.values[c];
      if (!v) return '<td>' + esc(L(l, 'Not published', 'Non publié')) + '</td>';
      const n = Number(v[1]).toLocaleString(l === 'fr' ? 'fr-CA' : 'en-CA');
      return '<td>' + esc(pct(v[0], l) + ' (' + L(l, 'n=', 'n = ') + n + (v[2] !== r.q ? (l === 'fr' ? ' ; ' : '; ') + v[2] : '') + ')') + '</td>';
    }).join('') + '</tr>').join('');
    const links = T.cycles.filter(c => T.sources[c]).map(c => '<a href="' + esc(T.sources[c].url) + '">' + esc(L(l, 'PSES ' + c + ', subset 1', 'SAFF ' + cycleName(c, l) + ', sous-ensemble 1')) + '</a>').join(' · ');
    const caption = L(l, 'PSES 2018 to 2024, all respondents', 'SAFF de 2018 à 2024, tous les répondants');
    return '<div class="dp-trend"><h3>' + esc(title) + '</h3><div class="table-scroll" role="region" tabindex="0" aria-label="' + esc(caption) + '"><table><caption>' + esc(caption) + '</caption><thead><tr>' +
      head.map(h => '<th scope="col">' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' + body + '</tbody></table></div><p class="source">' + esc(L(l, 'Source: ', 'Source : ')) + links + '</p><p class="small dp-trend-note">' +
      esc(L(l, 'A question is followed back only where the published wording is identical. Earlier question numbers are shown after the response count when they differ. Response counts are rounded by the publisher. Differences between cycles are not tested for statistical significance.',
        'Une question n’est suivie dans le temps que si son libellé publié est identique. Les anciens numéros de question figurent après le nombre de réponses lorsqu’ils diffèrent. Les nombres de réponses sont arrondis par l’éditeur. Les écarts entre les cycles ne font pas l’objet d’un test de signification statistique.') +
        (gaps.length ? ' ' + L(l, 'Not compared because the wording changed: ', 'Non comparées, car le libellé a changé : ') + gaps.join(', ') + '.' : '')) + '</p></div>';
  }
  const parts = (me.dataset.parts || 'overall,groups').split(',');
  function groupBlock(G, g, rows, l) {
    const head = [L(l, 'Question (2024 wording)', 'Question (libellé de 2024)'), ...G.cycles.map(c => cycleName(c, l))];
    const labelRow = '<tr><th scope="row">' + esc(L(l, 'Group as published in each cycle', 'Groupe tel que publié à chaque cycle')) + '</th>' +
      G.cycles.map(c => '<td>' + esc(g.published[c] ? g.published[c][l === 'fr' ? 1 : 0] : L(l, 'Not published', 'Non publié')) + '</td>').join('') + '</tr>';
    const body = rows.map(r => '<tr><th scope="row">' + esc(r[l]) + '</th>' + G.cycles.map(c => {
      const v = r.values[c];
      if (!v) return '<td>' + esc(L(l, 'Not published', 'Non publié')) + '</td>';
      const n = Number(v[1]).toLocaleString(l === 'fr' ? 'fr-CA' : 'en-CA');
      return '<td>' + esc(pct(v[0], l) + ' (' + L(l, 'n=', 'n = ') + n + (v[2] !== r.q ? (l === 'fr' ? ' ; ' : '; ') + v[2] : '') + ')') + '</td>';
    }).join('') + '</tr>').join('');
    const name = l === 'fr' ? g.fr : g.group === 'Woman' ? 'Women' : g.group === 'Person with a disability' ? 'Persons with a disability' : g.group === 'Black' ? 'Black employees' : g.group === 'Racialized' ? 'Racialized employees' : 'Indigenous employees';
    const caption = L(l, 'PSES 2018 to 2024, ', 'SAFF de 2018 à 2024, ') + name;
    const links = G.cycles.filter(c => G.sources[c]).map(c => '<a href="' + esc(G.sources[c].url) + '">' + esc(L(l, 'PSES ', 'SAFF ') + cycleName(c, l)) + '</a>').join(' · ');
    return '<details class="dp-group-trend"><summary>' + esc(name) + '</summary><div class="table-scroll" role="region" tabindex="0" aria-label="' + esc(caption) + '"><table><caption>' + esc(caption) +
      '</caption><thead><tr>' + head.map(h => '<th scope="col">' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' + labelRow + body + '</tbody></table></div><p class="source">' + esc(L(l, 'Source: ', 'Source : ')) + links + '</p></details>';
  }
  function renderGroups(G) {
    if (!G) return;
    for (const s of SECTIONS) for (const l of ['en', 'fr']) {
      const heading = document.getElementById(s[l]);
      const section = heading && heading.closest('section');
      if (!section || section.querySelector('.dp-group-trends')) continue;
      const html = G.groups.map(g => [g, g.rows.filter(r => s.qs.includes(r.q))]).filter(([, rows]) => rows.length).map(([g, rows]) => groupBlock(G, g, rows, l)).join('');
      if (!html) continue;
      const wrap = document.createElement('div');
      wrap.className = 'dp-group-trends';
      wrap.innerHTML = '<h3>' + esc(L(l, 'Results over time by employee group', 'Résultats au fil du temps par groupe d’employés')) + '</h3>' + html +
        '<p class="small dp-trend-note">' + esc(L(l, 'Group definitions changed between cycles. Earlier cycles asked about sex or gender with different wording, used the terms Aboriginal and visible minority, and asked different disability questions. In 2022-23 the racialized group excludes Indigenous respondents. The label each cycle published is shown in the first row. Treat differences between cycles with care. Suppressed results are not shown, and a group is followed only where at least two cycles were published.',
          'Les définitions des groupes ont changé d’un cycle à l’autre. Les premiers cycles posaient la question sur le sexe ou le genre autrement, employaient les termes Autochtone et minorité visible, et posaient d’autres questions sur le handicap. En 2022-2023, le groupe racisé exclut les répondants autochtones. La première ligne indique le libellé publié à chaque cycle. Interprétez les écarts entre les cycles avec prudence. Les résultats supprimés ne sont pas présentés, et un groupe n’est suivi que si au moins deux cycles ont été publiés.')) + '</p>';
      const tools = section.querySelector('.section-tools');
      (tools ? tools.before.bind(tools) : section.append.bind(section))(wrap);
    }
  }
  const loadGroups = () => { if (parts.includes('groups')) fetch(new URL('department-group-trends/' + org + '.json', base)).then(r => r.ok ? r.json() : null).then(renderGroups).catch(() => {}); };
  if (!parts.includes('overall')) loadGroups();
  else fetch(new URL('department-survey-trends/' + org + '.json', base)).then(r => r.ok ? r.json() : null).then(T => {
    if (!T) return;
    for (const s of SECTIONS) for (const l of ['en', 'fr']) {
      const heading = document.getElementById(s[l]);
      const section = heading && heading.closest('section');
      if (!section || section.querySelector('.dp-trend')) continue;
      const rows = T.rows.filter(r => s.qs.includes(r.q)), gaps = s.qs.filter(q => T.notComparable.includes(q));
      if (!rows.length) continue;
      const wrap = document.createElement('div');
      wrap.innerHTML = block(T, rows, gaps, l, L(l, 'Results over time', 'Résultats au fil du temps'));
      const tools = section.querySelector('.section-tools');
      (tools ? tools.before.bind(tools) : section.append.bind(section))(wrap.firstChild);
    }
  }).catch(() => {}).finally(loadGroups);
})();
