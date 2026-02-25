import type { CuratedRecording } from './types';

/**
 * Curated recording catalog.
 *
 * Each entry references a .ghostline file in public/recordings/.
 * Annotations are keyed to token indices and shown during playback.
 *
 * All recordings captured on Qwen3-8B (RTX 5090), Feb 2026.
 */
export const RECORDING_CATALOG: CuratedRecording[] = [
  // ─── 1. INTRO / OVERVIEW ───────────────────────────────────────────
  {
    id: 'ai-overview',
    title: 'How AI Thinks About AI',
    description: 'Qwen3-8B explains artificial intelligence. A creativity-dominant generation with genuine uncertainty — the perfect introduction to GhostLine.',
    teachingGoal: 'Learn to read the 3D visualization: each sphere is a token, color is cognitive state, and the trajectory reveals how the model thinks.',
    filename: 'ai-overview.ghostline',
    annotations: [
      {
        tokenIndex: 0,
        title: 'Welcome to GhostLine',
        description: 'Each glowing sphere is a token — one piece of the model\'s output. Together they form a trajectory through geometric space. The 3D position comes from the model\'s internal activations, projected down from 4,096 dimensions.',
        duration: 14,
      },
      {
        tokenIndex: 5,
        title: 'Reading the Colors',
        description: 'Colors represent cognitive states — the model\'s "mode of thought." Blue/purple = reasoning. Teal = retrieval (pulling facts). Orange = creativity. Red/pink = uncertainty. Green = precision. Watch how they shift.',
        duration: 12,
      },
      {
        tokenIndex: 12,
        title: 'Precision Flash',
        description: 'The model just emitted "**" (bold markdown). Notice the brief precision state — even formatting decisions have a geometric signature. The model briefly enters a structured, low-entropy mode.',
        duration: 8,
      },
      {
        tokenIndex: 19,
        title: 'Creativity Takes the Lead',
        description: 'This generation is creativity-dominant (57% of tokens). The model is synthesizing ideas about AI rather than recalling specific facts. Watch how the trajectory stays in the creative region of the space.',
        duration: 10,
      },
      {
        tokenIndex: 37,
        title: 'Genuine Uncertainty',
        description: '"...this potential comes with significant responsibilities" — uncertainty appears. The model is weighing multiple directions. This isn\'t confusion; it\'s the geometric signature of deliberation.',
        duration: 10,
      },
      {
        tokenIndex: 51,
        title: 'The Signals Panel',
        description: 'Look at the signals panel on the right. Entropy measures how uncertain the model is about the next token. Effective dimensionality shows how many "directions" the model is considering. Higher = more exploration.',
        duration: 12,
      },
      {
        tokenIndex: 70,
        title: 'State Transitions',
        description: 'The model just shifted from reasoning to creativity. Each transition is a measurable geometric event — not a label we assigned, but a classifier reading the activation geometry. 47 transitions in this generation alone.',
        duration: 10,
      },
      {
        tokenIndex: 100,
        title: 'Try Clicking a Token',
        description: 'Click any sphere to inspect its full geometric signature: entropy, velocity, effective dimensionality, hallucination risk score, and more. Every token carries rich diagnostic information.',
        duration: 10,
      },
      {
        tokenIndex: 130,
        title: 'Layer Switching',
        description: 'Use the layer selector to see how the same generation looks at different depths. Early layers are chaotic (high dimensionality). Middle layers organize. Late layers compress toward the output decision.',
        duration: 12,
      },
      {
        tokenIndex: 145,
        title: 'What You Just Saw',
        description: 'A single generation, 150 tokens, 5 cognitive states, 47 transitions. Every token\'s geometric fingerprint is captured in real-time. This is GhostLine: making the invisible visible.',
        duration: 12,
      },
    ],
    tags: ['intro', 'creativity', 'uncertainty', 'states'],
    status: 'live',
  },

  // ─── 2. MATHEMATICAL REASONING ─────────────────────────────────────
  {
    id: 'math-reasoning',
    title: 'Mathematical Reasoning',
    description: 'Solving 22x - 8 = 3x. Watch reasoning and precision alternate with every equation symbol — a clean two-state oscillation.',
    teachingGoal: 'See how different cognitive modes alternate within a single task: reasoning for structure, precision for exact values.',
    filename: 'math-reasoning.ghostline',
    annotations: [
      {
        tokenIndex: 0,
        title: 'Two-State Oscillation',
        description: 'Math problems produce a striking pattern: the model oscillates between reasoning (planning steps) and precision (emitting exact numbers and symbols). Watch for the rapid color alternation.',
        duration: 10,
      },
      {
        tokenIndex: 13,
        title: 'Precision for Numbers',
        description: '"8" — the model emits a number and snaps to precision state. This is a lower-entropy, more certain mode. The geometry literally tightens when the model commits to a specific value.',
        duration: 8,
      },
      {
        tokenIndex: 30,
        title: 'Reasoning for Structure',
        description: '"from both sides to get all x" — back in reasoning. The model is explaining its approach, planning the next algebraic step. Higher entropy, wider geometry.',
        duration: 8,
      },
      {
        tokenIndex: 68,
        title: 'Rapid Alternation',
        description: '35 state transitions in 149 tokens — the model flickers between modes faster than you can read. Each number triggers precision; each explanation triggers reasoning. The geometry captures micro-decisions invisible in the text.',
        duration: 10,
      },
      {
        tokenIndex: 95,
        title: 'No Uncertainty, No Creativity',
        description: 'Notice what\'s absent: no uncertainty, no creativity, no retrieval. The model is fully in "solve mode." Compare this to the moral reasoning recording where uncertainty dominates.',
        duration: 10,
      },
      {
        tokenIndex: 117,
        title: 'The Final Answer',
        description: 'As the model writes \\frac{8}{19}, precision takes over for an extended run. The trajectory tightens — the model has crystallized its answer and is now in pure output mode.',
        duration: 10,
      },
      {
        tokenIndex: 140,
        title: '100% Crystallized',
        description: 'Every token in this generation is crystallized — the model never wavered. High confidence, clean geometry, two-state oscillation. This is what a model looks like when it knows what it\'s doing.',
        duration: 10,
      },
    ],
    tags: ['reasoning', 'precision', 'math', 'oscillation'],
    status: 'live',
  },

  // ─── 3. KNOWLEDGE RETRIEVAL ────────────────────────────────────────
  {
    id: 'knowledge-retrieval',
    title: 'Knowledge Retrieval',
    description: 'Qwen3-8B explains the chicken. All 5 cognitive states, 63 transitions, and the widest entropy range — watch the model weave between recall and invention.',
    teachingGoal: 'Understand healthy knowledge retrieval: rapid state switching between factual recall, creative elaboration, and structural reasoning.',
    filename: 'knowledge-retrieval.ghostline',
    annotations: [
      {
        tokenIndex: 0,
        title: 'Five States in Action',
        description: 'This recording shows all five cognitive states: reasoning, retrieval, creativity, precision, and uncertainty. It\'s the most diverse generation in the collection — 63 state transitions.',
        duration: 10,
      },
      {
        tokenIndex: 3,
        title: 'Retrieval: Pulling Facts',
        description: '"Gallus" — the model is retrieving the scientific name from its training data. Retrieval state means the model is accessing stored knowledge rather than generating new content.',
        duration: 8,
      },
      {
        tokenIndex: 14,
        title: 'Retrieval Runs',
        description: '"the most remarkable and diverse animals in" — a 7-token retrieval run. The model has locked into recall mode, outputting a factual description with high confidence.',
        duration: 8,
      },
      {
        tokenIndex: 46,
        title: 'Creativity Weaves In',
        description: '"a fascinating" — creativity appears alongside retrieval. The model isn\'t just reciting facts; it\'s elaborating, choosing evocative language. Watch the color shift between teal (retrieval) and orange (creativity).',
        duration: 10,
      },
      {
        tokenIndex: 73,
        title: 'Deep Retrieval: Red Junglefowl',
        description: 'Six consecutive retrieval tokens for "red junglefowl (Gallus gallus)" — the model is pulling specific evolutionary biology. This is retrieval with high certainty.',
        duration: 8,
      },
      {
        tokenIndex: 97,
        title: 'The Creative Surge',
        description: 'A 25-token creativity streak! The model shifts from facts to narrative: "thousands of years of selective breeding, humans..." It\'s telling a story now, not reciting.',
        duration: 10,
      },
      {
        tokenIndex: 130,
        title: 'Entropy Range',
        description: 'This recording has the widest entropy range: 0.07 to 4.56. Low entropy = high confidence (scientific names). High entropy = genuine uncertainty (what to say next). The signals panel shows this in real-time.',
        duration: 10,
      },
      {
        tokenIndex: 143,
        title: 'Healthy vs Hallucinated Retrieval',
        description: 'Compare this to the hallucination recording. Both are "retrieving information," but here the hallucination risk scores are tiny (0.004). In the Darien recording, they spike to 0.60. Same mode, radically different geometry.',
        duration: 12,
      },
    ],
    tags: ['retrieval', 'creativity', 'states', 'entropy'],
    status: 'live',
  },

  // ─── 4. MORAL REASONING ───────────────────────────────────────────
  {
    id: 'moral-reasoning',
    title: 'Moral Reasoning Under Uncertainty',
    description: '"Starve honorably or steal?" — The model grapples with a genuine dilemma. Uncertainty dominates as it explores both sides without pretending to have an answer.',
    teachingGoal: 'See what genuine uncertainty looks like geometrically: the model explores rather than retrieves, and the geometry shows deliberation.',
    filename: 'moral-reasoning.ghostline',
    annotations: [
      {
        tokenIndex: 0,
        title: 'Genuine Uncertainty',
        description: '"The question of whether it..." — the model opens with uncertainty. Unlike math (where it knows the answer) or retrieval (where it has facts), this is a moral dilemma with no clear solution.',
        duration: 10,
      },
      {
        tokenIndex: 5,
        title: 'Creative Framing',
        description: 'Creativity state as the model restates the question in its own words. It\'s not recalling a textbook answer — it\'s constructing a framework for thinking about the problem.',
        duration: 8,
      },
      {
        tokenIndex: 27,
        title: 'Deep Uncertainty',
        description: '"deep moral, philosophical, and ethical dilemmas" — the model explicitly acknowledges the problem has no clean answer. The geometry reflects this: wider trajectory, higher dimensionality.',
        duration: 10,
      },
      {
        tokenIndex: 37,
        title: 'The 20-Token Uncertainty Run',
        description: 'Twenty consecutive tokens in uncertainty state. The model is carefully hedging: "There is no single answer that applies." This is the longest uncertainty run in any recording.',
        duration: 10,
      },
      {
        tokenIndex: 62,
        title: 'No Precision, No Retrieval',
        description: 'Three states only: creativity (90 tokens), uncertainty (42), reasoning (18). No precision, no retrieval. The model has nothing to look up and no exact answer to give. The geometry reflects pure deliberation.',
        duration: 10,
      },
      {
        tokenIndex: 79,
        title: 'The 49-Token Creative Streak',
        description: 'The longest creative run in the collection. The model is deeply engaged in exploring "Starve Honorably" — constructing arguments, weighing consequences. The trajectory flows smoothly through creative space.',
        duration: 12,
      },
      {
        tokenIndex: 128,
        title: 'Uncertainty ≠ Hallucination',
        description: 'The model is uncertain, but the hallucination risk scores remain very low (~0.001). Uncertainty is healthy — it means the model knows this is hard. Hallucination is when it pretends to know what it doesn\'t.',
        duration: 12,
      },
    ],
    tags: ['uncertainty', 'creativity', 'ethics', 'deliberation'],
    status: 'live',
  },

  // ─── 5. CODE GENERATION ───────────────────────────────────────────
  {
    id: 'code-generation',
    title: 'Code Generation',
    description: 'Writing a React script. Reasoning, precision, and retrieval interleave as the model structures explanations, writes boilerplate, and recalls API patterns.',
    teachingGoal: 'See how the same states (reasoning + precision) look different in code vs math, and how retrieval activates for API/library knowledge.',
    filename: 'code-generation.ghostline',
    annotations: [
      {
        tokenIndex: 0,
        title: 'Structured Technical Output',
        description: 'Code generation uses three primary states: reasoning (73 tokens), precision (58), and retrieval (15). The model thinks, formats, and recalls library patterns in rapid succession.',
        duration: 10,
      },
      {
        tokenIndex: 10,
        title: 'Retrieval for Library Names',
        description: '"React" — retrieval state. The model is pulling a specific library name from training data. Compare to math-reasoning, which never uses retrieval: code requires external knowledge, math is self-contained.',
        duration: 10,
      },
      {
        tokenIndex: 29,
        title: 'Reasoning for Structure',
        description: 'The model plans the HTML structure, section headings, and code organization in reasoning state. Same state as the math solver\'s "subtract 3x from both sides" — but applied to code architecture.',
        duration: 8,
      },
      {
        tokenIndex: 58,
        title: 'Precision for Syntax',
        description: '"<!DOCTYPE html>" — pure precision. HTML tags, attribute syntax, quotation marks. The model is in a low-entropy, high-certainty mode for boilerplate. This is precision in code vs precision in math.',
        duration: 10,
      },
      {
        tokenIndex: 82,
        title: '58 State Transitions',
        description: 'The second-highest transition count. Code generation requires constant context-switching: explain → format → recall → format → explain. The trajectory is a tangled web, not a smooth arc.',
        duration: 10,
      },
      {
        tokenIndex: 120,
        title: 'CDN URLs: Retrieval + Precision',
        description: '"https://unpkg.com/react@18" — watch retrieval (the URL pattern) and precision (the exact syntax) alternate at the character level. The model is assembling memorized fragments with formatting.',
        duration: 10,
      },
      {
        tokenIndex: 128,
        title: 'A Rare Uncertainty',
        description: '"18/umd" — uncertainty appears briefly. The model isn\'t sure about the exact CDN path structure. Only 3 uncertainty tokens in the whole generation. Code generation is high-confidence work.',
        duration: 8,
      },
    ],
    tags: ['code', 'reasoning', 'precision', 'retrieval'],
    status: 'live',
  },

  // ─── 6. HALLUCINATION DETECTION ───────────────────────────────────
  {
    id: 'hallucination-detection',
    title: 'Hallucination Detection',
    description: '"Battle of Darien, 1645" — a prompt designed to trigger fabrication. The model invents history with confidence. GhostLine\'s ensemble catches it from the very first token.',
    teachingGoal: 'See the geometric difference between healthy retrieval and hallucinated fabrication: same surface behavior, radically different internal geometry.',
    filename: 'hallucination-detection.ghostline',
    annotations: [
      {
        tokenIndex: 0,
        title: 'The Fabrication Begins',
        description: '"The **Battle of Darien**" — the model immediately enters retrieval state with high confidence. But the hallucination risk score is already 0.12 and climbing. The geometry knows something the text doesn\'t show.',
        duration: 12,
      },
      {
        tokenIndex: 2,
        title: 'Risk Score: 0.60',
        description: '"of" — by the third token, hallucination risk hits 0.60. For comparison, the chicken recording\'s retrieval tokens score 0.004. That\'s a 150x difference. The model is fabricating, and the geometry screams it.',
        duration: 10,
      },
      {
        tokenIndex: 10,
        title: 'Confident Fabrication',
        description: 'The model is in retrieval state, writing fluently and confidently about a battle that may not exist. The text looks perfectly normal. Only the geometric signature reveals the fabrication.',
        duration: 10,
      },
      {
        tokenIndex: 30,
        title: 'Compare: Chicken vs Darien',
        description: 'Both recordings are "the model explaining something." Both are mostly retrieval state. But the chicken has 63 state transitions (healthy variety) while Darien has only 13 (locked in fabrication mode). Diversity = health.',
        duration: 12,
      },
      {
        tokenIndex: 59,
        title: 'A Brief Uncertainty',
        description: '"important to clarify" — 5 tokens of uncertainty. The model briefly hesitates, almost self-correcting. But then it dives back into confident fabrication. The uncertainty was real; the model just overrode it.',
        duration: 10,
      },
      {
        tokenIndex: 88,
        title: 'The Long Retrieval Lock',
        description: '53 consecutive retrieval tokens — the model is now fully committed to its invented narrative. "The siege of Darien..." It\'s generating plausible-sounding history at scale. 89% of tokens are retrieval.',
        duration: 10,
      },
      {
        tokenIndex: 120,
        title: 'Why Geometry Matters',
        description: 'A text-based detector would need to fact-check every claim. GhostLine detects fabrication from the geometry alone — no knowledge base required. The model\'s internal state reveals what the words conceal.',
        duration: 12,
      },
      {
        tokenIndex: 141,
        title: 'Two Types of "Knowing"',
        description: 'GhostLine distinguishes confabulation (weak geometry, detectable) from mislearning (strong geometry, genuine but wrong). This recording shows confabulation — the model\'s geometry reveals it doesn\'t truly have the knowledge it claims.',
        duration: 12,
      },
    ],
    tags: ['hallucination', 'detection', 'fabrication', 'safety'],
    status: 'live',
  },
];
