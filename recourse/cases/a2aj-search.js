/* Federal public-service recourse: optional A2AJ legal-data search.
 * Source: https://github.com/a2aj-ca/a2aj-api-public
 * Metadata and links only. No bulk downloading or storing decision text.
 * Each request is made after the visitor submits a search, and is subject
 * to the source provider's published API limits and upstream source terms.
 */
(function () {
  'use strict';
  var form = document.getElementById('a2aj-form');
  if (!form) return;
  var root = 'https://api.a2aj.ca';
  var $ = function (id) { return document.getElementById(id); };
  var query = $('a2aj-query'), dataset = $('a2aj-source'), type = $('a2aj-type');
  var start = $('a2aj-start'), end = $('a2aj-end'), sort = $('a2aj-sort');
  var lang = $('a2aj-language'), results = $('a2aj-results');
  var status = $('a2aj-status'), coverage = $('a2aj-coverage');
  var controller = null;
  var collections = ['FPSLREB','CHRT','OHSTC','CIRB','PSDPT','FC','FCA','SCC','CMAC','OIC'];
  var names = {
    FPSLREB: 'Federal Public Sector Labour Relations and Employment Board / CRTEFP',
    CHRT: 'Canadian Human Rights Tribunal / Tribunal canadien des droits de la personne',
    OHSTC: 'Occupational Health and Safety Tribunal Canada / Tribunal SST Canada',
    CIRB: 'Canada Industrial Relations Board / Conseil canadien des relations industrielles',
    PSDPT: 'Public Servants Disclosure Protection Tribunal / Tribunal de la protection des fonctionnaires divulgateurs',
    FC: 'Federal Court / Cour fédérale',
    FCA: 'Federal Court of Appeal / Cour d’appel fédérale',
    SCC: 'Supreme Court of Canada / Cour suprême du Canada',
    CMAC: 'Court Martial Appeal Court / Cour d’appel de la cour martiale',
    OIC: 'Information Commissioner of Canada / Commissaire à l’information'
  };
  var filters = {
    '': collections.join(','),
    'all': '',
    'labour': 'FPSLREB,CIRB',
    'rights': 'CHRT,FC,FCA,SCC',
    'safety': 'OHSTC,FC,FCA',
    'disclosure': 'PSDPT,FC,FCA',
    'court': 'FC,FCA,SCC,CMAC',
    'FPSLREB':'FPSLREB',
    'CHRT':'CHRT',
    'OHSTC':'OHSTC',
    'CIRB':'CIRB',
    'PSDPT':'PSDPT',
    'FC':'FC',
    'FCA':'FCA',
    'SCC':'SCC',
    'CMAC':'CMAC',
    'OIC':'OIC'
  };
  function localize(value) { var parts=String(value).split(' / '); return parts.length===2?parts[document.documentElement.lang==='fr'?1:0]:String(value); }
  function txt(node, value) {
    var text=String(value == null ? '' : value), parts=text.split(' / ');
    if(parts.length===2 && node.tagName!=='H3' && !node.classList.contains('a2aj-snippet')) {node.dataset.en=parts[0];node.dataset.fr=parts[1];text=localize(text);}
    node.textContent=text;
  }
  function add(parent, element, content, className) {
    var el = document.createElement(element);
    if (typeof content !== 'undefined') txt(el, content);
    if (className) el.className = className;
    parent.appendChild(el);
    return el;
  }
  function reliableUrl(value) {
    if (typeof value !== 'string') return '';
    try { var u = new URL(value); return u.protocol === 'https:' ? u.href : ''; }
    catch (e) { return ''; }
  }
  function external(parent, title, url) {
    var dest = reliableUrl(url);
    if (!dest) return;
    var a = add(parent, 'a', title); a.href = dest;
    a.target = '_blank'; a.rel = 'noopener noreferrer';
    return a;
  }
  function citation(doc) {
    return doc.citation_en || doc.citation_fr || doc.citation2_en || doc.citation2_fr || 'Citation not supplied / Référence non fournie';
  }
  function recTitle(doc) {
    return (lang.value === 'fr' ? (doc.name_fr || doc.name_en) : (doc.name_en || doc.name_fr)) ||
      'Untitled decision / Décision sans titre';
  }
  function recDate(doc) {
    var date = doc.document_date_en || doc.document_date_fr || '';
    return typeof date === 'string' ? date.slice(0,10) : '';
  }
  function recUrl(doc) { return lang.value === 'fr' ? (doc.url_fr || doc.url_en) : (doc.url_en || doc.url_fr); }
  function failure(message) {
    txt(status, message);
    results.replaceChildren();
    var li = add(results,'li');
    add(li,'p','Search results could not be loaded. The external service may be unavailable or blocked by your network. / Impossible de charger les résultats; le service externe est peut-être inaccessible.');
    external(li,'Search directly with the A2AJ provider / Rechercher directement dans A2AJ','https://law.a2aj.ca/');
    external(li,'Search official FPSLREB decisions / Rechercher les décisions officielles CRTEFP','https://decisions.fpslreb-crtespf.gc.ca/fpslreb-crtespf/en/nav.do');
  }
  function show(data) {
    results.replaceChildren();
    var list = data && Array.isArray(data.results) ? data.results : null;
    if (!list) { failure('Unexpected search response / Réponse de recherche inattendue'); return; }
    if (!list.length) {
      txt(status,'No matching published records returned. Try a different phrase or body. / Aucun dossier retourné. Essayez une autre expression ou un autre organisme.');
      return;
    }
    txt(status, 'Showing ' + list.length + ' source records (maximum 50 for one search). These are not findings about whether discrimination occurred. / ' + list.length + ' dossiers affichés (maximum 50 par recherche); le résultat ne prouve pas la discrimination.');
    list.forEach(function (doc) {
      if (!doc || typeof doc !== 'object') return;
      var item = add(results,'li',undefined,'a2aj-hit');
      add(item,'h3',recTitle(doc));
      add(item,'p',[citation(doc), localize(names[doc.dataset] || doc.dataset || ''), recDate(doc)].filter(Boolean).join(' · '),'a2aj-meta');
      var snip = doc.snippet || '';
      if (snip) {
        // The provider can send HTML highlighting: intentionally render it as plain text.
        var clean = String(snip).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
        if (clean) add(item,'p',clean.slice(0,560) + (clean.length > 560 ? '…' : ''),'a2aj-snippet');
      }
      var actions = add(item,'p',undefined,'a2aj-links');
      if (!external(actions,'Read at the decision source / Lire à la source',recUrl(doc))) {
        external(actions,'Search by citation at A2AJ / Rechercher par référence','https://law.a2aj.ca/');
      }
      add(item,'p','Source metadata, not a case-specific legal explanation. Verify the decision and any appeal. / Métadonnées : vérifiez la décision et tout appel.','a2aj-small');
    });
    if (list.length >= 50) {
      add($('a2aj-more'),'p','The provider returns at most 50 per request. Narrow the legal phrase, source or date range to find additional decisions; this is not the complete result set. / Le fournisseur retourne au plus 50 résultats par requête. Affinez les mots-clés, la source ou les dates.','a2aj-note');
    }
  }
  function validateDate(value) { return !value || /^\d{4}-\d{2}-\d{2}$/.test(value); }
  form.addEventListener('submit', async function (evt) {
    evt.preventDefault();
    if (controller) controller.abort();
    var q = query.value.trim();
    if (!q) { txt(status,'Enter a topic, case name or citation to search. / Entrez une question, un titre ou une référence.'); query.focus(); return; }
    if (!validateDate(start.value) || !validateDate(end.value) || (start.value && end.value && start.value > end.value)) {
      txt(status,'Check the date range. / Vérifiez la plage de dates.'); return;
    }
    controller = new AbortController();
    var requestController=controller, timedOut=false;
    var timer=setTimeout(function(){timedOut=true;requestController.abort();},20000);
    results.replaceChildren(); $('a2aj-more').replaceChildren();
    txt(status,'Searching public case-law collections… / Recherche dans les collections publiques…');
    var selected = Object.prototype.hasOwnProperty.call(filters,dataset.value) ? filters[dataset.value] : filters[''];
    var params = new URLSearchParams({
      query:q, doc_type:'cases', search_type:type.value,
      sort_results:sort.value, search_language:lang.value,
      size:'50'
    });
    if (selected) params.set('dataset',selected);
    if (start.value) params.set('start_date',start.value);
    if (end.value) params.set('end_date',end.value);
    try {
      var r = await fetch(root + '/search?' + params.toString(), {signal:requestController.signal,mode:'cors',credentials:'omit',cache:'no-store'});
      if (!r.ok) throw new Error('HTTP '+r.status);
      show(await r.json());
    } catch (err) {
      if (err && err.name === 'AbortError' && !timedOut) return;
      failure('External case-law search unavailable / Recherche externe indisponible');
    } finally {clearTimeout(timer);}
  });
  document.querySelectorAll('[data-a2aj-topic]').forEach(function (button) {
    button.addEventListener('click', function () {
      query.value = (lang.value==='fr'?button.getAttribute('data-a2aj-topic-fr'):button.getAttribute('data-a2aj-topic')) || button.getAttribute('data-a2aj-topic') || '';
      dataset.value = button.getAttribute('data-a2aj-body') || '';
      form.requestSubmit();
    });
  });
  $('a2aj-reset').addEventListener('click',function () {
    if (controller) controller.abort();
    query.value=''; dataset.value=''; type.value='full_text'; sort.value='newest_first';
    start.value=''; end.value=''; lang.value=document.documentElement.lang==='fr'?'fr':'en';
    results.replaceChildren(); $('a2aj-more').replaceChildren();
    txt(status,'Ready to search published case law / Prêt à rechercher la jurisprudence');
  });
  $('a2aj-coverage-toggle').addEventListener('click', async function () {
    if (coverage.dataset.loaded === 'true') {
      coverage.hidden = !coverage.hidden;
      return;
    }
    coverage.hidden = false;
    txt(coverage,'Loading source coverage / Chargement des collections…');
    try {
      var r = await fetch(root+'/coverage?doc_type=cases',{mode:'cors',credentials:'omit'});
      if (!r.ok) throw new Error('HTTP '+r.status);
      var data = await r.json();
      if (!data || !Array.isArray(data.results)) throw new Error('Invalid coverage');
      coverage.replaceChildren();
      add(coverage,'p','These counts describe the published records in each source collection, not the number of racism or workplace cases. Source coverage and update dates vary. / Ces nombres concernent toutes les décisions de chaque collection, pas seulement les causes liées au racisme ou au travail.','a2aj-small');
      var ul=add(coverage,'ul');
      data.results.filter(function (d) {return collections.indexOf(d.dataset)>=0;})
        .sort(function (a,b) {return collections.indexOf(a.dataset)-collections.indexOf(b.dataset);})
        .forEach(function (d) {
          var row = add(ul,'li');
          add(row,'strong',d.dataset+' — ');
          add(row,'span',String(d.number_of_documents||0)+(document.documentElement.lang==='fr'?' dossiers publiés; ':' published records; ')+(d.earliest_document_date||'?')+' – '+(d.latest_document_date||'?'));
        });
      coverage.dataset.loaded='true';
    } catch (e) {
      txt(coverage,'Source coverage could not be retrieved. / Impossible de récupérer les données de couverture.');
      external(coverage,'View source coverage at A2AJ / Voir la couverture chez A2AJ','https://a2aj.ca/data/');
    }
  });
})();