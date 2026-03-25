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
        <div className="welcome-header">
          <span className="welcome-business-name">GhostLine Research</span>
          <span className="welcome-founder-name">Collin Civish, Independent Researcher</span>
        </div>
        <h1 className="welcome-title">GHOSTLINE</h1>
        <p className="welcome-subtitle">
          Real-time geometric monitoring and intervention of LLM cognitive states
        </p>
        <p className="welcome-desc">
          GhostLine is an independent research project focused on runtime mechanistic interpretability. 
          By extracting geometric features from hidden states during inference, we can classify 
          behavioral states, detect hallucinations (F1=0.98), and steer generation through 
          calibrated causal interventions.
        </p>
        <p className="welcome-tech-note">
          Powered by a Two-Stage Detection System and Geometric State Crystallization analysis.
        </p>
        <p className="welcome-demo-inquiry">
          Inquiries & Collaborations: <a href="mailto:collin@ghostline-research.org">collin@ghostline-research.org</a>
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
