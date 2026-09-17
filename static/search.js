// Search-A over a Pagefind index of the built site (ISS-43). The rendering is
// the reference's from design-system/search.js; the index and the excerpt are
// what changed.
//
// Pagefind runs over public/ after hugo and writes public/pagefind/. It only
// indexes pages marked data-pagefind-body, which layouts/page.html puts on
// posts, along with their Writing or Archive label as the "section" meta.

const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

// Pagefind's excerpt is a string of HTML with <mark> around each hit. It is
// split on the marks and each piece decoded to plain text, so the page only
// receives text nodes and <mark> elements built here. A detached textarea
// parses its content as text, so entities decode and tags stay literal. (A
// DOMParser document would drop the space after a hit, which leads its piece.)
const scratch = document.createElement('textarea');
const decode = (html) => {
  scratch.innerHTML = html;
  return scratch.value;
};

function excerpt(html) {
  return el('p', {}, ...html.split(/<mark>|<\/mark>/).map((part, i) =>
    i % 2 ? el('mark', { textContent: decode(part) }) : decode(part)));
}

function browse(links, before, after) {
  return el('div', { className: 'no-results' },
    el('p', {},
      before,
      el('a', { href: links.writing, textContent: 'Writing' }),
      ' or the ',
      el('a', { href: links.archive, textContent: 'Archive' }),
      after));
}

// When a word matches nothing, Pagefind shortens it until something does, so
// "crosswalk" finds the "c" in "grep -c" and "xyzzy" finds a lone "x". A page
// is kept only if every word in the query shares at least four leading
// characters (or the whole word, if shorter) with some word on the page. That
// still lets stemming through: "estimate" and "estimation" share six.
const words = (text) => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];

function matchesEveryWord(query, content) {
  const onPage = words(content);
  return words(query).every((term) => {
    const need = Math.min(term.length, 4);
    return onPage.some((word) => word.slice(0, need) === term.slice(0, need));
  });
}

async function render(out, field, pagefind, links) {
  const q = field.value.trim();
  if (!q) {
    out.replaceChildren();
    return;
  }

  // Null means a later keystroke superseded this search; that one renders.
  const search = await pagefind.debouncedSearch(q);
  if (search === null) return;
  const hits = (await Promise.all(search.results.map((result) => result.data())))
    .filter((hit) => matchesEveryWord(q, `${hit.meta.title} ${hit.content}`));
  if (field.value.trim() !== q) return;

  if (!hits.length) {
    out.replaceChildren(browse(links, `No results for “${q}”. Try a shorter search, or browse `, '.'));
    return;
  }

  out.replaceChildren(
    el('p', { className: 'section-label results-count', textContent: `${hits.length} ${hits.length === 1 ? 'result' : 'results'}` }),
    el('ul', { className: 'results' }, ...hits.map((hit) => {
      const section = hit.meta.section || 'Writing';
      return el('li', {},
        el('div', { className: 'entry-meta' },
          el('span', { className: `chip chip--${section.toLowerCase()}`, textContent: section }),
          el('h2', {}, el('a', { href: hit.url, textContent: hit.meta.title }))),
        hit.excerpt ? excerpt(hit.excerpt) : '');
    })));
}

document.addEventListener('DOMContentLoaded', async () => {
  const field = document.getElementById('search-input');
  const out = document.getElementById('search-results');
  if (!field || !out) return;

  const links = { writing: out.dataset.writing, archive: out.dataset.archive };
  field.value = new URLSearchParams(location.search).get('q') || '';
  field.closest('form').addEventListener('submit', (event) => event.preventDefault());

  // The index exists only after Pagefind has run, so `hugo server` on its own
  // ends up here. Say so, rather than leave an empty box.
  let pagefind;
  try {
    pagefind = await import(out.dataset.pagefind);
    await pagefind.init();
  } catch {
    out.replaceChildren(browse(links, 'Search isn’t available right now. Browse ', ' instead.'));
    return;
  }

  render(out, field, pagefind, links);
  field.addEventListener('input', () => {
    const q = field.value.trim();
    history.replaceState(null, '', q ? `?q=${encodeURIComponent(q)}` : location.pathname);
    render(out, field, pagefind, links);
  });
});
