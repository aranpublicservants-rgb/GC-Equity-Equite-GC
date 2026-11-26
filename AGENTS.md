# Work on this repository

Use the existing GitHub connection. Do not ask Ali to sign in again. If write access is unavailable, preserve the completed changes and report the access failure without requesting another sign-in.

Do not introduce paid services, paid API calls, subscriptions or hosting charges. Research tools must work with the existing static hosting. Describe the browser data guide accurately; it is retrieval and arithmetic, not a generative model.

Preserve published datasets, suppressed cells, source-specific populations and reporting periods. Never reconstruct suppressed counts. Do not derive headcounts from rounded percentages. Treat different data populations and availability benchmarks separately.

Preserve all existing data assistants, including guided, search and department-specific assistants. Consolidate navigation rather than deleting tools. Do not remove any feature, dataset, source, analysis, interactive control or specialized resource unless an equivalent is already integrated elsewhere and verified in both languages. Preserve old public URLs or redirect them to the equivalent functionality; document and test any consolidation before retiring an interface.

Keep visitor text factual, in plain English and French. Do not display development instructions, requests from conversations or implementation status on visitor pages. Use no em dashes in new visitor text.

Run `python scripts/check-site.py` for changes to code or pages. Use the managed preview and the documented browser tools for interactive checks. Keep changes isolated from other repositories unless the user authorizes work there.

## Dedicated department pages

Follow the ordered section contract in `data/department-page-template.json`. Use the DFO page layout, including the sticky 236px contents column, a matching mobile section selector, current-section highlighting and print styles. Use the same section titles, except for documented differences in the department's population. Explain omitted sections in Evidence gaps.

Keep every figure within its own department, source, population, reporting period and question definition. Put an appropriate source immediately below every table. Recommendations must name the measure and figure that support them. Do not praise departments, present promises as results, infer causes, reconstruct suppressed cells, or derive employee shortfalls from rounded percentages.

Ali's latest November 19 instruction authorizes completing the conversion for all departments and publishing the changes directly on GitHub. Do not return ZIP files as the deliverable. Use the existing GitHub connection and confirm the resulting publication. Preserve department-specific populations and identify evidence gaps rather than filling them with another employer's figures.

Run `python scripts/check-dedicated-departments.py` and the existing checks for any dedicated pages changed. Regenerate `data/checksums.sha256` after a reviewed data change.
