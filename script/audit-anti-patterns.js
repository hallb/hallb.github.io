#!/usr/bin/env node
// Does the built site pass ISS-44's anti-patterns checklist?
//
// The checklist is the table at the end of
// `benhall.ca-planning/docs/02-solution/visual-reference-brief.md`, which
// ISS-44 wrote so ISS-42 could be failed against it. There it is scored
// against Ruled Iris, the design on paper, where seven rows read "Not
// designed yet" and one reads "Fail". This scores the same rows against the
// generated site, at 1280px and 400px, light and dark.
//
// Fifteen rows, and thirteen of them are measurable from the rendered page.
// The two that are not say so and name what a human has to look at.
//
//     $ export CHROME=~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome
//     $ node script/audit-anti-patterns.js
//
// Exits non-zero if any measurable row fails.

const { chromium } = require('playwright-core');

const GEN = process.env.GEN_BASE || 'http://127.0.0.1:8802';

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

const MEASURE = () => {
  const out = {};
  const cs = (el) => getComputedStyle(el);
  const name = (el) => {
    const c = typeof el.className === 'string' && el.className.trim()
      ? '.' + el.className.trim().split(/\s+/)[0] : '';
    return el.tagName.toLowerCase() + c;
  };

  const lum = (v) => {
    const m = String(v).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b] = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };

  // 1. Gradients, including gradient text.
  out.gradients = [];
  for (const el of document.querySelectorAll('*')) {
    const s = cs(el);
    if (s.backgroundImage && s.backgroundImage !== 'none' && /gradient/.test(s.backgroundImage)) {
      out.gradients.push({ el: name(el), value: s.backgroundImage.slice(0, 60) });
    }
    if (/text/.test(s.webkitBackgroundClip || '') || /text/.test(s.backgroundClip || '')) {
      out.gradients.push({ el: name(el), value: 'background-clip: text' });
    }
  }

  // 2. Glassmorphism, frosted panels, drop shadows. The focus ring is drawn
  //    with an outline, not a shadow, so nothing here is a false positive.
  out.shadows = [];
  for (const el of document.querySelectorAll('*')) {
    const s = cs(el);
    if (s.boxShadow && s.boxShadow !== 'none') out.shadows.push({ el: name(el), value: s.boxShadow.slice(0, 50) });
    if (s.backdropFilter && s.backdropFilter !== 'none') out.shadows.push({ el: name(el), value: `backdrop-filter: ${s.backdropFilter}` });
    if (s.textShadow && s.textShadow !== 'none') out.shadows.push({ el: name(el), value: `text-shadow: ${s.textShadow}` });
    if (s.filter && s.filter !== 'none' && /blur|drop-shadow/.test(s.filter)) {
      out.shadows.push({ el: name(el), value: `filter: ${s.filter}` });
    }
  }

  // 3. Radii above 3px. The callout pill is the stated exception.
  out.radii = [];
  for (const el of document.querySelectorAll('*')) {
    if (el.closest('.pill')) continue;
    if (el.closest('svg')) continue; // diagram internals are the diagram's own shapes
    const s = cs(el);
    for (const corner of ['borderTopLeftRadius', 'borderTopRightRadius',
      'borderBottomLeftRadius', 'borderBottomRightRadius']) {
      const v = parseFloat(s[corner]);
      if (v > 3) out.radii.push({ el: name(el), corner, value: s[corner] });
    }
  }

  // 4. Emoji in headings, and as section markers generally.
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F000}-\u{1F0FF}]/u;
  out.emoji = [];
  for (const h of document.querySelectorAll('h1, h2, h3, h4, h5, h6, nav, .chip, .label')) {
    if (EMOJI.test(h.textContent)) out.emoji.push({ el: name(h), text: h.textContent.trim().slice(0, 40) });
  }

  // 6. The typeface is chosen, and it actually loaded. Measured on whatever
  //    the page's running text is: home has no paragraph at all, only the
  //    thesis and the post list.
  const bodyEl = document.querySelector('.prose > p') || document.querySelector('.lead')
    || document.querySelector('.thesis') || document.querySelector('main a');
  out.type = bodyEl ? {
    on: name(bodyEl),
    family: cs(bodyEl).fontFamily,
    loaded: document.fonts.check(`${cs(bodyEl).fontSize} "Atkinson Hyperlegible"`),
  } : null;

  // 7. Animation on scroll.
  out.animation = [];
  for (const el of document.querySelectorAll('*')) {
    const s = cs(el);
    if (s.animationName && s.animationName !== 'none') {
      out.animation.push({ el: name(el), value: `animation: ${s.animationName}` });
    }
    if (s.scrollBehavior === 'smooth' && el === document.documentElement) {
      out.animation.push({ el: 'html', value: 'scroll-behavior: smooth' });
    }
  }
  out.intersectionObserver = typeof window.__ioUsed === 'boolean' ? window.__ioUsed : null;

  // 8. Ads, sponsor badges, banners, flags.
  out.promo = [];
  const PROMO = /\b(sponsor|advert|\bads?\b|patreon|donate|banner|promo|newsletter|subscribe)\b/i;
  for (const el of document.querySelectorAll('[class], [id]')) {
    const tag = `${el.className} ${el.id}`;
    if (PROMO.test(tag)) out.promo.push({ el: name(el), tag: tag.trim().slice(0, 40) });
  }
  out.iframes = document.querySelectorAll('iframe').length;
  out.thirdParty = [...document.querySelectorAll('script[src], link[rel=stylesheet]')]
    .map((n) => n.src || n.href)
    .filter((u) => u && !u.startsWith(location.origin));

  // 9. Navigation bars doing the same job.
  out.navs = [...document.querySelectorAll('nav')].map((n) => ({
    el: name(n),
    label: n.getAttribute('aria-label') || '',
    links: n.querySelectorAll('a').length,
  }));

  // 10. Body text size, and 11. tree navigation in a left sidebar.
  //     "Body text" is running prose. The byline, figure captions, the
  //     language tag and table cells are deliberately smaller and are not
  //     what the row is about; the source for it is PlantUML setting its
  //     whole page at 14px.
  const proseP = document.querySelector('.prose > p');
  out.bodySize = proseP ? parseFloat(cs(proseP).fontSize) : null;
  const admP = document.querySelector('.admonition p');
  out.admSize = admP ? parseFloat(cs(admP).fontSize) : null;
  out.treeNav = [...document.querySelectorAll('nav')].filter((n) => {
    const nested = n.querySelectorAll('li li').length > 0;
    const r = n.getBoundingClientRect();
    return nested && r.left < innerWidth / 3 && r.height > innerHeight / 3;
  }).map(name);

  // 12. Dark code blocks on a light page.
  out.codeBlocks = [...document.querySelectorAll('.code, pre')].slice(0, 4).map((el) => {
    let bg = null;
    for (let n = el; n; n = n.parentElement) {
      const c = cs(n).backgroundColor;
      if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) { bg = c; break; }
    }
    return { el: name(el), bg, lum: bg ? Math.round(lum(bg) * 1000) / 1000 : null };
  });
  out.pageLum = Math.round(lum(cs(document.body).backgroundColor) * 1000) / 1000;

  // 13. Characters per line. Counted on rendered line boxes, by walking a
  //     Range through each paragraph's text and cutting where the client
  //     rect's top changes, so it counts what the reader's eye crosses
  //     rather than what the CSS asked for.
  //
  //     Running prose and admonition bodies are counted apart, because they
  //     are set at different sizes in different column widths and they do
  //     not land in the same place. Counting them together hides that.
  const countLines = (selector) => {
    const lines = [];
    for (const p of document.querySelectorAll(selector)) {
      const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      let node, current = null, top = null;
      const range = document.createRange();
      while ((node = walker.nextNode())) {
        const text = node.textContent;
        for (let i = 0; i < text.length; i++) {
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          const rect = range.getBoundingClientRect();
          if (rect.height === 0) continue;
          if (top === null || Math.abs(rect.top - top) > 2) {
            if (current !== null) lines.push(current);
            current = 0;
            top = rect.top;
          }
          current++;
        }
      }
      if (current !== null) lines.push(current);
    }
    // The last line of a paragraph is short because the paragraph ended, not
    // because the column is narrow, so it says nothing about the measure.
    const full = lines.filter((n) => n > 20);
    if (!full.length) return null;
    return {
      lines: full.length,
      min: Math.min(...full),
      max: Math.max(...full),
      mean: Math.round((full.reduce((a, b) => a + b, 0) / full.length) * 10) / 10,
      over75: full.filter((n) => n > 75).length,
    };
  };
  out.measure = countLines('.prose > p, .lead');
  out.admMeasure = countLines('.admonition p');

  // 14. Diagram legibility on a phone.
  out.diagrams = [...document.querySelectorAll('figure svg, figure img')].map((el) => {
    const r = el.getBoundingClientRect();
    let smallest = null;
    if (el.tagName.toLowerCase() === 'svg') {
      for (const t of el.querySelectorAll('text')) {
        // The rendered size, after any scaling the figure applies.
        const size = t.getBoundingClientRect().height;
        if (size > 0 && (smallest === null || size < smallest)) smallest = size;
      }
    }
    const scroller = el.closest('.diagram, figure');
    return {
      el: name(el),
      width: Math.round(r.width),
      smallestLabelPx: smallest === null ? null : Math.round(smallest * 10) / 10,
      scrolls: scroller ? scroller.scrollWidth > scroller.clientWidth + 1 : false,
    };
  });

  out.sideways = document.documentElement.scrollWidth > innerWidth + 1;
  return out;
};

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME,
    args: ['--force-color-profile=srgb', '--font-render-hinting=none'],
  });

  const rows = [];
  const push = (row, where, verdict, detail) => rows.push({ row, where, verdict, detail });

  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: theme, deviceScaleFactor: 1,
      });
      const page = await ctx.newPage();
      // Note whether anything ever builds an IntersectionObserver, which is
      // how scroll animation is usually wired.
      await page.addInitScript(() => {
        window.__ioUsed = false;
        const Real = window.IntersectionObserver;
        window.IntersectionObserver = function (...args) {
          window.__ioUsed = true;
          return new Real(...args);
        };
      });

      for (const target of PAGES) {
        const where = `${target.name} ${vp.label} ${theme}`;
        await page.goto(target.url, { waitUntil: 'load', timeout: 30000 });
        if (target.name === 'search') await page.waitForTimeout(1200);
        await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(150);
        await page.evaluate(() => scrollTo(0, 0));

        const m = await page.evaluate(MEASURE);

        push('gradients', where, m.gradients.length === 0 ? 'pass' : 'FAIL',
          m.gradients.slice(0, 3).map((g) => `${g.el} ${g.value}`).join('; '));
        push('shadows/glass', where, m.shadows.length === 0 ? 'pass' : 'FAIL',
          m.shadows.slice(0, 3).map((s) => `${s.el} ${s.value}`).join('; '));
        push('radius>3px', where, m.radii.length === 0 ? 'pass' : 'FAIL',
          m.radii.slice(0, 3).map((r) => `${r.el} ${r.value}`).join('; '));
        push('emoji', where, m.emoji.length === 0 ? 'pass' : 'FAIL',
          m.emoji.slice(0, 3).map((e) => `${e.el} ${e.text}`).join('; '));
        push('chosen typeface', where,
          m.type && /Atkinson/.test(m.type.family) && m.type.loaded ? 'pass' : 'FAIL',
          m.type ? `${m.type.on} ${m.type.family.split(',')[0]} loaded=${m.type.loaded}` : 'no text element');
        push('scroll animation', where,
          m.animation.length === 0 && m.intersectionObserver !== true ? 'pass' : 'FAIL',
          `${m.animation.map((a) => a.value).join('; ')}${m.intersectionObserver ? ' IntersectionObserver used' : ''}`);
        push('ads/badges/banners', where,
          m.promo.length === 0 && m.iframes === 0 ? 'pass' : 'FAIL',
          `promo=${m.promo.length} iframes=${m.iframes} third-party=${m.thirdParty.length}` +
          (m.thirdParty.length ? ` (${m.thirdParty.map((u) => new URL(u).host).join(', ')})` : ''));
        push('duplicate nav', where, m.navs.length <= 2 ? 'pass' : 'FAIL',
          m.navs.map((n) => `${n.el}[${n.label}]:${n.links}`).join(' '));
        // Home has no running prose, only the thesis and the post list, so
        // the row does not apply there.
        if (m.bodySize !== null) {
          push('body <16px', where, m.bodySize >= 16 ? 'pass' : 'FAIL',
            `prose ${m.bodySize}px${m.admSize ? `, admonition ${m.admSize}px` : ''}`);
        }
        push('tree nav sidebar', where, m.treeNav.length === 0 ? 'pass' : 'FAIL', m.treeNav.join(', '));

        const darkCode = theme === 'light' &&
          m.codeBlocks.some((c) => c.lum !== null && c.lum < m.pageLum - 0.05);
        push('dark code on light page', where, darkCode ? 'FAIL' : 'pass',
          m.codeBlocks.length ? `page=${m.pageLum} code=${m.codeBlocks.map((c) => c.lum).join(',')}` : 'no code blocks');

        const fmtMeasure = (x) =>
          `${x.lines} full lines, ${x.min}-${x.max}, mean ${x.mean}, ${x.over75} over 75`;
        if (m.measure) {
          push('prose >75 chars', where, m.measure.over75 === 0 ? 'pass' : 'FAIL',
            fmtMeasure(m.measure));
        }
        if (m.admMeasure) {
          push('admonition >75 chars', where, m.admMeasure.over75 === 0 ? 'pass' : 'FAIL',
            fmtMeasure(m.admMeasure));
        }

        if (m.diagrams.length) {
          const tooSmall = m.diagrams.filter((d) => d.smallestLabelPx !== null && d.smallestLabelPx < 8);
          push('diagram legibility', where, tooSmall.length === 0 ? 'pass' : 'FAIL',
            m.diagrams.map((d) => `${d.width}px label>=${d.smallestLabelPx ?? 'n/a'}${d.scrolls ? ' scrolls' : ''}`).join('; '));
        }

        push('sideways scroll', where, m.sideways ? 'FAIL' : 'pass', '');
      }
      await ctx.close();
    }
  }

  await browser.close();

  // Collapse to one verdict per row, naming every frame that failed.
  const byRow = new Map();
  for (const r of rows) {
    if (!byRow.has(r.row)) byRow.set(r.row, { pass: 0, fails: [], examples: [] });
    const e = byRow.get(r.row);
    if (r.verdict === 'pass') { e.pass++; if (e.examples.length < 1 && r.detail) e.examples.push(`${r.where}: ${r.detail}`); }
    else e.fails.push(`${r.where}: ${r.detail}`);
  }

  console.log('# ISS-44 anti-patterns checklist, against the built site\n');
  let failed = 0;
  for (const [row, e] of byRow) {
    const verdict = e.fails.length ? `FAIL (${e.fails.length} frames)` : `pass (${e.pass} frames)`;
    if (e.fails.length) failed++;
    console.log(`${verdict.padEnd(22)} ${row}`);
    for (const f of e.fails.slice(0, 4)) console.log(`    ${f}`);
    if (e.fails.length > 4) console.log(`    ... and ${e.fails.length - 4} more`);
    if (!e.fails.length && e.examples.length) console.log(`    e.g. ${e.examples[0]}`);
  }

  console.log('\n# Rows this cannot measure, and what to look at');
  console.log('  hero/feature cards/CTA  - home and about: is the first screen a claim with');
  console.log('                            posts under it, or a pitch? Read the render.');
  console.log('  diagrams with literal colours on a dark page');
  console.log('                          - script/audit-figure-colours.py answers this one;');
  console.log('                            run it over every page with an inlined figure.');

  console.log(`\nrows measured: ${byRow.size} | rows failing: ${failed}`);
  process.exit(failed ? 1 : 0);
})();
