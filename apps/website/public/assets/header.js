(() => {
  const header = document.querySelector('.site-header');
  if (!header) return;
  let compact = false;
  function updateHeader() {
    const next = compact ? window.scrollY > 35 : window.scrollY > 130;
    if (next !== compact) {
      compact = next;
      header.classList.toggle('is-compact', compact);
    }
  }
  window.addEventListener('scroll', updateHeader, {passive: true});
  updateHeader();
})();
