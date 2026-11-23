# Google Drive dataset reconciliation and publication status

**Checked:** November 23, 2026 (America/Toronto)  
**Scope:** connected Drive's 76 discoverable folders, including the public-data GC Equity archive, the “New datasets to be added” collection and the ARAN resource library. These are accessible folders, not a claim that all files were read or all public data worldwide were found. The audit distinguishes published data, original source copies, editorial resource documents and out-of-scope material.

## Completed in this publication batch

- Identified the “New datasets to be added” collection and checked the folder inventory, MANIFEST.csv, README.md, LARGE-FILES.md and NOT-ADDED.md. Compared the dataset sources with hosted data and source registers, not just filenames.
- Added **30 employer-specific, public source CSVs** under `data/employer-equity-sources-2026-11/`: 2 DND civilian, 7 Communications Security Establishment, 3 Canadian Security Intelligence Service, 11 Veterans Affairs, and 7 Canada School of Public Service.
- Added 13 bilingual, source-linked cards to `reports.html` with explicit agency scope and historical dates. Downloads are ordinary public GitHub URLs, not private Drive links. Added an optional read-only accessible small-table preview, preserved in the report-page generator.
- Added a regression test for all 30 files, sources, links, employer isolation, and the viewer, and called it from `scripts/check-site.py`.
- Added report links to the departmental source register for DND civilian data, Veterans Affairs, and the Canada School of Public Service.
- Confirmed the Shared Services Canada 2025–2026 employment-equity English/French CSVs are **already hosted** under restored UUID filenames on the reports page; copying their Drive names would create duplicate data.
- Confirmed the ESDC workforce availability benchmark CSVs are already present under `data/open-canada-2026-11/esdc-wfa-benchmarks/`. Absence of one historic dataset ID from the registry is not evidence the corresponding files are absent.

## Material still in Google Drive and not yet fully integrated

| Collection | Status and required safeguard |
|---|---|
| TBS employment equity annual report, fiscal year 2013–2014 | **Open:** 38 old-format Excel files (19 English/French tables) covering hiring, promotion, separation, employee groups, occupational category and region. A source register or current representation table is not a substitute for these original historical tables. The repository's UTF-8 source writer cannot upload the binary XLS originals as text. Convert separately with full worksheet, label, denominator and suppression reconciliation; keep a readable source provenance trail. |
| DND civilian workforce, original Excel workbooks | **Partially added:** 2 corresponding small CSVs were added; several source XLSX files, including visible minorities, women and Indigenous representation, and detailed gender distribution, need complete worksheet-level examination before any derived upload. Do not mix civilians with CAF personnel. |
| Veterans Affairs | **Partially added:** 11 CSVs added. Two additional detailed occupational-category XLSX originals remain for review. Do not interpret historical values as current VAC representation. |
| Canada School of Public Service | **Partially added:** seven annual CSVs added. Seven annual XLSX originals and a data dictionary XLSX remain for review; they may hold additional sheets or metadata. |
| Historical PSES 2018–2024 source files | **Open:** large open-source survey files and older archived competing same-key records remain to be reconciled. Existing current-site partitions and published extracts are not proof that each uncompressed source is restored. Preserve incompatible questions, survey denominators, language, suppression and conflicting source versions separately. |
| Historic source ZIPs and old site build in the GC Equity archive | **Reconciliation needed:** the October 2026 snapshot and original 10 source ZIP parts are older than the current modular repo and should never overwrite current site files wholesale. Content-level matching rather than archive-name matching is necessary. |
| PSC staffing dashboard priority administration | **Unreviewed for core equity relevance:** no dedicated representation-by-equity-group conclusion from this file; do not label it an equity outcome. |
| TBS vaccination and accommodation status, June 2022 | **Requires scope decision:** temporary vaccination-policy accommodation context, not a substitute for workplace disability accommodation trends. |
| StatCan wages by occupation | **Context only:** national labour-market wage data, not federal public-service payroll or a departmental equity pay gap. |
| CSIS 2019 pay scale | **Context only:** pay-range table without an employee equity-group dimension. |
| ESDC federally regulated private-sector EE tables | **Separate scope:** not public-service workforce data. Do not combine into the federal public-service-wide denominator. |
| Resource-library policy, strategy, research and training folders | **Not a bulk dataset import:** primarily PDF, DOCX and PPTX publications. Only original publisher-permitted copies or links should be surfaced in the curated public resource library; never expose unverified private material or personal records. |

## Ongoing quality and completion controls

1. Preserve publisher URL, employer or reporting universe, reporting year, source headings, group terminology, suppressed values and limitations for every imported record.
2. No nationally aggregated equity or executive numbers may fill a missing employer-level result; no general staffing survey response may be presented as administrative hiring or promotion.
3. Do not claim the full Drive integration is complete until every relevant machine-readable file has a source-based decision: **exact hosted copy**, **complete verified conversion**, **already hosted equivalent**, **verified duplicate**, **out of scope** or **unresolved**. A file name match by itself is insufficient.
4. Run `python3 scripts/check-site.py` and the Github Pages deployment test; committed regression tests and a GitHub commit alone do **not** prove a passing CI run or live deployment.
5. For remaining improvements, use `QUALITY-ROADMAP-50-2026-11-22.md`. This roadmap is a list of mixed statuses, not 50 complete deliverables. Prioritize valid 2013–2014 hiring/promotion tables, methodologically compatible hiring stages by group, current departmental executive group-level evidence, source-comparison controls, and assistive-technology tests.

**Assessment:** The full Google Drive inventory is **not** fully integrated. The new 30 CSVs are now hosted and linked, but important original workbooks, historical PSES reconstruction, and human/browser validation still have open acceptance gates.
