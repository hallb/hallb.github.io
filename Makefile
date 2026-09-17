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

SHELL := /bin/bash

DOT_SRC  := $(shell find content -name '*.dot')
PUML_SRC := $(shell find content -name '*.puml')
MMD_SRC  := $(shell find content -name '*.mmd')

DIAGRAMS := $(DOT_SRC:.dot=.svg) $(PUML_SRC:.puml=.svg) $(MMD_SRC:.mmd=.svg)

# mermaid-cli drives headless Chromium. Playwright's copy is already on this
# machine, so Puppeteer is told not to download its own.
MMDC := PUPPETEER_SKIP_DOWNLOAD=1 \
        PUPPETEER_EXECUTABLE_PATH=$(HOME)/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome \
        npx -p @mermaid-js/mermaid-cli@11.17.0 mmdc

.PHONY: diagrams check-diagrams clean-diagrams list-diagrams

diagrams: $(DIAGRAMS)

%.svg: %.dot
	dot -Tsvg $< -o $@

%.svg: %.puml
	plantuml -tsvg $<

%.svg: %.mmd
	$(MMDC) -i $< -o $@

# CI gate: render, then fail if anything changed. A stale diagram cannot ship
# without someone noticing.
check-diagrams: diagrams
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
