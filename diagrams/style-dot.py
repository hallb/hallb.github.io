#!/usr/bin/env python3
"""Apply the site's diagram style to a DOT source, before dot lays it out.

    diagrams/style-dot.py lineage.dot | dot -Tsvg

A source holds only the graph, so a post can show the file as it is. It marks
emphasis with a class (class=highlight), and this file decides what the class
looks like. Colours are the four placeholders that diagrams/theme-svg.py swaps
for CSS variables: #010101 ink, #FEFEFD card, #020202 accent, #030303 muted.

This edits the text rather than the graph. gvpr would be the obvious tool, but
it writes the graph back grouped by node, and dot places nodes in the order it
first meets them, so the same source came out with a different layout.
"""
import re
import sys

# Defaults, inserted straight after the opening brace. Anything the source
# sets itself comes later, so it wins.
DEFAULTS = (
    ' graph [bgcolor="transparent", fontname="Atkinson Hyperlegible", pad=0.2, nodesep=0.35, ranksep=0.6];'
    ' node [shape=box, style="filled", fillcolor="#FEFEFD", color="#010101", fontcolor="#010101",'
    ' fontname="Atkinson Hyperlegible Mono", fontsize=11, penwidth=1.5];'
    ' edge [color="#010101", fontcolor="#030303", fontname="Atkinson Hyperlegible Mono", fontsize=9, arrowsize=0.7];'
)

# What each class adds. The class itself stays, and dot writes it into the
# SVG's class attribute.
CLASSES = {
    # A table the diagram does not own, loaded from outside: dashed and muted.
    'external': 'style="filled,dashed", color="#030303", fontcolor="#030303"',
    # The one edge the reader should look at.
    'highlight': 'color="#020202", fontcolor="#020202", penwidth=2',
}


def expand(match):
    name = match.group(1)
    if name not in CLASSES:
        sys.exit('style-dot.py: no style for class=%s; add it to CLASSES' % name)
    return '%s, %s' % (match.group(0), CLASSES[name])


src = open(sys.argv[1]).read() if len(sys.argv) > 1 else sys.stdin.read()
out, n = re.subn(r'^(\s*(?:strict\s+)?(?:di)?graph\b[^{]*\{)', lambda m: m.group(1) + DEFAULTS, src, count=1, flags=re.I)
if not n:
    sys.exit('style-dot.py: no graph or digraph opening brace found')
out = re.sub(r'\bclass\s*=\s*"?([A-Za-z][\w-]*)"?', expand, out)
sys.stdout.write(out)
