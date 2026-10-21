(() => {
  const root = document.documentElement;
  const preference = window.matchMedia('(prefers-color-scheme: dark)');
  let savedTheme;
  try { savedTheme = localStorage.getItem('jsq-theme'); } catch (_) { /* Theme still works when storage is unavailable. */ }
  let explicit = savedTheme === 'light' || savedTheme === 'dark';
  root.dataset.theme = explicit ? savedTheme : (preference.matches ? 'dark' : 'light');

  document.addEventListener('DOMContentLoaded', () => {
    const button = document.querySelector('.theme-toggle');
    if (!button) return;
    const updateLabel = () => button.setAttribute('aria-label', `Switch to ${root.dataset.theme === 'dark' ? 'light' : 'dark'} theme`);
    button.style.display = 'inline-flex';
    updateLabel();
    button.addEventListener('click', () => {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      explicit = true;
      try { localStorage.setItem('jsq-theme', root.dataset.theme); } catch (_) { /* Keep the selection for this page. */ }
      updateLabel();
    });
    preference.addEventListener('change', event => {
      if (!explicit) {
        root.dataset.theme = event.matches ? 'dark' : 'light';
        updateLabel();
      }
    });
  });
})();
