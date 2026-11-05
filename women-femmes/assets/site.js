/* Women public servants data hub: language, display settings, sortable tables and the two data tools.
   No tracking, no external requests except the site's own data files. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');

  // ------------------------------------------------------------ storage helpers
  function getPref(k) { try { return localStorage.getItem('wph-' + k); } catch (e) { return null; } }
  function setPref(k, v) { try { localStorage.setItem('wph-' + k, v); } catch (e) { /* storage unavailable */ } }

  // ------------------------------------------------------------ language
  var TITLES = {
    en: 'Women in the federal public service: intersectional barriers | Women public servants data hub',
    fr: 'Les femmes dans la fonction publique fédérale : obstacles intersectionnels | Carrefour de données sur les femmes fonctionnaires'
  };
  function initialLang() {
    var p = null;
    try { p = new URLSearchParams(location.search).get('lang'); } catch (e) { p = null; }
    if (p === 'fr' || p === 'en') return p;
    var s = getPref('lang');
    if (s === 'fr' || s === 'en') return s;
    var n = (navigator.language || 'en').toLowerCase();
    return n.indexOf('fr') === 0 ? 'fr' : 'en';
  }
  var LANG = initialLang();
  function isFr() { return LANG === 'fr'; }
  function tr(en, fr) { return isFr() ? fr : en; }
  function applyLang(lang, announce) {
    LANG = lang;
    root.setAttribute('lang', lang === 'fr' ? 'fr-CA' : 'en-CA');
    document.title = TITLES[lang];
    document.querySelectorAll('[data-lang-btn]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang-btn') === lang));
    });
    document.querySelectorAll('option[data-en]').forEach(function (o) { o.textContent = lang === 'fr' ? o.getAttribute('data-fr') : o.getAttribute('data-en'); });
    document.querySelectorAll('[data-aria-en]').forEach(function (el) { el.setAttribute('aria-label', lang === 'fr' ? el.getAttribute('data-aria-fr') : el.getAttribute('data-aria-en')); });
    setPref('lang', lang);
    try {
      var u = new URL(location.href);
      if (lang === 'fr') u.searchParams.set('lang', 'fr'); else u.searchParams.delete('lang');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch (e) { /* ignore */ }
    if (announce) say(lang === 'fr' ? 'Page affichée en français.' : 'Page shown in English.');
    document.dispatchEvent(new CustomEvent('langchange'));
  }
  var live = document.getElementById('live');
  function say(msg) { if (!live) return; live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 60); }

  // ------------------------------------------------------------ number formats
  var NB = ' ';
  function fdec(v, d) {
    var s = Math.abs(v).toFixed(d);
    if (isFr()) s = s.replace('.', ',');
    return (v < 0 && Number(Math.abs(v).toFixed(d)) !== 0 ? '−' : '') + s;
  }
  function fpct(v, d) {
    if (v === null || v === undefined) return tr('Not published', 'Non publié');
    return fdec(v, d === undefined ? 0 : d) + (isFr() ? NB + '%' : '%');
  }
  function fnum(n) {
    if (n === null || n === undefined) return tr('Not published', 'Non publié');
    var s = Math.round(n).toLocaleString('en-CA');
    return isFr() ? s.replace(/,/g, NB) : s;
  }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function favour(a, b, dir) {
    if (a === null || a === undefined || b === null || b === undefined) return '<span>' + tr('Not available', 'Non disponible') + '</span>';
    var diff = Math.round((a - b) * 10) / 10;
    if (Math.abs(diff) < 0.05) return '<span>' + tr('Same', 'Identique') + '</span>';
    var mag = fdec(Math.abs(diff), Number.isInteger(diff) ? 0 : 1);
    var pe = Math.abs(diff) === 1 ? 'point' : 'points';
    if (dir === 'neutral') return '<span>' + (diff > 0 ? tr(mag + ' ' + pe + ' higher', 'Plus élevé de ' + mag + ' ' + pe) : tr(mag + ' ' + pe + ' lower', 'Moins élevé de ' + mag + ' ' + pe)) + '</span>';
    var better = dir === 'higher' ? diff > 0 : diff < 0;
    return better ? '<span class="fav">' + tr(mag + ' ' + pe + ' more favourable', 'Plus favorable de ' + mag + ' ' + pe) + '</span>'
                  : '<span class="unfav">' + tr(mag + ' ' + pe + ' less favourable', 'Moins favorable de ' + mag + ' ' + pe) + '</span>';
  }
  function bar(v, s) {
    if (v === null || v === undefined) return '';
    var w = Math.max(0, Math.min(100, v));
    return '<span class="bar" aria-hidden="true"><span class="fill s' + s + '" style="width:' + w.toFixed(1) + '%"></span></span>';
  }
  function pctCell(v, s, d) {
    return '<td class="num' + (v === null || v === undefined ? ' np' : '') + '">' + fpct(v, d) + (s ? bar(v, s) : '') + '</td>';
  }

  // ------------------------------------------------------------ display settings
  function setTheme(t) {
    root.setAttribute('data-theme', t);
    document.querySelectorAll('[data-theme-btn]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-theme-btn') === t)); });
    setPref('theme', t);
  }
  function setSize(n) {
    root.classList.remove('fs-1', 'fs-2', 'fs-3');
    if (n > 0) root.classList.add('fs-' + n);
    document.querySelectorAll('[data-size-btn]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-size-btn') === String(n))); });
    setPref('size', String(n));
  }
  function setToggle(cls, on) {
    root.classList.toggle(cls, on);
    var b = document.querySelector('[data-toggle="' + cls + '"]');
    if (b) b.setAttribute('aria-pressed', String(on));
    setPref(cls, on ? '1' : '0');
  }

  // ------------------------------------------------------------ sortable tables
  function cellValue(cell) {
    var v = cell.getAttribute('data-sort');
    if (v === null) return null;
    var n = Number(v);
    return isNaN(n) ? v : n;
  }
  function initSort(table) {
    var ths = table.querySelectorAll('thead th');
    ths.forEach(function (th, idx) {
      var btn = th.querySelector('.sortbtn');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var cur = th.getAttribute('aria-sort');
        var dirn = cur === 'ascending' ? 'descending' : 'ascending';
        ths.forEach(function (o) { o.removeAttribute('aria-sort'); });
        th.setAttribute('aria-sort', dirn);
        var body = table.tBodies[0];
        var rows = Array.prototype.slice.call(body.rows);
        rows.sort(function (a, b) {
          var x = cellValue(a.cells[idx]), y = cellValue(b.cells[idx]);
          if (x === null && y === null) return 0;
          if (x === null) return 1;
          if (y === null) return -1;
          var r = (typeof x === 'number' && typeof y === 'number') ? x - y : String(x).localeCompare(String(y), isFr() ? 'fr' : 'en');
          return dirn === 'ascending' ? r : -r;
        });
        rows.forEach(function (r) { body.appendChild(r); });
        var label = th.textContent.replace(/[↕▲▼]/g, '').trim();
        say(tr('Table sorted by ' + label + ', ' + (dirn === 'ascending' ? 'ascending' : 'descending') + '.',
               'Tableau trié par ' + label + ', ordre ' + (dirn === 'ascending' ? 'croissant' : 'décroissant') + '.'));
      });
    });
  }

  // ------------------------------------------------------------ department filter
  function initDeptFilter() {
    var input = document.getElementById('deptFilter'), below = document.getElementById('deptBelow');
    var table = document.getElementById('tdept'), out = document.getElementById('deptCount');
    if (!input || !table) return;
    function run() {
      var q = input.value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      var only = below && below.checked, shown = 0, total = 0;
      Array.prototype.forEach.call(table.tBodies[0].rows, function (r) {
        total++;
        var name = (r.getAttribute('data-name') || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
        var ok = (!q || name.indexOf(q) !== -1) && (!only || r.getAttribute('data-below') === '1');
        r.hidden = !ok;
        if (ok) shown++;
      });
      out.textContent = tr('Showing ' + shown + ' of ' + total + ' organizations.', shown + ' organisations affichées sur ' + total + '.');
    }
    input.addEventListener('input', run);
    if (below) below.addEventListener('change', run);
    document.addEventListener('langchange', run);
    run();
  }

  // ------------------------------------------------------------ data loading
  var cache = {};
  function getJSON(url) {
    if (cache[url]) return cache[url];
    cache[url] = fetch(url, { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
    cache[url].catch(function () { delete cache[url]; });
    return cache[url];
  }

  // ------------------------------------------------------------ organization profile
  function initProfile() {
    var sel = document.getElementById('profileOrg'), out = document.getElementById('profileOut'), st = document.getElementById('profileStatus');
    if (!sel || !out) return;
    var DATA = null;
    function name(o) { return isFr() ? o.fr : o.en; }
    function fill() {
      var keep = sel.value;
      var opts = DATA.orgs.map(function (o, i) { return { i: i, n: name(o) }; });
      opts.sort(function (a, b) { return a.n.localeCompare(b.n, isFr() ? 'fr' : 'en'); });
      while (sel.options.length > 1) sel.remove(1);
      opts.forEach(function (o) { var op = document.createElement('option'); op.value = String(o.i); op.textContent = o.n; sel.appendChild(op); });
      sel.value = keep;
    }
    function render() {
      if (!DATA) return;
      var i = sel.value;
      if (i === '') { out.innerHTML = ''; st.textContent = ''; return; }
      var o = DATA.orgs[Number(i)], h = [];
      h.push('<div class="card"><h4>' + esc(name(o)) + '</h4>');
      if (o.rep) {
        var diff = (o.rep.w === null || o.rep.wfa === null) ? null : Math.round((o.rep.w - o.rep.wfa) * 10) / 10;
        h.push('<p>' + tr('Core public administration, as of March 31, 2025 (TBS).', 'Administration publique centrale, au 31 mars 2025 (SCT).') + '</p>');
        h.push('<div class="kv">');
        h.push('<div><span class="k">' + tr('Employees', 'Employés') + '</span><span class="v">' + fnum(o.rep.n) + '</span></div>');
        h.push('<div><span class="k">' + tr('Women', 'Femmes') + '</span><span class="v">' + fpct(o.rep.w, 1) + '</span></div>');
        h.push('<div><span class="k">' + tr('Departmental workforce availability for women', 'Disponibilité ministérielle pour les femmes') + '</span><span class="v">' + fpct(o.rep.wfa, 1) + '</span></div>');
        h.push('<div><span class="k">' + tr('Difference (points, calculated)', 'Écart (points, calculé)') + '</span><span class="v">' + (diff === null ? tr('Not published', 'Non publié') : (diff > 0 ? '+' : '') + fdec(diff, 1)) + (diff !== null && diff < 0 ? ' <span class="flag">' + tr('Below', 'Inférieure') + '</span>' : '') + '</span></div>');
        h.push('</div>');
        if (o.rep.note_en) h.push('<p class="tnote">' + esc(tr(o.rep.note_en, o.rep.note_fr)) + '</p>');
      } else {
        h.push('<p>' + tr('This organization is not in the TBS core public administration tables used on this site, so no representation figures are shown.', 'Cette organisation ne figure pas dans les tableaux du SCT sur l’administration publique centrale utilisés sur ce site; aucun chiffre de représentation n’est donc présenté.') + '</p>');
      }
      h.push('</div>');
      if (o.pses) {
        var cap = tr('Women, men and all respondents in this organization, 2024 survey', 'Femmes, hommes et ensemble des répondants de cette organisation, sondage de 2024');
        h.push('<div class="tblwrap" role="region" tabindex="0" aria-label="' + esc(cap) + '"><table class="data"><caption>' + esc(cap) + '</caption><thead><tr>');
        h.push('<th scope="col">' + tr('Measure', 'Mesure') + '</th><th scope="col"><span class="sw s1" aria-hidden="true"></span>' + tr('Women', 'Femmes') + '</th><th scope="col"><span class="sw s2" aria-hidden="true"></span>' + tr('Men', 'Hommes') + '</th><th scope="col"><span class="sw s3" aria-hidden="true"></span>' + tr('All respondents', 'Ensemble des répondants') + '</th><th scope="col">' + tr('Women compared with men', 'Femmes comparativement aux hommes') + '</th><th scope="col">' + tr('Public service, women', 'Fonction publique, femmes') + '</th></tr></thead><tbody>');
        DATA.q.forEach(function (q) {
          var a = o.pses.w[q.id], b = o.pses.m[q.id], c = o.pses.all[q.id];
          var lower = q.dir === 'lower' ? '<span class="dir">' + tr('(lower is better)', '(un résultat plus bas est préférable)') + '</span>' : '';
          h.push('<tr><th scope="row">' + esc(tr(q.en, q.fr)) + lower + ' <span class="qid">' + q.id + '</span></th>' + pctCell(a, 1, 0) + pctCell(b, 2, 0) + pctCell(c, 3, 0) + '<td>' + favour(a, b, q.dir) + '</td>' + pctCell(DATA.ps.w[q.id], null, 0) + '</tr>');
        });
        h.push('</tbody></table></div>');
        h.push('<p class="tnote">' + tr('Blank results were suppressed by the survey and are shown as “Not published”. The last column is the public service result for women, for context.', 'Les résultats vides ont été supprimés par le sondage et sont présentés comme « Non publié ». La dernière colonne présente le résultat des femmes pour la fonction publique, à titre de contexte.') + '</p>');
      } else {
        h.push('<p>' + tr('No 2024 survey results by gender are available for this organization in the file used here.', 'Aucun résultat du sondage de 2024 selon le genre n’est disponible pour cette organisation dans le fichier utilisé ici.') + '</p>');
      }
      if (o.branch) h.push('<p><a href="#branches" data-branch-dept="' + esc(o.branch) + '">' + tr('See results by branch for this organization', 'Voir les résultats par direction générale pour cette organisation') + '</a></p>');
      out.innerHTML = h.join('');
      st.textContent = tr('Showing results for ', 'Résultats affichés pour ') + name(o) + '.';
    }
    sel.addEventListener('change', render);
    document.addEventListener('langchange', function () { if (DATA) { fill(); render(); } });
    st.textContent = tr('Loading organizations…', 'Chargement des organisations…');
    getJSON('data/orgs.json').then(function (d) { DATA = d; fill(); st.textContent = ''; render(); })
      .catch(function () { st.textContent = tr('The organization data could not be loaded. Try reloading the page.', 'Les données des organisations n’ont pas pu être chargées. Essayez de recharger la page.'); });
  }

  // ------------------------------------------------------------ branch tool
  function initBranches() {
    var dsel = document.getElementById('brDept'), bsel = document.getElementById('brBranch'), msel = document.getElementById('brMeasure');
    var out = document.getElementById('brOut'), st = document.getElementById('brStatus');
    var bwrap = document.getElementById('brBranchWrap'), mwrap = document.getElementById('brMeasureWrap');
    if (!dsel || !out) return;
    var IDX = null, DEPT = null, DEPTMETA = null;
    function view() { var r = document.querySelector('input[name="brView"]:checked'); return r ? r.value : 'branch'; }
    function nm(o) { return isFr() ? o.fr : o.en; }
    function fillDepts() {
      var keep = dsel.value;
      var list = IDX.depts.slice().sort(function (a, b) { return nm(a).localeCompare(nm(b), isFr() ? 'fr' : 'en'); });
      while (dsel.options.length > 1) dsel.remove(1);
      list.forEach(function (d) { var o = document.createElement('option'); o.value = d.id; o.textContent = nm(d); dsel.appendChild(o); });
      dsel.value = keep;
    }
    function fillMeasures() {
      var keep = msel.value;
      while (msel.options.length) msel.remove(0);
      var lastT = null, grp = null;
      IDX.q.forEach(function (q) {
        if (q.t !== lastT) { grp = document.createElement('optgroup'); grp.label = isFr() ? IDX.themes[q.t].fr : IDX.themes[q.t].en; msel.appendChild(grp); lastT = q.t; }
        var o = document.createElement('option'); o.value = q.id; o.textContent = (isFr() ? q.fr : q.en) + ' (' + q.id + ')'; grp.appendChild(o);
      });
      if (keep) msel.value = keep;
    }
    function fillBranches() {
      var keep = bsel.value;
      while (bsel.options.length > 1) bsel.remove(1);
      if (!DEPTMETA) { bsel.disabled = true; return; }
      var list = DEPTMETA.branches.slice().sort(function (a, b) { return nm(a).localeCompare(nm(b), isFr() ? 'fr' : 'en'); });
      list.forEach(function (b) { var o = document.createElement('option'); o.value = b.id; o.textContent = nm(b); bsel.appendChild(o); });
      bsel.disabled = false;
      bsel.value = keep;
    }
    function cell(v, n, s) {
      if (v === null || v === undefined) return '<td class="num np">' + tr('Not published', 'Non publié') + '</td>';
      return '<td class="num">' + fpct(v, 0) + bar(v, s) + '<span class="calc"> n=' + fnum(n) + '</span></td>';
    }
    function qLabel(q) {
      var pop = q.pop_en ? '<span class="dir">' + esc(tr(q.pop_en, q.pop_fr)) + '</span>' : '';
      var lower = q.dir === 'lower' ? '<span class="dir">' + tr('(lower is better)', '(un résultat plus bas est préférable)') + '</span>' : '';
      return esc(tr(q.en, q.fr)) + ' <span class="qid">' + q.id + '</span> ' + lower + pop +
        '<details class="q"><summary>' + tr('Question wording', 'Libellé de la question') + '</summary>' + esc(tr(q.full_en, q.full_fr)) + '</details>';
    }
    function headRow(first) {
      return '<thead><tr><th scope="col">' + first + '</th><th scope="col"><span class="sw s1" aria-hidden="true"></span>' + tr('Women', 'Femmes') + '</th><th scope="col"><span class="sw s2" aria-hidden="true"></span>' + tr('Not women', 'Non-femmes') + '</th><th scope="col">' + tr('Women compared with not women', 'Femmes comparativement aux non-femmes') + '</th></tr></thead>';
    }
    function render() {
      out.innerHTML = '';
      var v = view();
      bwrap.hidden = v !== 'branch';
      mwrap.hidden = v !== 'measure';
      if (!DEPT || !DEPTMETA) return;
      var h = [];
      if (v === 'branch') {
        var bid = bsel.value;
        if (!bid) { st.textContent = tr('Choose a branch to see its results.', 'Choisissez une direction générale pour voir ses résultats.'); return; }
        var b = DEPTMETA.branches.filter(function (x) { return x.id === bid; })[0];
        var rows = DEPT.rows[bid] || {};
        var cap = tr('Women and not women, ', 'Femmes et non-femmes, ') + nm(b) + tr(', 2024 survey', ', sondage de 2024');
        h.push('<div class="tblwrap" role="region" tabindex="0" aria-label="' + esc(cap) + '"><table class="data wide"><caption>' + esc(cap) + '</caption>' + headRow(tr('Measure', 'Mesure')) + '<tbody>');
        var lastT = null, published = 0;
        IDX.q.forEach(function (q) {
          if (q.t !== lastT) { h.push('<tr class="grp"><th colspan="4" scope="colgroup">' + esc(isFr() ? IDX.themes[q.t].fr : IDX.themes[q.t].en) + '</th></tr>'); lastT = q.t; }
          var r = rows[q.id] || [null, null, null, null];
          if (r[0] !== null) published++;
          h.push('<tr><th scope="row">' + qLabel(q) + '</th>' + cell(r[0], r[1], 1) + cell(r[2], r[3], 2) + '<td>' + favour(r[0], r[2], q.dir) + '</td></tr>');
        });
        h.push('</tbody></table></div>');
        out.innerHTML = h.join('');
        st.textContent = tr(nm(b) + ': ' + published + ' of ' + IDX.q.length + ' measures published for women.', nm(b) + ' : ' + published + ' mesures publiées sur ' + IDX.q.length + ' pour les femmes.');
      } else {
        var qid = msel.value || IDX.q[0].id;
        var q = IDX.q.filter(function (x) { return x.id === qid; })[0];
        var list = DEPTMETA.branches.slice().sort(function (a, b) { return nm(a).localeCompare(nm(b), isFr() ? 'fr' : 'en'); });
        var cap2 = esc(tr(q.en, q.fr)) + ' (' + q.id + '), ' + esc(nm(DEPTMETA)) + tr(', 2024 survey', ', sondage de 2024');
        h.push('<p>' + qLabel(q) + '</p>');
        h.push('<div class="tblwrap" role="region" tabindex="0" aria-label="' + cap2 + '"><table class="data wide"><caption>' + cap2 + '</caption>' + headRow(tr('Branch', 'Direction générale')) + '<tbody>');
        var pub = 0;
        list.forEach(function (b) {
          var r = (DEPT.rows[b.id] || {})[qid] || [null, null, null, null];
          if (r[0] !== null) pub++;
          h.push('<tr><th scope="row">' + esc(nm(b)) + '</th>' + cell(r[0], r[1], 1) + cell(r[2], r[3], 2) + '<td>' + favour(r[0], r[2], q.dir) + '</td></tr>');
        });
        h.push('</tbody></table></div>');
        out.innerHTML = h.join('');
        st.textContent = tr(pub + ' of ' + list.length + ' branches have a published result for women on this measure.', pub + ' directions générales sur ' + list.length + ' ont un résultat publié pour les femmes pour cette mesure.');
      }
    }
    function loadDept(id) {
      DEPT = null; DEPTMETA = null; out.innerHTML = ''; fillBranches();
      if (!id) { st.textContent = ''; return; }
      DEPTMETA = IDX.depts.filter(function (d) { return d.id === id; })[0];
      st.textContent = tr('Loading branch results…', 'Chargement des résultats par direction générale…');
      getJSON('data/branches/' + id + '.json').then(function (d) { DEPT = d; fillBranches(); render(); })
        .catch(function () { st.textContent = tr('The branch data could not be loaded. Try reloading the page.', 'Les données par direction générale n’ont pas pu être chargées. Essayez de recharger la page.'); });
    }
    dsel.addEventListener('change', function () { bsel.value = ''; loadDept(dsel.value); });
    bsel.addEventListener('change', render);
    msel.addEventListener('change', render);
    document.querySelectorAll('input[name="brView"]').forEach(function (r) { r.addEventListener('change', render); });
    document.addEventListener('langchange', function () { if (IDX) { fillDepts(); fillMeasures(); fillBranches(); render(); } });
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('[data-branch-dept]') : null;
      if (!a || !IDX) return;
      var id = a.getAttribute('data-branch-dept');
      dsel.value = id; bsel.value = ''; loadDept(id);
      setTimeout(function () { dsel.focus(); }, 0);
    });
    getJSON('data/branches/index.json').then(function (d) { IDX = d; fillDepts(); fillMeasures(); render(); })
      .catch(function () { st.textContent = tr('The branch list could not be loaded. Try reloading the page.', 'La liste des directions générales n’a pas pu être chargée. Essayez de recharger la page.'); });
  }

  // ------------------------------------------------------------ AI box
  function initAI() {
    var box = document.getElementById('aiBox');
    if (!box || !window.GCAI) return;
    window.GCAI.render(box, {
      question: function () { return tr('What do published Government of Canada data show about barriers faced by women with disabilities in the federal public service?', 'Que montrent les données publiées du gouvernement du Canada sur les obstacles que rencontrent les femmes en situation de handicap dans la fonction publique fédérale?'); },
      about: function () { return tr('women in the federal public service, including women who are also Indigenous, Black or racialized, or who have a disability', 'les femmes dans la fonction publique fédérale, y compris les femmes qui sont aussi autochtones, noires ou racisées, ou en situation de handicap'); }
    });
  }

  // ------------------------------------------------------------ start
  function start() {
    document.querySelectorAll('[data-lang-btn]').forEach(function (b) {
      b.addEventListener('click', function () { applyLang(b.getAttribute('data-lang-btn'), true); });
    });
    document.querySelectorAll('[data-theme-btn]').forEach(function (b) { b.addEventListener('click', function () { setTheme(b.getAttribute('data-theme-btn')); }); });
    document.querySelectorAll('[data-size-btn]').forEach(function (b) { b.addEventListener('click', function () { setSize(Number(b.getAttribute('data-size-btn'))); }); });
    document.querySelectorAll('[data-toggle]').forEach(function (b) { b.addEventListener('click', function () { var c = b.getAttribute('data-toggle'); setToggle(c, !root.classList.contains(c)); }); });
    var th = getPref('theme');
    if (!th) th = (window.matchMedia && window.matchMedia('(prefers-contrast: more)').matches) ? 'contrast' : ((window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light');
    setTheme(th);
    setSize(Number(getPref('size') || 0));
    setToggle('easy', getPref('easy') === '1');
    setToggle('altfont', getPref('altfont') === '1');
    applyLang(LANG, false);
    document.querySelectorAll('table[data-sortable="true"]').forEach(initSort);
    initDeptFilter();
    initProfile();
    initBranches();
    initAI();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
