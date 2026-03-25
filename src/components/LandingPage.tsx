import React from 'react';
import './LandingPage.css';

interface LandingPageProps {
  onLaunchDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchDemo }) => {
  return (
    <div className="landing-page">
      {/* Section 1: Hero */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-branding">
            <span className="hero-business">GhostLine Research</span>
          </div>
          <h1 className="hero-title">GHOSTLINE</h1>
          <p className="hero-subtitle">
            Real-time geometric monitoring of LLM cognition.
          </p>
          <p className="hero-hook">
            Watch a language model think — and catch it when it lies.
          </p>
          <div className="hero-ctas">
            <button className="cta-primary" onClick={onLaunchDemo}>Launch Demo</button>
            <a href="mailto:collin@ghostline-research.org" className="cta-secondary">Contact</a>
          </div>
        </div>
      </section>

      {/* Section 2: What It Is */}
      <section className="info-section">
        <div className="section-container">
          <h2>What It Is</h2>
          <p>
            GhostLine extracts geometric features from transformer activations in real time — 
            while the model is generating, not after. It classifies behavioral states, 
            detects hallucination, and can intervene causally to steer the model away from failure modes.
          </p>
          <p className="text-highlight">
            It's mechanistic interpretability that runs at inference speed, without modifying model weights.
          </p>
        </div>
      </section>

      {/* Section 3: Technical Architecture (Schematic Figure 2) */}
      <section className="info-section alt-bg">
        <div className="section-container">
          <h2>System Architecture</h2>
          <div className="schematic-container">
            <div className="schematic-box">
              <span className="box-label">Transformer</span>
              <span className="box-detail">Hidden States</span>
            </div>
            <div className="schematic-arrow">→</div>
            <div className="schematic-box primary">
              <span className="box-label">GhostLine</span>
              <span className="box-detail">SVD Participation Ratio</span>
            </div>
            <div className="schematic-arrow">→</div>
            <div className="schematic-box">
              <span className="box-label">Classifier</span>
              <span className="box-detail">7-State LDA/SCL</span>
            </div>
          </div>
          <p className="schematic-caption">
            Figure 2: Real-time feature extraction pipeline and state classification.
          </p>
        </div>
      </section>

      {/* Section 4: Why It Matters */}
      <section className="info-section">
        <div className="section-container">
          <h2>Why It Matters</h2>
          <p>
            Current interpretability tools are retrospective — they analyze what happened. 
            GhostLine monitors what's happening, token by token, in under 1ms per token.
          </p>
          <ul className="capability-list">
            <li>✓ Hallucination detection F1=0.98 (9,083 features)</li>
            <li>✓ 7-state behavioral classification F1=0.94</li>
            <li>✓ Cross-architecture (6 models validated)</li>
            <li>✓ Causal intervention — restored from collapse in 9 nudges</li>
            <li>✓ &lt;1ms feature extraction per token</li>
          </ul>
        </div>
      </section>

      {/* Section 5: Evidence */}
      <section className="info-section alt-bg">
        <div className="section-container">
          <h2>Technical Evidence</h2>
          <div className="evidence-grid">
            <div className="evidence-card">
              <span className="evidence-value">F1=0.980</span>
              <span className="evidence-label">Hallucination detection</span>
            </div>
            <div className="evidence-card">
              <span className="evidence-value">F1=0.941</span>
              <span className="evidence-label">State classification</span>
            </div>
            <div className="evidence-card">
              <span className="evidence-value">&lt;1ms</span>
              <span className="evidence-label">Extraction speed</span>
            </div>
            <div className="evidence-card">
              <span className="evidence-value">r=0.977</span>
              <span className="evidence-label">SCL Geometry alignment</span>
            </div>
          </div>
          <p className="evidence-note">Validated with GroupKFold by prompt_id. No leakage.</p>
        </div>
      </section>

      {/* Section 6: Patent Portfolio */}
      <section className="info-section">
        <div className="section-container">
          <h2>Intellectual Property</h2>
          <p>
            GhostLine's core signal taxonomy and intervention paradigms are protected under 
            three US provisional patent applications.
          </p>
          <div className="patent-list">
            <code>US Provisional 63/948,867 (Dec 2025)</code>
            <code>US Provisional 63/975,787 (Feb 2026)</code>
            <code>US Provisional 63/982,900 (Feb 2026)</code>
          </div>
        </div>
      </section>

      {/* Section 7: Who Built It */}
      <section className="info-section alt-bg">
        <div className="section-container biography">
          <h2>Who Built It</h2>
          <p><strong>GhostLine Research</strong> is an independent AI research project.</p>
          <p><strong>Collin Civish</strong> — Independent researcher, US Army veteran, Seattle, WA.</p>
          <blockquote className="founder-quote">
            "Built as a solo research project, using AI coding tools alongside my own 
            mathematical investigation. The ideas — the signal taxonomy, the intervention 
            paradigms, the causal proof — are mine. The AI was the compiler."
          </blockquote>
        </div>
      </section>

      <footer className="landing-footer">
        <p>© 2026 GhostLine Research · <a href="mailto:collin@ghostline-research.org">collin@ghostline-research.org</a></p>
        <div className="footer-links">
          <a href="https://github.com/disasterghost/GhostLine" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
      </footer>
    </div>
  );
};
