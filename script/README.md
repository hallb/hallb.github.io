# script/

Tools for checking the generated site, against the hand-built reference in
`benhall.ca-planning/design-system/` and against the two checklists it has to
pass. Written for ISS-46 step 4 and ISS-42, and kept because the checks are
worth repeating whenever the templates change.

## What each one answers

| Script | Question |
|---|---|
| `compare-design.js` | Does the generated page match the reference at 1280px and 400px, light and dark? Does anything scroll sideways? |
| `crop-figures.js` | Does each diagram follow the theme, judged on its own rather than from a full-page thumbnail? |
| `audit-figure-colours.py` | Which colours in an inlined figure will not follow the theme? |
| `audit-a11y.js` | Does every page meet its contrast, focus and keyboard promises? (ISS-42) |
| `audit-anti-patterns.js` | Does the built site pass ISS-44's anti-patterns checklist? (ISS-42) |

The two audits are ISS-42's last two acceptance criteria, and they are written
to be re-run rather than read once. Both take seven page types at 1280px and
400px in light and dark — 28 frames — and both exit non-zero on a failure.

`audit-a11y.js` measures contrast on rendered colour rather than on the
stylesheet hexes: every text-bearing element is read back through
`getComputedStyle` and its background composited down the ancestor chain. A
clean run prints zeroes, which looks the same as a run that measured nothing,
so `SELFTEST=1` injects known-bad CSS and the run should then fail loudly.

`audit-anti-patterns.js` scores fourteen of the checklist's sixteen rows
mechanically, adds a sideways-scroll check of its own, and names the two it
cannot measure: the hero-and-call-to-action row, which needs eyes on the
render, and diagrams with literal colours, which `audit-figure-colours.py`
answers. **It is expected to be red on one row** — admonition bodies run 76–81
characters at 1280px — until
[open decision #8](../../benhall.ca-planning/docs/02-solution/open-decisions.md)
is answered. Everything else passes.

## Setup

Chromium comes from Playwright's cache; there is no need to download another.

```console
$ npm install playwright-core
$ export CHROME=~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome
```

Build the site with drafts *and* future-dated content. The `-F` matters: the
docs fixture is dated ahead, and Hugo drops it silently without the flag.

```console
$ hugo -D -F -d public
```

Then serve both the built site and the reference, because the generated pages
use absolute paths and will not work over `file://`.

```console
$ python3 -m http.server 8802 --bind 127.0.0.1 --directory public &
$ python3 -m http.server 8801 --bind 127.0.0.1 --directory ../benhall.ca-planning/design-system &
```

## Running them

```console
$ node script/compare-design.js
$ node script/crop-figures.js
$ python3 script/audit-figure-colours.py public/post/lineage-in-the-sql/index.html
```

`compare-design.js` and `audit-figure-colours.py` exit non-zero when they find
something, so either can gate a build. Screenshots land in `.screenshots/` by
default; override with `OUT`. The URLs come from `REF_BASE` and `GEN_BASE`.

## The trap these were written to catch

The diagram sources render with placeholder colours that the image render hook
swaps for `var(--dg-*)`. The swap only matches hex. Three separate things got
past it, and every one of them was invisible on the light theme:

- Mermaid derives a colour for every theme variable the source leaves unset.
- Mermaid paints its own backdrop on the `<svg>` element using the named colour
  `white`, not a hex.
- PlantUML hard-codes the stop symbol's ring past every skinparam, and d3
  writes `fill="#000"` inline on a gantt's axis text.

So a clean hex audit is not enough on its own. Look at `svgBg` in
`crop-figures.js`, and look at the dark crops.
