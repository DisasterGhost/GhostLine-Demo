# GhostLine Demo Viewer

Real-time geometric visualization of LLM cognitive states — explore pre-recorded generation sessions.

Watch how transformer models think, hallucinate, and self-correct, made visible through geometric analysis of activation space.

## What is this?

GhostLine maps transformer hidden states to 3D coordinates during text generation. This demo viewer lets you explore pre-recorded sessions showing:

- **Cognitive state transitions** — reasoning, retrieval, creativity, precision, uncertainty
- **Hallucination detection** — geometric signatures that distinguish fabrication from factual output
- **Layer-by-layer processing** — watch how representations crystallize from chaos to order
- **Attention patterns** — see which tokens attend to which, and how patterns shift

## Live Demo

**https://disasterghost.github.io/GhostLine-Demo/**

No GPU or backend required. All recordings are pre-captured with full geometric data.

## Recordings

| Recording | What it shows |
|-----------|---------------|
| Cognitive States | All five healthy states in one generation |
| Collapse & Intervention | Loop collapse detected and broken via geometric intervention |
| Phase Transition | Live reasoning-to-precision shift mid-generation |
| Hallucination Detection | Fabrication vs factual output, geometric signatures |
| Layer Journey | Same generation viewed across transformer layers (L0→L31) |
| Fabrication Spectrum | The tipping point between hedging and confident fabrication |

## Controls

- **Space** — Play/pause replay
- **Arrow keys** — Step forward/back one token
- **Click tokens** — Inspect individual token geometry in the Token Inspector
- **Layer selector** — Switch between captured layers
- **Context window** — Focus on a range of tokens

## Tech Stack

React 19, TypeScript, Three.js (React Three Fiber), Vite

## Related

- [GhostLine](https://github.com/disasterghost/GhostLine) — Full system with live inference backend
- US Provisional Patent 63/982,900

## License

MIT
