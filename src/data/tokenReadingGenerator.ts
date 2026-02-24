// ============================================================================
// Token Reading Generator
// ============================================================================
// Generates natural-language reading segments from a TrajectoryPoint.
// No React dependencies — pure function.

import type { TrajectoryPoint } from '../hooks/usePlaybackBuffer';

export interface ReadingSegment {
  type: 'text' | 'term' | 'value' | 'state';
  content: string;
  wikiId?: string;
  color?: string;
}

import { getActiveStatePalette } from './statePalettes';

const STATE_COLORS = getActiveStatePalette();

const STATE_WIKI_IDS: Record<string, string> = {
  creativity: 'state-creativity',
  reasoning: 'state-reasoning',
  retrieval: 'state-retrieval',
  precision: 'state-precision',
  uncertainty: 'state-uncertainty',
  stressed: 'state-stressed',
  collapse: 'state-collapse',
};

function describeEffDim(val: number): string {
  // Scale-aware: 3B activation_eff_dim ~5-40, 8B activation_eff_dim ~15-200+
  // Auto-detect scale: 8B values typically > 50 for healthy states
  if (val < 5) return 'critically low';
  if (val < 15) return 'low';
  if (val < 40) return 'moderate';
  if (val < 80) return 'moderate-high';
  if (val < 150) return 'high';
  return 'very high';
}

function describeVelocity(val: number): string {
  // 3D projected velocity: typical range 0.9-4.0, mean ~2.2
  if (val < 1.5) return 'low';
  if (val < 2.5) return 'moderate';
  if (val < 3.5) return 'high';
  return 'very high';
}

function describeConfidence(val: number): string {
  if (val > 0.8) return 'high';
  if (val > 0.5) return 'moderate';
  if (val > 0.2) return 'low';
  return 'very low';
}

export function generateTokenReading(token: TrajectoryPoint): ReadingSegment[] {
  const segments: ReadingSegment[] = [];
  const state = token.geometricState || 'unknown';
  const stateProbs = token.stateProbs || {};
  const topProb = stateProbs[state] ?? 0;
  const effDim = token.loopStats?.activation_eff_dim ?? 0;  // E1
  const velocity = token.projectedVelocity ?? 0;  // V1
  const tokenProb = token.tokenProb ?? 0;  // C1
  const entropy = token.entropy ?? 0;
  const crystallized = token.crystallized ?? false;
  const isCollapse = effDim > 0 && effDim < 5.0;

  // Sentence 1: State
  const displayState = isCollapse ? 'collapse' : state;
  const displayProb = isCollapse ? 100 : Math.round(topProb * 100);

  segments.push({ type: 'text', content: 'Token ' });
  segments.push({ type: 'value', content: `"${token.tokenStr}"` });
  segments.push({ type: 'text', content: ' is in a ' });
  segments.push({
    type: 'state',
    content: displayState,
    wikiId: STATE_WIKI_IDS[displayState],
    color: STATE_COLORS[displayState] || '#888',
  });
  segments.push({ type: 'text', content: ` state (${displayProb}%). ` });

  // Sentence 2: Eff dim
  if (effDim > 0) {
    segments.push({ type: 'text', content: 'Its ' });
    segments.push({ type: 'term', content: 'effective dimensionality', wikiId: 'eff-dim' });
    segments.push({ type: 'text', content: ` is ${effDim.toFixed(1)} (${describeEffDim(effDim)}), ` });
    segments.push({ type: 'text', content: 'reflecting ' });
    segments.push({ type: 'term', content: 'manifold', wikiId: 'activation-manifold' });
    segments.push({ type: 'text', content: ' complexity. ' });
  }

  // Sentence 3: Velocity
  if (velocity > 0) {
    segments.push({ type: 'term', content: 'Activation velocity', wikiId: 'velocity' });
    segments.push({ type: 'text', content: ` is ${describeVelocity(velocity)} (${velocity.toFixed(1)}). ` });
  }

  // Sentence 4: Crystallization/token probability
  if (crystallized) {
    segments.push({ type: 'text', content: 'The model has ' });
    segments.push({ type: 'term', content: 'crystallized', wikiId: 'crystallization' });
    segments.push({ type: 'text', content: ` on this prediction with ${describeConfidence(tokenProb)} ` });
    segments.push({ type: 'term', content: 'token probability', wikiId: 'token-prob' });
    segments.push({ type: 'text', content: ` (${(tokenProb * 100).toFixed(0)}%). ` });
  } else {
    segments.push({ type: 'term', content: 'Token probability', wikiId: 'token-prob' });
    segments.push({ type: 'text', content: ` is ${describeConfidence(tokenProb)} (${(tokenProb * 100).toFixed(0)}%) ` });
    segments.push({ type: 'text', content: `with ` });
    segments.push({ type: 'term', content: 'entropy', wikiId: 'entropy' });
    segments.push({ type: 'text', content: ` at ${entropy.toFixed(2)}. ` });
  }

  // Sentence 5: Alert for stressed/collapse
  if (isCollapse) {
    segments.push({ type: 'text', content: 'WARNING: ' });
    segments.push({ type: 'term', content: 'Collapse', wikiId: 'state-collapse' });
    segments.push({ type: 'text', content: ' detected — activation effective dimensionality (E1) has crashed below 5.0.' });
  } else if (state === 'stressed') {
    segments.push({ type: 'text', content: 'Alert: Geometric ' });
    segments.push({ type: 'term', content: 'stress', wikiId: 'state-stressed' });
    segments.push({ type: 'text', content: ' detected — the residual stream shows abnormal geometry.' });
  }

  return segments;
}
