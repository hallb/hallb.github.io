"""Find colours in an inlined figure that will not follow the page theme.

Usage:
    python3 script/audit-figure-colours.py public/post/lineage-in-the-sql/index.html

A swapped colour looks like  var(--dg-ink, #1A1A1A)  -- the hex inside the
var() fallback is expected. Anything else is baked in and will stay put when
the theme changes.

Worth knowing, because it cost three rounds to find: the placeholder swap only
matches hex. A named colour like `white` or `navy`, an rgb() a renderer derived
for itself, or a colour set in an embedded <style> rather than a fill attribute
will all pass straight through. On the light theme they are usually invisible,
so light screenshots look perfect while dark ones are wrong.
"""
import re
import sys

path = sys.argv[1] if len(sys.argv) > 1 else 'public/index.html'
html = open(path).read()

figs = re.findall(r'<figure class="diagram">.*?</figure>', html, re.S)
print("figures:", len(figs))

problems = 0
for i, fig in enumerate(figs, 1):
    cap = re.search(r'<figcaption>(.*?)</figcaption>', fig, re.S)
    cap = re.sub(r'<[^>]+>', '', cap.group(1)).strip() if cap else '(no caption)'

    # Drop the legitimate var() fallbacks so only stray literals remain.
    rest = re.sub(r'var\(--dg-[a-z]+,\s*#[0-9A-Fa-f]{3,8}\)', 'VAR', fig)

    hexes = re.findall(r'#[0-9A-Fa-f]{3,8}\b', rest)
    rgbs = re.findall(r'rgb\([^)]*\)', rest)
    named = re.findall(
        r'(?:fill|stroke|background(?:-color)?)\s*[:=]\s*"?'
        r'(white|black|navy|silver|gr[ae]y|lightgr[ae]y|red|blue|green)\b',
        rest, re.I)

    n = len(hexes) + len(rgbs) + len(named)
    problems += n
    print()
    print("=== Fig %d: %s" % (i, cap[:70]))
    print("    var() swaps :", rest.count('VAR'))
    print("    stray hex   :", len(hexes), sorted(set(h.lower() for h in hexes))[:10])
    print("    stray rgb() :", len(rgbs), sorted(set(rgbs))[:6])
    print("    named       :", len(named), sorted(set(x.lower() for x in named))[:6])

print()
print("total colours that will not follow the theme:", problems)
sys.exit(1 if problems else 0)
