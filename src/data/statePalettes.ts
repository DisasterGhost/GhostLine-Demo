// ============================================================================
// State Color Palettes — centralized, selectable
// ============================================================================
// All components import from here instead of defining their own STATE_COLORS.

export type StatePaletteId = 'classic' | 'refined';

export interface StatePalette {
  id: StatePaletteId;
  name: string;
  description: string;
  colors: Record<string, string>;
}

// The original GhostLine palette — vivid, saturated, warm uncertainty
const CLASSIC: StatePalette = {
  id: 'classic',
  name: 'Classic',
  description: 'Original vivid palette',
  colors: {
    creativity: '#cc33ff',    // Bright purple
    reasoning: '#33ccff',     // Cyan
    retrieval: '#33ff66',     // Green
    precision: '#ffcc00',     // Gold
    uncertainty: '#ff9900',   // Orange
    collapse: '#ff0000',      // Bright red
    unknown: '#888888',       // Gray
  },
};

// Refined palette — achromatic uncertainty, deeper hues, better depth separation
const REFINED: StatePalette = {
  id: 'refined',
  name: 'Refined',
  description: 'Depth-safe, achromatic uncertainty',
  colors: {
    creativity: '#9933CC',    // Royal purple
    reasoning: '#00CCCC',     // Robin's egg blue
    retrieval: '#33ff88',     // Emerald green
    precision: '#ffcc33',     // Warm gold
    uncertainty: '#ccccdd',   // Cool silver
    collapse: '#ff0000',      // Bright red
    unknown: '#888888',       // Gray
  },
};

export const STATE_PALETTES: Record<StatePaletteId, StatePalette> = {
  classic: CLASSIC,
  refined: REFINED,
};

export function getStatePaletteColors(id: StatePaletteId): Record<string, string> {
  return STATE_PALETTES[id]?.colors ?? CLASSIC.colors;
}

/** Read the active state palette from localStorage settings */
export function getActiveStatePalette(): Record<string, string> {
  try {
    const stored = localStorage.getItem('ghostline-settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      const id = parsed?.visual?.statePalette as StatePaletteId;
      if (id && STATE_PALETTES[id]) return STATE_PALETTES[id].colors;
    }
  } catch { /* fall through */ }
  return CLASSIC.colors;
}
