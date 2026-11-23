/* Read-only, accessible CSV viewer for supplemental official employer files.
 * No analytics, uploads, storage, merging across employers, or inferred values.
 */
(function () {
  'use strict';
  const PER_PAGE = 30;
  function language() {
    return document.documentElement.lang === 'fr' ||
      new URLSearchParams(location.search).get('lang') === 'fr' ? 'fr' : 'en';
  }
  const tr = (en, fr) => language() === 'fr' ? fr : en;
  function parseCSV(src) {
    const rows = []; let row = [], field = '', quoted = false;
    src = src.replace(/^\uFEFF/, '');
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (c === '"') {
        if (quoted && src[i + 1] === '"') { field += '"'; i++; }
        else quoted = !quoted;
      } else if (c === ',' && !quoted) {
        row.push(field); field = '';
      } else if ((c === '\n' || c === '\r') && !quoted) {
        if (c === '\r' && src[i + 1] === '\n') i++;
        row.push(field);
        if (row.some(v => v !== '')) rows.push(row);
        row = []; field = '';
      } else field += c;
    }
    if (field !== '' || row.length) {
      row.push(field); if (row.some(v => v !== '')) rows.push(row);
    }
    if (quoted) throw new Error('unclosed quote');
    return rows;
  }
  function label(node, en, fr) {
    node.dataset.en = en;
    node.dataset.fr = fr;
    node.textContent = tr(en, fr);
  }
  function makeViewer(link, card) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'csv-preview-toggle';
    label(button, 'View table', 'Afficher le tableau');
    button.setAttribute('aria-expanded', 'false');
    const panel = document.createElement('div');
    panel.className = 'csv-preview-panel'; panel.hidden = true;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', link.textContent.trim());
    const status = document.createElement('p');
    status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    panel.appendChild(status);
    let dataset = null, shown = 0;
    function render() {
      panel.querySelectorAll('table,button.csv-preview-next').forEach(x => x.remove());
      const headers = dataset[0] || [], values = dataset.slice(1), total = values.length;
      const table = document.createElement('table');
      table.className = 'csv-preview-table';
      const caption = document.createElement('caption');
      caption.textContent = link.textContent.trim(); table.appendChild(caption);
      const thead = document.createElement('thead'), hr = document.createElement('tr');
      headers.forEach(h => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = h; hr.appendChild(th); });
      thead.appendChild(hr); table.appendChild(thead);
      const tbody = document.createElement('tbody');
      for (const row of values.slice(0, Math.min(total, shown))) {
        const trNode = document.createElement('tr');
        headers.forEach((_, i) => {
          const td = document.createElement('td');
          td.textContent = row[i] == null ? '' : row[i]; trNode.appendChild(td);
        });
        tbody.appendChild(trNode);
      }
      table.appendChild(tbody); panel.appendChild(table);
      status.textContent = tr('Showing ' + Math.min(shown,total) + ' of ' + total + ' source rows.',
                              'Affichage de ' + Math.min(shown,total) + ' des ' + total + ' lignes sources.');
      if (shown < total) {
        const next = document.createElement('button'); next.type = 'button';
        next.className = 'csv-preview-next';
        label(next, 'Show next 30 rows', 'Afficher les 30 lignes suivantes');
        next.addEventListener('click', () => { shown += PER_PAGE; render(); });
        panel.appendChild(next);
      }
    }
    button.addEventListener('click', async () => {
      if (!panel.hidden) {
        panel.hidden = true; button.setAttribute('aria-expanded', 'false');
        label(button, 'View table', 'Afficher le tableau'); return;
      }
      panel.hidden = false; button.setAttribute('aria-expanded', 'true');
      label(button, 'Hide table', 'Masquer le tableau');
      if (dataset) { render(); return; }
      status.textContent = tr('Loading published source…', 'Chargement de la source publiée…');
      try {
        const response = await fetch(link.href, { credentials: 'same-origin' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const content = await response.text();
        if (content.length > 150000) throw new Error('large source');
        dataset = parseCSV(content);
        if (!dataset.length) throw new Error('empty source');
        shown = PER_PAGE; render();
      } catch (_) {
        status.textContent = tr('Unable to show this table here. Open the CSV link to read the original.',
          'Impossible d’afficher ce tableau ici. Ouvrez le lien CSV pour consulter la source.');
      }
    });
    link.insertAdjacentElement('afterend', button);
    button.insertAdjacentElement('afterend', panel);
  }
  function init() {
    document.querySelectorAll('#dataset-links .dataset-card').forEach(card => {
      if (!card.id.endsWith('-original')) return;
      card.querySelectorAll('a[href$=".csv"]').forEach(link => makeViewer(link, card));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
