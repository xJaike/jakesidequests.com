(() => {
  const root = document.documentElement;
  const preference = window.matchMedia('(prefers-color-scheme: dark)');
  let savedTheme;
  try { savedTheme = localStorage.getItem('jsq-theme'); } catch (_) { /* Theme still works when storage is unavailable. */ }
  let explicit = savedTheme === 'light' || savedTheme === 'dark';
  const applyTheme = theme => {
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#1b1e19' : '#f7f6f0');
    document.querySelector('.theme-toggle')?.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  };
  applyTheme(explicit ? savedTheme : (preference.matches ? 'dark' : 'light'));

  document.addEventListener('DOMContentLoaded', () => {
    const updateNavigation = () => {
      const currentSection = location.pathname === '/' ? location.hash : '#work';
      document.querySelectorAll('.site-nav a').forEach(link => {
        if (new URL(link.href).hash === currentSection && currentSection) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      document.querySelectorAll('.policy-nav a').forEach(link => {
        if (link.hash === location.hash) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    };
    updateNavigation();
    window.addEventListener('hashchange', updateNavigation);

    const button = document.querySelector('.theme-toggle');
    if (!button) return;
    button.style.display = 'inline-flex';
    applyTheme(root.dataset.theme);
    button.addEventListener('click', () => {
      applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
      explicit = true;
      try { localStorage.setItem('jsq-theme', root.dataset.theme); } catch (_) { /* Keep the selection for this page. */ }
    });
    preference.addEventListener('change', event => {
      if (!explicit) {
        applyTheme(event.matches ? 'dark' : 'light');
      }
    });
    window.addEventListener('storage', event => {
      if (event.key !== 'jsq-theme' && event.key !== null) return;
      explicit = event.newValue === 'light' || event.newValue === 'dark';
      applyTheme(explicit ? event.newValue : (preference.matches ? 'dark' : 'light'));
    });
  });
})();
