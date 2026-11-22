# DFO integrated-versus-standalone reconciliation — 22 November 2026

## Canonical maintained edition

**Canonical public route:** [GC Equity / Fisheries and Oceans Canada](https://aranpublicservants-rgb.github.io/GC-Equity-Equite-GC/dfo/).

The November 2026 standalone `dfo-equity.html` from the user's file library was compared with the repository's `dfo/index.html` on 22 November 2026. The older document is retained as a historical reference, **not** a second maintained public edition. No private file has been deleted or overwritten.

### Structural comparison verified

| Dimension | Standalone HTML | Integrated DFO route |
| --- | --- | --- |
| Main English/French topic organization | 14 headings in each language | 19 sections in each language, plus accessibility controls |
| 2025 Staffing and Non-Partisanship Survey | Describes the survey | Contains specific `STA_13` and `STA_14A` indicators and an interactive source browser |
| 2024 PSES employee-group details | Sources and departmental discussion | Department-level retained `dfo/data/survey-summary.json` covers 165 group labels and up to 27 PSES questions each |
| Accommodation | Summary / source context | Q86 and Q87 denominators and comparison tables, with additional same-cut cross-check supplied by `assets/department-depth.js` |
| Source access | Links to some originals | DFO-matched indexed datasets, downloadable table exports, dedicated source browser, official publications |
| Recourse | General and departmental primary links | Primary links and the shared cross-check pointing to the separate 176-decision library |
| Coast Guard transfer | Historical context | Dedicated section distinguishing pre/post-transfer reporting scope |
| Status | Historical standalone snapshot | Canonical maintained web profile |

**This does not establish that every line of the old standalone is reproduced verbatim.** The comparison specifically verified major topic coverage, source identifiers, structural depth, staffing indicator presence, and additional standalone external URLs. The canonical page should retain source-specific dates, definitions, suppression and original links. A formal accessibility audit and current live browser verification are distinct from static-content comparison.

### Unique references in the standalone

Six standalone external URLs were not verbatim matches for links in the integrated HTML when compared. These include:

- An older 2020 DFO–Coast Guard workforce-equity gaps PDF hosted by the union. It is **historical supporting material**, not a substitute for the 2025 departmental workforce estimate; availability and content have not been reverified.
- French Open Government landing pages for the PSES and staffing survey datasets. The integrated page already links to corresponding sources, but exact French destination parity should be verified.
- A 2025 federal sustainable-development progress-report URL and a French CHRC publication. These are not automatically treated as missing department-specific evidence merely because a URL differs.

None of the above is asserted to be the latest DFO employee data.

### Outstanding depth gaps across departments

- Exact **applicant-to-promotion outcomes by designated group**, with denominator and employment type; the retained PSC hiring self-identification pair is not group-specific.
- Current **EX level × employment equity group** administrative headcounts. Historical DFO executive figures must stay explicitly dated.
- A **complete department-specific recourse case index**; the public 176-case library is curated and party-name matches are not exhaustive.
- Privacy-safe **branch or occupational intersectional breakdowns**, especially where public files suppress small cells.
- Source comparability: 2024 accommodation Q86 and Q87 must be checked against the same employer-level source cut. Do not blend overall CPA and departmental employer figures.

### Implementation

The added source-linked cross-check is shared by the generated departmental pages and the specialized DFO, DND and ISC pages. Its Q86/Q87 readout draws both values from the selected employer's single 2024 PSES department extract. The expanded PSES view contains all retained 27 questions for a selected published group, and the request brief documents exactly what additional administrative evidence is needed.

**Maintainer rule:** Future updates belong in the canonical `dfo/` route and shared modules. Do not silently revive the old standalone as a competing public edition. The historical file should be kept only for source comparison and provenance.
