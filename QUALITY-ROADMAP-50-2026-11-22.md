# GC Equity: 50 additional improvements beyond the 50-point evidence-review checklist

Updated November 22, 2026. This is a development tracker, **not a list of fifty completed website changes**. The current audit and source-linked work were used to avoid duplicating the existing 50 methodological checks. "Committed as tests" means tests have been authored, not that their GitHub Actions run has passed. "Requires official data" means no employer numbers are supplied or inferred here.

## Coverage and organizational identity

1. **Show evidence status directly within every missing department section** — Status: Committed. Acceptance: Screen reader and navigation identify not-indexed results without a zero or parent fallback.
2. **Show actual source coverage count by employer and evidence theme** — Status: Proposed. Acceptance: Each employer row reports matched source files and zero is never treated as missing.
3. **Add a read-only page explaining separate employer versus service-delivery unit** — Status: Proposed. Acceptance: Service Canada, Crown corporations and predecessor entities get distinct sourced treatment.
4. **Publish a dated organizational reorganization and reporting-boundary timeline** — Status: Proposed. Acceptance: Each transfer is supported by an official order, notice or results report.
5. **Give each thin page a plain-language employer-specific data request template** — Status: Proposed. Acceptance: Request identifies employer, year, population, group and privacy thresholds.
6. **Add direct links from missing evidence to the relevant primary publisher** — Status: Proposed. Acceptance: Every absent result has an official original-source lookup or status note.
7. **Provide an organization alias lookup that avoids duplicate canonical pages** — Status: Committed previously. Acceptance: Aliases lead to one canonical page; combined populations remain separate.
8. **Add a page-level review date distinct from the date in each dataset** — Status: Proposed. Acceptance: Dates are visibly distinguished and never imply data are current.
9. **Show whether an employer reports independently under the relevant legislation** — Status: Requires verification. Acceptance: Employer status and sources are documented before labelling.
10. **Create downloadable per-organization source-availability register** — Status: Proposed. Acceptance: File lists only source URLs actually matched for that organization.

## Staffing, executive and workforce data

11. **Import the PSC 2024-25 hiring-by-group cut by organization** — Status: Requires official data. Acceptance: Use source-labelled applicant and appointment group cells without inferring suppressed data.
12. **Import appointment pipeline stages as separate denominators** — Status: Requires official data. Acceptance: Applicants, screened in, assessed, qualified and appointed are not conflated.
13. **Show promotions by group with eligibility and occupation where reported** — Status: Requires official data. Acceptance: Published numerators and denominators appear beside each share.
14. **Separate acting appointments by length, group and classification** — Status: Requires official data. Acceptance: Do not treat temporary acting work as a promotion.
15. **Display public-service 2025 EX-group-by-level table with correct scope** — Status: Committed. Acceptance: National EX-01 to EX-05 values link to the original TBS table.
16. **Add verified departmental EX-level by equity-group tables where published** — Status: Requires official data. Acceptance: No department values are inferred from public-service-wide data.
17. **Show matched 2025 versus 2024 executive denominators and classification changes** — Status: Proposed. Acceptance: Comparisons are made only across comparable source populations.
18. **Flag match rates and incomplete administrative coverage in PSC dashboard** — Status: Committed. Acceptance: Staffing explanation notes approximately 80% and 60% matching caveats.
19. **Add occupational and regional staffing breakdowns only when publisher exposes them** — Status: Requires official data. Acceptance: Group and geographic scope stay attached to their source.
20. **Track language requirements as a career-access dimension without treating bilingualism as inequity itself** — Status: Requires official data. Acceptance: Comparisons identify job requirements and valid denominators.

## Surveys, interpretation and visual presentation

21. **Allow CSV download of the selected 27-question department-group view** — Status: Committed. Acceptance: CSV preserves source links, question wording and denominator cells.
22. **Allow shareable direct links to a selected group, question and view** — Status: Committed. Acceptance: URL parameters restore the selected public dataset view.
23. **Add side-by-side comparison of two published employee groups** — Status: Proposed. Acceptance: Only cells with compatible year, population and question definitions appear.
24. **Provide on-chart conditional denominator explanations for Q84 to Q88** — Status: Proposed. Acceptance: Viewer is told when the question was asked only of requesters or recipients.
25. **Offer accessible text summaries of chart data instead of relying on visual marks** — Status: Proposed. Acceptance: Charts have a readable caption, table and source.
26. **Add survey question direction tags for negative and positive result interpretation** — Status: Proposed. Acceptance: Q58 and Q65 are not incorrectly treated like positive responses.
27. **Flag the size of small published respondent bases without reconstructing values** — Status: Proposed. Acceptance: Uses displayed n, never suppressed or reverse-calculated counts.
28. **Introduce 2022-to-2024 comparison only for source-compatible questions** — Status: Proposed. Acceptance: Changed wording or response scales block automatic trend lines.
29. **Make employee-group survey tables keyboard-scrollable with explicit captions** — Status: Committed. Acceptance: 27-question table has table caption, header scopes and keyboard-scrolling region.
30. **Separate descriptive percentage-point gaps from statistical or causal claims** — Status: Committed previously. Acceptance: Results are labelled descriptive; no significance or cause inferred.

## Recourse, accessibility and legal accuracy

31. **Retain a dated local source-linked copy of all 176 ARAN index entries** — Status: Committed. Acceptance: Data records preserve citation, source link, scope, route and outcome.
32. **Exclude service-delivery cases from employment case matching by default** — Status: Committed. Acceptance: Only matching federal public service employment cases appear by default.
33. **Add explicit outcome labels and publisher summaries to indexed cases** — Status: Committed. Acceptance: Case lists identify procedural or adjudicated outcomes without turning allegations into findings.
34. **Provide exact-organization and historical-name matching with provenance** — Status: Proposed. Acceptance: Aliases require crosswalk evidence and do not merge unrelated employers.
35. **Filter recourse by legal forum and procedural status** — Status: Proposed. Acceptance: Forum, date, outcome and source type are independently filterable.
36. **Distinguish full-text decisions, annual-report summaries and secondary commentary** — Status: Proposed. Acceptance: Source-type labels are visible before opening a case.
37. **Link applicable official deadlines without claiming a single universal deadline** — Status: Proposed. Acceptance: User is directed to statute or tribunal rules and representative.
38. **Compare accessibility plans with published annual progress reporting** — Status: Requires official data. Acceptance: Commitments and verified implementation evidence remain separate.
39. **Link employer-level accommodation process measures to surveys only as contextual evidence** — Status: Proposed. Acceptance: Medical case details and complaints are not collected.
40. **Add workplace-hazard and psychosocial-risk context without misclassifying law as enacted** — Status: Requires legal verification. Acceptance: Current statutes and consultations are dated and cited.

## Accessibility, performance and release reliability

41. **Repair repository data-checksum coverage and ordering** — Status: Committed. Acceptance: Complete asset/data hash list passes repository checksum validation.
42. **Run source-boundary regression tests on all generated organization profiles** — Status: Committed. Acceptance: Test verifies available source files and avoids parent or national substitutions.
43. **Test thin-page bilingual missing-evidence sections in a real browser** — Status: Committed as tests. Acceptance: Browser assertions verify the added sections, navigation and language variants.
44. **Test desktop and mobile routes for six representative departments** — Status: Committed previously. Acceptance: CI opens DFO, DND, ISC, CRA, ESDC and Canada Post.
45. **Verify clipboard failures and announce a manual fallback accessibly** — Status: Proposed. Acceptance: Screen reader status gives usable instructions when clipboard is unavailable.
46. **Prevent accidental formula execution in all newly exported CSV files** — Status: Committed. Acceptance: Formula-like values are prefixed as text in generated exports.
47. **Run link and anchor checks on canonical pages and old aliases** — Status: Proposed. Acceptance: Broken internal links fail CI, while retired paths redirect.
48. **Measure data bundle weight and lazy-load on demand** — Status: Proposed. Acceptance: Targeted assets and first-use source files are profiled, with a budget.
49. **Check bilingual options, error paths and dynamic labels rather than static HTML only** — Status: Proposed. Acceptance: Automated browser tests exercise JavaScript-generated French and English text.
50. **Require an observed green site validation and Pages deployment before declaring completion** — Status: In progress. Acceptance: Report run IDs, job conclusions and published URL status.

## Completion gate and evidence boundaries

An improvement is complete only when the repository contains the implementation, checksum coverage is current, relevant source pages are linked, automated tests pass, and GitHub Pages is confirmed deployed. The public-service EX dataset must never be presented as departmental EX group figures; PSC staffing-survey opinions must never be relabelled as administrative hiring shares; suppressed results must never be imputed. Missing data are a documented source gap, not a zero.
