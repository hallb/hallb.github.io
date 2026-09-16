// Crop each figure on a page, light and dark, so a diagram's theming can be
// judged on its own rather than from a full-page thumbnail.
//
// This exists because a full-page screenshot is too small to tell a diagram
// that failed to follow the theme from a admonition that inverts on purpose.
// Three separate dark-theme bugs were found this way.
//
// Also reports what the browser resolved --dg-card and --dg-ink to, and the
// background of the svg element itself, which is where Mermaid hides a white
// backdrop that no hex swap can see.

const { chromium } = require('playwright-core');
const fs = require('fs');

const OUT = process.env.OUT || './.screenshots';
const URL = process.env.PAGE
  || `${process.env.GEN_BASE || 'http://127.0.0.1:8802'}/post/lineage-in-the-sql/`;
const CHROME = process.env.CHROME;

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

  for (const colorScheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(400);

    const figs = await page.$$('figure.diagram');
    console.log('===', colorScheme, '| figures:', figs.length);

    for (let i = 0; i < figs.length; i++) {
      await figs[i].screenshot({ path: `${OUT}/fig${i + 1}-${colorScheme}.png` });
      const info = await figs[i].evaluate((el) => {
        const probe = document.createElement('div');
        el.appendChild(probe);
        probe.style.color = 'var(--dg-card)';
        const card = getComputedStyle(probe).color;
        probe.style.color = 'var(--dg-ink)';
        const ink = getComputedStyle(probe).color;
        probe.remove();
        const svg = el.querySelector('svg');
        return {
          frameBg: getComputedStyle(el.querySelector('.diagram__frame')).backgroundColor,
          svgBg: svg ? getComputedStyle(svg).backgroundColor : null,
          dgCard: card,
          dgInk: ink,
        };
      });
      console.log(` fig${i + 1}`, JSON.stringify(info));
    }
    await ctx.close();
  }

  await browser.close();
  console.log('\ncrops in', OUT);
})();
