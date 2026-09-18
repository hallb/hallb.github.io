#!/usr/bin/env node
// Does every page meet its contrast, focus and keyboard promises?
//
// ISS-42's last acceptance criterion asks for contrast, focus visibility and
// keyboard navigation to be checked rather than assumed. This checks all
// three on the generated site, at 1280px and 400px, light and dark.
//
// Contrast is measured on *rendered* colour, not on the stylesheet hexes:
// every text-bearing element is read back through getComputedStyle and its
// background composited down the ancestor chain, so a token used somewhere
// its author did not expect still gets caught.
//
//     $ export CHROME=~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome
//     $ node script/audit-a11y.js
//
// Exits non-zero on any failure, so it can gate a build. GEN_BASE overrides
// the site URL. See README.md for serving the site.
//
// A clean run reports zeroes, which is indistinguishable from a check that is
// not looking at anything. `SELFTEST=1` injects known-bad CSS — grey-on-grey
// prose, no focus ring, a gradient behind the headings — so the run should
// fail loudly. If it does not, the audit is broken, not the site.

const { chromium } = require('playwright-core');

const GEN = process.env.GEN_BASE || 'http://127.0.0.1:8802';

// Breaks each thing this script claims to measure, so a clean run can be told
// apart from a run that measured nothing.
const SELFTEST_CSS = `
  .prose p, .lead { color: #BFC6CC !important; }
  :focus-visible, .search-field:focus-within { outline: none !important; }
  h2 { background-image: linear-gradient(90deg, #663399, #9966CC) !important; }
`;

// The five ISS-42 page types, plus the two the fixtures add.
const PAGES = [
  { name: 'home', url: `${GEN}/` },
  { name: 'post', url: `${GEN}/post/lineage-in-the-sql/` },
  { name: 'about', url: `${GEN}/page/about/` },
  { name: 'archive', url: `${GEN}/archive/` },
  { name: 'search', url: `${GEN}/search/?q=requirements` },
  { name: 'docs', url: `${GEN}/docs/crosswalk/` },
  { name: 'archived', url: `${GEN}/post/2013-11-24-barque-smokehouse-shows-estimation-is-hard/` },
];

const VIEWPORTS = [
  { label: '1280', width: 1280, height: 900 },
  { label: '400', width: 400, height: 860 },
];
const THEMES = ['light', 'dark'];

// ---------- run in the page ----------

// Everything below this line runs inside the browser.
const COLLECT = () => {
  const parse = (value) => {
    const m = String(value).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    const [r, g, b] = parts;
    const a = parts.length > 3 ? parts[3] : 1;
    return { r, g, b, a };
  };

  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });

  const lum = ({ r, g, b }) => {
    const f = (c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };

  const ratio = (a, b) => {
    const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  };

  const hex = ({ r, g, b }) =>
    '#' + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('').toUpperCase();

  // Composite the background down the ancestor chain. Returns null if a
  // gradient or image is in the way, because then no single colour is right.
  const backdrop = (el) => {
    const stack = [];
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) {
        stack.push(c);
        if (c.a === 1) break;
      }
    }
    let out = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = stack.length - 1; i >= 0; i--) out = over(stack[i], out);
    return out;
  };

  const label = (el) => {
    const id = el.id ? `#${el.id}` : '';
    const cls = el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
      : '';
    return `${el.tagName.toLowerCase()}${id}${cls}`;
  };

  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    if (parse(cs.opacity === '' ? '1' : `rgba(0,0,0,${cs.opacity})`)?.a === 0) return false;
    if (el.closest('.visually-hidden')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  // ---- contrast over every element that paints its own text ----
  const seen = new Map();
  for (const el of document.querySelectorAll('body *')) {
    const own = [...el.childNodes].some(
      (n) => n.nodeType === 3 && n.textContent.trim().length > 0,
    );
    if (!own || !visible(el)) continue;

    const cs = getComputedStyle(el);
    const fg = parse(cs.color);
    const bg = backdrop(el);
    if (!fg) continue;
    if (!bg) {
      seen.set(`gradient:${label(el)}`, { kind: 'gradient', el: label(el) });
      continue;
    }

    const size = parseFloat(cs.fontSize);
    const weight = Number(cs.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    const fgc = fg.a < 1 ? over(fg, bg) : fg;
    const r = ratio(fgc, bg);

    // One row per distinct colour pairing, not per element.
    const key = `${hex(fgc)}|${hex(bg)}|${large}`;
    if (!seen.has(key)) {
      seen.set(key, {
        kind: 'text',
        el: label(el),
        fg: hex(fgc),
        bg: hex(bg),
        size,
        weight,
        large,
        need,
        ratio: Math.round(r * 100) / 100,
        pass: r >= need,
        sample: el.textContent.trim().slice(0, 40),
      });
    }
  }

  // ---- the body-text pairing, which the brief holds to AAA ----
  const proseP = document.querySelector('.prose p, .lead, main p');
  let body = null;
  if (proseP) {
    const cs = getComputedStyle(proseP);
    const fg = parse(cs.color);
    const bg = backdrop(proseP);
    if (fg && bg) {
      body = {
        el: label(proseP),
        fg: hex(fg),
        bg: hex(bg),
        ratio: Math.round(ratio(fg, bg) * 100) / 100,
        size: parseFloat(cs.fontSize),
      };
    }
  }

  // ---- non-text contrast: the focus ring against what sits behind it ----
  const probe = document.createElement('span');
  document.body.append(probe);
  const ringColour = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent').trim();
  probe.style.color = ringColour;
  const ring = parse(getComputedStyle(probe).color);
  probe.remove();
  const pageBg = backdrop(document.body);
  const ringRatio = ring && pageBg ? Math.round(ratio(ring, pageBg) * 100) / 100 : null;

  return {
    pairs: [...seen.values()],
    body,
    ring: { colour: ring ? hex(ring) : null, on: pageBg ? hex(pageBg) : null, ratio: ringRatio },
  };
};

// ---- focus and keyboard, driven from outside the page ----

async function tabWalk(page, limit = 60) {
  await page.evaluate(() => {
    const el = document.querySelector('a, button, input') || document.body;
    el.blur();
    document.body.focus();
  });
  await page.keyboard.press('Home');

  const stops = [];
  const firstKey = null;
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const id = el.id ? `#${el.id}` : '';
      const cls = typeof el.className === 'string' && el.className.trim()
        ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
        : '';
      return {
        tag: `${el.tagName.toLowerCase()}${id}${cls}`,
        text: (el.textContent || el.value || '').trim().slice(0, 30),
        // A focus indicator is either an outline or a shadow on the element
        // itself, or an outline on an ancestor via :focus-within.
        outlineWidth: parseFloat(cs.outlineWidth) || 0,
        outlineStyle: cs.outlineStyle,
        outlineColor: cs.outlineColor,
        boxShadow: cs.boxShadow,
        ancestorRing: (() => {
          for (let n = el.parentElement; n; n = n.parentElement) {
            const a = getComputedStyle(n);
            if (a.outlineStyle !== 'none' && parseFloat(a.outlineWidth) > 0) {
              return `${n.tagName.toLowerCase()}.${String(n.className).split(/\s+/)[0]}`;
            }
          }
          return null;
        })(),
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        inViewport: r.top >= -1 && r.bottom <= innerHeight + 1 && r.width > 0 && r.height > 0,
        scrollY: Math.round(scrollY),
      };
    });
    if (!stop) break;
    // A cycle back to the first stop means the tab ring closed.
    if (stops.length && stop.tag === stops[0].tag && stop.text === stops[0].text) break;
    stops.push(stop);
  }
  return stops;
}

// ---------- drive it ----------

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME,
    args: ['--force-color-profile=srgb', '--font-render-hinting=none'],
  });

  const contrastFails = [];
  const gradients = [];
  const focusFails = [];
  const keyboardNotes = [];
  const bodyRatios = [];
  const ringRatios = [];
  let frames = 0;

  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: theme,
        deviceScaleFactor: 1,
      });
      const page = await ctx.newPage();

      for (const target of PAGES) {
        const where = `${target.name} ${vp.label} ${theme}`;
        await page.goto(target.url, { waitUntil: 'load', timeout: 30000 });
        // Search renders its results from Pagefind after load.
        if (target.name === 'search') await page.waitForTimeout(1200);
        if (process.env.SELFTEST) await page.addStyleTag({ content: SELFTEST_CSS });
        frames++;

        const got = await page.evaluate(COLLECT);
        for (const p of got.pairs) {
          if (p.kind === 'gradient') gradients.push({ where, el: p.el });
          else if (!p.pass) contrastFails.push({ where, ...p });
        }
        if (got.body) bodyRatios.push({ where, ...got.body });
        if (got.ring.ratio !== null) ringRatios.push({ where, ...got.ring });

        // Focus visibility on every tab stop.
        const stops = await tabWalk(page);
        for (const s of stops) {
          const ring =
            (s.outlineStyle !== 'none' && s.outlineWidth > 0) ||
            (s.boxShadow && s.boxShadow !== 'none') ||
            s.ancestorRing;
          if (!ring) focusFails.push({ where, stop: s.tag, text: s.text });
        }

        // Keyboard: the first stop should be the skip link, and it should
        // become visible when focused rather than staying off-screen.
        if (stops.length) {
          const first = stops[0];
          if (!/\.skip/.test(first.tag)) {
            keyboardNotes.push({ where, note: `first tab stop is ${first.tag}, not the skip link` });
          } else if (first.rect.y < 0) {
            keyboardNotes.push({ where, note: `skip link focused but still off-screen at y=${first.rect.y}` });
          }
        } else {
          keyboardNotes.push({ where, note: 'no tab stops at all' });
        }

        // Nothing should be reachable only by scrolling the page sideways,
        // and tabbing should not leave content behind.
        const sideways = await page.evaluate(() =>
          document.documentElement.scrollWidth > innerWidth + 1);
        if (sideways) keyboardNotes.push({ where, note: 'tabbing scrolled the page sideways' });

        // The theme toggle has to work from the keyboard.
        const toggled = await page.evaluate(async () => {
          const b = document.querySelector('.theme-toggle');
          if (!b) return 'no toggle';
          const before = document.documentElement.dataset.theme || '(os)';
          b.focus();
          return before;
        });
        if (toggled !== 'no toggle') {
          await page.keyboard.press('Enter');
          const after = await page.evaluate(() => document.documentElement.dataset.theme || '(os)');
          if (after === toggled) {
            keyboardNotes.push({ where, note: 'theme toggle did not respond to Enter' });
          }
          await page.keyboard.press('Enter'); // put it back
        }
      }
      await ctx.close();
    }
  }

  await browser.close();

  const show = (title, rows, fmt) => {
    console.log(`\n## ${title} (${rows.length})`);
    if (!rows.length) { console.log('  none'); return; }
    for (const r of rows.slice(0, 40)) console.log('  ' + fmt(r));
    if (rows.length > 40) console.log(`  ... and ${rows.length - 40} more`);
  };

  show('Contrast failures', contrastFails, (r) =>
    `${r.where}: ${r.fg} on ${r.bg} = ${r.ratio}:1 (needs ${r.need}) ` +
    `${r.size}px/${r.weight} ${r.el} "${r.sample}"`);
  show('Gradient or image backgrounds behind text', gradients, (r) => `${r.where}: ${r.el}`);
  show('Tab stops with no focus indicator', focusFails, (r) =>
    `${r.where}: ${r.stop} "${r.text}"`);
  show('Keyboard notes', keyboardNotes, (r) => `${r.where}: ${r.note}`);

  const worstBody = bodyRatios.reduce((a, b) => (a.ratio <= b.ratio ? a : b));
  const worstRing = ringRatios.reduce((a, b) => (a.ratio <= b.ratio ? a : b));
  console.log('\n## Body text, against the brief\'s AAA 7:1');
  console.log(`  worst: ${worstBody.where} ${worstBody.fg} on ${worstBody.bg} = ` +
    `${worstBody.ratio}:1 at ${worstBody.size}px (${worstBody.el})`);
  console.log('\n## Focus ring, against SC 1.4.11 non-text 3:1');
  console.log(`  worst: ${worstRing.where} ${worstRing.colour} on ${worstRing.on} = ${worstRing.ratio}:1`);

  const bodyFail = bodyRatios.filter((b) => b.ratio < 7);
  const ringFail = ringRatios.filter((r) => r.ratio < 3);
  const failed =
    contrastFails.length + gradients.length + focusFails.length +
    keyboardNotes.length + bodyFail.length + ringFail.length;

  console.log(`\nframes: ${frames} | failures: ${failed}`);
  process.exit(failed ? 1 : 0);
})();
