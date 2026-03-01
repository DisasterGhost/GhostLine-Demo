/**
 * useResearchWorkbench — React hook for research corpus generation API.
 *
 * Polls /api/research/status while a run is active.
 * Loads signal presets on mount.
 * Provides startRun, cancelRun, downloadResults actions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE, IS_DEMO_VIEWER } from '../config.ts';

// ============================================================================
// Types
// ============================================================================

export interface SignalPreset {
  id: string;
  name: string;
  description: string;
  signals: string;
  memory_per_sample_mb: number;
}

export interface PromptEntry {
  prompt: string;
  label?: string;
  category?: string;
  prompt_id?: string;
}

export interface ResearchProgress {
  current_prompt: number;
  total_prompts: number;
  current_run: number;
  total_runs: number;
  current_sample: number;
  total_samples: number;
  elapsed_s: number;
  eta_s: number;
}

export type ResearchState = 'idle' | 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';

export interface ResearchStatus {
  state: ResearchState;
  run_id: string | null;
  progress: ResearchProgress | null;
  error: string | null;
}

export interface RunSummary {
  total_samples: number;
  total_tokens: number;
  total_time_s: number;
  samples_per_second: number;
  by_label: Record<string, { count: number; tokens: number; total_size_mb: number }>;
  errors: Array<{ prompt_id: string; run_idx: number; error: string }>;
}

export interface ResearchResults {
  run_id: string;
  state: string;
  config: Record<string, unknown>;
  summary: RunSummary | null;
  started_at: string;
  completed_at: string;
}

export interface RunListEntry {
  run_id: string;
  state: string;
  prompts_count: number;
  signal_preset: string;
  total_samples: number;
  current_sample: number;
  started_at: string;
  completed_at: string;
}

export interface RunConfig {
  prompts: PromptEntry[];
  runs_per_prompt: number;
  signal_preset: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  min_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  seed?: number | null;
  mirostat_mode?: number;
  mirostat_tau?: number;
  mirostat_eta?: number;
  /** Granular signal config (overrides signal_preset when provided) */
  signal_config?: {
    signals: Record<string, boolean>;
    aggregations: string[];
    window_size?: number;
    capture_all_layers: boolean;
    capture_layers: number[];
  };
}

// ============================================================================
// Prompt Library Types
// ============================================================================

export interface LibraryPrompt {
  id: string;
  category: string;
  prompt: string;
  difficulty?: string;
}

export interface PromptLibrary {
  metadata: {
    version: string;
    states: string[];
    [key: string]: unknown;
  };
  prompts: Record<string, LibraryPrompt[]>;
}

// ============================================================================
// Hook
// ============================================================================

const IDLE_STATUS: ResearchStatus = {
  state: 'idle',
  run_id: null,
  progress: null,
  error: null,
};

const POLL_INTERVAL_MS = 2000;

export function useResearchWorkbench() {
  const [status, setStatus] = useState<ResearchStatus>(IDLE_STATUS);
  const [results, setResults] = useState<ResearchResults | null>(null);
  const [presets, setPresets] = useState<SignalPreset[]>([]);
  const [library, setLibrary] = useState<PromptLibrary | null>(null);
  const [runHistory, setRunHistory] = useState<RunListEntry[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load presets on mount (skip in demo viewer — no backend)
  useEffect(() => {
    if (IS_DEMO_VIEWER) return;
    fetch(`${API_BASE}/api/research/presets`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setPresets(data);
      })
      .catch(() => { /* server may not be up yet */ });
  }, []);

  // Load prompt library
  const loadLibrary = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/research/prompts`);
      const data = await r.json();
      if (data.prompts) setLibrary(data as PromptLibrary);
    } catch { /* ignore */ }
  }, []);

  // Load run history
  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/research/runs`);
      const data = await r.json();
      if (data.runs) setRunHistory(data.runs);
    } catch { /* ignore */ }
  }, []);

  // Poll status when running
  useEffect(() => {
    if (status.state !== 'running' || !status.run_id) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    const runId = status.run_id;

    const poll = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/research/status/${runId}`);
        const data = await r.json();

        if (data.error) return;

        const newState = data.state as ResearchState;

        setStatus({
          state: newState,
          run_id: runId,
          progress: data.progress ?? null,
          error: data.error ?? null,
        });

        // If finished, load results and history
        if (newState !== 'running' && newState !== 'pending') {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }

          const resR = await fetch(`${API_BASE}/api/research/results/${runId}`);
          const resData = await resR.json();
          if (!resData.error) setResults(resData as ResearchResults);
          loadHistory();
        }
      } catch { /* network error, keep polling */ }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [status.state, status.run_id, loadHistory]);

  // Start a run
  const startRun = useCallback(async (config: RunConfig) => {
    try {
      const r = await fetch(`${API_BASE}/api/research/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await r.json();

      if (data.error) {
        setStatus({ state: 'failed', run_id: null, progress: null, error: Array.isArray(data.error) ? data.error.join(', ') : data.error });
        return;
      }

      setResults(null);
      setStatus({
        state: 'running',
        run_id: data.run_id,
        progress: {
          current_prompt: 0,
          total_prompts: config.prompts.length,
          current_run: 0,
          total_runs: config.runs_per_prompt,
          current_sample: 0,
          total_samples: data.total_samples,
          elapsed_s: 0,
          eta_s: 0,
        },
        error: null,
      });
    } catch (e) {
      setStatus({ state: 'failed', run_id: null, progress: null, error: String(e) });
    }
  }, []);

  // Cancel a run
  const cancelRun = useCallback(async () => {
    if (!status.run_id) return;
    try {
      await fetch(`${API_BASE}/api/research/cancel/${status.run_id}`, { method: 'POST' });
    } catch { /* ignore */ }
  }, [status.run_id]);

  // Download results
  const downloadResults = useCallback(async (runId?: string) => {
    const id = runId ?? status.run_id;
    if (!id) return;
    window.open(`${API_BASE}/api/research/download/${id}`, '_blank');
  }, [status.run_id]);

  // Reset to idle
  const resetStatus = useCallback(() => {
    setStatus(IDLE_STATUS);
    setResults(null);
  }, []);

  // Load research history (persisted runs from compare/sweep/hypothesis)
  const loadResearchHistory = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/research/history`);
      const data = await r.json();
      return (data.runs ?? []) as Array<{ run_id: string; type: string; summary: string; created_at: string }>;
    } catch { return []; }
  }, []);

  // Load a specific research result
  const loadResearchRun = useCallback(async (runId: string) => {
    try {
      const r = await fetch(`${API_BASE}/api/research/load/${runId}`);
      return r.json();
    } catch { return null; }
  }, []);

  // A/B Compare
  const runCompare = useCallback(async (a: Record<string, unknown>, b: Record<string, unknown>, maxTokens = 100) => {
    const r = await fetch(`${API_BASE}/api/research/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a, b, max_tokens: maxTokens }),
    });
    return r.json();
  }, []);

  // Parameter Sweep
  const runSweep = useCallback(async (config: {
    prompt: string;
    sweep_param: string;
    sweep_values: number[];
    runs_per_value: number;
    base_config: Record<string, unknown>;
  }) => {
    const r = await fetch(`${API_BASE}/api/research/sweep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return r.json();
  }, []);

  // Hypothesis Test (supports compound rules)
  const runHypothesis = useCallback(async (config: {
    rules: Array<{ signal: string; op: string; threshold: number }>;
    logic: string;
    expected: Record<string, unknown>;
    prompts: string[];
    runs_per_prompt: number;
    config: Record<string, unknown>;
  }) => {
    // Send compound format; backend handles both `rule` (legacy) and `rules` (new)
    const r = await fetch(`${API_BASE}/api/research/hypothesis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return r.json();
  }, []);

  return {
    status,
    results,
    presets,
    library,
    runHistory,
    isRunning: status.state === 'running',
    startRun,
    cancelRun,
    downloadResults,
    resetStatus,
    loadLibrary,
    loadHistory,
    runCompare,
    runSweep,
    runHypothesis,
    loadResearchHistory,
    loadResearchRun,
  };
}
