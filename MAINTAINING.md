# Maintaining GC Equity / Équité-GC

## November 22, 2026 departmental audit follow-up

This publication batch follows the uploaded wider-department audit instructions. The audit reviewed a sample of pages and was a text/source audit, not an independent browser certification. Applied changes include:

- Eleven former same-office routes are canonical redirects, preserved by `data/department-duplicate-routes.json` and the department page generator. Legacy query filters and hash fragments are retained when JavaScript is available. The public sitemap omits the retired routes, the homepage selector omits duplicate choices, and alias searches and old URLs resolve to the canonical selection. The Truth and Reconciliation Commission versus its Secretariat, as well as predecessor or combined Western Economic Diversification populations, were **not** merged.
- Canada Post, Bank of Canada, Canada Infrastructure Bank, Service Canada and Canadian Coast Guard now have organization-specific scope explanations in both languages. The generator retains those reasons on rebuild.
- DND has four additional PSES all-respondent accommodation items (Q84, Q85, Q44e, Q73p), and DFO has Q44e and Q73p. Sources and question-specific respondent bases are shown. Small Black Q87 respondent bases (DFO 15, ISC 20) are flagged. Original suppressed cells were not imputed.
- Recourse sections for CRA, ESDC, Correctional Service Canada, CBSA, DND, DFO and ISC cross-reference the **independent ARAN decision library prepared November 18, 2026**. Title matches and employment scope are described explicitly; program-service cases are not used as workplace precedents. The index is not exhaustive, and some source links are summaries rather than full decisions. The generator retains cross-reference logic for generated pages.
- DFO's 2025 staffing comparison now preserves selected one-decimal values and differentiates overall and process-participant bases. Additional material covers GBA Plus demand, Coast Guard College groups, Fleet reporting gaps, and Annex F accessibility narratives. The two disputed 2023 STA_57 Black and Indigenous values were deliberately withheld pending direct-source reconciliation rather than choosing between conflicting extracts.
- Sampled full profiles now describe the missing current executive-by-group/level table and incomplete hiring-stage-by-group data as **unverified in this collection**, with a dated qualifier. They do not infer results from a headcount, a survey answer, or a national total.
- `scripts/check-nov22-department-fixes.py` tests the changed pages and source boundaries. `scripts/check-site.py` invokes it, and the GitHub browser workflow runs the whole site checker and dedicated-department checker before browser smoke tests.

**Known work still open:** the audit requested the PSC equity-group hiring/acting/promotion tables across all eligible full pages, verified 2025 executive group-by-level source tables (where published), broader case-law mapping, completeness upgrades for thin organizations, some departmental accessibility-plan content, and full live-browser checks of charts, language toggles and request builders. These are not represented as completed. No current employer figures were inferred for missing sources. Run the repository validation scripts and review the CI run before treating deployment or accessibility as verified.


## Fifty-point evidence quality review, November 22, 2026

`evidence-review.html` and `assets/evidence-review.js` render `data/evidence-review-50.json`: exactly 50 bilingual checks in five groups (source/scope, workforce/representation, employee surveys, staffing/career movement, and commitments/outcomes/recourse). Each check has English and French question and action text plus a relative link to an already published evidence area. These are *questions for readers*, not grades, automated findings, source replacements or an assertion that any employer has passed or failed.

The tool can search text, filter the five groups and review states, record short notes, display review progress, copy a plain-text summary, print, and export a spreadsheet-safe CSV. Review statuses and notes are ephemeral in page memory and are **not** saved to localStorage, sent to a server or used for analytics. The page clearly warns visitors not to enter personal or case information. Display language follows the site or `?lang=fr`. It supports high contrast, dark mode, keyboard focus, narrow screens, reduced motion and printable review cards. A static source-inventory fallback is available if JavaScript is disabled. The site header and homepage source guide link to it.

The dashboard CSV exports now prefix potentially executable spreadsheet formulas with a text marker (while leaving regular negative numeric data unchanged). The existing full-source data library already has a similar export guard. Regression tests check the 50 entries, bilingual completeness, links and export safety; they do not constitute independent source verification or formal accessibility certification. Run `node --test tests/evidence-review.test.cjs`, `node --check assets/evidence-review.js` and `python scripts/check-site.py`.

## Career development resource

`career-development/` is a standalone bilingual career page, linked from the hiring and careers area of the shared resource directory. It covers learning plans, classifications, mobility, applications, official languages, mentoring, conversation drafts and personal planning. Its 26 source records contain English and French publisher URLs checked on November 20, 2026. Source links next to the guidance identify its basis. The page is an independent ARAN resource, with no official accessibility certification claim.

The career guide uses fixed rules and published resources. Its mobility suggestions distinguish employees, students, casual workers, external candidates and separate-agency employees. The writing tools assemble visitor-supplied text and editable scripts. The action planner calculates calendar dates, records progress and exports text, CSV and a print layout. Career plans and writing drafts stay in the browser. Device saving is optional and uses a page-specific storage key; display preferences are saved separately. The page has no analytics or paid services.

The document tool reads text/Markdown/CSV and DOCX locally with vendored JSZip 3.10.1. Files are limited to 8 MiB, the extracted Word XML to 2 MiB, and retained text to 24,000 characters. DTDs/entities are rejected. Other formats use the file name and user note, with a visible explanation. Keyword matching proposes one of the seven lists verified against the career Trello board on November 20, 2026. The draft uses an excerpt, never an invented summary. Documents and chat history are kept in page memory and are not saved with the personal plan.

The Trello handoff uses the official Add Card UI with fixed board/list IDs and the reviewed title. It copies the description for the visitor to paste before saving in Trello. It does not invoke the owner’s connection from the public page or claim a card was created. Saving requires the visitor’s Trello access. No test cards were created. Reference: https://developer.atlassian.com/cloud/trello/guides/client-js/client-js-reference/

The visible career chat offers source-backed guided replies. Optional generative AI uses WebLLM 0.2.89 in a Web Worker and Qwen2.5-0.5B-Instruct-q4f32_1-MLC. The pinned runtime loads from jsDelivr only after the visitor chooses to enable AI. Weights total about 278 MB; other artifacts add to the download. The feature requires WebGPU and roughly 1.1 GB of estimated GPU memory. No prompts or documents are sent for server inference. Generated text is rendered as text; links come from the curated catalogue. The test browser did not support on-device AI, so its fallback was verified; actual generation is unverified. The automated browser file chooser check did not complete. Reference: https://webllm.mlc.ai/docs/user/get_started.html

Edit `career-development/content.js`, `sources.js`, `model.js`, `view.js`, `app.js` and `styles.css`, then run `node scripts/build-career.cjs` to regenerate the English and French HTML pages. Published guidance and the full resource library remain readable without JavaScript. Interactive controls require JavaScript. `node --test tests/career.test.cjs` is included in the repository check. It verifies eligibility boundaries, calendar arithmetic, formula-safe CSV exports, French search, escaped visitor text and both static pages.

## Dedicated department pages, November 19, 2026

All 255 labels from the department selector now resolve to 247 distinct bilingual profiles. Eight reordered or alternate labels are consolidated through explicit identity aliases. DFO, DND and ISC keep their reviewed specialist content. Other pages use the same contents layout, ordered section contract, charts, guided questions, source browser, CSV exports and aggregate request builder. Sections without corresponding evidence are omitted and recorded in Evidence gaps.

`data/department-identity-crosswalk.json` preserves exact labels for each source and the official bilingual organization names. Combined Information/Privacy Commissioner and Western Economic Diversification populations remain separate from each office or successor. RCMP, civilian, military, Coast Guard and predecessor populations retain their source definitions. No national or other-employer value fills a missing departmental cell.

Build the shared pages with `python scripts/build-department-pages.py`. The 2024 reading extracts cover 92 employers and 27 questions; the staffing summary covers 75 selected entities, representation covers 71, and the plan index covers 90. Source coverage differs by employer. The source library also exposes matched retained historical, staffing, population and branch files. The native 2025 women counts are copied from the official TBS department table, not inferred from rounded percentages.

Selecting a department opens its full profile. `index.html?org=NAME&view=table` retains the existing comparison workspace. The full-profile route and comparison link preserve language and group selections where supported. Rebuild ISC with `python scripts/build-isc-page.py`; each exported ISC reading row names its overall or employee-group source, and the source browser cites both original files.

Run `python scripts/check-site.py`, `python scripts/check-dfo.py` and `python dnd/scripts/check-site.py` before publication. The repository check includes `scripts/check-all-department-pages.py`, which checks every identity, page, menu, source population and retained reading cell. The browser workflow checks desktop and phone layouts. These are functional checks, not formal accessibility certification. Ali authorized direct GitHub publication of all department conversions on November 19.

This file describes the site as it is now. It is kept in the repository and is not published on the site (see `_config.yml`).

## Systemic change tools, November 22, 2026

`systemic-change/` holds nine tools. Six replaced 19 earlier pages on November 22, 2026; equity under austerity, the global public service equity observatory and the equity impact simulator were kept as their own tools at Ali’s request the same day.

The department evidence explorer (`department-evidence-explorer/`) runs on `department-evidence.js`. It opens with the main findings for one department or agency: representation against workforce availability in 2025, the largest less favourable 2024 Public Service Employee Survey results by group, the 2025 staffing survey results, the change in headcount from March 2025 to March 2026 and the regions with the most employees. Each finding links to its source. The topics add the tables behind the findings, workforce change by employment type, regions, salary ranges, careers, commitments and sources. The organization list shows the 109 organizations whose profile in `assets/department-pages.json` has workforce or survey sections.

The HR process review toolkit, the Manager’s Equity Toolkit, the decision equity check, the equity impact simulator, the commitments and accountability tracker and the Invisible Work Project share one renderer. `tools.js` reads `tools-content.js` and draws the page named by `data-tool` on the `<html>` element. Edit text, items, sources and job posting rules in `tools-content.js`. Each item needs English and French text, and each source key must exist in the `S` list.

The History site (GC-Equity-History) loads `department-evidence.js`, `assistant-enhancements.js`, `evidence-meaning.js` and `investigation-paths.js` from this site and calls `window.GCEEvidenceWorkspace`. Keep that interface. Evidence rows separate the parts of a label with " · " and show "Not published" or "Non publié" for a missing value. The History scripts read both.

The 16 retired addresses redirect to the tool that replaced them and keep the language, department and comparison choices.

Equity under austerity (`equity-under-austerity/`) also runs on `department-evidence.js`. Its first topic compares published headcounts for two chosen years, applies an explicitly hypothetical uniform reduction (0 to 50%, arithmetic only), lists the 2025 representation figures to protect and the change in employment types, and sets out the questions to settle before a decision. The reduction can apply to all employees or to one employment type (indeterminate, term, casual or student) with a published headcount. The years, the percentage and the type are kept in the page address (`from`, `to`, `cut`, `type`).

The equity impact simulator (`equity-impact-simulator/`) rates two named options side by side across the four proposed-decision scenarios (`compare` mode in `tools.js`). Its scenario text is copied from the decision equity check at load, so edit the scenarios there. Each scenario links to the matching explorer topic or to equity under austerity, and `href()` keeps the visitor’s language and department.

The global public service equity observatory (`global-public-service-equity/`) is drawn by `tools.js` from the `global` section in `tools-content.js`. Each figure keeps its own country, population, year, definition and source; the page says not to rank or average them and points to OECD Government at a Glance for harmonized indicators. It also shows the OECD average share of women in senior managerial positions in central administrations (41.1%, 2023 data, Government at a Glance 2025, Figure 13.10). The page text does not print the value for each country, so no country value is entered. The figures were checked against their sources on November 22, 2026: the Treasury Board Employment Equity Demographic Snapshot 2024-2025, the UK Civil Service Statistics 2026 bulletin, the APSC State of the Service Report 2024-25, the New Zealand Public Service census system report and the US FY2025 FEORP report. Update them when a country publishes a new year.

The change over time topic of the explorer reads `data/pses-trend-2019-2024.json`, built by `python scripts/build-pses-trend.py` from the 2024 Public Service Employee Survey open dataset, which also holds 2019, 2020 and 2022 for the same question numbers. It keeps the 27 reading questions at department level for all respondents, with the same published field and response count as the 2024 profiles (all 1,545 cells that exist in both match). Suppressed values stay null. The topic labels a move of 5 points or more as less favourable or more favourable, using the direction in the file. That line is a reading aid, not a statistical test. The same 5-point rule feeds one finding in the explorer overview. Questions 84 and 85 have no short wording and are left out.

Salary ranges, and hires, promotions and separations by group, are national figures typed into `department-evidence.js` from Treasury Board reports: Employment Equity Demographic Snapshot 2024–2025, Figure 2, and Employment Equity in the Public Service of Canada 2024–2025, Tables 5 to 7. Update them when Treasury Board publishes a new year.

`node scripts/check-systemic-change.cjs`, run by `scripts/check-site.py`, checks the shared content, page shells, redirects, sources, em dashes and the History interface. `tests/systemic-change-browser.cjs`, run by the browser workflow, opens the tools page, the explorer, the austerity tool and the seven other tools in English and French at desktop and phone widths. It selects Indigenous Services Canada, runs the job posting check, downloads a record, follows retired addresses and runs the axe-core WCAG 2.1 A and AA rules. These are functional checks, not formal accessibility certification.

## November 2026 publication-quality redesign and coverage audit

The GC Equity homepage has **exactly two** primary in-page choices. Each data area offers an employee-group selector and a topic selector. The two/three selectors share a responsive horizontal control bar. The smaller “What's inside” links use `data-gce-scope`/`data-gce-topic` to select their relevant area directly. Top navigation clears a chosen department when entering the public service-wide area; only one area's data tables are retained in the DOM at a time.

New files:
- `gc-data-library.js` is the second area's in-page CSV viewer. It provides the 38 PSC files without an explicit department column, 26 women/intersectional datasets, and nine Treasury Board/independent salary data sources: choose collection, file and optional search, then read paged rows or download filtered source data. Derived salary estimates remain identified as independent.
- `assets/data-coverage-audit.json` compares all 157 historical Drive source-manifest entries against the GitHub tree. A prior Drive package is **not** automatically treated as available on GitHub: 65 named files are hosted; 72 are in archived packages only; 7 are not hosted; 4 are historical raw sources not hosted; 6 are known duplicates; two are only partly represented in processed form; one source is unverified. File presence is not row-level reconciliation.
- `women-femmes/data/csv/women-by-organization-2025.csv` is now used in the first area for organization-specific women's representation; its `Employees` column means **all employees in the organization**, not a headcount of women.
- `scripts/audit-publishing.py` checks checked-in HTML/JS/CSS/CSV/JSON formats, local resources, compressed branch-data assets against source metadata, and current source inventory integrity on every push. It complements `scripts/audit-organization-datasets.py` and `scripts/check-site.py`.
- `QUALITY-REVIEW-2026-11.md` records the detailed audit, corrections, evidence standards and unresolved historical restoration.

**Limits:** the original Google Drive 27 October assembled website recorded 128 additional dataset tables and 10,381,498 retained dataset rows, including 500,126 conflicting same-key PSES records. The current repository does not host that entire historical snapshot. These conflicts have not been adjudicated; they must never be averaged or merged. A future data import must split and reconcile the actual source files with clear version, organization and survey period lineage. Do not claim the historical raw data have been fully integrated.

**Accessibility:** use current GC Design System and Accessibility Standards Canada guidance as references, but do not claim this independent ARAN website is an official federal publication. Automated keyboard/mobile browser tests and static syntax checks do not replace an actual assistive technology assessment.

## Pages

### Shared departmental reading profiles

Every organization selected on the homepage uses `gc-department-profile.js` for
its overview, headline measures, charts, guided questions, detailed PSES reading
sections, report links and suggested evidence-to-action record. The existing
organization-only source viewers remain available on the same page. Topic and
employee-group filters continue to apply. DFO and DND specialized collections
are linked only from their own selections.

`assets/department-profile-index.json` indexes 92 organization-specific extracts
of the 2024 PSES. The files in `data/department-profiles/` retain 2,484 overall
question cells and 289,359 employee-group question cells for the same 27 reading
questions as the dedicated DFO/DND profiles. Each cell preserves the original
response percentage and ANSCOUNT as strings, including `X` and `9999`. The
overall cells come from the retained official subset-1 CSV; employee-group cells
come directly from the official EEINFODV.csv. No branch averages are used. Named
micro-organizations retain their own published rows; the combined micro group
and public-service aggregates are excluded. This does not reconcile the separate
historical PSES assembly.

Reproduce the extracts with `python scripts/build-department-profiles.py --groups
/absolute/path/to/EEINFODV.csv`. The index retains the source URLs and original
SHA-256 values. `scripts/check-department-profiles.py` checks every overall cell,
the independent DFO/DND extracts, employer identity, suppression and zero. Its
optional `--groups` argument checks every group cell against the publisher file.
The chart helper tests check all organization series and prevent fallback to a
different group or organization.

`assets/department-publication-links.json` is a bounded register of additional
links present in organizations' official plans, restricted to their own
departmental namespaces and screened for report relevance. It is not an
exhaustive departmental publication inventory. Missing reports are identified
as a collection gap, not as evidence that the publications do not exist. The
homepage also displays each organization's existing original plan and Call to
Action links. The executive/non-executive section reads only that employer's
rows from the retained Treasury Board source through 2026; its population remains
distinct from the employment-equity workforce snapshot.

- `organizations.html` / `organizations.js`: bilingual searchable catalogue based on the official Canada.ca directory, updated October 15, 2026 (215 entries in `assets/federal-organizations-2026-10-15.json`). It overlays published source coverage from the Treasury Board core-public-administration tables, 2024 Public Service Employee Survey, Call to Action responses, 2025 Staffing and Non-Partisanship Survey and 2026–27 departmental plans. These source populations are not interchangeable. CSE is included in the official directory and 2024 survey, and its separate 2025–26 annual-report employment-equity figures are identified as a different reporting series. Do not manufacture missing core-public-administration data for CSE or other separate entities.
- Public-service-wide related sites are linked through their original `github.io` addresses and grouped by user task. ISC-only sites and the personal professional profile do not appear in the GC Equity directory. A modest ARAN attribution appears only in the shared footer. No owner email address or volunteer form appears on GC Equity.

- `index.html`: the single homepage, retaining the two same-page sections. When a visitor selects a department/agency, the public service-wide section and related all-service resources are hidden. **Every visible data table and downloadable record is then scoped to that one organization.** Clicking the second homepage button clears the selection and restores the public service-wide section. Department selection is included in the shareable URL query parameter `org`.
- `gc-dashboard.js` / `gc-dashboard.css`: departmental tables from the Treasury Board 2017–2025 representation series, 2024 PSES organization and branch results, 2025 PSC staffing survey, 2021 and 2024 Call to Action organization documents and comparable outcomes, Indigenous and disability subgroup CSVs, and 2026–27 departmental plans. Only source-specific department records are displayed; no national figure is substituted for missing organization data. Standard tables paginate at 18 rows.
- `gc-org-sources.js` and `assets/psc-organization-index.json`: exhaustive indexed coverage of the **17 locally stored PSC CSVs that contain an explicit organization column** (out of 55 locally stored PSC CSVs). Source headers, organization field names and per-organization row counts are audited from the original CSVs, including the legacy `orgnization_e` spelling. All matching files for the selected organization are listed automatically, grouped by topic, and their matching rows load on scroll, with 18-row pagination and a CSV download containing the complete filtered rows. The other 38 PSC CSVs lack any explicit organization column and must **not** be attributed to a chosen department. The site does not claim that a local source inventory exhausts all federal published datasets.
- `scripts/audit-organization-datasets.py`: validation re-reads all 55 CSV headers and organization values, verifies all 17 organization-bearing files appear in the source index, and checks that their per-organization record counts match. Changing a source file without updating the organization index must fail validation.
- The 2024 second-level branch survey remains organization-scoped and question/employee-group filterable; national-only or separately hosted historical survey sources are not misrepresented as locally available department tables. The dataset finder on the public service-wide section continues to distinguish on-page data, locally hosted files, and official-only external sources.
- `equity.html`: redirects old bookmarks to the `#equity-data` section of `index.html`; it is no longer a separate data catalogue.
- `branch-equity.html`: retained as a plain-language reading reference. The original published branch results appear in a filtered, paginated table on the main dashboard after an organization is selected.
- `explorer.html`: the data pages, opened from the main page (`#departments`, `#data`, `#bhome`) and the guide and source pages. Opening `explorer.html` without a section returns visitors to the main page.
- `sources.html`: the list of 157 source files, showing which data files can be downloaded from the site. Public Service Commission files link to the copies in `data/psc/`, and the Staffing and Non-Partisanship Survey files link to their official source.
- `call-to-action.html`: the 2021 Call to Action letters and 2024 self-assessments of 100 organizations, placed beside their representation in 2021 and 2025, the 2024 Public Service Employee Survey and the 2025 Staffing and Non-Partisanship Survey. It opens with "What the data point to" (`#findings`), 12 findings that compare what organizations reported in the Call to Action with published results for the same organizations, listed from the strongest link to the weakest, then a table that compares organizations and a record for each organization. Links take the form `call-to-action.html?org=<id>#record`.
- `staffing.html`: Public Service Commission data. It shows applicants and appointments by employment equity group, appointments by group, sex and region, students, and appointments by organization and self-identification, and lists every Commission file on the site with its official link. Sections: `#applicants`, `#detail`, `#students`, `#organizations`, `#files`, `#method`. `?org=<name>` and `?group=v|i|d|w` preselect the choosers.
- `women-femmes/`: a separate page on intersectional barriers for women, with its own files and README.

## Scripts

- `gc-ai.js`: optional external-assistant links for the existing data and briefing tools; they are not promoted on the simplified homepage. Nothing is sent until a visitor chooses an external service, and no API key is used.
- `gc-equity-additions.js`: subgroup tables on the department page, the group chooser and group summary, and the link to the main page.
- `gc-tools.js`: the employment cycle table, the tables built from `data/october-2026/`, the PowerPoint builder, the Word (.docx) files for the briefing note and the data request, the links to share an organization or a group, and two sections of the organization page: Call to Action commitments and results, and the 2025 staffing survey by group.
- `call-to-action.js`: the Call to Action page. It reads the three Call to Action data files and `assets/workspace-data.json`. The findings are in `FINDINGS`, with their sources in `SRC` and their evidence labels in `LEVEL`. Every figure they quote comes from `data/call-to-action-comparisons.json`. French strings are written with ordinary spaces; `frt()` adds the non-breaking spaces of French typography when the page is shown.
- `staffing.js`: the Public Service Commission page. It reads `data/psc/psc-equity.json` and `data/psc/catalogue.json`.
- `lib/pptxgen.bundle.js`: PptxGenJS 4.0.1 with JSZip (MIT licence), loaded only when a visitor asks for a PowerPoint or Word file. Files are built in the visitor's browser. Licences are in `lib/LICENSES.txt`.

## Data

- `data/october-2026/`: eight curated CSV files from Treasury Board tables and the independent Disproportionality Index project, and `public-source-inventory.csv`, the list shown on `sources.html`. `DI_imputation_estimates_NOT_TBS_PUBLISHED.csv` holds estimates that replace small counts Treasury Board did not publish; the site marks them and never presents them as Government of Canada data.
- `data/pses-2024-branches/<id>.json.gz`: the rows of the official 2024 Public Service Employee Survey file "Employee Groups by Second Organizational Level" (EELEVEL2ID.csv), one gzip file per organization, 2,011,833 rows in all. The list of organizations, branches, questions and groups is in `explorer.html` (`eq-branch-meta`). An organization's file loads only when a visitor opens that organization's branch results.
- `data/call-to-action-comparisons.json`: the comparisons behind the findings, built by `python scripts/build-cta-comparisons.py` from the Call to Action summaries, the Treasury Board representation tables, the 2022 and 2024 employee survey results in `assets/workspace-data.json`, the 2025 staffing survey and the Commission staffing dashboard. Kinds of action are found by keyword in the summaries (`categories` lists each keyword pattern), and each organization counts once. Each comparison is checked in three size groups, against chance by reshuffling which organizations reported the action 3,000 times within each size group (fixed seed, so the file is the same on any computer), and after accounting for size and, for changes, the starting value. `scan` counts how many of all such comparisons meet the 5% threshold, against the number chance alone would produce. Rebuild the file whenever its source files change, add `--check` to compare without writing, then update `data/checksums.sha256` and the wording of any finding whose figures changed. To show a different comparison, add it to `SELECTED` in the script.
- `data/call-to-action-letters.json`: short English summaries, with French translations of those summaries, of the 90 letters (2021) and 91 self-assessments (2024) published by the Privy Council Office, for 100 organizations, with a link to each original. Each record names the matching rows in the other data: `site_name` (Treasury Board tables), `pses_name` (2024 employee survey), `snps_name` (2025 staffing survey) and `plan_name` (2026-27 departmental plans). The goal status (`set`, `underway` or `none`) is read from the summary. This file is maintained by hand. `scripts/check-site.py` checks that every named row exists. The French lists (`commitments_fr`, `targets_fr`, `progress_fr`, `barriers_fr` and `text_fr` for each goal) were translated from the English summaries on November 22, 2026; they are not official translations. Update the French entry whenever an English summary changes. The Call to Action page, the commitments tracker and the department evidence explorer show a French list only when every item has a translation; otherwise they show the English list marked `lang="en"`.
- `data/tbs-departmental-representation-2017-2025.json`: representation by department or agency, March 31, 2017 to 2025, from four Treasury Board pages: Indigenous Peoples, persons with disabilities and members of visible minorities, each with departmental workforce availability, and Black employees by department. A blank cell is `null`, never zero. Older labels for the same organization are mapped to the current name (`labels` keeps the label printed in each year), and rows whose names differ only in punctuation or case are merged.
- `data/snps-2025-by-organization.json`: seven questions of the 2025 Staffing and Non-Partisanship Survey by organization and group (all respondents, women, men, persons with and without disabilities, racialized and non-racialized, Indigenous and non-Indigenous, and Black respondents), from six Public Service Commission files. The Commission rounds weighted counts to whole numbers, so a group of fewer than 2,000 weighted respondents uses the sum of the published percentages and a larger group uses the weighted counts. A question the Commission did not publish for a group is left out.
- Rebuild the last two files with `python scripts/build-call-to-action-data.py --tbs DIR --snps DIR --retrieved YYYY-MM-DD`, from saved copies of the four Treasury Board pages and the six survey files (the script lists the file names). Add `--check` to compare with the published files without writing. Review the changes, then update `data/checksums.sha256` and `data/source-dates.json`.
- `data/psc/`: copies of 55 Public Service Commission CSV files from four Open Government datasets and the Commission's annual report tables (about 47 MB). Each copy matches the SHA-256 recorded in `data/october-2026/public-source-inventory.csv`. The 47 Staffing and Non-Partisanship Survey files (2.5 GB, up to 547 MB each) are too large for GitHub Pages and are linked to their official source instead. `scripts/psc-sources.json` holds the official link and the English and French title of each file. `python scripts/build-psc-data.py` checks every copy against the inventory and writes two files: `catalogue.json` (every file with its link, period, rows, size and checksum, and the survey links) and `psc-equity.json` (tables AR4A to AR4E and `demo_ee.csv`). The staffing dashboard publishes `-1` for a suppressed count; `psc-equity.json` keeps it as `x`, never as a number. Add `--check` to compare without writing. To replace a file with a newer version, record it in the inventory first, then rebuild and update `data/checksums.sha256`.
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

- `.github/workflows/site-validate.yml` (pull requests and changes to `main`): runs `python scripts/check-site.py`, which checks the seven pages, script syntax, linked assets, page size, data checksums, the branch data files, the workspace snapshot, the links between the Call to Action records and the other data, the Public Service Commission files and their derived JSON (through `scripts/build-psc-data.py --check`), and wording rules (no internal wording, credentials or em dashes). It also rebuilds `data/call-to-action-comparisons.json` (through `scripts/build-cta-comparisons.py --check`), checks every figure, evidence level and order of the Call to Action findings against that file, and fails if one no longer matches; update the wording of the finding when the data change. `scripts/check-findings.js` checks that each finding states the same figures in English and French and that its evidence sentences match its level.
- `.github/workflows/browser-smoke.yml`: on desktop and phone, checks the two homepage choices, placement of departmental plans and the Clerk’s Call to Action, bilingual navigation, footer attribution, research tools, organization and group data, downloads and other linked pages, then runs `tests/systemic-change-browser.cjs` for the systemic change tools.
- `.github/workflows/source-check.yml` (Mondays, or run by hand): compares the "date modified" of each official source with `data/source-dates.json` and opens or updates one issue when a source shows a later date. After reviewing the change and updating the site if needed, record the new date in `data/source-dates.json`. The check asks Canada.ca over HTTP/1.1 without compression, the settings Canada.ca accepted from GitHub's servers in November 2026, and reads the date from either Canada.ca page template. A page that does not answer is listed as "not reached"; check it by hand when Treasury Board or the Privy Council Office announces new material. Open Government datasets and the Disproportionality Index project are checked automatically.


## Shared research workspace

The seven entry pages load `gc-workspace.css` and `gc-workspace.js`. These provide shared navigation, bilingual controls, collection search, a browser data guide, saved views, an evidence basket, reporting-year comparisons, policy milestones and a working record for commitments. Network volunteering and contact details are not part of this research website. The commitments tool also shows the chosen organization's Call to Action letter and self-assessment, and can start a working record from either document.

The main page loads its smaller data model without loading the full explorer. The collection search index loads only on request. Branch survey data still load one organization at a time. No AI API, account service, telemetry or paid backend is added.

The data guide uses structured retrieval and arithmetic. Do not describe it as a generative model. It must return an unavailable result instead of substituting a different population, group or period. Detailed data remain in the original explorer and its datasets. The `org` query parameter is restored through the organization selector; older hash links continue to work.

Evidence, views and working records use browser local storage. Evidence can be exported to JSON and imported in another browser. The briefing export is an HTML document suitable for printing to PDF; existing Word and PowerPoint builders remain available. Table captures keep at most 250 data rows; full CSV downloads remain in the data view. Chart snapshots are sanitized SVGs. Imported text and URLs are validated before display. Contribution emails are prepared in the visitor’s mail app; the website does not send email.

`assets/workspace-data.json` is a snapshot extracted from the explorer, the two published Treasury Board CSV series and the departmental plans page. `assets/search-index.json` contains published-page excerpts and catalogue records, including snapshots of eight related public sites. It does not index every interactive table cell. `assets/workspace-manifest.json` records the snapshot hashes and related repository commits. The assembly date is separate from all data reporting dates.

Regenerate with `node scripts/build-workspace.mjs` after reviewing source changes. The script adds the Call to Action findings, the Public Service Commission page and its files to the search index last, so earlier entries keep their identifiers. The eight related repository checkouts are expected under `../related/`, using the repository names in that script. Keep their commit provenance with the generated index; never imply that a snapshot is a live search of those sites. Primary-source links for policy milestones and the executive and salary series were checked when this workspace was assembled.

Run `python scripts/check-site.py` before publishing. It checks inline and external JavaScript, linked assets, original published-data checksums and branch row counts, the new snapshot integrity and numeric/scope behavior. The desktop and phone smoke workflow also checks the guide, saved evidence, briefing download and year comparisons, then the original department, group, Word and PowerPoint flows. Maintenance files, test scripts and local preview output are excluded from the published site.

## Files added from open.canada.ca in November 2026

`data/open-canada-2026-11/` holds files taken from the Drive folder "New datasets to be added". Files are stored byte for byte unless this section says otherwise. Several are Windows-1252, not UTF-8. Do not re-save or convert them.

- `scripts/build-added-sources.py` writes `assets/added-sources.json`: paths, sizes, SHA-256 values, table titles taken from the published column names, and the number of published rows that name each organization. Run it after adding or removing a file in that folder.
- `gc-added-sources.js` shows the files on the home page. Under "Departments and agencies" it lists the tables whose rows name the selected organization. Under "Equity across the public service" it lists the tables that have no department column.
- `scripts/audit-publishing.py` fails if a file in the folder is missing from the index or if its SHA-256 has changed.

Rule for this folder: a file is added only when it covers departments and agencies generally. A file about one employer is left out, because the same data does not exist for the others. Vaccination data is left out.

### Treasury Board federal public service statistics, March 2010 to March 2026

Eleven tables are stored as published, in English and French.

Three tables are stored with suppression aligned: by department and sex, by department and first official language, and by department and age band. The English and French files published for these tables do not suppress the same cells. `scripts/build-harmonized-population.py` writes a copy of each file in which a cell is `*` when either language file suppresses it. No number is changed or calculated. The counts of cells affected are in `tbs-fps-population-2010-2026-suppression-aligned/README.json`. The untouched originals are in Drive and are not stored here, so a reader cannot recover a suppressed count by comparing the two languages.

### Staffing, survey, workforce availability and executive files

Fifteen packages are stored as published and listed under "Equity across the public service": Public Service Commission advertisements by fiscal year, priority entitlements, departmental results indicators, two hiring and staffing files valid to March 2018, the share of indeterminate employees under 35, the Staffing Audit Tool, the System-Wide Staffing Audit, the Survey of Staffing 2017, parts of the Staffing and Non-Partisanship Survey for 2018 and 2021, the 2019 executive workforce availability workbook, the 2020 employee survey diversity and inclusion tables, the applications to the public service files, the ESDC workforce availability files for the 2006, 2016 and 2021 censuses, and the ESDC harassment and violence occurrence tables for 2021 to 2024. The harassment and violence tables cover federally regulated employers, public and private, and the page says so.

- A CSV of 3 MB or less with 30 columns or fewer opens as a table. Larger or wider files and Excel workbooks are download links.
- Where a file has a column naming organizations, its rows also appear under "Departments and agencies" for the selected organization. `scripts/build-added-sources.py` detects that column: at least half of the rows must name a known organization.
- Where a package has separate English and French files (names ending in `-en` or `-fr`), the page lists the file for the page language.
- In a file that holds both languages, columns ending in `_e`/`_en` or `_f`/`_fr` are shown for the page language only.

### Files over 10 MB

The Drive connector cannot download a file over 10 MB. `scripts/fetch-large-sources.py` gets those files from open.canada.ca instead and stores each one compressed with gzip. Opening a `.csv.gz` file gives back the published bytes exactly. `large-files.json` in each folder records the source link, the published size and the SHA-256 of the published bytes. The script runs in the "Fetch large open.canada.ca files" workflow, which starts when `scripts/large-sources.json` changes, and commits what it downloads.

Stored this way: 12 cuts of the 2021 Staffing and Non-Partisanship Survey, 14 cuts of the 2018 survey, the Federal Student Work Experience Program referral file, and subset 1 of the employee survey open dataset for 2018, 2019, 2020, 2022-2023 and 2024. The page lists them as downloads. They are not shown as tables.

### Federal public service documents

`assets/library-documents.json` lists 28 documents from the "Federal public service" list of the resource library manifest in Drive. Only documents with a link to the publisher's own copy (gc.ca, canada.ca or ourcommons.ca) are listed. The page links to that copy. No document is stored here.

Not added:

- 56 documents in that list exist only as Trello attachments. They are not published here because their public status has not been confirmed.
- The other lists in the library (groups and communities, research and reports, training, non-federal strategies, and the additional documents) are not specific to the federal public service or have not been reviewed one by one.
- The 2013-14 employment equity annual report tables (38 Excel files recovered from the Wayback Machine), the priority administration file from the staffing dashboard package, and the employee survey Excel tables for years other than 2020.
- Out of scope for this site: the federally regulated private sector file and the Canadian Armed Forces file.


## Shared graphical data views

`assets/data-visuals.js` and its stylesheet provide Table / Chart / Both, bars, dots, compatible heatmaps and period trends. The standard page entry scripts load this component without an external service. Existing DFO and DND prepared charts offer the same three view choices.

Source browsers attach `_gceVisualData` to their table with full filtered rows and complete headers before pagination or hiding columns. Use `{headers, rawHeaders, rows, title, lang, sources, scope: "filtered"}` and call `GCEquityVisuals.update(table)` after updates. The dashboard exposes the equivalent `GCEChartTableData` accessor. Keep the original CSV exports.

Every plotted mark remains a source cell. Counts and percentages have separate scales; suppressed and missing values stay distinct; no repeated cells are summed or averaged. Trends require unique periods. A stacked distribution requires all five labelled response shares and a complete published distribution. Unrecognized textual or identifier-only tables retain their table view. Chart filters and row limits are explicit; exports identify the supporting page.

Run `node --test scripts/test-data-visuals.cjs` and `python scripts/check-site.py`. Browser CI checks table/chart/both, keyboard details, heatmaps, valid PNG export and narrow layouts.

## Employment equity report directory, November 20, 2026

`assets/equity-reports.json` records 20 report editions and their English and French publisher URLs. Ten original report files are retained in `data/ee-reports/`; the source register records their sizes, SHA-256 digests and archive provenance. The supplied CRA PDF matches the live publisher bytes. The NRC 2023-2024 mirror is a print rendering obtained from the archived repository download.

Run `python scripts/build-equity-reports.py` after editing the report registry. This renders `reports.html`, its download register and its shared search entries. Keep `assets/library-documents.json` and the relevant entries in `assets/department-publication-links.json` consistent when adding editions. The ARAN repository links to this directory rather than duplicating the report files.

The 2024 and 2025 Employment Equity Act reports cover the federally regulated private-sector reporting population. They are kept outside the public-service document list and departmental workforce comparisons. The existing SSC CSVs and PSES 2022-2023 subset are reused. Supporting PSES documentation is retained in `data/ee-reports/` and linked alongside that subset. The CAF source matrices retain their source values; the catalogue and DND source section record the portal validation failure.

Run `python scripts/update-data-checksums.py`, then `python scripts/check-site.py`. Browser checks cover report search, population filters, reset, French display, and ARAN resource search and saving.
