// Theme toggle, copy buttons on code blocks, and the "/" search shortcut.
// Loaded in <head> without defer so the stored theme applies before first paint.
(() => {
  const root = document.documentElement;
  const KEY = 'theme';
  const osDark = matchMedia('(prefers-color-scheme: dark)');
  root.classList.add('js');

  const read = () => {
    try { return localStorage.getItem(KEY); } catch { return null; }
  };
  const write = (value) => {
    try {
      if (value) localStorage.setItem(KEY, value);
      else localStorage.removeItem(KEY);
    } catch { /* storage blocked: the choice lasts for this page only */ }
  };

  const osTheme = () => (osDark.matches ? 'dark' : 'light');
  const current = () => root.dataset.theme || osTheme();

  const apply = (theme) => {
    if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
    else delete root.dataset.theme;
    for (const button of document.querySelectorAll('.theme-toggle')) {
      button.setAttribute('aria-pressed', String(current() === 'dark'));
    }
  };

  apply(read());

  // One button. It flips whatever is showing; choosing the OS's own theme
  // clears the stored choice, so the page goes back to following the OS.
  const toggle = () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    const choice = next === osTheme() ? null : next;
    write(choice);
    apply(choice);
  };

  // Console blocks copy their commands without the prompt or the output.
  // Other blocks copy the code without callout pills or the padding before them.
  const codeText = (block) => {
    const code = block.querySelector('pre code');
    if (block.classList.contains('console')) {
      return [...code.querySelectorAll('.in')]
        .map((line) => line.textContent.replace(/^\$\s?/, ''))
        .join('\n');
    }
    const clone = code.cloneNode(true);
    for (const pill of clone.querySelectorAll('.pill')) pill.remove();
    return clone.textContent.replace(/[ \t]+$/gm, '');
  };

  const addCopyButtons = () => {
    if (!navigator.clipboard) return;
    const status = Object.assign(document.createElement('p'), { className: 'visually-hidden' });
    status.setAttribute('role', 'status');
    document.body.append(status);

    for (const block of document.querySelectorAll('.code')) {
      const head = block.querySelector('.code__head');
      if (!head) continue;
      const button = Object.assign(document.createElement('button'), {
        type: 'button', className: 'copy', textContent: 'Copy',
      });
      button.addEventListener('click', async () => {
        let message;
        try {
          await navigator.clipboard.writeText(codeText(block));
          message = 'Copied';
        } catch {
          message = 'Copy failed';
        }
        button.textContent = status.textContent = message;
        setTimeout(() => { button.textContent = 'Copy'; status.textContent = ''; }, 2000);
      });
      head.append(button);
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    apply(read());
    osDark.addEventListener('change', () => apply(read()));
    addCopyButtons();

    document.addEventListener('click', (event) => {
      if (event.target.closest('.theme-toggle')) toggle();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target.closest('input, textarea, select, [contenteditable]')) return;
      const input = document.getElementById('search-input')
        || document.querySelector('.header-search input');
      if (!input || !input.offsetParent) return;
      event.preventDefault();
      input.focus();
    });
  });
})();
