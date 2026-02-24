import { useState, useEffect } from 'react';
import './Tutorial.css';

const TUTORIAL_STEPS = [
  {
    title: 'Token Trajectories',
    text: 'Each sphere is a token — the model\'s thought made visible in 3D space.',
  },
  {
    title: 'Cognitive States',
    text: 'Color shows the model\'s cognitive state: reasoning, creativity, precision, retrieval, or uncertainty.',
  },
  {
    title: 'Playback Controls',
    text: 'Use the controls at the bottom to play, pause, and seek through the recording at different speeds.',
  },
  {
    title: 'Token Inspector',
    text: 'Click any token to inspect its geometric signature — effective dimensionality, velocity, entropy, and more.',
  },
  {
    title: 'Layer Switching',
    text: 'Switch layers using the dropdown to see how the representation crystallizes: early layers are chaotic, late layers compress.',
  },
  {
    title: 'Explore Recordings',
    text: 'Choose a recording from the selector to explore different phenomena — state transitions, hallucination, collapse, and more.',
  },
];

const STORAGE_KEY = 'ghostline-demo-tutorial-complete';

export function Tutorial() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (step < TUTORIAL_STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (!visible) return null;

  const currentStep = TUTORIAL_STEPS[step];

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-card">
        <div className="tutorial-step-indicator">
          {step + 1} / {TUTORIAL_STEPS.length}
        </div>
        <div className="tutorial-title">{currentStep.title}</div>
        <div className="tutorial-text">{currentStep.text}</div>
        <div className="tutorial-actions">
          <button className="tutorial-skip" onClick={handleDismiss}>Skip</button>
          <button className="tutorial-next" onClick={handleNext}>
            {step < TUTORIAL_STEPS.length - 1 ? 'Next' : 'Get Started'}
          </button>
        </div>
      </div>
    </div>
  );
}
