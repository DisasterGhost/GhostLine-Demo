# GhostLine-Demo Frontend TODO

## Corpus Recording + Playback Feature (NEW)

**Goal:** Research Workbench corpus generation should produce BOTH:
1. **Full high-D NPZ** with all selected signal data (for analysis)
2. **`.ghost` recording** of the same generation (for visual replay)

This lets researchers watch each corpus sample retrospectively after generation completes.

### Implementation Plan

#### Backend (`server_hf.py`)
- During corpus generation, the server already streams per-token data via WebSocket
- Add a `/corpus/generate` endpoint (or extend existing) that:
  - Runs generation with full signal extraction (NPZ pipeline)
  - Simultaneously emits the same token stream as a normal `/ws` generation
  - Returns both the NPZ path AND the `.ghost` recording data
- Alternatively: emit a `recording_complete` message with the full `.ghost` blob after each sample

#### Frontend (Research Workbench)
- **Option A — Live playback during corpus gen:**
  - Each corpus sample plays in the 3D viewer as it generates
  - `.ghost` file is assembled client-side from the WebSocket stream (already works for normal generation)
  - User watches each sample in real-time; can pause corpus gen to inspect
  - Auto-advance to next sample when current one finishes
  - Toggle: "Watch Live" vs "Background Generation" (faster, no rendering overhead)

- **Option B — Retrospective only:**
  - Corpus generates in background (faster)
  - `.ghost` files saved alongside NPZs on the server
  - Frontend adds a "Corpus Viewer" panel: browse generated samples, click to replay
  - Filter by state, halluc_risk, entropy, etc.

- **Recommended: Both.** Default to background gen with option to watch live. All samples get `.ghost` files regardless.

#### `.ghost` Assembly
- The recording format is already defined (JSON array of frame objects)
- Each frame needs: `token`, `coords` (per layer), `signals` (entropy, prob, eff_dim, velocity, etc.), `geometricState`, `hallucinationRisk`
- Server already computes all of this for the WebSocket stream
- Just need to accumulate frames and save as `{prompt_hash}_{timestamp}.ghost` alongside the NPZ

#### Corpus Viewer UI
- Panel in Research Workbench showing corpus samples as a sortable table
- Columns: prompt (truncated), state, halluc_risk, entropy, token_count, date
- Click row → loads `.ghost` into main 3D viewer
- Bulk actions: export selected, delete, re-run
- Filter by geometric state, halluc risk range, signal thresholds

### Signal Selection
- User picks which signals to capture in NPZ (already works)
- `.ghost` always captures the standard set (coords, entropy, prob, state, halluc_risk)
- NPZ captures the full high-D residuals + whatever signals the user selected

### File Organization
```
/workspace/corpus/{run_name}/
  ├── config.json          # Run parameters
  ├── samples/
  │   ├── 001_prompt_hash.npz        # High-D signal data
  │   ├── 001_prompt_hash.ghost  # Visual recording
  │   ├── 002_prompt_hash.npz
  │   ├── 002_prompt_hash.ghost
  │   └── ...
  └── summary.json         # Aggregate stats
```

## A/B Compare Tool for `.ghost` Files

**Goal:** Side-by-side comparison of two `.ghost` recordings with synchronized analysis.

### Viewer Modes
1. **Split-screen 3D:** Two viewports, same camera angle (linked orbit controls), each playing a recording. See both trajectories simultaneously.
2. **Overlay mode:** Both trajectories in one viewport, different colors (e.g., cyan vs magenta). Shows where paths diverge in geometric space.
3. **Signals diff:** Two signal timelines stacked or overlaid — entropy, prob, velocity, eff_dim, halluc_risk plotted as dual lines with delta shading between them.

### Playback
- **Synchronized:** Both advance token-by-token together (useful for same-prompt, different-model or different-temperature runs)
- **Independent:** Each has its own play/pause/scrub (useful for different-length generations)
- Scrubber shows both timelines with aligned or independent cursors

### Analysis Panels
- **Token-level diff table:** Side-by-side tokens with signal values, highlight divergences above a threshold
- **State transition comparison:** State sequence A vs B, Levenshtein distance, first-divergence-point
- **Summary stats:** Mean/std/max for each signal, Cohen's d between the two recordings
- **Geometric divergence:** Per-token Euclidean distance between projected coords (how far apart are the trajectories at each step?)

### Use Cases
- Compare hallucination vs correct answer on same topic (the core demo)
- Compare same prompt across models (3B vs 8B)
- Compare same prompt with/without intervention
- Compare temp=0.8 vs temp=0.2 on same prompt
- QA corpus samples: flag outliers, compare against "healthy" reference recording

### Integration with Corpus Viewer
- Select two rows in corpus table → "Compare" button → opens A/B tool
- Or drag-drop two `.ghost` files
- Preset comparisons: "Compare against closest healthy match" (auto-select by prompt similarity)

### File Format Notes
- `.ghost` already contains: token text, coords (per layer), signals, geometricState, hallucinationRisk, metadata (prompt, model, timestamp)
- No format changes needed — just a new consumer of existing data
- For overlay mode, need to handle different token counts gracefully (pad shorter with ghost trail)

## File Extension Rename: `.ghostline` → `.ghost`

Cleaner, shorter, memorable. Need to update:
- [ ] Recording loader (`loadAndReplay` in `usePlaybackBuffer.ts`)
- [ ] Recording catalog (`catalog.ts`) — file references
- [ ] Public recordings in `public/recordings/` — rename files
- [ ] Backend `server_hf.py` — any recording save/export logic
- [ ] Frontend file export/download (if any)
- [ ] Documentation references
- [ ] Accept both `.ghost` and `.ghostline` during transition (backwards compat)

## Other Pending Fixes
- [ ] Signal consolidation (start-on-signal)
- [ ] Alert banner for critical thresholds
- [ ] Color consistency across panels
- [ ] Research panel improvements
- [ ] Mobile responsiveness
- [ ] Minor polish items (see FRONTEND_AUDIT.md)
