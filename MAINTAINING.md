# Maintaining GC Equity / Équité-GC

This file describes the site as it is now. It is kept in the repository and is not published on the site (see `_config.yml`).

## Pages

- `index.html`: the main page, with three options (department or agency data, data for equity groups across the public service, presentations and briefing notes) and the AI chatbot box.
- `explorer.html`: the data pages, opened from the main page (`#departments`, `#data`, `#bhome`) and the guide and source pages. Opening `explorer.html` without a section returns visitors to the main page.
- `sources.html`: the list of 157 source files, showing which data files can be downloaded from the site.
- `women-femmes/`: a separate page on intersectional barriers for women, with its own files and README.

## Scripts

- `gc-ai.js`: the chatbot box. It opens ChatGPT, Claude, Copilot or Gemini in a new tab with the visitor's question. Nothing is sent until the visitor chooses a chatbot, and no API key is used.
- `gc-equity-additions.js`: subgroup tables on the department page, the group chooser and group summary, and the link to the main page.
- `gc-tools.js`: the employment cycle table, the tables built from `data/october-2026/`, the PowerPoint builder, the Word (.docx) files for the briefing note and the data request, and the links to share an organization or a group.
- `lib/pptxgen.bundle.js`: PptxGenJS 4.0.1 with JSZip (MIT licence), loaded only when a visitor asks for a PowerPoint or Word file. Files are built in the visitor's browser. Licences are in `lib/LICENSES.txt`.

## Data

- `data/october-2026/`: eight curated CSV files from Treasury Board tables and the independent Disproportionality Index project, and `public-source-inventory.csv`, the list shown on `sources.html`. `DI_imputation_estimates_NOT_TBS_PUBLISHED.csv` holds estimates that replace small counts Treasury Board did not publish; the site marks them and never presents them as Government of Canada data.
- `data/pses-2024-branches/<id>.json.gz`: the rows of the official 2024 Public Service Employee Survey file "Employee Groups by Second Organizational Level" (EELEVEL2ID.csv), one gzip file per organization, 2,011,833 rows in all. The list of organizations, branches, questions and groups is in `explorer.html` (`eq-branch-meta`). An organization's file loads only when a visitor opens that organization's branch results.
- `data/checksums.sha256`: a SHA-256 checksum for every data file. The site validation check fails when a data file changes and its checksum does not. Update the checksum only after reviewing the change.
- `data/source-dates.json`: for each official source, the "date modified" recorded when the site last used it or when the weekly check last confirmed it.

## Rules for data and wording

- Reproduce numbers from the published source. Keep suppressed values suppressed. A missing value is not zero.
- Mark estimates and calculated values as such.
- Do not add overlapping self-identification categories, and do not combine the 2024 disability table with the 2025 Indigenous table.
- Compare an organization with its own workforce availability where Treasury Board publishes it.
- A difference shows where to look more closely. It is not a finding of discrimination.
- Visitor text is in plain language, in English and French, with no em dashes.

## Checks

- `.github/workflows/site-validate.yml` (pull requests): script syntax, the `explorer.html` hash (update it only for a reviewed change), page size, the three main options, the eight datasets, data checksums, the branch data files, the library and its licences, and wording rules (no internal wording, credentials, private links or em dashes).
- `.github/workflows/browser-smoke.yml` (pull requests): on desktop and phone, the main page, chatbot links, the three options, an organization with its branch results, a group, the PowerPoint and Word downloads, French pages and the source list.
- `.github/workflows/source-check.yml` (Mondays, or run by hand): compares the "date modified" of each official source with `data/source-dates.json` and opens or updates one issue when a source shows a later date. After reviewing the change and updating the site if needed, record the new date in `data/source-dates.json`.
