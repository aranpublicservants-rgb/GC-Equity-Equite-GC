# Current site structure — November 12, 2026

The DTA site was redesigned as **one plain-language page with two main sections**: (1) evidence on employee experiences, federal reports, organization comparisons and promising accommodation practices; and (2) step-by-step instructions for requesting workplace accommodation, documenting decisions, privacy, temporary measures and practical follow-up if measures are delayed or ineffective. The landing page has two anchor links into these sections. The separate detailed `evidence.html` research library remains available as a supplementary resource.

**This note supersedes historical references below to a 19-route recourse catalogue as the central DTA website experience.** DTA employee guidance starts with the manager or authorized accommodation service and follows the federal five-stage process, not with an ombuds or tribunal. The old `get-help.html` address now redirects to the employee guidance area, so existing bookmarked links still take users to relevant content. The broader general employee recourse project remains conceptually separate.

The DTA legal duty is **not limited to disability**. The federal Human Rights Act protects 13 grounds. The organization-level research focuses heavily on disability because the available matched PSES and other accessibility evidence is concentrated there; it does not define the full legal scope. The [CHRC's 2026 workplace accommodation guide](https://www.chrc-ccdp.gc.ca/resources/publications/workplace-accommodation-guide) and [Treasury Board's official manager process](https://www.canada.ca/en/government/publicservice/wellness-inclusion-diversity-public-service/diversity-inclusion-public-service/working-government-canada-duty-accommodate-right-non-discrimination/duty-accommodate-general-process-managers.html) anchor the employee steps.

Data remain sourced from `data.csv` (92 organizations plus two aggregates); `additional-evidence-2026.csv` (109 research entries); and `evidence-fr.json` (109 French summaries). The main page loads `data.csv` using local `site.js` and `site.css`. It does not send accommodation details to a server. A built-in sample request can be copied and edited locally, but cannot file a formal request on the user's behalf.

**Known methodological limitations:** a 2024 PSES survey cannot be causally attributed to a 2025–2026 accessibility plan; administrative case closure is not time to effective accommodation; not all survey questions use the same denominators; and disparities do not independently prove discrimination or legal non-compliance. No live user testing or formal WCAG 2.2 AA certification has been completed.

---

# Duty to Accommodate — Evidence methodology and limitations
Date: 10 November 2026. This is an independent research project, not a Government of Canada publication or legal compliance assessment.

## Scope and provenance
- 2024 Public Service Employee Survey (PSES) organization-level indicators and 2022 comparators come from a supplied compiled CSV. The published federal data source is https://open.canada.ca/data/dataset/7f625e97-9d02-4c12-a756-1ddebb50e69f .
- 94 table records comprise 92 individually named organizations, one combined micro-organizations record, and one public-service aggregate. The two aggregates are **not** separate organizations in the comparison table.
- The supplied accessibility-plan compilation contains 43 document records, including government-wide references. Thirty-six uniquely named PSES organizations have matching reviewed organizational plan records. There is no exhaustive review of every plan or progress report.
- Seven independently audited organizations have Auditor General administrative evidence. Report: https://www.canada.ca/en/auditor-general/our-work/audit-reports/auditor-general-202605-accessibility-public-service.html .
- The HTML embeds this dataset for fast and accessible browsing without a paid API, browser login or tracking.

## What each indicator measures
- Q84: respondent requested workplace accommodation within previous two years; not the proportion of disability accommodation cases.
- Q85: whether the requested accommodation related to disability.
- Q86: *any* workplace accommodation measure was implemented among those asked; **not** confirmation that needs were met in full or in time.
- Q87: satisfaction with implemented workplace accommodation among respondents asked that follow-up, not satisfaction of all requesters.
- Q88: comfort requesting workplace accommodation.
- PSES Q58 and Q65: reported harassment and discrimination. Differences between employees with and without disabilities are descriptive group gaps, **not** individual findings of unlawful conduct.
- Q42: agreement that formal recourse could be initiated without fear of reprisal.
- 2022–2024 change columns are differences in percentage points (pp), and should not be interpreted without survey denominator, composition and question comparability checks.
- Blank fields mean unpublished, suppressed or not matched—not zero.

See 2024 PSES questionnaire: https://www.canada.ca/en/treasury-board-secretariat/services/innovation/public-service-employee-survey/2024-25/2024-25-public-service-employee-survey.html .

## Social model classification
The original compilation codes the **explicit use of the term** "social model" in reviewed documents. It is not a valid organization-wide score for barrier-first service delivery, accessibility culture or compliance. Organizations without that phrase may undertake substantial barrier-removal actions (for example, the Public Service Commission's 2026–2028 plan). "Not reviewed" is not "no mention." The reviewed plan's publication date often **postdates the 2024 PSES**.

To evaluate actual practice, independently document:
1. Barrier-first identification and reasonable reliance on functional needs instead of unnecessary diagnosis disclosure;
2. Time standards, tracking and temporary accommodations;
3. Use and portability of existing accommodations and the Workplace Accessibility Passport;
4. Accessible consultation, employee voice and disability-network involvement;
5. Evidence of completed actions, monitoring and feedback in published progress reports;
6. Outcomes for all requesters, including those with delayed, refused, incomplete or ineffective measures;
7. Privacy-protective aggregated patterns of repeat requests and reviews.

Where no audited implementation evidence exists, describe these as **reported commitments**, not successful results.

## The 2026 audit must not be misread
The Office of the Auditor General published average **days from submission to case closure**, not time to an effective accommodation. Days by organization: Canada School of Public Service 24; Public Service Commission 31; Treasury Board Secretariat 35; Shared Services Canada 77; ESDC 81; PSPC 169; Canada Revenue Agency 310. Five organizations monitored timeliness or had informal goals, while PSPC and CRA did not. Closure dates and recording practices differed, and requests handled only by managers may be missing. PSC and CRA closure figures have additional data quality caveats. These averages are not risk-adjusted and do not prove causal effects.

## Independent evidence worth extending
1. Auditor General, May 2026, independent case-process audit: https://www.canada.ca/en/auditor-general/our-work/audit-reports/auditor-general-202605-accessibility-public-service.html .
2. Public Service Commission, 2025 Staffing and Non-Partisanship Survey. Among employees with disabilities needing assessment accommodation, 10% reported not requesting it, and 70% of that group cited concern about reduced chances of success: https://www.canada.ca/en/public-service-commission/services/publications/2025-staffing-non-partisanship-survey.html .
3. 2019 federal workplace accommodation benchmarking study; 6,200+ employee and manager surveys on repetitive documentation, delays, barriers and reprisal concerns: https://www.canada.ca/en/government/publicservice/wellness-inclusion-diversity-public-service/diversity-inclusion-public-service/accessibility-public-service/benchmarking-study-workplace-accommodations.html .
4. Better Accommodation Project: maturity model, self-assessment and performance measurement framework: https://cdn-rdc.service.canada.ca/en/bap/index.html .
5. GC Workplace Accessibility Passport guidance for managers: https://www.canada.ca/en/government/publicservice/wellness-inclusion-diversity-public-service/diversity-inclusion-public-service/accessibility-public-service/government-canada-workplace-accessibility-passport/conversation/gc-workplace-accessibility-passport-guidance-managers.html .
6. Accessibility Strategy public-service indicators, including stress, harassment, recourse and employment: https://www.canada.ca/en/government/publicservice/wellness-inclusion-diversity-public-service/diversity-inclusion-public-service/accessibility-public-service/accessibility-strategy-public-service-toc/accessibility-strategy-public-service-measuring-progress.html .
7. 2024 PSES open extracts, especially disability subgroup results, Q73 stress and historical distributions: https://open.canada.ca/data/dataset/7f625e97-9d02-4c12-a756-1ddebb50e69f .
8. Three-year departmental accessibility plans and annual progress reports under the Accessible Canada Act: https://www.canada.ca/en/employment-social-development/programs/accessible-canada/act-summary.html .
9. Departmental employment equity representation, promotion and recruitment: contextual indicators only, **not** proof of DTA performance or of unlawful discrimination.
10. Canadian Human Rights Commission, DTA and undue hardship guidance: https://www.chrc-ccdp.gc.ca/individuals/human-rights/duty-accommodate .
11. Federal OHS and workplace harassment/violence prevention: a separate preventive regime, potentially overlapping in relevant cases but not identical to DTA: https://www.canada.ca/en/employment-social-development/programs/workplace-health-safety/harassment-violence-prevention.html .

## Comparability and privacy
- Do not average organizational percentages and present them as a national population-weighted result.
- Do not equate plan wording with implementation, satisfaction with full accommodation, or administrative case closure with effective resolution.
- An apparent gap should prompt examination of barriers, but is not by itself a legal finding.
- If comparing organizations, report missingness and available sample denominators. Do not infer a zero from suppression.
- Work with publicly available aggregate data; do not publish personal medical, accommodation case or identifiable complaint details.
- The site labels quantitative strengths/weaknesses as *relative evidence signals*, not organizational success/failure certification.

## Highest-priority data still missing
Median days to an effective accommodation; interim measure use; full vs partial vs unresolved outcomes; unsuccessful or withdrawn request rates; rate and length of documentation requests; employee experiences after transfer; satisfaction of all requesters; and accessible, consistent records of manager-led requests. These are data requests for future research, not presently available comparable public statistics.

## Update method
Replace `data.csv` and refresh the corresponding embedded dataset in `index.html` together. Revalidate all plan links, the national PSES denominator, question wording, publication years, and audit caveats. An automated ingestion process would require review controls and access to newly released public datasets; it is **not** currently enabled.

## November 11, 2026 supplemental research

The separately published `additional-evidence-2026.csv` now has **109 entries**: 84 marked verified by the original research compiler, 10 newly checked against primary public sources, 14 research leads not yet fully verified, and one searched-for dashboard not found. The bilingual summaries reside in `evidence-fr.json`; all 109 entries have French summaries.

New primary evidence includes ESDC's 2024 workforce survey (51% versus 21% reporting confusing or delayed accommodations among employees with/without disabilities), ESDC's 2025 disability-network survey (25% comfortable discussing needs among 414 respondents), Canadian Heritage's 196 handled/121 completed requests in January–October 2024, PPSC's 49-request employee survey status breakdown, and ESDC's published 19% figure for 2024 PSES accommodation stress to a very large extent. The source catalogue provides individual URLs and caveats.

PSES questions Q44d and Q44e (career barriers), and Q73o and Q73p (stress from accessibility and accommodation) are **not yet loaded across all 92 named organizations** into the main CSV. Their existence and public sources are listed, not invented organization values. Q73o and Q73p are new 2024 items and summary calculations changed for question 73 compared with 2022: do not build misleading trend comparisons. See the [official PSES concordance](https://www.canada.ca/en/treasury-board-secretariat/services/innovation/public-service-employee-survey/2024-25/2024-25-public-service-employee-survey-question-number-concordance.html).

See [accessibility review and limitations](ACCESSIBILITY-REVIEW.md) and the [plain-language accessibility statement](accessibility.html).

## Employee recourse routing — 11 November 2026

The companion [Where to start with accommodation concerns](get-help.html) page now presents a practical **informal support → internal grievance → eligible FPSLREB adjudication → CHRC screening/complaint** orientation. It is **not** an inflexible four-step legal requirement and is not a guarantee of recourse rights.

- Prioritize informal workplace supports where safe and appropriate: accommodation specialists, management, union, ombuds and informal conflict management. Do not require confrontation when there is fear of reprisal or workplace safety risk.
- Under **section 41(1)(a)–(b) of the Canadian Human Rights Act**, the CHRC may decline to deal with a complaint when another reasonably available grievance or statutory review procedure should be used first. The CHRC is not an appeal stage after FPSLREB adjudication. [Act](https://laws-lois.justice.gc.ca/eng/acts/H-6/section-41.html); [Commission process](https://www.chrc-ccdp.gc.ca/find-help/file-discrimination-complaint/discrimination-complaint-process).
- **Do not wait past filing deadlines.** The CHRC's normal 12-month period continues to apply when another process is underway, subject to its authority to allow a longer period. [CHRC filing guidance](https://www.chrc-ccdp.gc.ca/node/73). Under the standard federal grievance regulations, the first-level individual grievance deadline is generally 35 days, and an eligible adjudication referral is generally due within 40 days of the final-level decision or relevant expiry, subject to exceptions and applicable rules. [Section 68](https://laws-lois.justice.gc.ca/eng/regulations/SOR-2005-79/section-68.html); [section 90](https://laws-lois.justice.gc.ca/eng/regulations/SOR-2005-79/section-90.html).
- An individual grievance may reach the FPSLREB only if it fits the statutory referral categories; collective-agreement grievances require bargaining-agent approval and representation under applicable provisions. [Sections 208–209](https://laws-lois.justice.gc.ca/eng/acts/P-33.3/section-208.html).
- Where an eligible referred grievance raises the Canadian Human Rights Act, the party raising the issue must notify the CHRC, as provided by **section 210**; this is separate from filing a CHRC discrimination complaint. [Section 210](https://laws-lois.justice.gc.ca/eng/acts/P-33.3/section-210.html).
- Separate doors may exist for staffing/assessment complaints and for harassment-and-violence occurrence resolution. Internal appointment-related staffing complaints can have separate short deadlines, including 15 days from a final notice. [FPSLREB staffing guide](https://www.fpslreb-crtespf.gc.ca/en/resources/guides/staffing-complaints-guide.html).

This route reflects common federal public service employment contexts and must be adapted for employees outside the FPSLRA/PSEA or under special regimes. The site does not provide legal advice or a personalized limitation calculation.

## Expanded rights and recourse: November 11, 2026

The companion [DTA recourse guide](get-help.html) now explicitly states that accommodation is **not disability-only**. Section 3 of the [Canadian Human Rights Act](https://laws-lois.justice.gc.ca/eng/acts/H-6/section-3.html) protects 13 grounds: race, national or ethnic origin, colour, religion, age, sex (including pregnancy and childbirth), sexual orientation, gender identity or expression, marital status, family status, genetic characteristics, disability, and a conviction for which a pardon or record suspension has been granted. [CHRC accommodation guidance](https://www.chrc-ccdp.gc.ca/individuals/human-rights/duty-accommodate) confirms that the duty can arise where workplace rules or practices create barriers related to protected grounds. [Federal manager guidance](https://www.canada.ca/en/government/publicservice/wellness-inclusion-diversity-public-service/diversity-inclusion-public-service/working-government-canada-duty-accommodate-right-non-discrimination/duty-accommodate-general-process-managers/gather-relevant-information-assess-needs.html) cautions against reflexively demanding external documentation for requests involving disability, religion, family status or other grounds.

The guide provides the practical orientation of **informal support → individual grievance → eligible FPSLREB adjudication**, with a **CHRC human rights complaint as an additional, independently screened route**, potentially at another stage depending on the facts. This is not a mandatory sequence, nor is the CHRC an appeal court for the Board. The [CHRC screening rule](https://laws-lois.justice.gc.ca/eng/acts/H-6/section-41.html) can direct complaints back to reasonably available grievance/review procedures and the ordinary complaint filing period is one year from the last alleged act (subject to exceptions).

A **19-route catalogue** is displayed without hiding entries behind any interactive questionnaire. Each entry lists the relevant situation, what it may achieve, and a primary-source link. It covers accommodation/reconsideration, informal and union assistance, individual/group/policy grievances, eligible Board adjudication, CHRC/CHRT complaints, staffing complaints and investigations, workplace harassment-and-violence, OHS compliance and reprisals, ACA accessibility feedback and Commissioner complaints, privacy, official languages, unfair labour practices, protected-disclosure reprisals, judicial review, federal workers' compensation and disability-benefits appeals. Some routes are only tangential to DTA and require specific facts; inclusion is **not** a claim that each route is available for every accommodation matter.

Core legal distinctions:
- [FPSLRA sections 208, 215 and 220](https://laws-lois.justice.gc.ca/eng/acts/P-33.3/FullText.html) distinguish individual, bargaining-agent group and policy grievances. [Section 226](https://laws-lois.justice.gc.ca/eng/acts/P-33.3/section-226.html) permits certain human-rights-related relief at adjudication. The CHRC is entitled to notice in covered cases through [section 210](https://laws-lois.justice.gc.ca/eng/acts/P-33.3/section-210.html).
- [Canadian Human Rights Act section 53](https://laws-lois.justice.gc.ca/eng/acts/H-6/section-53.html) provides CHRT powers including preventive orders, compensation for lost wages/expenses, a pain-and-suffering cap of $20,000 and up to $20,000 additional special compensation for wilful or reckless discrimination, if proven.
- [PSEA staffing complaints](https://www.fpslreb-crtespf.gc.ca/en/resources/guides/staffing-complaints-guide.html) have distinct eligibility and a typical 15-calendar-day notification deadline; the Board does not directly appoint complainants to positions.
- [Workplace harassment and violence occurrence resolution](https://www.canada.ca/en/employment-social-development/programs/workplace-health-safety/harassment-violence-complaint/file.html) is preventive and does not itself award CHRA damages.
- [Accessibility Commissioner complaints](https://www.chrc-ccdp.gc.ca/find-help/file-complaint-accessibility-commissioner/complain-accessibility-commissioner) address harm from non-compliance with requirements for accessibility plans, feedback processes and progress reports; not ordinary individual accommodation disputes.
- [Government Employees Compensation Act program](https://www.canada.ca/en/services/jobs/workplace/health-safety/compensation/federal-workers.html) and disability insurance appeals are separate benefit and rehabilitation pathways, not proof of employer DTA compliance.
- [PSIC reprisals](https://psic-ispc.gc.ca/en/filing-reprisal-complaint) require a connection to a protected disclosure of wrongdoing or related investigation, with a generally 60-day deadline; they are not a generic claim for reprisals after an accommodation request.

**Data limitation:** The main organization comparison relies primarily on disability-disaggregated PSES metrics, because those are the matched public datasets available. It must not imply that legal DTA rights are confined to disability, or that other protected grounds lack systemic workplace barriers. A lack of comparable survey measures is a data gap, not a legal gap.

## Detailed medical, privacy and legal guidance update — 12 November 2026

The single-page employee section now has expanded plain-language guidance based on the latest verified federal sources: distinctions between medical absence certification, functional abilities information and independent medical assessments; case-by-case supporting information; costs and consent; reuse of earlier documentation and the optional GC Accessibility Passport; and risks around privacy, sensitive records and administrative access.

Primary sources include the [CHRC 2026 accommodation guide](https://www.chrc-ccdp.gc.ca/resources/publications/workplace-accommodation-guide), [TBS general accommodation process](https://www.canada.ca/en/government/publicservice/wellness-inclusion-diversity-public-service/diversity-inclusion-public-service/working-government-canada-duty-accommodate-right-non-discrimination/duty-accommodate-general-process-managers.html), [TBS 2025 privacy notice](https://www.canada.ca/en/treasury-board-secretariat/services/access-information-privacy/access-information-privacy-notices/2022-03-requests-accommodation.html), [federal medical-document guide (2019)](https://www.canada.ca/en/government/publicservice/wellness-inclusion-diversity-public-service/health-wellness-public-servants/disability-management/obtaining-information-from-health-care-practitioners-cases-employee-illness-injury.html), and [Health Canada's current occupational-health service scope](https://www.canada.ca/en/health-canada/services/environmental-workplace-health/occupational-health-safety/public-service-occupational-health-program.html). The specific source-to-claim map and verification caveats are in [SOURCE-VERIFICATION.md](SOURCE-VERIFICATION.md).

Important: the 2019 federal sample medical forms describe distinct purposes and fees, and are not automatically mandatory for all employees in 2026. The 2026 CHRC guidance allows case-by-case medical support from appropriate providers and cautions against unnecessary diagnosis requests. The TBS policy portal did not permit retrieval of the full current text of certain directives during this review; their referenced existence is confirmed through other official federal publications, without claiming that their full wording was independently reviewed. A legacy federal disability-management handbook described earlier fitness-to-work services; Health Canada's **current** Public Service Occupational Health Program expressly does not provide fitness-to-work assessments as part of disability management, and the website discloses this difference.

The two main website sections, 92 organization-level data records and associated original-source links remain unchanged. Static code tests confirm language-label parity, valid JS, balanced common HTML tags and working internal anchor targets. Live accessibility conformance testing, translation quality review and browser interaction tests remain outstanding.
