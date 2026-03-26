import React, { useEffect, useState } from 'react';
import { RECORDING_CATALOG } from '../recordings/catalog';
import './LandingPage.css';

interface LandingPageProps {
  onLaunchDemo: () => void;
}

const credibilityItems = [
  {
    label: 'Instrument',
    title: 'A runtime surface for model behavior',
    text: 'GhostLine watches behavior take shape while the model is still generating, instead of waiting for a post hoc trace.',
  },
  {
    label: 'Audience',
    title: 'Built for people who need to see the shift as it happens',
    text: 'The immediate audience is labs, model providers, safety teams, and evaluators working close to live inference.',
  },
  {
    label: 'Surface',
    title: 'A replay environment built from real runs',
    text: 'The first public surface is grounded in recorded model sessions, so visitors are seeing the real viewer language rather than a simulated product shell.',
  },
  {
    label: 'Purpose',
    title: 'Made to expose state change, risk, and drift in motion',
    text: 'GhostLine is meant for moments where static evals are too late and the important change is happening while generation is underway.',
  },
];

const workflowSteps = [
  {
    label: 'See',
    text: 'Follow token-by-token geometry, entropy, confidence, and state motion while the model is still speaking.',
  },
  {
    label: 'Read',
    text: 'Interpret behavioral state, fabrication risk, and regime change directly from the live trajectory.',
  },
  {
    label: 'Revisit',
    text: 'Replay sessions, scrub tokens, inspect signals, and compare runs inside the same visual surface.',
  },
  {
    label: 'Test',
    text: 'Use geometry-triggered intervention paths to ask whether the state space is merely descriptive or genuinely causal.',
  },
];

const proofMetrics = [
  { value: '95.3%', label: 'state readout accuracy' },
  { value: 'F1 0.977', label: 'fabrication detection' },
  { value: '927', label: 'strong discriminative signals' },
  { value: '100%', label: 'validated 3B collapse detection' },
];

const systemExamples = [
  {
    id: 'surface',
    label: 'Viewer',
    title: 'The replay surface',
    image: 'ghostline-product-surface.png',
    alt: 'GhostLine product surface showing 3D trajectory replay, signal panels, and token inspection.',
    caption:
      'Recorded trajectory replay, token-level inspection, state overlays, and the same visual grammar used throughout GhostLine.',
  },
  {
    id: 'workbench',
    label: 'Workbench',
    title: 'The research workbench',
    image: 'ghostline-workbench.png',
    alt: 'GhostLine research workbench showing internal analysis and run configuration tools.',
    caption:
      'The research surface extends into comparisons, sweeps, hypothesis tests, and capture design without leaving the instrument.',
  },
];

const validationExamples = [
  {
    id: 'structure',
    label: 'Layer evidence',
    title: 'Structure forming through the stack',
    image: 'ghostline-proof-chart.png',
    alt: 'GhostLine proof chart showing evidence of structure formation across transformer layers.',
    caption:
      'One GhostLine evidence artifact: structure intensifies through the mid-stack before compressing toward output.',
  },
  {
    id: 'recordings',
    label: 'Demo path',
    title: 'What the visitor can open first',
    image: 'ghostline-product-surface.png',
    alt: 'GhostLine product surface showing 3D trajectory replay, signal panels, and token inspection.',
    caption:
      'The public path starts with recorded runs, then moves into tokens, state shifts, and signal motion inside the viewer itself.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchDemo }) => {
  const basePath = import.meta.env.BASE_URL || '/';
  const featuredRecordings = RECORDING_CATALOG.slice(0, 4);
  const [systemExampleIndex, setSystemExampleIndex] = useState(0);
  const [validationExampleIndex, setValidationExampleIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSystemExampleIndex((index) => (index + 1) % systemExamples.length);
    }, 7000);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setValidationExampleIndex((index) => (index + 1) % validationExamples.length);
    }, 8200);

    return () => window.clearInterval(id);
  }, []);

  const activeSystemExample = systemExamples[systemExampleIndex];
  const activeValidationExample = validationExamples[validationExampleIndex];

  return (
    <div className="landing-page">
      <div className="landing-shell">
        <header className="landing-masthead">
          <div className="landing-masthead__brand">
            <span>GhostLine Research</span>
            <span>Independent AI instrumentation</span>
          </div>

          <div className="landing-masthead__links">
            <a href="mailto:collin@ghostline-research.org">collin@ghostline-research.org</a>
            <a href="https://github.com/disasterghost/GhostLine" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </div>
        </header>

        <section className="landing-hero">
          <div className="landing-hero__copy">
            <p className="landing-kicker">Inference-time instrumentation for transformer behavior</p>
            <h1 className="landing-title">GhostLine</h1>
            <p className="landing-statement">
              Watch model behavior form, crystallize, drift, and fail while it is still unfolding.
            </p>
            <p className="landing-summary">
              GhostLine is a working prototype for seeing inference from the inside. It brings replay,
              geometric monitoring, signal inspection, behavioral state readout, and research tooling
              into one continuous instrument surface.
            </p>

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

          <div className="landing-hero__visual">
            <figure className="landing-hero-card">
              <img
                src={`${basePath}media/ghostline-product-surface.png`}
                alt="GhostLine product surface showing 3D trajectory replay, signal panels, and token inspection."
              />
              <figcaption>
                The public GhostLine surface: recorded trajectory replay, token-level inspection,
                state overlays, and the same visual grammar used by the private live instrument.
              </figcaption>
            </figure>

            <div className="landing-hero-aside">
              <div className="landing-aside-card">
                <span className="landing-card__label">What GhostLine is</span>
                <p>Runtime interpretability and observability for transformer inference.</p>
              </div>
              <div className="landing-aside-card">
                <span className="landing-card__label">What you can explore here</span>
                <p>
                  A replay environment built on recorded <code>.ghostline</code> sessions, designed to let visitors inspect the surface as a working instrument rather than a trailer.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-credibility">
          {credibilityItems.map((item) => (
            <article className="landing-credibility-card" key={item.label}>
              <p className="landing-card__label">{item.label}</p>
              <h2>{item.title}</h2>
              <p>{item.text}</p>
            </article>
          ))}
        </section>

        <section className="landing-section landing-section--system">
          <div className="landing-section__heading">
            <p className="landing-section__label">Inside the instrument</p>
            <h2>One surface for watching, reading, revisiting, and testing inference</h2>
          </div>

          <div className="landing-system-layout">
            <div className="landing-system-steps">
              {workflowSteps.map((step, index) => (
                <article className="landing-system-step" key={step.label}>
                  <span className="landing-system-step__index">0{index + 1}</span>
                  <div className="landing-system-step__body">
                    <h3>{step.label}</h3>
                    <p>{step.text}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="landing-example-card landing-example-card--system">
              <div className="landing-example-card__tabs" role="tablist" aria-label="GhostLine system views">
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
                <figure className="landing-figure-card landing-figure-card--workbench landing-figure-card--active">
                  <img
                    src={`${basePath}media/${activeSystemExample.image}`}
                    alt={activeSystemExample.alt}
                  />
                  <figcaption>
                    <strong>{activeSystemExample.title}</strong>
                    <span>{activeSystemExample.caption}</span>
                  </figcaption>
                </figure>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-section--validation">
          <div className="landing-section__heading">
            <p className="landing-section__label">What holds up</p>
            <h2>Strong evidence where GhostLine is already sharp, clear boundaries where it is still maturing</h2>
          </div>

          <div className="landing-validation-layout">
            <div className="landing-example-card landing-example-card--validation">
              <div className="landing-example-card__tabs" role="tablist" aria-label="GhostLine evidence views">
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
                <figure className="landing-figure-card landing-figure-card--chart landing-figure-card--active">
                  <img
                    src={`${basePath}media/${activeValidationExample.image}`}
                    alt={activeValidationExample.alt}
                  />
                  <figcaption>
                    <strong>{activeValidationExample.title}</strong>
                    <span>{activeValidationExample.caption}</span>
                  </figcaption>
                </figure>
              </div>
            </div>

            <div className="landing-validation-copy">
              <div className="landing-validation-card">
                <p className="landing-card__label">Where the footing is strongest</p>
                <p>
                  State separation, fabrication detection, replayable signal inspection, and
                  3B collapse intervention are the strongest supported parts of GhostLine today.
                </p>
              </div>

              <div className="landing-validation-card">
                <p className="landing-card__label">What this release lets people witness</p>
                <p>
                  This site shows the actual viewing surface, replay loop, and explanatory layer on
                  real captured sessions rather than mock data or static renders.
                </p>
              </div>

              <div className="landing-validation-card">
                <p className="landing-card__label">Why the first release is replay-first</p>
                <p>
                  Replay keeps the public surface stable while the live stack is hardened,
                  validated, and prepared for a wider opening.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-section--founder">
          <div className="landing-founder-layout">
            <article className="landing-founder-card">
              <p className="landing-card__label">Behind the project</p>
              <h2>Collin Civish</h2>
              <p className="landing-founder-card__role">Founder, research lead, and product builder</p>
              <p>
                GhostLine is currently an independent research and tooling effort spanning runtime
                instrumentation, signal taxonomy, replay systems, classifier validation, intervention
                design, and the interface that makes the whole thing legible.
              </p>
            </article>

            <article className="landing-recordings-card">
              <p className="landing-card__label">Where to begin inside the demo</p>
              <div className="landing-recordings-list">
                {featuredRecordings.map((recording) => (
                  <div className="landing-recording-item" key={recording.id}>
                    <span className="landing-recording-item__title">{recording.title}</span>
                    <span className="landing-recording-item__desc">{recording.description}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="landing-closing">
          <div className="landing-closing__copy">
            <p className="landing-section__label">Step inside</p>
            <h2>Enter the replay surface</h2>
            <p>
              Begin with curated recordings captured from real model runs, then move through tokens,
              state shifts, and signal motion inside the GhostLine viewer itself.
            </p>
          </div>

          <div className="landing-closing__actions">
            <button className="landing-button landing-button--primary" onClick={onLaunchDemo}>
              Open Demo
            </button>
            <a className="landing-button" href="mailto:collin@ghostline-research.org">
              Contact
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};
