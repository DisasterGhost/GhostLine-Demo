# Landing Page Redesign — Design Spec
## GhostLine Credibility Surface
### March 27, 2026

---

## Purpose

This page is the first thing a grant reviewer, accelerator program, or potential collaborator sees. It must communicate "serious research instrument with commercial potential" — not "developer demo project." It replaces the current blog-rhythm landing page with a clean, progressive-disclosure structure modeled on frontier lab product pages (Anthropic, Stripe, Linear, Apple).

**Context:** Rejected by Google Startups (explicitly over the website). The page needs to pass the 5-second test: "Can I understand what this is? Is it real? Is this person serious?"

---

## Structure

**Sticky nav bar** appears on scroll past hero. Anchors to sections below. Tabs: Overview | Instrument | Evidence | Applications | Architecture | About

All sections are scroll targets (not tab-swapped content). Visitor can scroll linearly or jump via nav.

---

### 1. Hero (above the fold, breathing room)

```
[kicker]  Geometric Hierarchies Organizing State Transitions:
          Linear Insights in Neural Execution

[title]   GHOSTLINE

[line]    Real-time behavioral monitoring for transformer inference.

[screenshot — ghostline-full-surface.png, large, dominant]

[proof strip — horizontal, monospace, understated]
  95.3% state accuracy  |  F1 0.977 fabrication  |  4 architectures  |  Patent Pending

[CTA buttons]
  [Open Demo]  [Contact]
```

**Design notes:**
- Hero takes 80-90vh. Screenshot is the dominant visual element.
- "Patent Pending" replaces "927 signals" in the proof strip — more meaningful to reviewers.
- "4 architectures" replaces "100% collapse detection" — signals generality, not a single metric.
- No paragraphs. No explanation. The backronym does the work.
- Kicker in IBM Plex Mono, small, uppercase. Title in Instrument Serif, large.

---

### 2. Instrument (screenshot gallery)

```
[section label]  The instrument
[heading]        One sentence about what GhostLine shows you.

[4-tab gallery, auto-rotating]
  Viewer        — ghostline-full-surface.png    + 1-line caption
  Spectrograph  — ghostline-spectrograph.png    + 1-line caption
  Signals       — ghostline-signal-explorer.png + 1-line caption
  Token Health  — ghostline-token-health.png    + 1-line caption
```

**Design notes:**
- Fixed-height gallery frame (400px). `object-fit: contain`. No page jumping on rotation.
- Captions are single sentences, not paragraphs.
- No workflow steps (See/Read/Revisit/Test) — the tabs replace those.

---

### 3. Evidence (validation gallery)

```
[section label]  What holds up
[heading]        One sentence framing.

[3-tab gallery, auto-rotating]
  Hypothesis testing  — ghostline-hypothesis-test.png  + 1-line caption
  Run comparison      — ghostline-run-comparison.png   + 1-line caption
  Parameter sweep     — ghostline-sweep-config.png     + 1-line caption

[2-3 lines of honest framing]
  Where it's sharp: state separation, fabrication detection, collapse intervention.
  Where it's maturing: 70B+ scale, parameter space coverage, adversarial corpus.
```

**Design notes:**
- The honest "where it's maturing" line is deliberate. Emergent Ventures specifically rewards intellectual honesty. It also preempts reviewer skepticism.
- No validation copy cards (the current 3-card stack). Just the gallery + honest framing.

---

### 4. Applications (2 sentences each)

```
[section label]  Applications
[heading]        One sentence about where this goes.

[4-item grid, icon + title + 2 sentences]

  Compliance & Audit
  EU AI Act Articles 9 and 12 require behavioral monitoring and logging
  for high-risk AI systems. GhostLine provides per-token behavioral state
  classification and audit trails — continuous monitoring, not post-hoc review.

  Inference Optimization
  Pre-generation prediction identifies prompts likely to hallucinate before
  any tokens are generated. Route, re-prompt, or gate chain-of-thought in
  ~15ms — before wasting compute on bad output.

  Defense & Security
  Geometric behavioral monitoring is independent of output content — an
  adversary can craft text that passes content filters but cannot easily
  control the geometry of the model's computation. Prompt injection screening
  at the activation level.

  Model Development
  Geometric profiling of training checkpoints shows whether fine-tuning
  actually improves behavioral separation. Prompt corpus certification
  establishes geometrically bounded quality rules per model.
```

**Design notes:**
- Clean 2x2 grid on desktop, 1-column on mobile.
- No icons needed if the layout is clean enough. Title + text is sufficient.
- These are the revenue signals reviewers need. Not a pitch — a signal.

---

### 5. Architecture (lineage graph)

```
[section label]  Under the hood
[heading]        How GhostLine is wired together.

[embedded iframe — live_app_briefing/what_the_app_is.html, 480px height]

[description]    Drag and zoom to explore. Hover nodes for details.

[3 link buttons]
  Briefing pack  |  Technical atlas  |  Full lineage hub
```

**Design notes:**
- This section is for technical reviewers who want to see architecture. Non-technical reviewers will scroll past it — that's fine.
- The iframe is interactive (vis.js graph). Dark background matches the page.

---

### 6. About (credibility, not bio)

```
[section label]  Behind the project
[heading]        Collin Civish

[credibility statement — 3-4 lines max]
  Solo inventor. No formal ML background. Built a real-time geometric
  monitoring system for transformer inference, validated it across
  4 architecture families at 2 parameter scales, and filed 3 US provisional
  patents — in 48 days. Seeking resources to take it from validated
  prototype to production.

[contact]
  collin@ghostline-research.org  |  GitHub

[featured recordings — 4 items from catalog]
  Title + one-line description each

[CTA]
  [Open Demo]  [Contact]
```

**Design notes:**
- No bio. No personal history. Just execution velocity and the ask.
- The "no formal ML background" line is intentional — it makes the 48-day timeline undeniable and raises the question "what would this person do with resources?"
- Featured recordings give the reviewer a path into the demo if they want to verify claims.

---

## What Gets Cut

From the current page:
- **Credibility cards section** (Instrument/Audience/Surface/Purpose) — restates the hero in 4 different ways
- **Workflow steps** (See/Read/Revisit/Test text blocks) — gallery tabs replace these
- **Validation copy cards** (3 paragraphs about "where footing is strongest") — replaced by 2-3 honest lines
- **Founder bio paragraph** — replaced by credibility statement
- **All multi-paragraph explanations** — nothing on this page needs more than 2 sentences

## What Gets Added

- **Sticky nav bar** with section anchors
- **"Patent Pending"** in proof strip
- **Applications section** with 4 market paths
- **Honest "where it's maturing"** framing in evidence section
- **Backronym** as hero kicker

## Tone

Every sentence should pass the test: "Would Anthropic put this on their website?"

If it sounds like a blog post, a pitch deck, or a developer README — rewrite it.

---

## Open Questions

1. Should the proof strip numbers be updated to reflect honest/audited values from Feb 22-23? (e.g., trajectory F1 was corrected from 99.8% to 94.5% GroupKFold)
2. Should the page mention the GHOSTLINE paper ("Geometry Is All You Need") or is that premature?
3. Custom domain ghostline-research.org is already configured — deploy directly or stage first?
