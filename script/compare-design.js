// Compare the generated site against the hand-built design-system reference.
//
// Renders both at 1280px and 400px, light and dark, writes a full-page
// screenshot of each, and reports the measurements ISS-46 asks about:
// sideways scrolling, the prose measure, and where the blocks sit.
//
// See script/README.md for how to serve the two sites and run this.

const { chromium } = require('playwright-core');
const fs = require('fs');

const OUT = process.env.OUT || './.screenshots';
const REF = process.env.REF_BASE || 'http://127.0.0.1:8801';
const GEN = process.env.GEN_BASE || 'http://127.0.0.1:8802';
const CHROME = process.env.CHROME;

const targets = [
  { name: 'ref-diagram', url: `${REF}/diagram-post.html` },
  { name: 'gen-diagram', url: `${GEN}/post/lineage-in-the-sql/` },
  { name: 'ref-docs', url: `${REF}/docs.html` },
  { name: 'gen-docs', url: `${GEN}/docs/crosswalk/` },
  { name: 'ref-archive', url: `${REF}/archive.html` },
  { name: 'gen-archive', url: `${GEN}/archive/` },
  // Different posts: the reference's body is placeholder text. The title,
  // byline and notice are what should line up.
  { name: 'ref-archived', url: `${REF}/archived-post.html` },
  { name: 'gen-archived', url: `${GEN}/post/2013-11-24-barque-smokehouse-shows-estimation-is-hard/` },
];

(async () => {
  if (!CHROME) {
    console.error('Set CHROME to a Chromium binary. See script/README.md.');
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const results = [];
  for (const t of targets) {
    for (const width of [1280, 400]) {
      for (const colorScheme of ['light', 'dark']) {
        const ctx = await browser.newContext({
          viewport: { width, height: 900 },
          colorScheme,
          deviceScaleFactor: 1,
        });
        const page = await ctx.newPage();
        let error = null;
        try {
          await page.goto(t.url, { waitUntil: 'load', timeout: 30000 });
          await page.waitForTimeout(400);
        } catch (e) {
          error = String(e).split('\n')[0];
        }

        const m = error ? {} : await page.evaluate(() => {
          const box = (sel) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { left: Math.round(r.left), width: Math.round(r.width) };
          };
          return {
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            bodyBg: getComputedStyle(document.body).backgroundColor,
            prose: box('.prose p'),
            proseFont: document.querySelector('.prose p')
              ? getComputedStyle(document.querySelector('.prose p')).fontSize : null,
            code: box('.code'),
            figure: box('figure.diagram'),
            photo: box('figure.figure img'),
            notice: box('.notice'),
            archiveList: box('.archive-list'),
            tableWrap: box('.table-wrap'),
            toc: box('details.toc'),
            copyButtons: document.querySelectorAll('.code__head .copy').length,
          };
        });

        const file = `${OUT}/${t.name}-${width}-${colorScheme}.png`;
        if (!error) await page.screenshot({ path: file, fullPage: true });
        results.push({
          target: t.name,
          width,
          colorScheme,
          error,
          sideways: m.scrollWidth > m.innerWidth,
          ...m,
        });
        await ctx.close();
      }
    }
  }

  await browser.close();

  const bad = results.filter((r) => r.error || r.sideways);
  console.log(JSON.stringify(results, null, 1));
  console.log('\nframes:', results.length, '| errors or sideways scroll:', bad.length);
  console.log('screenshots in', OUT);
  if (bad.length) process.exitCode = 1;
})();
