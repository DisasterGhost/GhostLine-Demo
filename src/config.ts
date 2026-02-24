/**
 * GhostLine Frontend Configuration
 *
 * URL resolution priority:
 *   1. ?pod=PODID[&port=PORT] query param → RunPod proxy URLs
 *   2. VITE_API_URL / VITE_WS_URL env vars (baked at build time)
 *   3. localhost:8765 (local dev)
 *
 * Usage: https://disasterghost.github.io/GhostLine/?pod=abc123def
 *   → API: https://abc123def-8765.proxy.runpod.net
 *   → WS:  wss://abc123def-8765.proxy.runpod.net/ws
 *
 * With custom port: ?pod=abc123def&port=8888
 */

function resolveUrls(): { api: string; ws: string } {
  const params = new URLSearchParams(window.location.search);
  const podId = params.get('pod');

  if (podId) {
    const port = params.get('port') || '8765';
    const base = `${podId}-${port}.proxy.runpod.net`;
    return {
      api: `https://${base}`,
      ws: `wss://${base}/ws`,
    };
  }

  return {
    api: import.meta.env.VITE_API_URL || 'http://localhost:8765',
    ws: import.meta.env.VITE_WS_URL || 'ws://localhost:8765/ws',
  };
}

const urls = resolveUrls();

// API base URL (HTTP endpoints)
export const API_BASE = urls.api;

// WebSocket URL
export const WS_URL = urls.ws;

// WebSocket for generation (same base, different path)
export const WS_GENERATE_URL = `${urls.ws}/generate`;

// Derived URLs for specific endpoints
export const API_ENDPOINTS = {
  health: `${API_BASE}/health`,
  domains: `${API_BASE}/api/domains`,
  setDomain: `${API_BASE}/api/set_domain`,
  layers: `${API_BASE}/api/layers`,
  setLayers: `${API_BASE}/api/set_layers`,
  interventions: `${API_BASE}/api/interventions`,
  // Research workbench
  researchRun: `${API_BASE}/api/research/run`,
  researchPresets: `${API_BASE}/api/research/presets`,
  researchPrompts: `${API_BASE}/api/research/prompts`,
  researchRuns: `${API_BASE}/api/research/runs`,
} as const;
