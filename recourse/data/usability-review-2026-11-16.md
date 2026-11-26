# Recourse site review, November 16, 2026

The review followed the path of a federal worker unfamiliar with grievances, complaints, bargaining agents and decision databases. It covered the guide, guided assistant, quick form, union and agreement tools, deadlines, informal support, selected examples, complete indexed library, contacts, action checklist and financial research.

## Changes

- One main guided-support entry, a shorter menu and task-based starting choices. The earlier short form remains available as an alternative.
- Six topic cards initially, with search, categories and a show-more control. Selecting a concern preserves keyboard focus and updates the checklist.
- Collective-agreement search sits with the union finder. Financial research, contact lists and selected case examples open when requested.
- The guide, assistant and decision library carry the chosen language between pages and on reload. Only the language is represented in the URL; workplace answers are not stored there.
- The assistant keeps its adaptive questions and source-linked guidance. Privacy information is beside the writing box. Guidance can be downloaded without relying on the clipboard. A language-model download is optional, rather than automatic.
- The explained library displays 12 records per page, includes every source issue and context in its filters, and exports all matching records to CSV. Searches of that selection run locally. The independent A2AJ service remains an optional, separate tool with its transmission notice and official-source alternatives.
- Case cards identify employment context, source limitations and the difference between a successful grievance and a finding of discrimination. Collection or report links are identified where their URL makes that clear.
- Large inline guide programs are now separate cacheable files. The library HTML is approximately 27 KB, replacing approximately 688 KB of duplicated bilingual case markup; it loads the unchanged structured case file separately.

## Deadline clarification and references

The regulatory first-level grievance period must not be presented as a universal rule. Applicable collective agreements can prescribe different periods and counting rules. The guide now leads with that distinction, including a specific PA agreement example.

- [PA agreement, article 18](https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/pa.html): clauses 18.15 and 18.20 prescribe 25 days and exclude Saturdays, Sundays and designated paid holidays. Clause 18.07 addresses a qualifying informal discussion; clause 18.22 addresses agreed extensions. These provisions are an example, not a rule for all workers.
- [Federal Public Sector Labour Relations Regulations, section 68](https://laws-lois.justice.gc.ca/eng/regulations/SOR-2005-79/section-68.html): regulatory grievance periods.
- [FPSLREB individual grievance guidance](https://fpslreb-crtespf.gc.ca/en/resources/fact-sheets/grievances/individual.html): eligibility, representation and referral requirements, including agreement exceptions.
- [FPSLREB staffing complaints guide](https://www.fpslreb-crtespf.gc.ca/en/resources/guides/staffing-complaints-guide.html): 15 calendar days and receipt requirements for eligible complaints.
- [CHRC filing guidance](https://www.chrc-ccdp.gc.ca/find-help/file-discrimination-complaint): file within 12 months; using a separate process does not remove that requirement; exceptions may be considered.
- [Commissioner of Official Languages filing guidance](https://www.clo-ocol.gc.ca/en/complaints-investigations/before-filing-complaint): different filing periods for Part IV/section 91 and other provisions.

## Validation and limits

The existing 45 adaptive-flow checks pass. Additional checks confirm all 176 records remain reachable, every issue/ground/context has a filter, combined filters stay within their selected context, English/French accent-insensitive search works and CSV protects spreadsheet formula entry. Local asset and anchor checks pass.

The automated browser workflow checks desktop and phone journeys in English and French, local agreement-file search, adaptive choices, message drafting, guidance and CSV downloads, pagination, empty results, reset, language continuity, horizontal reflow and serious/critical automated accessibility findings. The desktop and phone checks passed in both languages for the initial refinement. The final revision also checks external-search language, explicit submission and failure recovery. Its result is available in [GitHub Actions](https://github.com/aranpublicservants-rgb/aran-raar/actions/workflows/recourse-review.yml).

This was a usability and implementation review with targeted official deadline verification. It was not a new legal verification of every case, appeal or expenditure. The 176-record structured source and financial source files were preserved. The [November 15 source audit](independent-audit-2026-11-15.md) still identifies 34 collection/report links and 96 older records without a separately reviewed discrimination-finding classification. Those gaps remain and are disclosed on the site. A live sample search returned published source records during review. The optional external search still depends on its provider and the visitor's network. Automated accessibility checks do not replace assistive-technology testing with users.
