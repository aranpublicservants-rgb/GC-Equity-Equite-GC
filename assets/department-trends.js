/* Department survey results over time (PSES 2018 to 2024), all respondents and by
   employee group, each with the public service result for the same question and cycle.
   Data: assets/department-survey-trends/<id>.json (scripts/build-department-survey-trends.py)
   and assets/department-group-trends/<id>.json (scripts/build-department-group-trends.py).
   A question is followed back only where the published wording is identical; values are
   copied as published. Used by every department page.
   Usage: <script src="../assets/department-trends.js" data-org="dfo" defer>. */
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
  const GROUP_EN = {'Woman': 'Women', 'Indigenous': 'Indigenous employees', 'Person with a disability': 'Persons with a disability',
    'Racialized': 'Racialized employees', 'Black': 'Black employees'};
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const L = (l, en, fr) => l === 'fr' ? fr : en;
  const loc = l => l === 'fr' ? 'fr-CA' : 'en-CA';
  const cycleName = (c, l) => l === 'fr' && c === '2022-23' ? '2022-2023' : c;
  const NP = l => L(l, 'Not published', 'Non publié');
  function cellText(v, q, l) {
    if (!v || v[0] === '') return NP(l);
    const pct = Number(v[0]).toLocaleString(loc(l)) + (l === 'fr' ? ' %' : '%');
    return pct + ' (' + L(l, 'n=', 'n = ') + Number(v[1]).toLocaleString(loc(l)) + (v[2] !== q ? (l === 'fr' ? ' ; ' : '; ') + v[2] : '') + ')';
  }
  function rowsHtml(rows, cycles, l, deptLabel, psLabel) {
    return rows.map(r => '<tr><th scope="row">' + esc(r[l]) + '<span class="dp-trend-who"> · ' + esc(deptLabel) + '</span></th>' +
      cycles.map(c => '<td>' + esc(cellText(r.values[c], r.q, l)) + '</td>').join('') + '</tr>' +
      '<tr class="dp-trend-ps"><th scope="row">' + esc(psLabel) + '</th>' +
      cycles.map(c => '<td>' + esc(cellText(r.ps && r.ps[c], r.q, l)) + '</td>').join('') + '</tr>').join('');
  }
  function table(caption, head, body) {
    return '<div class="table-scroll" role="region" tabindex="0" aria-label="' + esc(caption) + '"><table><caption>' + esc(caption) + '</caption><thead><tr>' +
      head.map(h => '<th scope="col">' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }
  function sourceLine(S, cycles, l) {
    return '<p class="source">' + esc(L(l, 'Source: ', 'Source : ')) + cycles.filter(c => S[c]).map(c => '<a href="' + esc(S[c].url) + '">' +
      esc(L(l, 'PSES ', 'SAFF ') + cycleName(c, l)) + '</a>').join(' · ') + '</p>';
  }
  const head = (cycles, l) => [L(l, 'Question (2024 wording)', 'Question (libellé de 2024)'), ...cycles.map(c => cycleName(c, l))];
  const NOTE = l => L(l, 'A question is followed back only where the published wording is identical. Earlier question numbers are shown after the response count when they differ. Each question has two rows: the organization, then the whole public service for the same question and cycle. Response counts are rounded by the publisher. Differences are not tested for statistical significance.',
    'Une question n’est suivie dans le temps que si son libellé publié est identique. Les anciens numéros de question figurent après le nombre de réponses lorsqu’ils diffèrent. Chaque question compte deux lignes : l’organisme, puis l’ensemble de la fonction publique pour la même question et le même cycle. Les nombres de réponses sont arrondis par l’éditeur. Les écarts ne font pas l’objet d’un test de signification statistique.');
  function overallBlock(T, rows, gaps, l) {
    const caption = L(l, 'PSES 2018 to 2024, all respondents', 'SAFF de 2018 à 2024, tous les répondants');
    return '<div class="dp-trend"><h3>' + esc(L(l, 'Results over time', 'Résultats au fil du temps')) + '</h3>' +
      table(caption, head(T.cycles, l), rowsHtml(rows, T.cycles, l, L(l, 'this organization', 'cet organisme'), L(l, 'Public service, all respondents', 'Fonction publique, tous les répondants'))) +
      sourceLine(T.sources, T.cycles, l) + '<p class="small dp-trend-note">' + esc(NOTE(l) + (gaps.length ? ' ' + L(l, 'Not compared because the wording changed: ', 'Non comparées, car le libellé a changé : ') + gaps.join(', ') + '.' : '')) + '</p></div>';
  }
  function groupBlock(G, g, rows, l) {
    const name = l === 'fr' ? g.fr : (GROUP_EN[g.group] || g.group);
    const labelRow = '<tr><th scope="row">' + esc(L(l, 'Group as published in each cycle', 'Groupe tel que publié à chaque cycle')) + '</th>' +
      G.cycles.map(c => '<td>' + esc(g.published[c] ? g.published[c][l === 'fr' ? 1 : 0] : NP(l)) + '</td>').join('') + '</tr>';
    const caption = L(l, 'PSES 2018 to 2024, ', 'SAFF de 2018 à 2024, ') + name;
    return '<details class="dp-group-trend"><summary>' + esc(name) + '</summary>' +
      table(caption, head(G.cycles, l), labelRow + rowsHtml(rows, G.cycles, l, name + L(l, ', this organization', ', cet organisme'), name + L(l, ', public service', ', fonction publique'))) +
      sourceLine(G.sources, G.cycles, l) + '</details>';
  }
  const GROUP_NOTE = l => L(l, 'Group definitions changed between cycles. Earlier cycles asked about sex or gender with different wording, used the terms Aboriginal and visible minority, and asked different disability questions. In 2022-23 the racialized group excludes Indigenous respondents. The label each cycle published is shown in the first row of each table. Categories that were split or merged between cycles are not followed. Treat differences between cycles with care. Suppressed results are not shown, and a group is followed only where at least two cycles were published.',
    'Les définitions des groupes ont changé d’un cycle à l’autre. Les premiers cycles posaient la question sur le sexe ou le genre autrement, employaient les termes Autochtone et minorité visible, et posaient d’autres questions sur le handicap. En 2022-2023, le groupe racisé exclut les répondants autochtones. La première ligne de chaque tableau indique le libellé publié à chaque cycle. Les catégories scindées ou regroupées d’un cycle à l’autre ne sont pas suivies. Interprétez les écarts entre les cycles avec prudence. Les résultats supprimés ne sont pas présentés, et un groupe n’est suivi que si au moins deux cycles ont été publiés.');
  function sectionFor(id) { const h = document.getElementById(id); return h && h.closest('section'); }
  function place(section, node, after) {
    if (after && after.parentNode) { after.after(node); return; }
    const survey = section.querySelector('.dp-survey');
    if (survey) { survey.after(node); return; }
    const tools = section.querySelector('.section-tools');
    if (tools) tools.before(node); else section.append(node);
  }
  const placed = new Map();
  function renderOverall(T) {
    if (!T) return;
    for (const s of SECTIONS) for (const l of ['en', 'fr']) {
      const section = sectionFor(s[l]);
      if (!section || section.querySelector('.dp-trend')) continue;
      const rows = T.rows.filter(r => s.qs.includes(r.q)), gaps = s.qs.filter(q => T.notComparable.includes(q));
      if (!rows.length) continue;
      const wrap = document.createElement('div');
      wrap.innerHTML = overallBlock(T, rows, gaps, l);
      const node = wrap.firstChild;
      place(section, node);
      placed.set(section, node);
    }
  }
  function renderGroups(G) {
    if (!G) return;
    for (const s of SECTIONS) for (const l of ['en', 'fr']) {
      const section = sectionFor(s[l]);
      if (!section || section.querySelector('.dp-group-trends')) continue;
      const parts = kind => G.groups.filter(g => (g.kind || 'group') === kind).map(g => [g, g.rows.filter(r => s.qs.includes(r.q))])
        .filter(([, rows]) => rows.length).map(([g, rows]) => groupBlock(G, g, rows, l)).join('');
      const main = parts('group'), sub = parts('subgroup');
      if (!main && !sub) continue;
      const wrap = document.createElement('div');
      wrap.className = 'dp-group-trends';
      wrap.innerHTML = (main ? '<h3>' + esc(L(l, 'Results over time by employee group', 'Résultats au fil du temps par groupe d’employés')) + '</h3>' + main : '') +
        (sub ? '<h3>' + esc(L(l, 'Results over time by subgroup', 'Résultats au fil du temps par sous-groupe')) + '</h3>' + sub : '') +
        '<p class="small dp-trend-note">' + esc(GROUP_NOTE(l)) + '</p>';
      place(section, wrap, placed.get(section));
    }
  }
  const get = path => fetch(new URL(path + org + '.json', base)).then(r => r.ok ? r.json() : null).catch(() => null);
  get('department-survey-trends/').then(renderOverall).finally(() => get('department-group-trends/').then(renderGroups));
})();
