# GC Equity / Équité-GC design standard

This standard applies to every page published from this repository. Pages kept at their old addresses for separately managed networks (`racialized-executives/`) are outside GC Equity navigation and do not load the shared shell.

Rules marked **checked** are enforced on every change by `scripts/check-site.py`. Changes by any developer or AI assistant must keep those checks passing.

## Page structure

- Every page loads `gc-shared-shell.css` and `gc-shared-shell.js` with the current version marker. Use `python3 scripts/apply-shared-shell.py` to add them. **Checked** (`apply-shared-shell.py --check`, `check-design-standard.py`).
- The shared shell provides the site name, the four main navigation links, the language button, a skip link and the independence notice. Do not add a second site-wide header.
- Every page declares `lang` on `<html>`, a character set, a mobile viewport and a title, and has one `<main>` landmark. **Checked** (`check-design-standard.py`).
- Every image has an `alt` attribute. Decorative images use `alt=""`. **Checked**.
- The home page keeps exactly two primary choices on the same page: `#department-data` and `#equity-data`. They stay visible, outside any collapsed section. **Checked** (`audit-publishing.py`, desktop and mobile smoke test).
- Dedicated department pages follow `data/department-page-template.json`: the same ordered sections, a 236px sticky contents column on desktop, a section selector on phones, current-section highlighting and print styles. **Checked** (`check-dedicated-departments.py`, `check-all-department-pages.py`).

## Language

- English and French content carry the same facts, figures and links. A page switches language with `?lang=fr` or `?lang=en` and remembers the choice in `gcEquityLang`.
- The shell's language button reuses the page's own language control where one exists. Accessible names include the visible label (WCAG 2.5.3). **Checked** by the axe-core browser tests.
- French text uses French typography: a non-breaking space before `:`, `;`, `?`, `!` and `%`, and « » quotation marks.
- New visitor text uses no em dashes.

## Colour and type

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| Ink | `#173848` (shell), `#1c2e42` (workspace) | `#edf3fa` | Body text |
| Accent | `#10665e` (shell), `#006b66` (workspace) | `#71d9ce` | Shell top border, active items |
| Line | `#c2d0d5` | `#4c6172` | Table and card borders |
| Focus | `#ba7900` or `#a94c04` | `#ffba69` | 3px focus outline, 2 to 3px offset |
| Link | `#0b5c8c` | inherits | Text links |

- Text uses the system sans-serif stack (`system-ui, -apple-system, "Segoe UI", sans-serif`) at 1rem with 1.5 line height. Headings use sentence case.
- Text and interface colours meet WCAG 2.1 AA contrast. Forced-colours mode keeps borders and focus outlines.

## Tables and charts

- Wide tables sit in a scroll region (`overflow:auto`, `role="region"`, `tabindex="0"`, labelled by the heading) so the page itself never scrolls sideways on a 390px screen. **Checked** for tested pages by the mobile overflow assertions.
- Long identifiers such as checksums and URLs wrap (`overflow-wrap: break-word` in `main` text, set by the shell).
- Column headers use `<th scope="col">` and row labels `<th scope="row">`.
- A source line sits immediately below every table, naming the publisher, dataset and period.
- Suppressed values are shown as suppressed, never as zero or a reconstructed number. Different populations, reporting periods and question bases are never combined in one figure.
- Charts have a text or table equivalent and do not rely on colour alone.

## Selections between tools

- The home page (`index.html`) and Where the data agree (`where-data-agree.html`) accept `org` and `group` in the address. The shell carries the current values to those tools when a visitor follows a link. Both tools accept each other's group codes. **Checked** (`tests/shared-site-format-browser.cjs`).

## Links and data freshness

- Links between pages of this site must resolve. **Checked** (`check-internal-links.py`).
- Links to other websites are checked weekly (`.github/workflows/link-check.yml`). Official source dates are compared weekly (`.github/workflows/source-check.yml`). Both report in an issue and never change the site.
- `data/source-register-status.json` records the status of every public source register entry and must match the repository. **Checked** (`reconcile-source-register.py --check`). `data-coverage.html` is generated from it. **Checked** (`build-data-coverage.py --check`).

## Services

- Use only static GitHub Pages hosting and free GitHub Actions. Do not add paid services, paid API calls, analytics, subscriptions or hosting charges.
- Do not publish personal contact information.
