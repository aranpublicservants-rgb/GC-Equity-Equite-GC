# DFO evidence profile review

Reviewed November 17, 2026. Published route: `dfo/`.

The profile preserves the original page's subject coverage and adds a source browser containing 136 DFO-matched files and 467,472 records from the reviewed collections. Record counts are not employee counts. Sources can overlap and can repeat historical rows across editions.

The collection review covered GC Equity's source registers and hosted CSVs, the Indigenous, Black and Filipino public servant sites, accessibility and accommodation, the branch survey site, racialized-executive survey data, and recourse costs. ISC-only sources and government-wide files without DFO records are not presented as DFO evidence.

## Evidence corrections

- Replaced branch-weighted demographic survey calculations with 34,155 official DFO department-level rows from the 2024 PSES Employment Equity Derived Variable Dataset (`EEINFODV.csv`). The source has 165 employee-group labels. The directory name `ses-2025` is not the survey year; the resource metadata and retained `SURVEYR` cells identify 2024.
- Corrected the reversed 2020 disability and visible-minority workforce rows.
- Removed modelled salary medians. Published salary bands remain labelled as core-public-administration context.
- Compared rounded 2025 representation percentages in percentage points. Did not derive headcount gaps from rounded workforce availability.
- Removed descriptions of staffing-survey weighted population totals as actual sample counts.
- Added the Workplace Integrity Scan for calendar 2024, the 2025–26 Departmental Results Report, and the 2024–25 GBA Plus supplementary table.
- Distinguished transition-year Coast Guard coverage, legal transfer dates and phased administrative transfers.
- Corrected the Brooks discrimination/remedy distinction and Andrews union-representation proceedings using primary records. Other supplied case citations remain in a separate research list without unverified outcome summaries.
- Replaced categorical absence claims with limits tied to the sources reviewed.

## Reading and interaction

The page has English and French content, an overview, a section menu, group selectors, historical-context disclosures, source filters, record search, sorting, pagination, column selection, CSV exports and section printing. Workforce experience appears before the detailed staffing series. Recommendations are distinguished from reported departmental commitments.

All DFO records remain within the page. Large records load on demand. The official demographic extract uses lossless column dictionaries; decoded cells were compared with the source extract. Suppression flags and missing fields remain distinct from zero.

## Verification

Run `python scripts/check-site.py` and `python scripts/check-dfo.py`.

Browser checks covered English/French switching, direct official group results, source selection, group/question filtering, suppressed cells and CSV download. Source-link checks found and replaced an outdated federal sustainable-development report URL. Three tribunal/court source routes returned HTTP 403 to automated checks; no unavailable decision text was treated as verified. Narrow-screen CSS and print rules are included; a formal accessibility audit and native mobile-device test were not performed.

The source register and official demographic provenance are in `dfo/data/catalogue.json` and `dfo/data/provenance.json`. No claim is made that an unlocated document cannot exist elsewhere.

## Charts, accessibility options and guided questions

The November 17 refinement adds six chart types in both languages: group representation trends, representation against availability, workplace experience, accommodation, staffing-survey results and FTE reporting scope. Each chart has a direct source link, an equivalent labelled table and a CSV download. The 2025 staffing view retains weighted-share methods and question-specific respondent bases. Missing and suppressed figures are never plotted as zero. Coast Guard responsibilities outside the new DFO framework are labelled outside scope, rather than zero jobs.

The header exposes text size, contrast, spacing, reduced-motion and table-view preferences, stored only in the visitor’s browser. A prepared-answer data guide starts with a single topic choice. Role and group choices are optional. It offers follow-up choices for employee groups, source records and suggested action, opens the selected source in the same page, and retains the selected topic when changing language. It retrieves published evidence; it is not a generative model or an assessment of an individual case.

The 2023 commitment to add distinct Black and 2SLGBTQI+ designated groups is linked separately from the consolidated Act, which still lists four groups in section 3 at review time. No proposed benchmark or post-transfer DFO-only equity headcount is invented.

Additional verification covered guided hiring and systemic-barrier paths, source opening with the disability-group filter applied, French answer continuity, suppression display, suggested actions, chart/table switching and a successful chart CSV download. Display preferences persisted across reload and reset correctly. Embedded 320- and 390-pixel viewport checks passed without page-level horizontal overflow at standard text and at 150% text with extra spacing; these are responsive browser checks, not native-device certification. All 19 newly checked direct source URLs returned HTTP 200. The original 136-file catalogue and source cells remain unchanged. A formal WCAG conformance audit has not been performed.
