# GC Equity audit corrections

Reviewed November 18, 2026 (Toronto).

The supplied correction report and link-check CSV were checked against the current main branch. The edits preserve the later prevention-only changes to the racism and discrimination page, published source populations, suppressed cells and original source downloads.

| Audit items | Result |
| --- | --- |
| 1.1–1.4 | Explorer links now name `#overview` and `#depts` directly. The old department fragment remains supported by the router. ARAN search links use the existing unsuffixed anchors. The DND Call to Action source points to `call-to-action.html`. |
| 1.5–1.8 | Replaced the two dead subgroup addresses and found the actual general Departmental Plans and PSES landing pages. The replacement pages were opened and checked. |
| 1.9 | Used the verified 2025 FSDS progress-report PDF. The suggested replacement HTML page returned 404 when checked, so it was not used. |
| 1.10, 7 | Retained links identified as working despite automated HTTP failures. An inconclusive HTTP response is not treated as proof that a source is dead. |
| 2 | Updated moved plans, CHRC and Senate addresses, French Open Government addresses, the PSC portal and the Copilot template. Retained stable dataset-download URLs. Publication archive notices are not dead links; several resource links now use verified catalogue records. Other valid publication redirects are retained. |
| 3.1 | Changed the explorer count to 71, including generated text and French strings. The homepage department-comparison table excludes the government-wide aggregate from its list of organizations. |
| 3.2 | Corrected the pre-assessment audit to the 2025 audit on access, in both languages. |
| 3.3 | The source-inventory fallback is 126, matching the CSV's `Data table` rows. |
| 3.4 | Corrected the consultation-report release date to September 9, 2026, in both languages, with the release announcement linked. |
| 3.5, 3.6, 4.1 | The calculator starts at $143,271 total compensation per FTE, with the February 17, 2026 PBO source. Its explanation reports $76.3 billion total spending and the $71.4 billion ministerial component, and states the broader population. Removed the unsupported approximately $100,000 base-salary assertion. |
| 3.7 | Recalculated the 2021 salary-band percentages and ratios from the independent project's existing counts, then regenerated the explorer's inline copy. The received CSV is retained separately. No new counts or imputation estimates were created. |
| 3.8 | The alleged stale Call to Action comparison is a difference between cohorts. OSFI has a survey value but no matched employee count. The size-adjusted analysis requires size and therefore has 18 organizations without reported training. Rebuilding reproduces the existing results. The page now explains this exclusion; the comparison JSON lists excluded records. It would be incorrect to substitute the unadjusted 19-organization mean while retaining the size-adjusted test. |
| 3.9 | The 2023 upper band is labelled `Over $104,999`, consistent with the existing values for salaries of $105,000 and over. |
| 3.10 | Corrected the 2025 total row, the 2025 overlapping lower bands, and the equivalent inaccurate 2024 lower-band wording. |
| 3.11 | Removed the claim that nothing is estimated. Independent analyses, calculations and estimates are distinguished from official source figures. |
| 4.2 | Confirmed Q24 directly in the retained published subset-1 CSV: 77% in 2022 and 72% in 2024. The Q67 and Q69 follow-up assertions were not independently confirmed in this pass. The results-tool endpoint rejected text requests; subset 2 starts with supervisor results and is not a simple substitute for the missing follow-up cut. Existing follow-up values were not replaced with guesses. |
| 4.3 | The women-with-disabilities respondent counts were not independently confirmed. No replacement counts were inferred from percentages. |
| 4.4 | DND's 4,509 compiled department/group cells pass the check against its retained EEINFODV department extract. Added the exact source address, local file hash, filters and population note to both departmental survey summaries. The DND caption distinguishes this cut from aggregated branch data. |
| 4.5, 6.1 | Extended the checksum manifest to every hosted data/catalogue file in the declared folders, including restored partitions, workspace assets and departmental source packs. All 4,258 entries were hashed and verified. The source inventory's original hashes remain original hashes. |
| 4.6 | Opened the current Justice consolidations and checked the applicable-partner definition, six-month prevention requirement, consolidation amendment dates and the FPSLRA board provision. No legislative change was inferred from a consultation. This is not a fresh legal opinion on every provision in the page. |
| 4.7, 4.8 | Retained the verified PSC transcriptions and departmental-plan counts. The plan counts were not all recounted from the 90 original documents. |
| 5.1 | Rewrote catalogue prose containing em dashes. Where punctuation comes from an original dataset header, downloads retain the original header; the on-screen header has adjusted punctuation and an explanatory note. |
| 5.2, 5.3 | Completed the truncated French paragraphs, translated the missing explorer content and DFO explanation, corrected punctuation and grammar, and standardized affected brand references. Browser checks found and corrected two additional untranslated salary-index group labels. |
| 5.4 | Used one Data guide label, clarified source notes and the statistical threshold, and explained independent imputation estimates. Canadian English permits `organization` together with `behaviour` and `favourable`; French retains `organisation`. Statutory titles retain their published spelling. |
| 6.2 | Removed annotation text from the numeric mobility cell. The cell is blank because the source value cannot be validated, rather than being presented as a confirmed suppression. The original anomaly is recorded in the companion provenance notes. |
| 6.3 | Added the ten French organization names from PCO's French collections and six employer classifications confirmed in the FAA. The other six classifications retain explicit unverified notes. The published Statistics Canada letter does not identify an author. The Auditor General's letter defers its substantive response to the Public Accounts Committee; it does not enumerate individual measures. These are now explained rather than filled with invented content. |
| 6.4 | Corrected resource titles against the actual documents. The 2019 Heritage pair is a disability-convention follow-up report. CAPCH is the action plan on combatting hate. BT22-221/2019 is the accessibility strategy. The StatCan items now have their actual titles. Replaced filename titles. Living statutes are not assigned an invented publication year. |
| 6.5–6.8 | Explained the unrecorded Internal Services count without turning null into zero; recorded actual checks for the four previously undated sources; distinguished a reference-only racialized-subgroup source; moved CSV provenance rows into a companion file; documented each workspace section's actual coverage and aggregate keys. |
| 6.9 | Kept the PSC shares as published. The staffing and homepage tables explain that the women/men shares do not always sum to 100 and that the source does not identify the remainder. No missing share was inferred. |
| 6.10 | No additional bulk source collection was ingested. |

The received independent salary file also has a 2022 racialized-share total of 99.83%. This was recorded in the source notes and retained without normalizing it or inferring missing counts.

## Validation

- `python scripts/check-site.py` passes, including the new numerical/source regression checks, complete data checksums, 2,011,833 branch rows, bilingual findings and the guided dataset tests.
- `python scripts/audit-organization-datasets.py` and `python scripts/audit-publishing.py` pass. The existing duplicate-header warning in a restored CSIS CSV is retained as a source property.
- `python dnd/scripts/check-site.py` passes for 806 assets, 609,697 rows, 4,509 department/group cells and 11,961 branch cells.
- `python scripts/check-dfo.py` passes for the 136-file DFO source collection, 467,472 records, source hashes, suppression, charts and guide.
- Browser checks cover French page rendering, the corrected 2021 values, the 2023 salary label, source notes, the OAG letter explanation and the DND department-level caption.

## Verification limits

The original audit's unknown external links and external anchor targets are not all newly verified. Remaining Q67/Q69 assertions, the two women/disability respondent counts, six employer classifications and individual plan term counts have not been independently settled. They were not replaced by inferred values. The source pages and original downloads remain available for further checking.
