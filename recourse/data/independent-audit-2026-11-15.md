# Independent review of federal public service recourse decisions library

**Review date:** 15 November 2026  
**Repository:** https://github.com/aranpublicservants-rgb/aran-raar  
**Library:** https://aranpublicservants-rgb.github.io/aran-raar/recourse/cases/  
**Structured data:** https://github.com/aranpublicservants-rgb/aran-raar/blob/main/recourse/data/cases.json

## Targeted update of November 18, 2026

The supplied 165-record library was compared with the current index. Every supplied record is already included in the 176-record index, including A.B., 2026 FPSLREB 76, under ID `ab-ised-2026`. The total remains 176. No duplicate A.B. record was added, and the 11 other records were retained.

A.B. now links to the official English and French case pages instead of the union statement. The official English page confirmed the case title and canonical link. Automated access to the embedded full reasons returned HTTP 403. The summary therefore incorporates the supplied November 18 verification note, which reports a full-text check; this update does not claim an independent recheck of the full reasons or subsequent judicial-review status.

The bilingual remedy summary now specifies at least two years of telework from the order, back pay from May 29, 2024, restoration of 65 sick-leave hours, $18,000 for pain and suffering and $10,000 for reckless conduct. It distinguishes the $28,000 human-rights award from back pay and notes that permanent telework, interest and unproven uninsured therapy/medication costs were not awarded. The unsupported discipline tag was removed. The disability, telework, accommodation, grievance and allowed-result classifications remain available.

The source type is now `full-decision`, meaning that the source link points to the decision itself. The visible bilingual source note preserves the verification limits. Six other entries still use secondary or representative sources. The findings below describe the original November 15 audit and remain historical.

## Executive summary

An independent public-source check of the existing 164-record library identified **12 additional case decisions and published administrative findings**, resulting in **176 indexed records across 16 recourse route groups**. This is not a complete census of Canadian judicial and tribunal decisions, or even of all federal decisions; it is a manually researched **curated index**. Published administration findings and non-final recommendations are counted as indexed **records**, not as adjudicated case-law decisions.

The audit also found a significant documentation gap: **34 of 176 links lead to general reports, collections or search pages** rather than to an individual case's judgment. The original 115 cases reconstructed from the uploaded HTML were not accompanied by their standalone source JSON: **96 records currently retain the distinct metadata value `not-separately-classified`**, not an independently checked legal conclusion. The `status` field is present for every case but “allowed” does not mean “discrimination established”; a successful grievance may turn on procedural fairness or other employment rights.

Do not publish a statement that all **176 are full-text verified decisions**, that every decision establishes discrimination, or that the database is exhaustive.

## Newly indexed records: 12

The list below distinguishes the actual decision-maker and source strength.

| Citation or official record | Route | Audit conclusion and caution | Confirming source |
|---|---|---|---|
| **A.B., 2026 FPSLREB 76** | Grievance | ISED PTSD/telework accommodation succeeded. $18,000 pain-and-suffering plus $10,000 special compensation; wage and leave relief. **Union announcement, not a fetched official judgment** | https://pipsc.ca/pipsc-statement-on-labour-board-decision-regarding-return-to-office-mandates/ |
| **Parkes, 2026 FPSLREB 7** | Staffing | IRCC racial discrimination in appointment **not established** on the evidence of nexus to that process. This is not a finding that systemic racism is absent. **Secondary legal reporting** | https://www.hcamag.com/ca/specialization/employment-law/irccs-own-anti-racism-data-fails-employee-at-tribunal/569061 |
| **Mukbil, 2026 CHRT 88** | Human rights | CBSA complaint about hiring/employment and prohibited grounds dismissed; employer decision and legal nexus considered. **Secondary reporting, check original reasons** | https://www.hrreporter.com/chrr-plus/employment-law/was-cbsa-worker-promised-a-permanent-job/395084 |
| **Canada (Attorney General) v. Shakov, 2017 FCA 250** | Judicial review | PSC appointment investigation and language-profile change; review allowed in part. **Official Commissioner of Official Languages summary** | https://www.clo-ocol.gc.ca/en/decisions/court-decisions/canada-attorney-general-v-shakov |
| **Qi, 2025 FC 1783** | Judicial review | CRA workplace-harassment investigation procedurally unfair; new investigation ordered. **No finding that every harassment allegation occurred** | https://mkworkplaceinvestigations.com/procedural-fairness-in-workplace-investigations/ |
| **Carreau, 2025 FC 1537** | Judicial review | Federal workplace harassment and violence investigation review dismissed. A complete and fair investigation is not automatically reopened for a final-report response. **Case report, not official judgment in the index** | https://www.hrreporter.com/chrr-plus/employment-law-cases/10077 |
| **Marentette, 2024 FC 676** | Judicial review | CBSA harassment investigation denied complainant a fair opportunity to answer adverse evidence; new independent investigation ordered. **Union analysis; Treasury Board cites the case** | https://ciu-sdi.ca/en/procedural-fairness-paramount-in-workplace-violence-investigations-federal-court/ |
| **Brown, 2024 FC 823** | Judicial review | Procedural fairness defects required a correction of the process; the Court permitted resumption from the affected point, rather than a complete restart, in that particular extensive investigation. **Later case-law analysis; Treasury Board cites it** | https://www.clausework.ca/post/another-lesson-in-procedural-fairness-in-investigations |
| **Public Safety Canada, OCOL investigation published 27 Feb 2026** | Official languages | Founded language-of-work and intimidation findings; Commissioner recommendations, **not court damages** | https://www.clo-ocol.gc.ca/en/decisions/investigation-summaries/investigation-summary-public-safety-canada-2023 |
| **National Defence, OCOL investigation published 20 Feb 2026** | Official languages | Founded complaint concerning inappropriate English-essential profile of a supervisory engineering position and recommended CBC/CBC profile. **Not a staffing appointment revocation** | https://www.clo-ocol.gc.ca/en/decisions/investigation-summaries/investigation-summary-national-defence-2025 |
| **National Joint Council, OCOL investigation published 8 May 2026** | Official languages | French travel terminology complaint **unfounded**, with a nonbinding terminology recommendation | https://www.clo-ocol.gc.ca/en/decisions/investigation-summaries/investigation-summary-national-joint-council-may-8-2026 |
| **RCMP External Review Committee NC-291 (2026)** | RCMP statutory review | Recommendation to reconsider harassment allegations with official-bilingualism Charter values. **Recommendation, not final RCMP decision** | https://www.canada.ca/en/rcmp-external-review-committee/services/case-summaries/other-appeals/nc-291.html |

## Broader gaps in recourse coverage

1. **Official languages must be separate from human rights and staffing.** The Commissioner of Official Languages investigates complaints under the Official Languages Act; an OCOL founded report does not automatically revoke an appointment or award human-rights damages. Section 91 language designation investigations, language of work and complaints involving intimidation are different questions. Official decisions index: https://www.clo-ocol.gc.ca/en/decisions/investigation-summaries
2. **RCMP members may have distinct disciplinary and grievance recourse**, including the External Review Committee. The body issues recommendations, not final merits rulings. https://www.canada.ca/en/rcmp-external-review-committee.html
3. **Harassment/violence investigations are not themselves a tribunal for human-rights damages**. A workplace occurrence resolution process is governed by Canada Labour Code Part II and the Work Place Harassment and Violence Prevention Regulations. Possible other avenues depend on facts, employer and procedural posture. Official guidance: https://www.canada.ca/en/employment-social-development/programs/workplace-health-safety/harassment-violence-prevention/complaints/employer-violation.html and https://www.canada.ca/en/employment-social-development/programs/workplace-health-safety/harassment-violence-complaint/not-resolved.html
4. **Privacy in workplace investigations deserves its own practical section.** Treasury Board's Privacy Implementation Notice 2025-01, effective 21 January 2026, addresses personal information, disclosing contrary evidence while protecting identity, de-identified reports, and records retention. Investigators' final reports must not directly or indirectly identify participants under regulation 30(2); certain records must be retained for 10 years (regulation 35(2)). See https://www.canada.ca/en/treasury-board-secretariat/services/access-information-privacy/access-information-privacy-notices/privacy-implementation-notice-2025-01.html
5. **Human-rights and labour decisions must not be conflated.** The Canadian Human Rights Commission receives/screens and may refer qualifying complaints; the independent Canadian Human Rights Tribunal adjudicates referred complaints. A Board staffing complaint can succeed for abuse of authority without a proven connection to race or disability.
6. **Due-process and remedies should be conditional.** Individual federal grievances generally have a first-level timeline of 35 days under FPSLREB Regulations section 68, but actual eligibility, agreements, extensions and appeal periods vary by employer. The recourse page must not promise that informal processes pause legal deadlines. https://laws-lois.justice.gc.ca/eng/regulations/SOR-2005-79/section-68.html
7. **The library should distinguish final and non-final rulings and later reviews.** A dismissal set aside on judicial review is not a final rejection of discrimination. Cases such as Matos, Boulachanis and the RCMP promotion judicial review need subsequent-status checks.

## Pending systemic complaints are not yet merits decisions

These two matters are relevant to systemic anti-Black racism, and should be listed separately as **referred complaints / proceedings**, *not* under successful or unsuccessful human-rights findings:

- PSAC's anti-Black racism complaint referred to the CHRT (reported 27 February 2026): https://psacunion.ca/victory-psacs-case-justice-black-federal-workers
- Association of Justice Counsel's anti-Black racism complaint against Treasury Board and the PSC referred to the CHRT (reported 13 October 2026): https://www.ajc-ajj.ca/info-centre/announcements/step-toward-justice-ajcs-anti-black-racism-complaint-referred-human

A referral authorizes further adjudication steps; it is **not proof** that the allegation was established.

## Quality-assurance checks and open limitations

- **176 unique IDs and 176 unique citation strings**: verify again on every update.
- **34 generic links** point to annual reports, lists, search portals or collections rather than a case-specific judgment. These should be upgraded to direct original reasons where possible.
- **96 older case records have not been independently assigned a specific merits finding** after reconstruction from the supplied HTML; maintain the visible procedural/status distinction and conduct decision-by-decision verification.
- **Seven added entries are tied to secondary reporting or a union announcement** rather than independently opened full judgments. Each is marked `secondary-summary` or `representative-statement` and, where available, includes an official decision search page.
- Some **CanLII results return HTTP 403** to automated readers; their links were not all independently clicked, and URL patterns alone do not verify an item.
- There is no evidence that every case-specific appeal status has been rechecked, that all existing legal annotations are correct, or that the live deployment passed automated accessibility testing.
- The original user-uploaded integration note was dated 16 November 2026 even though this audit was conducted 15 November 2026; the case-library page identifies these dates separately.
- **Non-adjudicated records** including PSC investigations, PSIC wrongdoing reports, Employment Equity Act audits, OCOL findings and RCMP ERC recommendations must have conspicuous type labels and not be described globally as “court decisions.”

## Priority follow-up work

1. **Full reasons and appeal status:** Replace the 34 general collection links; obtain full reasons for new seven secondary/representative-source entries; check whether later reviews changed outcomes.
2. **Manual merits classification:** Review 96 `not-separately-classified` entries one by one and add an outcome based on the legal finding, explicitly separately from whether a grievance or appeal succeeded.
3. **Clear route-specific remedy and deadline guidance:** Validate each of 16 routes against the current governing statute and explain what each body can actually order, including when it makes *recommendations* only.
4. **Pending case tracker:** Maintain a separate list of referred CHRC/CHRT matters and appeals with status and last-checked date, not counted as final merits cases.
5. **Accessibility and bilingual QA:** Test keyboard focus order, language switching, search filtering, mobile layout, screen readers and French content in a live browser.

## Why 176 is not exhaustive

The CHRT's published 2025 annual report identifies over one hundred decisions and interim rulings in that calendar year alone. Many case filings and settlements are confidential or unpublished. An overall combined 176-record index spanning decades, multiple bodies, administrative summaries and judicial reviews cannot responsibly be described as a complete national case-law database.

Sources: https://www.chrt-tcdp.gc.ca/en/about-us/publications/annual-report-2025 ; https://www.chrc-ccdp.gc.ca/en/resources/publications/2025-annual-report ; https://decisions.fpslreb-crtespf.gc.ca/fpslreb-crtespf/en/nav.do .
