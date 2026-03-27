import React, { useState, useEffect } from 'react';
import { RECORDING_CATALOG } from '../recordings/catalog';
import './LandingPage.css';

interface LandingPageProps {
  onLaunchDemo: () => void;
}

const credibilityItems = [
  { label: 'The Instrument', title: 'See cognition in real-time', text: 'Stop relying on post-hoc traces. GhostLine watches transformer geometry take shape token-by-token while the model is actively thinking.' },
  { label: 'The Audience', title: 'Built for frontier labs', text: 'Designed specifically for AI safety teams, model providers, and evaluators who operate right at the bleeding edge of live inference.' },
  { label: 'The Surface', title: 'Real runs, real data', text: 'No mockups or simulated interfaces. Every session in this demo is built from genuine inference recordings. You are looking at the exact instrument our researchers use.' },
  { label: 'The Purpose', title: 'Catch failures in motion', text: 'Static evals are too slow. GhostLine catches high-risk state changes, fabrication, and regime drift the millisecond they cross the threshold.' },
];

const proofMetrics = [
  { value: '95.3%', label: 'state readout accuracy' },
  { value: 'F1 0.977', label: 'fabrication detection' },
  { value: '927', label: 'strong discriminative signals' },
  { value: '100%', label: 'validated 3B collapse detection' },
];

const workflowSteps = [
  {
    id: 'see',
    label: 'See',
    text: 'Track high-dimensional geometry, entropy, and confidence on a token-by-token basis as the model speaks.',
    tabs: [
      { id: 'see-viewer', label: 'Live Viewer', title: 'The playback surface', image: 'see-viewer.jpg', caption: 'Fluid 3D trajectory tracking and token inspection.' },
      { id: 'see-metrics', label: 'Metrics', title: 'Real-time Signal Panel', image: 'see-metrics.jpg', caption: 'Comprehensive entropy and confidence readouts.' }
    ]
  },
  {
    id: 'read',
    label: 'Read',
    text: 'Translate raw transformer math into immediate behavioral risk, hallucination detection, and state classification.',
    tabs: [
      { id: 'read-state', label: 'State Readout', title: 'State Classification', image: 'read-state.jpg', caption: 'Immediate mapping of behavioral risk.' },
      { id: 'read-hallucination', label: 'Fabrication', title: 'Fabrication Risk', image: 'read-hallucination.jpg', caption: 'Directly observing high-D signal divergence.' }
    ]
  },
  {
    id: 'replay',
    label: 'Replay',
    text: 'Scrub through past sessions, isolate specific signal spikes, and compare different model runs inside a unified workspace.',
    tabs: [
      { id: 'replay-scrub', label: 'Timeline', title: 'Scrubbing History', image: 'replay-scrub.jpg', caption: 'Move token-by-token through past states.' },
      { id: 'replay-compare', label: 'Compare', title: 'Run Comparison', image: 'replay-compare.jpg', caption: 'Compare signals across different model runs.' }
    ]
  },
  {
    id: 'test',
    label: 'Test',
    text: 'Trigger interventions based on live geometry to prove what signals actually drive the model\'s behavior.',
    tabs: [
      { id: 'test-trigger', label: 'Intervention', title: 'Live Intervention', image: 'test-trigger.jpg', caption: 'Trigger custom callbacks when geometry hits thresholds.' },
      { id: 'test-result', label: 'Outcome', title: 'Measuring Causal Impact', image: 'test-result.jpg', caption: 'See whether the state space is descriptive or genuinely causal.' }
    ]
  }
];

const validationSteps = [
  {
    id: 'foundation',
    label: 'The Foundation',
    text: 'Our state separation heuristics, hallucination risk detection, and 3B-parameter collapse interventions are fully validated and production-ready.',
    tabs: [
      { id: 'val-evidence', label: 'Evidence', title: 'Strong Discriminative Signals', image: 'val-evidence.jpg', caption: '927 strong signals separating states at inference.' },
      { id: 'val-collapse', label: 'Collapse', title: '3B Collapse Detection', image: 'val-collapse.jpg', caption: '100% validated detection of geometric lock-in.' }
    ]
  },
  {
    id: 'release',
    label: 'The Release',
    text: 'Everything you see here—the 3D replay loop, token inspector, and signal arrays—is running effortlessly on live, captured sessions without mock data.',
    tabs: [
      { id: 'val-data', label: 'Live Data', title: 'Captured Telemetry', image: 'val-data.jpg', caption: 'No simulated interfaces, just real inference traces.' },
      { id: 'val-surface', label: 'The App', title: 'Working Instrument', image: 'val-surface.jpg', caption: 'The identical language used by the private live client.' }
    ]
  },
  {
    id: 'roadmap',
    label: 'The Roadmap',
    text: 'We are launching with robust replay modes to ensure total interface stability, giving us time to harden the live stream architecture for remote enterprise deployment.',
    tabs: [
      { id: 'val-pipeline', label: 'Pipeline', title: 'Replay vs Live', image: 'val-pipeline.jpg', caption: 'Bridging replayable analysis to real-time production.' }
    ]
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchDemo }) => {
  const basePath = import.meta.env.BASE_URL || '/';
  const featuredRecordings = RECORDING_CATALOG.slice(0, 4);

  // Workflow State
  const [activeWorkflowStepIndex, setActiveWorkflowStepIndex] = useState(0);
  const [activeWorkflowTabIndex, setActiveWorkflowTabIndex] = useState(0);
  
  // Validation State
  const [activeValidationStepIndex, setActiveValidationStepIndex] = useState(0);
  const [activeValidationTabIndex, setActiveValidationTabIndex] = useState(0);

  // Reset inner tab when parent step changes
  useEffect(() => {
    setActiveWorkflowTabIndex(0);
  }, [activeWorkflowStepIndex]);

  useEffect(() => {
    setActiveValidationTabIndex(0);
  }, [activeValidationStepIndex]);

  const activeWorkflowStep = workflowSteps[activeWorkflowStepIndex];
  const activeWorkflowTab = activeWorkflowStep.tabs[activeWorkflowTabIndex];

  const activeValidationStep = validationSteps[activeValidationStepIndex];
  const activeValidationTab = activeValidationStep.tabs[activeValidationTabIndex];

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
            <p className="landing-kicker">Real-time AI behavioral monitoring</p>
            <h1 className="landing-title">GhostLine</h1>
            <p className="landing-statement">
              Watch model cognition unfold. Catch drift, structural collapse, and hallucinations the exact moment they happen.
            </p>
            <p className="landing-summary">
              GhostLine lets you see inside the black box during live inference. By combining geometric monitoring, signal inspection, and state readouts into a single glass surface, we've built the first true observability instrument for frontier models.
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
            <figure className="landing-hero-card glass-panel">
              <img
                src={`${basePath}media/ghostline-product-surface.png`}
                alt="GhostLine product surface showing 3D trajectory replay, signal panels, and token inspection."
              />
            </figure>

            <div className="landing-hero-aside">
              <div className="landing-aside-card glass-panel">
                <span className="landing-card__label">What GhostLine is</span>
                <p>An enterprise-grade observability and runtime interpretability console.</p>
              </div>
              <div className="landing-aside-card glass-panel">
                <span className="landing-card__label">What you can explore here</span>
                <p>
                  A powerful replay environment built on <code>.ghostline</code> sessions, letting you experience the product exactly as operators do.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-credibility">
          {credibilityItems.map((item) => (
            <article className="landing-credibility-card glass-panel" key={item.label}>
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
                <article 
                  className={`landing-system-step ${index === activeWorkflowStepIndex ? 'is-active' : ''}`}
                  key={step.id}
                  onClick={() => setActiveWorkflowStepIndex(index)}
                >
                  <span className="landing-system-step__index">0{index + 1}</span>
                  <div className="landing-system-step__body">
                    <h3>{step.label}</h3>
                    <p>{step.text}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="landing-example-card glass-panel landing-example-card--system">
              <div className="landing-example-card__tabs" role="tablist">
                <div className="mac-controls">
                  <span className="mac-close"></span>
                  <span className="mac-minimize"></span>
                  <span className="mac-maximize"></span>
                </div>
                {activeWorkflowStep.tabs.map((tab, index) => (
                  <button
                    key={tab.id}
                    className={`landing-example-tab ${index === activeWorkflowTabIndex ? 'is-active' : ''}`}
                    onClick={() => setActiveWorkflowTabIndex(index)}
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="landing-example-card__frame">
                <figure className="landing-figure-card landing-figure-card--workbench">
                  <img
                    src={`${basePath}media/${activeWorkflowTab.image}`}
                    alt={activeWorkflowTab.caption}
                    onError={(e) => { (e.target as HTMLImageElement).src = `${basePath}media/ghostline-product-surface.png` }} // Fallback
                  />
                  <figcaption>
                    <strong>{activeWorkflowTab.title}</strong>
                    <span>{activeWorkflowTab.caption}</span>
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
            <div className="landing-example-card glass-panel landing-example-card--validation">
              <div className="landing-example-card__tabs" role="tablist">
                <div className="mac-controls">
                  <span className="mac-close"></span>
                  <span className="mac-minimize"></span>
                  <span className="mac-maximize"></span>
                </div>
                {activeValidationStep.tabs.map((tab, index) => (
                  <button
                    key={tab.id}
                    className={`landing-example-tab ${index === activeValidationTabIndex ? 'is-active' : ''}`}
                    onClick={() => setActiveValidationTabIndex(index)}
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="landing-example-card__frame">
                <figure className="landing-figure-card landing-figure-card--chart">
                  <img
                    src={`${basePath}media/${activeValidationTab.image}`}
                    alt={activeValidationTab.caption}
                    onError={(e) => { (e.target as HTMLImageElement).src = `${basePath}media/ghostline-proof-chart.png` }} // Fallback
                  />
                  <figcaption>
                    <strong>{activeValidationTab.title}</strong>
                    <span>{activeValidationTab.caption}</span>
                  </figcaption>
                </figure>
              </div>
            </div>

            <div className="landing-validation-copy">
              {validationSteps.map((step, index) => (
                <div 
                  className={`landing-validation-card glass-panel ${index === activeValidationStepIndex ? 'is-active' : ''}`}
                  key={step.id}
                  onClick={() => setActiveValidationStepIndex(index)}
                >
                  <p className="landing-card__label">{step.label}</p>
                  <p>{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section landing-section--founder">
          <div className="landing-founder-layout">
            <article className="landing-founder-card glass-panel">
              <p className="landing-card__label">The Vision</p>
              <h2>Collin Civish</h2>
              <p className="landing-founder-card__role">Founder & Product Lead</p>
              <p>
                GhostLine is an independent effort to completely rethink AI observability. From the core signal taxonomy to the sleek rendering engine that makes it legible, the goal is to build an instrument that finally treats AI like a measurable physical system.
              </p>
            </article>

            <article className="landing-recordings-card glass-panel">
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
            <h2>Enter the observability suite</h2>
            <p>
              Begin with curated intelligence captured from real model runs. Scrub through tokens, isolate state shifts, and track geometry live in the GhostLine viewer.
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
