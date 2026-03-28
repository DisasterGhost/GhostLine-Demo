# StatusDisplay.tsx Rewrite Spec

## Context
StatusDisplay.tsx is the bottom status bar in a GhostLine demo viewer — a 3D visualization of LLM token-by-token generation with cognitive state classification. The current code is ancient and uses crude 3D-projected coordinate heuristics for loop/stutter detection. Needs a full modernization.

## What to KEEP (these work fine)
- Connection status (already updated to "Demo Mode")
- Model/Layer badge section
- Error display
- Buffer status + flush button
- Current token display with SAE features
- Progress indicator ("Received: N tokens")
- Generation stats (tokens, ms/tok, total time)
- The TypeScript interfaces/types at the top (TrajectoryPoint, LoopStats, etc.) — these match the data format from recordings

## What to REMOVE entirely
1. **`computeDrift()` function and `DriftMeter` component** — Euclidean distance in 3D projected space is meaningless. Not used in rendering anyway.
2. **`detectLoop()` function** — The local 3D-coordinate loop detection logic (direction change angles, covariance eff_dim). The backend already provides `loopStats` on each token with proper `state`, `heat`, `manifold_breadth`, `activation_eff_dim`, `avg_direction_change`. Just use those directly.
3. **`persistentViolationCount` and `lastTrajectoryLength` module globals** — Part of the removed loop detection.
4. **"SEMANTIC STUTTER" label** — Replace with better terminology (see below).
5. **"BRAIN DEATH" label** — Way too dramatic for a demo. Replace.
6. **Pause detection "UNCERTAIN" overlay** — The entropy-based pause detection (`usePauseDetection.ts`) is a separate hook; the StatusDisplay just renders its state. Keep the rendering but clean up the label.

## What to REWRITE

### Loop/State Alert System
Instead of the old three-tier system, use the backend-provided `loopStats` directly:

**From the `LoopStats` interface (already defined):**
```ts
interface LoopStats {
  activation_eff_dim: number;
  direction_change: number | null;
  avg_direction_change: number | null;
  state?: 'HEALTHY' | 'UNSTABLE' | 'LOCKED';
  heat?: number;
  manifold_breadth?: 'WIDE' | 'FOCUSED' | 'NARROW';
}
```

**New display logic:**
- If `backendLoopStats.state === 'LOCKED'`: Show 🔴 "REPETITION LOCK" with dim + heat stats
- If `backendLoopStats.state === 'UNSTABLE'`: Show 🟡 "GENERATION DRIFT" with dim + heat stats  
- If healthy: no alert (just the normal generating indicator)

**Remove all local computation.** If no `loopStats` on the token, just show "Generating..." / "Playing back..." with no loop status — don't try to compute it from 3D coords.

### Manifold Breadth
Keep showing manifold breadth during generation, but simplify — just read `backendLoopStats.manifold_breadth` directly. No local fallback computation.

### Recovery Flash
Keep the recovery flash effect (transitioning from unhealthy → healthy), but update the text from "SIGNAL RECOVERED" to "RECOVERED" and make the animation subtler.

### Generating Indicators
Simplify from 4 variants to 2:
- **Normal**: `● Generating...` or `● Playing back...` (green pulse)
- **Alert**: The loop alert banner replaces the generating indicator when state !== 'healthy'

Remove the separate "Generating (stuttering...)" and "Generating (BRAIN DEATH)" indicators — the loop alert banner already covers these states.

### Debug Stats Line
Keep the debug stats line (`Loop: dim=... Δ=...° heat=...`) during generation but:
- Only show when `backendLoopStats` exists (don't compute locally)
- Style it more subtly (smaller font, more transparent)

## CSS Changes
In App.css, the loop-related styles can stay mostly as-is. Just update:
- `.loop-alert .loop-text` content references (the JS handles the text)
- Remove `.loop-unstable-gen` and `.loop-locked-gen` classes (unused after simplification)

## HARDENING_TOGGLE
Keep the hardening mode infrastructure — it's used elsewhere. Just make sure any new text respects it (hide raw numbers when HARDENING_MODE=true).

## Don't Touch
- The `HARDENING_TOGGLE` bucketing functions at the top
- The `STATE_COLORS` import
- The SAE features section 
- The interface definitions (they match recording data format)
- Any other component files

## Testing
After changes, verify the component still type-checks. The build is: `npm run build` (Vite + TypeScript). Run from the repo root.
