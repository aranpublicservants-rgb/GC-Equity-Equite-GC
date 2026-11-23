/* Shared page builder for the GC Equity systemic change tools.
   Page content comes from tools-content.js. Nothing typed on these pages is stored or sent anywhere. */
(function () {
  "use strict";
  const C = window.GCE_TOOLS;
  const slug = document.documentElement.dataset.tool;
  const P = C && C.pages[slug];
  const app = document.getElementById("app");
  if (!P || !app) return;
  const script = document.currentScript;
  const root = new URL("./", script.src);
  const site = new URL("../", root);
  const params = new URLSearchParams(location.search);
  let lang = params.get("lang") === "fr" ? "fr" : "en";
  const org = (params.get("org") || "").replace(/[^a-z0-9-]/gi, "");
  const ix = () => (lang === "fr" ? 1 : 0);
  const tr = a => (Array.isArray(a) ? (a[ix()] || a[0]) : (a || ""));
  const L = (en, fr) => (lang === "fr" ? fr : en);
  const COL = () => lang === "fr" ? "\u00a0: " : ": ";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = id => document.getElementById(id);
  const today = () => new Date().toISOString().slice(0, 10);
  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");

  const st = {
    picked: new Set(), status: {}, statusB: {}, optA: "", optB: "", evidence: {}, hours: {}, query: {},
    notes: "", owner: "", due: "", measure: "", record: "",
    posting: "", flags: null, log: [], logDraft: { rec: "", fn: "", date: "", status: "0", ev: "" },
    ctaOrg: "", ctaData: null, ctaDir: null, ctaError: false,
    country: (params.get("country") || "ca").replace(/[^a-z]/g, ""), topic: (params.get("topic") || "all").replace(/[^a-z]/g, "")
  };

  /* Address of another tool or page, keeping the language and the chosen department. */
  function href(target) {
    const u = /^https?:/.test(target) ? new URL(target) : new URL(target, root);
    if (u.origin === location.origin) {
      u.searchParams.set("lang", lang);
      if (org) u.searchParams.set("org", org);
    }
    return u.href;
  }
  function source(k) {
    const s = C.S[k];
    if (!s) return "";
    return '<a href="' + esc(lang === "fr" ? s[3] : s[2]) + '">' + esc(lang === "fr" ? s[1] : s[0]) + "</a>";
  }
  function sourceText(k) {
    const s = C.S[k];
    return s ? (lang === "fr" ? s[1] + " (" + s[3] + ")" : s[0] + " (" + s[2] + ")") : "";
  }
  const items = () => (P.sections || []).filter(s => s.type === "library").flatMap(s => s.groups.flatMap(g => g.items.map(it => ({ ...it, section: s, group: g }))));

  /* ---------- Sections ---------- */
  function header() {
    const onHub = slug === "hub";
    return '<a class="skip" href="#main">' + esc(L("Skip to main content", "Passer au contenu principal")) + "</a>" +
      '<header class="site-header"><nav aria-label="' + esc(L("Site", "Site")) + '"><a href="' + esc(href(site.href)) + '">' + esc(L("GC Equity", "Équité-GC")) + "</a>" +
      (onHub ? "" : '<a href="' + esc(href("./")) + '">' + esc(L("Systemic change tools", "Outils de changement systémique")) + "</a>") +
      '<button type="button" class="lang" id="switch" lang="' + (lang === "en" ? "fr" : "en") + '">' + (lang === "en" ? "Français" : "English") + "</button></nav>" +
      '<p class="note">' + esc(L("Independent resource of the Anti-Racism Ambassadors Network (ARAN). Not an official Government of Canada website.",
        "Ressource indépendante du Réseau des ambassadeurs anti-racisme (RAAR). Ce n’est pas un site officiel du gouvernement du Canada.")) + "</p>" +
      "<h1>" + esc(tr(P.title)) + '</h1><p class="intro">' + esc(tr(P.intro)) + "</p></header>";
  }

  function hub(sec) {
    let out = "";
    if (org) out += '<p class="notice">' + esc(L("The department you chose will be selected when you open the department evidence explorer, the equity under austerity tool and the commitments tracker.",
      "Le ministère choisi sera sélectionné à l’ouverture de l’explorateur des données ministérielles, de l’outil sur l’équité en période d’austérité et du suivi des engagements.")) + ' <a href="' + esc(new URL("./?lang=" + lang, root).href) + '">' +
      esc(L("Clear the department", "Retirer le ministère")) + "</a></p>";
    for (const g of sec.groups) {
      out += "<h2>" + esc(tr(g.title)) + '</h2><div class="cards">' + g.tools.map(k => {
        const t = C.tools[k];
        return '<article class="card"><h3><a href="' + esc(t.external ? tr(t.href) : href(t.href)) + '">' + esc(tr(t.title)) + "</a></h3><p>" + esc(tr(t.intro)) + "</p></article>";
      }).join("") + "</div>";
    }
    return out;
  }

  function field(f) {
    return "<dt>" + esc(tr(f.l)) + "</dt><dd>" + esc(tr(f.v)) + "</dd>";
  }
  function control(sec, it) {
    const id = esc(it.id);
    if (sec.mode === "pick") return '<label class="check"><input type="checkbox" data-pick="' + id + '" ' + (st.picked.has(it.id) ? "checked" : "") + "> " + esc(L("Include in my record", "Inclure dans ma fiche")) + "</label>";
    if (sec.mode === "compare") {
      const mk = (key, store, label) => '<div><label for="' + key + "-" + id + '">' + esc(label) + '</label><select id="' + key + "-" + id + '" data-' + (key === "sa" ? "status" : "statusb") + '="' + id + '">' +
        tr(sec.statuses).map((s, k) => '<option value="' + k + '" ' + (Number(store[it.id] || 0) === k ? "selected" : "") + ">" + esc(s) + "</option>").join("") + "</select></div>";
      return '<div class="grid">' + mk("sa", st.status, (st.optA || L("Option A", "Option A")) + ": " + tr(sec.statusLabel)) + mk("sb", st.statusB, (st.optB || L("Option B", "Option B")) + ": " + tr(sec.statusLabel)) + "</div>";
    }
    if (sec.mode === "status" || sec.mode === "tracking") {
      const opts = tr(sec.statuses).map((s, k) => '<option value="' + k + '" ' + (Number(st.status[it.id] || 0) === k ? "selected" : "") + ">" + esc(s) + "</option>").join("");
      let h = '<label for="status-' + id + '">' + esc(tr(sec.statusLabel)) + '</label><select id="status-' + id + '" data-status="' + id + '">' + opts + "</select>";
      if (sec.mode === "tracking") h += '<label for="ev-' + id + '">' + esc(L("Evidence link, date and next step (no personal information)", "Lien vers la preuve, date et prochaine étape (sans renseignements personnels)")) +
        '</label><input type="text" id="ev-' + id + '" data-evidence="' + id + '" value="' + esc(st.evidence[it.id] || "") + '">';
      return h;
    }
    if (sec.mode === "hours") {
      const h = st.hours[it.id] || { w: "", n: "" };
      const total = (Number(h.w) || 0) * (Number(h.n) || 0);
      return '<div class="grid"><div><label for="hw-' + id + '">' + esc(L("Hours per week", "Heures par semaine")) + '</label><input type="number" min="0" max="80" step="0.5" id="hw-' + id + '" data-hours="' + id + '" data-part="w" value="' + esc(h.w) + '"></div>' +
        '<div><label for="hn-' + id + '">' + esc(L("Number of weeks", "Nombre de semaines")) + '</label><input type="number" min="0" max="104" step="1" id="hn-' + id + '" data-hours="' + id + '" data-part="n" value="' + esc(h.n) + '"></div></div>' +
        '<p class="small" id="ht-' + id + '" role="status">' + esc(L("Estimated total: ", "Total estimé\u00a0: ") + fmtHours(total)) + "</p>";
    }
    return "";
  }
  const fmtHours = n => n.toLocaleString(lang === "fr" ? "fr-CA" : "en-CA", { maximumFractionDigits: 1 }) + " " + L(n === 1 ? "hour" : "hours", n < 2 ? "heure" : "heures");

  function item(sec, it) {
    return '<article class="item" id="' + esc(it.id) + '"><h3>' + esc(tr(it.title)) + (it.badge ? '<span class="badge">' + esc(tr(it.badge)) + "</span>" : "") + "</h3><dl>" +
      it.fields.map(field).join("") + "</dl>" + (it.sources && it.sources.length ? '<p class="sources">' + esc(L("Sources: ", "Sources\u00a0: ")) + it.sources.map(source).join(" · ") + "</p>" : "") +
      (it.links && it.links.length ? '<p class="sources">' + esc(L("Published evidence for a department: ", "Données publiées pour un ministère\u00a0: ")) + it.links.map(k => '<a href="' + esc(href(k.href)) + '">' + esc(tr(k.l)) + "</a>").join(" · ") + "</p>" : "") +
      control(sec, it) + "</article>";
  }

  function library(sec) {
    const all = sec.groups.flatMap(g => g.items);
    let out = '<section id="' + esc(sec.id) + '" aria-labelledby="' + esc(sec.id) + '-title"><h2 id="' + esc(sec.id) + '-title">' + esc(tr(sec.title)) + "</h2>" + (sec.intro ? "<p>" + esc(tr(sec.intro)) + "</p>" : "");
    if (sec.mode === "compare") out += '<div class="grid no-print"><div><label for="opt-a">' + esc(L("Name of option A (no personal information)", "Nom de l’option A (sans renseignements personnels)")) + '</label><input type="text" id="opt-a" value="' + esc(st.optA) + '" maxlength="80"></div>' +
      '<div><label for="opt-b">' + esc(L("Name of option B (no personal information)", "Nom de l’option B (sans renseignements personnels)")) + '</label><input type="text" id="opt-b" value="' + esc(st.optB) + '" maxlength="80"></div></div>';
    if (all.length > 6) out += '<div class="no-print"><label for="q-' + esc(sec.id) + '">' + esc(L("Search these topics", "Rechercher dans ces sujets")) + '</label><input type="search" id="q-' + esc(sec.id) + '" data-search="' + esc(sec.id) + '" value="' + esc(st.query[sec.id] || "") + '"><p class="small" role="status" id="qs-' + esc(sec.id) + '"></p></div>';
    for (const g of sec.groups) {
      out += '<div data-group="' + esc(g.id || "") + '"' + (g.id ? ' id="' + esc(g.id) + '"' : "") + ">" + (g.title ? "<h3 class=\"group-title\">" + esc(tr(g.title)) + "</h3>" : "") + (g.intro ? "<p>" + esc(tr(g.intro)) + "</p>" : "") +
        g.items.map(it => item(sec, it)).join("") + "</div>";
    }
    return out + "</section>";
  }

  function filter(secId) {
    const sec = P.sections.find(s => s.id === secId);
    if (!sec) return;
    const q = norm(st.query[secId]);
    let shown = 0, total = 0;
    for (const g of sec.groups) for (const it of g.items) {
      total++;
      const el = $(it.id);
      const text = norm([tr(it.title), ...it.fields.map(f => tr(f.v))].join(" "));
      const ok = !q || text.includes(q);
      if (el) el.hidden = !ok;
      if (ok) shown++;
    }
    const s = $("qs-" + secId);
    if (s) s.textContent = q ? L(shown + " of " + total + " topics shown", shown + " sujets affichés sur " + total) : "";
  }

  /* ---------- Job posting check ---------- */
  function scanner(sec) {
    const flags = st.flags;
    let res = "";
    if (flags) {
      res = flags.length ? "<p>" + esc(L(flags.length + (flags.length === 1 ? " wording to review." : " wordings to review."), flags.length + (flags.length === 1 ? " formulation à examiner." : " formulations à examiner."))) + "</p>" +
        flags.map((f, k) => '<div class="flag"><h3>' + esc((k + 1) + ". " + tr(f.rule.title)) + "</h3><p><strong>" + esc(L("Wording found: ", "Formulation repérée\u00a0: ")) + "</strong>" + esc(f.matches.join("; ")) + "</p><p>" + esc(tr(f.rule.why)) +
          "</p><p><strong>" + esc(L("Possible revision: ", "Révision possible\u00a0: ")) + "</strong>" + esc(tr(f.rule.change)) + "</p>" + (f.rule.src ? '<p class="sources">' + esc(L("Guidance: ", "Orientation\u00a0: ")) + f.rule.src.map(source).join(" · ") + "</p>" : "") + "</div>").join("")
        : "<p>" + esc(L("No wording from the list was found. The check covers common patterns only, so the posting still needs a staffing review.", "Aucune formulation de la liste n’a été repérée. La vérification ne couvre que des formulations courantes; l’offre doit quand même faire l’objet d’un examen en dotation.")) + "</p>";
    }
    return '<section id="' + esc(sec.id) + '" aria-labelledby="' + esc(sec.id) + '-title"><h2 id="' + esc(sec.id) + '-title">' + esc(tr(sec.title)) + "</h2><p>" + esc(tr(sec.intro)) + "</p>" +
      '<div class="panel"><label for="scan-text">' + esc(L("Job posting text (do not include applicants’ personal information)", "Texte de l’offre d’emploi (sans renseignements personnels des candidats)")) + '</label><textarea id="scan-text" rows="10">' + esc(st.posting) + "</textarea>" +
      '<div class="row"><button type="button" class="primary" id="scan-run">' + esc(L("Check the posting", "Vérifier l’offre")) + '</button><button type="button" id="scan-clear">' + esc(L("Clear", "Effacer")) + "</button></div>" +
      '<div id="scan-out" aria-live="polite">' + res + "</div><h3>" + esc(L("Before publishing, also confirm", "Avant la publication, confirmer aussi")) + "</h3><ul>" + tr(sec.checks).map(c => "<li>" + esc(c) + "</li>").join("") + "</ul>" +
      '<p class="small">' + esc(L("The check looks for set phrases in English and French. It runs in your browser and does not send the text anywhere.", "La vérification repère des expressions définies en anglais et en français. Elle s’exécute dans votre navigateur et n’envoie le texte nulle part.")) + "</p></div></section>";
  }
  function runScan() {
    const text = st.posting;
    const found = [];
    for (const rule of C.scanRules) {
      rule.rx.lastIndex = 0;
      const m = [...text.matchAll(rule.rx)].map(x => x[0].trim()).filter((v, k, a) => a.indexOf(v) === k).slice(0, 4);
      if (m.length) found.push({ rule, matches: m });
    }
    st.flags = found;
  }

  /* ---------- Published figures from other public services ---------- */
  const loc = () => (lang === "fr" ? "fr-CA" : "en-CA");
  const pctF = v => v.toLocaleString(loc(), { maximumFractionDigits: 1 }) + (lang === "fr" ? " %" : "%");
  const ptsF = d => {
    const x = Math.round(d * 10) / 10, a = Math.abs(x);
    return (x > 0 ? "+" : x < 0 ? "−" : "") + a.toLocaleString(loc(), { maximumFractionDigits: 1 }) + " " + (lang === "fr" ? (a < 2 ? "point" : "points") : (a === 1 ? "point" : "points"));
  };
  const country = sec => sec.countries.find(c => c.id === st.country) || sec.countries[0];
  const shown = sec => { const c = country(sec); return c.indicators.filter(x => st.topic === "all" || x.id === st.topic); };
  function globalCompare(sec) {
    const c = country(sec), list = shown(sec), src = tr(c.source);
    let out = '<section id="' + esc(sec.id) + '" aria-labelledby="' + esc(sec.id) + '-title"><h2 id="' + esc(sec.id) + '-title">' + esc(tr(sec.title)) + "</h2><p>" + esc(tr(sec.intro)) + '</p><div class="panel"><div class="pair">' +
      '<div><label for="gl-country">' + esc(L("Country", "Pays")) + '</label><select id="gl-country">' + sec.countries.map(x => '<option value="' + esc(x.id) + '"' + (x.id === c.id ? " selected" : "") + ">" + esc(tr(x.name)) + "</option>").join("") + "</select></div>" +
      '<div><label for="gl-topic">' + esc(L("Evidence dimension", "Dimension des données")) + '</label><select id="gl-topic">' + sec.topics.map(([k, v]) => '<option value="' + esc(k) + '"' + (k === st.topic ? " selected" : "") + ">" + esc(tr(v)) + "</option>").join("") + "</select></div></div>" +
      '<p class="small">' + esc(tr(c.scope)) + "</p>";
    const ref = sec.oecdRef && (st.topic === "all" || st.topic === sec.oecdRef.id) ? sec.oecdRef : null;
    if (ref) out += '<article class="item"><h3>' + esc(tr(ref.l)) + '</h3><p class="big">' + esc(pctF(ref.value)) + "</p><p>" + esc(tr(ref.note)) +
      '</p><p class="sources"><a href="' + esc(ref.source) + '">' + esc(L("OECD, Government at a Glance 2025", "OCDE, Panorama des administrations publiques 2025")) + " (" + esc(String(ref.year)) + ")</a></p></article>";
    out += list.length ? list.map(x => '<article class="item"><h3>' + esc(tr(x.l)) + '</h3><p class="big">' + esc(pctF(x.value)) + "</p>" +
      (x.comparator != null ? "<p>" + esc(tr(x.cl)) + COL() + "<strong>" + esc(pctF(x.comparator)) + "</strong> (" + esc(ptsF(x.value - x.comparator)) + ")</p>" : "") +
      "<p>" + esc(tr(x.note)) + '</p><p class="sources"><a href="' + esc(src) + '">' + esc(L("Official source", "Source officielle")) + " (" + esc(String(c.year)) + ")</a></p></article>").join("") :
      '<p class="notice">' + esc(L("This source publishes no figure for this dimension in the selected evidence. Do not read the absence as zero or borrow another country’s definition.", "Cette source ne publie aucun chiffre pour cette dimension dans les données retenues. Ne pas interpréter l’absence comme un zéro ni emprunter la définition d’un autre pays.")) + "</p>";
    const all = sec.countries.flatMap(x => x.indicators.map(k => [tr(x.name) + " (" + x.year + ")", tr(k.l), pctF(k.value)]));
    if (sec.oecdRef) all.push([L("OECD average (2023)", "Moyenne de l’OCDE (2023)"), tr(sec.oecdRef.l), pctF(sec.oecdRef.value)]);
    const table = (caption, head, rows) => '<div class="table-wrap" tabindex="0" role="region" aria-label="' + esc(caption) + '"><table><caption>' + esc(caption) + "</caption><thead><tr>" + head.map(h => '<th scope="col">' + esc(h) + "</th>").join("") + "</tr></thead><tbody>" + rows.map(r => "<tr>" + r.map((v, i) => i ? "<td>" + v + "</td>" : '<th scope="row">' + v + "</th>").join("") + "</tr>").join("") + "</tbody></table></div>";
    out += "<details><summary>" + esc(L("All published figures and how each country reports them", "Tous les chiffres publiés et la façon dont chaque pays les déclare")) + "</summary>" +
      table(L("Published figures by country, not a ranking", "Chiffres publiés par pays, pas un classement"), [L("Country and year", "Pays et année"), L("Published measure", "Indicateur publié"), L("Value", "Valeur")], all.map(r => r.map(esc))) +
      '<p class="notice">' + esc(L("These percentages use different denominators, disclosure practices and identity definitions. Do not rank or average them. Use OECD data where a harmonized comparison exists.", "Ces pourcentages reposent sur des dénominateurs, des pratiques de déclaration et des définitions identitaires différents. Ne pas les classer ni en faire la moyenne. Utiliser les données de l’OCDE lorsqu’une comparaison harmonisée existe.")) + "</p>" +
      table(L("How each country reports these topics", "Façon dont chaque pays déclare ces sujets"), [L("Country", "Pays"), L("Reporting system", "Système de déclaration"), L("Source", "Source")], sec.countries.map(x => [esc(tr(x.name)), esc(tr(x.scope)), '<a href="' + esc(tr(x.source)) + '">' + esc(L("Official source", "Source officielle")) + "</a>"])) +
      '<p class="sources"><a href="' + esc(sec.oecd) + '">' + esc(L("OECD Government at a Glance: harmonized international indicators", "OCDE, Panorama des administrations publiques : indicateurs internationaux harmonisés")) + "</a></p></details>";
    out += "<h3>" + esc(L("Questions to check before adapting a practice", "Questions à vérifier avant d’adapter une pratique")) + '</h3><ol class="steps">' + sec.questions.map(q => "<li><strong>" + esc(tr(q[0])) + "</strong> " + esc(tr(q[1])) + "</li>").join("") + "</ol>";
    out += "<h3>" + esc(L("Next steps", "Prochaines étapes")) + "</h3><ul>" + sec.actions.map(a => "<li>" + esc(tr(a)) + "</li>").join("") + "</ul>";
    return out + "</div></section>";
  }

  /* ---------- Department commitments ---------- */
  function cta(sec) {
    let out = '<section id="' + esc(sec.id) + '" aria-labelledby="' + esc(sec.id) + '-title"><h2 id="' + esc(sec.id) + '-title">' + esc(tr(sec.title)) + "</h2><p>" + esc(tr(sec.intro)) + "</p><div class=\"panel\">";
    if (st.ctaError) return out + '<p class="notice">' + esc(L("The commitments data could not be loaded. Reload the page or use the Call to Action page on GC Equity.", "Les données sur les engagements n’ont pas pu être chargées. Rechargez la page ou consultez la page sur l’Appel à l’action dans Équité-GC.")) + "</p></div></section>";
    if (!st.ctaData) return out + '<p role="status">' + esc(L("Loading the published commitments…", "Chargement des engagements publiés…")) + "</p></div></section>";
    const orgs = st.ctaData.organizations.slice().sort((a, b) => tr([a.name_en, a.name_fr]).localeCompare(tr([b.name_en, b.name_fr]), lang === "fr" ? "fr-CA" : "en-CA"));
    out += '<label for="cta-org">' + esc(L("Department or agency", "Ministère ou organisme")) + '</label><select id="cta-org"><option value="">' + esc(L("Choose a department or agency", "Choisir un ministère ou organisme")) + "</option>" +
      orgs.map(o => '<option value="' + esc(o.id) + '" ' + (o.id === st.ctaOrg ? "selected" : "") + ">" + esc(tr([o.name_en, o.name_fr])) + "</option>").join("") + "</select>";
    const o = orgs.find(x => x.id === st.ctaOrg);
    if (o) {
      /* French summaries are used when every item has one; otherwise the English summaries are shown and marked as English. */
      const pick = (en, fr) => lang === "fr" && Array.isArray(fr) && fr.length === (en || []).length && fr.every(Boolean) ? { arr: fr, en: false } : { arr: en, en: lang === "fr" };
      const list = (title, p, url, yearLabel) => p.arr && p.arr.length ? "<h3>" + esc(title) + " (" + p.arr.length + ")</h3><ol" + (p.en ? ' lang="en"' : "") + ">" + p.arr.map(v => "<li>" + esc(v) + "</li>").join("") + "</ol>" + (url ? '<p class="sources"><a href="' + esc(url) + '">' + esc(yearLabel) + "</a></p>" : "") : "";
      const L1 = o.letter || {}, S1 = o.self_assessment || {};
      out += list(L("Commitments in the 2021 letter", "Engagements dans la lettre de 2021"), pick(L1.commitments, L1.commitments_fr), L1.url, L("2021 letter on the Call to Action", "Lettre de 2021 sur l’Appel à l’action")) +
        list(L("Progress reported in 2024", "Progrès déclarés en 2024"), pick(S1.progress, S1.progress_fr), S1.url, L("2024 self-assessment", "Autoévaluation de 2024")) +
        list(L("Barriers reported in 2024", "Obstacles déclarés en 2024"), pick(S1.barriers, S1.barriers_fr), S1.url, L("2024 self-assessment", "Autoévaluation de 2024"));
      if (!L1.commitments && !S1.progress && !S1.barriers) out += '<p class="notice">' + esc(L("No letter or self-assessment summary is on file for this organization.", "Aucun résumé de lettre ou d’autoévaluation n’est consigné pour cet organisme.")) + "</p>";
      out += '<p class="small">' + esc(L("Short summaries of the published documents. A reported action is not evidence that it was carried out or that it worked.", "Brefs résumés des documents publiés, traduits des résumés anglais pour ce site; ce ne sont pas des traductions officielles. Une mesure déclarée ne prouve pas qu’elle a été réalisée ni qu’elle a donné des résultats.")) + "</p>";
    }
    return out + "</div></section>";
  }
  function loadCta() {
    Promise.all([fetch(new URL("data/call-to-action-letters.json", site)).then(r => { if (!r.ok) throw Error(r.status); return r.json(); }),
      fetch(new URL("assets/department-pages.json", site)).then(r => r.ok ? r.json() : null).catch(() => null)])
      .then(([d, dir]) => {
        st.ctaData = d;
        st.ctaDir = dir;
        if (org && !st.ctaOrg) {
          const entry = dir && dir.organizations.find(o => o.id === org);
          const keys = entry ? [entry.en, entry.fr, ...(entry.aliases || [])].map(norm) : [norm(org)];
          const hit = d.organizations.find(o => o.id === org || keys.includes(norm(o.name_en)) || keys.includes(norm(o.name_fr)));
          if (hit) st.ctaOrg = hit.id;
        }
        render(false);
      }).catch(() => { st.ctaError = true; render(false); });
  }

  /* ---------- Recommendations and responses ---------- */
  function log(sec) {
    const d = st.logDraft, statuses = tr(sec.statuses);
    const rows = st.log.map((r, k) => "<tr><td>" + esc(r.rec) + "</td><td>" + esc(r.fn) + "</td><td>" + esc(r.date) + "</td><td>" + esc(statuses[Number(r.status)] || "") + "</td><td>" + esc(r.ev) + '</td><td><button type="button" data-log-remove="' + k + '">' + esc(L("Remove", "Retirer")) + "</button></td></tr>").join("");
    return '<section id="' + esc(sec.id) + '" aria-labelledby="' + esc(sec.id) + '-title"><h2 id="' + esc(sec.id) + '-title">' + esc(tr(sec.title)) + "</h2><p>" + esc(tr(sec.intro)) + '</p><div class="panel">' +
      '<label for="log-rec">' + esc(L("Recommendation or concern, in summary (no names or case details)", "Recommandation ou préoccupation, en résumé (sans noms ni détails de dossiers)")) + '</label><textarea id="log-rec" rows="3">' + esc(d.rec) + "</textarea>" +
      '<div class="grid"><div><label for="log-fn">' + esc(L("Responsible function (not a person’s name)", "Fonction responsable (pas le nom d’une personne)")) + '</label><input type="text" id="log-fn" value="' + esc(d.fn) + '"></div>' +
      '<div><label for="log-date">' + esc(L("Date of the response or decision", "Date de la réponse ou de la décision")) + '</label><input type="date" id="log-date" value="' + esc(d.date) + '"></div>' +
      '<div><label for="log-status">' + esc(L("Status", "État")) + '</label><select id="log-status">' + statuses.map((s, k) => '<option value="' + k + '" ' + (String(k) === String(d.status) ? "selected" : "") + ">" + esc(s) + "</option>").join("") + "</select></div></div>" +
      '<label for="log-ev">' + esc(L("Link to the response or evidence (optional)", "Lien vers la réponse ou la preuve (facultatif)")) + '</label><input type="text" id="log-ev" value="' + esc(d.ev) + '">' +
      '<div class="row"><button type="button" class="primary" id="log-add">' + esc(L("Add to the list", "Ajouter à la liste")) + '</button><button type="button" id="log-csv"' + (st.log.length ? "" : " disabled") + ">" + esc(L("Download the list (.csv)", "Télécharger la liste (.csv)")) + "</button></div>" +
      '<p role="status" class="small" id="log-msg"></p>' +
      (st.log.length ? '<div class="scroll"><table class="log"><caption class="small">' + esc(L("Recommendations recorded in this browser tab", "Recommandations consignées dans cet onglet")) + "</caption><thead><tr><th scope=\"col\">" + esc(L("Recommendation", "Recommandation")) + "</th><th scope=\"col\">" + esc(L("Function", "Fonction")) + "</th><th scope=\"col\">" + esc(L("Date", "Date")) + "</th><th scope=\"col\">" + esc(L("Status", "État")) + "</th><th scope=\"col\">" + esc(L("Evidence", "Preuve")) + "</th><th scope=\"col\"><span class=\"skip\">" + esc(L("Action", "Action")) + "</span></th></tr></thead><tbody>" + rows + "</tbody></table></div>" : '<p class="small">' + esc(L("No recommendations recorded yet. The list stays in this browser tab and is cleared when you close it.", "Aucune recommandation consignée. La liste reste dans cet onglet et s’efface à sa fermeture.")) + "</p>") +
      "</div></section>";
  }

  function explorerLink(sec) {
    return '<section class="panel" id="' + esc(sec.id) + '" aria-labelledby="' + esc(sec.id) + '-title"><h2 id="' + esc(sec.id) + '-title">' + esc(tr(sec.title)) + "</h2><p>" + esc(tr(sec.intro)) + '</p><p><a href="' + esc(href("department-evidence-explorer/" + (sec.lens ? "?lens=" + sec.lens : ""))) + '">' + esc(L("Open the department evidence explorer", "Ouvrir l’explorateur des données ministérielles")) + "</a></p></section>";
  }

  function record(sec) {
    return '<section id="record" aria-labelledby="record-title"><h2 id="record-title">' + esc(tr(sec.title || ["Create a record", "Produire une fiche"])) + "</h2><p>" + esc(tr(sec.intro)) + '</p><div class="panel">' +
      '<label for="rec-notes">' + esc(L("Local context, decision or next step (no names or personal information)", "Contexte local, décision ou prochaine étape (sans noms ni renseignements personnels)")) + '</label><textarea id="rec-notes" maxlength="3000">' + esc(st.notes) + "</textarea>" +
      '<div class="grid"><div><label for="rec-owner">' + esc(L("Responsible function (optional)", "Fonction responsable (facultatif)")) + '</label><input type="text" id="rec-owner" value="' + esc(st.owner) + '"></div>' +
      '<div><label for="rec-due">' + esc(L("Review date (optional)", "Date d’examen (facultatif)")) + '</label><input type="date" id="rec-due" value="' + esc(st.due) + '"></div>' +
      '<div><label for="rec-measure">' + esc(L("How success will be measured (optional)", "Mesure du succès (facultatif)")) + '</label><input type="text" id="rec-measure" value="' + esc(st.measure) + '"></div></div>' +
      '<div class="row no-print"><button type="button" class="primary" id="rec-build">' + esc(L("Create the record", "Produire la fiche")) + '</button><button type="button" id="rec-download">' + esc(L("Download (.txt)", "Télécharger (.txt)")) + '</button><button type="button" id="rec-copy">' + esc(L("Copy", "Copier")) + '</button><button type="button" id="rec-print">' + esc(L("Print or save as PDF", "Imprimer ou enregistrer en PDF")) + "</button></div>" +
      '<p class="small" role="status" id="rec-msg"></p><pre class="out" id="rec-out" aria-live="polite"' + (st.record ? "" : " hidden") + ">" + esc(st.record) + "</pre>" +
      '<p class="small">' + esc(L("What you type stays in this browser tab. Nothing is saved or sent.", "Ce que vous saisissez reste dans cet onglet. Rien n’est enregistré ni envoyé.")) + "</p></div></section>";
  }

  function related() {
    const others = C.order.filter(k => k !== slug && C.tools[k]);
    if (slug === "hub") return "";
    return '<section aria-labelledby="related-title"><h2 id="related-title">' + esc(L("Other systemic change tools", "Autres outils de changement systémique")) + '</h2><ul>' +
      others.map(k => { const t = C.tools[k]; return '<li><a href="' + esc(t.external ? tr(t.href) : href(t.href)) + '">' + esc(tr(t.title)) + "</a></li>"; }).join("") + "</ul></section>";
  }

  function footer() {
    return '<footer class="site-footer"><p>' + esc(L("Independent resource using published Government of Canada sources. Proposals on these pages need local review and the appropriate delegated authority. Some source pages open in English; use the language link on those pages.",
      "Ressource indépendante fondée sur des sources publiées du gouvernement du Canada. Les propositions de ces pages exigent un examen local et la délégation de pouvoirs appropriée. Certaines pages sources s’ouvrent en anglais; utilisez le lien de langue de ces pages.")) +
      '</p><p><a href="' + esc(href(site.href)) + '">' + esc(L("GC Equity home", "Accueil d’Équité-GC")) + "</a></p></footer>";
  }

  /* ---------- Record text ---------- */
  function buildRecord() {
    const lines = [tr(P.title), L("Record created", "Fiche produite le") + COL() + today()];
    const ctaOrg = st.ctaData && st.ctaData.organizations.find(o => o.id === st.ctaOrg);
    if (ctaOrg) lines.push(L("Department or agency", "Ministère ou organisme") + COL() + tr([ctaOrg.name_en, ctaOrg.name_fr]));
    for (const sec of P.sections) {
      if (sec.type === "library") {
        const list = sec.groups.flatMap(g => g.items);
        if (sec.mode === "pick") {
          const chosen = list.filter(it => st.picked.has(it.id));
          if (!chosen.length) continue;
          lines.push("", tr(sec.title));
          for (const it of chosen) {
            lines.push("", tr(it.title));
            for (const f of it.fields) lines.push(tr(f.l) + COL() + tr(f.v));
            if (it.sources && it.sources.length) lines.push(L("Sources", "Sources") + COL() + it.sources.map(sourceText).join("; "));
          }
        } else if (sec.mode === "compare") {
          const statuses = tr(sec.statuses), nA = st.optA || L("Option A", "Option A"), nB = st.optB || L("Option B", "Option B");
          lines.push("", tr(sec.title));
          for (const g of sec.groups) for (const it of g.items) {
            const a = Number(st.status[it.id] || 0), b = Number(st.statusB[it.id] || 0);
            lines.push("- " + tr(it.title), "  " + nA + COL() + statuses[a], "  " + nB + COL() + statuses[b]);
            if (a > 0 || b > 0) for (const f of it.fields.slice(1)) lines.push("  " + tr(f.l) + COL() + tr(f.v));
          }
        } else if (sec.mode === "status" || sec.mode === "tracking") {
          const statuses = tr(sec.statuses);
          const counts = statuses.map((s, k) => list.filter(it => Number(st.status[it.id] || 0) === k).length);
          lines.push("", tr(sec.title), statuses.map((s, k) => s + COL() + counts[k]).join("; "));
          for (const g of sec.groups) {
            if (g.title) lines.push("", tr(g.title));
            for (const it of g.items) {
              const s = Number(st.status[it.id] || 0);
              lines.push("- " + tr(it.title) + COL() + statuses[s] + (st.evidence[it.id] ? " (" + st.evidence[it.id] + ")" : ""));
              if (s > 0) for (const f of it.fields.slice(1)) lines.push("  " + tr(f.l) + COL() + tr(f.v));
            }
          }
        } else if (sec.mode === "hours") {
          const counted = list.map(it => [it, (Number((st.hours[it.id] || {}).w) || 0) * (Number((st.hours[it.id] || {}).n) || 0)]).filter(x => x[1] > 0);
          if (!counted.length) continue;
          const sum = counted.reduce((a, x) => a + x[1], 0);
          lines.push("", tr(sec.title), L("Estimated total: ", "Total estimé\u00a0: ") + fmtHours(sum));
          for (const [it, n] of counted) {
            const h = st.hours[it.id];
            lines.push("", tr(it.title) + COL() + fmtHours(n) + " (" + h.w + L(" hours a week for ", " heures par semaine pendant ") + h.n + L(" weeks)", " semaines)"));
            for (const f of it.fields.slice(1)) lines.push(tr(f.l) + COL() + tr(f.v));
          }
        }
      } else if (sec.type === "global") {
        const c = country(sec);
        lines.push("", tr(sec.title), L("Country", "Pays") + COL() + tr(c.name) + " (" + c.year + ")", tr(c.scope));
        for (const x of shown(sec)) lines.push("- " + tr(x.l) + COL() + pctF(x.value) + (x.comparator != null ? "; " + tr(x.cl) + COL() + pctF(x.comparator) : "") + ". " + tr(x.note));
        lines.push(L("Source", "Source") + COL() + tr(c.source));
      } else if (sec.type === "scanner" && st.flags) {
        lines.push("", tr(sec.title), L("Wordings to review: ", "Formulations à examiner\u00a0: ") + st.flags.length);
        for (const f of st.flags) lines.push("- " + tr(f.rule.title) + " (" + f.matches.join("; ") + "): " + tr(f.rule.change));
      } else if (sec.type === "log" && st.log.length) {
        const statuses = tr(sec.statuses);
        lines.push("", tr(sec.title));
        for (const r of st.log) lines.push("- " + [r.rec, r.fn, r.date, statuses[Number(r.status)], r.ev].filter(Boolean).join(" | "));
      }
    }
    if (st.notes.trim()) lines.push("", L("Local context or decision", "Contexte local ou décision") + COL() + st.notes.trim());
    if (st.owner.trim()) lines.push(L("Responsible function", "Fonction responsable") + COL() + st.owner.trim());
    if (st.due) lines.push(L("Review date", "Date d’examen") + COL() + st.due);
    if (st.measure.trim()) lines.push(L("How success will be measured", "Mesure du succès") + COL() + st.measure.trim());
    if (lines.length === 2) lines.push("", L("Nothing selected yet. Choose topics, ratings or entries above, then create the record again.", "Rien n’a encore été choisi. Choisissez des sujets, des évaluations ou des entrées ci-dessus, puis produisez de nouveau la fiche."));
    lines.push("", tr(P.limits || ["These are proposals for local review. Verify current requirements and delegated authority before acting.", "Ce sont des propositions à examiner localement. Vérifiez les exigences en vigueur et la délégation de pouvoirs avant d’agir."]));
    return lines.join("\n");
  }
  function save(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: type || "text/plain;charset=utf-8" }));
    a.download = name;
    a.hidden = true;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const csvCell = v => { let x = String(v ?? ""); if (/^\s*[=+@-]/.test(x)) x = "'" + x; return '"' + x.replace(/"/g, '""') + '"'; };

  /* ---------- Render and events ---------- */
  function render(focusSwitch) {
    document.documentElement.lang = lang;
    document.title = tr(P.title) + " | " + L("GC Equity", "Équité-GC");
    let main = "";
    for (const sec of P.sections) {
      if (sec.type === "hub") main += hub(sec);
      else if (sec.type === "library") main += library(sec);
      else if (sec.type === "scanner") main += scanner(sec);
      else if (sec.type === "cta") main += cta(sec);
      else if (sec.type === "global") main += globalCompare(sec);
      else if (sec.type === "log") main += log(sec);
      else if (sec.type === "explorer") main += explorerLink(sec);
      else if (sec.type === "record") main += record(sec);
      else if (sec.type === "text") main += '<section aria-labelledby="' + esc(sec.id) + '-title"><h2 id="' + esc(sec.id) + '-title">' + esc(tr(sec.title)) + "</h2>" + tr(sec.paragraphs).map(p => "<p>" + esc(p) + "</p>").join("") + "</section>";
    }
    app.innerHTML = header() + '<main id="main" tabindex="-1">' + main + related() + "</main>" + footer();
    for (const sec of P.sections) if (sec.type === "library" && st.query[sec.id]) filter(sec.id);
    if (focusSwitch) $("switch").focus();
  }

  app.addEventListener("click", ev => {
    const t = ev.target.closest("button");
    if (!t) return;
    if (t.id === "switch") {
      lang = lang === "en" ? "fr" : "en";
      const u = new URL(location.href);
      u.searchParams.set("lang", lang);
      history.replaceState(null, "", u.pathname + u.search + u.hash);
      if (st.record) st.record = buildRecord();
      render(true);
    } else if (t.id === "scan-run") {
      runScan();
      render(false);
      const out = $("scan-out");
      if (out) { out.setAttribute("tabindex", "-1"); out.focus(); }
    } else if (t.id === "scan-clear") {
      st.posting = ""; st.flags = null; render(false); $("scan-text").focus();
    } else if (t.id === "log-add") {
      const d = st.logDraft;
      if (!d.rec.trim()) { $("log-msg").textContent = L("Enter a recommendation or concern first.", "Saisissez d’abord une recommandation ou une préoccupation."); $("log-rec").focus(); return; }
      st.log.push({ ...d });
      st.logDraft = { rec: "", fn: "", date: "", status: "0", ev: "" };
      render(false);
      $("log-msg").textContent = L("Added. The list has " + st.log.length + " entries.", "Ajoutée. La liste compte " + st.log.length + " entrées.");
      $("log-rec").focus();
    } else if (t.dataset.logRemove !== undefined) {
      st.log.splice(Number(t.dataset.logRemove), 1);
      render(false);
      $("log-msg").textContent = L("Entry removed.", "Entrée retirée.");
      $("log-rec").focus();
    } else if (t.id === "log-csv") {
      const sec = P.sections.find(s => s.type === "log"), statuses = tr(sec.statuses);
      const rows = [[L("Recommendation", "Recommandation"), L("Function", "Fonction"), L("Date", "Date"), L("Status", "État"), L("Evidence", "Preuve")], ...st.log.map(r => [r.rec, r.fn, r.date, statuses[Number(r.status)], r.ev])];
      save("recommendations-" + today() + ".csv", "﻿" + rows.map(r => r.map(csvCell).join(",")).join("\r\n"), "text/csv;charset=utf-8");
    } else if (t.id === "rec-build" || t.id === "rec-download" || t.id === "rec-copy" || t.id === "rec-print") {
      st.record = buildRecord();
      const out = $("rec-out");
      out.textContent = st.record;
      out.hidden = false;
      if (t.id === "rec-download") save(slug + "-" + today() + ".txt", st.record);
      if (t.id === "rec-copy") {
        const done = () => { $("rec-msg").textContent = L("Record copied.", "Fiche copiée."); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(st.record).then(done, () => { $("rec-msg").textContent = L("Copy was blocked by the browser. Select the record text below and copy it.", "Le navigateur a bloqué la copie. Sélectionnez le texte de la fiche ci-dessous et copiez-le."); });
      }
      if (t.id === "rec-build") $("rec-msg").textContent = L("Record created below.", "Fiche produite ci-dessous.");
      if (t.id === "rec-print") window.print();
    }
  });

  app.addEventListener("input", ev => {
    const el = ev.target;
    if (el.dataset.search) { st.query[el.dataset.search] = el.value; filter(el.dataset.search); }
    else if (el.dataset.evidence) st.evidence[el.dataset.evidence] = el.value;
    else if (el.id === "opt-a") st.optA = el.value;
    else if (el.id === "opt-b") st.optB = el.value;
    else if (el.dataset.hours) {
      const h = st.hours[el.dataset.hours] || (st.hours[el.dataset.hours] = { w: "", n: "" });
      h[el.dataset.part] = el.value;
      const total = (Number(h.w) || 0) * (Number(h.n) || 0), out = $("ht-" + el.dataset.hours);
      if (out) out.textContent = L("Estimated total: ", "Total estimé\u00a0: ") + fmtHours(total);
    }
    else if (el.id === "scan-text") st.posting = el.value;
    else if (el.id === "rec-notes") st.notes = el.value;
    else if (el.id === "rec-owner") st.owner = el.value;
    else if (el.id === "rec-measure") st.measure = el.value;
    else if (el.id === "log-rec") st.logDraft.rec = el.value;
    else if (el.id === "log-fn") st.logDraft.fn = el.value;
    else if (el.id === "log-ev") st.logDraft.ev = el.value;
  });
  app.addEventListener("change", ev => {
    const el = ev.target;
    if (el.dataset.pick) { el.checked ? st.picked.add(el.dataset.pick) : st.picked.delete(el.dataset.pick); }
    else if (el.dataset.status) st.status[el.dataset.status] = Number(el.value);
    else if (el.dataset.statusb) st.statusB[el.dataset.statusb] = Number(el.value);
    else if (el.id === "rec-due") st.due = el.value;
    else if (el.id === "log-date") st.logDraft.date = el.value;
    else if (el.id === "log-status") st.logDraft.status = el.value;
    else if (el.id === "gl-country" || el.id === "gl-topic") {
      if (el.id === "gl-country") st.country = el.value; else st.topic = el.value;
      const u = new URL(location.href);
      u.searchParams.set("country", st.country);
      if (st.topic === "all") u.searchParams.delete("topic"); else u.searchParams.set("topic", st.topic);
      history.replaceState(null, "", u.pathname + u.search + u.hash);
      render(false);
      $(el.id).focus();
    }
    else if (el.id === "cta-org") {
      st.ctaOrg = el.value;
      render(false);
      $("cta-org").focus();
    }
  });

  render(false);
  if (P.sections.some(s => s.type === "cta")) loadCta();
  if (location.hash) { const target = document.getElementById(location.hash.slice(1)); if (target) target.scrollIntoView(); }
})();
