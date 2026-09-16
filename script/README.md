# script/

Tools for checking the generated site against the hand-built reference in
`benhall.ca-planning/design-system/`. Written for ISS-46 step 4 and kept
because the checks are worth repeating whenever the templates change.

## What each one answers

| Script | Question |
|---|---|
| `compare-design.js` | Does the generated page match the reference at 1280px and 400px, light and dark? Does anything scroll sideways? |
| `crop-figures.js` | Does each diagram follow the theme, judged on its own rather than from a full-page thumbnail? |
| `audit-figure-colours.py` | Which colours in an inlined figure will not follow the theme? |

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
