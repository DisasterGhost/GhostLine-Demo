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
    title: 'Cognitive States',
    description: 'Watch the model shift between reasoning, creativity, and precision — each with its own geometric signature.',
    teachingGoal: 'Understand that different cognitive tasks produce measurably different geometric patterns in the model\'s activation space.',
    filename: 'cognitive-states.ghostline',
    annotations: [],
    tags: ['states', 'intro'],
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
