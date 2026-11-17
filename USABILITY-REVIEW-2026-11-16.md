# GC Equity usability review, November 16, 2026

The review followed a first-time public servant through the homepage, a departmental selection, public-service group comparisons, complete source tables, staffing, the Call to Action, departmental plans, sources, the organization directory, branch guidance, women and intersectional evidence, the detailed explorer and the hazard-prevention page.

## Findings and changes

| Finding | Change |
| --- | --- |
| Dataset names assume prior knowledge. | Added a bilingual question-to-source guide, expanded survey names and definitions with a percentage-point example. |
| The opening choices do not explain their different purposes. | Added short descriptions and corrected links whose labels described more than their selected topic. Kept the two main choices. |
| Long pages have no useful index of the current selection. | Added an index of visible sections that updates after topic changes and asynchronous source loads. |
| Organization labels include duplicates and service-wide aggregates. | Added name search and removed aggregate choices. Alternate labels use the existing organization crosswalk. Labels shared by several successor organizations are excluded from alias mapping. |
| Clearing a department can leave the national tables empty. | Restored the public-service view when the selection is cleared. |
| Group and topic selections disappear on reload or sharing. | Added validated query parameters and included dashboard filters in saved views. Browser history restores those selections. |
| Topic filtering omits relevant staffing or added-source content. | Corrected classifications, allowed relevant tables under more than one topic, and filtered additional source collections by topic. |
| Longer comparisons are difficult to search and reorder. | Added table search, numeric and text sorting, accessible sort state and downloads of matching rows. |
| Research tools are difficult to discover. | Added a shared tools menu and direct saving of displayed dashboard rows into existing evidence and briefing tools. |
| Supporting pages do not share consistent return paths. | Added breadcrumbs, shared navigation on the organization directory, repaired its resource anchor and linked branch guidance directly to the main departmental view. |
| Source information describes an earlier inventory as if it were the whole current collection. | Clarified the inventory's scope and linked directly to restored and additional collections. |
| A source file loads before a visitor reaches the source viewer. | Deferred the selected raw source until the viewer is visible or a file is chosen. Bounded the branch-results cache to three organizations. |
| Sticky navigation can cover anchor destinations. | Added anchor offsets, visible keyboard focus, menu dismissal and return-to-top links. |

Related resources are grouped by purpose: comparing evidence and preparing briefings, employee groups, and understanding barriers and responses.

## Verification

- `python scripts/check-site.py` verifies page assets, JavaScript syntax, published-data checksums, branch row counts, source population safeguards, bilingual finding figures and snapshot provenance.
- The existing desktop and phone browser workflow now also checks source explanations, organization search, restored group/topic selections, clearing a department, successor-organization separation, topic indexes, table filtering/sorting, and saving a table for a briefing.
- Interactive preview checks cover department search, Fisheries and Oceans Canada, Black-employee survey selections, reload, return to public-service data, source-table pagination, English/French switching, organization-directory navigation, saved evidence and briefing access.

The original source data files were not changed. Suppression and source-specific populations remain in force. The existing unresolved historical PSES restoration remains unresolved; this usability work does not establish its reconciliation. Automated checks do not certify assistive-technology compatibility. Further moderated testing with public servants who are unfamiliar with the data would provide evidence about comprehension and task completion.

## Design references

- [Canada.ca Content Style Guide](https://design.canada.ca/style-guide/)
- [Canada.ca tables pattern](https://design.canada.ca/common-design-patterns/tables.html)
- [GC Design System text guidance](https://design-system.canada.ca/en/components/text/design/)
- [Accessibility Standards Canada plain-language structure guidance](https://accessible.canada.ca/standards-and-technical-guides/standards-and-technical-guides-database/can-asc-312025-plain-language/12-structure)
