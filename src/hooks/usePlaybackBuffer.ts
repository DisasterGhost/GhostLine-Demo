import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface SAEFeature {
  id: number;
  strength: number;
}

export interface LoopStats {
  activation_eff_dim: number;  // E1: entropy-based, per single vector
  direction_change: number | null;
  avg_direction_change: number | null;
}

export interface TrajectoryPoint {
  position: number;
  coords: [number, number, number];
  tokenProb: number;       // C1: top-1 token probability
  projectionConfidence?: number;  // How confident we are in this 3D position (0-1)
  entropy: number;
  tokenStr: string;
  timestamp: number;
  tokenId: number;
  residualNorm: number;
  isPrompt?: boolean;  // true for prompt tokens, false/undefined for generated
  attentionArcs?: Array<{
    from: number;
    to: number;
    weight: number;
    head: number;
    pattern_type?: string;
  }>;
  saeFeatures?: SAEFeature[];  // Top-k SAE features (gpt2-small only)
  loopStats?: LoopStats;       // Backend-computed loop detection stats
  intervention?: any;          // Intervention applied at this token
  geometricState?: string;     // PRIMARY state for coloring (DT when available, else LDA)
  stateProbs?: Record<string, number>;  // Probability vector (DT when available, else LDA)
  ldaState?: string;           // Original LDA-predicted state (for comparison)
  layerEffDims?: Record<string, number>; // E1 per-layer activation effective dimensions
  projectedVelocity?: number;  // V1: 3D projected velocity magnitude
  layerNorms?: Record<string, number>;  // Per-layer residual norms
  layerVelocities?: Record<string, number>;  // Per-layer high-D velocity
  crystallized?: boolean;      // top1_prob >= 0.5
  layer_coords?: Record<string, [number, number, number]>;  // Pre-computed coords for each layer
  _transitionKeyframes?: Array<[number, number, number]>;   // Multi-layer transition path
  logitEntropy?: number | null;            // Output entropy from logit distribution (prefer over attn entropy)
  // Multi-classifier data (Feb 7 2026)
  hallucinationRisk?: number | null;      // Ensemble halluc probability (0-1) — P(fabrication) in v7
  refusalProb?: number | null;           // V7 3-class: P(refusal)
  hallucinationCheckpoint?: boolean;      // Was ensemble run this token?
  dtState?: string | null;               // DT geometric state prediction
  dtProbs?: Record<string, number> | null; // DT 5-state probabilities
  dtConfidence?: number | null;           // DT confidence score
  // Layer transition animation (set by switchLayer)
  _prevCoords?: [number, number, number]; // Previous layer position (for animation lerp)
}

interface BufferConfig {
  playbackRate: number;      // tokens per second (human-watchable ~3-5)
  maxBufferSize: number;     // prevent memory issues
}

export interface LayerTransitionConfig {
  tokenDuration: number;     // Per-token animation ms (single layer jump)
  segmentDuration: number;   // Per-segment ms (multi-layer playthrough)
  minStagger: number;        // Minimum ms between consecutive token starts
  beatDuration: number;      // Pause ms between layer phases (multi-layer only)
}

const DEFAULT_CONFIG: BufferConfig = {
  playbackRate: 4,           // 4 tokens/sec = 250ms per token
  maxBufferSize: 500,
};

const DEFAULT_TRANSITION_CONFIG: LayerTransitionConfig = {
  tokenDuration: 600,
  segmentDuration: 500,
  minStagger: 25,
  beatDuration: 500,
};

// ============================================================================
// Hook
// ============================================================================

export function usePlaybackBuffer(config: Partial<BufferConfig> = {}) {
  const cfg = useRef({ ...DEFAULT_CONFIG, ...config });
  const transitionCfg = useRef<LayerTransitionConfig>({ ...DEFAULT_TRANSITION_CONFIG });
  
  // The buffer: tokens waiting to be displayed
  const bufferRef = useRef<TrajectoryPoint[]>([]);
  
  // Visible trajectory (what actually renders)
  const [visibleTrajectory, setVisibleTrajectory] = useState<TrajectoryPoint[]>([]);
  const [currentToken, setCurrentToken] = useState<TrajectoryPoint | null>(null);
  
  // Playback state - use ref to avoid stale closures
  const [isBuffering, setIsBuffering] = useState(false);
  const isBufferingRef = useRef(false);
  const [bufferSize, setBufferSize] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Sync ref with state
  useEffect(() => {
    isBufferingRef.current = isBuffering;
  }, [isBuffering]);
  
  // Release one token from buffer to visible
  const releaseToken = useCallback(() => {
    if (bufferRef.current.length === 0) {
      return false;
    }
    
    const token = bufferRef.current.shift()!;
    console.log('[Buffer] Releasing:', token.tokenStr, '| remaining:', bufferRef.current.length);
    
    setVisibleTrajectory(prev => [...prev, token]);
    setCurrentToken(token);
    setBufferSize(bufferRef.current.length);
    
    return true;
  }, []);
  
  // Start the playback interval
  const startPlayback = useCallback(() => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const intervalMs = 1000 / cfg.current.playbackRate;
    console.log('[Buffer] Starting interval, period:', intervalMs, 'ms');

    intervalRef.current = setInterval(() => {
      const hasMore = releaseToken();
      if (!hasMore) {
        console.log('[Buffer] Buffer empty, stopping interval');
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsBuffering(false);
      }
    }, intervalMs);
  }, [releaseToken]);
  
  // Add a token (called by WebSocket handler)
  const addToken = useCallback((token: TrajectoryPoint) => {
    const timestampedToken = {
      ...token,
      timestamp: token.timestamp || Date.now()
    };

    bufferRef.current.push(timestampedToken);
    setBufferSize(bufferRef.current.length);

    // Start playback interval if not running
    if (!intervalRef.current) {
      // Release first token immediately so user sees something right away
      releaseToken();
      setIsBuffering(true);
      isBufferingRef.current = true;
      startPlayback();
    }
  }, [releaseToken, startPlayback]);
  
  // Clear everything (for new generation)
  const clear = useCallback(() => {
    console.log('[Buffer] Clearing');
    bufferRef.current = [];
    setVisibleTrajectory([]);
    setCurrentToken(null);
    setBufferSize(0);
    setIsBuffering(false);
    isBufferingRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  // Set prompt tokens (added directly to visible, not buffered)
  const setPromptTokens = useCallback((tokens: TrajectoryPoint[]) => {
    console.log('[Buffer] Setting prompt tokens:', tokens.length);
    setVisibleTrajectory(tokens);
    if (tokens.length > 0) {
      setCurrentToken(tokens[tokens.length - 1]);
    }
  }, []);
  
  // Flush buffer (release all immediately)
  const flush = useCallback(() => {
    console.log('[Buffer] Flushing', bufferRef.current.length, 'tokens');
    const remaining = [...bufferRef.current];
    bufferRef.current = [];
    
    if (remaining.length > 0) {
      setVisibleTrajectory(prev => [...prev, ...remaining]);
      setCurrentToken(remaining[remaining.length - 1]);
    }
    
    setBufferSize(0);
    setIsBuffering(false);
    isBufferingRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  // Adjust playback speed (restarts interval at new rate if running)
  const setPlaybackRate = useCallback((rate: number) => {
    cfg.current.playbackRate = rate;
    // Restart interval at new rate if currently playing
    if (intervalRef.current) {
      startPlayback();
    }
  }, [startPlayback]);
  
  // Set trajectory directly (bypass buffer - used for replay seeking)
  const setTrajectoryDirect = useCallback((tokens: TrajectoryPoint[]) => {
    // Stop any ongoing buffer playback
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    bufferRef.current = [];
    setBufferSize(0);
    setIsBuffering(false);
    isBufferingRef.current = false;

    // Set trajectory directly
    setVisibleTrajectory(tokens);
    if (tokens.length > 0) {
      setCurrentToken(tokens[tokens.length - 1]);
    } else {
      setCurrentToken(null);
    }
  }, []);

  // Layer transition animation state (ref-based, no re-renders during animation)
  const layerTransitionRef = useRef<{
    active: boolean;
    startTime: number;
    duration: number;           // Total animation duration (ms)
    tokenCount: number;         // Total tokens for stagger calculation
    keyframeCount: number;      // Number of keyframe segments (1 = simple lerp)
    // Phase-based timing (for multi-layer sequential playthrough)
    tokenAnimDuration: number;  // How long each token animates per phase
    phaseDuration: number;      // Full cascade duration per phase (stagger + tokenAnim)
    beatDuration: number;       // Pause between phases
  }>({ active: false, startTime: 0, duration: 2500, tokenCount: 0, keyframeCount: 1,
       tokenAnimDuration: 600, phaseDuration: 2500, beatDuration: 0 });

  // Compute cascade timing based on token count and keyframe count
  const computeCascadeTiming = useCallback((tokenCount: number, keyframeSegments: number) => {
    const tc = transitionCfg.current;
    // Per-token animation time (per phase)
    const tokenAnimDuration = keyframeSegments === 1 ? tc.tokenDuration : tc.segmentDuration;
    // Full cascade for one phase: all tokens staggered + each animates
    const phaseDuration = tc.minStagger * Math.max(0, tokenCount - 1) + tokenAnimDuration;
    // Beat between phases (only for multi-layer)
    const beatDuration = keyframeSegments > 1 ? tc.beatDuration : 0;
    // Total: all phases + beats between them
    const duration = keyframeSegments * phaseDuration + Math.max(0, keyframeSegments - 1) * beatDuration;
    return { duration, tokenAnimDuration, phaseDuration, beatDuration };
  }, []);

  // Switch layer coordinates with domino cascade animation (single layer jump)
  const switchLayer = useCallback((layerNum: number) => {
    setVisibleTrajectory(prev => {
      const count = prev.length;
      const timing = computeCascadeTiming(count, 1);
      Object.assign(layerTransitionRef.current, {
        tokenCount: count, keyframeCount: 1, ...timing,
      });
      return prev.map(t => ({
        ...t,
        _prevCoords: t.coords as [number, number, number],
        _transitionKeyframes: undefined,
        coords: t.layer_coords?.[String(layerNum)] || t.coords,
      }));
    });
    layerTransitionRef.current.active = true;
    layerTransitionRef.current.startTime = Date.now();
  }, [computeCascadeTiming]);

  // Switch through a sequence of layers (sequential playthrough)
  // Each phase: cascade all tokens to next layer → beat → next phase
  const switchLayerSequence = useCallback((layerSequence: number[]) => {
    if (layerSequence.length < 2) return;

    const numSegments = layerSequence.length - 1;

    setVisibleTrajectory(prev => {
      const count = prev.length;
      const timing = computeCascadeTiming(count, numSegments);
      Object.assign(layerTransitionRef.current, {
        tokenCount: count, keyframeCount: numSegments, ...timing,
      });

      return prev.map(t => {
        // Build keyframe path from layer_coords
        const keyframes: Array<[number, number, number]> = layerSequence.map(layer =>
          t.layer_coords?.[String(layer)] || t.coords
        );
        return {
          ...t,
          _prevCoords: keyframes[0],
          _transitionKeyframes: keyframes,
          coords: keyframes[keyframes.length - 1], // Final target
        };
      });
    });
    layerTransitionRef.current.active = true;
    layerTransitionRef.current.startTime = Date.now();
  }, [computeCascadeTiming]);

  // Update transition timing config (called when settings change)
  const setTransitionConfig = useCallback((config: Partial<LayerTransitionConfig>) => {
    transitionCfg.current = { ...transitionCfg.current, ...config };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  return {
    // State
    visibleTrajectory,
    currentToken,
    isBuffering,
    bufferSize,

    // Actions
    addToken,
    setPromptTokens,
    clear,
    flush,
    setPlaybackRate,
    setTrajectoryDirect,
    switchLayer,
    switchLayerSequence,
    setTransitionConfig,

    // Layer transition animation
    layerTransitionRef,
  };
}
