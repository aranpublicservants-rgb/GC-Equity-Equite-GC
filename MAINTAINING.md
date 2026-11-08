# Maintaining GC Equity / Équité-GC

This file describes the site as it is now. It is kept in the repository and is not published on the site (see `_config.yml`).

## Pages

- `index.html`: the main page, with four options (department or agency data, data for equity groups across the public service, presentations and briefing notes, and the Call to Action page) and the AI chatbot box.
- `explorer.html`: the data pages, opened from the main page (`#departments`, `#data`, `#bhome`) and the guide and source pages. Opening `explorer.html` without a section returns visitors to the main page.
- `sources.html`: the list of 157 source files, showing which data files can be downloaded from the site.
- `call-to-action.html`: the 2021 Call to Action letters and 2024 self-assessments of 100 organizations, placed beside their representation in 2021 and 2025, the 2024 Public Service Employee Survey and the 2025 Staffing and Non-Partisanship Survey. It has a table that compares organizations and a record for each organization. Links take the form `call-to-action.html?org=<id>#record`.
- `women-femmes/`: a separate page on intersectional barriers for women, with its own files and README.

## Scripts

- `gc-ai.js`: the chatbot box. It opens ChatGPT, Claude, Copilot or Gemini in a new tab with the visitor's question. Nothing is sent until the visitor chooses a chatbot, and no API key is used.
- `gc-equity-additions.js`: subgroup tables on the department page, the group chooser and group summary, and the link to the main page.
- `gc-tools.js`: the employment cycle table, the tables built from `data/october-2026/`, the PowerPoint builder, the Word (.docx) files for the briefing note and the data request, the links to share an organization or a group, and two sections of the organization page: Call to Action commitments and results, and the 2025 staffing survey by group.
- `call-to-action.js`: the Call to Action page. It reads the three Call to Action data files and `assets/workspace-data.json`.
- `lib/pptxgen.bundle.js`: PptxGenJS 4.0.1 with JSZip (MIT licence), loaded only when a visitor asks for a PowerPoint or Word file. Files are built in the visitor's browser. Licences are in `lib/LICENSES.txt`.

## Data

- `data/october-2026/`: eight curated CSV files from Treasury Board tables and the independent Disproportionality Index project, and `public-source-inventory.csv`, the list shown on `sources.html`. `DI_imputation_estimates_NOT_TBS_PUBLISHED.csv` holds estimates that replace small counts Treasury Board did not publish; the site marks them and never presents them as Government of Canada data.
- `data/pses-2024-branches/<id>.json.gz`: the rows of the official 2024 Public Service Employee Survey file "Employee Groups by Second Organizational Level" (EELEVEL2ID.csv), one gzip file per organization, 2,011,833 rows in all. The list of organizations, branches, questions and groups is in `explorer.html` (`eq-branch-meta`). An organization's file loads only when a visitor opens that organization's branch results.
- `data/call-to-action-letters.json`: short English summaries of the 90 letters (2021) and 91 self-assessments (2024) published by the Privy Council Office, for 100 organizations, with a link to each original. Each record names the matching rows in the other data: `site_name` (Treasury Board tables), `pses_name` (2024 employee survey), `snps_name` (2025 staffing survey) and `plan_name` (2026-27 departmental plans). The goal status (`set`, `underway` or `none`) is read from the summary. This file is maintained by hand. `scripts/check-site.py` checks that every named row exists.
- `data/tbs-departmental-representation-2017-2025.json`: representation by department or agency, March 31, 2017 to 2025, from four Treasury Board pages: Indigenous Peoples, persons with disabilities and members of visible minorities, each with departmental workforce availability, and Black employees by department. A blank cell is `null`, never zero. Older labels for the same organization are mapped to the current name (`labels` keeps the label printed in each year), and rows whose names differ only in punctuation or case are merged.
- `data/snps-2025-by-organization.json`: seven questions of the 2025 Staffing and Non-Partisanship Survey by organization and group (all respondents, women, men, persons with and without disabilities, racialized and non-racialized, Indigenous and non-Indigenous, and Black respondents), from six Public Service Commission files. The Commission rounds weighted counts to whole numbers, so a group of fewer than 2,000 weighted respondents uses the sum of the published percentages and a larger group uses the weighted counts. A question the Commission did not publish for a group is left out.
- Rebuild the last two files with `python scripts/build-call-to-action-data.py --tbs DIR --snps DIR --retrieved YYYY-MM-DD`, from saved copies of the four Treasury Board pages and the six survey files (the script lists the file names). Add `--check` to compare with the published files without writing. Review the changes, then update `data/checksums.sha256` and `data/source-dates.json`.
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

- `.github/workflows/site-validate.yml` (pull requests and changes to `main`): runs `python scripts/check-site.py`, which checks the six pages, script syntax, linked assets, page size, data checksums, the branch data files, the workspace snapshot, the links between the Call to Action records and the other data, and wording rules (no internal wording, credentials or em dashes).
- `.github/workflows/browser-smoke.yml` (pull requests): on desktop and phone, the main page, chatbot links, the four options, an organization with its branch results and its Call to Action section, the Call to Action page, a group, the PowerPoint and Word downloads, French pages and the source list.
- `.github/workflows/source-check.yml` (Mondays, or run by hand): compares the "date modified" of each official source with `data/source-dates.json` and opens or updates one issue when a source shows a later date. After reviewing the change and updating the site if needed, record the new date in `data/source-dates.json`. The check asks Canada.ca over HTTP/1.1 without compression, the settings Canada.ca accepted from GitHub's servers in November 2026, and reads the date from either Canada.ca page template. A page that does not answer is listed as "not reached"; check it by hand when Treasury Board or the Privy Council Office announces new material. Open Government datasets and the Disproportionality Index project are checked automatically.


## Shared research workspace

The six entry pages load `gc-workspace.css` and `gc-workspace.js`. These provide shared navigation, bilingual controls, collection search, a browser data guide, saved views, an evidence basket, reporting-year comparisons, policy milestones, contribution matching and a personal commitments working record. The commitments tool also shows the chosen organization's Call to Action letter and self-assessment, and can start a working record from either document.

The main page loads its smaller data model without loading the full explorer. The collection search index loads only on request. Branch survey data still load one organization at a time. No AI API, account service, telemetry or paid backend is added.

The data guide uses structured retrieval and arithmetic. Do not describe it as a generative model. It must return an unavailable result instead of substituting a different population, group or period. Detailed data remain in the original explorer and its datasets. The `org` query parameter is restored through the organization selector; older hash links continue to work.

Evidence, views and working records use browser local storage. Evidence can be exported to JSON and imported in another browser. The briefing export is an HTML document suitable for printing to PDF; existing Word and PowerPoint builders remain available. Table captures keep at most 250 data rows; full CSV downloads remain in the data view. Chart snapshots are sanitized SVGs. Imported text and URLs are validated before display. Contribution emails are prepared in the visitor’s mail app; the website does not send email.

`assets/workspace-data.json` is a snapshot extracted from the explorer, the two published Treasury Board CSV series and the departmental plans page. `assets/search-index.json` contains published-page excerpts and catalogue records, including snapshots of eight related public sites. It does not index every interactive table cell. `assets/workspace-manifest.json` records the snapshot hashes and related repository commits. The assembly date is separate from all data reporting dates.

Regenerate with `node scripts/build-workspace.mjs` after reviewing source changes. The eight related repository checkouts are expected under `../related/`, using the repository names in that script. Keep their commit provenance with the generated index; never imply that a snapshot is a live search of those sites. Primary-source links for policy milestones and the executive and salary series were checked when this workspace was assembled.

Run `python scripts/check-site.py` before publishing. It checks inline and external JavaScript, linked assets, original published-data checksums and branch row counts, the new snapshot integrity and numeric/scope behavior. The desktop and phone smoke workflow also checks the guide, saved evidence, briefing download and year comparisons, then the original department, group, Word and PowerPoint flows. Maintenance files, test scripts and local preview output are excluded from the published site.
