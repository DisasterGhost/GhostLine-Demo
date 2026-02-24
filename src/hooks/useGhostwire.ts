import { useState, useEffect, useCallback, useRef } from 'react';
import { GhostwireClient } from '../websocket';
import type { GhostwireMessage, TokenMessage, ProphecyData } from '../websocket';
import { usePlaybackBuffer } from './usePlaybackBuffer';
import { usePauseDetection } from './usePauseDetection';
import { API_ENDPOINTS } from '../config';
import { 
  SessionRecorder, 
  saveSession, 
  loadSession, 
  getSessionStats,
  type GhostwireSession,
  type TrajectoryPoint as RecordingTrajectoryPoint 
} from '../recording';

// Re-export TrajectoryPoint for other components
export type { TrajectoryPoint } from './usePlaybackBuffer';

// Context window range type
export interface ContextRange {
  start: number;
  end: number;
}

// Domain switching types (Gemini Procrustes-LERP spec)
export interface DomainInfo {
  current: string;
  available: string[];
}

export interface DomainTransform {
  scale: number;
  offset: [number, number, number];
  globalCentroid: [number, number, number];
  domainCentroid: [number, number, number];
  disparity: number;
}

// Layer selection types (Dec 28)
export interface LayerInfo {
  available: number[];
  capture: number[];
  render: number;
  attention: number;
  labels: Record<number, string>;
}

// ============================================================================
// Types
// ============================================================================

export interface GenerationStats {
  tokensGenerated: number;
  avgLatency: number;
  totalTime: number;
}

export type HallucinationSampling = 'disabled' | 'start_only' | 'start_mid_end' | 'every_25' | 'every_10' | 'every_token';

export interface GenerationConfig {
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

// ============================================================================
// Hook
// ============================================================================

export function useGhostwire(playbackRate: number = 4) {
  const [isConnected, setIsConnected] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState<GenerationStats | null>(null);
  const [config, setConfig] = useState<GenerationConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawTokenCount, setRawTokenCount] = useState(0);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [lastSession, setLastSession] = useState<GhostwireSession | null>(null);
  const recorderRef = useRef<SessionRecorder>(new SessionRecorder());
  
  // Replay state (separate from live generation)
  const [isReplaying, setIsReplaying] = useState(false);
  const [isReplayPlaying, setIsReplayPlaying] = useState(false);
  const [replayPosition, setReplayPosition] = useState(0);
  const [replaySession, setReplaySession] = useState<GhostwireSession | null>(null);
  const replayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingReviewRef = useRef(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  
  // Context window state - defines visible range of tokens
  const [contextRange, setContextRange] = useState<ContextRange>({ start: 0, end: 0 });
  const [showOutOfRangeTokens, setShowOutOfRangeTokens] = useState(true);  // Ghost by default
  const [showOutOfRangeArcs, setShowOutOfRangeArcs] = useState(true);      // Faded by default
  const [showPromptTokens, setShowPromptTokens] = useState(true);          // Show prompt in 3D by default

  // Domain switching state (Gemini Procrustes-LERP spec)
  const [domainInfo, setDomainInfo] = useState<DomainInfo>({ current: 'global', available: ['global'] });
  const [domainTransform, setDomainTransform] = useState<DomainTransform | null>(null);
  const [isDomainSwitching, setIsDomainSwitching] = useState(false);

  // Layer selection state (Dec 28)
  const [layerInfo, setLayerInfo] = useState<LayerInfo>({
    available: [],
    capture: [],
    render: 14,
    attention: 8,
    labels: {},
  });

  // Intervention state (Dec 28 - Collapse Prevention)
  const [interventionConfig, setInterventionConfig] = useState({
    enabled: false,
    collapse_prevention: true,
    layer: 8,
    strength: 5.0,
    threshold: 1.4,
  });
  const [lastIntervention, setLastIntervention] = useState<{
    type: string;
    layer: number;
    magnitude: number;
    trigger: string;
    direction_3d?: [number, number, number];
  } | null>(null);

  // Prophecy state (pre-generation prediction)
  const [prophecy, setProphecy] = useState<ProphecyData | null>(null);
  const [prophecyCorrect, setProphecyCorrect] = useState<any>(null);  // Rich prophecy verdict from server

  // Batch generation state
  const [batchQueue, setBatchQueue] = useState<string[]>([]);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const batchQueueRef = useRef<string[]>([]);
  const batchTokensRef = useRef(30);
  const batchTotalRef = useRef(0);

  const clientRef = useRef<GhostwireClient | null>(null);
  
  // Playback buffer (for live generation)
  const {
    visibleTrajectory,
    currentToken,
    isBuffering,
    bufferSize,
    addToken,
    setPromptTokens,
    clear: clearBuffer,
    flush,
    setPlaybackRate,
    setTrajectoryDirect,
    switchLayer,
    switchLayerSequence,
    setTransitionConfig,
    layerTransitionRef,
  } = usePlaybackBuffer({ playbackRate });

  // Pause detection (entropy-based)
  const {
    pauseState,
    recordToken: recordTokenEntropy,
    startTracking: startPauseTracking,
    stopTracking: stopPauseTracking,
  } = usePauseDetection({ 
    entropyThreshold: 1.75,
    maxEntropy: 4.0,
  });

  // Use refs to avoid stale closures in the WebSocket callback
  const addTokenRef = useRef(addToken);
  const setPromptTokensRef = useRef(setPromptTokens);
  const clearBufferRef = useRef(clearBuffer);
  const recordTokenEntropyRef = useRef(recordTokenEntropy);
  const startPauseTrackingRef = useRef(startPauseTracking);
  const stopPauseTrackingRef = useRef(stopPauseTracking);
  const setTrajectoryDirectRef = useRef(setTrajectoryDirect);

  // Keep refs up to date
  useEffect(() => {
    addTokenRef.current = addToken;
    setPromptTokensRef.current = setPromptTokens;
    clearBufferRef.current = clearBuffer;
    recordTokenEntropyRef.current = recordTokenEntropy;
    startPauseTrackingRef.current = startPauseTracking;
    stopPauseTrackingRef.current = stopPauseTracking;
    setTrajectoryDirectRef.current = setTrajectoryDirect;
  });

  // ============================================================================
  // Replay Logic
  // ============================================================================

  // Get replay data
  const replayPromptTokens = replaySession?.trajectory.filter(t => t.isPrompt) || [];
  const replayGeneratedTokens = replaySession?.trajectory.filter(t => !t.isPrompt) || [];
  const replayTotalTokens = replayGeneratedTokens.length;
  
  // Initialize context range when entering replay or when total tokens changes
  useEffect(() => {
    if (isReplaying && replayTotalTokens > 0) {
      // Default to showing all tokens
      setContextRange({ start: 0, end: replayTotalTokens });
    }
  }, [isReplaying, replayTotalTokens]);

  // Update visible trajectory when replay position changes
  useEffect(() => {
    if (!isReplaying || !replaySession) return;

    // Show prompt tokens + generated tokens up to current position
    const visibleGenerated = replayGeneratedTokens.slice(0, replayPosition);
    const allVisible = [...replayPromptTokens, ...visibleGenerated];
    
    // Directly set trajectory (bypass buffer)
    setTrajectoryDirectRef.current(allVisible);
    
    // Update raw count
    setRawTokenCount(replayPosition);
  }, [isReplaying, replaySession, replayPosition, replayPromptTokens.length]);

  // Auto-play interval
  useEffect(() => {
    if (isReplaying && isReplayPlaying && replayPosition < replayTotalTokens) {
      const interval = 1000 / playbackRate; // tokens per second based on playback rate
      
      replayIntervalRef.current = setInterval(() => {
        setReplayPosition(prev => {
          if (prev >= replayTotalTokens) {
            setIsReplayPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, interval);
      
      return () => {
        if (replayIntervalRef.current) {
          clearInterval(replayIntervalRef.current);
        }
      };
    }
  }, [isReplaying, isReplayPlaying, replayPosition, replayTotalTokens, playbackRate]);

  // Stop playing when reaching end
  useEffect(() => {
    if (replayPosition >= replayTotalTokens && isReplayPlaying) {
      setIsReplayPlaying(false);
    }
  }, [replayPosition, replayTotalTokens, isReplayPlaying]);

  // ============================================================================
  // WebSocket Message Handler
  // ============================================================================

  const handleMessage = useCallback((msg: GhostwireMessage) => {
    if (msg.type === 'start') {
      console.log('[Ghostwire] Generation started:', msg.data.model);
      setIsGenerating(true);
      setIsReplaying(false);
      setReplaySession(null);
      setIsReviewMode(false);
      pendingReviewRef.current = false;
      clearBufferRef.current();
      setStats(null);
      setError(null);
      setRawTokenCount(0);
      setProphecy(null);
      setProphecyCorrect(null);

      const newConfig = {
        model: msg.data.model,
        prompt: msg.data.prompt,
        temperature: msg.data.config.temperature,
        maxTokens: msg.data.config.max_tokens,
        extractionLayer: msg.data.extraction_layer,
        attentionLayer: msg.data.attention_layer,
        nLayers: msg.data.n_layers,
        hiddenDim: msg.data.hidden_dim,
        saeAvailable: msg.data.sae_available,
        lambdaDetail: msg.data.config.lambda_detail,
      };
      setConfig(newConfig);

      // Capture domain info from start message (Gemini spec)
      if (msg.data.domain_info) {
        setDomainInfo({
          current: msg.data.domain_info.current || 'global',
          available: msg.data.domain_info.available || ['global'],
        });
      }

      // Capture layer info from start message (Dec 28)
      if (msg.data.layer_info) {
        setLayerInfo({
          available: msg.data.layer_info.available_layers || [],
          capture: msg.data.layer_info.capture_layers || [],
          render: msg.data.layer_info.render_layer ?? 14,
          attention: msg.data.layer_info.attention_layer ?? 8,
          labels: msg.data.layer_info.labels || {},
        });
      }
      
      // Start recording
      recorderRef.current.start(
        newConfig.prompt,
        newConfig.model,
        { temperature: newConfig.temperature, maxTokens: newConfig.maxTokens }
      );
      setIsRecording(true);
      
      // Process prompt trajectory if present
      if (msg.data.prompt_trajectory && msg.data.prompt_trajectory.length > 0) {
        const promptTokens = msg.data.prompt_trajectory.map((pt: any) => ({
          position: pt.position,
          coords: pt.coords as [number, number, number],
          layer_coords: pt.layer_coords,  // Pre-computed coords for instant layer switching
          confidence: 1.0,
          tokenProb: 0,
          entropy: 0,
          tokenStr: pt.token_str,
          timestamp: msg.ts,
          tokenId: pt.token_id,
          residualNorm: pt.residual_norm ?? 0,
          isPrompt: true,
        }));
        console.log('[Ghostwire] Loaded prompt trajectory:', promptTokens.length, 'tokens');
        setPromptTokensRef.current(promptTokens);
        
        // Record prompt tokens
        recorderRef.current.addPromptTokens(promptTokens);
      }
      
      startPauseTrackingRef.current();
    } else if (msg.type === 'prophecy') {
      // Pre-generation state prediction (arrives before first token)
      console.log('[Ghostwire] Prophecy received:', msg.data);
      setProphecy(msg.data);
      setProphecyCorrect(null);  // Reset — will be set at end
    } else if (msg.type === 'token') {
      const tokenMsg = msg as TokenMessage;

      // Record entropy for pause detection
      recordTokenEntropyRef.current(tokenMsg.data.entropy, tokenMsg.data.token_prob);

      const tokenData = {
        position: tokenMsg.data.position,
        coords: tokenMsg.data.coords as [number, number, number],
        layer_coords: tokenMsg.data.layer_coords,  // Pre-computed coords for instant layer switching
        tokenProb: tokenMsg.data.token_prob,  // C1: top-1 token probability
        projectionFidelity: tokenMsg.data.projection_fidelity,
        entropy: tokenMsg.data.entropy,  // N1: l0_h0_attn_entropy
        tokenStr: tokenMsg.data.token_str,
        timestamp: msg.ts,
        tokenId: tokenMsg.data.token_id,
        residualNorm: tokenMsg.data.residual_norm,
        attentionArcs: tokenMsg.data.attention?.arcs,
        saeFeatures: tokenMsg.data.sae_features,
        loopStats: tokenMsg.data.loop_stats,  // Backend-computed loop detection (activation_eff_dim inside)
        intervention: tokenMsg.data.intervention || null,  // Intervention applied at this token
        // LDA/SCL is primary (continuous geometry, r(T,C)=0.9769). DT is secondary comparison.
        // String() coercion: msgpack may decode str as non-string type that fails key lookups
        geometricState: tokenMsg.data.geometric_state != null ? String(tokenMsg.data.geometric_state) : (tokenMsg.data.dt_state != null ? String(tokenMsg.data.dt_state) : undefined),
        stateProbs: (() => {
          const raw = tokenMsg.data.state_probs ?? tokenMsg.data.dt_probs;
          if (!raw || typeof raw !== 'object') return undefined;
          // Coerce keys to strings (msgpack may decode as non-string)
          const out: Record<string, number> = {};
          for (const [k, v] of Object.entries(raw)) { out[String(k)] = v as number; }
          return out;
        })(),
        ldaState: tokenMsg.data.geometric_state != null ? String(tokenMsg.data.geometric_state) : undefined,
        layerEffDims: tokenMsg.data.layer_activation_eff_dims,  // E1 per-layer
        projectedVelocity: tokenMsg.data.projected_velocity,  // V1: 3D projected velocity
        layerNorms: tokenMsg.data.layer_norms,  // Per-layer residual norms
        layerVelocities: tokenMsg.data.layer_velocities,  // V2: Per-layer high-D velocity
        crystallized: tokenMsg.data.crystallized,  // top1_prob >= 0.5
        // Multi-classifier data
        hallucinationRisk: tokenMsg.data.halluc_risk ?? null,
        refusalProb: tokenMsg.data.refuse_prob ?? null,
        hallucinationCheckpoint: tokenMsg.data.halluc_checkpoint ?? false,
        dtState: tokenMsg.data.dt_state != null ? String(tokenMsg.data.dt_state) : null,
        dtProbs: tokenMsg.data.dt_probs ?? null,
        dtConfidence: tokenMsg.data.dt_confidence ?? null,
        isPrompt: false,
      };
      
      // Add to buffer
      addTokenRef.current(tokenData);

      // Update prophecy with running (evolving) prediction from gen-time evidence
      if (tokenMsg.data.running_prophecy) {
        const rp = tokenMsg.data.running_prophecy;
        // Coerce state_probs keys to strings (msgpack safety)
        const coercedProbs: Record<string, number> = {};
        if (rp.state_probs && typeof rp.state_probs === 'object') {
          for (const [k, v] of Object.entries(rp.state_probs)) {
            coercedProbs[String(k)] = v as number;
          }
        }
        setProphecy({
          ...rp,
          state_probs: coercedProbs,
          predicted_state: rp.predicted_state != null ? String(rp.predicted_state) : null,
        });
      }

      // Track intervention for UI
      if (tokenMsg.data.intervention) {
        setLastIntervention(tokenMsg.data.intervention);
      }

      // Record token
      recorderRef.current.addToken(tokenData);
      
      setRawTokenCount(prev => prev + 1);
    } else if (msg.type === 'end') {
      console.log('[Ghostwire] Generation complete:', msg.data.stats);
      setIsGenerating(false);
      stopPauseTrackingRef.current();
      setStats({
        tokensGenerated: msg.data.total_tokens,
        avgLatency: msg.data.stats.avg_token_ms,
        totalTime: msg.data.stats.total_time_ms,
      });
      
      // Capture prophecy correctness from end message
      if ('prophecy_correct' in msg.data && msg.data.prophecy_correct != null) {
        setProphecyCorrect(msg.data.prophecy_correct);
      }

      // Stop recording and save session
      const session = recorderRef.current.stop();
      if (session) {
        setLastSession(session);
        setIsRecording(false);
        console.log('[Ghostwire] Session recorded:', getSessionStats(session));
      }
      
      // Flag for auto-review after buffer drains
      if (!batchQueueRef.current.length) {
        pendingReviewRef.current = true;
      }

      // Check if there are more batch items to process
      if (batchQueueRef.current.length > 0) {
        const nextPrompt = batchQueueRef.current.shift()!;
        setBatchQueue([...batchQueueRef.current]);
        setBatchProgress(prev => ({ ...prev, current: prev.current + 1 }));
        
        setTimeout(() => {
          if (clientRef.current?.isConnected) {
            clientRef.current.generate(nextPrompt, {
              max_tokens: batchTokensRef.current,
            });
          }
        }, 500);
      } else if (batchQueueRef.current.length === 0 && batchTotalRef.current > 0) {
        batchTotalRef.current = 0;
        setIsBatchRunning(false);
        setBatchProgress({ current: 0, total: 0 });
        console.log('[Ghostwire] Batch complete!');
      }
    }
  }, []);

  // Connect on mount
  useEffect(() => {
    const client = new GhostwireClient({
      onMessage: handleMessage,
      onConnect: () => {
        setIsConnected(true);
        setError(null);
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onError: () => {
        setError('Connection failed. Is the server running?');
      },
    });

    client.connect().catch((e) => {
      console.error('[Ghostwire] Failed to connect:', e);
      setError('Could not connect to server. Make sure it is running on port 8765.');
    });

    clientRef.current = client;

    return () => {
      client.disconnect();
    };
  }, [handleMessage]);

  // ============================================================================
  // Actions
  // ============================================================================

  const generate = useCallback(
    (
      prompt: string,
      options?: {
        maxTokens?: number;
        temperature?: number;
        topP?: number;
        minP?: number;
        frequencyPenalty?: number;
        presencePenalty?: number;
        seed?: number | null;
        mirostatMode?: number;
        mirostatTau?: number;
        mirostatEta?: number;
        repetitionPenalty?: number;
        systemPrompt?: string;
        lambdaDetail?: number;
        hallucinationSampling?: HallucinationSampling;
      }
    ) => {
      if (clientRef.current && clientRef.current.isConnected) {
        setError(null);
        clearBufferRef.current();
        pendingReviewRef.current = false;
        setIsReviewMode(false);
        setIsReplaying(false);
        setReplaySession(null);
        clientRef.current.generate(prompt, {
          max_tokens: options?.maxTokens,
          temperature: options?.temperature,
          top_p: options?.topP,
          min_p: options?.minP,
          frequency_penalty: options?.frequencyPenalty,
          presence_penalty: options?.presencePenalty,
          seed: options?.seed,
          mirostat_mode: options?.mirostatMode,
          mirostat_tau: options?.mirostatTau,
          mirostat_eta: options?.mirostatEta,
          repetition_penalty: options?.repetitionPenalty,
          system_prompt: options?.systemPrompt,
          lambda_detail: options?.lambdaDetail,
          halluc_sampling: options?.hallucinationSampling,
        });
      } else {
        setError('Not connected to server');
      }
    },
    []
  );

  const clear = useCallback(() => {
    clearBufferRef.current();
    setStats(null);
    setConfig(null);
    setRawTokenCount(0);
    setLastSession(null);
    setIsReplaying(false);
    setIsReviewMode(false);
    setReplaySession(null);
    setReplayPosition(0);
    setIsReplayPlaying(false);
    pendingReviewRef.current = false;
  }, []);

  // ============================================================================
  // Recording Functions
  // ============================================================================

  const saveLastSession = useCallback(() => {
    if (lastSession) {
      saveSession(lastSession);
    } else {
      console.warn('[Ghostwire] No session to save');
    }
  }, [lastSession]);

  const loadAndReplay = useCallback(async (file: File) => {
    try {
      const session = await loadSession(file);
      
      // Clear current state
      clearBufferRef.current();
      setStats(null);
      setError(null);
      setRawTokenCount(0);
      
      // Enter replay mode (file-loaded, not review)
      setIsReplaying(true);
      setIsReviewMode(false);
      setReplaySession(session);
      setReplayPosition(0);
      setIsReplayPlaying(false);
      setLastSession(session);
      
      // Set config from session
      setConfig({
        model: session.model,
        prompt: session.prompt,
        temperature: session.config.temperature,
        maxTokens: session.config.maxTokens,
      });
      
      console.log(`[Ghostwire] Loaded session for replay: ${session.trajectory.length} total points`);
      
    } catch (err) {
      setError(`Failed to load session: ${err}`);
      console.error('[Ghostwire] Load failed:', err);
    }
  }, []);

  // ============================================================================
  // Post-Generation Review
  // ============================================================================

  const enterReview = useCallback(() => {
    if (!lastSession) return;
    const generatedCount = lastSession.trajectory.filter((t: any) => !t.isPrompt).length;
    // Set context range BEFORE entering replay to avoid one-frame flash
    setContextRange({ start: 0, end: generatedCount });
    setIsReplaying(true);
    setIsReviewMode(true);
    setReplaySession(lastSession);
    setReplayPosition(generatedCount); // Start at end (all visible)
    setIsReplayPlaying(false);
    console.log('[Ghostwire] Entered review mode:', generatedCount, 'generated tokens');
  }, [lastSession]);

  // Auto-enter review mode after generation completes and buffer drains
  useEffect(() => {
    if (pendingReviewRef.current && !isGenerating && !isBuffering && lastSession && !isReplaying) {
      pendingReviewRef.current = false;
      enterReview();
    }
  }, [isGenerating, isBuffering, lastSession, isReplaying, enterReview]);

  // ============================================================================
  // Replay Controls
  // ============================================================================

  const replayPlayPause = useCallback(() => {
    if (!isReplaying) return;
    setIsReplayPlaying(prev => !prev);
  }, [isReplaying]);

  const replaySeek = useCallback((position: number) => {
    if (!isReplaying) return;
    const clamped = Math.max(0, Math.min(position, replayTotalTokens));
    setReplayPosition(clamped);
  }, [isReplaying, replayTotalTokens]);

  const replayStepForward = useCallback(() => {
    if (!isReplaying || replayPosition >= replayTotalTokens) return;
    setReplayPosition(prev => prev + 1);
  }, [isReplaying, replayPosition, replayTotalTokens]);

  const replayStepBack = useCallback(() => {
    if (!isReplaying || replayPosition <= 0) return;
    setReplayPosition(prev => prev - 1);
  }, [isReplaying, replayPosition]);

  const replayJumpToStart = useCallback(() => {
    if (!isReplaying) return;
    setReplayPosition(0);
    setIsReplayPlaying(false);
  }, [isReplaying]);

  const replayJumpToEnd = useCallback(() => {
    if (!isReplaying) return;
    setReplayPosition(replayTotalTokens);
    setIsReplayPlaying(false);
  }, [isReplaying, replayTotalTokens]);
  
  // Context window controls
  const updateContextRange = useCallback((range: ContextRange) => {
    if (!isReplaying) return;
    // Clamp values
    const start = Math.max(0, Math.min(range.start, replayTotalTokens - 1));
    const end = Math.max(start + 1, Math.min(range.end, replayTotalTokens));
    setContextRange({ start, end });
  }, [isReplaying, replayTotalTokens]);
  
  const focusAroundPlayhead = useCallback((delta: number) => {
    if (!isReplaying) return;
    const start = Math.max(0, replayPosition - delta);
    const end = Math.min(replayTotalTokens, replayPosition + delta);
    setContextRange({ start, end });
  }, [isReplaying, replayPosition, replayTotalTokens]);
  
  const showAllTokens = useCallback(() => {
    if (!isReplaying) return;
    setContextRange({ start: 0, end: replayTotalTokens });
  }, [isReplaying, replayTotalTokens]);
  
  const toggleOutOfRangeTokens = useCallback(() => {
    setShowOutOfRangeTokens(prev => !prev);
  }, []);
  
  const toggleOutOfRangeArcs = useCallback(() => {
    setShowOutOfRangeArcs(prev => !prev);
  }, []);
  
  const togglePromptTokens = useCallback(() => {
    setShowPromptTokens(prev => !prev);
  }, []);

  // ============================================================================
  // Batch Functions
  // ============================================================================

  const runBatch = useCallback((prompts: string[], tokensPerRun: number = 30) => {
    if (!clientRef.current?.isConnected || prompts.length === 0) return;
    
    console.log(`[Ghostwire] Starting batch: ${prompts.length} generations`);
    
    batchQueueRef.current = [...prompts];
    batchTokensRef.current = tokensPerRun;
    batchTotalRef.current = prompts.length;
    setBatchQueue([...prompts]);
    setBatchProgress({ current: 0, total: prompts.length });
    setIsBatchRunning(true);
    
    const firstPrompt = batchQueueRef.current.shift()!;
    setBatchQueue([...batchQueueRef.current]);
    
    clientRef.current.generate(firstPrompt, {
      max_tokens: tokensPerRun,
    });
  }, []);

  const cancelBatch = useCallback(() => {
    batchQueueRef.current = [];
    batchTotalRef.current = 0;
    setBatchQueue([]);
    setBatchProgress({ current: 0, total: 0 });
    setIsBatchRunning(false);
    console.log('[Ghostwire] Batch cancelled');
  }, []);

  // ============================================================================
  // Domain Switching (Gemini Procrustes-LERP spec)
  // ============================================================================

  const switchDomain = useCallback(async (domain: string) => {
    if (domain === domainInfo.current) {
      console.log('[Ghostwire] Already on domain:', domain);
      return;
    }

    if (!domainInfo.available.includes(domain)) {
      console.warn('[Ghostwire] Domain not available:', domain);
      return;
    }

    setIsDomainSwitching(true);

    try {
      const response = await fetch(API_ENDPOINTS.setDomain, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });

      const data = await response.json();

      if (data.error) {
        console.error('[Ghostwire] Domain switch failed:', data.error);
        setError(`Domain switch failed: ${data.error}`);
        return;
      }

      console.log('[Ghostwire] Domain switched:', data);

      // Update domain info
      setDomainInfo(prev => ({ ...prev, current: domain }));

      // Store transform for LERP animation
      if (data.transform) {
        setDomainTransform({
          scale: data.transform.scale,
          offset: data.transform.offset as [number, number, number],
          globalCentroid: data.transform.global_centroid as [number, number, number],
          domainCentroid: data.transform.domain_centroid as [number, number, number],
          disparity: data.transform.disparity,
        });
      } else {
        setDomainTransform(null);
      }

    } catch (err) {
      console.error('[Ghostwire] Domain switch error:', err);
      setError(`Domain switch error: ${err}`);
    } finally {
      setIsDomainSwitching(false);
    }
  }, [domainInfo]);

  // ============================================================================
  // Layer Selection (Dec 28)
  // ============================================================================

  const setLayers = useCallback(async (layers: { capture?: number[]; render?: number; attention?: number }) => {
    try {
      const response = await fetch(API_ENDPOINTS.setLayers, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(layers),
      });

      const data = await response.json();

      if (data.error) {
        console.error('[Ghostwire] Layer change failed:', data.error);
        setError(`Layer change failed: ${data.error}`);
        return;
      }

      console.log('[Ghostwire] Layers updated:', data);

      // Update local state
      setLayerInfo(prev => ({
        ...prev,
        ...(layers.capture !== undefined && { capture: layers.capture }),
        ...(layers.render !== undefined && { render: layers.render }),
        ...(layers.attention !== undefined && { attention: layers.attention }),
      }));

      // Layer switching: if render layer changed, animate through intermediate layers
      if (layers.render !== undefined) {
        const currentRender = layerInfo.render;
        const target = layers.render;
        const capture = layerInfo.capture;

        const currentIdx = capture.indexOf(currentRender);
        const targetIdx = capture.indexOf(target);

        if (currentIdx !== -1 && targetIdx !== -1 && Math.abs(currentIdx - targetIdx) > 1) {
          // Multiple layers apart — build sequence through intermediates
          const step = currentIdx < targetIdx ? 1 : -1;
          const sequence: number[] = [];
          for (let i = currentIdx; step > 0 ? i <= targetIdx : i >= targetIdx; i += step) {
            sequence.push(capture[i]);
          }
          console.log('[Ghostwire] Layer sequence:', sequence.map(l => `L${l}`).join(' → '));
          switchLayerSequence(sequence);
        } else {
          // Adjacent or same — simple switch
          console.log('[Ghostwire] Switching trajectory to layer', target);
          switchLayer(target);
        }
      }

    } catch (err) {
      console.error('[Ghostwire] Layer change error:', err);
      setError(`Layer change error: ${err}`);
    }
  }, [switchLayer, switchLayerSequence, layerInfo.render, layerInfo.capture]);

  // ============================================================================
  // Intervention Control (Dec 28 - Collapse Prevention)
  // ============================================================================

  const setInterventions = useCallback(async (config: {
    enabled?: boolean;
    collapse_prevention?: boolean;
    layer?: number;
    strength?: number;
    threshold?: number;
  }) => {
    try {
      const response = await fetch(API_ENDPOINTS.interventions, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (data.error) {
        console.error('[Ghostwire] Intervention config failed:', data.error);
        setError(`Intervention config failed: ${data.error}`);
        return;
      }

      console.log('[Ghostwire] Interventions updated:', data);

      // Update local state
      setInterventionConfig(prev => ({
        ...prev,
        ...config,
      }));

      // Clear last intervention if disabled
      if (config.enabled === false) {
        setLastIntervention(null);
      }

    } catch (err) {
      console.error('[Ghostwire] Intervention config error:', err);
      setError(`Intervention config error: ${err}`);
    }
  }, []);

  return {
    // Connection state
    isConnected,
    error,

    // Generation state
    isGenerating,
    trajectory: visibleTrajectory,
    currentToken,
    stats,
    config,
    
    // Buffer state
    isBuffering,
    bufferSize,
    rawTokenCount,

    // Pause state
    pauseState,

    // Recording state
    isRecording,
    lastSession,
    hasSession: lastSession !== null,

    // Replay state
    isReplaying,
    isReplayPlaying,
    isReviewMode,
    replayPosition,
    replayTotalTokens,

    // Batch state
    isBatchRunning,
    batchProgress,

    // Actions
    generate,
    clear,
    flush,
    setPlaybackRate,
    runBatch,
    cancelBatch,
    
    // Recording actions
    saveLastSession,
    loadAndReplay,

    // Replay controls
    replayPlayPause,
    replaySeek,
    replayStepForward,
    replayStepBack,
    replayJumpToStart,
    replayJumpToEnd,
    
    // Context window controls
    contextRange,
    updateContextRange,
    focusAroundPlayhead,
    showAllTokens,
    showOutOfRangeTokens,
    toggleOutOfRangeTokens,
    showOutOfRangeArcs,
    toggleOutOfRangeArcs,
    showPromptTokens,
    togglePromptTokens,

    // Domain switching (Gemini Procrustes-LERP spec)
    domainInfo,
    domainTransform,
    isDomainSwitching,
    switchDomain,

    // Layer selection (Dec 28)
    layerInfo,
    setLayers,

    // Interventions (Dec 28 - Collapse Prevention)
    interventionConfig,
    lastIntervention,
    setInterventions,

    // Prophecy (pre-generation prediction)
    prophecy,
    prophecyCorrect,

    // Layer transition animation
    layerTransitionRef,
    setTransitionConfig,
  };
}
