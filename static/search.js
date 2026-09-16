// Search-A over a hand-written index of the reference pages. The real site
// replaces INDEX with a post-build indexer such as Pagefind (ISS-43); the
// rendering below is what it should keep.

const INDEX = [
  { section: 'Writing', url: 'essay.html', title: 'The power of plain text',
    text: 'Plain text separates content from presentation, which is why several tools, several people and now a model can work on the same file and see what changed.' },
  { section: 'Writing', url: 'essay.html', title: 'Diagrams as code',
    text: 'A diagram rendered from a text model can be reviewed, versioned and regenerated. Tools like Graphviz and PlantUML render a diagram from a text model that can be reviewed.' },
  { section: 'Writing', url: 'diagram-post.html', title: 'Your database already knows its diagram',
    text: 'The foreign keys are sitting in the catalogue, and a graph is just a list of edges. It prints DOT, the text format Graphviz reads, and does nothing else.' },
  { section: 'Writing', url: 'essay.html', title: 'Embedding generated diagrams into documents and pipelines', text: '' },
  { section: 'Writing', url: 'essay.html', title: 'Multiple views over a single model',
    text: 'One model, rendered as several views. Graphviz is the lowest-level option.' },
  { section: 'Writing', url: 'essay.html', title: 'Ilograph, LikeC4, and PlantUML plus an LLM', text: '' },
  { section: 'Writing', url: 'essay.html', title: 'Lineage, dependency and ER graphs from a real system', text: '' },
  { section: 'Writing', url: 'essay.html', title: 'Textual DSLs that render to useful output', text: '' },
  { section: 'Writing', url: 'essay.html', title: 'Beancount in practice', text: '' },
  { section: 'Writing', url: 'essay.html', title: 'Writing external DSLs to model a domain', text: '' },
  { section: 'Writing', url: 'essay.html', title: 'Project tracking as markdown in the repository', text: '' },
  { section: 'Writing', url: 'essay.html', title: 'Spec-driven development in markdown',
    text: 'The spec is the reviewed, durable text, and the requirements live next to the code.' },
  { section: 'Writing', url: 'essay.html', title: 'Choosing a match threshold is a decision about who gets counted',
    text: 'Every entity resolution system has a number in it that decides which records refer to the same thing. Above the number, two rows are one business. Below it, they are two businesses.' },
  { section: 'Archive', url: 'archived-post.html', title: 'Five Cool Things About the BioLite CampStove', text: '' },
  { section: 'Archive', url: 'archived-post.html', title: 'Requirements: Dysfunction Non-function Junction',
    text: 'The requirements nobody writes down until the system falls over.' },
  { section: 'Archive', url: 'archived-post.html', title: 'Non-functional Requirements are Underappreciated',
    text: 'Requirements that describe how a system behaves rather than what it does.' },
  { section: 'Archive', url: 'archived-post.html', title: 'Rail Link Beats Toronto Island Airport Expansion', text: '' },
  { section: 'Archive', url: 'archived-post.html', title: 'Barque Smokehouse Shows Estimation is Hard', text: '' },
  { section: 'Archive', url: 'archived-post.html', title: 'Setting Up Defensio Anti-spam in Wordpress', text: '' },
  { section: 'Archive', url: 'archived-post.html', title: 'Pinterest for Business and All in One SEO Pack', text: '' },
  { section: 'Archive', url: 'archived-post.html', title: 'Setting up All In One SEO Pack', text: '' },
  { section: 'Archive', url: 'archived-post.html', title: 'Lots of Ben Halls on the Internet', text: '' },
  { section: 'Archive', url: 'archived-post.html', title: 'First Post', text: '' },
];

const CONTEXT = 90;

const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

// About CONTEXT characters either side of the first hit, cut at word edges,
// with the hit in <mark>. Built from text nodes, so nothing is parsed as HTML.
function excerpt(text, needle) {
  const at = text.toLowerCase().indexOf(needle);
  if (at < 0) return el('p', { textContent: text });

  let start = Math.max(0, at - CONTEXT);
  const space = text.indexOf(' ', start);
  if (start > 0 && space !== -1 && space < at) start = space + 1;

  const hitEnd = at + needle.length;
  let end = Math.min(text.length, hitEnd + CONTEXT);
  const lastSpace = text.lastIndexOf(' ', end);
  if (end < text.length && lastSpace > hitEnd) end = lastSpace;

  return el('p', {},
    (start > 0 ? '…' : '') + text.slice(start, at),
    el('mark', { textContent: text.slice(at, hitEnd) }),
    text.slice(hitEnd, end) + (end < text.length ? '…' : ''));
}

function render(out, query) {
  out.replaceChildren();
  const q = query.trim();
  if (!q) return;
  const needle = q.toLowerCase();

  const hits = INDEX.filter((entry) =>
    entry.title.toLowerCase().includes(needle) || entry.text.toLowerCase().includes(needle));

  if (!hits.length) {
    out.append(el('div', { className: 'no-results' },
      el('p', {},
        `No results for “${q}”. Try a shorter search, or browse `,
        el('a', { href: 'index.html', textContent: 'Writing' }),
        ' or the ',
        el('a', { href: 'archive.html', textContent: 'Archive' }),
        '.')));
    return;
  }

  out.append(
    el('p', { className: 'section-label results-count', textContent: `${hits.length} ${hits.length === 1 ? 'result' : 'results'}` }),
    el('ul', { className: 'results' }, ...hits.map((entry) => el('li', {},
      el('div', { className: 'entry-meta' },
        el('span', { className: `chip chip--${entry.section.toLowerCase()}`, textContent: entry.section }),
        el('h2', {}, el('a', { href: entry.url, textContent: entry.title }))),
      entry.text ? excerpt(entry.text, needle) : '')))
  );
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('search-input');
  const out = document.getElementById('search-results');
  if (!input || !out) return;

  input.value = new URLSearchParams(location.search).get('q') || '';
  render(out, input.value);

  input.closest('form').addEventListener('submit', (event) => event.preventDefault());
  input.addEventListener('input', () => {
    const q = input.value.trim();
    history.replaceState(null, '', q ? `?q=${encodeURIComponent(q)}` : location.pathname);
    render(out, input.value);
  });
});
