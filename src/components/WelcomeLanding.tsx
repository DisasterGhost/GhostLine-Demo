import type { CuratedRecording } from '../recordings/types';
import { RECORDING_CATALOG } from '../recordings/catalog';
import './WelcomeLanding.css';

interface WelcomeLandingProps {
  onSelectRecording: (recording: CuratedRecording) => void;
}

export function WelcomeLanding({ onSelectRecording }: WelcomeLandingProps) {
  return (
    <div className="welcome-landing">
      <div className="welcome-shell">
        <header className="welcome-header">
          <div className="welcome-header__brand">
            <span>GhostLine Research</span>
            <span>Replay demo</span>
          </div>
          <a href="mailto:collin@ghostline-research.org" className="welcome-header__link">
            collin@ghostline-research.org
          </a>
        </header>

        <section className="welcome-intro">
          <div className="welcome-intro__copy">
            <p className="welcome-kicker">Choose a recorded session to inspect</p>
            <h1 className="welcome-title">Demo recordings</h1>
            <p className="welcome-summary">
              Each recording is a real model generation captured from Qwen3-8B. Pick one to
              step through the trajectory, watch state transitions, and inspect signals token by token.
            </p>
          </div>

          <aside className="welcome-meta">
            <div className="welcome-meta__item">
              <span className="welcome-meta__label">Mode</span>
              <span className="welcome-meta__value">Replay only</span>
            </div>
            <div className="welcome-meta__item">
              <span className="welcome-meta__label">Surface</span>
              <span className="welcome-meta__value">Recorded .ghostline sessions</span>
            </div>
            <div className="welcome-meta__item">
              <span className="welcome-meta__label">Goal</span>
              <span className="welcome-meta__value">Inspect the monitoring stack in motion</span>
            </div>
          </aside>
        </section>

        <section className="welcome-recordings">
          <p className="welcome-section-title">Available recordings</p>
          <div className="welcome-grid">
            {RECORDING_CATALOG.map((rec) => (
              <button
                key={rec.id}
                className="welcome-card"
                onClick={() => onSelectRecording(rec)}
              >
                <div className="welcome-card__top">
                  <div className="welcome-card-title">{rec.title}</div>
                  {rec.status && <span className={`welcome-card-status welcome-card-status--${rec.status}`}>{rec.status}</span>}
                </div>
                <div className="welcome-card-desc">{rec.description}</div>
                <div className="welcome-card-goal">{rec.teachingGoal}</div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
