# Research-Path Upgrade — Design Spec

**Date:** 2026-05-24
**Repo:** `ghostline-consulting-site` (branch `codex/consulting-offer-site`)
**Target file:** `static-landing/index.html` (+ `static-landing/landing.css`; minimal JS only if a figure needs tabs)
**Status:** Approved design — ready for implementation plan.

## Goal

Bring the research path (`#path-research`) up to parity with the industry path by adding three
dedicated finding-sections — one deep centerpiece plus two lighter breadth sections — and a
closing rigor/falsifiability section. Every claim must be traceable to a findings doc and use
the audited (honest) numbers, because the path's whole differentiator is "survives scrutiny."

## Architecture / approach

- **Realization = Approach A:** purpose-built CSS/SVG figures from real data, in the same style
  as the existing `evidence-grid`, `honest-split`, and `states-legend` components. No dependency
  on the live system. One real screenshot (the 8B run) is embedded; everything else is built.
- **Deploy reality (confirmed):** `static-landing/index.html` IS the deployed landing root (the
  Pages workflow copies it to `dist/index.html`). The React `src/components/LandingPage.tsx` is
  legacy and NOT the front page — **no React parity needed.** The React app builds the `/demo`.
- **Reuse existing tokens:** state colors already exist as CSS custom props (`--c-reasoning`,
  `--c-retrieval`, `--c-creativity`, `--c-precision`, `--c-uncertainty`). New artifacts reuse them.

## Section order (new sections slot between Evidence and "See it")

`Mechanism → Evidence → Prophecy → Phase transition → 8B cross-scale → Methods & falsifiability → See it`

This makes the path read as an arc: how it works → what's proven → the surprising results →
how we keep ourselves honest → go explore it yourself.

---

## Section 1 — Prophecy (centerpiece, deep artifact)

**Section label:** `Prophecy` · **Title:** *The model's mind is made up before it speaks.*

**Claim:** A model's geometric cognitive state is largely determined during prompt encoding —
predictable from prompt-only features, before the first token is generated.

**Artifact (built CSS/SVG):** a left→right flow:
1. A prompt (left).
2. **Pre-generation prediction:** state-distribution bars produced from prompt-encoding features
   *before token 1* (e.g., reasoning 0.71, retrieval 0.18, …).
3. **Actual generation:** the generated tokens, colored per-token by state, visibly matching the
   prediction.

**Real numbers (audited — use exactly these):**
- 8B prompt classifier: **85–91%** (RF, proper grouped CV; 91.3% @3,791 feat, 88.4% geo-335,
  86.5% attn-20).
- 3B: **85.0% prompt-level (grouped) CV.**
- Per-state accuracy (8B), shown as a small honest spread: reasoning 95% · creativity 94% ·
  collapse 93% · retrieval 89% · precision 88% · uncertainty 78% · **edge cases 56% (weakest).**

**Honesty guardrails (must appear somewhere on the page, not be hidden):**
- Do **NOT** cite "r≈1.000 prompt↔first-token" as a result — trivially true (same forward pass).
  Omit it entirely; don't even disclaim it on the page (outsiders never saw the claim, so a
  disclaimer just confuses — this was a review note).
- The grouped/prompt-level CV + the **99.6%→85% leakage self-correction** lives in the **Methods**
  section (card 03), where there's room to explain it — NOT duplicated in Prophecy. Prophecy's
  "what it's not" column holds plain-language limitations instead: mode ≠ answer; a tendency, not a
  guarantee (cross-links to Phase transition); accuracy varies by mode (cross-links to edge cases).
  Reason: the insider shorthand (r≈1.0, "prompt-identity leakage") was illegible to reviewers.

**Style ref:** screenshot #12 (real Prompt-time signal family: Prompt Residual / Attention /
Logit-Lens / Top-K) — confirms the prompt-time signals are real and captured.

---

## Section 2 — Phase transition (breadth)

**Section label:** `In-flight` · **Title:** *It catches the model changing its mind mid-sentence.*

**Claim:** Within a single generation, the model can switch cognitive regime (e.g.
reasoning→precision), and the instrument resolves the shift live.

**Artifact (built CSS/SVG, REAL DATA):** a token-timeline strip built from **real tokens of
`public/recordings/math-reasoning.ghostline`** (prompt "Solve 22x − 8 = 3x"), each colored by the
recording's per-token `geometricState`. Early tokens reason the strategy ("Subtract … from both
sides"); near the answer the model shifts into precision ("Divide both sides by … x = 8/19"). The
flip occurs ≈ token 105 (NOT T143–149 — that was the 8B chicken demo, a different recording).

**Framing guardrail:** this is a **qualitative live-capture demonstration, not a benchmark.**
No accuracy/F1 number attaches to it. Per-token labels are raw classifier output (they flicker);
the final fraction is condensed for readability — both stated in the caption.

---

## Section 3 — 8B cross-scale (breadth)

**Section label:** `At scale` · **Title:** *Does it hold as models grow? At 8B — yes, and richer.*

**Claim:** At 8B the geometry is rich and well-separated, and a new discriminator family (MLP)
emerges that is barely present at 3B. The only *clean* scale-growth evidence (same family, same
pipeline) is within-family Qwen2.5 1.5B→3B, where separation rose **~1.1–1.3×** — modest, still
N=2, and the honest figure to cite for "grows with scale" (NOT the confounded 3.3×).

**Artifact:** the **real #9 screenshot** (Qwen3-8B run + per-layer E1 readout) embedded
alongside a small CSS panel highlighting **MLP discriminators emerging at 8B (d≈4.2)**,
near-absent at 3B, plus the per-layer E1 profile visible in the shot.

**Honesty guardrails (critical — this section is easy to overclaim):**
- Framed as **"validated at 8B,"** NEVER as a "scaling law" or "power law" — that result is
  preliminary (N=2 sizes) and explicitly not citable.
- The **"~3.3× wider eff_dim gap" must NOT be presented as a clean scale effect.** It is a
  Llama-3B → Qwen-8B comparison that confounds **scale with architecture** (different model
  families). Either omit the 3.3× figure, or state the confound plainly. Do not imply "gaps grow
  3.3× with size."
- Use defensible effect sizes (large-by-convention, d≈4.2). Avoid the contested aggregate signal
  counts (1,018 / 2,016 had no FDR correction).
- **Name the open question (forward-compatible):** whether state-separation grows as a clean
  function of parameter count is the explicit open question, and a pre-registered experiment
  (`experiments/geometric_scaling/SCALING_V3_UNIFIED_DESIGN.md`, "scaling-law 2.0": 3 families,
  bf16, within-family curves) is designed to answer it — currently unrun (funding-gated as of
  May 2026). When that lands with citable results, THIS section upgrades in place from "holds at
  8B" to the stronger scaling claim, no restructuring needed.

**Asset dependency:** the #9 PNG must be exported into `public/media/` (e.g.
`ghostline-8b-chicken.png`) so the workflow copies it to `dist/media/`. Collin to provide the
file; until then the section uses a captioned placeholder box.

---

## Section 4 — Methods & falsifiability (the rigor pass)

**Section label:** `Method` · **Title:** *How we keep ourselves honest.*

A compact section (grid or list) covering:
- **Locked methodology:** HuggingFace Transformers; temp=0.8, top_p=1.0, multinomial sampling;
  all thresholds calibrated at these settings.
- **Validation hygiene:** grouped / prompt-level cross-validation (analogous to patient-level
  splits in medical ML); numbers are held-out, not training-set.
- **Self-correction as a feature:** we caught and fixed our own inflations — the 14.6% prompt
  leakage (prophecy), and we flag where thresholds DON'T transfer (e.g. the E1<5.0 collapse rule
  is 3B-only, invalid at 8B).
- **One falsifier per headline claim:** a single line each stating what observation would
  disprove it (e.g. "if shuffling prompt identity across CV folds erased the gap, prophecy would
  be leakage — it doesn't").

This operationalizes the research-bio closer ("I care more about what survives scrutiny than what
sounds impressive") and is exactly what a science-grant reviewer screens for.

---

## Optional (low priority, fold in only if cheap)

- **Mechanism upgrade:** make the existing "58 signals" claim concrete with screenshot #11
  (Research Workbench → Signals taxonomy). Nice-to-have, not required.

## Deferred (revisit AFTER the rigor pass — Collin's call)

- **State "personalities"** (#2): the per-token vs full-generation eff_dim dissociation that
  splits the five states into geometric characters (Explorer/Surgeon/Architect/Librarian/
  Wanderer). Source: `docs/findings/PER_TOKEN_EFF_DIM_DISSOCIATION_FINDINGS.md`,
  `STATE_GEOMETRIC_TAXONOMY_8B.md`. Collin wants to re-evaluate whether/how to feature this once
  the rest of the path is built.

## Follow-up (out of scope for this landing work — do not lose)

- The new frontend (`ghostline-app-next`) does **not** surface the **prophecy banner** or the
  **DT classifier readout** — so the demo being shipped for EV doesn't show prophecy, arguably the
  strongest finding. Track "port prophecy banner + DT readout into ghostline-app-next" separately.

## File structure / units

- `static-landing/index.html` — add the four new `<section class="section">` blocks inside
  `<div id="path-research">`, after the "See it" section's predecessor (i.e. before line ~305
  "See it"). Each section is self-contained markup.
- `static-landing/landing.css` — add scoped component styles: `.prophecy-flow`, `.state-bars`,
  `.token-timeline`, `.scale-compare`, `.method-grid`. Reuse existing `--c-*` state colors and
  the existing section/typography tokens.
- `static-landing/*.js` — only if a figure needs tab interactivity (mirror `galleries.js`
  pattern). Default: pure CSS/SVG, no new JS.
- `public/media/ghostline-8b-*.png` — the embedded 8B screenshot (Collin provides).

## Success criteria

1. Research path contains: Prophecy (centerpiece) + Phase transition + 8B cross-scale + Methods,
   in the specified order, between Evidence and "See it".
2. Every number is traceable to a findings doc or `docs/internal/CANONICAL_CLAIMS.md` (main repo).
3. No overclaims: no "scaling law," no "r≈1.000 as a result"; grouped-CV and the leakage
   correction are stated; edge-case weakness shown.
4. Visual consistency with existing sections (reuses tokens/components); renders correctly at
   desktop and mobile widths.
5. Deploys unchanged through the existing Pages workflow (static-landing → dist root).
6. No regression to the industry path or shared sections.
