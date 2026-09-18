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
MMDC := PUPPETEER_SKIP_DOWNLOAD=1 \
        PUPPETEER_EXECUTABLE_PATH=$(HOME)/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome \
        npx -p @mermaid-js/mermaid-cli@11.17.0 mmdc

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
#     make site      build the fixtures (drafts and future dates) and index them
#     make preview   the same, then serve public/ on http://localhost:1414

PAGEFIND := npx -y pagefind@1.5.2

.PHONY: site preview

site:
	hugo -D -F --cleanDestinationDir
	$(PAGEFIND) --site public

preview: site
	$(PAGEFIND) --site public --serve
