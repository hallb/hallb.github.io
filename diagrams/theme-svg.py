#!/usr/bin/env python3
"""Make a rendered diagram follow the theme, in place.

    diagrams/theme-svg.py figures/lineage.svg

The sources render with four placeholder colours that nothing else would
pick, so a colour that escapes the swap looks slightly wrong rather than
invisible: #010101 ink, #FEFEFD card, #020202 accent, #030303 muted. This
swaps each one for a CSS variable with the light value as its fallback, and
adds a <style id="dg-theme"> that sets the variables, with dark values under
prefers-color-scheme. So the committed file follows a dark theme on its own,
in GitHub, an <img> or a browser tab.

On the site, the image render hook inlines the SVG and drops dg-theme, so the
page's own --dg-* variables win and the theme toggle works. The values below
are site.css's --ink, --card, --muted and --accent; keep them in step.

Running it twice changes nothing: a file that already has dg-theme is left
alone, because the fallbacks contain #FFFFFF, which would be swapped again.
"""
import re
import sys

LIGHT = {'ink': '#1A1A1A', 'card': '#FFFFFF', 'muted': '#474D54', 'accent': '#1B4FA0'}
DARK = {'ink': '#F2F4F6', 'card': '#1C2126', 'muted': '#A3ACB6', 'accent': '#8FB6EE'}

HEX = {
    # The placeholders.
    '010101': 'ink', 'fefefd': 'card', '020202': 'accent', '030303': 'muted',
    # Colours the renderers hard-code, which no source or style file can
    # reach. PlantUML's stop symbol is a white ellipse with a grey inner
    # stroke; d3 writes fill="#000" on the Mermaid gantt's axis text. Anything
    # that genuinely wants white or black gets card or ink, which is the right
    # answer on this design.
    'ffffff': 'card', '808080': 'muted', '000000': 'ink', '000': 'ink',
}


def var(role):
    return 'var(--dg-%s, %s)' % (role, LIGHT[role])


def block(values):
    return ';'.join('--dg-%s:%s' % (role, values[role]) for role in LIGHT)


path = sys.argv[1]
svg = open(path).read()
if 'id="dg-theme"' in svg:
    sys.exit(0)


def swap(text):
    # One pass, so a fallback written by one swap is never rewritten by
    # another. The six-digit black comes first in the alternation, so #000
    # cannot clip the front of #000000.
    text = re.sub(r'#(010101|fefefd|020202|030303|ffffff|808080|000000|000)\b',
                  lambda m: var(HEX[m.group(1).lower()]), text, flags=re.I)
    # Named colours, which no hex swap sees. Mermaid's today marker is navy,
    # and Mermaid paints its own backdrop on the <svg> element in white: on a
    # dark theme that shows as a white slab.
    text = re.sub(r'(stroke|fill)\s*:\s*navy\b', lambda m: m.group(1) + ':' + var('accent'), text, flags=re.I)
    text = re.sub(r'background-color\s*:\s*white\b', 'background-color:' + var('card'), text, flags=re.I)
    return text


# Comments are left alone. PlantUML embeds the diagram source, style included,
# in a comment at the end of the file, and XML forbids "--" in a comment, so
# swapping var(--dg-ink) into it made the file unreadable as an image. (An
# HTML parser shrugs that off, which is why the inlined figure never showed it.)
parts = re.split(r'(<!--.*?-->)', svg, flags=re.S)
parts = [part if part.startswith('<!--') else swap(part) for part in parts]

# color is for d3, which draws the gantt's grid lines in currentColor: inlined,
# they inherit the page's ink, but a file on its own has nothing to inherit.
style = ('<style id="dg-theme">svg{%s;color:var(--dg-ink)}'
         '@media (prefers-color-scheme: dark){svg{%s}}</style>'
         % (block(LIGHT), block(DARK)))
# The root element: the first <svg outside a comment.
done = False
for i, part in enumerate(parts):
    if done or part.startswith('<!--'):
        continue
    parts[i], n = re.subn(r'(<svg\b[^>]*>)', lambda m: m.group(1) + style, part, count=1)
    done = bool(n)
if not done:
    sys.exit('theme-svg.py: no <svg> element in %s' % path)
svg = ''.join(parts)

open(path, 'w').write(svg)
