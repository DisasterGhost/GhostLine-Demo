# GhostLine-Demo Frontend Port Report

**Date:** 2026-03-02
**Source:** `C:\GhostLine\src\frontend\src\`
**Target:** `C:\GhostLine-Demo\src\`
**Based on:** `CHECKPOINT_REPORT.md` (GhostLine source) + additional changes specified in port task

---

## C1: Remove 'stressed' State

### `src/data/statePalettes.ts`
- Removed `stressed: '#ff3333', // Red` from **CLASSIC** palette
- Removed `stressed: '#ff3333', // Red` from **REFINED** palette

### `src/data/tokenReadingGenerator.ts`
- Removed `stressed: 'state-stressed',` from `STATE_WIKI_IDS`
- Removed `else if (state === 'stressed')` alert block from Sentence 5; updated comment to "Alert for collapse"

### `src/components/GhostwireScene.tsx`
- Removed `if (token.geometricState === 'stressed')` RED alarm branch from `UncertaintyStatic` color logic
- Updated comment from "state-aware for stressed/uncertainty alarm" → "state-aware for uncertainty alarm"

### `src/components/SignalsPanel.tsx`
- Updated file comment: `5 healthy + stressed + collapse` → `5 healthy + collapse`
- Removed `stressed: 'STRESSED',` from `STATE_LABELS`

### `src/data/wikiContent.ts`
- Removed entire `state-stressed` wiki entry
- Removed `'state-stressed'` from `entropy` entry's `related` array
- Removed `'state-stressed'` from `lid` entry's `related` array
- Removed `'state-stressed'` from `halluc-ensemble` entry's `related` array
- Removed `'state-stressed'` from `geometric-intervention` related array; updated results text `'68.8% of stressed → uncertainty'` → `'68.8% of collapse → uncertainty'`
- Updated `geometric-state` body: `7 states: creativity, reasoning, retrieval, precision, uncertainty, stressed, collapse` → `6 states: creativity, reasoning, retrieval, precision, uncertainty, collapse`
- Updated `type-separation` body: `"geometry is distressed"` → `"geometry is uncrystallized"`
- Removed `'state-stressed'` from `type-separation` related array

---

## V1: Hallucination Risk Halo

### `src/components/GhostwireScene.tsx`
- Added `hallucinationRisk?: number | null;` to `TrajectoryPoint` interface
- Added `isFirstGenerated?: boolean` to `ClickableTokenProps` interface (also for V2)
- Added `firstTokenScale` ref and pulse logic in `useFrame` hook (also for V2)
- Added `firstGenScale` multiplier to `size` calculation (also for V2)
- Added torus halo mesh after main mesh and prompt glow:
  - Color: `#ff4422` (red-orange)
  - Opacity: `Math.min(0.9, risk * 0.85)` — scales with risk value
  - Size: `size * 1.3` radius, `size * 0.08` tube
  - Only renders when `!isPrompt && hallucinationRisk > 0.5`
  - `depthWrite={false}` for proper transparency layering

---

## V2: T+1 First Token Marker

### `src/components/GhostwireScene.tsx`
- `ClickableTokenProps`: Added `isFirstGenerated?: boolean`
- Function signature: Added `isFirstGenerated = false` param
- `useFrame`: Added `firstTokenScale` ref (init 1.3); pulses `1.3 + 0.08 * Math.sin(clock.elapsedTime * 3.5)` when `isFirstGenerated`
- Size calculation: Added `firstGenScale = isFirstGenerated ? firstTokenScale.current : 1.0`
- JSX: Added T+1 state-colored ring mesh (torus, `size * 1.5` radius, `size * 0.06` tube, opacity 0.55)
- Render loop: Added `isFirstGen = !point.isPrompt && generatedTokens[0]?.position === point.position`; passed as `isFirstGenerated={isFirstGen}`

---

## V3: Signal Amplitude Default True

### `src/components/SettingsPanel.tsx`
- `DEFAULT_VISUAL.signalAmplitude`: `false` → `true`

---

## V4: Prompt Token Opacity by Entropy

### `src/components/GhostwireScene.tsx`
- Added `promptOpacity = 0.8 - entropyFactor * 0.5` (range 0.3–0.8)
- Changed `isPrompt ? 0.35 :` → `isPrompt ? promptOpacity :` in `baseOpacity` calculation

---

## W1–W10: Wiki Entries

### `src/data/wikiContent.ts`
Added 14 new entries in a `VISUAL GUIDE ENTRIES` section:

| ID | Title | Category |
|----|-------|----------|
| `reading-3d-view` | Reading the 3D View | basics |
| `token-shapes` | Token Shapes | basics |
| `token-colors` | Token Colors | basics |
| `token-opacity` | Token Opacity | basics |
| `visual-attention-arcs` | Reading Attention Arcs | basics |
| `particle-trails` | Particle Trails | basics |
| `visual-trajectory` | Trajectory Line | basics |
| `current-token-indicator` | The Current Token Indicator | basics |
| `hallucination-halo` | Hallucination Risk Halo | basics |
| `first-token-visual` | First Token Signal | basics |
| `visual-landmarks` | Landmarks | basics |
| `visual-loop-detection` | Loop Detection | concepts |
| `visual-hallucination` | What Hallucination Looks Like | concepts |
| `prompt-tokens` | Prompt Tokens | basics |

All entries use existing `WikiCategory` types. `token-colors` and `visual-hallucination` written without `stressed` state.

---

## Additional Changes

### `src/components/SettingsPanel.tsx`
- `DEFAULT_DISPLAY.playbackRate`: `2` → `4`

### `src/components/SignalsPanel.tsx`
- Entropy extraction: `token?.entropy ?? 0` → `token?.logitEntropy ?? token?.entropy ?? 0` (prefer output entropy)
- Entropy bar over-threshold class: `entropy > 3.5` → `entropy > 4.0`
- Entropy bar colors: `entropy > 3.5 ? '#ff3333' : entropy > 2.8 ? '#ff9900'` → `entropy > 4.0 ? '#ff3333' : entropy > 3.0 ? '#ff9900'`
- Bar scale `/5.0` — already correct in target, no change needed

### `src/websocket.ts`
- Added `logit_entropy?: number | null;` field to `TokenData` interface

### `src/hooks/usePlaybackBuffer.ts`
- Added `logitEntropy?: number | null;` to `TrajectoryPoint` interface

### `src/hooks/useGhostwire.ts`
- Added `logitEntropy: tokenMsg.data.logit_entropy ?? null,` in token message handler

---

## Invariants Preserved
- `collapse` state was NOT touched in any file
- All other states (creativity, reasoning, retrieval, precision, uncertainty) unchanged
- No CSS files modified
- `signalCatalog.ts` and `StatusDisplay.tsx` not modified (already clean)
- No files created wholesale — all changes applied as targeted edits
