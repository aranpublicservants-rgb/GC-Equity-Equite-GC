# Equity at National Defence

This bilingual static page brings together civilian, CAF and department-wide evidence. The guided answers use prepared rules over published records, not a generative model. All interactions work in the browser; request drafts are not sent.

The source catalogue includes matched datasets from GC Equity and related public sites, direct civilian PSES department and employee-group rows, organizational-unit results, Conduct and Culture Data Centre tables, military survey and administrative reports, workforce tables, historical publications and program intersectional-analysis tables. Population filters keep civilian, military, public opinion, family and program records distinct. Language and historical versions can overlap.

The coverage audit in `data/provenance.json` records the source families retained and review limits. It does not claim access to every unpublished internal DND dataset. Some references provide methods or qualitative findings rather than downloadable records. No private Drive files are published.

The March 2025 equity population is civilian and predates the September 2025 Coast Guard transfer. The FTE chart uses the latest results-report series, which is distinct from the earlier plan’s marine-resource backcasts. Suppressed cells are preserved; counts are not inferred from rounded percentages. Administrative files, selected cases and client-survey results are not workforce prevalence estimates.

Run `python dnd/scripts/check-site.py` from the repository root, followed by the required repository checks. The DND checks validate every source hash and row count, compare all focused group and unit cells with retained official records, and check guide links, suppression, staffing measures and percentage-point arithmetic. Browser QA covers English/French, source filters, charts, downloads, request drafts, accessibility controls and phone widths. These checks are not a formal accessibility certification.
