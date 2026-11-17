document.querySelectorAll('.service-browser').forEach(browser => {
  const cards = [...browser.querySelectorAll('.service-card')];
  const filters = [...browser.querySelectorAll('[data-filter]')];
  const more = browser.querySelector('.service-more button');
  const count = browser.querySelector('.service-count');
  let category = 'all';
  let expanded = false;
  browser.querySelector('.service-filters').hidden = false;
  count.hidden = false;

  function render() {
    const matches = cards.filter(card => category === 'all' || card.dataset.category === category);
    const visible = expanded ? matches : matches.slice(0, 6);
    cards.forEach(card => { card.hidden = !visible.includes(card); });
    filters.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.filter === category));
    });
    count.textContent = 'Showing ' + visible.length + ' of ' + matches.length + ' services';
    more.hidden = matches.length <= 6;
    more.textContent = expanded ? 'Show fewer services ↑' : 'Show all ' + matches.length + ' services ↓';
    more.setAttribute('aria-expanded', String(expanded));
  }

  filters.forEach(button => button.addEventListener('click', () => {
    category = button.dataset.filter;
    expanded = false;
    render();
  }));
  more.addEventListener('click', () => {
    const firstNewCard = cards.find(card => card.hidden && (category === 'all' || card.dataset.category === category));
    expanded = !expanded;
    render();
    if (expanded && firstNewCard) firstNewCard.focus({preventScroll: true});
    if (!expanded) browser.scrollIntoView({block: 'start'});
  });

  function revealAnchor() {
    const hash = location.hash.slice(1);
    const target = cards.find(card => card.id === hash);
    if (target) {
      category = target.dataset.category;
      expanded = true;
      render();
      target.scrollIntoView({block: 'center'});
    } else if (hash === 'insurance' || hash === 'maintenance') {
      category = hash;
      expanded = true;
      render();
      browser.scrollIntoView({block: 'start'});
    } else {
      render();
    }
  }
  window.addEventListener('hashchange', revealAnchor);
  revealAnchor();
});
