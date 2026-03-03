import React, { useState, useEffect } from 'react';
import { STATE_PALETTES, getStatePaletteColors, type StatePaletteId } from '../data/statePalettes';

// ============================================================================
// Unified Settings Panel
// Consolidates Display Controls and Visual Effects into one tabbed interface
// Persists all settings to localStorage
// ============================================================================

// Attention Head metadata (must match GhostwireScene.tsx)
export const HEAD_COLORS = [
  { id: 0, color: '#ff6b9d', name: 'Hybrid', desc: 'L5H0: Context-dependent' },
  { id: 1, color: '#6bffb8', name: 'Induction', desc: 'L5H1: Specialist induction head' },
  { id: 2, color: '#ffb86b', name: 'Prev-Token', desc: 'L5H2: Previous-token head' },
  { id: 3, color: '#6b9dff', name: 'Duplicate?', desc: 'L5H3: Duplicate sensitivity' },
  { id: 4, color: '#b86bff', name: 'Prev-Token', desc: 'L5H4: Previous-token + induction' },
  { id: 5, color: '#ffff6b', name: 'Induction*', desc: 'L5H5: PRIMARY induction head ✓' },
  { id: 6, color: '#6bffff', name: 'Prev-Token*', desc: 'L5H6: STRONG previous-token ✓' },
  { id: 7, color: '#ff6b6b', name: 'Unclear', desc: 'L5H7: Function unknown' },
];

// ============================================================================
// Types
// ============================================================================

export interface DisplaySettings {
  showLandmarks: boolean;
  showAttentionArcs: boolean;
  showAllLabels: boolean;
  showPromptTokens: boolean;
  enabledHeads: number[];
  landmarkOpacity: number;
  playbackRate: number;
}

export interface VisualSettings {
  // Token Aesthetics
  tokenGlowIntensity: number;
  particleTrails: boolean;
  entropyShapeDistortion: boolean;
  signalAmplitude: boolean;        // Point size from residual norm

  // Spatial
  spatialSpread: number;           // Coordinate spread multiplier: 1.0=raw, 2.0=2x spread

  // Trajectory
  flowParticles: boolean;          // Arc pulses - energy flowing along attention arcs
  ribbonTrails: boolean;           // Experimental ribbon effect
  trajectoryStyle: 'lines' | 'cables';
  smoothingLevel: 'smooth' | 'balanced' | 'reactive' | 'raw';  // Position interpolation speed
  showOutlierJumps: boolean;       // Show trajectory segments >3x median distance

  // UI Theme (Cyberpunk color schemes)
  uiTheme: 'cyberspace' | 'toxic' | 'blade-runner' | 'ghost';

  // Color
  colorPalette: 'default' | 'coolWarm' | 'sunset' | 'ocean' | 'neon';
  arcColorMode: 'pattern' | 'head';
  tokenColorMode: 'confidence' | 'entropy' | 'state';  // Token coloring mode
  statePalette: 'classic' | 'refined';                 // Sub-option for state coloring

  // Accessibility
  textSize: 'small' | 'medium' | 'large' | 'x-large';

  // Environment
  uncertaintyStatic: boolean;      // Flickering noise on high-entropy tokens
  cameraAutoDrift: boolean;        // Subtle auto-rotation when idle
  dynamicBackground: boolean;      // Fog color shifts with confidence

  // Layer Transition Animation
  layerTokenDuration: number;      // Per-token animation ms (single layer)
  layerSegmentDuration: number;    // Per-keyframe-segment ms (multi-layer playthrough)
  layerMinStagger: number;         // Minimum ms between consecutive token starts
  layerBeatDuration: number;       // Pause ms between layer phases (multi-layer)

  // Performance
  bloomEnabled: boolean;
  bloomIntensity: number;
  bloomThreshold: number;          // luminanceThreshold: 0=everything blooms, 1=nothing
  starfieldDensity: number;
  fogNear: number;                 // Fog start distance
  fogFar: number;                  // Fog full-opacity distance
}

export interface AllSettings {
  display: DisplaySettings;
  visual: VisualSettings;
}

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_DISPLAY: DisplaySettings = {
  showLandmarks: false,
  showAttentionArcs: true,
  showAllLabels: true,
  showPromptTokens: true,
  enabledHeads: [0, 1, 2, 3, 4, 5, 6, 7],
  landmarkOpacity: 0.4,
  playbackRate: 4,
};

const DEFAULT_VISUAL: VisualSettings = {
  tokenGlowIntensity: 1.0,
  particleTrails: false,
  entropyShapeDistortion: false,
  signalAmplitude: true,
  spatialSpread: 1.0,
  flowParticles: false,
  ribbonTrails: false,
  trajectoryStyle: 'lines',
  smoothingLevel: 'balanced',
  showOutlierJumps: true,
  // UI Theme
  uiTheme: 'cyberspace',           // Default: Cyan/Magenta cyberpunk
  // Color
  colorPalette: 'coolWarm',
  arcColorMode: 'pattern',
  tokenColorMode: 'confidence',
  statePalette: 'classic',
  // Accessibility
  textSize: 'medium',
  // Environment
  uncertaintyStatic: false,
  cameraAutoDrift: false,
  dynamicBackground: false,
  // Layer Transition Animation
  layerTokenDuration: 600,
  layerSegmentDuration: 500,
  layerMinStagger: 25,
  layerBeatDuration: 500,
  // Performance
  bloomEnabled: true,
  bloomIntensity: 0.8,
  bloomThreshold: 0.15,
  starfieldDensity: 1.0,
  fogNear: 40,
  fogFar: 120,
};

const STORAGE_KEY = 'ghostline-settings';

// ============================================================================
// Persistence
// ============================================================================

export function loadSettings(): AllSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        display: { ...DEFAULT_DISPLAY, ...parsed.display },
        visual: { ...DEFAULT_VISUAL, ...parsed.visual },
      };
    }
  } catch (e) {
    console.warn('Failed to load settings from localStorage:', e);
  }
  return { display: DEFAULT_DISPLAY, visual: DEFAULT_VISUAL };
}

export function saveSettings(settings: AllSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings to localStorage:', e);
  }
}

// ============================================================================
// Settings Panel Component
// ============================================================================

type SettingsTab = 'display' | 'visual' | 'color' | 'performance';

interface SettingsPanelProps {
  settings: AllSettings;
  onChange: (settings: AllSettings) => void;
  disabled?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({
  settings,
  onChange,
  disabled = false,
  isOpen,
  onClose,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('display');

  // Save settings whenever they change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateDisplay = (partial: Partial<DisplaySettings>) => {
    onChange({
      ...settings,
      display: { ...settings.display, ...partial },
    });
  };

  const updateVisual = (partial: Partial<VisualSettings>) => {
    onChange({
      ...settings,
      visual: { ...settings.visual, ...partial },
    });
  };

  const toggleHead = (headId: number) => {
    const newHeads = settings.display.enabledHeads.includes(headId)
      ? settings.display.enabledHeads.filter(h => h !== headId)
      : [...settings.display.enabledHeads, headId];
    updateDisplay({ enabledHeads: newHeads });
  };

  const resetToDefaults = () => {
    onChange({ display: DEFAULT_DISPLAY, visual: DEFAULT_VISUAL });
  };

  if (!isOpen) return null;

  return (
        <div className="settings-panel">
          <div className="settings-header">
            <h3>Settings</h3>
            <div className="settings-header-actions">
              <button 
                className="settings-reset" 
                onClick={resetToDefaults}
                title="Reset all settings to defaults"
              >
                Reset
              </button>
              <button className="settings-close" onClick={onClose}>×</button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="settings-tabs">
            <button 
              className={activeTab === 'display' ? 'active' : ''} 
              onClick={() => setActiveTab('display')}
            >
              Display
            </button>
            <button 
              className={activeTab === 'visual' ? 'active' : ''} 
              onClick={() => setActiveTab('visual')}
            >
              Effects
            </button>
            <button 
              className={activeTab === 'color' ? 'active' : ''} 
              onClick={() => setActiveTab('color')}
            >
              Color
            </button>
            <button 
              className={activeTab === 'performance' ? 'active' : ''} 
              onClick={() => setActiveTab('performance')}
            >
              Performance
            </button>
          </div>

          <div className="settings-content">
            {/* Display Tab */}
            {activeTab === 'display' && (
              <div className="settings-group">
                <section className="settings-section">
                  <h4>Visibility</h4>
                  
                  <label className="settings-toggle-row">
                    <input
                      type="checkbox"
                      checked={settings.display.showAttentionArcs}
                      onChange={(e) => updateDisplay({ showAttentionArcs: e.target.checked })}
                      disabled={disabled}
                    />
                    <span>Attention Arcs</span>
                  </label>

                  <label className="settings-toggle-row">
                    <input
                      type="checkbox"
                      checked={settings.display.showAllLabels}
                      onChange={(e) => updateDisplay({ showAllLabels: e.target.checked })}
                      disabled={disabled}
                    />
                    <span>All Token Labels</span>
                  </label>

                  <label className="settings-toggle-row">
                    <input
                      type="checkbox"
                      checked={settings.display.showPromptTokens}
                      onChange={(e) => updateDisplay({ showPromptTokens: e.target.checked })}
                      disabled={disabled}
                    />
                    <span>Prompt Tokens</span>
                  </label>

                  <label className="settings-toggle-row disabled-feature">
                    <input
                      type="checkbox"
                      checked={settings.display.showLandmarks}
                      onChange={(e) => updateDisplay({ showLandmarks: e.target.checked })}
                      disabled={true}
                    />
                    <span>Landmarks (recalibrating)</span>
                  </label>
                </section>

                <section className="settings-section">
                  <h4>Accessibility</h4>
                  <label className="settings-slider-row">
                    <span>Text Size</span>
                    <select
                      value={settings.visual.textSize}
                      onChange={(e) => updateVisual({ textSize: e.target.value as VisualSettings['textSize'] })}
                      disabled={disabled}
                      className="palette-select"
                      style={{ marginLeft: 'auto' }}
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium (Default)</option>
                      <option value="large">Large</option>
                      <option value="x-large">Extra Large</option>
                    </select>
                  </label>
                </section>

                <section className="settings-section">
                  <h4>
                    Token Display Speed
                    <span style={{ fontWeight: 'normal', opacity: 0.7, marginLeft: 8, fontSize: '0.85em' }}>
                      {settings.display.playbackRate < 1
                        ? `${(1000 / settings.display.playbackRate / 1000).toFixed(1)}s/token`
                        : `${settings.display.playbackRate} tok/s`}
                    </span>
                  </h4>
                  <input
                    type="range"
                    min="0.25"
                    max="16"
                    step="0.25"
                    value={settings.display.playbackRate}
                    onChange={(e) => updateDisplay({ playbackRate: parseFloat(e.target.value) })}
                    disabled={disabled}
                    className="control-slider"
                    style={{ width: '100%', margin: '4px 0' }}
                  />
                  <div className="speed-buttons">
                    {[
                      { rate: 0.5, label: 'Slow' },
                      { rate: 2, label: 'Normal' },
                      { rate: 4, label: 'Fast' },
                      { rate: 8, label: 'Rapid' },
                    ].map(({ rate, label }) => (
                      <button
                        key={rate}
                        className={`speed-btn ${settings.display.playbackRate === rate ? 'active' : ''}`}
                        onClick={() => updateDisplay({ playbackRate: rate })}
                        disabled={disabled}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="settings-section">
                  <h4>
                    Attention Heads
                    <span className="section-actions">
                      <button 
                        className="mini-btn" 
                        onClick={() => updateDisplay({ enabledHeads: [0,1,2,3,4,5,6,7] })}
                      >
                        All
                      </button>
                      <button 
                        className="mini-btn" 
                        onClick={() => updateDisplay({ enabledHeads: [] })}
                      >
                        None
                      </button>
                    </span>
                  </h4>
                  
                  <div className="attention-head-grid">
                    {HEAD_COLORS.map((head) => (
                      <label
                        key={head.id}
                        className={`head-checkbox ${settings.display.enabledHeads.includes(head.id) ? 'enabled' : 'disabled'}`}
                        title={head.desc}
                      >
                        <input
                          type="checkbox"
                          checked={settings.display.enabledHeads.includes(head.id)}
                          onChange={() => toggleHead(head.id)}
                          disabled={disabled || !settings.display.showAttentionArcs}
                        />
                        <span className="head-color-dot" style={{ backgroundColor: head.color }} />
                        <span className="head-name">{head.name}</span>
                      </label>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* Visual Effects Tab */}
            {activeTab === 'visual' && (
              <div className="settings-group">
                <section className="settings-section">
                  <h4>Token Effects</h4>
                  
                  <label className="settings-slider-row">
                    <span>Glow Intensity</span>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={settings.visual.tokenGlowIntensity * 100}
                      onChange={(e) => updateVisual({ tokenGlowIntensity: parseInt(e.target.value) / 100 })}
                      disabled={disabled}
                    />
                    <span className="slider-value">{settings.visual.tokenGlowIntensity.toFixed(1)}</span>
                  </label>

                  <label className="settings-toggle-row">
                    <input
                      type="checkbox"
                      checked={settings.visual.particleTrails}
                      onChange={(e) => updateVisual({ particleTrails: e.target.checked })}
                      disabled={disabled}
                    />
                    <span>Particle Trails</span>
                  </label>

                  <label className="settings-toggle-row">
                    <input
                      type="checkbox"
                      checked={settings.visual.entropyShapeDistortion}
                      onChange={(e) => updateVisual({ entropyShapeDistortion: e.target.checked })}
                      disabled={disabled}
                    />
                    <span>Entropy Shape Distortion</span>
                    <span className="settings-hint-inline">Spiky = uncertain</span>
                  </label>

                  <label className="settings-toggle-row">
                    <input
                      type="checkbox"
                      checked={settings.visual.signalAmplitude}
                      onChange={(e) => updateVisual({ signalAmplitude: e.target.checked })}
                      disabled={disabled}
                    />
                    <span>Signal Amplitude</span>
                    <span className="settings-hint-inline">Size = residual norm</span>
                  </label>

                </section>

                <section className="settings-section">
                  <h4>Spatial</h4>

                  <label className="settings-slider-row">
                    <span>Spread</span>
                    <input
                      type="range"
                      min="50"
                      max="500"
                      value={settings.visual.spatialSpread * 100}
                      onChange={(e) => updateVisual({ spatialSpread: parseInt(e.target.value) / 100 })}
                      disabled={disabled}
                    />
                    <span className="slider-value">{settings.visual.spatialSpread.toFixed(1)}x</span>
                  </label>
                  <span className="settings-hint-inline">Expand/contract token positions from centroid</span>

                </section>

                <section className="settings-section">
                  <h4>Trajectory Effects</h4>
                  
                  <label className="settings-slider-row">
                    <span>Connection Style</span>
                    <select
                      value={settings.visual.trajectoryStyle}
                      onChange={(e) => updateVisual({ trajectoryStyle: e.target.value as VisualSettings['trajectoryStyle'] })}
                      disabled={disabled}
                      className="palette-select"
                      style={{ marginLeft: 'auto' }}
                    >
                      <option value="lines">Lines</option>
                      <option value="cables">Cables</option>
                    </select>
                  </label>

                  <label className="settings-toggle-row">
                    <input
                      type="checkbox"
                      checked={settings.visual.flowParticles}
                      onChange={(e) => updateVisual({ flowParticles: e.target.checked })}
                      disabled={disabled}
                    />
                    <span>Arc Pulses</span>
                    <span className="settings-hint-inline">Energy along attention arcs</span>
                  </label>

                  <label className="settings-slider-row">
                    <span>Smoothing</span>
                    <select
                      value={settings.visual.smoothingLevel}
                      onChange={(e) => updateVisual({ smoothingLevel: e.target.value as VisualSettings['smoothingLevel'] })}
                      disabled={disabled}
                      className="palette-select"
                      style={{ marginLeft: 'auto' }}
                    >
                      <option value="smooth">Smooth (Cinematic)</option>
                      <option value="balanced">Balanced</option>
                      <option value="reactive">Reactive</option>
                      <option value="raw">Raw (Instant)</option>
                    </select>
                  </label>

                  <label className="settings-toggle-row">
                    <input
                      type="checkbox"
                      checked={settings.visual.showOutlierJumps}
                      onChange={(e) => updateVisual({ showOutlierJumps: e.target.checked })}
                      disabled={disabled}
                    />
                    <span>Show Outlier Jumps</span>
                    <span className="settings-hint-inline">Forensic: show long trajectory segments</span>
                  </label>
                </section>

                <section className="settings-section">
                  <h4>Layer Transition</h4>
                  <span className="settings-hint-inline">Controls for the domino cascade when switching layers</span>

                  <label className="settings-slider-row">
                    <span>Token Duration</span>
                    <input
                      type="range"
                      min="100"
                      max="2000"
                      step="50"
                      value={settings.visual.layerTokenDuration}
                      onChange={(e) => updateVisual({ layerTokenDuration: parseInt(e.target.value) })}
                      disabled={disabled}
                    />
                    <span className="slider-value">{settings.visual.layerTokenDuration}ms</span>
                  </label>

                  <label className="settings-slider-row">
                    <span>Layer Duration</span>
                    <input
                      type="range"
                      min="100"
                      max="2000"
                      step="50"
                      value={settings.visual.layerSegmentDuration}
                      onChange={(e) => updateVisual({ layerSegmentDuration: parseInt(e.target.value) })}
                      disabled={disabled}
                    />
                    <span className="slider-value">{settings.visual.layerSegmentDuration}ms</span>
                  </label>

                  <label className="settings-slider-row">
                    <span>Token Stagger</span>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      value={settings.visual.layerMinStagger}
                      onChange={(e) => updateVisual({ layerMinStagger: parseInt(e.target.value) })}
                      disabled={disabled}
                    />
                    <span className="slider-value">{settings.visual.layerMinStagger}ms</span>
                  </label>

                  <label className="settings-slider-row">
                    <span>Layer Beat</span>
                    <input
                      type="range"
                      min="0"
                      max="2000"
                      step="50"
                      value={settings.visual.layerBeatDuration}
                      onChange={(e) => updateVisual({ layerBeatDuration: parseInt(e.target.value) })}
                      disabled={disabled}
                    />
                    <span className="slider-value">{settings.visual.layerBeatDuration}ms</span>
                  </label>
                  <span className="settings-hint-inline">Pause between layers during multi-layer transitions</span>
                </section>
              </div>
            )}

            {/* Color Tab */}
            {activeTab === 'color' && (
              <div className="settings-group">
                <section className="settings-section">
                  <h4>UI Theme</h4>
                  <p className="settings-hint">
                    Cyberpunk color scheme for the interface
                  </p>

                  <div className="theme-options">
                    {[
                      { id: 'cyberspace', name: 'Cyberspace', desc: 'Cyan / Magenta', colors: ['#00ffff', '#ff00ff'] },
                      { id: 'toxic', name: 'Toxic', desc: 'Acid Green / Purple', colors: ['#00ff66', '#9900ff'] },
                      { id: 'blade-runner', name: 'Blade Runner', desc: 'Electric Blue / Orange', colors: ['#0088ff', '#ff6600'] },
                      { id: 'ghost', name: 'Ghost', desc: 'Ice Blue / Teal', colors: ['#7eb8ff', '#00ccaa'] },
                    ].map((theme) => (
                      <label
                        key={theme.id}
                        className={`theme-option ${settings.visual.uiTheme === theme.id ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="uiTheme"
                          value={theme.id}
                          checked={settings.visual.uiTheme === theme.id}
                          onChange={() => updateVisual({ uiTheme: theme.id as VisualSettings['uiTheme'] })}
                          disabled={disabled}
                        />
                        <div className="theme-colors">
                          <span className="theme-dot" style={{ backgroundColor: theme.colors[0] }} />
                          <span className="theme-dot" style={{ backgroundColor: theme.colors[1] }} />
                        </div>
                        <div className="theme-info">
                          <span className="theme-name">{theme.name}</span>
                          <span className="theme-desc">{theme.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>

                <section className="settings-section">
                  <h4>Color Palette</h4>
                  <p className="settings-hint">
                    Maps confidence: low → high
                  </p>
                  
                  <div className="palette-options">
                    {[
                      { id: 'coolWarm', name: 'Cool → Warm', gradient: 'linear-gradient(to right, #4a90d9, #a855f7, #f97316, #ef4444)' },
                      { id: 'sunset', name: 'Sunset', gradient: 'linear-gradient(to right, #7c3aed, #db2777, #f97316, #fbbf24)' },
                      { id: 'ocean', name: 'Ocean', gradient: 'linear-gradient(to right, #0891b2, #06b6d4, #2dd4bf, #a7f3d0)' },
                      { id: 'neon', name: 'Neon', gradient: 'linear-gradient(to right, #f0abfc, #e879f9, #22d3ee, #67e8f9)' },
                      { id: 'default', name: 'Classic', gradient: 'linear-gradient(to right, #ff6b6b, #ffd93d, #6bff6b)' },
                    ].map((palette) => (
                      <label 
                        key={palette.id}
                        className={`palette-option ${settings.visual.colorPalette === palette.id ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="colorPalette"
                          value={palette.id}
                          checked={settings.visual.colorPalette === palette.id}
                          onChange={() => updateVisual({ colorPalette: palette.id as VisualSettings['colorPalette'] })}
                          disabled={disabled}
                        />
                        <div className="palette-swatch" style={{ background: palette.gradient }} />
                        <span className="palette-name">{palette.name}</span>
                      </label>
                    ))}
                  </div>
                </section>

                <section className="settings-section">
                  <h4>Token Color Mode</h4>
                  <p className="settings-hint">
                    What drives token color
                  </p>

                  <div className="palette-options">
                    <label
                      className={`palette-option ${settings.visual.tokenColorMode === 'confidence' ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="tokenColorMode"
                        value="confidence"
                        checked={settings.visual.tokenColorMode === 'confidence'}
                        onChange={() => updateVisual({ tokenColorMode: 'confidence' })}
                        disabled={disabled}
                      />
                      <div className="palette-swatch" style={{ background: 'linear-gradient(to right, #ff6b6b, #ffd93d, #6bff6b)' }} />
                      <span className="palette-name">Confidence</span>
                    </label>
                    <label
                      className={`palette-option ${settings.visual.tokenColorMode === 'entropy' ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="tokenColorMode"
                        value="entropy"
                        checked={settings.visual.tokenColorMode === 'entropy'}
                        onChange={() => updateVisual({ tokenColorMode: 'entropy' })}
                        disabled={disabled}
                      />
                      <div className="palette-swatch" style={{ background: 'linear-gradient(to right, #4a90ff, #a855f7, #ff66aa)' }} />
                      <span className="palette-name">Entropy (Constraint)</span>
                    </label>
                    <label
                      className={`palette-option ${settings.visual.tokenColorMode === 'state' ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="tokenColorMode"
                        value="state"
                        checked={settings.visual.tokenColorMode === 'state'}
                        onChange={() => updateVisual({ tokenColorMode: 'state' })}
                        disabled={disabled}
                      />
                      {(() => {
                        const c = getStatePaletteColors(settings.visual.statePalette ?? 'classic');
                        return <div className="palette-swatch" style={{ background: `linear-gradient(to right, ${c.creativity}, ${c.reasoning}, ${c.retrieval}, ${c.precision}, ${c.uncertainty})` }} />;
                      })()}
                      <span className="palette-name">Geometric State</span>
                    </label>
                  </div>
                  <p className="settings-hint" style={{ marginTop: '8px' }}>
                    {settings.visual.tokenColorMode === 'confidence'
                      ? 'Red = uncertain, Green = confident'
                      : settings.visual.tokenColorMode === 'entropy'
                      ? 'Blue = constrained, Pink = free'
                      : 'Purple=creative, Cyan=reasoning, Green=retrieval, Gold=precision'}
                  </p>

                  {/* State palette sub-option — only visible when state coloring active */}
                  {settings.visual.tokenColorMode === 'state' && (
                    <div style={{ marginTop: '8px' }}>
                      <span className="settings-hint" style={{ display: 'block', marginBottom: '6px' }}>State Palette</span>
                      <div className="palette-options" style={{ gap: '4px' }}>
                        {(Object.values(STATE_PALETTES) as { id: StatePaletteId; name: string; description: string; colors: Record<string, string> }[]).map((p) => (
                          <label
                            key={p.id}
                            className={`palette-option ${settings.visual.statePalette === p.id ? 'selected' : ''}`}
                          >
                            <input
                              type="radio"
                              name="statePalette"
                              value={p.id}
                              checked={(settings.visual.statePalette ?? 'classic') === p.id}
                              onChange={() => updateVisual({ statePalette: p.id })}
                              disabled={disabled}
                            />
                            <div className="palette-swatch" style={{ background: `linear-gradient(to right, ${p.colors.creativity}, ${p.colors.reasoning}, ${p.colors.retrieval}, ${p.colors.precision}, ${p.colors.uncertainty})` }} />
                            <span className="palette-name">{p.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* Performance Tab */}
            {activeTab === 'performance' && (
              <div className="settings-group">
                <section className="settings-section">
                  <h4>Post-Processing</h4>
                  
                  <label className="settings-toggle-row">
                    <input
                      type="checkbox"
                      checked={settings.visual.bloomEnabled}
                      onChange={(e) => updateVisual({ bloomEnabled: e.target.checked })}
                      disabled={disabled}
                    />
                    <span>Bloom Effect</span>
                  </label>

                  <label className="settings-slider-row">
                    <span>Bloom Intensity</span>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={settings.visual.bloomIntensity * 100}
                      onChange={(e) => updateVisual({ bloomIntensity: parseInt(e.target.value) / 100 })}
                      disabled={disabled || !settings.visual.bloomEnabled}
                    />
                    <span className="slider-value">{settings.visual.bloomIntensity.toFixed(1)}</span>
                  </label>

                  <label className="settings-slider-row">
                    <span>Bloom Threshold</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.visual.bloomThreshold * 100}
                      onChange={(e) => updateVisual({ bloomThreshold: parseInt(e.target.value) / 100 })}
                      disabled={disabled || !settings.visual.bloomEnabled}
                    />
                    <span className="slider-value">{settings.visual.bloomThreshold.toFixed(2)}</span>
                  </label>
                  <p className="settings-hint" style={{ marginTop: '2px', fontSize: '10px' }}>
                    Low = everything glows, High = only bright tokens bloom
                  </p>
                </section>

                <section className="settings-section">
                  <h4>Environment</h4>

                  <label className="settings-slider-row">
                    <span>Fog Near</span>
                    <input
                      type="range"
                      min="5"
                      max="200"
                      value={settings.visual.fogNear}
                      onChange={(e) => updateVisual({ fogNear: parseInt(e.target.value) })}
                      disabled={disabled}
                    />
                    <span className="slider-value">{settings.visual.fogNear}</span>
                  </label>

                  <label className="settings-slider-row">
                    <span>Fog Far</span>
                    <input
                      type="range"
                      min="20"
                      max="500"
                      value={settings.visual.fogFar}
                      onChange={(e) => updateVisual({ fogFar: parseInt(e.target.value) })}
                      disabled={disabled}
                    />
                    <span className="slider-value">{settings.visual.fogFar}</span>
                  </label>

                  <label className="settings-slider-row">
                    <span>Starfield Density</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.visual.starfieldDensity * 100}
                      onChange={(e) => updateVisual({ starfieldDensity: parseInt(e.target.value) / 100 })}
                      disabled={disabled}
                    />
                    <span className="slider-value">{Math.round(settings.visual.starfieldDensity * 100)}%</span>
                  </label>

                  <label className="settings-toggle-row">
                    <input
                      type="checkbox"
                      checked={settings.visual.uncertaintyStatic}
                      onChange={(e) => updateVisual({ uncertaintyStatic: e.target.checked })}
                      disabled={disabled}
                    />
                    <span>Uncertainty Static</span>
                    <span className="settings-hint-inline">Noise on high-entropy tokens</span>
                  </label>

                  <label className="settings-toggle-row">
                    <input
                      type="checkbox"
                      checked={settings.visual.cameraAutoDrift}
                      onChange={(e) => updateVisual({ cameraAutoDrift: e.target.checked })}
                      disabled={disabled}
                    />
                    <span>Camera Auto-Drift</span>
                    <span className="settings-hint-inline">Rotates when idle</span>
                  </label>

                  <label className="settings-toggle-row">
                    <input
                      type="checkbox"
                      checked={settings.visual.dynamicBackground}
                      onChange={(e) => updateVisual({ dynamicBackground: e.target.checked })}
                      disabled={disabled}
                    />
                    <span>Dynamic Background</span>
                    <span className="settings-hint-inline">Fog shifts with confidence</span>
                  </label>
                </section>
              </div>
            )}
          </div>
        </div>
  );
}

// Re-export for backward compatibility during migration
export { DEFAULT_VISUAL as DEFAULT_VISUAL_SETTINGS };
