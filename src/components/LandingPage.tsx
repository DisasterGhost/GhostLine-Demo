import React from 'react';
import './LandingPage.css';

interface LandingPageProps {
  onLaunchDemo: () => void;
}

const pipelineRows = [
  {
    index: '01',
    title: 'Capture',
    text: 'GhostLine taps model internals during inference and records residual, attention, and MLP-derived signals as generation unfolds.',
  },
  {
    index: '02',
    title: 'Project',
    text: 'Those high-dimensional traces are mapped into a stable geometric space that makes state transitions visible instead of latent.',
  },
  {
    index: '03',
    title: 'Classify',
    text: 'The resulting geometry is scored for behavioral state, pathology risk, and transition structure in real time.',
  },
  {
    index: '04',
    title: 'Intervene',
    text: 'When failure signatures emerge, GhostLine can trigger calibrated geometric interventions rather than merely logging the collapse.',
  },
];

const evidenceRows = [
  { value: '95.3%', label: '7-state classification accuracy' },
  { value: 'F1=0.977', label: 'Binary hallucination detection' },
  { value: '927', label: 'Validated signals with d >= 2.0' },
  { value: '100%', label: 'Collapse detection on the validated 3B set' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchDemo }) => {
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
          <div className="landing-hero__main">
            <p className="landing-kicker">Real-time geometric monitoring for transformer inference</p>
            <h1 className="landing-title">GhostLine</h1>
            <p className="landing-dek">
              A working prototype for observing, classifying, and steering model behavior while the
              model is still generating.
            </p>
            <p className="landing-summary">
              GhostLine is not a post hoc dashboard. It is a runtime instrumentation layer that reads
              geometric structure from live inference, exposes behavioral state changes, flags
              fabrication risk, and supports causal intervention against certain failure modes.
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

          <aside className="landing-hero__aside">
            <div className="landing-note">
              <p className="landing-note__label">Public surface</p>
              <p>
                This site is a replay-based demo built on recorded <code>.ghostline</code> sessions
                captured from real model runs.
              </p>
            </div>
            <div className="landing-note">
              <p className="landing-note__label">Private stack</p>
              <p>
                The live-generation research workbench remains private while validation and launch
                hardening continue.
              </p>
            </div>
            <div className="landing-note">
              <p className="landing-note__label">Current claim scope</p>
              <p>
                Strongest support currently centers on state separation, hallucination detection, and
                3B collapse intervention.
              </p>
            </div>
          </aside>
        </section>

        <section className="landing-section landing-section--split">
          <div className="landing-section__heading">
            <p className="landing-section__label">System</p>
            <h2>What GhostLine actually does</h2>
          </div>

          <div className="landing-columns">
            <div className="landing-copy">
              <p>
                GhostLine turns transformer activations into a live geometric signal stream. Instead
                of waiting until generation is over, it extracts features as tokens are produced and
                uses that structure to infer what behavioral regime the model is occupying.
              </p>
              <p>
                The result is a runtime interface for model cognition: one that makes uncertainty,
                retrieval, reasoning, collapse, and fabrication-related drift observable in motion.
              </p>
            </div>

            <div className="landing-facts">
              <div className="landing-fact">
                <span className="landing-fact__label">Method</span>
                <span className="landing-fact__value">Runtime mechanistic interpretability</span>
              </div>
              <div className="landing-fact">
                <span className="landing-fact__label">Mode</span>
                <span className="landing-fact__value">Inference-time monitoring</span>
              </div>
              <div className="landing-fact">
                <span className="landing-fact__label">Output</span>
                <span className="landing-fact__value">State, risk, and transition geometry</span>
              </div>
              <div className="landing-fact">
                <span className="landing-fact__label">Intervention</span>
                <span className="landing-fact__value">Geometry-triggered steering</span>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section__heading">
            <p className="landing-section__label">Pipeline</p>
            <h2>Core research pipeline</h2>
          </div>

          <div className="landing-pipeline">
            {pipelineRows.map((row) => (
              <article className="landing-pipeline__row" key={row.index}>
                <div className="landing-pipeline__index">{row.index}</div>
                <div className="landing-pipeline__body">
                  <h3>{row.title}</h3>
                  <p>{row.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section__heading">
            <p className="landing-section__label">Evidence</p>
            <h2>What is already supported</h2>
          </div>

          <div className="landing-evidence">
            {evidenceRows.map((row) => (
              <div className="landing-evidence__row" key={row.label}>
                <span className="landing-evidence__value">{row.value}</span>
                <span className="landing-evidence__text">{row.label}</span>
              </div>
            ))}
          </div>

          <p className="landing-footnote">
            Validation is framed conservatively: prompt-grouped evaluation, bounded launch claims,
            and a public demo that shows the replay surface honestly rather than pretending the entire
            private research stack is already public.
          </p>
        </section>

        <section className="landing-section landing-section--split">
          <div className="landing-section__heading">
            <p className="landing-section__label">Builder</p>
            <h2>GhostLine is an independent research system by Collin Civish.</h2>
          </div>

          <div className="landing-columns">
            <div className="landing-copy">
              <p>
                The project combines signal taxonomy work, classifier development, intervention
                research, visualization, and tooling into a single runtime interpretability system.
              </p>
              <p>
                It was built independently, with AI coding tools used as implementation leverage but
                not as the originating research insight.
              </p>
            </div>

            <div className="landing-quote">
              <p>
                GhostLine is what remained after repeatedly killing the wrong explanations and
                keeping only the geometric structure that continued to predict model behavior.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
