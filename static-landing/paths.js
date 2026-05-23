/* ──────────────────────────────────────────────────────────
   Path chooser → reveals corresponding content.
   The chooser hides; the sticky path-tab bar appears so the
   user can switch perspectives later. State is persisted
   in the URL hash so refresh / share keeps the chosen view.
   ────────────────────────────────────────────────────────── */
(function () {
  const chooser   = document.querySelector('.chooser');
  const pathTabs  = document.getElementById('pathTabs');
  const pathCards = document.querySelectorAll('.path-card');
  const tabs      = document.querySelectorAll('.path-tab');
  const sections  = document.querySelectorAll('.path-section');

  function activate(path, scrollTo = true) {
    if (!path) return;

    // Hide chooser, show tab bar
    if (chooser) chooser.style.display = 'none';
    if (pathTabs) pathTabs.classList.add('is-visible');

    // Activate matching content section
    sections.forEach(s => {
      s.classList.toggle('is-active', s.dataset.path === path);
    });

    // Activate matching tab styling
    tabs.forEach(t => {
      const isActive = t.dataset.path === path;
      t.classList.toggle('is-active', isActive);
      t.classList.toggle('is-research', isActive && path === 'research');
      t.classList.toggle('is-industry', isActive && path === 'industry');
    });

    // Update hash
    history.replaceState(null, '', '#path=' + path);

    if (scrollTo) {
      // Scroll to the start of the active section
      const target = document.getElementById('path-' + path);
      if (target) {
        const y = target.getBoundingClientRect().top + window.scrollY - 110;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  }

  function reset() {
    if (chooser) chooser.style.display = '';
    if (pathTabs) pathTabs.classList.remove('is-visible');
    sections.forEach(s => s.classList.remove('is-active'));
    tabs.forEach(t => t.classList.remove('is-active', 'is-research', 'is-industry'));
    history.replaceState(null, '', window.location.pathname);
  }

  pathCards.forEach(card => {
    card.addEventListener('click', () => activate(card.dataset.path));
  });
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // If clicking already-active tab, scroll to top of section
      const already = tab.classList.contains('is-active');
      activate(tab.dataset.path, !already);
    });
  });

  const usecaseCards = document.querySelectorAll('[data-usecase]');
  const usecaseBriefs = document.querySelectorAll('[data-usecase-brief]');
  const usecasePanel = document.querySelector('[data-usecase-panel]');

  function openUsecase(key, scrollPanel = false) {
    if (!key) return;

    usecaseCards.forEach(card => {
      const selected = card.dataset.usecase === key;
      card.classList.toggle('is-selected', selected);
      const button = card.querySelector('.app-card__open');
      if (button) {
        button.setAttribute('aria-expanded', selected ? 'true' : 'false');
        button.textContent = selected ? 'Context brief open' : 'Open context brief';
      }
    });

    usecaseBriefs.forEach(brief => {
      brief.classList.toggle('is-active', brief.dataset.usecaseBrief === key);
    });

    if (scrollPanel && usecasePanel && window.innerWidth < 900) {
      const y = usecasePanel.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  usecaseCards.forEach(card => {
    const button = card.querySelector('.app-card__open');
    if (button) button.setAttribute('aria-expanded', card.classList.contains('is-selected') ? 'true' : 'false');
    card.addEventListener('click', () => openUsecase(card.dataset.usecase, true));
  });
  openUsecase('compliance', false);

  // Restore from hash on load
  const m = window.location.hash.match(/path=(research|industry)/);
  if (m) activate(m[1], false);

  // Expose reset for the nav "Paths" link
  document.querySelectorAll('a[href="#paths"]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      reset();
      const c = document.querySelector('.chooser');
      if (c) {
        const y = c.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  });

  // ─── Active-section nav highlighting ───────────────────────
  // IntersectionObserver tracks which top-level anchor (Paths,
  // Architecture, About) is visible and applies `is-active` to the
  // matching nav link. rootMargin biases the trigger upward so the
  // active link flips when a section's top reaches roughly the
  // viewport's upper third — reads as "this is what you're looking
  // at" rather than "this just barely entered the viewport."
  const navLinks = document.querySelectorAll('.nav__links a[href^="#"]');
  if (navLinks.length && 'IntersectionObserver' in window) {
    const targetIds = Array.from(navLinks)
      .map(a => a.getAttribute('href').slice(1))
      .filter(Boolean);
    const targets = targetIds
      .map(id => document.getElementById(id))
      .filter(Boolean);

    const observer = new IntersectionObserver((entries) => {
      // Pick the top-most intersecting target. Falls back to the most
      // recently-passed section if nothing is intersecting (e.g. user
      // is between sections).
      const visible = entries.filter(e => e.isIntersecting);
      if (visible.length === 0) return;
      visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      const id = visible[0].target.id;
      navLinks.forEach(link => {
        link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
      });
    }, {
      rootMargin: '-20% 0px -65% 0px',
      threshold: 0,
    });

    targets.forEach(t => observer.observe(t));
  }
})();
