# GC Equity: publication, interface and dataset coverage review

**Review date:** 13 November 2026 (Toronto local time)  
**Live website:** https://aranpublicservants-rgb.github.io/GC-Equity-Equite-GC/  
**Repository:** https://github.com/aranpublicservants-rgb/GC-Equity-Equite-GC  
**Scope:** repository inspection, Google Drive source-package review, accessibility/interaction changes, repeatable source completeness checks and browser QA.

## Editorial decision: exactly two primary choices

The public-facing homepage remains **one HTML page** with only two principal navigation choices: **Departments and agencies** and **Equity across the public service**. Both jump to an in-page area. The first area selects an employer; while an employer is selected, the public-service-wide area and all-service related resources are hidden. The second choice clears that employer context and shows public-service-wide material instead. This prevents an individual's departmental analysis from being silently contaminated with another organization's figures.

The primary controls sit together in one responsive bar per area, covering employer, equity group and topic (or group and topic for all-service data). A user can read concise results first, choose a topic, inspect a paginated table (18 records at a time), and export the underlying filtered rows as CSV. **An on-page dataset viewer** handles sources that were formerly reduced to links. The original data are not reclassified or merged to make them fit a convenient chart.

## 1. Evidence inventory and inclusion decision

Automated source checks confirm the working repository contains **10 HTML files, 15 JavaScript files, 3 CSS files, 90 CSV files, 84 JSON files and 67 compressed departmental branch-survey files** at the inspected revision. The number of actual source files differs from the count of visible tables, as some CSVs are historical or derived and others are aggregate summaries.

The connected Google Drive contains the earlier **GC Equity — GitHub website files (public data only)** package, with four substantive collections:

| Drive collection | Audit decision |
|---|---|
| GitHub upload package, including 12 data-pack JS files and three bootstrap JS files | Historical source package, **not** the current site repository; not assumed deployed. |
| Website build and four asset ZIP parts | Contains a 2026-10-27 assembled snapshot, **not** a copy of the current live main branch. |
| Ten ZIP parts of the original source archive and its exceptions | Historical record requiring controlled reconciliation rather than direct overwrite. |
| Public source CSV collection | Source material for current summary data; very large files must be segmented and checked before incorporation. |

The 157-row Drive **DATASET-COVERAGE.csv** source manifest was compared with all filenames in the current GitHub tree. Results have been published in `assets/data-coverage-audit.json`. Its status classes are:

| Repository availability classification | Files |
|---|---:|
| Directly present as the named file | 65 |
| Present only in an older Drive website/archive package | 72 |
| Otherwise not hosted as a current named file | 7 |
| Historical PSES source not hosted as the full raw file | 4 |
| Known duplicates (not additional datasets) | 6 |
| Represented only in a processed/derived form | 2 |
| Contents could not be verified | 1 |
| **Total source-manifest entries** | **157** |

These are **file-level presence decisions**, not proof that 65 files have complete fidelity in every field, or that archived files can be discarded. A published link or an entry in an inventory never substitutes for the actual dataset. The counts are intentionally not re-labelled as “157 available tables.”

### Data presently accessible in the two areas

- **Organization view:** organization-specific Treasury Board representation histories, employee experience surveys, second-level branch-survey tables, 2025 staffing-survey responses where published, Indigenous and disability subgroup reports, women’s organizational representation where published, PSC staffing history with source names and scope, original Call to Action documents and organizational comparisons, and 2026-27 departmental-plan text counts.
- **PSC organization's original records:** 17 of 55 PSC CSV files contain explicit organization columns. For each selected organization, original matching rows are available on the first area without inserting other organizations' records. Source file, period and original field names are kept; rows are paginated and downloadable. Older sources containing the misspelled field `orgnization_e` are explicitly indexed. The remaining 38 PSC CSVs have no organization field and are *never* assigned to a selected employer.
- **All-service area:** aggregate workforce history, executives, equity groups, employee and staffing survey comparisons, employment movements, salary bands, independent derived salary analysis, Call to Action, departmental-plan comparisons, plus **38 PSC non-department CSV files, 26 women/intersectional CSV files and nine TBS / independent-analytical CSV files** through a single inline viewer. The viewer shows 18 rows at a time, with a scoped search and full filtered CSV.
- **Source transparency:** all 157 historical Drive source-manifest entries are browseable by status in the in-page dataset finder. Missing or archive-only items are **not presented as hosted data**. The source catalogue and methods remain available, but the user does not need to open a new page to read the hosted source tables.

### Historical coverage not yet reproduced

The 27 October Drive assembly notes described **128 additional compatible dataset panels** with **10,381,498 retained rows** and **four PSES cycles**. The historical build also preserved **500,126 same-key PSES records containing conflicting values**; those were presented as alternative source versions, not resolved measurements. That large historical package is **not** fully reproduced in the current modular GitHub Pages repository.

Directly importing the archived 44 MB index or hundreds of megabytes of source files would bring back browser performance and load problems, and would risk losing source lineage. A complete historical restoration would require checking each compressed block, matching organizational codes between periods, preserving survey wording and denominators, and keeping contradictory values separate. The older Drive collection reports **90 further catalogued portal resources were not downloaded**. Therefore the scope of this repository cannot currently be described as “every public federal dataset.” This is an open gap, not silently filled with estimates.

## 2. Detailed publishing defects and corrections

| Risk / former defect | Why it matters for visitors | Implemented correction | Remaining test |
|---|---|---|---|
| Large raw table dumps | Users could not find the measure they wanted | Short, paginated tables; topic/group selection and single-source viewer | Screen-reader usability for large table headers |
| Extra page or stacked menus for data | Each click displaced users from the chosen department | Two in-page choices; no extra dashboard required for hosted source rows | Test on actual Android/iOS devices |
| Department and all-service figures visible together | Scope could be mistaken and numbers mixed | Hide public service-wide panel in department mode; clear department selection for second area | Check deep-link/back-history combinations |
| Top navigation not clearing active department | All-service results remained hidden after header use | Unified navigation click handling and rebuilding of the public view | Keyboard/assistive tech navigation |
| Repeated unhelpful “what’s inside” links | Multiple links led to the same generic location | Topic-aware same-page links that set the relevant filter | Test discoverability with non-specialist users |
| Four independent selects stacked vertically | Oversized control area, particularly on phones | Responsive paired/three-column control bar | Test at 200% and 400% zoom |
| Dataset inventory substituted for actual data | “Available” misleadingly suggested numbers could be read | Present source tables in-page; mark separately hosted, archived, partial and unavailable sources | Record-level reconciliation of older archives |
| Black, Indigenous, disability and intersectional differences hidden | Aggregates concealed meaningful barriers | Existing published group filters retained, women/intersectional files exposed, subgroup tables preserved | Confirm every group's published question and denominator |
| Cryptic `ar4e.csv`-style file names | Non-specialists cannot locate or interpret evidence | Human-readable bilingual dataset titles for women's sources and clearer column headings | Translate remaining technical headers consistently |
| National figures substituted for department gaps | Could produce false departmental claims | Only exact organization source matches; missing stays missing | Metadata review for renamed organizations |
| Survey/derived salary data conflated with official counts | Misleading conclusions about pay and discrimination | Separate Treasury Board observations from independent calculated estimates | Verify independent analytical methods independently |
| Re-rendering kept stale table arrays | Gradual browser memory growth | Prune stale interactive table-store objects on view switch | Long-session memory/profile test |
| Static checks covered only selected source files | Missing file or broken JS could go undetected | Repo-wide Python HTML/JS/CSS/CSV/JSON and gzip audit + GitHub Actions | Manual WCAG compliance inspection |

## 3. Accessibility / content standard applied

This is an independent ARAN-created resource using Government of Canada data. It must not imply official Canada.ca status. The government’s **GC Design System** supplies appropriate design/accessibility guidance for task-based interfaces, visible keyboard focus, touch targets, headings, labels, data tables and bilingual content. See:

- https://design-system.canada.ca/en/accessibility/
- https://design-system.canada.ca/
- https://a11y.canada.ca/en/accessibility-standards/index.html
- https://accessible.canada.ca/standards-and-technical-guides/standards-and-technical-guides-database/can-asc-en-301-5492024-accessibility-requirements-ict-products-and-services-en-301-5492021-idt

Implemented improvements include semantic section headings, a consistent two-choice IA, labelled form fields and original data-table captions, proper header scopes, visible focus states, keyboard-operable selectors and download actions, responsive layout and a no-JavaScript source fallback. Accessibility code checks and browser automation are **not equivalent** to an independent full WCAG conformance assessment with assistive technologies.

### Wording requirements

Every table must answer four plain-language questions: **What is measured? Who is represented? What period is covered? Where did the result come from?** Any percentage must retain the survey/employee denominator and the direction of its measured response. “Not published,” “suppressed” and zero are not interchangeable. Executive outcomes, staffing processes, and self-assessments should never be presented as directly causal evidence of systemic discrimination.

## 4. Continuous checks

`scripts/audit-organization-datasets.py` verifies that all 17 source-identified PSC CSVs are indexed against original organization fields and exact row counts. `scripts/audit-publishing.py` scans every checked-in HTML, JavaScript, CSS, CSV and JSON file; validates source paths and script syntax; checks compressed branch files against the exact department IDs listed in the survey metadata; checks the 157-item historical archive status and confirms that its 55 PSC, 26 women and nine other current source paths exist. `scripts/check-site.py` verifies checksum integrity and derived data assumptions. The browser workflow tests desktop and mobile operation, two principal choices, topic navigation, group filtering, department isolation, source imports and CSV downloads.

These automated tests inspect **every file for format, source presence and key structural properties**, but they do not verify every cell in archived raw datasets or every line's analytical meaning. Public-facing claims must follow the original publisher's metadata, not an inference from the existence of a filename.

## 5. Outstanding priorities

1. **Reconcile historical PSES conflicts** from the original Drive archive. Retain competing values with source IDs, survey periods, question wording, denominators and suppression codes; do not average or choose a convenient figure. Only after this work should the 128 historical panels be called fully restored.
2. **Bring additional original 2023/2025 staffing and 2018/2021 survey source tables into small indexed partitions** when the raw files can be accessed and validated. Prefer per-department, per-period slices; never upload files above GitHub's practical serving constraints.
3. **Complete human accessibility testing** with keyboard-only navigation, NVDA/JAWS/VoiceOver/TalkBack, 200–400% text zoom, French-language screen reading, high contrast, touch target size and a slow mobile connection.
4. **Check publication governance**: date and publisher of every dataset, no private/nonpublic Drive source exposed, consent/rights for third-party content, change logs and versioned hashes for each data release.
5. **Carry out manual source-by-source numerical verification** for the most consequential measures (discrimination, harassment, accommodation, staffing, representation, staffing group rates), prioritizing potential misleading interpretations and false statements.

**Status:** live modular site is substantially more navigable and its current hosted file inventory is explicit; complete original Drive archive integration, independent data reconciliation and manual assistive-technology conformance testing remain outstanding.
