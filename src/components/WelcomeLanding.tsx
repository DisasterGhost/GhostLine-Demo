import type { CuratedRecording } from '../recordings/types';
import { RECORDING_CATALOG } from '../recordings/catalog';
import './WelcomeLanding.css';

interface WelcomeLandingProps {
  onSelectRecording: (recording: CuratedRecording) => void;
}

export function WelcomeLanding({ onSelectRecording }: WelcomeLandingProps) {
  return (
    <div className="welcome-landing">
      <div className="welcome-content">
        <h1 className="welcome-title">GHOSTLINE</h1>
        <p className="welcome-subtitle">
          Real-time geometric visualization of LLM cognitive states
        </p>
        <p className="welcome-desc">
          Explore pre-recorded generation sessions. Watch how transformer models
          think, hallucinate, and self-correct — made visible through geometric analysis.
        </p>
        <p className="welcome-demo-inquiry">
          Live demo available upon request —{' '}
          <a href="mailto:collin@ghostline-research.org">collin@ghostline-research.org</a>
        </p>

        <div className="welcome-recordings">
          <h2 className="welcome-section-title">Choose a recording to explore</h2>
          <div className="welcome-grid">
            {RECORDING_CATALOG.map(rec => (
              <button
                key={rec.id}
                className="welcome-card"
                onClick={() => onSelectRecording(rec)}
              >
                <div className="welcome-card-title">{rec.title}</div>
                <div className="welcome-card-desc">{rec.description}</div>
                <div className="welcome-card-goal">{rec.teachingGoal}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="welcome-links">
          <a href="https://github.com/disasterghost/GhostLine" target="_blank" rel="noopener noreferrer">GitHub</a>
          <span className="welcome-sep">&middot;</span>
          <span className="welcome-patent">US Provisional 63/982,900</span>
        </div>
      </div>
    </div>
  );
}
