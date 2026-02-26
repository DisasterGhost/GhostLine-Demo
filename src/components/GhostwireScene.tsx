import React, { useRef, useMemo, useState, useCallback, useEffect, createContext, useContext } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls as DreiOrbitControls, Stars, Text, Billboard } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Landmarks } from './Landmarks';
import type { VisualSettings } from './SettingsPanel';
import { DEFAULT_VISUAL_SETTINGS } from './SettingsPanel';
import { getStatePaletteColors, type StatePaletteId } from '../data/statePalettes';

// ============================================================================
// WebGPU Detection (for future use)
// ============================================================================

const checkWebGPUSupport = async (): Promise<boolean> => {
  if (typeof navigator === 'undefined' || !navigator.gpu) return false;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
};

// Log WebGPU support on load (prep for future WebGPU renderer)
checkWebGPUSupport().then(supported => {
  console.log(`[GhostLine] WebGPU available: ${supported}`);
  console.log(`[GhostLine] Using: WebGL (WebGPU integration planned)`);
});

// ============================================================================
// Types
// ============================================================================

interface LoopStats {
  activation_eff_dim: number;  // E1
  direction_change: number | null;
  avg_direction_change: number | null;
}

interface TrajectoryPoint {
  position: number;
  coords: [number, number, number];
  tokenProb: number;       // C1: top-1 token probability
  entropy: number;
  tokenStr: string;
  timestamp: number;
  tokenId: number;
  residualNorm: number;
  isPrompt?: boolean;  // true for prompt tokens
  attentionArcs?: Array<{
    from: number;
    to: number;
    weight: number;
    head: number;
    pattern_type?: 'self' | 'local' | 'long_range' | 'diffuse';  // NEW: behavioral classification
  }>;
  projectionConfidence?: number;           // k-NN confidence in 3D position
  loopStats?: LoopStats;                   // Backend-computed loop detection stats
  geometricState?: string;                 // LDA-predicted state
  stateProbs?: Record<string, number>;     // Probability vector from LDA
  layerEffDims?: Record<string, number>;   // E1 per-layer activation effective dimensions
  projectedVelocity?: number;              // V1: 3D projected velocity
  layerNorms?: Record<string, number>;     // Per-layer residual norms
  layerVelocities?: Record<string, number>; // Per-layer high-D velocity
  crystallized?: boolean;                  // top1_prob >= 0.5
  layer_coords?: Record<string, [number, number, number]>;  // Pre-computed coords per layer
  _prevCoords?: [number, number, number];  // Previous layer position (for transition animation)
  _transitionKeyframes?: Array<[number, number, number]>;  // Multi-layer transition path
}

interface PauseState {
  isPaused: boolean;
  pauseDuration: number;
  pauseIntensity: number;
  entropy?: number;
  tokenProb?: number;  // C1
}

// ============================================================================
// Layer Transition Animation
// ============================================================================

export interface LayerTransitionState {
  active: boolean;
  startTime: number;
  duration: number;           // Total animation duration
  tokenCount: number;         // Total tokens (for stagger calculation)
  keyframeCount: number;      // Number of keyframe segments (1 = simple lerp)
  tokenAnimDuration: number;  // How long each token animates per phase
  phaseDuration: number;      // Full cascade duration per phase
  beatDuration: number;       // Pause between phases (multi-layer only)
}

// Shared ref for layer transition — read by all scene components in useFrame
const LayerTransitionContext = createContext<React.RefObject<LayerTransitionState>>(
  { current: { active: false, startTime: 0, duration: 2500, tokenCount: 0, keyframeCount: 1,
    tokenAnimDuration: 600, phaseDuration: 2500, beatDuration: 0 } } as React.RefObject<LayerTransitionState>
);

function useLayerTransition() {
  return useContext(LayerTransitionContext);
}

// Ease-out cubic — snappy arrival, like dominos settling
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Compute animated coords for a point during layer transition
// Phase-based: each layer step is a full cascade, with a beat (pause) between phases
// tokenIndex controls the stagger: earlier tokens move first (domino cascade)
function getAnimatedCoords(
  point: TrajectoryPoint,
  transitionRef: React.RefObject<LayerTransitionState>,
  tokenIndex: number = 0,
): [number, number, number] {
  const t = transitionRef.current;
  if (!t || !t.active) return point.coords;

  const keyframes = point._transitionKeyframes;
  const hasKeyframes = keyframes && keyframes.length >= 2;

  if (!hasKeyframes && !point._prevCoords) return point.coords;

  const elapsed = Date.now() - t.startTime;
  const endPos = hasKeyframes ? keyframes[keyframes.length - 1] : point.coords;

  // Done — at final position
  if (elapsed >= t.duration) return endPos;

  // Token stagger within each phase
  const staggerRange = Math.max(0, t.phaseDuration - t.tokenAnimDuration);
  const tokenDelay = t.tokenCount > 1 ? (tokenIndex / (t.tokenCount - 1)) * staggerRange : 0;

  if (hasKeyframes) {
    // Phase-based multi-keyframe animation
    // Each phase: domino cascade to next layer, then beat (pause)
    const numPhases = keyframes.length - 1;
    const phaseWithBeat = t.phaseDuration + t.beatDuration;

    for (let phase = 0; phase < numPhases; phase++) {
      const phaseStart = phase * phaseWithBeat;
      const cascadeEnd = phaseStart + t.phaseDuration;
      // Last phase has no beat after it
      const beatEnd = phase < numPhases - 1 ? phaseStart + phaseWithBeat : cascadeEnd;

      if (elapsed < cascadeEnd) {
        // In cascade of this phase — apply per-token stagger
        const tokenElapsed = elapsed - phaseStart - tokenDelay;
        if (tokenElapsed <= 0) return keyframes[phase];
        if (tokenElapsed >= t.tokenAnimDuration) return keyframes[phase + 1];
        const progress = easeOutCubic(tokenElapsed / t.tokenAnimDuration);
        const from = keyframes[phase];
        const to = keyframes[phase + 1];
        return [
          from[0] + (to[0] - from[0]) * progress,
          from[1] + (to[1] - from[1]) * progress,
          from[2] + (to[2] - from[2]) * progress,
        ];
      } else if (elapsed < beatEnd) {
        // In beat period — all tokens settled at this keyframe
        return keyframes[phase + 1];
      }
    }
    return endPos;
  }

  // Simple two-point lerp (single layer jump) — one phase, no beat
  const tokenElapsed = elapsed - tokenDelay;
  if (tokenElapsed <= 0) return point._prevCoords!;
  if (tokenElapsed >= t.tokenAnimDuration) return endPos;

  const progress = easeOutCubic(tokenElapsed / t.tokenAnimDuration);
  return [
    point._prevCoords![0] + (endPos[0] - point._prevCoords![0]) * progress,
    point._prevCoords![1] + (endPos[1] - point._prevCoords![1]) * progress,
    point._prevCoords![2] + (endPos[2] - point._prevCoords![2]) * progress,
  ];
}

// ============================================================================
// Configuration
// ============================================================================

const SMOOTHING = {
  trailFadeDuration: 5000,
  trailMaxPoints: 500,
};

// Smoothing level to lerp factor multiplier
// Higher = faster response, lower = smoother but laggier
function getSmoothingFactor(level: 'smooth' | 'balanced' | 'reactive' | 'raw'): number {
  switch (level) {
    case 'smooth': return 0.08;    // Very smooth, ~12 frames to settle
    case 'balanced': return 0.3;   // Balanced, crisp but readable
    case 'reactive': return 0.6;   // Quick response
    case 'raw': return 1.0;        // Instant, no interpolation
    default: return 0.3;
  }
}

const COLORS = {
  background: '#050510',
  trailBase: '#7eb8ff',
  pauseColor: '#f0a030',    // Amber - "thinking/processing" not "error"
  selectedColor: '#00ffaa',
};

// Entropy now uses CONTINUOUS mapping (0-5 scale).
// No hard threshold - visual effects scale linearly with entropy.
// Kept for backwards compatibility with particle effects.
const ENTROPY_MAX = 5.0;

// ============================================================================
// Custom OrbitControls (ref-based to survive re-renders)
// ============================================================================

interface StableOrbitControlsProps {
  autoDrift?: boolean;
  trajectory?: TrajectoryPoint[];
}

function StableOrbitControls({ autoDrift = false, trajectory = [] }: StableOrbitControlsProps) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<ThreeOrbitControls | null>(null);
  const userInteracting = useRef(false);
  const lastInteraction = useRef(0);
  const hasCentered = useRef(false);
  const lastTrajectoryLength = useRef(0);
  
  useEffect(() => {
    const controls = new ThreeOrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minDistance = 0.5;
    controls.maxDistance = 150;
    controls.zoomSpeed = 3.0;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;
    
    // Track user interaction to pause auto-drift
    const onStart = () => {
      userInteracting.current = true;
      lastInteraction.current = Date.now();
    };
    const onEnd = () => {
      userInteracting.current = false;
      lastInteraction.current = Date.now();
    };
    
    controls.addEventListener('start', onStart);
    controls.addEventListener('end', onEnd);
    
    return () => {
      controls.removeEventListener('start', onStart);
      controls.removeEventListener('end', onEnd);
      controls.dispose();
    };
  }, [camera, gl]);
  
  useFrame(({ clock }) => {
    if (!controlsRef.current) return;
    
    // Auto-drift: gentle rotation when user isn't interacting
    // Only activate after 3 seconds of inactivity
    if (autoDrift && !userInteracting.current) {
      const timeSinceInteraction = Date.now() - lastInteraction.current;
      if (timeSinceInteraction > 3000) {
        // Gentle orbit - visible but not distracting
        const driftSpeed = 0.003;  // ~10x faster than original
        // Ease in the drift over 2 seconds after inactivity
        const easeIn = Math.min(1, (timeSinceInteraction - 3000) / 2000);
        controlsRef.current.autoRotate = true;
        controlsRef.current.autoRotateSpeed = driftSpeed * 60 * easeIn; // Convert to degrees/second
      }
    } else {
      controlsRef.current.autoRotate = false;
    }
    
    controlsRef.current.update();
    
    // Auto-center camera on trajectory data when enough arrives or recording changes
    if (trajectory.length > 0 && controlsRef.current) {
      const isReset = lastTrajectoryLength.current > 0 && trajectory.length < lastTrajectoryLength.current * 0.5;
      // Center when we first get 10+ tokens, or at 50% of data, or on reset
      const isFirstLoad = !hasCentered.current && trajectory.length >= 10;
      const isHalfway = hasCentered.current && !userInteracting.current
        && lastTrajectoryLength.current < 50 && trajectory.length >= 50;
      
      if (isFirstLoad || isReset || isHalfway) {
        // Compute bounding box center of all trajectory points
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        
        for (const pt of trajectory) {
          if (!pt.coords || !isFinite(pt.coords[0])) continue;
          minX = Math.min(minX, pt.coords[0]);
          minY = Math.min(minY, pt.coords[1]);
          minZ = Math.min(minZ, pt.coords[2]);
          maxX = Math.max(maxX, pt.coords[0]);
          maxY = Math.max(maxY, pt.coords[1]);
          maxZ = Math.max(maxZ, pt.coords[2]);
        }
        
        if (isFinite(minX)) {
          const cx = (minX + maxX) / 2;
          const cy = (minY + maxY) / 2;
          const cz = (minZ + maxZ) / 2;
          const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1);
          const dist = span * 1.8; // Pull back enough to see the whole thing
          
          controlsRef.current.target.set(cx, cy, cz);
          camera.position.set(cx + dist * 0.6, cy + dist * 0.5, cz + dist * 0.6);
          controlsRef.current.update();
          hasCentered.current = true;
        }
      }
      
      lastTrajectoryLength.current = trajectory.length;
    }
    
    // Reset centering flag when trajectory empties or shrinks dramatically (new recording loading)
    if (trajectory.length === 0 || (lastTrajectoryLength.current > 0 && trajectory.length < lastTrajectoryLength.current * 0.5)) {
      hasCentered.current = false;
    }
    
    lastTrajectoryLength.current = trajectory.length;
  });
  
  return null;
}

// ============================================================================
// Color Utilities
// ============================================================================

type ColorPalette = 'default' | 'coolWarm' | 'sunset' | 'ocean' | 'neon';
type TokenColorMode = 'confidence' | 'entropy' | 'state';

// Context to share settings across components
const PaletteContext = createContext<ColorPalette>('default');
const usePalette = () => useContext(PaletteContext);

const TokenColorModeContext = createContext<TokenColorMode>('confidence');
const useTokenColorMode = () => useContext(TokenColorModeContext);

// State palette context — set from visualSettings.statePalette
const StatePaletteContext = createContext<Record<string, string>>(getStatePaletteColors('classic'));
const useStatePalette = () => useContext(StatePaletteContext);

// ============================================================================
// State Color Palette - Maps geometric states to perceptually distinct colors
// ============================================================================

function getStateColor(state: string | undefined, _maxProb: number | undefined, stateColors: Record<string, string>): THREE.Color {
  // Pure state color — no confidence-based desaturation/brightening
  // Confidence is communicated through opacity instead (avoids state color confounds)
  return new THREE.Color(stateColors[state || 'unknown'] || stateColors.unknown || '#888888');
}

function getConfidenceColor(confidence: number, palette: ColorPalette = 'default'): THREE.Color {
  const color = new THREE.Color();
  const t = Math.max(0, Math.min(1, confidence)); // clamp 0-1
  
  switch (palette) {
    case 'coolWarm':
      // Blue -> Purple -> Orange -> Red
      if (t < 0.33) {
        // Blue to Purple
        const localT = t / 0.33;
        color.setRGB(
          0.29 + localT * 0.37,  // 0.29 -> 0.66
          0.56 - localT * 0.23,  // 0.56 -> 0.33
          0.85 - localT * 0.17   // 0.85 -> 0.68
        );
      } else if (t < 0.66) {
        // Purple to Orange
        const localT = (t - 0.33) / 0.33;
        color.setRGB(
          0.66 + localT * 0.31,  // 0.66 -> 0.97
          0.33 + localT * 0.13,  // 0.33 -> 0.46
          0.68 - localT * 0.59   // 0.68 -> 0.09
        );
      } else {
        // Orange to Red
        const localT = (t - 0.66) / 0.34;
        color.setRGB(
          0.97 - localT * 0.04,  // 0.97 -> 0.93
          0.46 - localT * 0.19,  // 0.46 -> 0.27
          0.09 + localT * 0.18   // 0.09 -> 0.27
        );
      }
      break;
      
    case 'sunset':
      // Purple -> Pink -> Orange -> Yellow
      if (t < 0.33) {
        const localT = t / 0.33;
        color.setRGB(
          0.49 + localT * 0.37,
          0.23 + localT * 0.0,
          0.93 - localT * 0.46
        );
      } else if (t < 0.66) {
        const localT = (t - 0.33) / 0.33;
        color.setRGB(
          0.86 + localT * 0.11,
          0.16 + localT * 0.30,
          0.47 - localT * 0.38
        );
      } else {
        const localT = (t - 0.66) / 0.34;
        color.setRGB(
          0.97 + localT * 0.01,
          0.46 + localT * 0.29,
          0.09 + localT * 0.05
        );
      }
      break;
      
    case 'ocean':
      // Dark Cyan -> Cyan -> Teal -> Mint
      color.setHSL(
        0.48 + t * 0.08,  // Hue: 173 -> 202 degrees
        0.85 - t * 0.25,  // Saturation decreases
        0.37 + t * 0.38   // Lightness increases
      );
      break;
      
    case 'neon':
      // Pink -> Magenta -> Cyan -> Light Cyan
      if (t < 0.5) {
        const localT = t / 0.5;
        color.setRGB(
          0.94 - localT * 0.81,  // Pink to Cyan
          0.67 + localT * 0.16,
          0.98 - localT * 0.15
        );
      } else {
        const localT = (t - 0.5) / 0.5;
        color.setRGB(
          0.13 + localT * 0.27,
          0.83 + localT * 0.08,
          0.93 + localT * 0.04
        );
      }
      break;
      
    case 'default':
    default:
      // Original: Red-ish -> Yellow -> Green
      const hue = 0.05 + t * 0.5;
      const saturation = 0.8 - t * 0.2;
      const lightness = 0.55 + t * 0.25;
      color.setHSL(hue, saturation, lightness);
      break;
  }
  
  return color;
}

// Entropy-based color: Constraint Gradient
// Blue (constrained/low entropy) → Purple → Pink (free/high entropy)
// Entropy typically ranges 0-6 (log2 of vocab) but most values are 0-4
function getEntropyColor(entropy: number): THREE.Color {
  const color = new THREE.Color();

  // Normalize entropy: 0-3 maps to 0-1 (typical range for generation)
  // Values above 3 are very high entropy (saturates at pink)
  const t = Math.max(0, Math.min(1, entropy / 3));

  // Blue (#4a90ff) → Purple (#a855f7) → Pink (#ff66aa)
  if (t < 0.5) {
    // Blue to Purple
    const localT = t / 0.5;
    color.setRGB(
      0.29 + localT * 0.37,  // 0.29 → 0.66
      0.56 - localT * 0.23,  // 0.56 → 0.33
      1.0 - localT * 0.03    // 1.0 → 0.97
    );
  } else {
    // Purple to Pink
    const localT = (t - 0.5) / 0.5;
    color.setRGB(
      0.66 + localT * 0.34,  // 0.66 → 1.0
      0.33 + localT * 0.07,  // 0.33 → 0.4
      0.97 - localT * 0.3    // 0.97 → 0.67
    );
  }

  return color;
}

// ============================================================================
// Clickable Token Point
// ============================================================================

interface ClickableTokenProps {
  point: TrajectoryPoint;
  isSelected: boolean;
  isCurrent: boolean;
  isRecent: boolean;
  onClick: (point: TrajectoryPoint) => void;
  glowIntensity: number;
  entropyDistortion: boolean;
  signalAmplitude: boolean;  // NEW: Point size from residual norm
  ghosted?: boolean;  // Out-of-context-range token - render at reduced opacity
  tokenIndex?: number;  // Position in trajectory (for staggered layer animation)
}

// Prompt token color (dimmer, more muted)
const PROMPT_COLOR = '#6688aa';
// Ghost color for out-of-range tokens
const GHOST_COLOR = '#334455';

function ClickableToken({ point, isSelected, isCurrent, isRecent, onClick, glowIntensity, entropyDistortion, signalAmplitude, ghosted = false, tokenIndex = 0 }: ClickableTokenProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const palette = usePalette();
  const tokenColorMode = useTokenColorMode();
  const stateColors = useStatePalette();
  const transitionRef = useLayerTransition();

  // Animate position during layer transitions (staggered by tokenIndex)
  useFrame(() => {
    if (!groupRef.current) return;
    const animCoords = getAnimatedCoords(point, transitionRef, tokenIndex);
    groupRef.current.position.set(...animCoords);
  });

  const displayText = point.tokenStr.replace(/\n/g, '↵').replace(/ /g, '·');
  const isPrompt = point.isPrompt === true;

  // Continuous entropy factor (0.0-1.0 scale based on 0-5 entropy range)
  // No hard threshold - effects scale smoothly with entropy
  const entropyFactor = Math.min(1, Math.max(0, point.entropy / ENTROPY_MAX));

  // Determine colors - based on tokenColorMode
  // Both 'state' and 'confidence' modes use state color (confidence communicated via opacity)
  let baseColor: string;
  if (ghosted) {
    baseColor = GHOST_COLOR;
  } else if (isPrompt) {
    baseColor = PROMPT_COLOR;
  } else {
    if (tokenColorMode === 'entropy') {
      baseColor = getEntropyColor(point.entropy).getStyle();
    } else {
      // State and confidence modes both use geometric state color
      // Confidence is communicated through opacity, not color hue
      baseColor = getStateColor(point.geometricState, undefined, stateColors).getStyle();
    }
  }

  // Entropy scaling: tokens scale continuously with entropy (no hard threshold)
  // Ghosted tokens are smaller
  const ghostScale = ghosted ? 0.75 : 1;
  const entropyScale = entropyDistortion && !ghosted ? (1 + entropyFactor * 0.8) : 1;

  // Signal Amplitude: scale by residual norm (if enabled)
  // Norm is #1 Bonferroni signal family (d=4.06-4.21). Amplified range 0.5-1.8.
  // residualNorm typically ranges 10-100+
  const residualNormScale = signalAmplitude && !ghosted && !isPrompt
    ? 0.7 + Math.min(1, (point.residualNorm || 30) / 60) * 0.6  // Range: 0.7 to 1.3
    : 1.0;

  // Base sizes
  const baseSize = isCurrent ? 0.18 :
                   isSelected ? 0.18 :
                   isPrompt ? 0.25 :
                   isRecent ? 0.15 : 0.12;

  const size = baseSize * entropyScale * ghostScale * residualNormScale;

  const labelSize = ghosted ? 0.14 :
                    isCurrent ? 0.35 :
                    isSelected ? 0.32 :
                    isPrompt ? 0.18 :
                    isRecent ? 0.24 : 0.20;
  
  // Projection confidence affects visual treatment
  // Low confidence = more transparent, less glow (position is uncertain)
  const projConfidence = point.projectionConfidence ?? 1.0;
  const projConfidenceModifier = 0.5 + (projConfidence * 0.5); // Range: 0.5-1.0

  // Opacity driven by model certainty (confidence = top-1 probability, 0-1)
  // High confidence = fully opaque, low confidence = quite translucent
  const confidenceOpacity = 0.3 + (point.tokenProb ?? 0.5) * 0.7; // Range: 0.3-1.0
  const ghostOpacity = 0.4;
  const baseOpacity = ghosted ? ghostOpacity :
                      isCurrent ? 1 :
                      isSelected ? 1 :
                      isPrompt ? 0.35 :
                      confidenceOpacity;

  // Apply projection confidence to opacity (only for non-special tokens)
  const opacity = (isSelected || isCurrent || ghosted)
    ? baseOpacity
    : baseOpacity * projConfidenceModifier;
  
  // Entropy tinting: continuous color shift toward amber based on entropy level
  // Skip for ghosted/special tokens
  const entropyTintedColor = entropyDistortion && !isSelected && !isCurrent && !isPrompt && !ghosted
    ? blendWithEntropy(baseColor, entropyFactor)
    : baseColor;
  
  return (
    <group ref={groupRef} position={point._prevCoords || point.coords}>
      {/* Token geometry */}
      <mesh
            ref={meshRef}
            onClick={(e) => {
              e.stopPropagation();
              onClick(point);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHovered(true);
            }}
            onPointerOut={() => setHovered(false)}
          >
            {/* Continuous geometry: higher entropy = lower detail = spikier */}
            {entropyDistortion && entropyFactor > 0.8 ? (
              <icosahedronGeometry args={[size * (hovered ? 1.3 : 1), 0]} />
            ) : entropyDistortion && entropyFactor > 0.5 ? (
              <icosahedronGeometry args={[size * (hovered ? 1.3 : 1), 1]} />
            ) : entropyDistortion && entropyFactor > 0.3 ? (
              <icosahedronGeometry args={[size * (hovered ? 1.3 : 1), 2]} />
            ) : isPrompt ? (
              <tetrahedronGeometry args={[size * (hovered ? 1.5 : 1), 0]} />
            ) : (
              <sphereGeometry args={[size * (hovered ? 1.5 : 1), 16, 16]} />
            )}
            <meshStandardMaterial
              color={entropyTintedColor}
              emissive={entropyTintedColor}
              emissiveIntensity={
                ghosted ? 0.15 :
                ((isSelected ? 0.6 : hovered ? 0.5 : isPrompt ? 0.3 :
                 entropyDistortion ? 0.2 + entropyFactor * 0.4 : 0.2) * glowIntensity
                 * (isSelected || isCurrent ? 1 : projConfidenceModifier))
              }
              roughness={0.35}
              metalness={0.1}
              transparent
              opacity={opacity}
              wireframe={(isPrompt && !isSelected) || ghosted}
            />
          </mesh>

          {/* Ghostly inner glow for prompt tokens */}
          {isPrompt && !isSelected && (
            <mesh>
              <tetrahedronGeometry args={[size * 0.6, 0]} />
              <meshBasicMaterial
                color="#aaccee"
                transparent
                opacity={0.15 + (hovered ? 0.1 : 0)}
                depthWrite={false}
              />
            </mesh>
          )}

      {/* Selection glow - brightness-based indicator instead of color */}
      {isSelected && (
        <SelectionGlow position={[0, 0, 0]} size={size} />
      )}
      
      {/* Label - only show for prompt if selected or hovered */}
      {/* For ghosted tokens, only show on hover */}
      {(!ghosted || hovered) && (!isPrompt || isSelected || hovered) && (
        <Billboard follow={true}>
          <Text
            fontSize={labelSize}
            color={isPrompt ? '#8899aa' : '#ffffff'}
            anchorX="center"
            anchorY="bottom"
            position={[0, size + 0.08, 0]}
            fillOpacity={opacity}
            outlineWidth={0.012}
            outlineColor="#000000"
            outlineOpacity={0.8}
          >
            {displayText}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

// Helper: blend token color toward warm/alarming for high entropy
function blendWithEntropy(baseColor: string, entropyFactor: number): string {
  // Parse the base color and blend toward orange/red
  const base = new THREE.Color(baseColor);
  const warm = new THREE.Color('#ff6644'); // Alarming orange-red
  base.lerp(warm, entropyFactor * 0.4); // Up to 40% blend toward warm
  return base.getStyle();
}

// ============================================================================
// Trajectory Trail (instanced for performance)
// ============================================================================

interface TrailProps {
  trajectory: TrajectoryPoint[];
  showOutlierJumps?: boolean;
}

function TrajectoryTrail({ trajectory }: TrailProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const palette = usePalette();
  const tokenColorMode = useTokenColorMode();
  const stateColors = useStatePalette();
  const transitionRef = useLayerTransition();

  useFrame(() => {
    if (!meshRef.current || trajectory.length === 0) return;

    const now = Date.now();

    // Check if layer transition animation is complete
    const t = transitionRef.current;
    if (t && t.active && (now - t.startTime) >= t.duration) {
      t.active = false;  // Animation complete, stop computing lerp
    }

    trajectory.forEach((point, i) => {
      const age = Math.min(1, (now - point.timestamp) / SMOOTHING.trailFadeDuration);
      const scale = 0.07 * (1 - age * 0.5);

      const animCoords = getAnimatedCoords(point, transitionRef, i);
      tempObject.position.set(...animCoords);
      tempObject.scale.setScalar(Math.max(0.001, scale));
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);

      const baseColor = tokenColorMode === 'entropy'
        ? getEntropyColor(point.entropy)
        : getStateColor(point.geometricState, point.stateProbs ? Math.max(...Object.values(point.stateProbs)) : undefined, stateColors);
      const fadeFactor = 1 - age * 0.4;
      tempColor.setRGB(
        baseColor.r * fadeFactor,
        baseColor.g * fadeFactor,
        baseColor.b * fadeFactor
      );
      meshRef.current!.setColorAt(i, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
    meshRef.current.count = trajectory.length;
  });

  if (trajectory.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, SMOOTHING.trailMaxPoints]}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshStandardMaterial
        transparent
        opacity={0.95}  // BOOSTED: was 0.9
        emissive={COLORS.trailBase}
        emissiveIntensity={0.4}  // BOOSTED: was 0.2
      />
    </instancedMesh>
  );
}

// ============================================================================
// Trajectory Line
// ============================================================================

// Prompt line color (muted blue-gray)
const PROMPT_LINE_COLOR = new THREE.Color('#445566');

// Outlier detection: skip drawing lines for abnormally long segments
// Uses dynamic threshold based on typical segment lengths
function TrajectoryLine({ trajectory, showOutlierJumps = false }: TrailProps) {
  const palette = usePalette();
  const tokenColorMode = useTokenColorMode();
  const stateColors = useStatePalette();
  const transitionRef = useLayerTransition();
  const geoRef = useRef<THREE.BufferGeometry | null>(null);
  // Segment map: which trajectory indices each line segment connects
  const segmentMapRef = useRef<Array<[number, number]>>([]);

  // Build geometry and segment map when trajectory changes
  const { geometry, segmentMap } = useMemo(() => {
    if (geoRef.current) {
      geoRef.current.dispose();
      geoRef.current = null;
    }

    if (trajectory.length < 2) return { geometry: null, segmentMap: [] };

    // First pass: compute all segment distances to find typical length
    const distances: number[] = [];
    const validDistances: number[] = [];
    for (let i = 0; i < trajectory.length - 1; i++) {
      const from = trajectory[i];
      const to = trajectory[i + 1];

      // Use _prevCoords (pre-transition position) if available, so geometry
      // starts where tokens currently are rather than snapping to destination.
      const fromPos = from._prevCoords || from.coords;
      const toPos = to._prevCoords || to.coords;

      if (!fromPos || !toPos ||
          !isFinite(fromPos[0]) || !isFinite(fromPos[1]) || !isFinite(fromPos[2]) ||
          !isFinite(toPos[0]) || !isFinite(toPos[1]) || !isFinite(toPos[2])) {
        distances.push(Infinity);
        continue;
      }

      const dist = Math.sqrt(
        (toPos[0] - fromPos[0]) ** 2 +
        (toPos[1] - fromPos[1]) ** 2 +
        (toPos[2] - fromPos[2]) ** 2
      );
      distances.push(dist);
      validDistances.push(dist);
    }

    if (validDistances.length === 0) return { geometry: null, segmentMap: [] };
    const sortedDist = validDistances.sort((a, b) => a - b);
    const median = sortedDist[Math.floor(sortedDist.length / 2)];
    const outlierThreshold = Math.max(median * 8, 4.0);

    const posArr: number[] = [];
    const colArr: number[] = [];
    const newSegmentMap: Array<[number, number]> = [];

    for (let i = 0; i < trajectory.length - 1; i++) {
      const from = trajectory[i];
      const to = trajectory[i + 1];

      const dist = distances[i];
      if (!isFinite(dist) || (!showOutlierJumps && dist > outlierThreshold)) {
        continue;
      }

      const distFactor = 1 - Math.min(1, dist / 2.0) * 0.4;

      const isPromptSegment = from.isPrompt && to.isPrompt;
      const isTransitionSegment = from.isPrompt && !to.isPrompt;

      let r: number, g: number, b: number;

      if (isPromptSegment) {
        r = PROMPT_LINE_COLOR.r * distFactor;
        g = PROMPT_LINE_COLOR.g * distFactor;
        b = PROMPT_LINE_COLOR.b * distFactor;
      } else if (isTransitionSegment) {
        const baseColor = tokenColorMode === 'entropy'
          ? getEntropyColor(to.entropy)
          : getStateColor(to.geometricState, to.stateProbs ? Math.max(...Object.values(to.stateProbs)) : undefined, stateColors);
        r = (PROMPT_LINE_COLOR.r + baseColor.r) * 0.5 * distFactor;
        g = (PROMPT_LINE_COLOR.g + baseColor.g) * 0.5 * distFactor;
        b = (PROMPT_LINE_COLOR.b + baseColor.b) * 0.5 * distFactor;
      } else {
        const baseColor = tokenColorMode === 'entropy'
          ? getEntropyColor(to.entropy)
          : getStateColor(to.geometricState, to.stateProbs ? Math.max(...Object.values(to.stateProbs)) : undefined, stateColors);
        r = Math.min(1, baseColor.r * distFactor * 1.3);
        g = Math.min(1, baseColor.g * distFactor * 1.3);
        b = Math.min(1, baseColor.b * distFactor * 1.3);
      }

      // Use pre-transition position so lines start where tokens are, not destination
      const fromInitPos = from._prevCoords || from.coords;
      const toInitPos = to._prevCoords || to.coords;
      posArr.push(fromInitPos[0], fromInitPos[1], fromInitPos[2]);
      posArr.push(toInitPos[0], toInitPos[1], toInitPos[2]);
      colArr.push(r, g, b);
      colArr.push(r, g, b);

      // Map this segment to trajectory indices for animation
      newSegmentMap.push([i, i + 1]);
    }

    if (posArr.length === 0) return { geometry: null, segmentMap: [] };

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(posArr), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colArr), 3));
    geo.computeBoundingSphere();
    geoRef.current = geo;
    segmentMapRef.current = newSegmentMap;
    return { geometry: geo, segmentMap: newSegmentMap };
  }, [trajectory, palette, showOutlierJumps, tokenColorMode, stateColors]);

  // Animate line positions during layer transition (domino cascade)
  useFrame(() => {
    const t = transitionRef.current;
    if (!t || !t.active || !geoRef.current) return;

    const posAttr = geoRef.current.getAttribute('position') as THREE.BufferAttribute;
    if (!posAttr) return;

    const map = segmentMapRef.current;
    for (let s = 0; s < map.length; s++) {
      const [fromIdx, toIdx] = map[s];
      const fromPt = trajectory[fromIdx];
      const toPt = trajectory[toIdx];

      const fromAnim = getAnimatedCoords(fromPt, transitionRef, fromIdx);
      const toAnim = getAnimatedCoords(toPt, transitionRef, toIdx);

      const base = s * 2;
      posAttr.setXYZ(base, fromAnim[0], fromAnim[1], fromAnim[2]);
      posAttr.setXYZ(base + 1, toAnim[0], toAnim[1], toAnim[2]);
    }

    posAttr.needsUpdate = true;
    geoRef.current.computeBoundingSphere();

    // Check if cascade is complete
    if (Date.now() - t.startTime >= t.duration) {
      t.active = false;
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => { geoRef.current?.dispose(); };
  }, []);

  if (!geometry) return null;

  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.85}
      />
    </lineSegments>
  );
}

// ============================================================================
// Trajectory Cables - glowing tube segments connecting tokens
// ============================================================================

interface TrajectoryGlowProps {
  trajectory: TrajectoryPoint[];
  enabled: boolean;
}

function TrajectoryGlow({ trajectory, enabled }: TrajectoryGlowProps) {
  // Build individual tube segments between consecutive tokens
  const segments = useMemo(() => {
    if (!enabled || trajectory.length < 2) return [];
    
    const result: Array<{
      start: THREE.Vector3;
      end: THREE.Vector3;
      tokenProb: number;
      entropy: number;
      isPrompt: boolean;
      projectedVelocity?: number;
      geometricState?: string;
      stateProbs?: Record<string, number>;
    }> = [];

    for (let i = 0; i < trajectory.length - 1; i++) {
      const from = trajectory[i];
      const to = trajectory[i + 1];

      const start = new THREE.Vector3(...from.coords);
      const end = new THREE.Vector3(...to.coords);

      result.push({
        start,
        end,
        tokenProb: to.tokenProb,
        entropy: to.entropy,
        isPrompt: from.isPrompt && to.isPrompt,
        projectedVelocity: to.projectedVelocity,
        geometricState: to.geometricState,
        stateProbs: to.stateProbs,
      });
    }
    
    return result;
  }, [trajectory, enabled]);
  
  if (!enabled || segments.length === 0) return null;
  
  return (
    <group>
      {segments.map((seg, i) => (
        <CableSegment key={i} {...seg} />
      ))}
    </group>
  );
}

interface CableSegmentProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  tokenProb: number;
  entropy: number;
  isPrompt: boolean;
  projectedVelocity?: number;  // V1: 3D projected velocity for thickness
  geometricState?: string;     // For state color mode
  stateProbs?: Record<string, number>;
}

function CableSegment({ start, end, tokenProb, entropy, isPrompt, projectedVelocity, geometricState, stateProbs }: CableSegmentProps) {
  const palette = usePalette();
  const tokenColorMode = useTokenColorMode();
  const stateColors = useStatePalette();

  const geometry = useMemo(() => {
    // Create a straight tube between two points
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();

    if (length < 0.01) return null;

    // Velocity-driven radius: Bonferroni #5,8,10 signal -> thickness
    // Fast velocity = thick cable = "heavy traffic through activation space"
    let radius: number;
    if (isPrompt) {
      radius = 0.015;
    } else if (projectedVelocity !== undefined && projectedVelocity > 0) {
      // Velocity-based: 0.015 (min) to 0.06 (max), clamped
      radius = Math.min(0.06, Math.max(0.015, 0.015 + projectedVelocity * 0.008));
    } else {
      // Fallback: distance-based (original behavior)
      const normalizedDist = Math.min(length / 2, 1);
      const veryShort = length < 0.3;
      const veryLong = length > 3;

      if (veryShort) {
        radius = 0.02;
      } else if (veryLong) {
        radius = 0.025 * (1 - Math.min((length - 3) / 5, 0.5));
      } else {
        radius = 0.035 + normalizedDist * 0.015;
      }
    }
    
    const geo = new THREE.CylinderGeometry(radius, radius, length, 8, 1);
    
    // Move geometry so one end is at origin
    geo.translate(0, length / 2, 0);
    
    // Rotate to point from start to end
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize()
    );
    geo.applyQuaternion(quaternion);
    
    // Move to start position
    geo.translate(start.x, start.y, start.z);
    
    return geo;
  }, [start, end, isPrompt]);
  
  if (!geometry) return null;
  
  // Color based on mode — state colors for state/confidence, entropy for entropy
  let color: THREE.Color | string;
  if (isPrompt) {
    color = '#445566';
  } else if (tokenColorMode === 'entropy') {
    color = getEntropyColor(entropy);
  } else if (geometricState) {
    const maxProb = stateProbs ? Math.max(...Object.values(stateProbs)) : undefined;
    color = getStateColor(geometricState, maxProb, stateColors);
  } else {
    color = getConfidenceColor(tokenProb, palette);
  }
  const emissiveColor = isPrompt ? '#223344' : color;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        emissive={emissiveColor}
        emissiveIntensity={isPrompt ? 0.2 : 0.5}
        transparent
        opacity={isPrompt ? 0.4 : 0.75}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  );
}

// ============================================================================
// Ribbon Trails - 3D ribbons instead of lines (experimental)
// ============================================================================

interface RibbonTrailsProps {
  trajectory: TrajectoryPoint[];
  enabled: boolean;
}

function RibbonTrails({ trajectory, enabled }: RibbonTrailsProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const geometry = useMemo(() => {
    if (!enabled || trajectory.length < 2) return null;
    
    // Build a tube/ribbon along the trajectory
    const points = trajectory
      .filter(t => !t.isPrompt) // Only generated tokens
      .map(t => new THREE.Vector3(...t.coords));
    
    if (points.length < 2) return null;
    
    // Create smooth curve through points
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3);
    
    // Create tube geometry - much thinner
    const tubeGeo = new THREE.TubeGeometry(
      curve,
      Math.min(points.length * 3, 150), // fewer segments
      0.015, // thinner radius - was 0.03
      4, // fewer radial segments
      false // closed
    );
    
    return tubeGeo;
  }, [trajectory, enabled]);
  
  if (!enabled || !geometry) return null;
  
  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color="#5a9fd4"
        emissive="#3a7fc4"
        emissiveIntensity={0.5}
        transparent
        opacity={0.35}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  );
}

// ============================================================================
// Particle Trails - dust following current token
// Uses the smoothed/lerped position from CurrentPoint animation
// ============================================================================

const TRAIL_PARTICLE_COUNT = 40;
const TRAIL_LIFETIME = 2.5; // seconds

interface ParticleTrailsProps {
  targetPosition: [number, number, number] | null;
  enabled: boolean;
  playbackRate: number;
  smoothingLevel?: 'smooth' | 'balanced' | 'reactive' | 'raw';
  currentToken?: TrajectoryPoint | null;  // For state color, entropy, velocity
}

function ParticleTrails({ targetPosition, enabled, playbackRate, smoothingLevel = 'balanced', currentToken }: ParticleTrailsProps) {
  const tokenColorMode = useTokenColorMode();
  const stateColors = useStatePalette();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  // Reusable vector for velocity scaling — avoids per-particle clone()
  const tempVel = useMemo(() => new THREE.Vector3(), []);
  // Reusable vector for lerp target — avoids per-frame new Vector3
  const targetVec = useMemo(() => new THREE.Vector3(), []);

  // Track smoothed position internally (matching CurrentPoint's lerp)
  const smoothedPos = useRef(new THREE.Vector3());
  const lastSpawnPos = useRef<THREE.Vector3 | null>(null);

  // Store particle state
  const particles = useRef<Array<{
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    age: number;
    active: boolean;
  }>>(Array.from({ length: TRAIL_PARTICLE_COUNT }, () => ({
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    age: 0,
    active: false,
  })));

  const spawnTimer = useRef(0);
  // Lerp factor based on smoothing setting
  const lerpFactor = getSmoothingFactor(smoothingLevel);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    if (!enabled || !targetPosition) {
      meshRef.current.count = 0;
      return;
    }

    // Lerp to target (same as CurrentPoint) — reuse targetVec, no allocation
    targetVec.set(targetPosition[0], targetPosition[1], targetPosition[2]);
    smoothedPos.current.lerp(targetVec, lerpFactor);

    // Spawn particles based on smoothed position movement
    // Velocity-scaled: more particles when moving fast (Bonferroni #5)
    // Entropy-scaled dispersion: wide cloud when uncertain
    const vel = currentToken?.projectedVelocity || 1;
    const entropy = currentToken?.entropy || 0;
    const dispersionRadius = 0.05 + (entropy / 5) * 0.2; // High entropy = wider cloud

    spawnTimer.current += delta;
    if (spawnTimer.current > 0.04) {
      if (lastSpawnPos.current) {
        const movement = smoothedPos.current.distanceTo(lastSpawnPos.current);
        if (movement > 0.01) {
          // Spawn count proportional to movement AND velocity
          const spawnCount = Math.min(6, Math.ceil(movement * vel * 8));
          for (let s = 0; s < spawnCount; s++) {
            const p = particles.current.find(p => !p.active);
            if (p) {
              p.pos.copy(smoothedPos.current);
              p.vel.set(
                (Math.random() - 0.5) * dispersionRadius * 2,
                (Math.random() - 0.5) * dispersionRadius * 2,
                (Math.random() - 0.5) * dispersionRadius * 2
              );
              p.age = 0;
              p.active = true;
            }
          }
          lastSpawnPos.current.copy(smoothedPos.current);
        }
      } else {
        lastSpawnPos.current = smoothedPos.current.clone();
      }
      spawnTimer.current = 0;
    }

    // Pre-compute state color ONCE per frame (same for all particles)
    let baseR = 0.33, baseG = 0.87, baseB = 1.0; // default: #55ddff
    if (tokenColorMode !== 'entropy' && currentToken?.geometricState) {
      const maxProb = currentToken.stateProbs ? Math.max(...Object.values(currentToken.stateProbs)) : undefined;
      const stateCol = getStateColor(currentToken.geometricState, maxProb, stateColors);
      baseR = stateCol.r;
      baseG = stateCol.g;
      baseB = stateCol.b;
    }

    // Update particles
    let activeCount = 0;
    const effectiveLifetime = vel > 2 ? TRAIL_LIFETIME * 0.6 : TRAIL_LIFETIME;
    for (let i = 0; i < TRAIL_PARTICLE_COUNT; i++) {
      const p = particles.current[i];
      if (!p.active) continue;

      p.age += delta;
      if (p.age > effectiveLifetime) {
        p.active = false;
        continue;
      }

      // Apply velocity without clone: tempVel = vel * delta, then add
      tempVel.copy(p.vel).multiplyScalar(delta);
      p.pos.add(tempVel);
      p.vel.multiplyScalar(0.96);

      const lifeFactor = 1 - (p.age / effectiveLifetime);
      const scale = 0.03 * lifeFactor;

      tempObject.position.copy(p.pos);
      tempObject.scale.setScalar(Math.max(0.008, scale));
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(activeCount, tempObject.matrix);

      // Fade base color by lifetime
      tempColor.setRGB(baseR * lifeFactor, baseG * lifeFactor, baseB * lifeFactor);
      meshRef.current.setColorAt(activeCount, tempColor);

      activeCount++;
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
    meshRef.current.count = activeCount;
  });

  if (!enabled) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, TRAIL_PARTICLE_COUNT]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial
        transparent
        opacity={0.8}
        vertexColors
      />
    </instancedMesh>
  );
}

// ============================================================================
// Arc Pulses - Energy flowing along attention arcs
// ============================================================================
// Semantically meaningful:
// Shows WHERE attention flows, not just trajectory history

const ARC_PULSE_COUNT = 12; // Fewer than flow particles - arcs are shorter
const ARC_PULSE_SPEED = 0.8; // Faster since arcs are shorter paths

interface ArcPulsesProps {
  trajectory: TrajectoryPoint[];
  currentToken: TrajectoryPoint | null;
  selectedToken: TrajectoryPoint | null;
  enabled: boolean;
  enabledHeads: number[];
  showPromptArcs?: boolean;
  // Context window filtering
  contextRange?: ContextRange | null;
  showGhostedArcPulses?: boolean;  // Show pulses on arcs to out-of-range tokens (default: false)
}

function ArcPulses({ trajectory, currentToken, selectedToken, enabled, enabledHeads, showPromptArcs = true, contextRange = null, showGhostedArcPulses = false }: ArcPulsesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const transitionRef = useLayerTransition();
  
  // Build position map for arc target lookup
  const positionMap = useMemo(() => {
    const map = new Map<number, [number, number, number]>();
    trajectory.forEach(p => map.set(p.position, p.coords));
    return map;
  }, [trajectory]);
  
  // Build set of prompt positions for filtering
  const promptPositions = useMemo(() => {
    return new Set(trajectory.filter(t => t.isPrompt).map(t => t.position));
  }, [trajectory]);
  
  // Build set of in-range positions for context filtering
  const inRangePositions = useMemo(() => {
    if (!contextRange) return null; // null means all positions are in range
    
    const generatedTokens = trajectory.filter(t => !t.isPrompt);
    const inRange = new Set<number>();
    
    // Prompt tokens are always considered "in range"
    trajectory.filter(t => t.isPrompt).forEach(t => inRange.add(t.position));
    
    // Add generated tokens within context range
    generatedTokens.forEach((t, i) => {
      if (i >= contextRange.start && i < contextRange.end) {
        inRange.add(t.position);
      }
    });
    
    return inRange;
  }, [trajectory, contextRange]);
  
  // Get arcs from the token we're showing (selected or current)
  const tokenToShow = selectedToken || currentToken;
  
  // Build arc curves for particles to travel along
  const arcCurves = useMemo(() => {
    if (!enabled || !tokenToShow?.attentionArcs) return [];
    
    const curves: Array<{
      curve: THREE.QuadraticBezierCurve3;
      color: string;
      weight: number;
    }> = [];
    
    const sourcePosition = tokenToShow.position;
    const fromCoords = tokenToShow.coords;
    
    tokenToShow.attentionArcs.forEach(arc => {
      // Skip self-attention
      if (arc.to === sourcePosition) return;

      // Skip attention sink arcs (BOS token at position 0) - no pulses for ghosted sink
      if (arc.to === 0) return;

      // Skip arcs to prompt tokens if hidden
      if (!showPromptArcs && promptPositions.has(arc.to)) return;
      
      // Skip arcs to out-of-range tokens unless showGhostedArcPulses is true
      const isGhosted = inRangePositions !== null && !inRangePositions.has(arc.to);
      if (isGhosted && !showGhostedArcPulses) return;
      
      const toCoords = positionMap.get(arc.to);
      if (!toCoords) return;
      
      // Filter by weight and enabled heads
      if (arc.weight <= 0.05 || !enabledHeads.includes(arc.head)) return;
      
      // Build bezier curve (same as AttentionArc)
      const from = new THREE.Vector3(...fromCoords);
      const to = new THREE.Vector3(...toCoords);
      const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
      const dist = from.distanceTo(to);
      const offset = Math.min(dist * 0.3, 0.5);
      mid.y += offset;
      
      const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
      
      // Color based on pattern type
      const patternColors: Record<string, string> = {
        self: '#ffffff',
        local: '#ffdd00',
        long_range: '#00ddff',
        diffuse: '#ff66ff',
      };
      const color = patternColors[arc.pattern_type || 'local'] || '#ffdd00';
      
      curves.push({ curve, color, weight: arc.weight });
    });
    
    return curves;
  }, [tokenToShow, positionMap, promptPositions, inRangePositions, enabledHeads, enabled, showPromptArcs, showGhostedArcPulses]);
  
  // Track particle states - distributed across all arcs
  const particleState = useRef<Array<{
    arcIndex: number;
    progress: number; // 0-1 along the arc
  }>>(Array.from({ length: ARC_PULSE_COUNT }, (_, i) => ({
    arcIndex: i % Math.max(1, arcCurves.length),
    progress: Math.random(), // Start at random positions
  })));
  
  // Reassign particles when arcs change
  useEffect(() => {
    if (arcCurves.length === 0) return;
    particleState.current.forEach((p, i) => {
      p.arcIndex = i % arcCurves.length;
      // Keep progress to avoid all particles starting at same spot
    });
  }, [arcCurves.length]);
  
  useFrame((_, delta) => {
    if (!meshRef.current || !enabled || arcCurves.length === 0) {
      if (meshRef.current) meshRef.current.count = 0;
      return;
    }

    // Hide pulses during layer transition
    const tr = transitionRef.current;
    if (tr && tr.active) {
      meshRef.current.count = 0;
      return;
    }
    
    let activeCount = 0;
    
    particleState.current.forEach((particle, i) => {
      if (particle.arcIndex >= arcCurves.length) {
        particle.arcIndex = i % arcCurves.length;
      }
      
      const arc = arcCurves[particle.arcIndex];
      if (!arc) return;
      
      // Advance particle along arc
      // Speed scales with weight (stronger attention = faster pulse)
      const speed = ARC_PULSE_SPEED * (0.5 + arc.weight * 0.5);
      particle.progress += delta * speed;

      // Loop back to start
      if (particle.progress > 1) {
        particle.progress -= 1;
        // Optionally cycle to next arc for variety
        particle.arcIndex = (particle.arcIndex + 1) % arcCurves.length;
      }

      // Get position on curve (REVERSED: pulses flow from attended → attendee)
      // This represents information flow direction in attention
      const pos = arc.curve.getPoint(1 - particle.progress);
      
      // Size pulses slightly based on position (bigger in middle)
      const sizePulse = 1 + Math.sin(particle.progress * Math.PI) * 0.3;
      const baseSize = 0.04 + arc.weight * 0.02;
      
      tempObject.position.copy(pos);
      tempObject.scale.setScalar(baseSize * sizePulse);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(activeCount, tempObject.matrix);
      
      // Color from arc
      tempColor.set(arc.color);
      meshRef.current!.setColorAt(activeCount, tempColor);
      
      activeCount++;
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
    meshRef.current.count = activeCount;
  });
  
  if (!enabled || arcCurves.length === 0) return null;
  
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, ARC_PULSE_COUNT]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial
        transparent
        opacity={0.9}
        emissive="#ffffff"
        emissiveIntensity={0.8}
      />
    </instancedMesh>
  );
}

// ============================================================================
// Attention Arcs
// ============================================================================

// Legacy: arbitrary colors per head index (for research/debugging)
const HEAD_COLORS = [
  '#ff6b9d',  // Head 0 - Pink
  '#6bffb8',  // Head 1 - Mint
  '#ffb86b',  // Head 2 - Orange
  '#6b9dff',  // Head 3 - Blue
  '#b86bff',  // Head 4 - Purple
  '#ffff6b',  // Head 5 - Yellow
  '#6bffff',  // Head 6 - Cyan
  '#ff6b6b',  // Head 7 - Red
];

// NEW: Pattern-type colors based on human perceptual mapping
// UPDATED: Brighter/more saturated to distinguish from trajectory cables
const PATTERN_COLORS: Record<string, string> = {
  self: '#ffffff',       // White/Silver - reflecting inward, neutral
  local: '#ffdd00',      // Bright gold/yellow - nearby, immediate (was #f0a030)
  long_range: '#00ddff', // Bright cyan - reaching back, distant (was #30a0f0)
  diffuse: '#ff66ff',    // Bright magenta - uncertain, scattered (was #a060c0)
};

// Arc color mode type
type ArcColorMode = 'pattern' | 'head';

interface AttentionArcsProps {
  trajectory: TrajectoryPoint[];
  currentToken: TrajectoryPoint | null;
  selectedToken: TrajectoryPoint | null;
  enabledHeads?: number[];
  arcColorMode?: ArcColorMode;  // NEW: 'pattern' (default) or 'head'
  showPromptArcs?: boolean;     // Whether to show arcs pointing to prompt tokens
  // Context window filtering for replay mode
  contextRange?: ContextRange | null;
  showOutOfRangeArcs?: boolean;
}

function AttentionArcs({ trajectory, currentToken, selectedToken, enabledHeads = [0,1,2,3,4,5,6,7], arcColorMode = 'pattern', showPromptArcs = true, contextRange = null, showOutOfRangeArcs = true }: AttentionArcsProps) {
  const transitionRef = useLayerTransition();
  const arcGroupRef = useRef<THREE.Group>(null);

  // Hide arcs during layer transition (tube geometry too expensive to animate per-frame)
  useFrame(() => {
    if (!arcGroupRef.current) return;
    const t = transitionRef.current;
    arcGroupRef.current.visible = !t || !t.active;
  });

  // Map position -> coords for arc target lookup
  // NOTE: We intentionally don't use array index as fallback because
  // trajectory[0] is not necessarily position 0 (we skip <|endoftext|>)
  const positionMap = useMemo(() => {
    const map = new Map<number, [number, number, number]>();
    trajectory.forEach(p => map.set(p.position, p.coords));
    return map;
  }, [trajectory]);
  
  // Build set of prompt positions for filtering
  const promptPositions = useMemo(() => {
    return new Set(trajectory.filter(t => t.isPrompt).map(t => t.position));
  }, [trajectory]);
  
  // Build set of in-range positions for context filtering
  const inRangePositions = useMemo(() => {
    if (!contextRange) return null; // null means all positions are in range
    
    const generatedTokens = trajectory.filter(t => !t.isPrompt);
    const inRange = new Set<number>();
    
    // Prompt tokens are always considered "in range" for arc purposes
    trajectory.filter(t => t.isPrompt).forEach(t => inRange.add(t.position));
    
    // Add generated tokens within context range
    generatedTokens.forEach((t, i) => {
      if (i >= contextRange.start && i < contextRange.end) {
        inRange.add(t.position);
      }
    });
    
    return inRange;
  }, [trajectory, contextRange]);
  
  // Determine which token's arcs to show
  const tokenToShow = selectedToken || currentToken;
  const tokenKey = tokenToShow?.position ?? 'none';
  
  const arcsData = useMemo(() => {
    const arcs: Array<{
      fromCoords: [number, number, number];
      toCoords: [number, number, number];
      weight: number;
      head: number;
      patternType: string;  // NEW: behavioral classification
      isSelected: boolean;
      toPosition: number;
      isGhosted: boolean;   // Arc points to out-of-range token
      targetTokenStr?: string; // For directional indicator
    }> = [];
    
    // Track render failures for accurate count display
    let skippedSelfAttention = 0;
    let skippedNoCoords = 0;
    let skippedDuplicate = 0;
    const seenTargets = new Set<number>();
    
    if (tokenToShow?.attentionArcs) {
      const sourcePosition = tokenToShow.position;
      const fromCoords = tokenToShow.coords;
      
      tokenToShow.attentionArcs.forEach(arc => {
        // Skip self-attention (from === to creates zero-length invisible tubes)
        if (arc.to === sourcePosition) {
          skippedSelfAttention++;
          return;
        }
        
        // Only use positionMap - indexMap fallback was causing bugs
        // (trajectory[0] is not necessarily position 0 due to <|endoftext|> skip)
        const toCoords = positionMap.get(arc.to);
        
        if (!toCoords) {
          skippedNoCoords++;
          return;
        }
        
        // Skip arcs to prompt tokens if prompt is hidden
        if (!showPromptArcs && promptPositions.has(arc.to)) {
          return;
        }
        
        // Check if target is out of context range (ghosted)
        const isGhosted = inRangePositions !== null && !inRangePositions.has(arc.to);
        
        // Skip ghosted arcs entirely if showOutOfRangeArcs is false
        if (isGhosted && !showOutOfRangeArcs) {
          return;
        }
        
        // Get target token string for directional indicator
        const targetToken = trajectory.find(t => t.position === arc.to);
        const targetTokenStr = targetToken?.tokenStr;
        
        if (arc.weight <= 0.05 || !enabledHeads.includes(arc.head)) {
          return;
        }
        
        // Track if this is a duplicate target (for debug info)
        if (seenTargets.has(arc.to)) {
          skippedDuplicate++;
          // Still render it - multiple heads can attend to same position
        }
        seenTargets.add(arc.to);
        
        arcs.push({
          fromCoords,
          toCoords,
          weight: arc.weight,
          head: arc.head,
          patternType: arc.pattern_type || 'local',
          isSelected: !!selectedToken,
          toPosition: arc.to,
          isGhosted,
          isAttentionSink: arc.to === 0,  // BOS token is attention sink
          targetTokenStr,
        });
      });
    }
    
    // Enhanced debug logging
    if (tokenToShow?.attentionArcs?.length) {
      const totalRaw = tokenToShow.attentionArcs.length;
      const uniqueTargets = arcs.length > 0 ? new Set(arcs.map(a => a.toPosition)).size : 0;
      
      console.log('Attention arcs breakdown:', {
        token: tokenToShow.tokenStr,
        position: tokenToShow.position,
        rawCount: totalRaw,
        rendered: arcs.length,
        uniqueVisualTargets: uniqueTargets,
        skipped: {
          selfAttention: skippedSelfAttention,
          noCoords: skippedNoCoords,
          overlapping: skippedDuplicate,
        },
        positionMapSize: positionMap.size,
      });
    }
    
    return arcs;
  }, [tokenToShow, positionMap, promptPositions, enabledHeads, showPromptArcs, inRangePositions, showOutOfRangeArcs, trajectory]);
  
  if (arcsData.length === 0) return null;
  
  // Key the group by token position to force full re-render on selection change
  return (
    <group ref={arcGroupRef} key={`arcs-group-${tokenKey}`}>
      {arcsData.map((arc, i) => (
        <AttentionArc
          key={`arc-${tokenKey}-${arc.head}-${arc.toPosition}`}
          fromCoords={arc.fromCoords}
          toCoords={arc.toCoords}
          weight={arc.weight}
          head={arc.head}
          patternType={arc.patternType}
          isSelected={arc.isSelected}
          colorMode={arcColorMode}
          isGhosted={arc.isGhosted}
          isAttentionSink={arc.isAttentionSink}
          targetTokenStr={arc.targetTokenStr}
        />
      ))}
    </group>
  );
}

interface AttentionArcProps {
  fromCoords: [number, number, number];
  toCoords: [number, number, number];
  weight: number;
  head: number;
  patternType?: string;  // 'self', 'local', 'long_range', 'diffuse'
  colorMode?: ArcColorMode;  // 'pattern' or 'head'
  isSelected?: boolean;
  isGhosted?: boolean;  // Arc points to out-of-range token
  isAttentionSink?: boolean;  // Arc points to BOS token (position 0)
  targetTokenStr?: string;  // For directional indicator label
}

// Ghost arc color - muted blue-gray
const GHOST_ARC_COLOR = '#556677';

// Creates a dashed tube effect - multiple segments with gaps
function AttentionArc({ fromCoords, toCoords, weight, head, patternType = 'local', colorMode = 'pattern', isSelected, isGhosted = false, isAttentionSink = false, targetTokenStr }: AttentionArcProps) {
  // Build the full curve
  const curve = useMemo(() => {
    const from = new THREE.Vector3(...fromCoords);
    const to = new THREE.Vector3(...toCoords);
    
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    const dist = from.distanceTo(to);
    const offset = Math.min(dist * 0.3, 0.5);
    mid.y += offset;
    
    return new THREE.QuadraticBezierCurve3(from, mid, to);
  }, [fromCoords, toCoords]);
  
  // Create dashed segments along the curve
  const segments = useMemo(() => {
    const arcLength = curve.getLength();
    
    // Segment sizing - adjust based on arc length
    // Shorter arcs get fewer, proportionally longer segments
    const dashLength = Math.min(0.4, arcLength * 0.12);  // Each dash
    const gapLength = dashLength * 0.5;  // Gap is half of dash
    const totalSegmentLength = dashLength + gapLength;
    
    const numSegments = Math.max(2, Math.floor(arcLength / totalSegmentLength));
    
    // Thickness scales with attention weight
    const radius = 0.01 + weight * 0.025;
    
    const result: THREE.TubeGeometry[] = [];
    
    for (let i = 0; i < numSegments; i++) {
      // Calculate start and end t values for this segment
      const segmentStart = i / numSegments;
      const segmentEnd = (i + 0.6) / numSegments;  // 0.6 = dash portion (60% dash, 40% gap)
      
      // Extract subcurve points
      const startPoint = curve.getPoint(segmentStart);
      const midPoint = curve.getPoint((segmentStart + segmentEnd) / 2);
      const endPoint = curve.getPoint(Math.min(segmentEnd, 0.99));
      
      // Create a mini curve for this segment
      const segmentCurve = new THREE.QuadraticBezierCurve3(startPoint, midPoint, endPoint);
      
      // Create tube geometry for segment
      const tubeGeo = new THREE.TubeGeometry(
        segmentCurve,
        8,      // Fewer segments per dash (performance)
        radius,
        6,
        false
      );
      
      result.push(tubeGeo);
    }
    
    return result;
  }, [curve, weight]);
  
  // Choose color based on mode - ghosted arcs get muted color
  // Attention sink arcs are fully muted gray (no semantic meaning)
  const arcColor = isAttentionSink
    ? '#333340'  // Deep gray, no color
    : isGhosted
      ? GHOST_ARC_COLOR
      : colorMode === 'pattern'
        ? PATTERN_COLORS[patternType] || PATTERN_COLORS.local
        : HEAD_COLORS[head % HEAD_COLORS.length];

  // Ghosted arcs are much more transparent
  // Attention sink arcs (to position 0) are barely visible - 10% opacity, no glow
  const ghostedOpacity = 0.25;
  const sinkOpacity = 0.10;
  const baseOpacity = isAttentionSink
    ? sinkOpacity
    : isGhosted
      ? ghostedOpacity
      : isSelected ? 0.85 + weight * 0.15 : 0.5 + weight * 0.35;
  const emissiveIntensity = isAttentionSink ? 0 : isGhosted ? 0.2 : isSelected ? 0.7 : 0.5;
  
  // Get endpoint for directional indicator
  const endPoint = curve.getPoint(1);
  const displayText = targetTokenStr?.replace(/\n/g, '↵').replace(/ /g, '·') || '?';
  
  return (
    <group>
      {segments.map((geo, i) => (
        <mesh key={i} geometry={geo}>
          <meshStandardMaterial
            color={arcColor}
            emissive={arcColor}
            emissiveIntensity={emissiveIntensity}
            transparent
            opacity={baseOpacity}
            roughness={0.3}
            metalness={0.1}
          />
        </mesh>
      ))}
      
      {/* Directional indicator for ghosted arcs - shows where arc leads */}
      {isGhosted && (
        <group position={[endPoint.x, endPoint.y, endPoint.z]}>
          {/* Arrow cone pointing at target */}
          <mesh rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.06, 0.15, 8]} />
            <meshStandardMaterial
              color={GHOST_ARC_COLOR}
              emissive={GHOST_ARC_COLOR}
              emissiveIntensity={0.3}
              transparent
              opacity={0.5}
            />
          </mesh>
          
          {/* Label showing target token */}
          <Billboard follow={true}>
            <Text
              fontSize={0.12}
              color="#8899aa"
              anchorX="center"
              anchorY="bottom"
              position={[0, 0.15, 0]}
              fillOpacity={0.7}
              outlineWidth={0.008}
              outlineColor="#000000"
            >
              →{displayText}
            </Text>
          </Billboard>
        </group>
      )}
    </group>
  );
}

// ============================================================================
// Current Point
// ============================================================================

interface CurrentPointProps {
  point: TrajectoryPoint | null;
  pauseState: PauseState;
  playbackRate: number;
  dimmed?: boolean;  // When user has selection, dim the current point indicator
  smoothingLevel?: 'smooth' | 'balanced' | 'reactive' | 'raw';
}

function CurrentPoint({ point, pauseState, playbackRate, dimmed = false, smoothingLevel = 'balanced' }: CurrentPointProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const targetPos = useRef(new THREE.Vector3(0, 0, 0));
  const currentPos = useRef(new THREE.Vector3(0, 0, 0));
  const tokenColorMode = useTokenColorMode();
  const stateColors = useStatePalette();

  // Lerp factor based on smoothing setting
  const lerpFactor = getSmoothingFactor(smoothingLevel);

  useFrame(({ clock, camera }) => {
    if (!meshRef.current || !point) return;

    targetPos.current.set(...point.coords);
    currentPos.current.lerp(targetPos.current, lerpFactor);
    meshRef.current.position.copy(currentPos.current);

    // When dimmed (user has selection), reduce all effects significantly
    const dimFactor = dimmed ? 0.3 : 1.0;
    
    const intensity = pauseState.pauseIntensity;
    const basePulse = 1 + Math.sin(clock.elapsedTime * 3) * 0.15 * dimFactor;
    const pauseScale = 1 + intensity * 0.8 * dimFactor;
    const pausePulse = intensity > 0.1
      ? 1 + Math.sin(clock.elapsedTime * 1.5) * 0.3 * dimFactor
      : basePulse;
    
    meshRef.current.scale.setScalar(0.15 * pausePulse * pauseScale * (dimmed ? 0.5 : 1));

    if (glowRef.current) {
      glowRef.current.position.copy(currentPos.current);
      glowRef.current.scale.setScalar(0.4 * pausePulse * pauseScale * (dimmed ? 0.4 : 1));
      
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (0.35 + intensity * 0.3) * dimFactor;
    }
    
    if (ringRef.current) {
      ringRef.current.position.copy(currentPos.current);
      ringRef.current.quaternion.copy(camera.quaternion);
      
      const ringScale = (0.3 + intensity * 0.5) * (dimmed ? 0.5 : 1);
      ringRef.current.scale.setScalar(ringScale);
      ringRef.current.rotateZ(clock.elapsedTime * 0.5);
      
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = intensity * 0.9 * dimFactor;
    }
  });

  if (!point) return null;

  // State color for state/confidence modes; HSL for entropy mode
  const baseColor = tokenColorMode === 'entropy'
    ? new THREE.Color().setHSL(0.3 + point.tokenProb * 0.3, 0.9, 0.7)
    : getStateColor(point.geometricState, point.stateProbs ? Math.max(...Object.values(point.stateProbs)) : undefined, stateColors);
  const pauseColor = new THREE.Color(COLORS.pauseColor);
  // Pause ring stays amber (orthogonal to state) — only blend pause into glow color
  const color = baseColor.clone().lerp(pauseColor, pauseState.pauseIntensity * 0.5);
  
  // Reduce emissive when dimmed
  const emissiveIntensity = dimmed ? 0.8 : (2.5 + pauseState.pauseIntensity);

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial 
          color={0xffffff} 
          emissive={color} 
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
      
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.35}  // BOOSTED
          depthWrite={false} 
        />
      </mesh>
      
      <mesh ref={ringRef}>
        <ringGeometry args={[0.8, 1, 32]} />
        <meshBasicMaterial 
          color={COLORS.pauseColor} 
          transparent 
          opacity={0} 
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ============================================================================
// Clickable Tokens Layer
// ============================================================================

interface ClickableTokensProps {
  trajectory: TrajectoryPoint[];
  currentToken: TrajectoryPoint | null;
  selectedToken: TrajectoryPoint | null;
  onSelectToken: (token: TrajectoryPoint | null) => void;
  showAllLabels: boolean;
  glowIntensity: number;
  entropyDistortion: boolean;
  signalAmplitude: boolean;  // NEW: Point size from residual norm
  // Context window filtering
  outOfRangeTokens?: TrajectoryPoint[];
  showOutOfRange?: boolean;
}

function ClickableTokens({
  trajectory,
  currentToken,
  selectedToken,
  onSelectToken,
  showAllLabels,
  isGenerating = false,
  glowIntensity,
  entropyDistortion,
  signalAmplitude,
  outOfRangeTokens = [],
  showOutOfRange = true,
}: ClickableTokensProps & { isGenerating?: boolean }) {
  const recentCount = 12;
  
  // Separate prompt and generated tokens from in-range trajectory
  const promptTokens = trajectory.filter(t => t.isPrompt);
  const generatedTokens = trajectory.filter(t => !t.isPrompt);
  
  // For generated tokens: show recent, or all if showAllLabels
  const generatedToShow = showAllLabels 
    ? generatedTokens 
    : generatedTokens.slice(-recentCount);
  
  // Always show all prompt tokens (they're needed for attention arc targets)
  const tokensToShow = [...promptTokens, ...generatedToShow];
  
  // Build set of out-of-range positions for quick lookup
  const outOfRangePositions = useMemo(() => 
    new Set(outOfRangeTokens.map(t => t.position)),
    [outOfRangeTokens]
  );
  
  const handleClick = (point: TrajectoryPoint) => {
    // Toggle selection: click same token to deselect
    if (selectedToken?.position === point.position) {
      onSelectToken(null);
    } else {
      onSelectToken(point);
    }
  };
  
  return (
    <group>
      {/* Render in-range tokens normally */}
      {tokensToShow.map((point) => {
        // Recent = within last recentCount of generated tokens
        const genIndex = generatedTokens.indexOf(point);
        const isRecent = genIndex >= 0 && genIndex >= generatedTokens.length - recentCount;
        
        return (
          <ClickableToken
            key={point.position}
            point={point}
            isSelected={selectedToken?.position === point.position}
            isCurrent={currentToken?.position === point.position}
            isRecent={isRecent}
            onClick={handleClick}
            glowIntensity={glowIntensity}
            entropyDistortion={entropyDistortion}
            signalAmplitude={signalAmplitude}
            ghosted={false}
            tokenIndex={point.position}
          />
        );
      })}
      
      {/* Render out-of-range tokens as ghosts (if enabled) */}
      {showOutOfRange && outOfRangeTokens.map((point) => (
        <ClickableToken
          key={`ghost-${point.position}`}
          point={point}
          isSelected={selectedToken?.position === point.position}
          isCurrent={false}  // Never show as current when ghosted
          isRecent={false}
          onClick={handleClick}
          glowIntensity={glowIntensity}
          entropyDistortion={false}  // No entropy effects on ghosts
          signalAmplitude={false}    // No signal amplitude on ghosts
          ghosted={true}
          tokenIndex={point.position}
        />
      ))}
    </group>
  );
}

// ============================================================================
// Selected Token Info Panel
// ============================================================================

interface SelectedInfoProps {
  token: TrajectoryPoint | null;
  trajectory: TrajectoryPoint[];
  enabledHeads: number[];
  onClear: () => void;
}

function SelectedTokenInfo({ token, trajectory, enabledHeads, onClear }: SelectedInfoProps) {
  if (!token) return null;
  
  const displayText = token.tokenStr.replace(/\n/g, '↵').replace(/ /g, '·');
  
  // Build position map to count actually renderable arcs
  const positionMap = new Map<number, boolean>();
  trajectory.forEach(p => positionMap.set(p.position, true));
  
  // Count arcs that will actually render (matching the filter in AttentionArcs)
  const rawArcCount = token.attentionArcs?.length || 0;
  const sourcePosition = token.position;
  
  // Filter to match exactly what AttentionArcs renders
  const renderableArcs = token.attentionArcs?.filter(arc => {
    // Skip self-attention
    if (arc.to === sourcePosition) return false;
    // Must have coords in positionMap (not indexMap!)
    if (!positionMap.has(arc.to)) return false;
    // Weight and head filters
    return arc.weight > 0.05 && enabledHeads.includes(arc.head);
  }) || [];
  
  // Count unique visual targets (multiple arcs to same position look like one)
  const uniqueTargets = new Set(renderableArcs.map(a => a.to)).size;
  
  return (
    <Billboard position={[token.coords[0], token.coords[1] - 0.35, token.coords[2]]} follow={true}>
      <Text
        fontSize={0.14}
        color={COLORS.selectedColor}
        anchorX="center"
        anchorY="top"
        fillOpacity={0.9}
        outlineWidth={0.008}
        outlineColor="#000000"
      >
        {`"${displayText}" pos:${token.position} → ${uniqueTargets} targets (${renderableArcs.length} arcs)`}
      </Text>
    </Billboard>
  );
}

// ============================================================================
// Uncertainty Static - Visual noise around high-entropy tokens
// ============================================================================
// Creates flickering particles around uncertain tokens - like visual interference
// Perceptually intuitive: noise = uncertainty/instability

const STATIC_PARTICLE_COUNT = 300; // Pool for all high-entropy tokens (boosted from 200)

interface UncertaintyStaticProps {
  trajectory: TrajectoryPoint[];
  enabled: boolean;
}

function UncertaintyStatic({ trajectory, enabled }: UncertaintyStaticProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  
  // Track particle states
  const particles = useRef<Array<{
    offset: THREE.Vector3;
    basePos: THREE.Vector3;
    flicker: number;
    active: boolean;
  }>>(Array.from({ length: STATIC_PARTICLE_COUNT }, () => ({
    offset: new THREE.Vector3(),
    basePos: new THREE.Vector3(),
    flicker: Math.random(),
    active: false,
  })));
  
  // Find high-entropy tokens (threshold at 40% of max for particles)
  const highEntropyTokens = useMemo(() => {
    if (!enabled) return [];
    return trajectory.filter(t => !t.isPrompt && t.entropy > ENTROPY_MAX * 0.4);
  }, [trajectory, enabled]);
  
  useFrame(({ clock }) => {
    if (!meshRef.current || !enabled || highEntropyTokens.length === 0) {
      if (meshRef.current) meshRef.current.count = 0;
      return;
    }
    
    const time = clock.elapsedTime;
    let activeCount = 0;
    
    // Distribute particles among high-entropy tokens
    const particlesPerToken = Math.floor(STATIC_PARTICLE_COUNT / Math.max(1, highEntropyTokens.length));
    
    highEntropyTokens.forEach((token, tokenIdx) => {
      const entropyFactor = Math.min(1, token.entropy / ENTROPY_MAX);
      const particleCount = Math.floor(particlesPerToken * (0.3 + entropyFactor * 0.7));
      
      for (let i = 0; i < particleCount && activeCount < STATIC_PARTICLE_COUNT; i++) {
        const p = particles.current[activeCount];
        
        // Randomize flicker timing per particle
        const flickerPhase = (time * 8 + p.flicker * 100) % 1;
        const isVisible = flickerPhase < 0.6; // 60% visible, 40% hidden - creates flicker
        
        if (isVisible) {
          // Random offset from token center - jittery
          const radius = 0.15 + entropyFactor * 0.1;
          const jitter = Math.sin(time * 20 + i) * 0.03;
          
          // Spherical distribution with noise
          const theta = (i / particleCount) * Math.PI * 2 + time * 0.5;
          const phi = Math.acos(2 * ((i * 0.618) % 1) - 1); // Golden ratio distribution
          
          const x = token.coords[0] + Math.sin(phi) * Math.cos(theta) * (radius + jitter);
          const y = token.coords[1] + Math.sin(phi) * Math.sin(theta) * (radius + jitter);
          const z = token.coords[2] + Math.cos(phi) * (radius + jitter);
          
          tempObject.position.set(x, y, z);
          tempObject.scale.setScalar(0.018 + Math.random() * 0.012); // Boosted from 0.012 + 0.008
          tempObject.updateMatrix();
          meshRef.current!.setMatrixAt(activeCount, tempObject.matrix);
          
          // Color: state-aware for stressed/uncertainty alarm
          const intensity = 0.5 + Math.random() * 0.5;
          if (token.geometricState === 'stressed') {
            // RED static - alarm
            tempColor.setRGB(intensity, intensity * 0.2, intensity * 0.2);
          } else if (token.geometricState === 'uncertainty') {
            // ORANGE static
            tempColor.setRGB(intensity, intensity * 0.6, intensity * 0.1);
          } else {
            // Default white/cyan
            tempColor.setRGB(intensity * 0.8, intensity, intensity);
          }
          meshRef.current!.setColorAt(activeCount, tempColor);
          
          activeCount++;
        }
      }
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
    meshRef.current.count = activeCount;
  });
  
  if (!enabled || highEntropyTokens.length === 0) return null;
  
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, STATIC_PARTICLE_COUNT]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        transparent
        opacity={0.7}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

// ============================================================================
// Selection Glow - Animated brightness indicator for selected tokens
// ============================================================================
// Replaces the old green ring with a perceptually-aligned brightness pulse
// "Focus" = brightness, not arbitrary hue

interface SelectionGlowProps {
  position: [number, number, number];
  size: number;
}

function SelectionGlow({ position, size }: SelectionGlowProps) {
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock, camera }) => {
    const time = clock.elapsedTime;
    
    // Pulsing glow sphere
    if (glowRef.current) {
      const pulse = 1 + Math.sin(time * 3) * 0.15;
      glowRef.current.scale.setScalar(size * 3 * pulse);
      
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.15 + Math.sin(time * 3) * 0.05;
    }
    
    // Rotating ring that faces camera
    if (ringRef.current) {
      ringRef.current.quaternion.copy(camera.quaternion);
      ringRef.current.rotateZ(time * 0.8);
      
      const ringPulse = 1 + Math.sin(time * 4) * 0.1;
      ringRef.current.scale.setScalar(ringPulse);
      
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.5 + Math.sin(time * 4) * 0.2;
    }
  });
  
  return (
    <group position={position}>
      {/* Soft glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.15}
          depthWrite={false}
        />
      </mesh>
      
      {/* Bright pulsing ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[size * 1.8, size * 2.2, 32]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ============================================================================
// Dynamic Background - Confidence-reactive fog and ambient lighting
// ============================================================================
// High confidence = cooler, calmer atmosphere
// Low confidence = warmer, more intense atmosphere

interface DynamicBackgroundProps {
  trajectory: TrajectoryPoint[];
  enabled: boolean;
}

function DynamicBackground({ trajectory, enabled }: DynamicBackgroundProps) {
  const { scene } = useThree();
  const targetColor = useRef(new THREE.Color(COLORS.background));
  const currentColor = useRef(new THREE.Color(COLORS.background));
  const initialized = useRef(false);
  
  // Initialize scene background as Color if needed
  useEffect(() => {
    if (!initialized.current) {
      scene.background = new THREE.Color(COLORS.background);
      initialized.current = true;
    }
  }, [scene]);
  
  // Calculate average confidence of recent tokens
  const avgConfidence = useMemo(() => {
    if (!enabled || trajectory.length === 0) return 0.5;
    
    // Use last 10 tokens for responsiveness
    const recentTokens = trajectory
      .filter(t => !t.isPrompt)
      .slice(-10);
    
    if (recentTokens.length === 0) return 0.5;
    
    const sum = recentTokens.reduce((acc, t) => acc + t.tokenProb, 0);
    return sum / recentTokens.length;
  }, [trajectory, enabled]);
  
  useFrame(() => {
    if (!enabled) {
      // Reset to default
      targetColor.current.set(COLORS.background);
    } else {
      // Shift color based on confidence
      // Low confidence (0) = warmer purple-ish (#0a0512)
      // High confidence (1) = cooler blue-ish (#050510)
      const baseColor = new THREE.Color(COLORS.background);
      const warmColor = new THREE.Color('#0a0512'); // Warm purple tint
      const coolColor = new THREE.Color('#040510'); // Cool blue tint
      
      // Blend based on confidence
      if (avgConfidence < 0.5) {
        // Low confidence: lean warm
        const t = avgConfidence * 2; // 0-0.5 -> 0-1
        targetColor.current.lerpColors(warmColor, baseColor, t);
      } else {
        // High confidence: lean cool
        const t = (avgConfidence - 0.5) * 2; // 0.5-1 -> 0-1
        targetColor.current.lerpColors(baseColor, coolColor, t);
      }
    }
    
    // Smooth transition
    currentColor.current.lerp(targetColor.current, 0.02);
    
    // Update fog color
    if (scene.fog) {
      (scene.fog as THREE.Fog).color.copy(currentColor.current);
    }
    
    // Update scene background (guaranteed to be Color now)
    if (scene.background instanceof THREE.Color) {
      scene.background.copy(currentColor.current);
    }
  });
  
  return null;
}

// ============================================================================
// Pause Indicator
// ============================================================================

interface PauseIndicatorProps {
  pauseState: PauseState;
  position: [number, number, number] | null;
}

function PauseIndicator({ pauseState, position }: PauseIndicatorProps) {
  if (!pauseState.isPaused || !position || pauseState.pauseIntensity < 0.1) return null;
  
  const entropyDisplay = pauseState.entropy?.toFixed(1) || '?';
  
  return (
    <Billboard position={[position[0], position[1] + 0.5, position[2]]} follow={true}>
      <Text
        fontSize={0.18}
        color={COLORS.pauseColor}
        anchorX="center"
        anchorY="middle"
        fillOpacity={0.9}  // BOOSTED
        outlineWidth={0.012}
        outlineColor="#000000"
      >
        uncertain... H={entropyDisplay}
      </Text>
    </Billboard>
  );
}

// ============================================================================
// Main Scene
// ============================================================================

// Context window range type
export interface ContextRange {
  start: number;
  end: number;
}

interface GhostwireSceneProps {
  trajectory: TrajectoryPoint[];
  currentToken: TrajectoryPoint | null;
  isGenerating: boolean;
  pauseState: PauseState;
  showAllLabels?: boolean;
  playbackRate?: number;
  showLandmarks?: boolean;
  showAttentionArcs?: boolean;
  enabledHeads?: number[];
  landmarkOpacity?: number;
  selectedTokenPosition?: number | null;
  onSelectToken?: (position: number | null) => void;
  visualSettings?: VisualSettings;
  // Context window (replay mode)
  contextRange?: ContextRange | null;
  showOutOfRangeTokens?: boolean;
  showOutOfRangeArcs?: boolean;
  showPromptTokens?: boolean;
  // Layer transition animation
  layerTransitionRef?: React.RefObject<LayerTransitionState>;
}

export function GhostwireScene({ 
  trajectory, 
  currentToken, 
  isGenerating,
  pauseState,
  showAllLabels = false,
  playbackRate = 4,
  showLandmarks = false,
  showAttentionArcs = true,
  enabledHeads = [0, 1, 2, 3, 4, 5, 6, 7],
  landmarkOpacity = 0.4,
  selectedTokenPosition = null,
  onSelectToken,
  visualSettings = DEFAULT_VISUAL_SETTINGS,
  contextRange = null,
  showOutOfRangeTokens = true,
  showOutOfRangeArcs = true,
  showPromptTokens = true,
  layerTransitionRef: externalTransitionRef,
}: GhostwireSceneProps) {
  // Default transition ref if none provided
  const defaultTransitionRef = useRef<LayerTransitionState>({ active: false, startTime: 0, duration: 2500, tokenDuration: 400, tokenCount: 0 });
  const layerTransitionRef = externalTransitionRef || defaultTransitionRef;
  // Compute selectedToken from position
  const selectedToken = useMemo(() => {
    if (selectedTokenPosition === null) return null;
    return trajectory.find(t => t.position === selectedTokenPosition) || null;
  }, [trajectory, selectedTokenPosition]);
  
  // Handle token selection - notify parent
  const handleSelectToken = useCallback((token: TrajectoryPoint | null) => {
    if (onSelectToken) {
      onSelectToken(token?.position ?? null);
    }
  }, [onSelectToken]);
  
  // Get palette from settings
  const palette = visualSettings.colorPalette || 'default';
  
  // Compute context window visibility for each token
  // Returns: { inRange: TrajectoryPoint[], outOfRange: TrajectoryPoint[], all: TrajectoryPoint[] }
  const contextFilteredTokens = useMemo(() => {
    // Filter prompt tokens based on visibility toggle
    const promptTokens = showPromptTokens ? trajectory.filter(t => t.isPrompt) : [];
    const generatedTokens = trajectory.filter(t => !t.isPrompt);
    
    // If no context range specified, all generated tokens are in range
    if (!contextRange) {
      return {
        inRange: [...promptTokens, ...generatedTokens],
        outOfRange: [],
        all: trajectory,
      };
    }
    
    // Context range applies to generated token indices (0-based)
    const inRangeGenerated = generatedTokens.filter((_, i) => 
      i >= contextRange.start && i < contextRange.end
    );
    const outOfRangeGenerated = generatedTokens.filter((_, i) => 
      i < contextRange.start || i >= contextRange.end
    );
    
    return {
      // In-range: prompt tokens (if visible) + generated in range
      inRange: [...promptTokens, ...inRangeGenerated],
      // Out-of-range: generated tokens outside range
      outOfRange: outOfRangeGenerated,
      // All tokens for position lookups (needed for attention arcs)
      all: trajectory,
    };
  }, [trajectory, contextRange, showPromptTokens]);
  
  return (
    <Canvas
      camera={{ position: [30, 25, 30], fov: 60 }}
      style={{ background: COLORS.background, touchAction: 'none' }}
      gl={{ antialias: true }}
      dpr={[1, 2]}
    >
      <LayerTransitionContext.Provider value={layerTransitionRef}>
      <PaletteContext.Provider value={palette}>
      <TokenColorModeContext.Provider value={visualSettings.tokenColorMode || 'confidence'}>
      <StatePaletteContext.Provider value={getStatePaletteColors((visualSettings.statePalette as StatePaletteId) ?? 'classic')}>
      {/* Custom OrbitControls with optional auto-drift */}
      <StableOrbitControls autoDrift={visualSettings.cameraAutoDrift} trajectory={trajectory} />

      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1.0} />
      <pointLight position={[-8, -4, -6]} intensity={0.3} color="#6688aa" />

      {/* Starfield - density controlled by settings */}
      {visualSettings.starfieldDensity > 0 && (
        <Stars 
          radius={100} 
          depth={50} 
          count={Math.round(3000 * visualSettings.starfieldDensity)} 
          factor={2} 
          saturation={0} 
          fade 
          speed={0.5} 
        />
      )}
      <fog attach="fog" args={[COLORS.background, visualSettings.fogNear ?? 40, visualSettings.fogFar ?? 120]} />

      {/* Spatial spread: scale from trajectory centroid, not origin */}
      <group
        position={(() => {
          const spread = visualSettings.spatialSpread ?? 1;
          if (spread === 1 || trajectory.length === 0) return [0, 0, 0] as [number, number, number];
          // Compute centroid
          let cx = 0, cy = 0, cz = 0, n = 0;
          for (const pt of trajectory) {
            if (pt.coords && isFinite(pt.coords[0])) {
              cx += pt.coords[0]; cy += pt.coords[1]; cz += pt.coords[2]; n++;
            }
          }
          if (n === 0) return [0, 0, 0] as [number, number, number];
          cx /= n; cy /= n; cz /= n;
          // Offset to keep centroid stationary after scaling
          return [cx * (1 - spread), cy * (1 - spread), cz * (1 - spread)] as [number, number, number];
        })()}
        scale={visualSettings.spatialSpread ?? 1}
      >

      <Landmarks visible={showLandmarks} opacity={landmarkOpacity} />

      {/* Trajectory connections - lines OR cables based on setting */}
      {/* Use filtered trajectory (respects prompt visibility) */}
      {visualSettings.trajectoryStyle === 'lines' && (
        <TrajectoryLine trajectory={contextFilteredTokens.inRange} showOutlierJumps={visualSettings.showOutlierJumps} />
      )}
      {visualSettings.trajectoryStyle === 'cables' && (
        <TrajectoryGlow trajectory={contextFilteredTokens.inRange} enabled={true} />
      )}
      
      <RibbonTrails trajectory={contextFilteredTokens.inRange} enabled={visualSettings.ribbonTrails} />
      <TrajectoryTrail trajectory={contextFilteredTokens.inRange} />
      
      {/* Arc Pulses - energy flowing along attention arcs */}
      {showAttentionArcs && (
        <ArcPulses
          trajectory={trajectory}
          currentToken={currentToken}
          selectedToken={selectedToken}
          enabled={visualSettings.flowParticles}  // Reuses the flowParticles toggle
          enabledHeads={enabledHeads}
          showPromptArcs={showPromptTokens}
          contextRange={contextRange}
          // showGhostedArcPulses defaults to false - no pulses on ghosted arcs
        />
      )}
      
      {showAttentionArcs && (
        <AttentionArcs 
          trajectory={trajectory} 
          currentToken={currentToken}
          selectedToken={selectedToken}
          enabledHeads={enabledHeads}
          arcColorMode={visualSettings.arcColorMode}
          showPromptArcs={showPromptTokens}
          contextRange={contextRange}
          showOutOfRangeArcs={showOutOfRangeArcs}
        />
      )}
      
      <CurrentPoint
        point={currentToken}
        pauseState={pauseState}
        playbackRate={playbackRate}
        dimmed={selectedToken !== null}  // Dim when user has selection
        smoothingLevel={visualSettings.smoothingLevel}
      />
      <ParticleTrails
        targetPosition={currentToken?.coords || null}
        enabled={visualSettings.particleTrails}
        playbackRate={playbackRate}
        smoothingLevel={visualSettings.smoothingLevel}
        currentToken={currentToken}
      />
      
      {/* Clickable tokens with selection support */}
      <ClickableTokens
        trajectory={contextFilteredTokens.inRange}
        currentToken={currentToken}
        selectedToken={selectedToken}
        onSelectToken={handleSelectToken}
        showAllLabels={showAllLabels}
        isGenerating={isGenerating}
        glowIntensity={visualSettings.tokenGlowIntensity}
        entropyDistortion={visualSettings.entropyShapeDistortion}
        signalAmplitude={visualSettings.signalAmplitude}
        outOfRangeTokens={contextFilteredTokens.outOfRange}
        showOutOfRange={showOutOfRangeTokens}
      />
      
      {/* Info panel for selected token */}
      <SelectedTokenInfo 
        token={selectedToken} 
        trajectory={trajectory}
        enabledHeads={enabledHeads}
        onClear={() => handleSelectToken(null)} 
      />
      
      <PauseIndicator 
        pauseState={pauseState} 
        position={currentToken?.coords || null} 
      />
      
      {/* Uncertainty static - flickering noise on high-entropy tokens */}
      <UncertaintyStatic
        trajectory={trajectory}
        enabled={visualSettings.uncertaintyStatic}
      />

      </group>{/* end spatial spread */}

      {/* Dynamic background - confidence-reactive fog color */}
      <DynamicBackground 
        trajectory={trajectory} 
        enabled={visualSettings.dynamicBackground} 
      />

      {/* Post-processing - controlled by settings */}
      {visualSettings.bloomEnabled && (
        <EffectComposer>
          <Bloom 
            luminanceThreshold={visualSettings.bloomThreshold ?? 0.15}
            luminanceSmoothing={0.9} 
            intensity={visualSettings.bloomIntensity + pauseState.pauseIntensity * 0.4}
          />
        </EffectComposer>
      )}
      </StatePaletteContext.Provider>
      </TokenColorModeContext.Provider>
      </PaletteContext.Provider>
      </LayerTransitionContext.Provider>
    </Canvas>
  );
}
