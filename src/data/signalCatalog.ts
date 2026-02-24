/**
 * signalCatalog.ts — Single source of truth for all GhostLine signals.
 *
 * Mirrors the backend `SignalSet` dataclass in `src/ghostline/capture/config.py`.
 * Used by SignalSelector, SignalExplorer, HypothesisPanel, ComparePanel, SweepPanel.
 */

// ============================================================================
// Types
// ============================================================================

export type SignalCategory =
  | 'prompt'
  | 'residual'
  | 'attention'
  | 'mlp'
  | 'logit_lens'
  | 'output'
  | 'temporal'
  | 'statistics'
  | 'expensive';

export interface SignalDef {
  /** Backend field name on SignalSet (e.g., 'attention_entropy') */
  key: string;
  /** Human-readable label (e.g., 'Attention Entropy') */
  label: string;
  /** One-liner tooltip */
  description: string;
  category: SignalCategory;
  /** True = captured at each layer */
  perLayer: boolean;
  /** True = per-attention-head */
  perHead: boolean;
  /** High memory cost — show warning */
  expensive: boolean;
  /** Links to wiki entry */
  wikiId?: string;
}

export type AggregationMethod =
  | 'per_token'
  | 'first'
  | 'last'
  | 'mean'
  | 'std'
  | 'min'
  | 'max'
  | 'median'
  | 'trend'
  | 'autocorr'
  | 'svd'
  | 'window';

export interface AggregationDef {
  id: AggregationMethod;
  label: string;
  description: string;
}

export interface SignalConfig {
  /** Signal key -> enabled */
  signals: Record<string, boolean>;
  /** Which aggregation methods to compute */
  aggregations: AggregationMethod[];
  /** Window size for 'window' aggregation */
  windowSize: number;
  /** Capture all model layers */
  captureAllLayers: boolean;
  /** Specific layers to capture (when captureAllLayers=false) */
  captureLayers: number[];
  /** Active preset name, or null for custom */
  preset: string | null;
}

// ============================================================================
// Category metadata
// ============================================================================

export const CATEGORY_INFO: Record<SignalCategory, { label: string; description: string }> = {
  prompt:     { label: 'Prompt-time',          description: 'Signals captured during prompt encoding (before generation)' },
  residual:   { label: 'Residual Stream',      description: 'Hidden states and decomposition' },
  attention:  { label: 'Attention',            description: 'Attention patterns, entropy, routing' },
  mlp:        { label: 'MLP',                  description: 'Feed-forward network internals' },
  logit_lens: { label: 'Logit Lens',           description: 'Per-layer prediction confidence' },
  output:     { label: 'Output',               description: 'Generation-time token probabilities' },
  temporal:   { label: 'Temporal / Dynamics',   description: 'Derived dynamics computed in post-processing' },
  statistics: { label: 'Statistics',            description: 'Within-sample statistical summaries' },
  expensive:  { label: 'Expensive',             description: 'High memory/compute — use sparingly' },
};

export const CATEGORY_ORDER: SignalCategory[] = [
  'attention', 'residual', 'mlp', 'logit_lens', 'output', 'temporal', 'statistics', 'prompt', 'expensive',
];

// ============================================================================
// Signal definitions — mirrors SignalSet fields
// ============================================================================

export const SIGNAL_CATALOG: SignalDef[] = [
  // --- Attention (8 signals) ---
  { key: 'attention_entropy',    label: 'Entropy',       description: 'Per-head attention entropy — top halluc feature at 8B',           category: 'attention', perLayer: true, perHead: true,  expensive: false, wikiId: 'attention-entropy' },
  { key: 'attention_bos',        label: 'BOS',           description: 'Attention weight on BOS token — reasoning vs retrieval marker',   category: 'attention', perLayer: true, perHead: true,  expensive: false, wikiId: 'bos-attention' },
  { key: 'attention_local',      label: 'Local',         description: 'Attention to last 3 tokens — halluc marker (L13, L20)',           category: 'attention', perLayer: true, perHead: true,  expensive: false, wikiId: 'local-attention' },
  { key: 'attention_to_prompt',  label: 'To-prompt',     description: 'Total attention to prompt region',                                category: 'attention', perLayer: true, perHead: true,  expensive: false },
  { key: 'attention_skewness',   label: 'Skewness',      description: 'Attention distribution skewness',                                 category: 'attention', perLayer: true, perHead: true,  expensive: false },
  { key: 'attention_kurtosis',   label: 'Kurtosis',      description: 'Attention distribution kurtosis (heavier compute)',                category: 'attention', perLayer: true, perHead: true,  expensive: true },
  { key: 'attention_self',       label: 'Self',          description: 'Self-attention (diagonal) — token attending to itself',            category: 'attention', perLayer: true, perHead: true,  expensive: false },
  { key: 'attention_raw',        label: 'Raw weights',   description: 'Full attention weight matrices per layer',                        category: 'attention', perLayer: true, perHead: true,  expensive: true },

  // --- Residual Stream (2 signals) ---
  { key: 'residual_states',          label: 'Hidden States',      description: 'Full hidden state vectors (d_model per layer)',          category: 'residual', perLayer: true, perHead: false, expensive: false, wikiId: 'residual-norm' },
  { key: 'residual_decomposition',   label: 'Decomposition',      description: 'Attention vs MLP contribution to residual',             category: 'residual', perLayer: true, perHead: false, expensive: false },

  // --- MLP (5 signals) ---
  { key: 'mlp_amplification',  label: 'Amplification',   description: 'Output/input norm ratio — MLP gain',                   category: 'mlp', perLayer: true, perHead: false, expensive: false, wikiId: 'mlp-amplification' },
  { key: 'mlp_sparsity',       label: 'Sparsity',        description: 'Fraction below activation threshold',                   category: 'mlp', perLayer: true, perHead: false, expensive: false },
  { key: 'mlp_gate_sparsity',  label: 'Gate Sparsity',   description: 'SwiGLU gate sparsity pattern',                          category: 'mlp', perLayer: true, perHead: false, expensive: false },
  { key: 'mlp_hidden',         label: 'Hidden Acts',     description: 'MLP hidden layer activations at selected layers',        category: 'mlp', perLayer: true, perHead: false, expensive: true },
  { key: 'mlp_top_neurons',    label: 'Top Neurons',     description: 'Track top-k active neurons per layer',                   category: 'mlp', perLayer: true, perHead: false, expensive: false },

  // --- Logit Lens (4 signals) ---
  { key: 'logit_entropy',     label: 'Prediction Entropy', description: 'Entropy of per-layer logit predictions',              category: 'logit_lens', perLayer: true, perHead: false, expensive: false, wikiId: 'logit-lens' },
  { key: 'logit_top1',        label: 'Top-1 Prob',         description: 'Probability of top prediction at each layer',         category: 'logit_lens', perLayer: true, perHead: false, expensive: false },
  { key: 'logit_top_k',       label: 'Top-K Preds',        description: 'Top-K prediction tokens and probabilities',           category: 'logit_lens', perLayer: true, perHead: false, expensive: false },
  { key: 'logit_final_rank',  label: 'Final Rank',         description: 'Rank of final token in each layer prediction',        category: 'logit_lens', perLayer: true, perHead: false, expensive: false },

  // --- Output (3 signals) ---
  { key: 'output_token_probs',   label: 'Token Prob',     description: 'p(selected token) at generation time',                 category: 'output', perLayer: false, perHead: false, expensive: false, wikiId: 'token-prob' },
  { key: 'output_token_entropy', label: 'Token Entropy',   description: 'Full output distribution entropy',                     category: 'output', perLayer: false, perHead: false, expensive: false },
  { key: 'output_token_rank',    label: 'Token Rank',      description: 'Rank of selected token in vocabulary',                 category: 'output', perLayer: false, perHead: false, expensive: false },

  // --- Temporal / Dynamics (6 signals) ---
  { key: 'compute_velocity',     label: 'Velocity',       description: 'Per-layer token-to-token distance (V2) — top 3B feature', category: 'temporal', perLayer: true,  perHead: false, expensive: false, wikiId: 'velocity' },
  { key: 'compute_acceleration', label: 'Acceleration',    description: 'Rate of velocity change',                                 category: 'temporal', perLayer: true,  perHead: false, expensive: false },
  { key: 'compute_jerk',         label: 'Jerk',            description: 'Rate of acceleration change (3rd derivative)',             category: 'temporal', perLayer: true,  perHead: false, expensive: false },
  { key: 'compute_curvature',    label: 'Curvature',       description: 'Trajectory curvature in residual space',                   category: 'temporal', perLayer: true,  perHead: false, expensive: false },
  { key: 'compute_trends',       label: 'Trends',          description: 'Linear slopes across token positions',                     category: 'temporal', perLayer: true,  perHead: false, expensive: false },
  { key: 'compute_autocorr',     label: 'Autocorrelation', description: 'Temporal autocorrelation at lag-1 and lag-5',              category: 'temporal', perLayer: true,  perHead: false, expensive: false },

  // --- Statistics (3 signals) ---
  { key: 'compute_covariance',  label: 'Covariance',    description: 'Signal covariance matrix across features',              category: 'statistics', perLayer: false, perHead: false, expensive: false },
  { key: 'compute_skewness',    label: 'Skewness',      description: 'Distribution skewness within sample',                    category: 'statistics', perLayer: false, perHead: false, expensive: false },
  { key: 'covariance_signals',  label: 'Cov Signals',   description: 'Number of top signals for covariance (default 50)',      category: 'statistics', perLayer: false, perHead: false, expensive: false },

  // --- Prompt-time (4 signals) ---
  { key: 'prompt_residual',   label: 'Prompt Residual',   description: 'Hidden state at prompt end (pre-generation)',           category: 'prompt', perLayer: true,  perHead: false, expensive: false },
  { key: 'prompt_attention',  label: 'Prompt Attention',   description: 'Attention patterns at prompt end',                      category: 'prompt', perLayer: true,  perHead: true,  expensive: false },
  { key: 'prompt_logit_lens', label: 'Prompt Logit Lens',  description: 'Per-layer predictions before generation starts',        category: 'prompt', perLayer: true,  perHead: false, expensive: false },
  { key: 'prompt_top_k',      label: 'Prompt Top-K',       description: 'Number of top predictions to store (1-10)',             category: 'prompt', perLayer: false, perHead: false, expensive: false },

  // --- Expensive (3 signals) ---
  { key: 'qkv_capture',          label: 'QKV Vectors',     description: 'NOT YET IMPLEMENTED — Full Q, K, V vectors',           category: 'expensive', perLayer: true,  perHead: true,  expensive: true },
  { key: 'gradient_capture',     label: 'Gradients',       description: 'NOT YET IMPLEMENTED — Saliency gradients',              category: 'expensive', perLayer: true,  perHead: false, expensive: true },
  { key: 'full_neuron_capture',  label: 'Full Neurons',    description: 'All 14336 neurons at all layers (via MLP hidden hooks)', category: 'expensive', perLayer: true,  perHead: false, expensive: true },
];

// ============================================================================
// Aggregation methods
// ============================================================================

export const AGGREGATION_METHODS: AggregationDef[] = [
  { id: 'first',     label: 'First token',    description: 'First generated token only (best for halluc detection)' },
  { id: 'last',      label: 'Last token',     description: 'Last generated token only (best for final-state analysis)' },
  { id: 'mean',      label: 'Mean',           description: 'Mean across all tokens (WARNING: destroys signal for some metrics)' },
  { id: 'std',       label: 'Std Dev',        description: 'Standard deviation across tokens' },
  { id: 'min',       label: 'Min',            description: 'Minimum value (best for collapse detection)' },
  { id: 'max',       label: 'Max',            description: 'Maximum value' },
  { id: 'median',    label: 'Median',         description: 'Median value (robust to outliers)' },
  { id: 'trend',     label: 'Trend',          description: 'Linear slope across token positions' },
  { id: 'autocorr',  label: 'Autocorr',       description: 'Temporal autocorrelation at lag-1 and lag-5' },
  { id: 'svd',       label: 'SVD (E2)',       description: 'SVD participation ratio on token trajectory matrix' },
  { id: 'per_token', label: 'Per-token',      description: 'Raw values for every token (for time-series analysis)' },
  { id: 'window',    label: 'Sliding window', description: 'Aggregated over sliding window (configurable)' },
];

// ============================================================================
// Preset definitions — maps preset ID to which signals are ON
// ============================================================================

/** Signals enabled for each preset, matching SignalSet.CORE/STANDARD/FULL */
export const PRESET_SIGNALS: Record<string, Set<string>> = {
  core: new Set([
    'prompt_residual', 'prompt_logit_lens',
    'residual_states',
    'attention_entropy', 'attention_bos', 'attention_local',
    'mlp_amplification', 'mlp_sparsity',
    'logit_entropy', 'logit_top1',
    'output_token_probs',
    'compute_velocity', 'compute_acceleration',
  ]),
  standard: new Set([
    'prompt_residual', 'prompt_attention', 'prompt_logit_lens', 'prompt_top_k',
    'residual_states', 'residual_decomposition',
    'attention_entropy', 'attention_bos', 'attention_local', 'attention_to_prompt', 'attention_skewness', 'attention_self',
    'mlp_amplification', 'mlp_sparsity', 'mlp_gate_sparsity', 'mlp_top_neurons',
    'logit_entropy', 'logit_top1', 'logit_top_k', 'logit_final_rank',
    'output_token_probs', 'output_token_entropy', 'output_token_rank',
    'compute_velocity', 'compute_acceleration', 'compute_jerk', 'compute_curvature', 'compute_trends', 'compute_autocorr',
    'compute_covariance', 'compute_skewness', 'covariance_signals',
  ]),
  full: new Set([
    'prompt_residual', 'prompt_attention', 'prompt_logit_lens', 'prompt_top_k',
    'residual_states', 'residual_decomposition',
    'attention_entropy', 'attention_bos', 'attention_local', 'attention_to_prompt', 'attention_skewness', 'attention_kurtosis', 'attention_self', 'attention_raw',
    'mlp_amplification', 'mlp_sparsity', 'mlp_gate_sparsity', 'mlp_hidden', 'mlp_top_neurons',
    'logit_entropy', 'logit_top1', 'logit_top_k', 'logit_final_rank',
    'output_token_probs', 'output_token_entropy', 'output_token_rank',
    'compute_velocity', 'compute_acceleration', 'compute_jerk', 'compute_curvature', 'compute_trends', 'compute_autocorr',
    'compute_covariance', 'compute_skewness', 'covariance_signals',
    'full_neuron_capture',
  ]),
};

/** Default aggregation methods per preset */
export const DEFAULT_AGGREGATIONS: AggregationMethod[] = ['first', 'last', 'mean', 'std'];

/** Default layer subset (8B capture layers) */
export const DEFAULT_CAPTURE_LAYERS = [0, 4, 8, 12, 16, 20, 24, 28, 31];

// ============================================================================
// Factory helpers
// ============================================================================

/** Build a SignalConfig from a preset name */
export function configFromPreset(presetId: string): SignalConfig {
  const enabledSet = PRESET_SIGNALS[presetId] ?? PRESET_SIGNALS.standard;
  const signals: Record<string, boolean> = {};
  for (const s of SIGNAL_CATALOG) {
    signals[s.key] = enabledSet.has(s.key);
  }
  return {
    signals,
    aggregations: [...DEFAULT_AGGREGATIONS],
    windowSize: 8,
    captureAllLayers: presetId !== 'core',
    captureLayers: [...DEFAULT_CAPTURE_LAYERS],
    preset: presetId,
  };
}

/** Detect which preset (if any) matches the current signal selection */
export function detectPreset(signals: Record<string, boolean>): string | null {
  const enabled = new Set(Object.keys(signals).filter(k => signals[k]));
  for (const [presetId, presetSet] of Object.entries(PRESET_SIGNALS)) {
    if (enabled.size === presetSet.size && [...enabled].every(k => presetSet.has(k))) {
      return presetId;
    }
  }
  return null;
}

/** Get signals grouped by category */
export function signalsByCategory(): Record<SignalCategory, SignalDef[]> {
  const grouped: Record<string, SignalDef[]> = {};
  for (const cat of CATEGORY_ORDER) {
    grouped[cat] = [];
  }
  for (const s of SIGNAL_CATALOG) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  }
  return grouped as Record<SignalCategory, SignalDef[]>;
}

/** Count enabled signals for a category */
export function countEnabled(signals: Record<string, boolean>, category: SignalCategory): { enabled: number; total: number } {
  const catSignals = SIGNAL_CATALOG.filter(s => s.category === category);
  return {
    enabled: catSignals.filter(s => signals[s.key]).length,
    total: catSignals.length,
  };
}

/** Rough memory estimate (MB per sample at 100 tokens) */
export function estimateMemoryMb(signals: Record<string, boolean>, nTokens = 100, nLayers = 36): number {
  const dModel = 4096; // 8B
  const nHeads = 32;
  const seqLen = 150;
  const dFF = 14336; // Qwen3-8B
  let bytes = 0;

  if (signals.residual_states)        bytes += nTokens * nLayers * dModel * 2;
  if (signals.residual_decomposition) bytes += nTokens * nLayers * dModel * 2 * 2;

  // Attention scalars
  const attnCount = ['attention_entropy', 'attention_bos', 'attention_local',
    'attention_to_prompt', 'attention_skewness', 'attention_kurtosis', 'attention_self']
    .filter(k => signals[k]).length;
  bytes += nTokens * nLayers * nHeads * 2 * attnCount;

  if (signals.attention_raw) bytes += nTokens * nLayers * nHeads * seqLen * 2;

  // MLP scalars
  const mlpScalars = ['mlp_amplification', 'mlp_sparsity', 'mlp_gate_sparsity']
    .filter(k => signals[k]).length;
  bytes += nTokens * nLayers * 2 * mlpScalars;
  if (signals.full_neuron_capture) bytes += nTokens * nLayers * dFF * 2;
  else if (signals.mlp_hidden)     bytes += nTokens * 8 * dFF * 2; // ~8 layers

  // Logit lens
  const logitScalars = ['logit_entropy', 'logit_top1'].filter(k => signals[k]).length;
  bytes += nTokens * nLayers * 2 * logitScalars;
  if (signals.logit_top_k) bytes += nTokens * nLayers * 5 * (2 + 4);
  if (signals.logit_final_rank) bytes += nTokens * nLayers * 4;

  // Prompt-time
  if (signals.prompt_residual)  bytes += nLayers * dModel * 2;
  if (signals.prompt_attention) bytes += nLayers * nHeads * seqLen * 2;

  return bytes / (1024 * 1024);
}

// ============================================================================
// Helpers for other tabs (signal dropdowns with categories)
// ============================================================================

/** Build optgroup-style signal list for hypothesis/compare/sweep dropdowns.
 *  Returns signals that make sense for per-generation analysis (not raw capture toggles). */
export function buildAnalysisSignalGroups(): Array<{ label: string; signals: Array<{ value: string; label: string }> }> {
  const CAPTURE_LAYERS = [0, 4, 8, 12, 16, 20, 24, 28, 31];

  return [
    {
      label: 'Core Signals',
      signals: [
        { value: 'activation_eff_dim', label: 'activation_eff_dim (E1)' },
        { value: 'projected_velocity', label: 'projected_velocity' },
        { value: 'halluc_risk',        label: 'halluc_risk' },
        { value: 'token_prob',         label: 'token_prob' },
        { value: 'residual_norm',      label: 'residual_norm' },
        { value: 'dt_confidence',      label: 'dt_confidence' },
      ],
    },
    {
      label: 'Per-Layer EffDim (E2)',
      signals: CAPTURE_LAYERS.map(l => ({ value: `L${l}_eff_dim`, label: `L${l}_eff_dim` })),
    },
    {
      label: 'Per-Layer Velocity (V2)',
      signals: CAPTURE_LAYERS.map(l => ({ value: `L${l}_velocity`, label: `L${l}_velocity` })),
    },
    {
      label: 'Per-Layer Norm',
      signals: CAPTURE_LAYERS.map(l => ({ value: `L${l}_norm`, label: `L${l}_norm` })),
    },
    {
      label: 'Per-Layer Attention Entropy',
      signals: CAPTURE_LAYERS.map(l => ({ value: `L${l}_entropy`, label: `L${l}_entropy` })),
    },
    {
      label: 'Per-Layer MLP Amplification',
      signals: CAPTURE_LAYERS.map(l => ({ value: `L${l}_mlp_amp`, label: `L${l}_mlp_amp` })),
    },
    {
      label: 'Per-Layer BOS Attention',
      signals: CAPTURE_LAYERS.map(l => ({ value: `L${l}_bos`, label: `L${l}_bos` })),
    },
    {
      label: 'Per-Layer Local Attention',
      signals: CAPTURE_LAYERS.map(l => ({ value: `L${l}_local`, label: `L${l}_local` })),
    },
    {
      label: 'Per-Layer Logit Entropy',
      signals: CAPTURE_LAYERS.map(l => ({ value: `L${l}_logit_entropy`, label: `L${l}_logit_entropy` })),
    },
  ];
}

/** Flat list of all analysis signal values (for ComparePanel/SweepPanel expansion) */
export function allAnalysisSignalKeys(): string[] {
  return buildAnalysisSignalGroups().flatMap(g => g.signals.map(s => s.value));
}
