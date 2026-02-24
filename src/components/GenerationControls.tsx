import React, { useState, useEffect } from 'react';

// ============================================================================
// Generation Config Type & Defaults
// ============================================================================

import type { HallucinationSampling } from '../hooks/useGhostwire';

export interface GenerationConfig {
  // Sampling
  temperature: number;       // 0.1 - 2.0, default 0.8
  topP: number;              // 0.0 - 1.0, default 1.0 (disabled)
  minP: number;              // 0.0 - 0.5, default 0.0 (disabled)
  frequencyPenalty: number;  // 0.0 - 2.0, default 0.0 (disabled)
  presencePenalty: number;   // 0.0 - 2.0, default 0.0 (disabled)
  repetitionPenalty: number; // 1.0 - 2.0, default 1.0 (disabled)
  seed: number | null;       // null = random
  mirostatMode: number;      // 0 = off, 2 = mirostat v2
  mirostatTau: number;       // 1.0 - 10.0, default 5.0
  mirostatEta: number;       // 0.01 - 0.5, default 0.1

  // Length
  maxTokens: number;         // 10 - 500, default 50

  // Context
  systemPrompt: string;      // Optional, prepended to user prompt

  // Visualization (Bifocal projection)
  lambdaDetail: number;      // 0.0 - 1.5, default 0.5 (local detail strength)

  // Hallucination detection
  hallucinationSampling: HallucinationSampling;
}

export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  temperature: 0.8,
  topP: 1.0,
  minP: 0.0,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
  repetitionPenalty: 1.0,
  seed: null,
  mirostatMode: 0,
  mirostatTau: 5.0,
  mirostatEta: 0.1,
  maxTokens: 150,
  systemPrompt: '',  // Empty = matches corpus training (no system prompt)
  lambdaDetail: 0.5,  // Bifocal projection: 0=pure k-NN, 0.5=default, 1.5=max detail
  hallucinationSampling: 'every_25',
};

const STORAGE_KEY = 'ghostline-generation-config';

// ============================================================================
// Persistence
// ============================================================================

export function loadGenerationConfig(): GenerationConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_GENERATION_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load generation config:', e);
  }
  return { ...DEFAULT_GENERATION_CONFIG };
}

export function saveGenerationConfig(config: GenerationConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save generation config:', e);
  }
}

// ============================================================================
// Presets
// ============================================================================

const TOKEN_PRESETS = [20, 30, 50, 75, 100, 150, 200];

// ============================================================================
// Component
// ============================================================================

interface GenerationControlsProps {
  config: GenerationConfig;
  onChange: (config: GenerationConfig) => void;
  disabled?: boolean;
}

export function GenerationControls({
  config,
  onChange,
  disabled = false,
}: GenerationControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Save config whenever it changes
  useEffect(() => {
    saveGenerationConfig(config);
  }, [config]);

  const update = (partial: Partial<GenerationConfig>) => {
    onChange({ ...config, ...partial });
  };

  const reset = () => {
    onChange({ ...DEFAULT_GENERATION_CONFIG });
  };

  return (
    <div className={`generation-controls ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Header - always visible */}
      <div className="generation-controls-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
        <span className="header-title">Generation Settings</span>
        <span className="header-summary">
          T={config.temperature} | TopP={config.topP === 1.0 ? 'off' : config.topP} | Detail={config.lambdaDetail} | {config.maxTokens} tokens
        </span>
        {isExpanded && (
          <button
            className="reset-btn"
            onClick={(e) => {
              e.stopPropagation();
              reset();
            }}
            title="Reset to defaults"
          >
            Reset
          </button>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="generation-controls-content">
          {/* System Prompt */}
          <div className="control-section system-prompt-section">
            <label className="control-label">
              System Prompt <span className="optional">(optional)</span>
            </label>
            <textarea
              className="system-prompt-input"
              value={config.systemPrompt}
              onChange={(e) => update({ systemPrompt: e.target.value })}
              placeholder="e.g., You are a helpful assistant that speaks like a pirate..."
              disabled={disabled}
              rows={2}
            />
          </div>

          {/* Sliders Row */}
          <div className="control-row sliders-row">
            {/* Temperature */}
            <div className="control-group">
              <label className="control-label">
                Temperature
                <span className="control-value">{config.temperature.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.05"
                value={config.temperature}
                onChange={(e) => update({ temperature: parseFloat(e.target.value) })}
                disabled={disabled}
                className="control-slider"
              />
              <div className="slider-labels">
                <span>Focused</span>
                <span>Creative</span>
              </div>
            </div>

            {/* Top P */}
            <div className="control-group">
              <label className="control-label">
                Top P (Nucleus)
                <span className="control-value">
                  {config.topP === 1.0 ? 'off' : config.topP.toFixed(2)}
                </span>
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={config.topP}
                onChange={(e) => update({ topP: parseFloat(e.target.value) })}
                disabled={disabled}
                className="control-slider"
              />
              <div className="slider-labels">
                <span>Narrow</span>
                <span>Full (off)</span>
              </div>
            </div>

            {/* Repetition Penalty */}
            <div className="control-group">
              <label className="control-label">
                Rep. Penalty
                <span className="control-value">
                  {config.repetitionPenalty === 1.0 ? 'off' : config.repetitionPenalty.toFixed(2)}
                </span>
              </label>
              <input
                type="range"
                min="1.0"
                max="2.0"
                step="0.05"
                value={config.repetitionPenalty}
                onChange={(e) => update({ repetitionPenalty: parseFloat(e.target.value) })}
                disabled={disabled}
                className="control-slider"
              />
              <div className="slider-labels">
                <span>Off</span>
                <span>Strong</span>
              </div>
            </div>

            {/* Lambda Detail (Bifocal Projection) */}
            <div className="control-group">
              <label className="control-label">
                Local Detail
                <span className="control-value">
                  {config.lambdaDetail === 0 ? 'off' : config.lambdaDetail.toFixed(1)}
                </span>
              </label>
              <input
                type="range"
                min="0.0"
                max="1.5"
                step="0.1"
                value={config.lambdaDetail}
                onChange={(e) => update({ lambdaDetail: parseFloat(e.target.value) })}
                disabled={disabled}
                className="control-slider"
              />
              <div className="slider-labels">
                <span>Smooth</span>
                <span>Detailed</span>
              </div>
            </div>
          </div>

          {/* Extended Sampling Parameters */}
          <div className="control-row sliders-row">
            {/* Min P */}
            <div className="control-group">
              <label className="control-label">
                Min P
                <span className="control-value">
                  {config.minP === 0 ? 'off' : config.minP.toFixed(2)}
                </span>
              </label>
              <input
                type="range"
                min="0.0"
                max="0.5"
                step="0.01"
                value={config.minP}
                onChange={(e) => update({ minP: parseFloat(e.target.value) })}
                disabled={disabled}
                className="control-slider"
              />
              <div className="slider-labels">
                <span>Off</span>
                <span>Strict</span>
              </div>
            </div>

            {/* Frequency Penalty */}
            <div className="control-group">
              <label className="control-label">
                Freq Penalty
                <span className="control-value">
                  {config.frequencyPenalty === 0 ? 'off' : config.frequencyPenalty.toFixed(1)}
                </span>
              </label>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.1"
                value={config.frequencyPenalty}
                onChange={(e) => update({ frequencyPenalty: parseFloat(e.target.value) })}
                disabled={disabled}
                className="control-slider"
              />
              <div className="slider-labels">
                <span>Off</span>
                <span>Strong</span>
              </div>
            </div>

            {/* Presence Penalty */}
            <div className="control-group">
              <label className="control-label">
                Pres Penalty
                <span className="control-value">
                  {config.presencePenalty === 0 ? 'off' : config.presencePenalty.toFixed(1)}
                </span>
              </label>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.1"
                value={config.presencePenalty}
                onChange={(e) => update({ presencePenalty: parseFloat(e.target.value) })}
                disabled={disabled}
                className="control-slider"
              />
              <div className="slider-labels">
                <span>Off</span>
                <span>Strong</span>
              </div>
            </div>
          </div>

          {/* Seed + Mirostat Row */}
          <div className="control-section seed-mirostat-section">
            <div className="control-row sliders-row">
              <div className="control-group">
                <label className="control-label">
                  Seed
                  <span className="control-value">{config.seed === null ? 'random' : config.seed}</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={config.seed ?? ''}
                  placeholder="random"
                  onChange={(e) => update({ seed: e.target.value === '' ? null : parseInt(e.target.value) })}
                  disabled={disabled}
                  className="control-seed-input"
                  style={{ width: '100%', padding: '4px 6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'rgba(255,255,255,0.9)', fontSize: '11px' }}
                />
              </div>
              <div className="control-group">
                <label className="control-label">
                  Mirostat
                  <span className="control-value">{config.mirostatMode === 0 ? 'off' : 'v2'}</span>
                </label>
                <select
                  value={config.mirostatMode}
                  onChange={(e) => update({ mirostatMode: parseInt(e.target.value) })}
                  disabled={disabled}
                  style={{ width: '100%', padding: '4px 6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'rgba(255,255,255,0.9)', fontSize: '11px' }}
                >
                  <option value={0}>Off</option>
                  <option value={2}>v2 (adaptive)</option>
                </select>
              </div>
            </div>
            {config.mirostatMode === 2 && (
              <div className="control-row sliders-row" style={{ marginTop: '6px' }}>
                <div className="control-group">
                  <label className="control-label">
                    Tau (target)
                    <span className="control-value">{config.mirostatTau.toFixed(1)}</span>
                  </label>
                  <input
                    type="range"
                    min="1.0"
                    max="10.0"
                    step="0.5"
                    value={config.mirostatTau}
                    onChange={(e) => update({ mirostatTau: parseFloat(e.target.value) })}
                    disabled={disabled}
                    className="control-slider"
                  />
                </div>
                <div className="control-group">
                  <label className="control-label">
                    Eta (rate)
                    <span className="control-value">{config.mirostatEta.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.01"
                    max="0.5"
                    step="0.01"
                    value={config.mirostatEta}
                    onChange={(e) => update({ mirostatEta: parseFloat(e.target.value) })}
                    disabled={disabled}
                    className="control-slider"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Hallucination Sampling */}
          <div className="control-section halluc-sampling-section">
            <label className="control-label">
              Halluc Detection
              <span className="control-value">{config.hallucinationSampling}</span>
            </label>
            <select
              className="halluc-sampling-select"
              value={config.hallucinationSampling}
              onChange={(e) => update({ hallucinationSampling: e.target.value as HallucinationSampling })}
              disabled={disabled}
            >
              <option value="disabled">Disabled</option>
              <option value="start_only">Start Only</option>
              <option value="start_mid_end">Start/Mid/End</option>
              <option value="every_25">Every 25 tokens</option>
              <option value="every_10">Every 10 tokens</option>
              <option value="every_token">Every token</option>
            </select>
          </div>

          {/* Max Tokens */}
          <div className="control-section tokens-section">
            <label className="control-label">
              Max Tokens
              <span className="control-value">{config.maxTokens}</span>
            </label>
            <div className="token-presets">
              {TOKEN_PRESETS.map((n) => (
                <button
                  key={n}
                  className={`token-preset-btn ${config.maxTokens === n ? 'active' : ''}`}
                  onClick={() => update({ maxTokens: n })}
                  disabled={disabled}
                >
                  {n}
                </button>
              ))}
            </div>
            <input
              type="range"
              min="10"
              max="300"
              step="10"
              value={config.maxTokens}
              onChange={(e) => update({ maxTokens: parseInt(e.target.value) })}
              disabled={disabled}
              className="control-slider tokens-slider"
            />
          </div>
        </div>
      )}
    </div>
  );
}
