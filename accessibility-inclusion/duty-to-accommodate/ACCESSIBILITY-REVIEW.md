# Accessibility and plain-language review — 11 November 2026

**Project:** Independent Duty to Accommodate evidence explorer. This is not a Government of Canada website and is not an official finding of accessibility compliance.

## Review framework

- Government of Canada [Canada.ca Content Style Guide](https://design.canada.ca/style-guide/): plain language, clear task-based labels, short sections and equivalent information in English and French.
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/), Level AA, adopted here as a design target.
- Federal ICT accessibility transition: the CIO of Canada's March 12, 2026 direction rescinded the old Standard on Web Accessibility, requires continuation of interim WCAG 2.0 baseline in departments, and points to regulations using CAN/ASC EN 301 549 with implementation dates from December 5, 2027. See [official direction](https://www.canada.ca/en/government/system/digital-government/policies-standards/policy-service-digital-announcements/direction-information-communication-technologies-accessibility-towards-regulatory-implementation.html).
- The legally binding federal regulations apply according to their scope and dates. This independent site follows the technical and writing guidance voluntarily, not as a federal institution.

## Improvements applied

1. Semantic HTML with a single main heading, a skip-to-content link, native buttons, native `details` and native modal dialogue.
2. Keyboard-operable controls; named source tables with captions; focusable regions for tables that require horizontal scrolling; text instructions on small screens.
3. Visible keyboard focus, larger click targets, concise labels and filtering result counts announced as live status.
4. Accessible text equivalents for the Auditor General's case-closure bars and other visual information; colour is not the sole way that a finding is conveyed.
5. Language switch updates page language and title. Summaries for all 109 evidence catalogue entries are supplied in French; original source titles and extracts retain the original language for verification.
6. Plain-language definitions of duty to accommodate, social model, PSES/SAFF and case closure, plus explanations of PSES questions Q86, Q87 and Q88.
7. User-friendly download and search controls, source links, mobile responsive layout, and a static fallback download where JavaScript is unavailable.
8. Added a visible [accessibility statement](accessibility.html) and an accessibility-feedback email link. No personal medical information should be submitted through this route.
9. Contrast review of representative small-text colours: former table muted text `#7a8896` on white was approximately 3.63:1 and has been darkened to `#4e6577`. The former subtle text `#728292` on white was approximately 3.94:1 and has been changed to `#506779`. Most sampled primary text and badges passed 4.5:1 in normal-colour mode.

## Static checks completed

- Repository source contains valid page wrappers, titles, language attributes, labelled main sections, focusable table regions, and a valid JavaScript syntax parse.
- The supplemental catalogue CSV contains **109 rows**, of which **84 are marked verified in the supplied research**, **10 additional entries were checked against official publications**, **14 remain leads**, and **1 was not found**.
- The matching French summary JSON contains **109 records**.
- The 2024 PSES organization comparison retains 94 original source records: 92 named organizations and two aggregates. Its embedded data is not altered by updates to catalogue counts.
- All three HTML pages and their support files are committed in the current repository.

## Important limitations — do not claim full conformance

- No live browser-based end-to-end WCAG audit was available in this session. GitHub source commits and syntax checks cannot prove the public pages rendered without an issue.
- No manual tests were performed with NVDA, JAWS, VoiceOver, TalkBack, speech recognition, a screen magnifier, forced colours, or people with disabilities.
- Reflow at 200% and 400% zoom, focus order on every browser and operating system, and behaviour of all interactive updates must still be tested on the live site.
- External reports and PDFs may be inaccessible and sometimes only in English. This site offers its own accessible HTML summaries, but does not remediate the source documents.
- Downloaded CSV files contain technical English column names. The HTML explorer provides an alternate presentation. A fully bilingual data dictionary is not yet included.
- French summaries have not had independent professional translation review.
- Source classification of the social model is preliminary: literal mention in a selected plan is not proof that the organization applies a social-model approach.
- The site does **not** provide individual legal advice, determine duty-to-accommodate compliance, rank employers by legal performance, or infer that a survey gap proves unlawful discrimination.

## Remaining conformance testing

1. Run an accessibility checker such as axe-core or Accessibility Insights on each *published* page at desktop and mobile viewport sizes.
2. Test all interactions without a mouse: language buttons, tables, filters, export, expanded records, profile dialog and Escape behaviour.
3. Conduct NVDA + Firefox and VoiceOver + Safari tests, and mobile TalkBack tests with both English and French selected.
4. Check zoom/reflow, increased text spacing, speech input, contrast and forced colours, as well as large-pointer targets.
5. Ask users with disabilities to complete tasks: compare two departments, find the source of a claim, filter by indicator and download a table.
6. Remediate any found defects, document the issues, then retest. Only then consider a dated WCAG conformance statement.

## Source scope updates

New source entries include ESDC's 2024 accessibility survey and 2025 disability-network consultation; Canadian Heritage's 196-case operational account; Health Canada's employee feedback; PCO central accommodation funding; staffing accommodation barriers; federal digital regulations; PPSC's breakdown of 49 employee accommodation request outcomes; 2024 PSES accessibility/accommodation stress and career-impact question families; and ESDC's 19% very-high-stress figure from 2024 PSES Q73p.

Questions 44d, 44e, 73o and 73p are flagged as **published questions not yet fully integrated** into the 92-organization comparison CSV. No fabricated cross-organization values were inserted. PSES summary groupings changed, and Q73o/Q73p are new in 2024; do not compare unmatched years.

*This review is a source and code check, not a conformance certificate.*

## November 12, 2026 layout simplification

The main DTA page has exactly two task-oriented sections: public evidence and employee accommodation steps. The homepage offers two same-page anchors, one for each. `site.css` and `site.js` implement a responsive layout and a bilingual organization comparison without paid services or tracking. The old standalone `get-help.html` points to the employee section instead of duplicating the general employee recourse portal. The 92-organization comparison and 109-source evidence library remain available.

**Static checks** performed after the redesign: equal counts of English/French text bindings, one H1, two main sections, no duplicate IDs, no broken same-page anchors, JavaScript syntax valid, and the CSV parser returned 92 organizations plus two aggregates. This is not a browser or assistive-technology conformance test. Manual screen-reader, voice, keyboard, zoom, print, and user tests are still needed before claiming full accessibility.
