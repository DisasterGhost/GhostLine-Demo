/**
 * SignalsPanel - Display validated high-D signals in real-time
 *
 * Shows REAL geometric signals from the LDA classifier and layer metrics.
 * The 3D display is a visual aid; these numbers are the validated evidence.
 *
 * Key systems (from calibration, Feb 2026):
 *   - Geometric state via LDA classifier (5 healthy + collapse)
 *   - Primary layer activation_eff_dim (E1) < 5.0 → Collapse (100% accuracy at 3B)
 *   - At 8B, early layers (L0, L4) naturally have low eff_dim — use primary layer
 *   - Hallucination ensemble: F1_macro=0.980 (full features, GroupKFold), F1=0.9405 (server-compat stress)
 */

import { useState, useEffect } from 'react';
import type { TrajectoryPoint } from '../hooks/useGhostwire';
import type { ProphecyData } from '../websocket';
import { useDraggable } from '../hooks/useDraggable';
import './SignalsPanel.css';

interface SignalsPanelProps {
  trajectory: TrajectoryPoint[];
  currentToken: number;
  selectedToken: number | null;
  isGenerating: boolean;
  prophecy?: ProphecyData | null;
  prophecyCorrect?: ProphecyCorrectType;
}

import { getActiveStatePalette } from '../data/statePalettes';

// State colors — reads from active palette selection in settings
const STATE_COLORS = getActiveStatePalette();

const STATE_LABELS: Record<string, string> = {
  creativity: 'CREATIVE',
  reasoning: 'REASONING',
  retrieval: 'RETRIEVAL',
  precision: 'PRECISION',
  uncertainty: 'UNCERTAIN',
  collapse: 'COLLAPSE',
  edge_cases: 'EDGE CASE',
};

// Rich prophecy verdict type (server sends object with verdict + metrics)
type ProphecyCorrectType = boolean | {
  // Legacy split mode
  any_correct?: boolean;
  attn_correct?: boolean | null;
  geo_correct?: boolean | null;
  // Rich evaluation (new)
  binary_match?: boolean;
  verdict?: string;           // "HIT" | "PARTIAL" | "MISS"
  weighted_presence?: number;  // Mean prob of predicted state across tokens
  peak_confidence?: number;    // Max prob achieved
  token_count?: number;        // Tokens where predicted was #1
  token_total?: number;        // Total tokens
  token_fraction?: number;     // token_count / total
} | null;

function getRichVerdict(correct: ProphecyCorrectType): string | null {
  if (typeof correct === 'object' && correct !== null && 'verdict' in correct) {
    return correct.verdict ?? null;
  }
  return null;
}

function getProphecyBannerClass(correct: ProphecyCorrectType): string {
  const rich = getRichVerdict(correct);
  if (rich === 'HIT') return 'prophecy-correct';
  if (rich === 'PARTIAL') return 'prophecy-partial';
  if (rich === 'MISS') return 'prophecy-wrong';
  // Legacy fallbacks
  if (correct === true) return 'prophecy-correct';
  if (correct === false) return 'prophecy-wrong';
  if (typeof correct === 'object' && correct !== null) {
    if ('any_correct' in correct) return correct.any_correct ? 'prophecy-correct' : 'prophecy-wrong';
    if ('binary_match' in correct) return correct.binary_match ? 'prophecy-correct' : 'prophecy-wrong';
  }
  return '';
}

function getVerdictClass(correct: ProphecyCorrectType): string {
  const rich = getRichVerdict(correct);
  if (rich === 'HIT') return 'correct';
  if (rich === 'PARTIAL') return 'partial';
  if (rich === 'MISS') return 'wrong';
  if (correct === true) return 'correct';
  if (correct === false) return 'wrong';
  if (typeof correct === 'object' && correct !== null && 'any_correct' in correct) {
    return correct.any_correct ? 'correct' : 'wrong';
  }
  return '';
}

function getVerdictLabel(correct: ProphecyCorrectType): string {
  if (typeof correct === 'object' && correct !== null && 'verdict' in correct) {
    const v = correct.verdict;
    const pct = correct.weighted_presence != null
      ? ` ${(correct.weighted_presence * 100).toFixed(0)}%`
      : '';
    const count = correct.token_count != null && correct.token_total != null
      ? ` (${correct.token_count}/${correct.token_total})`
      : '';
    if (v === 'HIT') return `HIT${pct}`;
    if (v === 'PARTIAL') return `PARTIAL${pct}${count}`;
    if (v === 'MISS') return `MISS${pct}`;
    return v || '';
  }
  // Legacy
  if (correct === true) return 'CORRECT';
  if (correct === false) return 'MISS';
  if (typeof correct === 'object' && correct !== null && 'any_correct' in correct) {
    if (correct.attn_correct && correct.geo_correct) return 'BOTH HIT';
    if (correct.attn_correct) return 'ATTN HIT';
    if (correct.geo_correct) return 'GEO HIT';
    return 'BOTH MISS';
  }
  return '';
}

const MODE_LABELS: Record<string, string> = {
  consensus: 'CONSENSUS',
  override_geo: 'GEO',
  override_attn: 'ATTN',
  evolving: 'EVOLVING',
};

export function SignalsPanel({
  trajectory,
  currentToken,
  selectedToken,
  isGenerating,
  prophecy,
  prophecyCorrect,
}: SignalsPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => window.innerWidth <= 768);
  const isMobile = window.innerWidth <= 768;
  const { dragStyle, dragHandleProps, wasDragged } = useDraggable('signals-panel');
  const mobileDragStyle = isMobile ? {} : dragStyle;
  const mobileDragProps = isMobile ? {} : dragHandleProps;

  // Auto-collapse on mobile when generation starts
  useEffect(() => {
    if (isMobile && isGenerating) {
      setIsCollapsed(true);
    }
  }, [isMobile, isGenerating]);

  // Get the token to display signals for
  // Look up by position, not array index — prompt tokens prepended shift indices
  const displayPosition = selectedToken ?? currentToken;
  const token = trajectory.find(t => t.position === displayPosition) ?? trajectory[trajectory.length - 1];

  // Extract real signals from token data
  const entropy = token?.logitEntropy ?? token?.entropy ?? 0;
  const tokenProb = token?.tokenProb ?? 0;  // C1
  const effDim = token?.loopStats?.activation_eff_dim ?? 0;  // E1
  const geometricState = token?.geometricState || 'unknown';  // LDA/SCL primary
  const dtState = token?.dtState || null;                      // DT secondary comparison
  const stateProbs = token?.stateProbs || {};
  const layerEffDims = token?.layerEffDims || {};

  // Collapse detection: use primary layer eff_dim (NOT hardcoded L4)
  // The 3B threshold of 5.0 was validated at L4, but at 8B early layers (L0, L4)
  // naturally have low eff_dim even during healthy reasoning. Primary layer (L16 at 8B,
  // L12 at 3B) is the correct signal — true collapse drives ALL layers below 5.0.
  const isCollapse = effDim > 0 && effDim < 5.0;

  // State display
  const stateLabel = isCollapse ? 'COLLAPSE' : (STATE_LABELS[geometricState] || geometricState.toUpperCase());
  const stateColor = isCollapse ? '#ff0000' : (STATE_COLORS[geometricState] || '#888888');

  // Sort state probs for display
  const sortedProbs = Object.entries(stateProbs)
    .sort(([, a], [, b]) => b - a);

  if (isCollapsed) {
    return (
      <div className="signals-panel collapsed" style={mobileDragStyle} onClick={() => { if (!wasDragged()) setIsCollapsed(false); }} {...mobileDragProps}>
        <span className="signals-state" style={{ color: stateColor }}>
          {stateLabel}
        </span>
        <span className="signals-expand">&#9654;</span>
      </div>
    );
  }

  return (
    <div className="signals-panel" style={mobileDragStyle}>
      <div className="signals-header drag-handle" {...mobileDragProps}>
        <h3>Validated Signals</h3>
        <button className="signals-collapse" onClick={(e) => { e.stopPropagation(); setIsCollapsed(true); }}>&#9664;</button>
      </div>

      {/* Awaiting playback overlay */}
      {!token && (
        <div style={{ padding: '24px 16px', textAlign: 'center', color: '#888', fontSize: '14px' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>▶</div>
          Press play to begin monitoring
        </div>
      )}

      {/* Prophecy banner (pre-generation prediction — dual prophecy system) */}
      {prophecy && (prophecy.predicted_state || prophecy.mode === 'split') && (
        <div className={`signals-prophecy ${getProphecyBannerClass(prophecyCorrect)}`}>
          <div className="prophecy-header">
            <span className="prophecy-label">
              PROPHECY
              {prophecy.mode && prophecy.mode !== 'single' && MODE_LABELS[prophecy.mode] && (
                <span className="prophecy-mode"> ({MODE_LABELS[prophecy.mode]})</span>
              )}
            </span>
            {prophecyCorrect != null && (
              <span className={`prophecy-verdict ${getVerdictClass(prophecyCorrect)}`}>
                {getVerdictLabel(prophecyCorrect)}
              </span>
            )}
          </div>

          {prophecy.mode === 'split' ? (
            /* Split view: two predictions side by side */
            <div className="prophecy-split">
              <div className="prophecy-split-half">
                <span className="prophecy-source-label">ATTN</span>
                <span
                  className="prophecy-state"
                  style={{ color: STATE_COLORS[prophecy.attn_prediction?.state ?? ''] || '#888' }}
                >
                  {STATE_LABELS[prophecy.attn_prediction?.state ?? ''] || prophecy.attn_prediction?.state?.toUpperCase() || '?'}
                </span>
                <span className="prophecy-confidence">
                  {prophecy.attn_prediction?.confidence != null
                    ? `${(prophecy.attn_prediction.confidence * 100).toFixed(0)}%`
                    : ''}
                </span>
              </div>
              <div className="prophecy-split-divider" />
              <div className="prophecy-split-half">
                <span className="prophecy-source-label">GEO</span>
                <span
                  className="prophecy-state"
                  style={{ color: STATE_COLORS[prophecy.geo_prediction?.state ?? ''] || '#888' }}
                >
                  {STATE_LABELS[prophecy.geo_prediction?.state ?? ''] || prophecy.geo_prediction?.state?.toUpperCase() || '?'}
                </span>
                <span className="prophecy-confidence">
                  {prophecy.geo_prediction?.confidence != null
                    ? `${(prophecy.geo_prediction.confidence * 100).toFixed(0)}%`
                    : ''}
                </span>
              </div>
            </div>
          ) : (
            /* Consensus / override / single view */
            <div className="prophecy-prediction">
              <span
                className="prophecy-state"
                style={{ color: STATE_COLORS[prophecy.predicted_state ?? ''] || '#888' }}
              >
                {STATE_LABELS[prophecy.predicted_state ?? ''] || prophecy.predicted_state?.toUpperCase() || '?'}
              </span>
              {prophecy.confidence != null && (
                <span className="prophecy-confidence">
                  {(prophecy.confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
          )}

          {prophecy.halluc_risk != null && prophecy.halluc_risk > 0.3 && (
            <div className="prophecy-halluc-warning" style={{
              color: prophecy.halluc_risk > 0.8 ? '#ff3333'
                : prophecy.halluc_risk > 0.5 ? '#ff9900' : '#ffcc00',
            }}>
              Halluc Risk: {(prophecy.halluc_risk * 100).toFixed(0)}%
            </div>
          )}
          {prophecy.refuse_prob != null && prophecy.refuse_prob > 0.3 && (
            <div className="prophecy-halluc-warning" style={{
              color: prophecy.refuse_prob > 0.8 ? '#9999ff'
                : prophecy.refuse_prob > 0.5 ? '#7777dd' : '#666699',
            }}>
              Refusal: {(prophecy.refuse_prob * 100).toFixed(0)}%
            </div>
          )}
        </div>
      )}

      {/* Primary state indicator (LDA/SCL — continuous geometry, r(T,C)=0.9769) */}
      <div className="signals-state-row">
        <span className="signals-state-label">SCL:</span>
        <span className="signals-state" style={{ color: stateColor }}>
          {stateLabel}
        </span>
      </div>

      {/* DT comparison (discrete classifier, 95.4% adjusted accuracy) */}
      {dtState && (
        <div className="signals-state-row signals-dt-row">
          <span className="signals-state-label">DT:</span>
          <span
            className="signals-state"
            style={{
              color: STATE_COLORS[dtState] || '#888',
              opacity: 0.7,
            }}
          >
            {(STATE_LABELS[dtState] || dtState.toUpperCase())}
            {token?.dtConfidence != null && (
              <span style={{ fontSize: '9px', marginLeft: '4px', opacity: 0.7 }}>
                {(token.dtConfidence * 100).toFixed(0)}%
              </span>
            )}
          </span>
          {dtState !== geometricState && geometricState !== 'unknown' && (
            <span className="signals-dt-disagree" title="SCL and DT disagree">!</span>
          )}
        </div>
      )}

      {/* Hallucination Risk Meter */}
      <div className="signals-halluc-risk">
        <div className="halluc-risk-header">
          <span className="halluc-risk-label">Halluc Risk</span>
          <span className="halluc-risk-value" style={{
            color: (token?.hallucinationRisk ?? 0) > 0.8 ? '#ff3333'
              : (token?.hallucinationRisk ?? 0) > 0.5 ? '#ff9900'
              : (token?.hallucinationRisk ?? 0) > 0.3 ? '#ffcc00'
              : '#33ff66',
          }}>
            {token?.hallucinationRisk != null
              ? `${(token.hallucinationRisk * 100).toFixed(0)}%`
              : '---'}
          </span>
        </div>
        <div className="halluc-risk-bar-container">
          <div
            className={`halluc-risk-bar ${(token?.hallucinationRisk ?? 0) > 0.8 ? 'halluc-risk-critical' : ''}`}
            style={{
              width: token?.hallucinationRisk != null
                ? `${Math.min(100, token.hallucinationRisk * 100)}%`
                : '0%',
              background: `linear-gradient(90deg,
                #33ff66 0%,
                #ffcc00 40%,
                #ff9900 65%,
                #ff3333 85%)`,
            }}
          />
        </div>
        {token?.hallucinationCheckpoint && (
          <span className="halluc-checkpoint-indicator" title="Ensemble checkpoint this token">&#x2022;</span>
        )}
      </div>

      {/* Refusal Probability (V7 3-class) */}
      {token?.refusalProb != null && token.refusalProb > 0.1 && (
        <div className="signals-refuse-prob">
          <div className="refuse-prob-header">
            <span className="refuse-prob-label">Refusal</span>
            <span className="refuse-prob-value" style={{
              color: token.refusalProb > 0.8 ? '#9999ff'
                : token.refusalProb > 0.5 ? '#7777dd' : '#666699',
            }}>
              {(token.refusalProb * 100).toFixed(0)}%
            </span>
          </div>
          <div className="halluc-risk-bar-container">
            <div
              className="halluc-risk-bar"
              style={{
                width: `${Math.min(100, token.refusalProb * 100)}%`,
                background: 'linear-gradient(90deg, #444477 0%, #7777dd 50%, #9999ff 100%)',
              }}
            />
          </div>
        </div>
      )}

      {/* Token info */}
      <div className="signals-token-info">
        Token #{displayPosition}: <code>{token?.tokenStr || '...'}</code>
        {selectedToken !== null && <span className="signals-selected">(selected)</span>}
      </div>

      {/* State probability distribution */}
      {sortedProbs.length > 0 && (
        <div className="signals-probs">
          {sortedProbs.map(([state, prob]) => (
            <div key={state} className="prob-row">
              <span className="prob-label" style={{ color: STATE_COLORS[state] || '#888' }}>
                {state.slice(0, 4)}
              </span>
              <div className="prob-bar-container">
                <div
                  className="prob-bar"
                  style={{
                    width: `${(prob as number) * 100}%`,
                    backgroundColor: STATE_COLORS[state] || '#888',
                    opacity: (prob as number) > 0.1 ? 1 : 0.4,
                  }}
                />
              </div>
              <span className="prob-value">{((prob as number) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Signal bars */}
      <div className="signals-grid">
        {/* L0 Entropy - calibrated for 8B models (higher baseline entropy) */}
        <div className="signal-row">
          <div className="signal-label">
            <span>Entropy</span>
          </div>
          <div className="signal-bar-container">
            <div
              className={`signal-bar ${entropy > 4.0 ? 'over-threshold' : ''}`}
              style={{
                width: `${Math.min(100, (entropy / 5.0) * 100)}%`,
                backgroundColor: entropy > 4.0 ? '#ff3333' : entropy > 3.0 ? '#ff9900' : '#33ff66',
              }}
            />
          </div>
          <div className="signal-value">
            {entropy.toFixed(2)}
          </div>
        </div>

        {/* Confidence */}
        <div className="signal-row">
          <div className="signal-label">
            <span>Token Prob</span>
          </div>
          <div className="signal-bar-container">
            <div
              className="signal-bar"
              style={{
                width: `${tokenProb * 100}%`,
                backgroundColor: tokenProb > 0.8 ? '#33ff66' : tokenProb > 0.5 ? '#ffcc00' : '#ff9900',
              }}
            />
          </div>
          <div className="signal-value">
            {(tokenProb * 100).toFixed(1)}%
          </div>
        </div>

        {/* Eff Dim (primary layer) */}
        <div className="signal-row">
          <div className="signal-label">
            <span>Act. Spread</span>
          </div>
          <div className="signal-bar-container">
            <div
              className={`signal-bar ${effDim < 5.0 ? 'under-threshold' : ''}`}
              style={{
                width: `${Math.min(100, (effDim / 20) * 100)}%`,
                backgroundColor: effDim < 5.0 ? '#ff3333' : effDim < 10 ? '#ff9900' : '#33ff66',
              }}
            />
          </div>
          <div className="signal-value">
            {effDim.toFixed(1)}
          </div>
        </div>

        {/* Layer Eff Dims - compact multi-layer view */}
        {Object.keys(layerEffDims).length > 0 && (
          <div className="signal-row layer-dims">
            <div className="signal-label">
              <span>Layers</span>
            </div>
            <div className="layer-dim-bars">
              {Object.entries(layerEffDims)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([layer, dim]) => (
                  <div key={layer} className="layer-dim-bar" title={`L${layer}: ${(dim as number).toFixed(1)}`}>
                    <div
                      className="layer-dim-fill"
                      style={{
                        height: `${Math.min(100, ((dim as number) / 20) * 100)}%`,
                        backgroundColor: (dim as number) < 5.0 ? '#ff3333' : (dim as number) < 10 ? '#ff9900' : '#33ff66',
                      }}
                    />
                    <span className="layer-dim-label">L{layer}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Intervention indicator */}
      {token?.intervention && (
        <div className="signals-intervention">
          <span className="intervention-icon">&#x26A1;</span>
          <span>{(token.intervention as any).type}: {(token.intervention as any).trigger}</span>
        </div>
      )}

      {/* Evidence note */}
      <div className="signals-footer">
        <small>
          DT: 55-feat, 95.4% adj-acc (primary). LDA: r(T,C)=0.955, 71% cls-acc. Halluc: F1=0.980 (macro, GroupKFold).
        </small>
      </div>
    </div>
  );
}

export default SignalsPanel;
