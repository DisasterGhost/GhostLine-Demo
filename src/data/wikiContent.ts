// ============================================================================
// Wiki Content - Static entries for the GhostLine Wiki Panel
// ============================================================================
// Model-invariant conceptual definitions with optional model-specific data blocks.
// No React dependencies — pure data.
//
// Design principle: A newcomer should understand every entry without seeing
// any numbers. Researchers can toggle model data on for specifics.

export type WikiCategory =
  | 'basics'
  | 'states'
  | 'signals'
  | 'methods'
  | 'concepts'
  | 'science';

export interface ModelDataBlock {
  /** Which model/context this data is from */
  scope: string;  // e.g. 'Qwen3-8B', 'Llama 3.2 3B', 'Cross-architecture', 'General'
  /** What kind of data this is */
  label: string;  // e.g. 'Per-token ranges', 'Corpus means', 'Threshold'
  /** The actual numbers/values */
  content: string;
}

export interface WikiEntry {
  id: string;
  title: string;
  category: WikiCategory;
  /** Model-invariant one-liner shown in collapsed view */
  short: string;
  /** Model-invariant conceptual explanation — no numbers here */
  body: string;
  /** Optional model-specific data blocks (hidden by default) */
  modelData?: ModelDataBlock[];
  related?: string[];
}

export const CATEGORY_LABELS: Record<WikiCategory, string> = {
  basics: 'Basics',
  states: 'States',
  signals: 'Signals',
  methods: 'Methods',
  concepts: 'Concepts',
  science: 'Science',
};

export const wikiEntries: WikiEntry[] = [
  // ==================== BASICS ====================
  {
    id: 'what-you-see',
    title: 'What You\'re Seeing',
    category: 'basics',
    short: 'Each glowing point is a token the model processed.',
    body: `Each glowing point is a token — a word or word-piece the model processed. Their positions come from the model's internal activations, projected into 3D space.

Tokens that the model processes similarly appear near each other. Clusters form where the model treats tokens in related ways.

This is semantic to the model, not necessarily to humans — two words a human considers similar may be far apart if the model represents them differently.`,
    related: ['3d-space', 'trajectory', 'umap-projection'],
  },
  {
    id: '3d-space',
    title: 'The 3D Space',
    category: 'basics',
    short: 'Positions come from high-dimensional activations projected to 3D.',
    body: `Positions are projected via supervised dimensionality reduction with LDA preprocessing.

Near = similar activation patterns
Far = different activation patterns
Clusters = tokens the model processes similarly

Distances are rank-order preserved, not exact. Relative positions matter more than absolute distances.`,
    related: ['what-you-see', 'umap-projection', 'activation-manifold'],
  },
  {
    id: 'trajectory',
    title: 'Trajectory',
    category: 'basics',
    short: 'The connecting line shows the order of token generation.',
    body: `The connecting line or cable shows the order of generation:

Muted colors: Prompt tokens (your input)
Bright colors: Generated tokens (model output)

Lines mode: Fast, minimal rendering
Cables mode: 3D tubes with richer aesthetic

The path the trajectory takes through 3D space reveals how the model's internal state evolves during generation.`,
    related: ['what-you-see', 'token-trajectory', 'velocity'],
  },
  {
    id: 'controls',
    title: 'Controls',
    category: 'basics',
    short: 'Orbit, zoom, pan, and click tokens to inspect them.',
    body: `Orbit: Left-drag to rotate view
Zoom: Scroll wheel
Pan: Right-drag to move
Select: Click any token for details

When you click a token, the Signals Panel and Token Inspector update to show that token's data. Click empty space to deselect.`,
    related: ['what-you-see'],
  },
  {
    id: 'recording',
    title: 'Recording & Replay',
    category: 'basics',
    short: 'Every generation is automatically recorded for replay.',
    body: `Every generation is automatically recorded:

Save: Download as .ghostline file
Load: Replay any saved session
Timeline: Step through token-by-token

Replay mode lets you scrub through the generation timeline, zoom into context windows, and study individual tokens at your own pace.`,
  },

  // ==================== STATES ====================
  {
    id: 'state-creativity',
    title: 'Creativity',
    category: 'states',
    short: 'Open-ended generation with high manifold dimensionality.',
    body: `The creativity state appears when the model generates open-ended, imaginative content without strong structural constraints.

Geometrically, creativity is characterized by broad exploration — the activation manifold occupies a wide range of dimensionalities, reflecting the model's freedom to explore many possible continuations. Velocity is moderate as the model flows between ideas.

Color: Purple (#9933CC)

Typical triggers: Creative writing prompts, storytelling, brainstorming, open-ended questions.`,
    modelData: [
      { scope: 'Qwen3-8B', label: 'Per-token eff_dim', content: 'median ~94, IQR 59-131 (widest range)' },
      { scope: 'Qwen3-8B', label: 'Full-gen corpus mean', content: '~94' },
      { scope: 'Llama 3.2 3B', label: 'Full-gen corpus mean', content: '~39' },
    ],
    related: ['eff-dim', 'geometric-state', 'velocity'],
  },
  {
    id: 'state-reasoning',
    title: 'Reasoning',
    category: 'states',
    short: 'Step-by-step logical processing with moderate dimensionality.',
    body: `The reasoning state appears when the model performs step-by-step logical thinking, mathematical derivation, or structured analysis.

Geometrically, reasoning shows moderately high dimensionality with high velocity — the model traverses different reasoning steps, creating dynamic movement through activation space. Distinguished from uncertainty by its return rate pattern (the model revisits previous geometric regions during multi-step reasoning).

Color: Robin's Egg Blue (#00CCCC)

Typical triggers: "Think step by step", math problems, logical analysis. Must force extended step-by-step output to reliably produce reasoning geometry.`,
    modelData: [
      { scope: 'Qwen3-8B', label: 'Per-token eff_dim', content: 'median ~89, IQR 63-121' },
      { scope: 'Qwen3-8B', label: 'Full-gen corpus mean', content: '~65' },
      { scope: 'Llama 3.2 3B', label: 'Full-gen corpus mean', content: '~30' },
    ],
    related: ['eff-dim', 'velocity', 'geometric-state'],
  },
  {
    id: 'state-retrieval',
    title: 'Retrieval',
    category: 'states',
    short: 'Factual recall — the model\'s geometric basin.',
    body: `The retrieval state appears when the model recalls learned facts with high confidence.

Geometrically, retrieval is the model's "basin" — a low-dimensionality attractor region with the tightest spread of any state. Every other state leaks toward retrieval, making it a geometric attractor. At larger model scales, retrieval splits into "easy" and "obscure" sub-states, where hard retrieval becomes geometrically indistinguishable from reasoning.

Color: Green (#33ff88)

Typical triggers: Factual questions about well-known topics, definitions, encyclopedic recall.`,
    modelData: [
      { scope: 'Qwen3-8B', label: 'Per-token eff_dim', content: 'median ~68, IQR 63-84 (tightest range)' },
      { scope: 'Qwen3-8B', label: 'Full-gen corpus mean', content: '~35' },
      { scope: 'Llama 3.2 3B', label: 'Full-gen corpus mean', content: '~21' },
      { scope: 'Qwen3-8B', label: 'Sub-states', content: 'Easy eff_dim ~35, Obscure ~63 (d=4.5 — splits cleanly)' },
      { scope: 'General', label: 'Attractor flow', content: 'Net +23 — every other state leaks into retrieval' },
    ],
    related: ['eff-dim', 'geometric-state', 'token-prob'],
  },
  {
    id: 'state-precision',
    title: 'Precision',
    category: 'states',
    short: 'Short, structured, definitive outputs.',
    body: `The precision state appears when the model produces short, structured, highly confident outputs.

Geometrically, precision is paradoxical: per-token dimensionality is surprisingly high (the model uses many dimensions for each token), but full-generation dimensionality is low (the overall trajectory is simple). This "Surgeon" personality reflects focused, deliberate token selection. Precision shares some geometric overlap with retrieval.

Color: Gold (#ffcc33)

Typical triggers: Short factual answers, structured data, definitive statements, formatted output.`,
    modelData: [
      { scope: 'Qwen3-8B', label: 'Per-token eff_dim', content: 'median ~132, IQR 75-153 (highest per-token!)' },
      { scope: 'Qwen3-8B', label: 'Full-gen corpus mean', content: '~50 (4th highest — inverted from per-token)' },
      { scope: 'Llama 3.2 3B', label: 'Full-gen corpus mean', content: '~24' },
      { scope: 'General', label: 'Leakage', content: '12.8% geometric overlap with retrieval' },
    ],
    related: ['eff-dim', 'token-prob', 'entropy'],
  },
  {
    id: 'state-uncertainty',
    title: 'Uncertainty',
    category: 'states',
    short: 'The model is hedging or speculating — cleanest geometric state.',
    body: `The uncertainty state appears when the model hedges, speculates, or expresses genuine uncertainty about its answer.

Geometrically, uncertainty is the cleanest state — when the classifier predicts uncertainty, it is almost always correct. The model's geometry is distinct and well-separated from other states, suggesting uncertainty is a genuine computational mode, not just "weak reasoning."

Color: Silver (#ccccdd) — achromatic, always visually distinct from chromatic states at any depth

Typical triggers: Speculation about unknowable topics, contested facts, hedging language.`,
    modelData: [
      { scope: 'Qwen3-8B', label: 'Per-token eff_dim', content: 'median ~79, IQR 54-106' },
      { scope: 'Qwen3-8B', label: 'Full-gen corpus mean', content: '~53' },
      { scope: 'Llama 3.2 3B', label: 'Full-gen corpus mean', content: '~29' },
      { scope: 'General', label: 'Self-probability', content: '99.0% — cleanest of all geometric states' },
    ],
    related: ['geometric-state', 'token-prob', 'entropy'],
  },
  {
    id: 'state-stressed',
    title: 'Stressed',
    category: 'states',
    short: 'Geometric stress — the model\'s residual stream shows abnormal geometry.',
    body: `Stressed is a classifier-detected state indicating residual-stream geometric anomaly. The model's activation geometry deviates from all healthy state signatures, suggesting internal conflict or confusion.

This is distinct from two other pathologies:
- Collapse: A more severe condition where the model enters deterministic repetition loops with extremely low dimensionality.
- Hallucination: Detected by a separate attention-based ensemble that uses different signals entirely.

Stressed tokens show distressed geometry but haven't collapsed — the model is struggling but still producing varied output.

Color: Red (#ff3333)`,
    related: ['halluc-ensemble', 'type-separation', 'eff-dim', 'entropy'],
  },
  {
    id: 'state-collapse',
    title: 'Collapse',
    category: 'states',
    short: 'Degenerate repetition loop — effective dimensionality crashes.',
    body: `Collapse occurs when the model enters a degenerate repetition loop (e.g., "the the the..." or "123 123 123..."). The activation manifold collapses to near-zero dimensionality — the model is stuck in a fixed geometric point.

Detection uses early-layer effective dimensionality, which drops dramatically during collapse. This is the most reliably detected pathology — it achieves perfect detection rates with a single threshold.

Intervention using anti-momentum perturbation at early layers can break collapse loops. The model spontaneously diversifies output and recovers natural language. This proves geometry is causal, not just correlational.

Color: Red (#ff0000)`,
    modelData: [
      { scope: 'General', label: 'Detection', content: 'L4 activation_eff_dim < 5.0 — 100% TP, 0% FP' },
      { scope: 'General', label: 'Values', content: 'True collapse ~1.4, healthy minimum 5.5+' },
      { scope: 'General', label: 'Intervention', content: 'L0 anti-momentum, strength 7.5, 4-token trend gating' },
    ],
    related: ['eff-dim', 'geometric-intervention', 'crystallization'],
  },

  // ==================== SIGNALS ====================
  {
    id: 'eff-dim',
    title: 'Activation Spread (eff_dim)',
    category: 'signals',
    short: 'How uniformly activation energy spreads across the model\'s dimensions.',
    body: `Activation Spread (activation_eff_dim, E1) measures how uniformly activation energy is spread across the model's dimensions for each token. Higher values mean the model is using more of its representational capacity; lower values mean energy is concentrated in fewer dimensions.

This is NOT the same as trajectory_eff_dim (E2) used in classifiers, which measures how many independent directions a sequence of tokens explores using SVD.

Key properties:
- The single most important collapse detection signal — drops to very low values during repetition loops
- Per-token values overlap between states (noisy individually, discriminative in aggregate)
- The ordering of states differs between per-token and full-generation measurements
- Precision tokens are paradoxically high-dimensional per-token despite low full-generation means (the "Surgeon" effect)`,
    modelData: [
      { scope: 'Qwen3-8B', label: 'Per-token medians', content: 'Precision ~132, Creativity ~94, Reasoning ~89, Uncertainty ~79, Retrieval ~68' },
      { scope: 'Qwen3-8B', label: 'Full-gen corpus means', content: 'Creativity ~94, Reasoning ~65, Uncertainty ~53, Precision ~50, Retrieval ~35' },
      { scope: 'Llama 3.2 3B', label: 'Full-gen corpus means', content: 'Creativity ~39, Reasoning ~30, Uncertainty ~29, Precision ~24, Retrieval ~21' },
      { scope: 'General', label: 'Collapse threshold', content: 'L4 < 5.0 (100% accuracy)' },
      { scope: 'General', label: 'Range', content: '1 to model width (3072 at 3B, 4096 at 8B)' },
    ],
    related: ['state-collapse', 'state-creativity', 'activation-manifold'],
  },
  {
    id: 'velocity',
    title: 'Activation Velocity',
    category: 'signals',
    short: 'How fast the model\'s internal state is changing between tokens.',
    body: `Velocity measures how fast the model's internal state changes between consecutive tokens.

The bar in the live view shows projected velocity (V1): movement in 3D visualization space. Classifier features use layer velocity (V2): movement in the model's full high-dimensional activation space, which is a much richer signal.

High velocity: Large state changes — new topics, reasoning steps, topic shifts
Low velocity: Smooth continuation — consistent, predictable generation

Velocity's relative importance shifts with model scale: it dominates smaller models but is superseded by attention patterns at larger scales.`,
    modelData: [
      { scope: 'Llama 3.2 3B', label: 'Classifier importance', content: 'Layer velocity (V2) dominates at 55%. L20 (15.6%), L8 (13.1%), L27 (13.0%)' },
      { scope: 'Qwen3-8B', label: 'Classifier importance', content: 'Attention entropy dominates; velocity drops in ranking' },
    ],
    related: ['trajectory', 'eff-dim', 'lda-classifier'],
  },
  {
    id: 'entropy',
    title: 'Entropy',
    category: 'signals',
    short: 'How spread out the model\'s attention pattern is.',
    body: `The entropy display shows attention entropy: how spread out a layer's attention pattern is across the sequence.

Low entropy: Attention is focused — the model knows where to look
High entropy: Attention is diffuse — the model is distributing attention broadly

Visualized as color temperature (cool=uncertain, warm=confident) and optional shape distortion (spiky=uncertain).

Important: Single-threshold entropy rules can appear to work very well on one dataset but fail completely on another. Production hallucination detection requires ensembles, not single thresholds.`,
    modelData: [
      { scope: 'General', label: 'Cautionary example', content: 'L0 entropy > 1.95: F1=98.7% on original corpus, F1=40.9% on expanded corpus' },
    ],
    related: ['token-prob', 'state-uncertainty', 'state-stressed'],
  },
  {
    id: 'residual-norm',
    title: 'Residual Norm',
    category: 'signals',
    short: 'Magnitude of the model\'s internal representation vector.',
    body: `The residual norm is the L2 norm (magnitude) of the residual stream activation vector at each token position.

Larger norms can indicate stronger, more confident internal representations. Extremely large or small norms relative to the distribution may signal unusual model behavior.

When "Signal Amplitude" is enabled in settings, token size in the 3D view scales with residual norm.`,
    related: ['residual-stream', 'token-prob'],
  },
  {
    id: 'lid',
    title: 'Local Intrinsic Dimensionality',
    category: 'signals',
    short: 'How complex the local geometry is around a token.',
    body: `LID (Local Intrinsic Dimensionality) measures the complexity of the local activation manifold around a specific token, using the MLE estimator (Levina & Bickel 2004) with k=10 neighbors.

Unlike effective dimensionality (which measures the whole activation vector), LID measures how many independent directions exist in the local neighborhood. It captures fundamentally different information:

- Hallucinations show LOWER LID — the manifold simplifies when the model confabulates
- Pattern completion shows HIGH LID — rich local structure
- Different model architectures have characteristic LID values, making it an architectural fingerprint`,
    modelData: [
      { scope: 'Cross-architecture', label: 'Fingerprints', content: 'Pythia LID=17.6, Llama LID=11.8' },
      { scope: 'General', label: 'Content patterns', content: 'Pattern completion: 44-45, Named entities: 6-28' },
    ],
    related: ['eff-dim', 'activation-manifold', 'state-stressed'],
  },
  {
    id: 'attention-patterns',
    title: 'Attention Patterns',
    category: 'signals',
    short: 'How each token attends to other tokens in the sequence.',
    body: `Attention arcs show where a selected token "looks" when processing information. Colors classify the pattern:

Gold (Local): Attending to nearby tokens (within 3 positions)
Cyan (Long-Range): Reaching back to distant tokens (>10 positions)
Magenta (Diffuse): Spread across many tokens (high entropy attention)
White (Self): Token attending primarily to itself

Thickness indicates attention weight strength. Only weights >5% are shown. This is from a single mid-layer — other layers may behave differently.

Critical caveat: Attention does NOT equal explanation. High attention weight does not mean a token "caused" the output.`,
    related: ['attention-heads', 'entropy'],
  },
  {
    id: 'token-prob',
    title: 'Token Probability',
    category: 'signals',
    short: 'Probability assigned to the chosen next token.',
    body: `Token probability is the probability the model assigned to the token it actually generated — the top-1 softmax value over the entire vocabulary.

High probability (>80%): Model was very sure of this token
Medium probability (50-80%): Reasonable certainty
Low probability (<50%): Many alternatives were plausible

Visualized as token color (red=uncertain, green=confident) in the default color mode.

This is distinct from classifier confidence scores, which measure how sure a state classifier is about its geometric prediction.`,
    modelData: [
      { scope: 'General', label: 'Confidence calibration', content: 'Classifier >90% confidence = 97.3% correct predictions' },
    ],
    related: ['entropy', 'crystallization'],
  },

  // ==================== METHODS ====================
  {
    id: 'lda-classifier',
    title: 'LDA Classifier',
    category: 'methods',
    short: 'Linear Discriminant Analysis classifies geometric states in real-time.',
    body: `The LDA (Linear Discriminant Analysis) classifier projects high-dimensional activations to a low-dimensional discriminant space where geometric states become separable.

The pipeline compresses the model's full activation space through dimensionality reduction stages, finding the directions that best separate states. State probabilities are computed for every token during generation and sent to the frontend in real-time.

Confidence is well-calibrated: when the classifier is highly confident, it is almost always correct. Many apparent "misclassifications" are actually geometrically justified — the model's output geometry doesn't always match the prompt's intended state.`,
    modelData: [
      { scope: 'General', label: 'Pipeline', content: 'PCA → LDA → state prediction' },
      { scope: 'General', label: 'Raw accuracy', content: '69.3% (5-fold CV, 5 states)' },
      { scope: 'General', label: 'Adjusted accuracy', content: '95.4% (counting geometrically-justified predictions)' },
      { scope: 'General', label: 'Calibration', content: '>90% confidence = 97.3% correct' },
    ],
    related: ['geometric-state', 'umap-projection'],
  },
  {
    id: 'halluc-ensemble',
    title: 'Hallucination Ensemble',
    category: 'methods',
    short: 'Gradient Boosting on many features detects geometric hallucination.',
    body: `The hallucination ensemble uses Gradient Boosting on hundreds of features across multiple layers to detect geometric hallucination — cases where the model's internal geometry signals distress.

Key insight: The most important features are all first-token measurements. The model's first generated token already carries the geometric signature of whether it will hallucinate. Many individually weak signals combine to near-perfect classification.

This detects "geometric hallucination" (distressed geometry, model knows it doesn't know). It does NOT catch "confident confabulation" (model believes wrong answer, geometry looks healthy).`,
    modelData: [
      { scope: 'Llama 3.2 3B', label: 'Performance', content: 'GB on 828 features: F1=0.988, AUC=0.999 (300 halluc vs 780 healthy)' },
      { scope: 'Llama 3.2 3B', label: 'Top features', content: 'L20 local attn (33.4%), L13 local (12.1%), L13 BOS (11.3%) — all first-token' },
      { scope: 'Qwen3-8B', label: 'Performance', content: 'GB on 9083 features: F1=0.955, AUC=0.998 (300 halluc vs 1134 healthy)' },
      { scope: 'Qwen3-8B', label: 'Key finding', content: 'L28_H17 sentinel head (entropy d=1.89). Halluc is geometrically DIFFUSE, not collapsed.' },
    ],
    related: ['state-stressed', 'type-separation', 'first-token-signal', 'sentinel-head'],
  },
  {
    id: 'umap-projection',
    title: 'Projection Pipeline',
    category: 'methods',
    short: 'How high-dimensional activations become 3D coordinates.',
    body: `The projection pipeline reduces the model's high-dimensional activations to 3D coordinates for the visualization. It uses a series of linear and nonlinear transformations, each trained to preserve the geometric structure that matters.

The key innovation is the LDA intermediate step — without it, the projection suffers from "continuity collapse" where all tokens merge together. By first finding directions that separate states, then applying nonlinear projection, the pipeline preserves both state separation and trajectory smoothness.

Separate projectors are trained for different extraction layers. Projection quality is measured by trajectory correlation r(T,C) — how well the 3D path preserves the high-dimensional trajectory structure.`,
    modelData: [
      { scope: 'General', label: 'Pipeline', content: 'PCA → LDA → supervised UMAP/SCL (nn=15, md=0.5)' },
      { scope: 'General', label: 'Quality metric', content: 'r(T,C) up to 0.99 on held-out data' },
      { scope: 'General', label: 'Key insight', content: 'High min_dist + low n_neighbors is optimal — opposite of typical advice' },
    ],
    related: ['3d-space', 'lda-classifier', 'activation-manifold', 'scl-projection'],
  },
  {
    id: 'geometric-intervention',
    title: 'Geometric Intervention',
    category: 'methods',
    short: 'Modifying activations during generation to steer model behavior.',
    body: `Geometric intervention modifies the model's activation vectors during generation based on detected geometric states. This proves geometry is CAUSAL, not just correlational — changing the geometry changes the output.

For collapse: Early-layer anti-momentum perturbation breaks repetition loops. The model spontaneously diversifies output and recovers natural language.

Trend gating prevents unnecessary intervention when the model is self-recovering (dimensionality trending upward on its own). This avoids interfering with the model's natural recovery process.`,
    modelData: [
      { scope: 'General', label: 'Collapse intervention', content: 'L0 anti-momentum, strength 7.5, 4-token trend gating' },
      { scope: 'General', label: 'Results', content: '68.8% of stressed → uncertainty, 0% false positives' },
    ],
    related: ['state-collapse', 'state-stressed', 'eff-dim'],
  },

  // ==================== CONCEPTS ====================
  {
    id: 'crystallization',
    title: 'Crystallization',
    category: 'concepts',
    short: 'When the model commits to a prediction with high confidence.',
    body: `Crystallization occurs when the model's top-1 probability reaches >= 0.5, meaning it has "committed" to a specific next token.

The crystallization curve across layers reveals how the model builds toward a prediction: early layers carry no state information, mid layers show rapid state separation (the model "decides" what kind of thing it's computing), and late layers merge states back together for final token selection.

Tokens that crystallize early tend to be more predictable (function words, common phrases). Late crystallization suggests the model is weighing alternatives.`,
    modelData: [
      { scope: 'Llama 3.2 3B', label: 'Layer progression (silhouette)', content: 'L0=0.048 (chaos), L8=0.855 (rapid), L20=0.935 (peak), L27=0.781 (merge)' },
    ],
    related: ['token-prob', 'geometric-state'],
  },
  {
    id: 'token-trajectory',
    title: 'Token Trajectory',
    category: 'concepts',
    short: 'The path through activation space during generation.',
    body: `The token trajectory is the sequence of 3D positions traced out as the model generates tokens one by one. It reveals the model's computational journey.

Smooth trajectories: Consistent, predictable generation
Sharp turns: Topic shifts, surprising predictions
Loops: Repetitive patterns (potential collapse)
Expansion: Model exploring new territory

The trajectory encodes temporal structure — it's not just a point cloud but an ordered path with direction and dynamics.`,
    related: ['trajectory', 'velocity', 'activation-manifold'],
  },
  {
    id: 'activation-manifold',
    title: 'Activation Manifold',
    category: 'concepts',
    short: 'The geometric surface in high-D space where activations live.',
    body: `The activation manifold is the geometric surface in high-dimensional space where the model's internal representations naturally reside.

Key properties:
- Dimensionality varies by state — some states use more of the space than others
- Local structure (LID) varies by content type
- Different geometric states occupy different regions
- The geometry of thought is universal across architectures, but the coordinates are model-specific

The manifold is not static — it deforms and shifts during generation as the model's state evolves.`,
    modelData: [
      { scope: 'Llama 3.2 3B', label: 'Full-gen eff_dim range', content: 'Retrieval ~21 to Creativity ~39' },
      { scope: 'Qwen3-8B', label: 'Full-gen eff_dim range', content: 'Retrieval ~35 to Creativity ~94 (3.3x wider gaps)' },
    ],
    related: ['eff-dim', 'lid', 'geometric-state'],
  },
  {
    id: 'geometric-state',
    title: 'Geometric State',
    category: 'concepts',
    short: 'Classification of what the model is doing based on activation geometry.',
    body: `A geometric state is a classification of the model's current computational mode based on the geometry of its internal activations, not the content of its output.

7 states: creativity, reasoning, retrieval, precision, uncertainty, stressed, collapse

Key insight: The classifier detects OUTPUT geometry, not prompt semantics. The same prompt can produce different geometric signatures. A prompt asking for "creativity" might produce a reasoning geometry if the model reasons about creativity.

Retrieval is a geometric basin (attractor). Uncertainty is the cleanest state. The reasoning/retrieval boundary is where most classification ambiguity lives.`,
    related: ['lda-classifier', 'crystallization', 'eff-dim', 'dual-label'],
  },
  {
    id: 'type-separation',
    title: 'Hallucination Type Separation',
    category: 'concepts',
    short: 'Two distinct failure modes: geometric distress vs confident confabulation.',
    body: `GhostLine empirically identified two distinct types of hallucination failure:

Geometric hallucination ("can't commit"): The model never crystallizes, geometry is distressed, highly detectable. The model effectively knows it doesn't know.

Confident confabulation ("believes wrong answer"): The model crystallizes cleanly on wrong information, geometry looks healthy, very difficult to detect. The model doesn't know it's wrong.

This is a fundamental detection gap — internal geometry can only catch distress, not confident mistakes.`,
    modelData: [
      { scope: 'General', label: 'Geometric hallucination', content: 'Ensemble F1=0.988 (3B), F1=0.955 (8B)' },
      { scope: 'General', label: 'Confident confabulation', content: '~12% recall only (geometry looks healthy)' },
      { scope: 'General', label: 'TruthfulQA validation', content: '88.6% precision but only 12.4% recall' },
    ],
    related: ['state-stressed', 'halluc-ensemble', 'crystallization'],
  },

  // ---- NEW CONCEPT ENTRIES ----
  {
    id: 'prompt-encoding',
    title: 'Prompt-Time Encoding',
    category: 'concepts',
    short: 'The model\'s geometric state is determined before generation begins.',
    body: `The model's geometric state is largely determined during prompt processing, before any tokens are generated. The last prompt token's geometry strongly correlates with the first generated token's geometry — they are effectively the same measurement at the same point in the residual stream.

This means the model "decides" what kind of computation to perform (reasoning, retrieval, creativity, etc.) while reading your prompt. The state doesn't emerge during generation — it's already set.

GhostLine uses this for "prophecy" predictions: a pre-generation forward pass through the prompt predicts the geometric state before the first token is even generated. Prompt tokens are visualized as wireframe tetrahedrons in the same 3D space as generated tokens.`,
    modelData: [
      { scope: 'General', label: 'Prompt-gen correlation', content: 'r=1.000 between prompt-time and first-token signals' },
      { scope: 'Qwen3-8B', label: 'Prompt classifier', content: 'RF 91.3% (3791 features), 86.5% (attn-only, 20 features)' },
      { scope: 'Llama 3.2 3B', label: 'Prompt classifier', content: '85.0% (grouped CV)' },
    ],
    related: ['geometric-state', 'first-token-signal', 'lda-classifier'],
  },
  {
    id: 'first-token-signal',
    title: 'First-Token Signal',
    category: 'concepts',
    short: 'The first generated token carries disproportionate geometric information.',
    body: `The first generated token carries disproportionate geometric information. In hallucination detection, the most important features are overwhelmingly first-token measurements.

This connects to prompt-time encoding: the model's internal state is already determined before generation, so the first token simply reveals a state that was set during prompt processing.

First-token aggregation consistently outperforms mean, last, or sliding-window aggregation for classification tasks. You can potentially detect hallucination risk from a single token, before the user even sees the output.`,
    modelData: [
      { scope: 'Llama 3.2 3B', label: 'Halluc ensemble', content: 'ALL top 15 features are first-token. L20 local attention = 33.4% importance' },
      { scope: 'General', label: 'vs Mean aggregation', content: 'Mean destroys signal: 20% CV → 0.3% for eff_dim' },
    ],
    related: ['prompt-encoding', 'halluc-ensemble', 'aggregation-methods'],
  },
  {
    id: 'aggregation-methods',
    title: 'Aggregation Methods',
    category: 'concepts',
    short: 'How you combine per-token signals dramatically affects their power.',
    body: `How you aggregate per-token signals across a generation dramatically affects their discriminative power. This is one of GhostLine's key methodological findings.

Common methods:
- First token: Best for hallucination detection (state is already determined)
- Last token: Best for final-state analysis
- Mean: Destroys signal for many metrics (averaging washes out the discriminative variance)
- Std: Captures variability across the generation
- Trend: Linear slope reveals whether signals change during generation
- SVD: Captures the overall trajectory complexity (E2)

The aggregation method is itself a research variable — choosing the wrong one can make a valid signal appear useless. The Research Lab's signal selector lets you experiment with all methods.`,
    modelData: [
      { scope: 'General', label: 'Mean destroys signal', content: 'eff_dim CV drops from 20% to 0.3% when using mean' },
      { scope: 'General', label: 'First-token dominance', content: 'ALL top 15 halluc features are first-token aggregated' },
    ],
    related: ['first-token-signal', 'eff-dim', 'halluc-ensemble'],
  },
  {
    id: 'scl-projection',
    title: 'SCL Projection',
    category: 'methods',
    short: 'GhostLine\'s native projector — the projector IS the classifier.',
    body: `SCL (Supervised Contrastive Linear) projection is GhostLine's native innovation for dimensionality reduction. It uses extremely few parameters yet outperforms neural network projectors.

The key insight: The projector IS the classifier. By training a linear mapping that simultaneously separates states AND preserves trajectory structure, SCL achieves both goals with minimal complexity. The pipeline is PCA → LDA → SCL, where each stage is a simple linear transformation.

SCL has a unique property: cluster separation (silhouette score) is inversely correlated with trajectory fidelity. Tight clusters come at the cost of temporal smoothness. GhostLine uses partial stretch (sqrt) as a compromise.`,
    modelData: [
      { scope: 'General', label: 'Benchmark (r(T,C))', content: 'SCL 0.977 > MLP 0.974 > k-NN 0.967 > ivis 0.964 > supUMAP 0.961' },
      { scope: 'Qwen3-8B', label: 'Parameters per layer', content: '75 linear params (5 states × (100D→3D + bias))' },
      { scope: 'General', label: 'Peak quality', content: 'r(T,C) = 0.9902 at L20 (8B, per-token training)' },
    ],
    related: ['umap-projection', 'lda-classifier', 'activation-manifold'],
  },
  {
    id: 'dual-label',
    title: 'Dual-Label System',
    category: 'concepts',
    short: 'Every sample gets both a prompt intent label and a geometric state label.',
    body: `Every corpus sample receives two independent labels:

1. Prompt intent: What the prompt was designed to elicit (e.g., reasoning)
2. Geometric state: What geometry the model actually produced

These often agree but sometimes diverge — a prompt designed for creativity might produce reasoning geometry if the model reasons about creativity. The dual-label system treats this divergence as signal, not noise.

Retrieval acts as a geometric "basin" (attractor) — every state leaks toward it. Uncertainty is the cleanest state. The reasoning/retrieval boundary is where most classification ambiguity lives.`,
    modelData: [
      { scope: 'General', label: 'Retrieval attractor', content: 'Net +23 flow — every state leaks toward retrieval' },
      { scope: 'General', label: 'Cleanest state', content: 'Uncertainty: 99.0% self-probability' },
      { scope: 'General', label: 'Dominant boundary', content: 'Reasoning/retrieval: 75% of ambiguous samples' },
    ],
    related: ['geometric-state', 'lda-classifier', 'state-retrieval'],
  },
  {
    id: 'sentinel-head',
    title: 'Sentinel Head',
    category: 'concepts',
    short: 'A single attention head carrying disproportionate detection signal.',
    body: `A sentinel head is a single attention head that carries disproportionate discriminative signal for a specific detection task. These heads appear to specialize in "quality control" of the model's own output.

Sentinel heads tend to appear at approximately 78% of the model's total depth across architectures. This may reflect a universal organizational principle: the model reserves late-layer attention capacity for monitoring its own generation quality.

Despite their discriminative power, no single head is sufficient for production detection — the ensemble approach combining many weak signals consistently outperforms any individual head.`,
    modelData: [
      { scope: 'Qwen3-8B', label: 'L28_H17', content: 'Entropy d=1.89 for halluc discrimination (78% depth = layer 28/36)' },
    ],
    related: ['halluc-ensemble', 'attention-heads', 'attention-patterns'],
  },

  // ==================== SCIENCE ====================
  {
    id: 'mech-interp',
    title: 'Mechanistic Interpretability',
    category: 'science',
    short: 'The field of reverse-engineering how neural networks compute.',
    body: `GhostLine is inspired by mechanistic interpretability (mech interp) — the field of understanding neural networks by reverse-engineering their internal computations.

However, GhostLine is an exploratory visualization tool, not a validated interpretability instrument. We show data; we don't claim to explain cognition.

What's validated: Attention weights are real data. Entropy from actual distributions. Projection preserves neighborhoods. Collapse detection works.

What this does NOT show: "Thoughts" or reasoning processes. Causally validated circuits (except collapse intervention). All layers or attention heads. MLP computations.`,
    related: ['residual-stream', 'attention-heads', 'dark-matter'],
  },
  {
    id: 'residual-stream',
    title: 'Residual Stream',
    category: 'science',
    short: 'The running representation that flows through all transformer layers.',
    body: `Transformers have a "residual stream" — a running representation that flows through all layers. Each layer reads from and writes to this stream via attention and MLP sublayers.

GhostLine extracts the residual stream at configurable layers and projects it to 3D. The final layer captures how the model represents each token just before the output head.

The residual stream is the central communication channel of the transformer. All information that affects the next-token prediction must pass through it.`,
    related: ['mech-interp', 'activation-manifold', 'residual-norm'],
  },
  {
    id: 'attention-heads',
    title: 'Attention Heads',
    category: 'science',
    short: 'Specialized sub-computations within each transformer layer.',
    body: `Each transformer layer has multiple "attention heads" that specialize in different patterns:

Induction heads: Copy patterns from earlier in context
Previous-token heads: Attend to the immediately prior token
Positional heads: Attend based on relative position

Heads are "polysemantic" — they respond to multiple unrelated patterns, making simple labels misleading. GhostLine shows attention from a single mid-layer only. Modern LLMs have many layers with many heads each.

High discrimination power for a single head doesn't necessarily mean high intervention power.`,
    related: ['attention-patterns', 'mech-interp', 'sentinel-head'],
  },
  {
    id: 'entropy-as-uncertainty',
    title: 'Entropy as Uncertainty',
    category: 'science',
    short: 'Using information theory to quantify prediction confidence.',
    body: `When the model predicts the next token, it outputs a probability distribution over the entire vocabulary. Entropy quantifies the "flatness" of this distribution.

Low entropy: One token dominates (confident prediction)
High entropy: Many tokens plausible (uncertain)

We visualize this as color temperature (cool=uncertain, warm=confident) and optional shape distortion (spiky=uncertain).

Entropy is one component of the broader geometric picture — a token can have low entropy (confident) while the overall geometric state indicates stress at a deeper level.`,
    related: ['entropy', 'token-prob', 'state-uncertainty'],
  },
  {
    id: 'dark-matter',
    title: 'The Dark Matter Problem',
    category: 'science',
    short: 'Most of the model\'s computation is invisible in any single view.',
    body: `GhostLine shows residual stream activations and selected attention patterns. The model's actual computation is distributed across all layers, MLPs, and attention heads.

What you see is a slice of the model's total computation. The rest is "dark matter" — present but invisible in this view.

MLP layers (roughly half the model's parameters) are not visualized. Only a subset of attention heads are shown. Cross-layer interactions are only indirectly visible through their effects on the residual stream.

This is a fundamental limitation of any visualization approach, not a bug.`,
    related: ['mech-interp', 'residual-stream', 'attention-heads'],
  },
];

// Index for fast lookup by ID
export const wikiById: Record<string, WikiEntry> = {};
for (const entry of wikiEntries) {
  wikiById[entry.id] = entry;
}

// Group by category
export function getEntriesByCategory(category: WikiCategory): WikiEntry[] {
  return wikiEntries.filter(e => e.category === category);
}

// Search entries by query (title + short + body)
export function searchEntries(query: string): WikiEntry[] {
  const q = query.toLowerCase();
  return wikiEntries.filter(
    e =>
      e.title.toLowerCase().includes(q) ||
      e.short.toLowerCase().includes(q) ||
      e.body.toLowerCase().includes(q)
  );
}
