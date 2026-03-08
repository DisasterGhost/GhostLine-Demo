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
    related: ['geometric-state', 'token-prob', 'entropy'],
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
    related: ['token-prob', 'state-uncertainty'],
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
    related: ['eff-dim', 'activation-manifold'],
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
    related: ['geometric-state', 'umap-projection'],
  },
  {
    id: 'halluc-ensemble',
    title: 'Hallucination Ensemble',
    category: 'methods',
    short: 'L1-sparse linear classifier on geometric features detects fabrication.',
    body: `The hallucination ensemble uses an L1-regularized linear classifier on geometric features across multiple layers to detect fabrication — cases where the model's internal geometry reveals performed confidence.

Key insight: The most important features are first-token measurements and output entropy. The model's first generated token already carries the geometric signature of whether it will fabricate. Output entropy minimum is the single strongest feature — fabricating models maintain a floor of uncertainty (no token reaches near-zero entropy), unlike genuine knowledge recall.

This detects geometric fabrication (performed confidence with distinctive late-layer anomalies). It does NOT catch "confident confabulation" (model believes wrong answer, geometry looks healthy).`,
    related: ['type-separation', 'first-token-signal', 'sentinel-head'],
  },
  {
    id: 'umap-projection',
    title: 'Projection Pipeline',
    category: 'methods',
    short: 'How high-dimensional activations become 3D coordinates.',
    body: `The projection pipeline reduces the model's high-dimensional activations to 3D coordinates for the visualization. It uses a series of linear and nonlinear transformations, each trained to preserve the geometric structure that matters.

The key innovation is the LDA intermediate step — without it, the projection suffers from "continuity collapse" where all tokens merge together. By first finding directions that separate states, then applying nonlinear projection, the pipeline preserves both state separation and trajectory smoothness.

Separate projectors are trained for different extraction layers. Projection quality is measured by trajectory correlation r(T,C) — how well the 3D path preserves the high-dimensional trajectory structure.`,
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
    related: ['state-collapse', 'eff-dim'],
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
    related: ['eff-dim', 'lid', 'geometric-state'],
  },
  {
    id: 'geometric-state',
    title: 'Geometric State',
    category: 'concepts',
    short: 'Classification of what the model is doing based on activation geometry.',
    body: `A geometric state is a classification of the model's current computational mode based on the geometry of its internal activations, not the content of its output.

6 states: creativity, reasoning, retrieval, precision, uncertainty, collapse

Key insight: The classifier detects OUTPUT geometry, not prompt semantics. The same prompt can produce different geometric signatures. A prompt asking for "creativity" might produce a reasoning geometry if the model reasons about creativity.

Retrieval is a geometric basin (attractor). Uncertainty is the cleanest state. The reasoning/retrieval boundary is where most classification ambiguity lives.`,
    related: ['lda-classifier', 'crystallization', 'eff-dim', 'dual-label'],
  },
  {
    id: 'type-separation',
    title: 'Hallucination Type Separation',
    category: 'concepts',
    short: 'Two distinct failure modes: performed confidence vs confident confabulation.',
    body: `GhostLine empirically identified two distinct types of hallucination failure:

Geometric hallucination ("performed confidence"): The model generates with uniformly high output confidence but shows distinctive geometric signatures — late-layer attention disorganization, MLP amplification anomalies, and a telltale floor of minimum entropy (no tokens reach near-zero uncertainty). Highly detectable. The model performs certainty without genuine knowledge-backed commitment on any specific token.

Confident confabulation ("believes wrong answer"): The model crystallizes cleanly on wrong information, geometry looks healthy, very difficult to detect. The model doesn't know it's wrong.

This is a fundamental detection gap — internal geometry can catch performed confidence, but not genuinely confident mistakes.`,
    related: ['halluc-ensemble', 'crystallization'],
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
  // ==================== VISUAL GUIDE ENTRIES ====================
  {
    id: 'reading-3d-view',
    title: 'Reading the 3D View',
    category: 'basics',
    short: 'A map of every visual element in the 3D canvas.',
    body: `Each visual element in the 3D canvas has a specific meaning:

Glowing spheres (solid): Generated tokens — one sphere per word the model produced.
Wireframe tetrahedrons (hollow diamonds): Prompt tokens — your input.
Connecting line or tube: The trajectory — the path taken through activation space.
Large bright sphere: The current token indicator — where the model is right now.
Labeled glowing orbs (background): Landmarks — reference points from training data.
Curved lines between tokens: Attention arcs — which tokens the selected token "looked at."
Red-orange torus ring around a sphere: Hallucination risk halo — elevated fabrication probability.
Pulsing larger sphere with colored ring: First generated token marker (T+1).

Color = geometric state: purple=creative, cyan=reasoning, green=retrieval, gold=precision, silver=uncertain, red=collapse.
Opacity = token probability: fully opaque = certain; translucent = alternatives were plausible.
Size (Signal Amplitude on) = residual norm: larger spheres have stronger internal representations.`,
    related: ['token-shapes', 'token-colors', 'visual-trajectory', 'visual-landmarks', 'current-token-indicator'],
  },
  {
    id: 'token-shapes',
    title: 'Token Shapes',
    category: 'basics',
    short: 'Shape encodes entropy: smooth spheres are confident, spiky icosahedra are uncertain.',
    body: `Each token in the 3D view has a shape that tells you something about it:

Smooth sphere: A normal generated token. The rounder it is, the more focused the model's attention was.

Spiky icosahedron: A generated token with high attention entropy. The model's attention was scattered across many possibilities. The spikier the shape, the more diffuse the model's internal state.

Wireframe tetrahedron: A prompt token (your input). Always wireframe — hollow, not solid — because they're your words, not the model's. They have a faint inner glow.

The transition from sphere to icosahedron is continuous. You'll see tokens gradually developing edges as entropy rises through a generation.

Shape effects only appear when "Entropy Distortion" is enabled in Settings.`,
    related: ['reading-3d-view', 'entropy', 'token-opacity', 'prompt-tokens'],
  },
  {
    id: 'token-colors',
    title: 'Token Colors',
    category: 'basics',
    short: 'Color shows what computational mode the model is in when generating each token.',
    body: `Token color in the default mode shows the model's geometric state — what kind of computation it's performing for that word.

The six state colors:
Purple: Creativity — open-ended generation, high exploration
Cyan/Teal: Reasoning — step-by-step logical processing
Green: Retrieval — factual recall from training
Gold: Precision — short, definitive structured output
Silver/Gray: Uncertainty — the model is hedging or speculating
Bright Red: Collapse — degenerate repetition loop

These colors are set by the "State Palette" in Settings. The Refined palette uses silver for uncertainty (always visually distinct from every other state). The Classic palette uses orange (which can be confused with warning colors).

Two other color modes exist:
Entropy mode: Blue (focused) to Purple to Pink (diffuse). Shows attention spread regardless of state.
Confidence mode: Same as state mode — confidence is shown through opacity instead of hue.`,
    related: ['geometric-state', 'token-opacity', 'token-shapes', 'state-uncertainty'],
  },
  {
    id: 'token-opacity',
    title: 'Token Opacity',
    category: 'basics',
    short: 'Opacity shows how confident the model was about this specific word.',
    body: `The transparency of a token sphere encodes the model's certainty about the specific word it chose.

Fully opaque (bright): The model was very certain. There was really only one reasonable next word.
Translucent: The model was less sure. Several alternatives were plausible.
Very transparent: Low probability token — the model surprised itself.

For prompt tokens (wireframe tetrahedrons), opacity varies with attention entropy: low-entropy prompt tokens (focused attention) are more opaque; high-entropy tokens are more transparent (range 0.3 to 0.8).

This is different from state classifier confidence (how sure the geometric state detector is). A token can be:
- Bright (certain word) + high state confidence: clearly in a state and certain about the word
- Translucent (uncertain word) + high state confidence: clearly in an uncertain state, producing exploratory tokens

The current token (frontmost bright sphere) is always fully opaque regardless of probability.`,
    related: ['token-colors', 'token-prob', 'reading-3d-view'],
  },
  {
    id: 'visual-attention-arcs',
    title: 'Reading Attention Arcs',
    category: 'basics',
    short: 'Arcs show which tokens the model "looked at" when generating the selected token.',
    body: `When you click a token, curved lines appear connecting it to other tokens. These are attention arcs — they show which earlier tokens the model was routing attention toward when generating this one.

Arc colors encode the attention pattern type:
Gold/Yellow: Local attention — focused on nearby context (within ~3 positions)
Cyan/Teal: Long-range attention — reaching back to distant context (>10 positions)
Magenta/Pink: Diffuse attention — spread widely, not focused
White/Silver: Self-attention — token attending to its own position

Arc thickness shows weight — thicker = stronger attention. Only arcs with >5% weight are shown.

Animated particles travel TOWARD the selected token along each arc, representing information flowing in.

Muted gray arcs point to out-of-range tokens (outside context window) with a directional arrow.
Nearly-invisible gray arcs point to the BOS token (architectural pattern, shown but de-emphasized).

Important caveat: Attention weight is not explanation. High attention does not mean "this token caused that output" — it means the model's routing put weight there.`,
    related: ['attention-patterns', 'attention-heads', 'reading-3d-view', 'sentinel-head'],
  },
  {
    id: 'particle-trails',
    title: 'Particle Trails',
    category: 'basics',
    short: 'Glowing dust trails behind the current token encode speed and uncertainty.',
    body: `The glowing particles that trail behind the current token position encode two signals:

How many particles: Scales with projected velocity — how fast the model is moving through activation space. Fast movement = dense particle cloud. Stable, repetitive generation = sparse trail.

How spread out: Scales with attention entropy. A tight, focused trail means concentrated attention. A wide, diffuse cloud means the model's attention is scattered.

Particle color matches the current geometric state, fading to black as each particle ages.

This creates an intuitive "comet tail" effect: you can see both the direction the model is moving AND something about how certain it is, just from the particle behavior.

Enable with "Particle Trails" in Settings.`,
    related: ['velocity', 'entropy', 'current-token-indicator'],
  },
  {
    id: 'visual-trajectory',
    title: 'Trajectory Line',
    category: 'basics',
    short: 'The connecting line traces the model\'s computational journey through 3D space.',
    body: `The line or cable connecting all the token dots is the trajectory — the ordered path the model took through activation space during generation.

Reading the trajectory:
Muted blue-gray segments: Connecting prompt tokens (your input)
Colored segments: The generated response, colored by geometric state
Smooth, gradual curves: Consistent, predictable generation
Sharp turns: A topic shift, a surprising token, a change in computational mode
Loops or circles: The model is stuck — repeating itself
Gaps (no line): Unusually large jump filtered as an outlier

Two visual styles:
Lines mode: Simple colored line, minimal overhead
Cables mode: 3D tubes with velocity-encoded thickness. Thick cables = fast movement. Thin cables = smooth, steady generation.

The most important thing to notice: where does the trajectory settle? If tokens from one state cluster together, that state is stable. If the trajectory keeps moving, the model's computational mode is shifting.`,
    related: ['token-trajectory', 'velocity', 'token-colors', 'visual-loop-detection'],
  },
  {
    id: 'current-token-indicator',
    title: 'The Current Token Indicator',
    category: 'basics',
    short: 'The bright glowing orb shows where the model is right now.',
    body: `The largest, brightest sphere in the scene is the current token indicator — showing the most recently generated token's position.

Core sphere: Color matches the current geometric state.

Outer glow halo: A transparent sphere around the core that pulses with the same color, giving presence to the current moment.

Amber rotating ring: Only appears when generation is paused or uncertain. The amber color (#f0a030) is intentionally different from all geometric state colors — it signals "the model is weighing its options." The ring fades in as entropy rises and rotates slowly. Brighter ring = more uncertain the current generation is.

The indicator smoothly glides between positions — it doesn't snap — because generation happens faster than visual updates.

When you click a token to inspect it, the indicator dims (30% normal brightness) to reduce visual competition with your selection.`,
    related: ['reading-3d-view', 'entropy', 'token-colors'],
  },
  {
    id: 'hallucination-halo',
    title: 'Hallucination Risk Halo',
    category: 'basics',
    short: 'A red-orange torus ring indicates elevated hallucination risk for this token.',
    body: `When the hallucination ensemble assigns a risk score above 0.5 to a generated token, a red-orange torus ring appears around that token sphere in the 3D view.

Appearance:
Ring color: Red-orange (#ff4422) — distinct from both collapse red and state colors
Opacity: Scales with risk value — barely visible at 0.5, more intense approaching 1.0
Size: 1.3x the token sphere radius
Shape: Thin torus (donut ring) around the sphere

What it means:
The hallucination ensemble — a classifier on geometric features across multiple layers — has flagged this token with elevated fabrication probability. The model's geometry shows the signature of performed confidence: uniformly high output probability with late-layer attention disorganization.

This detects geometric hallucination (performed confidence with distinctive geometric anomalies). It does NOT detect confident confabulation (where the model is confidently wrong and its geometry looks healthy).

Note: The halo appears per-token based on when the ensemble ran. The ensemble doesn't run on every single token — it runs on checkpoint tokens during generation.`,
    related: ['halluc-ensemble', 'type-separation', 'visual-hallucination'],
  },
  {
    id: 'first-token-visual',
    title: 'First Token Signal',
    category: 'basics',
    short: 'The first generated token pulses at 1.3x scale with a colored ring — it carries disproportionate geometric information.',
    body: `The very first generated token (T+1) is visually distinguished in the 3D view:

Pulsing scale: The sphere oscillates around 1.3x the normal token size. The pulse is slow and continuous — drawing attention without overwhelming the view.

State-colored ring: A subtle torus ring in the token's geometric state color surrounds the sphere at 1.5x radius. This is different from the hallucination halo (red-orange, risk-driven) — this ring reflects what state the model entered for its first generated word.

Why T+1 is special:
Research shows the first generated token carries disproportionate geometric information. The model's internal state is largely set during prompt processing, and T+1 is where that pre-set state first becomes visible in the output trajectory.

In hallucination detection, all top 15 discriminative features are first-token measurements. In state classification, the first generated token is often the most geometrically "pure" — the model hasn't drifted yet.

The visual emphasis on T+1 is a reminder: does this first token match the Prophecy prediction? If the Signals Panel showed "REASONING" in the prophecy and the first token lands in a retrieval region, something shifted during generation.`,
    related: ['first-token-signal', 'prompt-encoding', 'hallucination-halo'],
  },
  {
    id: 'visual-landmarks',
    title: 'Landmarks',
    category: 'basics',
    short: 'Named regions are reference points from training data — not live session data.',
    body: `The labeled glowing spheres in the 3D space are landmarks — semantic cluster centroids computed from training data.

What they are:
Reference constellations. They show where different types of tokens tend to cluster in this projection. "Foundation" is where high-frequency structural tokens ended up. "Temporal" is where time-related words cluster.

What they are NOT:
They do not update during your current inference session. They're not showing you where the current generation is or where your prompt landed. Think of them as a star map — the stars are fixed reference points, and you're watching a comet trace its path through them.

Why they're useful:
They give spatial context. If your trajectory passes through the "Reasoning" region it confirms the geometry matches semantic expectations. If a token lands in an unexpected cluster, that's interesting.

Size corresponds to how many tokens were in that cluster during training. "Foundation" is the largest. "Method" and "Process" are smallest.

Toggle landmarks off in Settings → Display if they're visually cluttering your view.`,
    related: ['3d-space', 'umap-projection', 'reading-3d-view'],
  },
  {
    id: 'visual-loop-detection',
    title: 'Loop Detection',
    category: 'concepts',
    short: 'Three-state indicator for detecting when the model gets stuck in a repetition loop.',
    body: `GhostLine continuously monitors for repetition loops. The status panel shows one of three states:

HEALTHY — Normal generation. The generating indicator shows a normal pulse.

SEMANTIC STUTTER (UNSTABLE) — The model has started showing signs of a loop (sharp direction reversals in 3D space, or dimensional collapse) but hasn't fully committed. The model may self-correct.

BRAIN DEATH (LOCKED) — The model is fully trapped in a repetition loop. The trajectory in 3D space will show either tight circles or a single point. The Activation Spread (E1) in the Signals Panel will be very low.

Recovery: When the model escapes a loop, the status panel shows "SIGNAL RECOVERED."

What causes loops?
The model can get pulled into "attractor basins" — regions of activation space where the same token always leads back to itself. Common triggers: very short or under-constrained prompts, prompts that elicit repetitive content, or certain model behaviors.

Geometric intervention can break loops: anti-momentum perturbation applied to early-layer activations pushes the model out of the attractor.`,
    related: ['state-collapse', 'eff-dim', 'geometric-intervention'],
  },
  {
    id: 'visual-hallucination',
    title: 'What Hallucination Looks Like',
    category: 'concepts',
    short: 'Geometric hallucination shows performed confidence with distinctive anomalies — confident confabulation looks healthy.',
    body: `GhostLine detects "geometric hallucination" — cases where the model's internal geometry reveals fabrication despite confident-sounding output.

3D view signs:
- Red-orange halo rings appear on high-risk tokens
- Trajectory shows unusual movement or sharp turns
- Late-layer attention disorganization (visible in attention heat maps)

Signals Panel signs:
- Halluc Risk meter showing orange or red
- Prophecy banner showing warning before generation starts
- Output entropy pattern: uniformly high confidence with no tokens reaching near-zero entropy

What geometric hallucination is NOT:
The system detects cases where the model performs confidence without genuine knowledge-backed certainty. However, confident confabulation (where the model believes a wrong answer) looks like healthy geometry. Those tokens will appear as normal, bright, confident-looking spheres.

Key insight at 8B scale: Fabricating models are MAXIMALLY CONFIDENT in their output (extremely low entropy), but the geometric signature is distinctive — late-layer attention heads show disorganization, MLP amplification is anomalous, and the minimum entropy across all tokens stays elevated (no token reaches the near-zero entropy seen in genuine knowledge recall).

Check the Prophecy banner before reading the output — it uses pre-generation features to flag risk before the first word appears.`,
    related: ['halluc-ensemble', 'type-separation', 'hallucination-halo'],
  },
  {
    id: 'prompt-tokens',
    title: 'Prompt Tokens',
    category: 'basics',
    short: 'Wireframe tetrahedrons are your input — they set up the geometry before generation begins.',
    body: `Before generating any tokens, the model reads your prompt. GhostLine shows prompt tokens as wireframe tetrahedrons — hollow diamond shapes in a muted blue-gray color.

Why tetrahedrons? To be visually distinct from the sphere-shaped generated tokens.

Why wireframe (hollow)? Prompt tokens are processed as input context, not predicted outputs. The hollow shape reflects this passive role.

The blue-gray muted color (#6688aa) keeps prompt tokens present but not dominant. They form a starting cluster in 3D space from which the generated trajectory departs.

Prompt tokens don't show labels by default. Click or hover a prompt tetrahedron to see its text and attention arcs.

Opacity varies with attention entropy: focused (low entropy) prompt tokens are more opaque; diffuse (high entropy) tokens are more transparent.

The Prophecy system uses the geometry of the last prompt token to predict the generation state before the first word is produced.`,
    related: ['reading-3d-view', 'prompt-encoding', 'visual-attention-arcs'],
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
