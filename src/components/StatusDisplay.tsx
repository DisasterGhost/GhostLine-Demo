import React, { useState, useEffect, useRef } from 'react';

// =============================================================================
// HARDENING_TOGGLE - Security hardening (delete this block for raw output)
// =============================================================================
// When VITE_HARDENING_MODE=true, confidence/metrics are bucketed to categories.
// For research/development, keep VITE_HARDENING_MODE=false for raw precision.
// To find all hardening code: grep -r "HARDENING_TOGGLE" src/
const HARDENING_MODE = import.meta.env.VITE_HARDENING_MODE === 'true';

// Bucketing functions - HARDENING_TOGGLE
function bucketConfidence(confidence: number): string {
  if (confidence > 0.8) return "Strong";
  if (confidence > 0.5) return "Moderate";
  if (confidence > 0.3) return "Weak";
  return "Uncertain";
}

function bucketEntropy(entropy: number): string {
  if (entropy < 1.0) return "Focused";
  if (entropy < 2.0) return "Normal";
  if (entropy < 3.0) return "Diffuse";
  return "Scattered";
}

function bucketProjectionConfidence(projConf: number): string {
  if (projConf > 0.7) return "High";
  if (projConf > 0.4) return "Medium";
  return "Low";
}

import { getActiveStatePalette } from '../data/statePalettes';

// State colors — reads from active palette selection in settings
const STATE_COLORS = getActiveStatePalette();
// =============================================================================

// ============================================================================
// Types
// ============================================================================

interface SAEFeature {
  id: number;
  strength: number;
}

interface LoopStats {
  activation_eff_dim: number;  // E1: entropy-based, per single vector
  direction_change: number | null;
  avg_direction_change: number | null;
  state?: 'HEALTHY' | 'UNSTABLE' | 'LOCKED';
  heat?: number;
  manifold_breadth?: 'WIDE' | 'FOCUSED' | 'NARROW';
}

interface TrajectoryPoint {
  position: number;
  coords: [number, number, number];
  tokenProb: number;      // C1: top-1 token probability
  projectionConfidence?: number;  // k-NN projection quality (0-1)
  entropy: number;
  tokenStr: string;
  saeFeatures?: SAEFeature[];
  loopStats?: LoopStats;  // Backend-computed loop detection signals
  geometricState?: string;
  stateProbs?: Record<string, number>;
  projectedVelocity?: number;  // V1: 3D projected velocity
  layerVelocities?: Record<string, number>;
}

interface GenerationStats {
  tokensGenerated: number;
  avgLatency: number;
  totalTime: number;
}

interface GenerationConfig {
  model: string;
  prompt: string;
  temperature: number;
  maxTokens: number;
  extractionLayer?: number;
  attentionLayer?: number;
  nLayers?: number;
  hiddenDim?: number;
  saeAvailable?: boolean;
  lambdaDetail?: number;
}

interface PauseState {
  isPaused: boolean;
  pauseDuration: number;
  pauseIntensity: number;
  entropy: number;
  tokenProb: number;  // C1: top-1 token probability
}

// ============================================================================
// Component
// ============================================================================

interface StatusDisplayProps {
  isConnected: boolean;
  isGenerating: boolean;
  isBuffering: boolean;
  bufferSize: number;
  rawTokenCount: number;
  stats: GenerationStats | null;
  config: GenerationConfig | null;
  currentToken: TrajectoryPoint | null;
  trajectory?: TrajectoryPoint[];
  error: string | null;
  pauseState?: PauseState;
  onFlush?: () => void;
}

export function StatusDisplay({
  isConnected,
  isGenerating,
  isBuffering,
  bufferSize,
  rawTokenCount,
  stats,
  config,
  currentToken,
  trajectory = [],
  error,
  pauseState,
  onFlush,
}: StatusDisplayProps) {
  // Recovery flash state
  const [showRecoveryFlash, setShowRecoveryFlash] = useState(false);
  const prevStateRef = useRef<string | null>(null);

  // Get backend loop stats directly from the last token
  const lastToken = trajectory[trajectory.length - 1];
  const backendLoopStats = lastToken?.loopStats;

  // Use backend state only — no local fallback computation
  const effectiveState = backendLoopStats?.state?.toLowerCase() ?? 'healthy';
  const effectiveHeat = backendLoopStats?.heat ?? 0;
  const manifoldBreadth = backendLoopStats?.manifold_breadth;

  // Recovery flash effect
  useEffect(() => {
    const prevState = prevStateRef.current;
    const currentState = effectiveState;

    // Trigger flash on recovery from UNSTABLE or LOCKED to HEALTHY
    if (prevState && (prevState === 'unstable' || prevState === 'locked') && currentState === 'healthy') {
      setShowRecoveryFlash(true);
      const timer = setTimeout(() => setShowRecoveryFlash(false), 1500);
      return () => clearTimeout(timer);
    }

    prevStateRef.current = currentState;
  }, [effectiveState]);

  return (
    <div className="status-display">
      {/* Connection status */}
      <div className="connection">
        <span className={`dot ${isConnected ? 'connected' : 'demo'}`} />
        <span>{isConnected ? 'Connected' : 'Demo Mode'}</span>
      </div>

      {/* Model/Layer badge */}
      {config && (
        <div className="model-badge">
          <span className="model-name">{config.model}</span>
          {config.extractionLayer !== undefined && (
            <span className="layer-badge">
              Layer {config.extractionLayer}/{config.nLayers}
            </span>
          )}
          {config.hiddenDim && (
            <span className="dim-badge">{config.hiddenDim}D</span>
          )}
          {config.saeAvailable !== undefined && (
            <span className={`sae-badge ${config.saeAvailable ? 'active' : 'inactive'}`}>
              SAE {config.saeAvailable ? '✓' : '✗'}
            </span>
          )}
          {config.lambdaDetail !== undefined && (
            <span className="lambda-badge" title="Bifocal projection strength (0=smooth, 1.5=detailed)">
              Detail: {config.lambdaDetail.toFixed(1)}
            </span>
          )}
        </div>
      )}

      {/* Error */}
      {error && <div className="error">{error}</div>}

      {/* Buffer status */}
      {(isBuffering || bufferSize > 0) && (
        <div className="buffer-status">
          <span className="buffer-indicator">◐</span>
          <span>Buffer: {bufferSize} tokens</span>
          {onFlush && bufferSize > 0 && (
            <button className="flush-btn" onClick={onFlush}>
              Skip →
            </button>
          )}
        </div>
      )}

      {/* Uncertainty pause indicator (no redundant entropy — see SignalsPanel) */}
      {pauseState && isGenerating && pauseState.isPaused && (
        <div className={`pause-status paused`}>
          <span className="pause-indicator">
            ● UNCERTAIN {HARDENING_MODE ? '' : `(${(pauseState.pauseIntensity * 100).toFixed(0)}%)`}
          </span>
        </div>
      )}

      {/* Current token — compact, no redundant stats (see SignalsPanel for details) */}
      {currentToken && (
        <div className="current-token">
          <div className="token-text">
            <span className="label">Token:</span>
            <span className="value">{JSON.stringify(currentToken.tokenStr)}</span>
            <span className="token-pos">#{currentToken.position}</span>
          </div>
          {/* SAE Features */}
          {currentToken.saeFeatures && currentToken.saeFeatures.length > 0 && (
            <div className="sae-features">
              <span className="sae-label">SAE:</span>
              {currentToken.saeFeatures.slice(0, 3).map((f, i) => {
                const isGpt2Small = config?.model === 'gpt2-small';
                const npLink = isGpt2Small
                  ? `https://neuronpedia.org/gpt2-small/11-res-jb/${f.id}`
                  : null;

                return npLink ? (
                  <a
                    key={i}
                    className="sae-feature"
                    href={npLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Feature #${f.id} (${(f.strength * 100).toFixed(0)}%) - View on Neuronpedia`}
                  >
                    #{f.id}
                  </a>
                ) : (
                  <span
                    key={i}
                    className="sae-feature custom"
                    title={`Feature #${f.id} (${(f.strength * 100).toFixed(0)}%) - Custom SAE`}
                  >
                    #{f.id}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Progress during generation */}
      {isGenerating && (
        <div className="progress">
          <span>Received: {rawTokenCount}</span>
        </div>
      )}

      {/* Generation stats */}
      {stats && !isGenerating && !isBuffering && bufferSize === 0 && (
        <div className="stats">
          <span>{stats.tokensGenerated} tokens</span>
          <span>{(stats.avgLatency ?? 0).toFixed(0)}ms/tok</span>
          <span>{((stats.totalTime ?? 0) / 1000).toFixed(1)}s total</span>
        </div>
      )}

      {/* Recovery Flash - celebrates escape from attractor basin */}
      {showRecoveryFlash && (
        <div className="recovery-flash">
          <span className="recovery-icon">✓</span>
          <span className="recovery-text">RECOVERED</span>
        </div>
      )}

      {/* Loop/State Alert — uses backend-provided state directly */}
      {(isGenerating || isBuffering) && backendLoopStats && effectiveState !== 'healthy' && (
        <div className={`loop-alert loop-${effectiveState}`}>
          <span className="loop-icon">
            {effectiveState === 'locked' ? '🔴' : '🟡'}
          </span>
          <span className="loop-text">
            {effectiveState === 'locked' ? 'COGNITIVE COLLAPSE' : 'GENERATION DRIFT'}
          </span>
        </div>
      )}

      {/* Generating indicator — shown when healthy (alert replaces it otherwise) */}
      {(isGenerating || isBuffering) && effectiveState === 'healthy' && (
        <div className="generating">
          <span className="pulse">●</span>
          {isGenerating ? 'Generating...' : 'Playing back...'}
        </div>
      )}    </div>
  );
}
