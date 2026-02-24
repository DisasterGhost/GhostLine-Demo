/**
 * GhostLine Demo Viewer Configuration
 *
 * Offline mode — no backend server required.
 * All data comes from pre-recorded .ghostline files in public/recordings/.
 */

// No server URLs — this is a static viewer
export const API_BASE = '';
export const WS_URL = '';
export const WS_GENERATE_URL = '';

export const API_ENDPOINTS = {
  health: '',
  domains: '',
  setDomain: '',
  layers: '',
  setLayers: '',
  interventions: '',
  researchRun: '',
  researchPresets: '',
  researchPrompts: '',
  researchRuns: '',
} as const;

// Demo viewer mode flag
export const IS_DEMO_VIEWER = true;
