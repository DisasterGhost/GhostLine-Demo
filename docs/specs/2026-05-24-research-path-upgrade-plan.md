# Research-Path Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four sections to the research path of the GhostLine landing page — a Prophecy centerpiece, a Phase-transition section, an 8B cross-scale section, and a Methods/falsifiability section — using purpose-built CSS/SVG figures with audited numbers.

**Architecture:** Pure static HTML + CSS edits to `static-landing/index.html` and `static-landing/landing.css`. New sections are inserted inside `<div id="path-research">`, immediately before the existing "See it" section, in order. They reuse existing components (`.section`, `.evidence-grid`, `.honest-split`, `.mech-grid`, `.gallery`) and add only two new component styles (`.prophecy-flow`, `.token-timeline`) plus a small `.scale-figure`. No build step, no React, no new JS.

**Tech Stack:** Hand-written HTML5 + CSS3 (CSS custom properties already defined in `landing.css :root`). Deployed verbatim to GitHub Pages by `.github/workflows/deploy.yml` (`cp static-landing/index.html dist/index.html`).

---

## Conventions (read once before starting)

- **Repo / cwd:** `C:\GhostLine\worktrees\ghostline-consulting-site` (branch `codex/consulting-offer-site`). All paths below are relative to this repo unless absolute.
- **No test framework.** "Verification" = (a) structural checks the agent can run (grep for the new markup/selectors; confirm `<section>` open/close balance), and (b) a human eyeball checkpoint in the final task. Collin opens `file:///C:/GhostLine/worktrees/ghostline-consulting-site/static-landing/index.html#path=research` in a browser.
- **Insertion technique:** every new section is inserted by matching the *opening of the existing "See it" section* and prepending the new section before it. Because all four tasks use the same anchor and run in order (Prophecy → Phase → 8B → Methods), the final order is correct: each new section lands just above "See it", pushing the previous new one up.
  - **Anchor string (identical for Tasks 2–5):**
    ```html
      <section class="section">
        <div class="section__label">See it</div>
    ```
  - This anchor is unique within `#path-research` (the industry path's "See it" has a different label/section). Confirm uniqueness with grep before each insert.
- **State colors (already in `:root`):** `--c-reasoning` #4dd9ff (cyan), `--c-retrieval` #5cf2a8 (green), `--c-creativity` #b466ff (purple), `--c-precision` #ffd24d (yellow), `--c-uncertainty` #ff9c52 (orange).
- **Honesty rules (from the spec — non-negotiable):** numbers must match exactly; no "scaling law"; the 3.3× figure is NOT used as a clean scale effect; the prompt↔first-token r≈1.0 is explicitly framed as not-a-result; the prophecy example and bar values are *illustrative schematics of the mechanism* (not a specific logged run) — keep them plausible, and a real logged sample may replace them later.

---

## Task 1: Add new component CSS

**Files:**
- Modify: `static-landing/landing.css` (append new block after the states-legend block, which ends at line 760, before the `/* ─── Industry — applications ─── */` comment at line 761; and modify the 900px media-query grid-collapse line at 1543).

- [ ] **Step 1: Append the new component styles**

Insert this block immediately before the line `/* ─── Industry — applications ────────────────────────────── */` in `landing.css`:

```css
/* ─── Prophecy — research path ───────────────────────────── */
.prophecy-flow {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line-strong);
  margin-bottom: 48px;
}
.prophecy-step {
  background: var(--bg-1);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.prophecy-step__label {
  font-family: var(--f-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-faint);
}
.prophecy-step__prompt {
  font-family: var(--f-display);
  font-size: 19px;
  line-height: 1.4;
  color: var(--ink);
}
.state-bars { display: flex; flex-direction: column; gap: 8px; }
.state-bar {
  display: grid;
  grid-template-columns: 84px 1fr 40px;
  align-items: center;
  gap: 10px;
  font-family: var(--f-mono);
  font-size: 11px;
  color: var(--ink-dim);
}
.state-bar span { letter-spacing: 0.04em; }
.state-bar i {
  display: block;
  height: 6px;
  background: var(--c);
  box-shadow: 0 0 8px var(--c);
  border-radius: 3px;
}
.state-bar b { font-weight: 500; color: var(--ink); text-align: right; }
.prophecy-tokens {
  font-family: var(--f-mono);
  font-size: 14px;
  line-height: 1.9;
}
.prophecy-tokens span { color: var(--c); }

/* ─── Phase transition — research path ───────────────────── */
.token-timeline {
  border: 1px solid var(--line-strong);
  background: var(--bg-1);
  padding: 28px;
}
.token-timeline__track {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.tok {
  font-family: var(--f-mono);
  font-size: 14px;
  color: var(--c);
  padding: 4px 8px;
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  background: var(--bg-2);
}
.token-timeline__flip {
  font-family: var(--f-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-faint);
  padding: 0 8px;
}
.token-timeline__axis {
  display: flex;
  justify-content: space-between;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  font-family: var(--f-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

/* ─── 8B scale figure — research path ────────────────────── */
.scale-figure {
  border: 1px solid var(--line-strong);
  background: var(--bg-1);
  margin-bottom: 48px;
}
.scale-figure img { width: 100%; }
.scale-figure--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  font-family: var(--f-mono);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-faint);
}
.scale-figure__cap {
  padding: 14px 20px;
  border-top: 1px solid var(--line);
  font-family: var(--f-mono);
  font-size: 11px;
  color: var(--ink-dim);
}
```

- [ ] **Step 2: Add `.prophecy-flow` to the mobile grid-collapse rule**

In the `@media (max-width: 900px)` block (line ~1543), change:

```css
  .evidence-grid, .mech-grid, .app-grid, .latency-strip, .states-legend, .honest-split, .demo-cta, .about {
    grid-template-columns: 1fr;
  }
```

to add `.prophecy-flow`:

```css
  .evidence-grid, .mech-grid, .app-grid, .latency-strip, .states-legend, .honest-split, .demo-cta, .about, .prophecy-flow {
    grid-template-columns: 1fr;
  }
```

- [ ] **Step 3: Verify the selectors exist**

Run: `grep -nE "\.prophecy-flow|\.state-bar|\.token-timeline|\.scale-figure|\.tok " static-landing/landing.css`
Expected: all five families present; `.prophecy-flow` appears twice (definition + media query).

- [ ] **Step 4: Commit**

```bash
git add static-landing/landing.css
git commit -m "landing(research): add prophecy/timeline/scale-figure component CSS"
```

---

## Task 2: Prophecy section (centerpiece)

**Files:**
- Modify: `static-landing/index.html` (insert before the "See it" anchor inside `#path-research`).

- [ ] **Step 1: Confirm the anchor is unique**

Run: `grep -n "<div class=\"section__label\">See it</div>" static-landing/index.html`
Expected: two matches (one in research path ~L306, one in industry path). Use the FIRST (research) — verify it sits below `#path-research` (line 165) and above `#path-industry` (line 324).

- [ ] **Step 2: Insert the Prophecy section before the research "See it"**

Match this exact block (the research path's "See it" opening):
```html
      <section class="section">
        <div class="section__label">See it</div>
```
Replace it with the Prophecy section followed by the same anchor:
```html
      <section class="section">
        <div class="section__label">Prophecy</div>
        <h2 class="section__title">The model's mind is made up before it speaks.</h2>
        <p class="section__intro">
          A transformer's geometric cognitive state is largely set during prompt encoding — before it generates a single token. A classifier reading only the prompt-encoding geometry predicts the state the generation settles into, with held-out accuracy that matches the generation-time classifier.
        </p>

        <div class="prophecy-flow">
          <div class="prophecy-step">
            <div class="prophecy-step__label">01 · Prompt</div>
            <p class="prophecy-step__prompt">"What's the capital of the country whose flag has a maple leaf?"</p>
          </div>
          <div class="prophecy-step">
            <div class="prophecy-step__label">02 · Predicted — before token 1</div>
            <div class="state-bars">
              <div class="state-bar" style="--c: var(--c-reasoning);"><span>Reasoning</span><i style="width:71%"></i><b>.71</b></div>
              <div class="state-bar" style="--c: var(--c-retrieval);"><span>Retrieval</span><i style="width:18%"></i><b>.18</b></div>
              <div class="state-bar" style="--c: var(--c-uncertainty);"><span>Uncertainty</span><i style="width:7%"></i><b>.07</b></div>
              <div class="state-bar" style="--c: var(--c-precision);"><span>Precision</span><i style="width:3%"></i><b>.03</b></div>
              <div class="state-bar" style="--c: var(--c-creativity);"><span>Creativity</span><i style="width:1%"></i><b>.01</b></div>
            </div>
          </div>
          <div class="prophecy-step">
            <div class="prophecy-step__label">03 · Generated — colored by state</div>
            <p class="prophecy-tokens">
              <span style="--c: var(--c-reasoning);">The</span> <span style="--c: var(--c-reasoning);">flag</span> <span style="--c: var(--c-reasoning);">with</span> <span style="--c: var(--c-reasoning);">the</span> <span style="--c: var(--c-reasoning);">maple</span> <span style="--c: var(--c-reasoning);">leaf</span> <span style="--c: var(--c-reasoning);">is</span> <span style="--c: var(--c-retrieval);">Canada's</span><span style="--c: var(--c-reasoning);">,</span> <span style="--c: var(--c-reasoning);">so</span> <span style="--c: var(--c-reasoning);">the</span> <span style="--c: var(--c-reasoning);">capital</span> <span style="--c: var(--c-reasoning);">is</span> <span style="--c: var(--c-retrieval);">Ottawa</span><span style="--c: var(--c-reasoning);">.</span>
            </p>
          </div>
        </div>

        <div class="evidence-grid">
          <div class="evidence-cell evidence-cell--accent">
            <p class="evidence-cell__plain">Predict the geometric state from the prompt alone — before the model writes anything.</p>
            <div class="evidence-cell__ref">
              <span class="evidence-cell__metric">85–91<i>%</i></span>
              <span class="evidence-cell__label">prompt-only classifier · 8B · grouped (prompt-level) CV</span>
            </div>
          </div>
          <div class="evidence-cell">
            <p class="evidence-cell__plain">Holds at smaller scale too, on a held-out, leakage-controlled split.</p>
            <div class="evidence-cell__ref">
              <span class="evidence-cell__metric">85.0<i>%</i></span>
              <span class="evidence-cell__label">3B · prompt-level CV · per-prompt grouping</span>
            </div>
          </div>
        </div>

        <div class="honest-split">
          <div class="honest-col honest-col--sharp">
            <div class="honest-col__head">▰ Per-state accuracy (8B)</div>
            <ul class="honest-col__list">
              <li>Reasoning 95% · Creativity 94% · Collapse 93%</li>
              <li>Retrieval 89% · Precision 88%</li>
              <li>Uncertainty 78%</li>
              <li>Edge cases 56% — the weakest, and we say so</li>
            </ul>
          </div>
          <div class="honest-col honest-col--maturing">
            <div class="honest-col__head">▱ What this is not</div>
            <ul class="honest-col__list">
              <li>A prediction, not a guarantee — not a perfect oracle</li>
              <li>The prompt↔first-token "r≈1.0" is the same forward pass — we don't count it as a result</li>
              <li>An earlier 99.6% was prompt-identity leakage; grouped CV corrected it to 85% (−14.6 pts), caught in-house</li>
            </ul>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section__label">See it</div>
```

- [ ] **Step 3: Verify structure**

Run: `grep -c "<section" static-landing/index.html && grep -c "</section>" static-landing/index.html`
Expected: both counts increased by exactly 1 vs before this task, and remain equal to each other.
Run: `grep -n "section__label\">Prophecy<" static-landing/index.html`
Expected: one match, located between line of `#path-research` and `#path-industry`.

- [ ] **Step 4: Commit**

```bash
git add static-landing/index.html
git commit -m "landing(research): add Prophecy centerpiece section"
```

---

## Task 3: Phase-transition section

**Files:**
- Modify: `static-landing/index.html` (same anchor technique).

- [ ] **Step 1: Insert the Phase-transition section before the research "See it"**

Match:
```html
      <section class="section">
        <div class="section__label">See it</div>
```
Replace with:
```html
      <section class="section">
        <div class="section__label">In-flight</div>
        <h2 class="section__title">It catches the model changing its mind mid-sentence.</h2>
        <p class="section__intro">
          Cognitive state isn't fixed for a whole generation. Within a single response the model can shift regime — here, from open-ended reasoning into low-entropy precision — and the instrument resolves the switch token by token, live.
        </p>

        <div class="token-timeline">
          <div class="token-timeline__track">
            <span class="tok" style="--c: var(--c-reasoning);">so</span>
            <span class="tok" style="--c: var(--c-reasoning);">the</span>
            <span class="tok" style="--c: var(--c-reasoning);">value</span>
            <span class="tok" style="--c: var(--c-reasoning);">works</span>
            <span class="tok" style="--c: var(--c-reasoning);">out</span>
            <span class="tok" style="--c: var(--c-reasoning);">to</span>
            <span class="token-timeline__flip">▸ regime shift</span>
            <span class="tok" style="--c: var(--c-precision);">3</span>
            <span class="tok" style="--c: var(--c-precision);">.</span>
            <span class="tok" style="--c: var(--c-precision);">14159</span>
            <span class="tok" style="--c: var(--c-precision);">26535</span>
          </div>
          <div class="token-timeline__axis">
            <span>reasoning</span>
            <span>T≈143–149</span>
            <span>precision</span>
          </div>
        </div>

        <p class="section__intro" style="margin-top:32px; margin-bottom:0;">
          This is a live capture shown to illustrate in-flight resolution — not a benchmark. The claim is qualitative: the instrument registers the regime change as it happens, not after the fact.
        </p>
      </section>

      <section class="section">
        <div class="section__label">See it</div>
```

- [ ] **Step 2: Verify structure**

Run: `grep -c "<section" static-landing/index.html && grep -c "</section>" static-landing/index.html`
Expected: each +1 vs Task 2 end; counts equal.
Run: `grep -n "section__label\">In-flight<" static-landing/index.html`
Expected: one match, after Prophecy and before "See it".

- [ ] **Step 3: Commit**

```bash
git add static-landing/index.html
git commit -m "landing(research): add Phase-transition section"
```

---

## Task 4: 8B cross-scale section

**Files:**
- Modify: `static-landing/index.html` (same anchor technique).
- Asset (later, Collin-provided): `public/media/ghostline-8b-chicken.png`.

- [ ] **Step 1: Insert the 8B section before the research "See it" (with placeholder figure)**

Match:
```html
      <section class="section">
        <div class="section__label">See it</div>
```
Replace with:
```html
      <section class="section">
        <div class="section__label">At scale</div>
        <h2 class="section__title">Does it hold as models grow? At 8B — yes, and richer.</h2>
        <p class="section__intro">
          The geometry doesn't wash out at 8B parameters; it stays sharply separated, and a new discriminator family — MLP-based signals — emerges that is barely present at 3B. Whether separation grows as a clean function of scale is an open question, and an experiment is designed to answer it.
        </p>

        <figure class="scale-figure">
          <div class="scale-figure--placeholder">Qwen3-8B run — screenshot pending (drop into public/media/ghostline-8b-chicken.png)</div>
          <figcaption class="scale-figure__cap">A live Qwen3-8B generation: the state-colored trajectory plus the per-layer effective-dimension profile (L0→L31).</figcaption>
        </figure>

        <div class="evidence-grid">
          <div class="evidence-cell evidence-cell--accent">
            <p class="evidence-cell__plain">A new signal family appears at 8B that barely registers at 3B — large by Cohen's convention.</p>
            <div class="evidence-cell__ref">
              <span class="evidence-cell__metric">d ≈ 4.2<i>MLP emergence</i></span>
              <span class="evidence-cell__label">MLP discriminators · Qwen3-8B · near-absent at 3B</span>
            </div>
          </div>
          <div class="evidence-cell">
            <p class="evidence-cell__plain">The only clean, same-family scale comparison shows separation rising modestly with size.</p>
            <div class="evidence-cell__ref">
              <span class="evidence-cell__metric">~1.1–1.3×<i>1.5B→3B</i></span>
              <span class="evidence-cell__label">within-family Qwen2.5 · same pipeline · N=2 sizes, preliminary</span>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section__label">See it</div>
```

- [ ] **Step 2: Verify structure**

Run: `grep -c "<section" static-landing/index.html && grep -c "</section>" static-landing/index.html`
Expected: each +1 vs Task 3 end; counts equal.
Run: `grep -n "section__label\">At scale<" static-landing/index.html`
Expected: one match, after In-flight and before "See it".

- [ ] **Step 3: Commit**

```bash
git add static-landing/index.html
git commit -m "landing(research): add 8B cross-scale section (placeholder figure)"
```

- [ ] **Step 4 (deferred, when Collin provides the PNG): swap placeholder for the real image**

When `public/media/ghostline-8b-chicken.png` exists, replace the placeholder div:
```html
          <div class="scale-figure--placeholder">Qwen3-8B run — screenshot pending (drop into public/media/ghostline-8b-chicken.png)</div>
```
with:
```html
          <img alt="GhostLine running on Qwen3-8B — state-colored token cloud with per-layer effective-dimension readout" src="media/ghostline-8b-chicken.png">
```
Then commit: `git add static-landing/index.html public/media/ghostline-8b-chicken.png && git commit -m "landing(research): add real 8B screenshot"`

---

## Task 5: Methods & falsifiability section

**Files:**
- Modify: `static-landing/index.html` (same anchor technique).

- [ ] **Step 1: Insert the Methods section before the research "See it"**

Match:
```html
      <section class="section">
        <div class="section__label">See it</div>
```
Replace with:
```html
      <section class="section">
        <div class="section__label">Method</div>
        <h2 class="section__title">How we keep ourselves honest.</h2>
        <p class="section__intro">
          The point of an instrument is that you can check it. Every number on this page comes from held-out data under a locked protocol — and where we've fooled ourselves, we've said so and fixed it.
        </p>

        <div class="mech-grid">
          <article class="mech-card">
            <div class="mech-card__num">01 · PROTOCOL</div>
            <h3 class="mech-card__title">Locked, not tuned per result.</h3>
            <p class="mech-card__body">HuggingFace Transformers, temperature 0.8, top-p 1.0, multinomial sampling. Every threshold is calibrated at these settings, not re-tuned to flatter a number.</p>
          </article>
          <article class="mech-card">
            <div class="mech-card__num">02 · VALIDATION</div>
            <h3 class="mech-card__title">Grouped, held-out, no leakage.</h3>
            <p class="mech-card__body">Cross-validation groups by prompt — analogous to patient-level splits in medical ML — so a classifier can't memorize a prompt's identity. Reported numbers are held-out, not training accuracy.</p>
          </article>
          <article class="mech-card">
            <div class="mech-card__num">03 · SELF-CORRECTION</div>
            <h3 class="mech-card__title">We catch our own inflation.</h3>
            <p class="mech-card__body">A 99.6% prophecy number turned out to be prompt-identity leakage; grouped CV corrected it to 85% — and we kept the lower one. We also flag where rules don't transfer (a 3B collapse threshold is invalid at 8B).</p>
          </article>
        </div>
      </section>

      <section class="section">
        <div class="section__label">See it</div>
```

- [ ] **Step 2: Verify structure and final order**

Run: `grep -c "<section" static-landing/index.html && grep -c "</section>" static-landing/index.html`
Expected: each +1 vs Task 4 end; counts equal.
Run: `grep -nE "section__label\">(Mechanism|Evidence|Prophecy|In-flight|At scale|Method|See it)<" static-landing/index.html`
Expected order within `#path-research`: Mechanism → Evidence → Prophecy → In-flight → At scale → Method → See it.

- [ ] **Step 3: Commit**

```bash
git add static-landing/index.html
git commit -m "landing(research): add Methods & falsifiability section"
```

---

## Task 6: Regression check, responsive, and eyeball checkpoint

**Files:** none changed unless a fix is needed.

- [ ] **Step 1: Tag-balance and path-isolation check**

Run: `grep -c "<section" static-landing/index.html && grep -c "</section>" static-landing/index.html`
Expected: equal counts (no unclosed sections).
Run: `grep -n "data-path=\"industry\"" static-landing/index.html`
Expected: industry path markers intact (no new sections leaked into `#path-industry`).

- [ ] **Step 2: Human eyeball checkpoint (Collin)**

Open `file:///C:/GhostLine/worktrees/ghostline-consulting-site/static-landing/index.html#path=research` and confirm:
- All four new sections render in order, styled consistently with Mechanism/Evidence.
- Prophecy bars/colors and the colored token streams display correctly.
- The token-timeline chips wrap and the regime-shift marker reads clearly.
- Switch to `#path=industry`: no new sections appear there (no bleed).
- Resize browser below 900px: `.prophecy-flow` collapses to one column; nothing overflows.
- Browser console: no errors.

- [ ] **Step 3: Spec-coverage self-check**

Confirm against `docs/specs/2026-05-24-research-path-upgrade-design.md`: all four sections present and ordered (success criterion 1); numbers match the audited values (criterion 2); no "scaling law" / no "r≈1.0 as a result" / grouped-CV + leakage correction stated / edge-case weakness shown (criterion 3).

- [ ] **Step 4: Final commit (only if Step 2/3 surfaced fixes)**

```bash
git add static-landing/index.html static-landing/landing.css
git commit -m "landing(research): polish pass after eyeball review"
```

---

## Deferred / follow-up (NOT part of this plan — see spec)

- **State "personalities" (#2)** — revisit after this ships (Collin's call).
- **Port prophecy banner + DT readout into `ghostline-app-next`** — separate work; the shipped demo doesn't surface prophecy yet.
- **Real 8B screenshot** — Task 4 Step 4, when Collin exports the PNG to `public/media/`.
