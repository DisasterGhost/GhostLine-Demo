import { decode, encode } from '@msgpack/msgpack';
import { WS_URL } from './config';

// ============================================================================
// Message Types
// ============================================================================

export type SAEFeature = {
  id: number;
  strength: number;
};

export type LoopStats = {
  activation_eff_dim: number;  // E1: entropy-based, per single vector
  direction_change: number | null;
  avg_direction_change: number | null;
  state?: 'HEALTHY' | 'UNSTABLE' | 'LOCKED';
  heat?: number;
  manifold_breadth?: 'WIDE' | 'FOCUSED' | 'NARROW';
};

// Intervention info (Dec 28 - Collapse Prevention)
export type Intervention = {
  type: string;           // "collapse_escape"
  layer: number;          // Target layer (4, 8, 12, 14)
  magnitude: number;      // Strength of intervention
  trigger: string;        // Why it triggered (e.g., "activation_eff_dim=1.2<1.4")
  direction_3d?: [number, number, number];  // For 3D arrow visualization
};

export type TokenData = {
  token_id: number;
  token_str: string;
  position: number;
  coords: [number, number, number];
  layer_coords?: Record<string, [number, number, number]>;  // Pre-computed coords for instant layer switching
  token_prob: number;     // C1: top-1 token probability
  projection_fidelity?: number;  // How well-mapped this region is (instrument signal)
  entropy: number;        // N1: l0_h0_attn_entropy
  residual_norm: number;
  top_k: Array<{ token: string; prob: number }>;
  attention: {
    active: boolean;
    arcs: Array<{
      from: number;
      to: number;
      weight: number;
      head: number;
    }>;
  };
  sae_features?: SAEFeature[];  // Top-k SAE features (if SAE loaded)
  loop_stats?: LoopStats;       // Loop detection stats (ECG for model brain death)
  intervention?: Intervention | null;  // Intervention applied at this token

  // Geometric state from LDA classifier
  geometric_state?: string;     // e.g. 'creativity', 'reasoning', 'retrieval', etc.
  state_probs?: Record<string, number>;  // Probability vector across states
  crystallized?: boolean;       // top1_prob >= 0.5

  // Per-layer metrics
  layer_activation_eff_dims?: Record<string, number>;  // E1 per-layer
  projected_velocity?: number;  // V1: 3D projected velocity
  layer_norms?: Record<string, number>;
  layer_velocities?: Record<string, number>;
  collapse?: { collapsed: boolean; layers: number[] } | null;

  // Multi-classifier data (halluc ensemble + DT state classifier)
  halluc_risk?: number | null;           // Ensemble halluc probability (0-1) — P(fabrication) in v7 3-class
  refuse_prob?: number | null;           // V7 3-class: P(refusal) — model detected unreliable prompt
  halluc_checkpoint?: boolean;           // Was ensemble run this token?
  dt_state?: string | null;             // DT-predicted geometric state
  dt_probs?: Record<string, number> | null;  // DT probability vector
  dt_confidence?: number | null;         // DT confidence (max prob)

  // Running prophecy: evolving blend of prompt-time + gen-time evidence
  running_prophecy?: ProphecyData & { prophecy_weight?: number } | null;
};

export type StartMessage = {
  type: 'start';
  seq: number;
  ts: number;
  data: {
    prompt: string;
    prompt_tokens: number;
    model: string;
    config: {
      temperature: number;
      max_tokens: number;
      lambda_detail?: number;
    };
    n_layers?: number;
    hidden_dim?: number;
    intervention?: Record<string, unknown>;
    capture_layers?: number[];
    layer_info?: {
      available_layers: number[];
      capture_layers: number[];
      render_layer: number;
      attention_layer: number;
      labels: Record<string, string>;
    };
    domain_info?: {
      current: string;
      available: string[];
    };
    prompt_trajectory?: Array<{
      position: number;
      coords: [number, number, number];
      layer_coords?: Record<string, [number, number, number]>;
      token_str: string;
      token_id: number;
      residual_norm?: number;
    }>;
    extraction_layer?: number;
    attention_layer?: number;
    sae_available?: boolean;
  };
};

export type TokenMessage = {
  type: 'token';
  seq: number;
  ts: number;
  data: TokenData;
};

export type EndMessage = {
  type: 'end';
  seq: number;
  ts: number;
  data: {
    reason: 'max_tokens' | 'eos' | 'user_stop';
    total_tokens: number;
    full_text: string;
    classification?: string;
    stats: {
      total_time_ms: number;
      avg_token_ms: number;
      mean_activation_eff_dim?: number;  // E1 mean across generation
      mean_l0_entropy?: number;
    };
    crystallization?: {
      occurred: boolean;
      position: number | null;
    };
    loop_detection?: {
      final_state: string;
      final_heat: number;
      events: Array<{ position: number; event_type: string; reason: string }>;
    };
    intervention_summary?: {
      flagged: boolean;
      total: number;
    };
    // Multi-classifier end data
    halluc_risk_trajectory?: Array<[number, number]>;  // [(token_idx, risk), ...]
    final_halluc_risk?: number | null;
    final_refuse_prob?: number | null;
    final_dt_state?: string | null;
    final_dt_confidence?: number | null;
    // Prophecy comparison
    prophecy?: ProphecyData | null;
    prophecy_correct?: boolean | { any_correct: boolean; attn_correct: boolean | null; geo_correct: boolean | null } | null;
  };
};

export type SinglePrediction = {
  state: string;
  confidence: number;
  probs: Record<string, number>;
};

export type ProphecyData = {
  predicted_state: string | null;
  state_probs: Record<string, number>;
  halluc_risk: number | null;
  refuse_prob?: number | null;
  confidence: number | null;
  // Dual prophecy fields (8B only; absent on 3B)
  mode?: 'consensus' | 'override_geo' | 'override_attn' | 'split' | 'single';
  attn_prediction?: SinglePrediction | null;
  geo_prediction?: SinglePrediction | null;
};

export type ProphecyMessage = {
  type: 'prophecy';
  seq: number;
  ts: number;
  data: ProphecyData;
};

export type PongMessage = {
  type: 'pong';
  seq: number;
  ts: number;
  data: object;
};

export type GhostwireMessage = StartMessage | TokenMessage | EndMessage | ProphecyMessage | PongMessage;

// ============================================================================
// WebSocket Client Options
// ============================================================================

export type GhostwireClientOptions = {
  url?: string;
  onMessage: (msg: GhostwireMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
};

// ============================================================================
// WebSocket Client Class
// ============================================================================

export class GhostwireClient {
  private ws: WebSocket | null = null;
  private url: string;
  private onMessage: (msg: GhostwireMessage) => void;
  private onConnect: () => void;
  private onDisconnect: () => void;
  private onError: (error: Event) => void;

  // Reconnection state
  private reconnectAttempts = 0;
  private readonly maxReconnects = 5;
  private shouldReconnect = true;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(options: GhostwireClientOptions) {
    this.url = options.url || WS_URL;
    this.onMessage = options.onMessage;
    this.onConnect = options.onConnect || (() => {});
    this.onDisconnect = options.onDisconnect || (() => {});
    this.onError = options.onError || (() => {});
  }

  private async reconnect(): Promise<void> {
    if (!this.shouldReconnect) return;

    if (this.reconnectAttempts >= this.maxReconnects) {
      console.error('[Ghostwire] Max reconnection attempts reached');
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s (capped at 30s)
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`[Ghostwire] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnects})`);

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectAttempts++;
      try {
        await this.connect();
        // Reset on successful connect
        this.reconnectAttempts = 0;
      } catch {
        // connect() already handles the error, just continue trying
      }
    }, delay);
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          console.log('[Ghostwire] Connected to server');
          this.onConnect();
          resolve();
        };

        this.ws.onclose = () => {
          console.log('[Ghostwire] Disconnected from server');
          this.onDisconnect();
          // Attempt reconnection if not intentionally disconnected
          this.reconnect();
        };

        this.ws.onerror = (err) => {
          console.error('[Ghostwire] WebSocket error:', err);
          this.onError(err);
          reject(err);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = new Uint8Array(event.data);
            const message = decode(data) as GhostwireMessage;
            this.onMessage(message);
          } catch (e) {
            console.error('[Ghostwire] Failed to decode message:', e);
          }
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  generate(
    prompt: string,
    options?: {
      max_tokens?: number;
      temperature?: number;
      top_p?: number;
      min_p?: number;
      frequency_penalty?: number;
      presence_penalty?: number;
      seed?: number | null;
      mirostat_mode?: number;
      mirostat_tau?: number;
      mirostat_eta?: number;
      repetition_penalty?: number;
      system_prompt?: string;
      lambda_detail?: number;  // Bifocal projection: 0.0-1.5, default 0.5
      halluc_sampling?: string;  // Halluc ensemble sampling frequency
    }
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[Ghostwire] Not connected');
      return;
    }

    const data: Record<string, unknown> = {
      prompt,
      max_tokens: options?.max_tokens || 50,
      temperature: options?.temperature || 0.8,
      top_p: options?.top_p || 1.0,
      repetition_penalty: options?.repetition_penalty || 1.0,
      system_prompt: options?.system_prompt || '',
      lambda_detail: options?.lambda_detail ?? 0.5,
      halluc_sampling: options?.halluc_sampling ?? 'every_25',
    };

    // Only include extended params if non-default
    if (options?.min_p) data.min_p = options.min_p;
    if (options?.frequency_penalty) data.frequency_penalty = options.frequency_penalty;
    if (options?.presence_penalty) data.presence_penalty = options.presence_penalty;
    if (options?.seed != null) data.seed = options.seed;
    if (options?.mirostat_mode) data.mirostat_mode = options.mirostat_mode;
    if (options?.mirostat_tau !== undefined && options.mirostat_mode) data.mirostat_tau = options.mirostat_tau;
    if (options?.mirostat_eta !== undefined && options.mirostat_mode) data.mirostat_eta = options.mirostat_eta;

    this.ws.send(encode({ type: 'generate', data }));
  }

  ping(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(encode({ type: 'ping' }));
  }

  disconnect(): void {
    // Prevent auto-reconnection on intentional disconnect
    this.shouldReconnect = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Reset reconnection state (call before connect() if needed)
  resetReconnection(): void {
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
