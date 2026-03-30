import React, { useEffect, useState, useRef } from 'react';
import './LandingPage.css';

interface LandingPageProps {
  onLaunchDemo: () => void;
}

const proofMetrics = [
  { value: '94.8%', label: 'state classification accuracy' },
  { value: 'F1 0.94', label: 'fabrication detection' },
  { value: '4', label: 'architecture families validated' },
  { value: 'Patent Pending', label: '3 US provisionals filed' },
];

const systemExamples = [
  {
    id: 'spectrograph',
    label: 'Spectrograph',
    image: 'ghostline-spectrograph.png',
    alt: 'GhostLine spectrograph showing entropy, velocity, and confidence signals over token time.',
    caption: 'Entropy, velocity, confidence, and attention signals as time-series across the full generation.',
  },
  {
    id: 'signals',
    label: 'Signals',
    image: 'ghostline-signal-explorer.png',
    alt: 'GhostLine signal explorer showing 58 signals organized by category.',
    caption: '58 signals across attention, residual stream, MLP, logit lens, and temporal dynamics.',
  },
  {
    id: 'token-health',
    label: 'Token Health',
    image: 'ghostline-token-health.png',
    alt: 'GhostLine token health panel showing state probabilities, hallucination risk, and metrics.',
    caption: 'Per-token state classification, hallucination risk, and crystallization status.',
  },
];

const validationExamples = [
  {
    id: 'hypothesis',
    label: 'Hypothesis testing',
    image: 'ghostline-hypothesis-test.png',
    alt: 'GhostLine hypothesis panel with rule builder, accuracy metrics, and confusion matrix.',
    caption: 'Define signal rules, test against trajectory data, see accuracy and confusion matrix.',
  },
  {
    id: 'comparison',
    label: 'Run comparison',
    image: 'ghostline-run-comparison.png',
    alt: 'GhostLine comparison tool showing A vs B run with signal deltas.',
    caption: 'Compare recordings side-by-side with per-metric delta percentages.',
  },
  {
    id: 'sweep',
    label: 'Parameter sweep',
    image: 'ghostline-sweep-config.png',
    alt: 'GhostLine sweep configuration for temperature and sampling parameter exploration.',
    caption: 'Sweep generation parameters and track signal behavior at each step.',
  },
];

const applications = [
  {
    title: 'Compliance & Audit',
    text: 'EU AI Act Articles 9 and 12 require behavioral monitoring and logging for high-risk AI systems. GhostLine provides per-token behavioral state classification and audit trails — continuous monitoring that regulators can inspect directly.',
  },
  {
    title: 'Inference Optimization',
    text: 'Pre-generation prediction identifies prompts likely to hallucinate before any tokens are generated. Route, re-prompt, or gate chain-of-thought in ~15ms — before wasting compute on bad output.',
  },
  {
    title: 'Defense & Security',
    text: 'Geometric behavioral monitoring is independent of output content. An adversary can craft text that passes content filters but cannot easily control the geometry of the model\'s computation. Prompt injection screening at the activation level.',
  },
  {
    title: 'Model Development',
    text: 'Geometric profiling of training checkpoints reveals whether fine-tuning actually improves behavioral separation. Prompt corpus certification establishes geometrically bounded quality rules per model.',
  },
];

const navItems = [
  { id: 'overview', label: 'Overview' },
  { id: 'instrument', label: 'Instrument' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'applications', label: 'Applications' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'about', label: 'About' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchDemo }) => {
  const basePath = import.meta.env.BASE_URL || '/';
  const [systemExampleIndex, setSystemExampleIndex] = useState(0);
  const [validationExampleIndex, setValidationExampleIndex] = useState(0);
  const [navVisible, setNavVisible] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSystemExampleIndex((i) => (i + 1) % systemExamples.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setValidationExampleIndex((i) => (i + 1) % validationExamples.length);
    }, 8200);
    return () => window.clearInterval(id);
  }, []);

  // ESC closes lightbox
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxSrc(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Sticky nav appears after scrolling past hero
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setNavVisible(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-80px 0px 0px 0px' }
    );
    if (heroRef.current) observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  // Track active section for nav highlighting
  useEffect(() => {
    const sections = navItems.map((item) => document.getElementById(item.id));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.target.id) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { threshold: 0.3, rootMargin: '-100px 0px -50% 0px' }
    );
    sections.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const activeSystemExample = systemExamples[systemExampleIndex];
  const activeValidationExample = validationExamples[validationExampleIndex];

  return (
    <div className="landing-page">
      {/* Sticky nav */}
      <nav className={`landing-sticky-nav${navVisible ? ' is-visible' : ''}`}>
        <div className="landing-sticky-nav__inner">
          <span className="landing-sticky-nav__brand">GHOSTLINE</span>
          <div className="landing-sticky-nav__links">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`landing-sticky-nav__link${activeSection === item.id ? ' is-active' : ''}`}
              >
                {item.label}
              </a>
            ))}
          </div>
          <button className="landing-button landing-button--primary landing-button--sm" onClick={onLaunchDemo}>
            Open Demo
          </button>
        </div>
      </nav>

      <div className="landing-shell">
        {/* Masthead */}
        <header className="landing-masthead">
          <div className="landing-masthead__brand">
            <span>GhostLine Research</span>
            <span>Independent AI instrumentation</span>
          </div>
          <div className="landing-masthead__links">
            <a href="mailto:collin@ghostline-research.org">collin@ghostline-research.org</a>
            <a href="https://github.com/DisasterGhost/GhostLine-Demo" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <a href="https://x.com/DisasterGh0st" target="_blank" rel="noopener noreferrer">
              X
            </a>
          </div>
        </header>

        {/* Hero */}
        <section id="overview" className="landing-hero" ref={heroRef}>
          <div className="landing-hero__copy">
            <h1 className="landing-backronym">
              <span className="landing-bl">G</span>eometric{' '}
              <span className="landing-bl">H</span>ierarchies{' '}
              <span className="landing-bl">O</span>rganizing{' '}
              <span className="landing-bl">S</span>tate{' '}
              <span className="landing-bl">T</span>ransitions:<br />
              <span className="landing-bl">L</span>inearity{' '}
              <span className="landing-bl">I</span>nformed{' '}
              <span className="landing-bl">N</span>eural{' '}
              <span className="landing-bl">E</span>ncoding
            </h1>
            <p className="landing-title-sub">GHOSTLINE</p>
            <p className="landing-statement">
              Real-time behavioral monitoring for transformer inference.
            </p>

            <div className="landing-hero__row">
              <div className="landing-actions">
                <button className="landing-button landing-button--primary" onClick={onLaunchDemo}>
                  Open Demo
                </button>
                <a className="landing-button" href="mailto:collin@ghostline-research.org">
                  Contact
                </a>
              </div>

              <div className="landing-proof-strip">
                {proofMetrics.map((metric) => (
                  <div className="landing-proof-strip__item" key={metric.label}>
                    <span className="landing-proof-strip__value">{metric.value}</span>
                    <span className="landing-proof-strip__label">{metric.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <figure className="landing-hero-card" onClick={() => setLightboxSrc(`${basePath}media/ghostline-full-surface.png`)}>
            <img
              src={`${basePath}media/ghostline-full-surface.png`}
              alt="GhostLine full instrument surface showing 3D trajectory, spectrograph, generated text, and signal panels."
            />
          </figure>
        </section>

        {/* Instrument */}
        <section id="instrument" className="landing-section">
          <div className="landing-section__heading">
            <div>
              <p className="landing-section__label">The instrument</p>
              <h2>See what the model is doing while it's still doing it</h2>
            </div>
          </div>

          <div className="landing-example-card">
            <div className="landing-example-card__tabs" role="tablist">
              {systemExamples.map((example, index) => (
                <button
                  key={example.id}
                  className={`landing-example-tab${index === systemExampleIndex ? ' is-active' : ''}`}
                  onClick={() => setSystemExampleIndex(index)}
                  type="button"
                >
                  {example.label}
                </button>
              ))}
            </div>
            <div className="landing-example-card__frame">
              <figure
                className="landing-figure-card landing-figure-card--gallery landing-figure-card--clickable"
                onClick={() => setLightboxSrc(`${basePath}media/${activeSystemExample.image}`)}
              >
                <img
                  src={`${basePath}media/${activeSystemExample.image}`}
                  alt={activeSystemExample.alt}
                />
                <figcaption>{activeSystemExample.caption} <span className="landing-expand-hint">Click to expand</span></figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* Evidence */}
        <section id="evidence" className="landing-section">
          <div className="landing-section__heading">
            <div>
              <p className="landing-section__label">What holds up</p>
              <h2>Validated results, honest boundaries</h2>
            </div>
          </div>

          <div className="landing-example-card">
            <div className="landing-example-card__tabs" role="tablist">
              {validationExamples.map((example, index) => (
                <button
                  key={example.id}
                  className={`landing-example-tab${index === validationExampleIndex ? ' is-active' : ''}`}
                  onClick={() => setValidationExampleIndex(index)}
                  type="button"
                >
                  {example.label}
                </button>
              ))}
            </div>
            <div className="landing-example-card__frame">
              <figure
                className="landing-figure-card landing-figure-card--gallery landing-figure-card--clickable"
                onClick={() => setLightboxSrc(`${basePath}media/${activeValidationExample.image}`)}
              >
                <img
                  src={`${basePath}media/${activeValidationExample.image}`}
                  alt={activeValidationExample.alt}
                />
                <figcaption>{activeValidationExample.caption} <span className="landing-expand-hint">Click to expand</span></figcaption>
              </figure>
            </div>
          </div>

          <div className="landing-evidence-honest">
            <div className="landing-evidence-col landing-evidence-col--sharp">
              <h3>Sharp</h3>
              <ul>
                <li>State separation across 4 architecture families</li>
                <li>Fabrication detection (F1 0.94, held-out stress test)</li>
                <li>Replayable signal inspection (58 signals, per-token)</li>
                <li>Causal geometric intervention at 3B</li>
              </ul>
            </div>
            <div className="landing-evidence-col landing-evidence-col--maturing">
              <h3>Maturing</h3>
              <ul>
                <li>70B+ scale validation</li>
                <li>Full parameter space coverage (temp, top-p)</li>
                <li>Adversarial and multi-turn corpus</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Applications */}
        <section id="applications" className="landing-section">
          <div className="landing-section__heading">
            <div>
              <p className="landing-section__label">Applications</p>
              <h2>Where this goes</h2>
            </div>
          </div>

          <div className="landing-applications-grid">
            {applications.map((app) => (
              <article className="landing-application-card" key={app.title}>
                <h3>{app.title}</h3>
                <p>{app.text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Architecture */}
        <section id="architecture" className="landing-section">
          <div className="landing-section__heading">
            <div>
              <p className="landing-section__label">Under the hood</p>
              <h2>How it's wired together</h2>
            </div>
          </div>

          <div className="landing-architecture-layout">
            <div className="landing-architecture-embed">
              <iframe
                src={`${basePath}lineage/live_app_briefing/what_the_app_is.html`}
                title="GhostLine architecture overview"
                className="landing-lineage-frame"
              />
            </div>
            <div className="landing-architecture-copy">
              <div className="landing-validation-card">
                <p className="landing-card__label">Interactive architecture</p>
                <p>Drag, zoom, and hover to explore how the instrument is structured.</p>
              </div>
              <div className="landing-architecture-links">
                <a className="landing-button" href={`${basePath}lineage/live_app_briefing/index.html`} target="_blank" rel="noopener noreferrer">
                  Briefing pack
                </a>
                <a className="landing-button" href={`${basePath}lineage/live_app/index.html`} target="_blank" rel="noopener noreferrer">
                  Technical atlas
                </a>
                <a className="landing-button" href={`${basePath}lineage/index.html`} target="_blank" rel="noopener noreferrer">
                  Full lineage hub
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section id="about" className="landing-section">
          <div className="landing-section__heading landing-section__heading--about">
            <div>
              <p className="landing-section__label">Behind the project</p>
              <h2>Collin Civish</h2>
            </div>
            <span className="landing-stage-badge">Research prototype</span>
          </div>

          <div className="landing-about-layout">
            <div className="landing-about-statement">
              <p>
                Solo inventor. No formal ML background. Built a real-time geometric monitoring
                system for transformer inference, validated it across 4 architecture families
                at 2 parameter scales, and filed 3 US provisional patents — in 48 days.
              </p>
              <p>
                Seeking resources to take it from prototype to production.
              </p>
              <div className="landing-actions">
                <button className="landing-button landing-button--primary" onClick={onLaunchDemo}>
                  Open Demo
                </button>
                <a className="landing-button" href="mailto:collin@ghostline-research.org">
                  Contact
                </a>
              </div>
            </div>

            <div className="landing-ip-card">
              <p className="landing-card__label">Intellectual property</p>
              <table className="landing-ip-table">
                <tbody>
                  <tr><td>P1 — Instrument</td><td>US 63/948,867</td><td>Dec 2025</td></tr>
                  <tr><td>P2 — Intelligence</td><td>US 63/975,787</td><td>Feb 2026</td></tr>
                  <tr><td>P3 — Interface</td><td>US 63/982,900</td><td>Feb 2026</td></tr>
                </tbody>
              </table>
              <p className="landing-ip-detail">P3: 27 claims, 22 figures, 90-page spec.</p>

              <p className="landing-card__label" style={{marginTop: '20px'}}>At a glance</p>
              <div className="landing-stats-grid">
                <div><span className="landing-stat-value">6</span><span className="landing-stat-label">models</span></div>
                <div><span className="landing-stat-value">4</span><span className="landing-stat-label">architectures</span></div>
                <div><span className="landing-stat-value">2</span><span className="landing-stat-label">scales</span></div>
                <div><span className="landing-stat-value">48</span><span className="landing-stat-label">days to 3 filings</span></div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div className="landing-lightbox" onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="Expanded view" />
          <span className="landing-lightbox__close">ESC or click to close</span>
        </div>
      )}
    </div>
  );
};
