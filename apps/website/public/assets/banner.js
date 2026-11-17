const banner = document.querySelector('.rotating-hero');
if (banner) {
  const slides = [...banner.querySelectorAll('.hero-slide')];
  const dots = [...banner.querySelectorAll('[data-slide]')];
  const pause = banner.querySelector('.hero-pause');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;
  let paused = motion.matches;
  let focused = false;
  let timer;
  banner.querySelector('.hero-controls').hidden = false;

  function schedule() {
    clearTimeout(timer);
    if (!paused && !focused && !document.hidden) {
      timer = setTimeout(() => show(active + 1), 5000);
    }
  }
  function show(index) {
    active = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== active; });
    dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === active)));
    schedule();
  }
  function updatePause() {
    pause.textContent = paused ? 'Play' : 'Pause';
    pause.setAttribute('aria-label', paused ? 'Start banner rotation' : 'Pause banner rotation');
    schedule();
  }
  dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));
  banner.querySelectorAll('[data-direction]').forEach(button => {
    button.addEventListener('click', () => show(active + Number(button.dataset.direction)));
  });
  pause.addEventListener('click', () => { paused = !paused; updatePause(); });
  banner.addEventListener('focusin', () => { focused = true; schedule(); });
  banner.addEventListener('focusout', event => {
    focused = banner.contains(event.relatedTarget);
    schedule();
  });
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', () => { paused = motion.matches; updatePause(); });
  updatePause();
}
