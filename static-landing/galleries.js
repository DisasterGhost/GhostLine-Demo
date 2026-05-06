/* ──────────────────────────────────────────────────────────
   Galleries (Instrument / Evidence) — tabbed product
   screenshots with auto-rotation and click-to-expand
   lightbox. Mirrors the live-site behavior.
   ────────────────────────────────────────────────────────── */
(function () {
  const galleries = {
    instrument: {
      interval: 12000,
      slides: [
        { src: 'media/ghostline-spectrograph.png', alt: 'GhostLine spectrograph', caption: 'Entropy, velocity, confidence, and attention signals as time-series across the full generation.' },
        { src: 'media/ghostline-token-health.png', alt: 'GhostLine token health', caption: 'Per-token state classification, hallucination risk, and crystallization status.' },
      ],
    },
    evidence: {
      interval: 13500,
      slides: [
        { src: 'media/ghostline-hypothesis-test.png', alt: 'GhostLine hypothesis panel', caption: 'Define signal rules, test against trajectory data, see accuracy and confusion matrix.' },
        { src: 'media/ghostline-run-comparison.png',  alt: 'GhostLine comparison tool',  caption: 'Compare recordings side-by-side with per-metric delta percentages.' },
        { src: 'media/ghostline-sweep-config.png',    alt: 'GhostLine sweep config',     caption: 'Sweep generation parameters and track signal behavior at each step.' },
      ],
    },
  };

  const lightbox    = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');

  function openLightbox(src, alt) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
    lightbox.classList.add('is-open');
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
  }
  if (lightbox) lightbox.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

  document.querySelectorAll('.industry-figure img').forEach((img) => {
    img.addEventListener('click', () => openLightbox(img.src, img.alt));
  });

  document.querySelectorAll('.gallery[data-gallery]').forEach((root) => {
    const key = root.dataset.gallery;
    const cfg = galleries[key];
    if (!cfg) return;

    const tabs    = root.querySelectorAll('.gallery__tab');
    const img     = root.querySelector('[data-img]');
    const caption = root.querySelector('[data-caption]');
    const frame   = root.querySelector('[data-frame]');
    let idx       = 0;
    let userPaused = false;

    function render(next) {
      idx = ((next % cfg.slides.length) + cfg.slides.length) % cfg.slides.length;
      const slide = cfg.slides[idx];
      if (img)     { img.src = slide.src; img.alt = slide.alt; }
      if (caption) caption.textContent = slide.caption;
      tabs.forEach((t, i) => {
        const active = i === idx;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        userPaused = true;
        render(parseInt(tab.dataset.idx, 10) || 0);
      });
    });

    if (frame) {
      frame.addEventListener('click', () => {
        const slide = cfg.slides[idx];
        openLightbox(slide.src, slide.alt);
      });
    }

    setInterval(() => {
      if (userPaused) return;
      render(idx + 1);
    }, cfg.interval);
  });
})();
