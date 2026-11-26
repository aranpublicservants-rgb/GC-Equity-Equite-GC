# Equity at Indigenous Services Canada

Public bilingual site: https://aranpublicservants-rgb.github.io/isc-sac-equity-equite/

The page combines source-linked explanations, charts with equivalent tables and CSV downloads, a prepared-answer data guide, an ISC sector explorer, and local tools for drafting aggregate data requests and comparing percentage points. The guide retrieves published evidence. It does not use a generative model or assess personal cases. Drafts are created in the browser and are not sent anywhere.

## Evidence reviewed November 17, 2026

The catalogue contains 116 files and 331,442 rows matched to ISC across GC Equity and related public resources. Historical editions can overlap. Rows are not employee counts. Files without ISC records and predecessor departments are excluded; their exclusion is not proof that no further data exists.

`data/catalogue.json` records source URLs, extraction scope, counts and hashes. Text-safe compressed assets reproduce the CSV records, including suppression markers, blanks and genuine zeroes. The large official employee-group and sector files use lossless dictionary encoding. `data/provenance.json` records the review scope and intentionally excluded source families.

The 2024 PSES department-group summary uses official employer 17 rows directly, not an average of sectors. The focused sector summary retains 27 questions across 11 sectors and 18 demographic categories. All 207 question codes and original response fields remain in the complete sector source. The PSC staffing measures use published weighted response shares and must not be described as sample sizes.

Representation, annual FTEs, headcounts and survey populations use different reference periods and inclusion rules. The site preserves these distinctions. Rounded percentages are not converted into invented employee shortfalls. Suppressed cells are not reconstructed.

## Checks

Run `python scripts/check-site.py`. This verifies source hashes and ISC employer scope, compares every displayed group and sector summary cell with the retained official rows, checks guide source paths and percentage-point arithmetic, and validates local links, assets and bilingual section IDs.

Browser checks cover the English and French question paths, charts, tables, source filters, downloads, sector comparisons, request drafts, accessibility preferences, keyboard focus and narrow-screen reflow. These checks do not constitute a formal accessibility certification.

The static site is published through the existing GitHub Pages repository. No third-party script or remote AI service is required for the data guide.
