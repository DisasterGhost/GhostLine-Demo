import React, { useState } from 'react';

// ============================================================================
// Attention Head Colors (must match GhostwireScene.tsx)
// VALIDATED: Dec 19, 2025 via validate_attention_heads.py (extended test)
// 
// Methodology: 23 induction prompts, 10 duplicate prompts, 8 previous-token prompts
// Token normalization applied to handle BPE spacing ("The" vs " The")
// Tested layers 5, 6, 7 — Layer 5 showed strongest induction signals
// ============================================================================

export const HEAD_COLORS = [
  { id: 0, color: '#ff6b9d', name: 'Hybrid', desc: 'L5H0: Context-dependent (ind_max=0.92, fires on specific patterns)' },
  { id: 1, color: '#6bffb8', name: 'Induction', desc: 'L5H1: Specialist induction head (ind=0.20, max=0.99)' },
  { id: 2, color: '#ffb86b', name: 'Prev-Token', desc: 'L5H2: Previous-token head (prev=0.24)' },
  { id: 3, color: '#6b9dff', name: 'Duplicate?', desc: 'L5H3: Highest duplicate sensitivity (dup=0.07, weak)' },
  { id: 4, color: '#b86bff', name: 'Prev-Token', desc: 'L5H4: Previous-token with induction backup (prev=0.23)' },
  { id: 5, color: '#ffff6b', name: 'Induction*', desc: 'L5H5: PRIMARY induction head (ind=0.38) ✓' },
  { id: 6, color: '#6bffff', name: 'Prev-Token*', desc: 'L5H6: STRONG previous-token (prev=0.49) ✓' },
  { id: 7, color: '#ff6b6b', name: 'Unclear', desc: 'L5H7: Weak signal across all tests — function unknown' },
];

// ============================================================================
// Control Panel Types
// ============================================================================

export interface ControlPanelState {
  showLandmarks: boolean;
  showAttentionArcs: boolean;
  showAllLabels: boolean;
  enabledHeads: number[];  // Changed from Set to array for React compatibility
  landmarkOpacity: number;
}

interface ControlPanelProps {
  state: ControlPanelState;
  onChange: (state: ControlPanelState) => void;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  disabled?: boolean;
}

// ============================================================================
// Control Panel Component
// ============================================================================

export function ControlPanel({
  state,
  onChange,
  playbackRate,
  onPlaybackRateChange,
  disabled = false,
}: ControlPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateState = (partial: Partial<ControlPanelState>) => {
    onChange({ ...state, ...partial });
  };

  const toggleHead = (headId: number) => {
    const newHeads = state.enabledHeads.includes(headId)
      ? state.enabledHeads.filter(h => h !== headId)
      : [...state.enabledHeads, headId];
    updateState({ enabledHeads: newHeads });
  };

  const enableAllHeads = () => {
    updateState({ enabledHeads: [0, 1, 2, 3, 4, 5, 6, 7] });
  };

  const disableAllHeads = () => {
    updateState({ enabledHeads: [] });
  };

  return (
    <>
      {/* Toggle button */}
      <button
        className="control-panel-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="Visualization controls"
      >
        ⚙
      </button>

      {/* Control Panel */}
      {isOpen && (
        <div className="control-panel">
          <div className="control-panel-header">
            <h3>Display Controls</h3>
            <button className="control-panel-close" onClick={() => setIsOpen(false)}>×</button>
          </div>

          <div className="control-panel-content">
            {/* Visibility Toggles */}
            <section className="control-section">
              <h4>Visibility</h4>
              
              <label className="control-toggle">
                <input
                  type="checkbox"
                  checked={state.showLandmarks}
                  onChange={(e) => updateState({ showLandmarks: e.target.checked })}
                  disabled={disabled}
                />
                <span className="toggle-label">Landmarks (disabled - recalibrating)</span>
              </label>

              <label className="control-toggle">
                <input
                  type="checkbox"
                  checked={state.showAttentionArcs}
                  onChange={(e) => updateState({ showAttentionArcs: e.target.checked })}
                  disabled={disabled}
                />
                <span className="toggle-label">Attention Arcs</span>
              </label>

              <label className="control-toggle">
                <input
                  type="checkbox"
                  checked={state.showAllLabels}
                  onChange={(e) => updateState({ showAllLabels: e.target.checked })}
                  disabled={disabled}
                />
                <span className="toggle-label">All Token Labels</span>
              </label>
            </section>

            {/* Landmark Opacity */}
            <section className="control-section">
              <h4>Landmark Opacity</h4>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={state.landmarkOpacity * 100}
                  onChange={(e) => updateState({ landmarkOpacity: parseInt(e.target.value) / 100 })}
                  disabled={disabled || !state.showLandmarks}
                  className="control-slider"
                />
                <span className="slider-value">{Math.round(state.landmarkOpacity * 100)}%</span>
              </div>
            </section>

            {/* Playback Speed */}
            <section className="control-section">
              <h4>Playback Speed</h4>
              <div className="speed-buttons">
                {[1, 2, 4, 8, 16].map((rate) => (
                  <button
                    key={rate}
                    className={`speed-btn ${playbackRate === rate ? 'active' : ''}`}
                    onClick={() => onPlaybackRateChange(rate)}
                    disabled={disabled}
                  >
                    {rate}×
                  </button>
                ))}
              </div>
            </section>

            {/* Attention Head Filter */}
            <section className="control-section">
              <h4>
                Attention Heads
                <span className="head-controls">
                  <button className="mini-btn" onClick={enableAllHeads}>All</button>
                  <button className="mini-btn" onClick={disableAllHeads}>None</button>
                </span>
              </h4>
              
              <div className="attention-head-grid">
                {HEAD_COLORS.map((head) => (
                  <label
                    key={head.id}
                    className={`head-checkbox ${state.enabledHeads.includes(head.id) ? 'enabled' : 'disabled'}`}
                    title={head.desc}
                  >
                    <input
                      type="checkbox"
                      checked={state.enabledHeads.includes(head.id)}
                      onChange={() => toggleHead(head.id)}
                      disabled={disabled || !state.showAttentionArcs}
                    />
                    <span 
                      className="head-color-dot" 
                      style={{ backgroundColor: head.color }}
                    />
                    <span className="head-name">{head.name}</span>
                  </label>
                ))}
              </div>
              
              <p className="control-hint">
                Click tokens to see their attention patterns
              </p>
            </section>
          </div>
        </div>
      )}
    </>
  );
}

// Default state factory
export function createDefaultControlState(): ControlPanelState {
  return {
    showLandmarks: false,  // DISABLED: Miscalibrated for new projector
    showAttentionArcs: true,
    showAllLabels: false,
    enabledHeads: [0, 1, 2, 3, 4, 5, 6, 7],
    landmarkOpacity: 0.4,
  };
}
