# GC Equity / Équité-GC — Safe redesign release notes
**Working branch:** `chatgpt-safe-redesign-2026-11-01`  
**Baseline production commit:** `5074a0862533ed7b7dd4e59e78fc0e2564cea292` (October 29 restored website)

## What this branch does
- `index.html`: a fast bilingual homepage with three pathways: department or agency, demographic group, and evidence/document tools.
- `site-app.js`: browser-local evidence guide, department profiles, public-service representation trends, executive group breakdowns, independent salary figures, and draft briefing/presentation/evidence-request tools. Every rendered source is labelled by period and population.
- `explorer.html`: the **exact Git blob** of production `index.html`, SHA `481399ff20cb10f625f1dd261fbb718f867d8ec6`. The restored October 29 explorer is unchanged.
- `sources.html`: searchable October source catalogue, with a deliberately separate designation for files deployed to the site and those recorded in the source inventory.
- `data/october-2026/`: eight curated October CSV resources plus a public-safe inventory of 157 October source entries. Private Google Drive links were omitted.

## Eight datasets actually deployed
1. Indigenous subgroup counts by organization (March 31, 2025) — transcribed from TBS published table.
2. Disability subgroup counts by organization (March 31, 2024) — transcribed from TBS published table; 2025 departmental table was deliberately not substituted because of alignment uncertainty.
3. Core public administration representation and workforce availability (2017–2025) — distinguish representation dates and benchmark basis.
4. Executive representation by EX level (2017–2025) — overall EX workforce availability is not a level-specific benchmark.
5. Disproportionality Index (2017–2025) — independent analysis.
6. Median salaries by group (2017–2025) — independent analysis.
7. Cleaned/imputed salary-band counts (2017–2025) — independent analysis with imputed historical replacements.
8. Historical imputation estimates — **NOT TBS published observations**; included for transparency, not used as official observed data.

## Evidence safeguards
- Never treat suppressed as zero.
- Do not add overlapping self-identification categories.
- Do not combine 2024 disability and 2025 Indigenous snapshots into a single denominator.
- Executive population, CPA employment equity, Staffing and Non-Partisanship Survey (SNPS), PSES and Public Service Employment Act staffing universes are not interchangeable.
- Organization-level October views show the available subgroup evidence, with a clear route to the preserved full explorer. The older explorer may require users to select their organization again.
- Gaps signal an issue worth investigating; they are not proof of discrimination or its causes.
- Salary DI is independently derived; not official TBS observed pay figures.

## October 27 large data-package status — **not yet deployed**
The source inventory reports 157 source entries, 128 compatible table datasets, 1,081 compressed asset blocks, and source-level PSES integrations. It lists 11 same-copy duplicates plus one explicit main-principal duplicate, eight root copies/archives with matching names and byte sizes, and one approximately 1.08 GB Drive-root file that could not be verified. These are **findings from the prior assembly documentation**, not fresh byte-by-byte verification of every Drive source.

The complete 44.4 MB HTML + 1,081 supporting assets are **not** in this test branch. They cannot safely be replaced by uploading HTML alone. To complete the large-package integration requires a separate, reproducible asset-ingestion/deployment and full data-integrity checks. The working October 29 site must not be removed or overwritten to accomplish that migration.

## Data guide and AI status
The homepage provides an evidence-based browser-local question guide backed by the eight included CSVs. It can report supported facts and cite a local source file. It is **not** a remotely connected generative AI assistant and cannot truthfully claim to have analysed the millions of rows in the separate October 27 package. Deploying such an assistant safely requires a backend retrieval/indexing service and controlled credentials. No AI API key or user question is sent from this site.

## Tests and safe rollout
- GitHub Actions validates JavaScript syntax, preserved explorer Git blob, data-file references, CSV parsing, and duplicate HTML ids.
- Additional query/department/document tests were run in a simulated browser DOM using the eight actual source CSVs.
- A visual mobile/desktop check for the **exact deployed branch version** and a full end-to-end comparison of the old explorer after renaming remain release gates.
- `main` is unchanged by this branch. Do not merge until these release gates and the actions check pass.

## External source context
- TBS: https://www.canada.ca/en/treasury-board-secretariat/services/innovation/human-resources-statistics/diversity-inclusion-statistics.html
- Public Service Employee Survey: https://hrdatahub-centrededonneesrh.tbs-sct.gc.ca/PSES/Home/Index?GoCTemplateCulture=en-CA
- Public Service Commission staffing: https://www5.psc-cfp.gc.ca/dsad-dsda/staffing-dashboard/index-en.html
- Independent salary DI: https://employment-equity.github.io/
