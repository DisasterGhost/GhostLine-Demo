import type { CuratedRecording } from './types';

/**
 * Curated recording catalog.
 *
 * Each entry references a .ghostline file in public/recordings/.
 * Annotations are keyed to token indices and shown during playback.
 *
 * Recordings are captured on Qwen3-8B (RTX 5090) unless noted.
 */
export const RECORDING_CATALOG: CuratedRecording[] = [
  {
    id: 'cognitive-states',
    title: 'Dragon Poem — Cognitive States',
    description: 'Qwen3-8B writes a poem about dragons warring in the sky. Watch creativity and reasoning trade off token by token.',
    teachingGoal: 'Understand that different cognitive tasks produce measurably different geometric patterns in the model\'s activation space.',
    filename: 'cognitive-states.ghostline',
    annotations: [
      {
        tokenIndex: 0,
        title: 'The Model Begins',
        description: 'The first token lands in reasoning space — the model is planning its poem structure before the creative words flow.',
        duration: 10,
      },
      {
        tokenIndex: 5,
        title: 'Creativity Takes Over',
        description: '"Skybound Clash" — the title emerges in creativity state. Notice how the trajectory color shifts as the model enters its creative mode.',
        duration: 8,
      },
      {
        tokenIndex: 11,
        title: 'Verse Structure',
        description: '"Upon the wings of storm..." — creativity and reasoning alternate rapidly. The model balances poetic invention with metrical structure.',
        duration: 8,
      },
      {
        tokenIndex: 39,
        title: 'Retrieval Flash',
        description: 'Retrieval state appears briefly — the model is pulling a common phrase pattern ("that") from memory before returning to creative composition.',
        duration: 8,
      },
      {
        tokenIndex: 61,
        title: 'Uncertainty Emerges',
        description: '"with" — a moment of genuine uncertainty. The model is weighing multiple poetic directions. This state is geometrically distinct from both reasoning and creativity.',
        duration: 8,
      },
      {
        tokenIndex: 83,
        title: 'Four States in Ten Tokens',
        description: 'Watch closely: "thunder, swift, unkind" cycles through creativity, retrieval, uncertainty, and reasoning in rapid succession. The geometry captures each micro-decision.',
        duration: 10,
      },
    ],
    tags: ['states', 'intro', 'creativity', 'qwen3-8b'],
  },
  {
    id: 'collapse-intervention',
    title: 'Collapse & Intervention',
    description: 'The model falls into a repetitive loop. Geometry detects it. An intervention fires. The model recovers.',
    teachingGoal: 'See that geometric collapse is detectable in real-time and that targeted interventions can break pathological loops.',
    filename: 'collapse-intervention.ghostline',
    annotations: [],
    tags: ['collapse', 'intervention', 'causal'],
  },
  {
    id: 'phase-transition',
    title: 'Phase Transition',
    description: 'Mid-generation, the model clicks from exploring possibilities to delivering a precise answer. Watch the trajectory tighten.',
    teachingGoal: 'Observe a live cognitive phase transition — the geometric moment where reasoning becomes conclusion.',
    filename: 'phase-transition.ghostline',
    annotations: [],
    tags: ['transition', 'reasoning', 'precision'],
  },
  {
    id: 'hallucination-detection',
    title: 'Hallucination Detection',
    description: 'Compare healthy generation against fabrication. The hallucination ensemble catches it from the first token.',
    teachingGoal: 'Understand that hallucination has a distinct geometric signature detectable before the model finishes generating.',
    filename: 'hallucination-detection.ghostline',
    annotations: [],
    tags: ['hallucination', 'detection'],
  },
  {
    id: 'layer-journey',
    title: 'Layer Journey',
    description: 'The same generation viewed through every layer. Watch chaos become order become squish.',
    teachingGoal: 'See how information crystallizes across transformer layers: early layers are chaotic, middle layers organize, late layers compress.',
    filename: 'layer-journey.ghostline',
    annotations: [],
    tags: ['layers', 'crystallization'],
  },
  {
    id: 'fabrication-spectrum',
    title: 'Fabrication Spectrum',
    description: 'The tipping point where the model decides to lie or refuse. Watch the attention boundary shift token by token.',
    teachingGoal: 'Observe the geometric boundary between fabrication and refusal — the d=2.72 attention divergence where self-awareness emerges.',
    filename: 'fabrication-spectrum.ghostline',
    annotations: [],
    tags: ['fabrication', 'refusal', 'spectrum', 'attention'],
  },
];
