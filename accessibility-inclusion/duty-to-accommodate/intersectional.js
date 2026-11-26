/* PSES 2024 EEINFODV departmental group explorer. Published group-level figures only. */
(function () {
  "use strict";
  const get = id => document.getElementById(id);
  const columns = ["Q84", "Q85", "Q86", "Q87", "Q88", "Q44e", "Q73p"];
  const groups = {
    "Racialized": { comparator: "Non-racialized", file: 0, en: "Racialized employees", fr: "Employés racisés", refEn: "Non-racialized employees", refFr: "Employés non racisés" },
    "Black": { comparator: "Not Black", file: 0, en: "Black employees", fr: "Employés noirs", refEn: "Employees who are not Black", refFr: "Employés qui ne sont pas noirs" },
    "Racialized, Woman": { comparator: "Non-racialized, Woman", file: 1, en: "Racialized women", fr: "Femmes racisées", refEn: "Non-racialized women", refFr: "Femmes non racisées" }
  };
  const explanations = {
    Q84: ["Requested accommodation", "A demandé une mesure d’adaptation"],
    Q85: ["Request was related to disability", "Demande liée au handicap"],
    Q86: ["At least one measure was implemented", "Au moins une mesure mise en œuvre"],
    Q87: ["Satisfied with the measures received", "Satisfaction envers les mesures reçues"],
    Q88: ["Comfortable requesting accommodation", "À l’aise de demander une adaptation"],
    Q44e: ["Accommodation issues negatively affected career (any extent)", "Effet négatif des problèmes d’adaptation sur la carrière (à tout degré)"],
    Q73p: ["Stress related to accommodation issues (any extent)", "Stress lié aux problèmes d’adaptation (à tout degré)"]
  };
  const files = ["dta-racialized-black-by-department.csv", "dta-racialized-women-by-department.csv"];
  let sources = [], view = [], shown = 15;
  const french = () => document.documentElement.lang === "fr";
  const label = (en, fr) => french() ? fr : en;
  const number = x => (x === "" || x == null || !Number.isFinite(Number(x))) ? null : Number(x);
  const fmt = x => x == null ? "—" : x.toLocaleString(french() ? "fr-CA" : "en-CA");
  function parseCSV(source) {
    source = source.replace(/^\uFEFF/, "");
    const lines = []; let row = [], value = "", quoted = false;
    for (let i = 0; i < source.length; i++) {
      const c = source[i];
      if (quoted) {
        if (c === '"' && source[i + 1] === '"') { value += '"'; i++; }
        else if (c === '"') quoted = false;
        else value += c;
      } else if (c === '"') quoted = true;
      else if (c === ",") { row.push(value); value = ""; }
      else if (c === "\n") { row.push(value.replace(/\r$/, "")); lines.push(row); row = []; value = ""; }
      else value += c;
    }
    if (row.length || value.length) { row.push(value); lines.push(row); }
    const keys = lines.shift() || [];
    if (keys.join(",") !== "department,level1id,group,Q84,Q84_n,Q85,Q85_n,Q86,Q86_n,Q87,Q87_n,Q88,Q88_n,Q44e,Q44e_n,Q73p,Q73p_n") throw new Error("Unexpected CSV header");
    return lines.filter(line => line.length === keys.length).map(line => Object.fromEntries(keys.map((k, i) => [k, line[i]])));
  }
  function threshold(group, metric) {
    if (metric === "Q87") return group === "Black" ? 20 : 30;
    if (metric === "Q85" || metric === "Q86") return group === "Black" ? 30 : 50;
    return group === "Black" ? 50 : 100;
  }
  function getRows() {
    const group = get("groupSelect").value, metric = get("groupMetric").value, meta = groups[group];
    const min = threshold(group, metric), adequate = get("groupBase").value === "adequate";
    const term = get("groupOrgSearch").value.trim().toLocaleLowerCase();
    const byId = new Map();
    for (const rec of sources[meta.file]) {
      if (rec.level1id === "00" || rec.level1id === "95") continue;
      if (!byId.has(rec.level1id)) byId.set(rec.level1id, { name: rec.department });
      byId.get(rec.level1id)[rec.group] = rec;
    }
    let rows = [];
    for (const item of byId.values()) {
      if (term && !item.name.toLocaleLowerCase().includes(term)) continue;
      const chosen = item[group], reference = item[meta.comparator];
      const value = chosen ? number(chosen[metric]) : null;
      const n = chosen ? number(chosen[metric + "_n"]) : null;
      const compared = reference ? number(reference[metric]) : null;
      const refN = reference ? number(reference[metric + "_n"]) : null;
      if (adequate && (value == null || n == null || n < min)) continue;
      const validReference = compared != null && refN != null && (!adequate || refN >= min);
      rows.push({
        name: item.name,
        value, n,
        compared: validReference ? compared : null,
        refN: validReference ? refN : null,
        gap: value != null && validReference ? value - compared : null,
        lowBase: n != null && n < min,
        lowRef: validReference && refN < min
      });
    }
    const sort = get("groupSort").value;
    rows.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      const pick = x => sort === "gap" ? x.gap : x.value;
      const x = pick(a), y = pick(b);
      if (x == null) return y == null ? a.name.localeCompare(b.name) : 1;
      if (y == null) return -1;
      const order = sort === "high" ? y - x : x - y;
      return order || a.name.localeCompare(b.name);
    });
    return { rows, group, metric, min, meta, adequate };
  }
  function cell(text, sub, caution) {
    const td = document.createElement("td");
    const primary = document.createElement("span");
    primary.textContent = text; td.appendChild(primary);
    if (sub) {
      const small = document.createElement("small"); small.className = "dta-sample";
      small.textContent = sub; td.appendChild(small);
    }
    if (caution) {
      td.classList.add("dta-small-sample");
      td.title = label("Small sample: interpret cautiously", "Petit échantillon : à interpréter avec prudence");
    }
    return td;
  }
  function render() {
    if (!sources.length) return;
    const { rows, group, metric, min, meta, adequate } = getRows();
    view = rows;
    get("groupSelectedHead").textContent = label(meta.en, meta.fr) + " (%) / n";
    get("groupReferenceHead").textContent = label(meta.refEn, meta.refFr) + " (%) / n";
    const description = explanations[metric];
    get("groupResultCount").textContent = label(rows.length + " departments shown", rows.length + " ministères affichés");
    get("groupMetricNote").textContent = label("Question " + metric + ": " + description[0] + ". " + (adequate ? "Minimum n = " + min + "." : "Small published samples included; do not use them for ranking."),
      "Question " + metric + " : " + description[1] + ". " + (adequate ? "Minimum n = " + min + "." : "Les petits échantillons publiés sont inclus; ne les utilisez pas pour classer les ministères."));
    const body = get("groupTbody"); body.replaceChildren();
    for (const r of view.slice(0, shown)) {
      const tr = document.createElement("tr");
      const name = document.createElement("th"); name.scope = "row"; name.textContent = r.name;
      tr.appendChild(name);
      tr.appendChild(cell(r.value == null ? "—" : fmt(r.value) + "%", r.n == null ? "" : "n = " + fmt(r.n), r.lowBase));
      tr.appendChild(cell(r.compared == null ? "—" : fmt(r.compared) + "%", r.refN == null ? "" : "n = " + fmt(r.refN), r.lowRef));
      tr.appendChild(cell(r.gap == null ? "—" : (r.gap > 0 ? "+" : "") + fmt(r.gap), "", r.lowBase || r.lowRef));
      body.appendChild(tr);
    }
    if (!view.length) {
      const tr = document.createElement("tr"), td = document.createElement("td");
      td.colSpan = 4; td.textContent = label("No usable published results. Try another question, group or sample-size filter.", "Aucun résultat publié utilisable. Choisissez une autre question, un autre groupe ou un autre filtre.");
      tr.appendChild(td); body.appendChild(tr);
    }
    const more = get("groupMore");
    more.hidden = view.length <= 15;
    more.textContent = shown < view.length ? label("Show more", "Afficher plus") : label("Show fewer", "Afficher moins");
    more.setAttribute("aria-expanded", String(shown >= view.length));
  }
  document.addEventListener("DOMContentLoaded", function () {
    ["groupOrgSearch", "groupSelect", "groupMetric", "groupBase", "groupSort"].forEach(id => {
      get(id).addEventListener(id === "groupOrgSearch" ? "input" : "change", function () { shown = 15; render(); });
    });
    get("groupMore").addEventListener("click", function () { shown = shown < view.length ? shown + 15 : 15; render(); });
    new MutationObserver(() => render()).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    Promise.all(files.map(name => fetch(name).then(response => {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.text();
    }).then(parseCSV))).then(data => {
      sources = data;
      get("groupLoad").hidden = true;
      get("groupTableArea").hidden = false;
      render();
    }).catch(() => {
      get("groupLoad").textContent = label("Interactive group data could not load. Use the complete CSV downloads below.", "Impossible de charger les données interactives. Consultez les téléchargements CSV complets ci-dessous.");
    });
  });
})();
