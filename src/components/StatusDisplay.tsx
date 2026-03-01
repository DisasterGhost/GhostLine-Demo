import React, { useMemo, useState, useEffect, useRef } from 'react';

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
// Drift Calculation
// ============================================================================

function computeDrift(trajectory: TrajectoryPoint[], windowSize: number = 5): number {
  if (trajectory.length < 2) return 0;

  // Get last N points
  const recent = trajectory.slice(-windowSize);
  if (recent.length < 2) return 0;

  // Compute average step distance
  let totalDist = 0;
  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1].coords;
    const curr = recent[i].coords;
    const dist = Math.sqrt(
      (curr[0] - prev[0]) ** 2 +
      (curr[1] - prev[1]) ** 2 +
      (curr[2] - prev[2]) ** 2
    );
    totalDist += dist;
  }

  const avgDist = totalDist / (recent.length - 1);

  // Normalize: 0-1 range. Based on observed typical distances.
  // Typical steps seem to be 0.1-2.0 units
  const normalized = Math.min(1, avgDist / 1.5);

  return normalized;
}

// ============================================================================
// Three-State Loop Detection (ECG for model brain death)
// ============================================================================
// 🟢 HEALTHY  — Normal generation
// 🟡 UNSTABLE — Threshold crossed but <5 consecutive tokens (model fighting)
// 🔴 LOCKED   — Threshold exceeded 5+ tokens (model surrendered)
// ============================================================================

type LoopState = 'healthy' | 'unstable' | 'locked';

interface LoopStatus {
  state: LoopState;
  avgDirectionChange: number;
  effectiveDim: number;
  violationCount: number;
}

// Persistent violation counter (survives re-renders via closure)
let persistentViolationCount = 0;
let lastTrajectoryLength = 0;

function detectLoop(trajectory: TrajectoryPoint[], windowSize: number = 10): LoopStatus {
  // Default: healthy
  const healthy: LoopStatus = {
    state: 'healthy',
    avgDirectionChange: 0,
    effectiveDim: 3,
    violationCount: 0
  };

  // Reset violation count if trajectory was cleared (new generation)
  if (trajectory.length < lastTrajectoryLength) {
    persistentViolationCount = 0;
  }
  lastTrajectoryLength = trajectory.length;

  if (trajectory.length < windowSize) return healthy;

  const recent = trajectory.slice(-windowSize);

  // --- Try to use backend-computed stats (preferred) ---
  const lastToken = recent[recent.length - 1];
  const backendStats = lastToken?.loopStats;

  let avgDirectionChange: number;
  let effectiveDim: number;

  if (backendStats && backendStats.avg_direction_change !== null) {
    // Use backend-computed stats (more accurate, computed over rolling window)
    avgDirectionChange = backendStats.avg_direction_change;
    effectiveDim = backendStats.activation_eff_dim;
  } else {
    // Fallback: compute locally from coords (for older data or prompt tokens)
    let totalAngle = 0;
    let angleCount = 0;

    for (let i = 2; i < recent.length; i++) {
      const p0 = recent[i - 2].coords;
      const p1 = recent[i - 1].coords;
      const p2 = recent[i].coords;

      const v1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
      const v2 = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];

      const mag1 = Math.sqrt(v1[0]**2 + v1[1]**2 + v1[2]**2);
      const mag2 = Math.sqrt(v2[0]**2 + v2[1]**2 + v2[2]**2);

      if (mag1 > 0.001 && mag2 > 0.001) {
        const dot = v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2];
        const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
        const angle = Math.acos(cosAngle) * (180 / Math.PI);
        totalAngle += angle;
        angleCount++;
      }
    }

    avgDirectionChange = angleCount > 0 ? totalAngle / angleCount : 0;

    // Compute effective dimensionality locally
    const coords = recent.map(p => p.coords);
    const mean = [0, 0, 0];
    for (const c of coords) {
      mean[0] += c[0]; mean[1] += c[1]; mean[2] += c[2];
    }
    mean[0] /= coords.length; mean[1] /= coords.length; mean[2] /= coords.length;

    const centered = coords.map(c => [c[0] - mean[0], c[1] - mean[1], c[2] - mean[2]]);

    const cov = [[0,0,0], [0,0,0], [0,0,0]];
    for (const c of centered) {
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          cov[i][j] += c[i] * c[j];
        }
      }
    }
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        cov[i][j] /= coords.length;
      }
    }

    const variances = [cov[0][0], cov[1][1], cov[2][2]];
    const totalVar = variances[0] + variances[1] + variances[2];

    effectiveDim = 3;
    if (totalVar > 0.0001) {
      const sumSq = variances[0]**2 + variances[1]**2 + variances[2]**2;
      effectiveDim = (totalVar ** 2) / sumSq;
    }
  }

  // --- Three-state logic with hysteresis ---
  // NOTE: 3D projection preserves variance across all dimensions, so projection_eff_dim (E3) stays ~3.0
  // even during loops. We primarily rely on direction change for detection.
  //
  // Thresholds for 3D projected space:
  // - Direction > 110° alone triggers (frequent sharp reversals = oscillating)
  // - Direction > 90° AND dim < 2.5 together trigger (moderate reversals + some collapse)
  // - Dim < 1.8 alone triggers (unusual linear collapse in 3D)
  const sharpReversals = avgDirectionChange > 110;        // High direction change alone
  const moderateReversals = avgDirectionChange > 90;      // Moderate reversals
  const someCollapse = effectiveDim < 2.5;                // Slight dimensional reduction
  const strongCollapse = effectiveDim < 1.8;              // Strong collapse (rare in 3D)

  // Trigger: sharp reversals alone, OR moderate reversals + some collapse, OR strong collapse
  const isViolating = sharpReversals || (moderateReversals && someCollapse) || strongCollapse;

  if (isViolating) {
    persistentViolationCount++;
  } else {
    // Decay slowly (human-friendly - doesn't flicker)
    persistentViolationCount = Math.max(0, persistentViolationCount - 0.5);
  }

  // Determine state
  let state: LoopState = 'healthy';
  if (persistentViolationCount >= 5) {
    state = 'locked';    // 🔴 Model has surrendered
  } else if (persistentViolationCount >= 1) {
    state = 'unstable';  // 🟡 Model is fighting the attractor
  }

  return {
    state,
    avgDirectionChange,
    effectiveDim,
    violationCount: Math.floor(persistentViolationCount)
  };
}

function getDriftLabel(drift: number): string {
  if (drift < 0.2) return 'focused';
  if (drift < 0.4) return 'coherent';
  if (drift < 0.6) return 'exploring';
  if (drift < 0.8) return 'wandering';
  return 'jumping';
}

// ============================================================================
// Drift Meter Component
// ============================================================================

function DriftMeter({ drift }: { drift: number }) {
  const dots = 5;
  const filledDots = Math.round(drift * dots);
  const label = getDriftLabel(drift);
  
  return (
    <div className="drift-meter">
      <span className="drift-label">Drift:</span>
      <span className="drift-dots">
        {Array.from({ length: dots }, (_, i) => (
          <span 
            key={i} 
            className={`drift-dot ${i < filledDots ? 'filled' : ''}`}
          >
            ●
          </span>
        ))}
      </span>
      <span className="drift-text">({label})</span>
    </div>
  );
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

  // Compute drift from trajectory
  const drift = useMemo(() => computeDrift(trajectory), [trajectory]);

  // Compute loop detection (12-token window = ~3 seconds at human playback speed)
  const loopStatus = useMemo(() => detectLoop(trajectory, 12), [trajectory]);

  // Get backend loop stats (preferred over local computation)
  const lastToken = trajectory[trajectory.length - 1];
  const backendLoopStats = lastToken?.loopStats;

  // Use backend state if available, otherwise fall back to local detection
  const effectiveState = backendLoopStats?.state?.toLowerCase() || loopStatus.state;
  const effectiveHeat = backendLoopStats?.heat ?? loopStatus.violationCount;
  const manifoldBreadth = backendLoopStats?.manifold_breadth ||
    (loopStatus.effectiveDim > 2.0 ? 'WIDE' :
     loopStatus.effectiveDim >= 1.5 ? 'FOCUSED' : 'NARROW');

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

      {/* Manifold Breadth - shows constraint level */}
      {trajectory.length >= 5 && (isGenerating || isBuffering) && (
        <div className={`manifold-breadth manifold-${manifoldBreadth.toLowerCase()}`}>
          <span className="manifold-label">Manifold:</span>
          <span className="manifold-value">{manifoldBreadth}</span>
          <span className="manifold-dim">({(loopStatus.effectiveDim ?? 0).toFixed(2)})</span>
        </div>
      )}

      {/* Recovery Flash - celebrates escape from attractor basin */}
      {showRecoveryFlash && (
        <div className="recovery-flash">
          <span className="recovery-icon">✓</span>
          <span className="recovery-text">SIGNAL RECOVERED</span>
        </div>
      )}

      {/* Three-State Loop Detection - ECG for model brain death */}
      {/* Debug: Always show loop stats during generation to calibrate thresholds */}
      {trajectory.length >= 10 && (isGenerating || isBuffering) && (
        <div className={`loop-stats-debug ${effectiveState !== 'healthy' ? 'warning' : ''}`}>
          <span>Loop: dim={(loopStatus.effectiveDim ?? 0).toFixed(2)} Δ={(loopStatus.avgDirectionChange ?? 0).toFixed(0)}° heat={effectiveHeat}</span>
        </div>
      )}
      {trajectory.length >= 10 && effectiveState !== 'healthy' && (
        <div className={`loop-alert loop-${effectiveState}`}>
          <span className="loop-icon">
            {effectiveState === 'locked' ? '🔴' : '🟡'}
          </span>
          <span className="loop-text">
            {effectiveState === 'locked' ? 'LOOP DETECTED' : 'SEMANTIC STUTTER'}
          </span>
          <span className="loop-stats">
            dim: {(loopStatus.effectiveDim ?? 0).toFixed(2)} | Δ: {(loopStatus.avgDirectionChange ?? 0).toFixed(0)}° | heat: {effectiveHeat}
          </span>
        </div>
      )}

      {/* Generating indicator - healthy state */}
      {(isGenerating || isBuffering) && effectiveState === 'healthy' && (
        <div className="generating">
          <span className="pulse">●</span>
          {isGenerating ? 'Generating...' : 'Playing back...'}
        </div>
      )}

      {/* Generating with unstable - yellow warning */}
      {(isGenerating || isBuffering) && effectiveState === 'unstable' && trajectory.length >= 10 && (
        <div className="generating loop-unstable-gen">
          <span className="pulse-warning">●</span>
          Generating (stuttering...)
        </div>
      )}

      {/* Generating with locked loop - red alert */}
      {(isGenerating || isBuffering) && effectiveState === 'locked' && trajectory.length >= 10 && (
        <div className="generating loop-locked-gen">
          <span className="pulse-danger">●</span>
          Generating (BRAIN DEATH)
        </div>
      )}
    </div>
  );
}
