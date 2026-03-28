# GhostLine Demo Frontend Audit

**Auditor:** Trace
**Date:** February 24, 2026
**Version:** 2.0

---

## Executive Summary

The demo is impressive — production-quality 3D visualization, clean architecture, comprehensive feature set. However, there are several UI/UX issues that hurt the polish. This audit identifies specific problems and proposes fixes.

---

## Critical Issues

### 1. Entropy Always Reads High/Red (CALIBRATION BUG)

**Location:** `src/components/SignalsPanel.tsx`, lines 195-210

**Problem:** Entropy bar scales to max of 4.0, but the threshold colors are:
- Green: < 1.5
- Yellow: 1.5 - 1.95
- Red: > 1.95

Looking at the recording data, entropy values at 8B are typically 2.5-4.0+ for *healthy* generation (larger vocab = higher entropy). The thresholds were calibrated for 3B where entropy is lower.

**Fix:**
```tsx
// OLD (3B-calibrated)
backgroundColor: entropy > 1.95 ? '#ff3333' : entropy > 1.5 ? '#ff9900' : '#33ff66',
width: `${Math.min(100, (entropy / 4.0) * 100)}%`,

// NEW (8B-aware, or make dynamic based on model)
const entropyMax = 5.0;  // 8B has higher entropy
const entropyWarn = 3.0;
const entropyCrit = 3.5;
backgroundColor: entropy > entropyCrit ? '#ff3333' : entropy > entropyWarn ? '#ff9900' : '#33ff66',
width: `${Math.min(100, (entropy / entropyMax) * 100)}%`,
```

**Better fix:** Make thresholds configurable per-model or auto-calibrate from first N tokens.

---

### 2. Dropdown Text Invisible (HypothesisPanel)

**Location:** `src/components/HypothesisPanel.css`, `.hp-select`

**Problem:** The select elements have light text (`rgba(255, 255, 255, 0.9)`) but native `<option>` dropdowns render with browser default (white) backgrounds. Light text on light background = invisible.

**Fix:** Add option styling:
```css
.hp-select {
  /* ... existing ... */
}

.hp-select option {
  background: #0a0a14;
  color: #ffffff;
}
```

**Note:** This pattern already exists in App.css for `.token-selector select option` — just need to replicate it.

---

### 3. Redundant Signal Display (StatusDisplay + SignalsPanel)

**Location:** Both components show entropy, token probability, geometric state, etc.

**Problem:** Same information displayed in two places wastes screen real estate and creates visual noise.

**Current redundancy:**
- **StatusDisplay** shows: token text, confidence, entropy, position, projection conf, geometric state, velocity, drift, manifold breadth, loop stats
- **SignalsPanel** shows: state (SCL & DT), halluc risk, refusal prob, token info, state probs, entropy, token prob, act spread, layer dims

**Overlap:** entropy, token prob, geometric state, token info

**Proposed consolidation:**
- **StatusDisplay** → Focus on generation status, buffer, connection, model info, loop detection alerts
- **SignalsPanel** → All signal values (entropy, probs, states, etc.)

Remove from StatusDisplay:
- Token stats (entropy, confidence) — keep just token text
- Geometric state display — keep in SignalsPanel only
- Velocity indicator — keep in SignalsPanel only

---

### 4. Collapse/Intervention Alert UI

**Location:** `StatusDisplay.tsx` (loop detection), `SignalsPanel.tsx` (intervention indicator)

**Problem:** The collapse detection UI (🔴 LOOP DETECTED, 🟡 SEMANTIC STUTTER) is buried in the StatusDisplay. The intervention indicator in SignalsPanel is small and easy to miss.

**Proposed fix:** Create a dedicated alert banner that appears prominently when:
- Loop detected (LOCKED state)
- Intervention fires
- Hallucination risk > 80%

**Design:**
```tsx
// New component: AlertBanner.tsx
<div className="alert-banner alert-collapse">
  <span className="alert-icon">🔴</span>
  <span className="alert-text">GEOMETRIC COLLAPSE DETECTED</span>
  <span className="alert-metric">E1: {effDim.toFixed(2)}</span>
</div>

<div className="alert-banner alert-intervention">
  <span className="alert-icon">⚡</span>
  <span className="alert-text">INTERVENTION: {type}</span>
  <span className="alert-result">{outcome}</span>
</div>
```

---

## Medium Issues

### 5. Research Workbench General Polish

**Locations:** `HypothesisPanel.tsx`, `ComparePanel.tsx`, `SweepPanel.tsx`

**Issues:**
- Inconsistent padding/margins between panels
- Some labels too dim (`rgba(255, 255, 255, 0.3)`)
- Missing loading states on some async operations
- No empty state messaging for history panel

**Fixes:**
```css
/* Increase label visibility */
.hp-label, .compare-label, .sweep-label {
  color: rgba(255, 255, 255, 0.6);  /* was 0.3-0.4 */
}

/* Consistent section spacing */
.hp-section, .compare-section, .sweep-section {
  margin-bottom: 16px;  /* standardize */
}
```

---

### 6. Mobile Responsiveness Gaps

**Location:** Various components

**Issues:**
- SignalsPanel collapses on mobile but still takes space
- Research panels not optimized for mobile
- Touch targets too small on some buttons

**Fixes:**
- Use bottom sheet pattern consistently on mobile
- Increase touch target sizes to minimum 44px
- Hide research workbench entirely on small screens (it's not usable anyway)

---

### 7. Color Consistency

**Problem:** Some components use hardcoded colors instead of CSS variables.

**Examples:**
```tsx
// SignalsPanel.tsx - hardcoded
color: (token?.hallucinationRisk ?? 0) > 0.8 ? '#ff3333' : ...

// Should use:
color: var(--gl-danger)  // for critical
color: var(--gl-warning) // for warning
```

---

## Minor Issues

### 8. Footer Text
**Location:** App.tsx, line ~250
```tsx
<div className="prototype-footer">
  GhostLine Demo Viewer · Explore LLM Geometric Internals · v2.0
</div>
```
Consider updating version or making it dynamic.

### 9. Tutorial Only Shows Once
The tutorial uses localStorage to track if shown. No way to re-trigger it from settings.

### 10. Missing Loading Skeleton
When loading a recording, there's a brief flash. Add a skeleton loader.

### 11. Keyboard Shortcuts Not Documented
Playback controls have keyboard shortcuts but they're not visible to users.

---

## Proposed Priority Order

1. **Entropy calibration** — Currently misleading users
2. **Dropdown visibility** — Blocks functionality
3. **Alert banner** — High-impact UX improvement
4. **Signal consolidation** — Reduces clutter
5. **Color consistency** — Polish
6. **Research panel polish** — Secondary features
7. **Mobile fixes** — Lower priority
8. **Minor issues** — Nice-to-have

---

## Files to Modify

| File | Changes |
|------|---------|
| `SignalsPanel.tsx` | Entropy calibration, remove redundancy |
| `SignalsPanel.css` | Alert banner styles |
| `StatusDisplay.tsx` | Remove redundant signals, simplify |
| `HypothesisPanel.css` | Add option styling for dropdowns |
| `App.css` | Add alert banner styles, color variable usage |
| `AlertBanner.tsx` | New component (create) |

---

## Estimated Effort

- Critical issues: 2-3 hours
- Medium issues: 3-4 hours
- Minor issues: 1-2 hours
- **Total: ~8 hours for full polish pass**

---

## Notes

The demo is fundamentally solid. The issues are polish, not architecture. The 3D visualization, recording system, and signal infrastructure are all well-designed. These fixes will elevate it from "impressive prototype" to "production-ready demo."
