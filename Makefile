# Diagram sources render to an SVG beside the post that uses them.
#
# One rule per language, keyed on the extension, so adding a diagram means
# adding a file and nothing here changes. Make compares timestamps, so only
# a source newer than its SVG is re-rendered.
#
#     make diagrams        render every source under content/
#     make check-diagrams  fail if any SVG is out of date (for CI)
#
# The SVGs are committed. That is deliberate: it keeps the pictures working
# in GitHub, pandoc and IDE previews, which is the whole point of linking a
# file rather than embedding the source in a fence. See
# docs/02-solution/diagram-pipeline.md in the planning repo.
#
# A source holds only the diagram. The site's diagram style lives once, in
# diagrams/, and every render goes through it:
#
#     diagrams/style-dot.py    defaults and class=... emphasis for DOT
#     diagrams/plantuml.puml   skinparams and HIGHLIGHT, included with -I
#     diagrams/mermaid.json    theme variables, passed with -c
#     diagrams/theme-svg.py    swaps the placeholder colours for CSS variables
#                              and adds a dark theme, so a committed SVG follows
#                              the theme outside the site too
#
# Every SVG depends on its style file and the theme script, so changing the
# style re-renders the diagrams that use it.

SHELL := /bin/bash
.SHELLFLAGS := -eo pipefail -c
# A render that fails half way must not leave an SVG that looks current.
.DELETE_ON_ERROR:

DOT_SRC  := $(shell find content -name '*.dot')
PUML_SRC := $(shell find content -name '*.puml')
MMD_SRC  := $(shell find content -name '*.mmd')

DIAGRAMS := $(DOT_SRC:.dot=.svg) $(PUML_SRC:.puml=.svg) $(MMD_SRC:.mmd=.svg)

# mermaid-cli drives headless Chromium. Playwright's copy is already on this
# machine, so Puppeteer is told not to download its own.
#
# CHROMIUM is its own variable so a caller can point it somewhere else without
# restating the rest of this line, which would drop the version pin below the
# moment someone got the quoting slightly wrong. `[ISS-11, 2026-09-20]`
#
# The default is a path that exists on exactly one machine, and that is the
# unsolved part of running check-diagrams anywhere else. `playwright@1.63.0
# install` -- the version this repo's package.json asks for -- lays down
# chromium-1243, not the 1234 named here, so even the laptop's own pin cannot
# be reproduced from the version number. cloudflare.yml's header records the
# full measurement and ISS-57 owns fixing it.
CHROMIUM := $(HOME)/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome

# Pinned for the same reason as Hugo, Pagefind and wrangler: `npx` with no
# version resolves to whatever is newest on the day of the build, and a
# mermaid-cli that renders one pixel differently turns check-diagrams red on a
# commit that touched nothing. `[ISS-11]` Necessary but not sufficient -- the
# pin does not reach the Chromium mermaid-cli drives. See CHROMIUM above.
MERMAID_CLI_VERSION := 11.17.0

MMDC := PUPPETEER_SKIP_DOWNLOAD=1 \
        PUPPETEER_EXECUTABLE_PATH=$(CHROMIUM) \
        npx -p @mermaid-js/mermaid-cli@$(MERMAID_CLI_VERSION) mmdc

THEME := diagrams/theme-svg.py

.PHONY: diagrams check-diagrams clean-diagrams list-diagrams

diagrams: $(DIAGRAMS)

%.svg: %.dot diagrams/style-dot.py $(THEME)
	diagrams/style-dot.py $< | dot -Tsvg -o $@
	$(THEME) $@

# PlantUML writes the SVG beside the source, under the same name.
%.svg: %.puml diagrams/plantuml.puml $(THEME)
	plantuml -I$(abspath diagrams/plantuml.puml) -tsvg $<
	$(THEME) $@

# Mermaid derives a colour for every theme variable left unset, and those
# derived values are literals the theme script cannot see, so mermaid.json
# sets variables the gantt does not appear to use. Keep todayMarker off in
# the source: the marker sits at today's date, so the SVG would change daily
# and check-diagrams would fail. mermaid-cli ignores it in the config file.
%.svg: %.mmd diagrams/mermaid.json $(THEME)
	$(MMDC) -c diagrams/mermaid.json -i $< -o $@
	$(THEME) $@

# CI gate: render, then fail if anything changed. A stale diagram cannot ship
# without someone noticing.
#
# -B, so this never trusts a timestamp. git does not preserve mtimes, so in a
# fresh clone every file is checked out in the same second and make is as
# likely to think a stale SVG is current as not.
check-diagrams:
	$(MAKE) -B diagrams
	@if [[ -n "$$(git status --porcelain -- '*.svg')" ]]; then \
		echo "Diagrams are out of date. Run 'make diagrams' and commit the result:"; \
		git status --porcelain -- '*.svg'; \
		exit 1; \
	fi

list-diagrams:
	@printf '%s\n' $(DIAGRAMS)

clean-diagrams:
	rm -f $(DIAGRAMS)


# ---------- Site build and search (ISS-43, ISS-46) ----------
#
# Pagefind indexes the built HTML, so it runs after hugo, over public/. The
# index lands in public/pagefind/, which is ignored along with the rest of
# public/. `hugo server` never has an index; use `make preview` to try search.
#
#     make site       build the fixtures (drafts and future dates) and index them
#     make preview    the same, then serve public/ on http://localhost:1414
#     make site-prod  what ships: no drafts, no future-dated content
#
# TWO BUILDS, AND THE DIFFERENCE IS ONE FLAG PAIR. `[ISS-11, 2026-09-20]`
# `site` passes -D -F and `site-prod` does not. That is the whole of it, and it
# is a target rather than a flag passed by whoever is calling, deliberately:
# the fixture post content/post/lineage-in-the-sql says "Test fixture for the
# Hugo templates. Never publish." in its own front matter, and the only thing
# standing between it and benhall.ca is which of these two names gets typed.
# A flag can be forgotten at a call site; a target cannot be half-typed.
#
# So: CI's deploy job and the break-glass command in wrangler.toml both call
# site-prod, and nothing that reaches production calls site. The preview job
# calls site on purpose -- the fixture is the only content exercising the
# diagram render hooks, cluster labels and figure treatments, so a preview
# without it stops showing the work being previewed.
#
# Both end in the same Pagefind call. A bare `hugo` ships a site whose search
# silently returns nothing, and that is as true of production as of preview.

PAGEFIND := npx -y pagefind@1.5.2

.PHONY: site site-prod preview

site:
	hugo -D -F --cleanDestinationDir
	$(PAGEFIND) --site public

# No --minify, unlike the old hugo2.yml. Adding it here would mean the bytes
# the link check reads are not the bytes anyone has ever looked at in a
# preview, and minified HTML is materially harder to diff when a template
# change does something unexpected. `[ISS-11]`
site-prod:
	hugo --cleanDestinationDir
	$(PAGEFIND) --site public

preview: site
	$(PAGEFIND) --site public --serve


# ---------- Link check (ISS-12) ----------
#
# The gate. ISS-11 wires `make check-links` into cloudflare.yml so the deploy
# job `needs:` it. Reasoning for what it does and does not check is in
# .htmltest.yml, which is where someone changing it will be looking.
#
#     make check-links           internal links, deterministic and offline
#     make check-links-external  the same plus external, on demand only
#
# Neither builds the site. That is deliberate: the gate must check the bytes
# that are about to ship, and `make site` builds drafts and future-dated
# content (-D -F). Wiring a build into this target is how the gate ends up
# checking something other than what deploys. CI runs `make site-prod`, then
# this, and then hands that same public/ to the deploy job as an artifact --
# so the tree htmltest read and the tree wrangler uploads are the same bytes,
# not two builds of one commit. `[ISS-11, 2026-09-20]`

HTMLTEST := htmltest

.PHONY: check-links check-links-external

# `public/index.html` rather than `public/`: Pagefind and a half-finished
# build both leave the directory there, and a link check over a stale tree
# is worse than no link check, because it is green.
public/index.html:
	@echo "public/ is not built. Run 'make site-prod' to check what ships," >&2
	@echo "or 'make site' to check the preview build with the fixtures in." >&2
	@exit 1

check-links: public/index.html
	$(HTMLTEST) -c .htmltest.yml

check-links-external: public/index.html
	$(HTMLTEST) -c .htmltest.external.yml
