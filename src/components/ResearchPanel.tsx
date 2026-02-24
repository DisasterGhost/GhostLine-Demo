import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  ResearchStatus,
  ResearchResults,
  SignalPreset,
  PromptEntry,
  PromptLibrary,
  RunListEntry,
  RunConfig,
} from '../hooks/useResearchWorkbench.ts';
import { SignalSelector } from './SignalSelector';
import { configFromPreset, type SignalConfig } from '../data/signalCatalog';
import './ResearchPanel.css';

// ============================================================================
// Types
// ============================================================================

type TabId = 'manual' | 'library' | 'import';

interface ResearchPanelProps {
  isOpen: boolean;
  status: ResearchStatus;
  results: ResearchResults | null;
  presets: SignalPreset[];
  library: PromptLibrary | null;
  runHistory: RunListEntry[];
  onStartRun: (config: RunConfig) => void;
  onCancelRun: () => void;
  onDownload: (runId?: string) => void;
  onReset: () => void;
  onLoadLibrary: () => void;
  onLoadHistory: () => void;
  embedded?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

function parseManualPrompts(text: string): PromptEntry[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map((prompt, i) => ({
      prompt,
      prompt_id: `manual_${i}`,
    }));
}

// ============================================================================
// Component
// ============================================================================

export function ResearchPanel({
  isOpen,
  status,
  results,
  presets,
  library,
  runHistory,
  onStartRun,
  onCancelRun,
  onDownload,
  onReset,
  onLoadLibrary,
  onLoadHistory,
  embedded,
}: ResearchPanelProps) {
  // --- Prompt entry ---
  const [activeTab, setActiveTab] = useState<TabId>('manual');
  const [manualText, setManualText] = useState('');

  // --- Library selections ---
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  // --- Config ---
  const [signalConfig, setSignalConfig] = useState<SignalConfig>(() => configFromPreset('standard'));
  const [runsPerPrompt, setRunsPerPrompt] = useState(3);
  const [maxTokens, setMaxTokens] = useState(100);
  const [temperature, setTemperature] = useState(0.8);
  const [topP, setTopP] = useState(1.0);
  const [minP, setMinP] = useState(0.0);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0.0);
  const [presencePenalty, setPresencePenalty] = useState(0.0);
  const [seed, setSeed] = useState<number | null>(null);
  const [mirostatMode, setMirostatMode] = useState(0);
  const [mirostatTau, setMirostatTau] = useState(5.0);
  const [mirostatEta, setMirostatEta] = useState(0.1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // --- History ---
  const [showHistory, setShowHistory] = useState(false);

  // Load library when switching to library tab
  useEffect(() => {
    if (activeTab === 'library' && !library) {
      onLoadLibrary();
    }
  }, [activeTab, library, onLoadLibrary]);

  // Load history when toggled
  useEffect(() => {
    if (showHistory) onLoadHistory();
  }, [showHistory, onLoadHistory]);

  // --- Derived prompts ---
  const manualPrompts = useMemo(() => parseManualPrompts(manualText), [manualText]);

  const libraryPrompts = useMemo((): PromptEntry[] => {
    if (!library) return [];
    const entries: PromptEntry[] = [];

    for (const [state, prompts] of Object.entries(library.prompts)) {
      if (!selectedStates.has(state)) continue;
      for (const p of prompts) {
        if (selectedCategories.size > 0 && !selectedCategories.has(`${state}/${p.category}`)) continue;
        entries.push({
          prompt: p.prompt,
          label: state,
          category: p.category,
          prompt_id: p.id,
        });
      }
    }

    return entries;
  }, [library, selectedStates, selectedCategories]);

  const activePrompts = activeTab === 'manual' ? manualPrompts : libraryPrompts;

  // --- Memory estimate ---
  const totalSamples = activePrompts.length * runsPerPrompt;
  const selectedPreset = signalConfig.preset ? presets.find(p => p.id === signalConfig.preset) : null;
  const perSampleMb = selectedPreset ? selectedPreset.memory_per_sample_mb : 0;
  const totalMemoryMb = perSampleMb * totalSamples;

  // --- Actions ---
  const handleStart = useCallback(() => {
    if (activePrompts.length === 0) return;

    const config: RunConfig = {
      prompts: activePrompts,
      runs_per_prompt: runsPerPrompt,
      signal_preset: signalConfig.preset ?? 'standard',
      max_tokens: maxTokens,
      temperature,
      top_p: topP,
      min_p: minP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
      seed,
      mirostat_mode: mirostatMode,
      mirostat_tau: mirostatTau,
      mirostat_eta: mirostatEta,
    };

    // If custom (no preset), send granular signal_config
    if (!signalConfig.preset) {
      config.signal_config = {
        signals: signalConfig.signals,
        aggregations: signalConfig.aggregations,
        window_size: signalConfig.windowSize,
        capture_all_layers: signalConfig.captureAllLayers,
        capture_layers: signalConfig.captureLayers,
      };
    }

    onStartRun(config);
  }, [activePrompts, runsPerPrompt, signalConfig, maxTokens, temperature, topP, minP, frequencyPenalty, presencePenalty, seed, mirostatMode, mirostatTau, mirostatEta, onStartRun]);

  // --- Library helpers ---
  const toggleState = useCallback((state: string) => {
    setSelectedStates(prev => {
      const next = new Set(prev);
      if (next.has(state)) {
        next.delete(state);
        // Remove all categories for this state
        setSelectedCategories(prevCats => {
          const nextCats = new Set(prevCats);
          for (const c of prevCats) {
            if (c.startsWith(`${state}/`)) nextCats.delete(c);
          }
          return nextCats;
        });
      } else {
        next.add(state);
      }
      return next;
    });
  }, []);

  const toggleCategory = useCallback((state: string, category: string) => {
    const key = `${state}/${category}`;
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // --- File import ---
  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        // Try JSON first
        const data = JSON.parse(text);
        if (data.prompts) {
          // behavioral_prompts.json format: flatten to text
          const lines: string[] = [];
          for (const prompts of Object.values(data.prompts) as Array<Array<{ prompt: string }>>) {
            for (const p of prompts) {
              lines.push(p.prompt);
            }
          }
          setManualText(lines.join('\n'));
        } else if (Array.isArray(data)) {
          setManualText(data.map((p: string | { prompt: string }) =>
            typeof p === 'string' ? p : p.prompt
          ).join('\n'));
        }
      } catch {
        // Plain text, one prompt per line
        setManualText(text);
      }
      setActiveTab('manual');
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  }, []);

  const isRunning = status.state === 'running';
  const isFinished = status.state === 'completed' || status.state === 'cancelled' || status.state === 'failed';

  if (!isOpen) return null;

  const content = (
      <div className="research-content">
        {/* ================================================================
            PROMPT ENTRY (tabs: Manual | Library | Import)
            ================================================================ */}
        <div className="research-tabs">
          <button
            className={`research-tab ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
            disabled={isRunning}
          >Manual</button>
          <button
            className={`research-tab ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
            disabled={isRunning}
          >Library</button>
          <label className={`research-tab ${activeTab === 'import' ? 'active' : ''}`}>
            Import
            <input
              type="file"
              accept=".json,.txt,.csv"
              onChange={handleFileImport}
              style={{ display: 'none' }}
              disabled={isRunning}
            />
          </label>
        </div>

        {/* Manual tab */}
        {activeTab === 'manual' && (
          <div className="research-section">
            <textarea
              className="research-prompt-input"
              placeholder="One prompt per line..."
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              disabled={isRunning}
              rows={5}
            />
            <div className="research-prompt-count">
              {manualPrompts.length} prompt{manualPrompts.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {/* Library tab */}
        {activeTab === 'library' && (
          <div className="research-section research-library">
            {!library ? (
              <div className="research-empty">Loading prompt library...</div>
            ) : (
              <div className="research-library-tree">
                {Object.entries(library.prompts).map(([state, prompts]) => {
                  const categories = [...new Set(prompts.map(p => p.category))];
                  const stateSelected = selectedStates.has(state);
                  const statePromptCount = stateSelected
                    ? (selectedCategories.size > 0
                      ? prompts.filter(p => selectedCategories.has(`${state}/${p.category}`)).length
                      : prompts.length)
                    : 0;

                  return (
                    <div key={state} className="research-lib-state">
                      <label className="research-lib-state-label">
                        <input
                          type="checkbox"
                          checked={stateSelected}
                          onChange={() => toggleState(state)}
                          disabled={isRunning}
                        />
                        <span className={`research-state-name state-${state}`}>
                          {state}
                        </span>
                        <span className="research-lib-count">
                          {stateSelected ? statePromptCount : prompts.length}
                        </span>
                      </label>
                      {stateSelected && categories.length > 1 && (
                        <div className="research-lib-categories">
                          {categories.map(cat => {
                            const key = `${state}/${cat}`;
                            const catCount = prompts.filter(p => p.category === cat).length;
                            const catSelected = selectedCategories.size === 0 || selectedCategories.has(key);

                            return (
                              <label key={key} className="research-lib-cat-label">
                                <input
                                  type="checkbox"
                                  checked={catSelected}
                                  onChange={() => toggleCategory(state, cat)}
                                  disabled={isRunning}
                                />
                                <span>{cat}</span>
                                <span className="research-lib-count">{catCount}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="research-prompt-count">
              {libraryPrompts.length} prompt{libraryPrompts.length !== 1 ? 's' : ''} selected
            </div>
          </div>
        )}

        {/* ================================================================
            SIGNAL CAPTURE (granular selector)
            ================================================================ */}
        <div className="research-section">
          <label className="research-label">Signal Capture</label>
          <SignalSelector
            value={signalConfig}
            onChange={setSignalConfig}
            disabled={isRunning}
          />
        </div>

        {/* ================================================================
            RUN CONFIG
            ================================================================ */}
        <div className="research-section">
          <div className="research-config-row">
            <div className="research-field">
              <label>Runs/prompt</label>
              <input
                type="number"
                min={1}
                max={10}
                value={runsPerPrompt}
                onChange={(e) => setRunsPerPrompt(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                disabled={isRunning}
              />
            </div>
            <div className="research-field">
              <label>Max tokens</label>
              <input
                type="number"
                min={10}
                max={500}
                value={maxTokens}
                onChange={(e) => setMaxTokens(Math.max(10, Math.min(500, parseInt(e.target.value) || 100)))}
                disabled={isRunning}
              />
            </div>
          </div>

          <div className="research-summary-line">
            {totalSamples > 0 && (
              <>
                {activePrompts.length} prompts x {runsPerPrompt} runs = <strong>{totalSamples} samples</strong>
                {totalMemoryMb > 0 && (
                  <> &middot; ~{totalMemoryMb >= 1024
                    ? `${(totalMemoryMb / 1024).toFixed(1)} GB`
                    : `${Math.round(totalMemoryMb)} MB`
                  }</>
                )}
              </>
            )}
          </div>

          {/* Advanced (temperature/top_p) */}
          <button
            className="research-advanced-toggle"
            onClick={() => setShowAdvanced(v => !v)}
          >
            {showAdvanced ? 'Hide' : 'Show'} advanced
          </button>

          {showAdvanced && (
            <div className="research-advanced">
              <div className="research-config-row">
                <div className="research-field">
                  <label>Temperature</label>
                  <input
                    type="number"
                    step={0.1}
                    min={0.0}
                    max={2.0}
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value) || 0.8)}
                    disabled={isRunning}
                  />
                </div>
                <div className="research-field">
                  <label>Top-p</label>
                  <input
                    type="number"
                    step={0.05}
                    min={0.0}
                    max={1.0}
                    value={topP}
                    onChange={(e) => setTopP(parseFloat(e.target.value) || 1.0)}
                    disabled={isRunning}
                  />
                </div>
              </div>
              <div className="research-config-row" style={{ marginTop: '6px' }}>
                <div className="research-field">
                  <label>Min-p</label>
                  <input
                    type="number"
                    step={0.01}
                    min={0.0}
                    max={0.5}
                    value={minP}
                    onChange={(e) => setMinP(parseFloat(e.target.value) || 0)}
                    disabled={isRunning}
                  />
                </div>
                <div className="research-field">
                  <label>Freq penalty</label>
                  <input
                    type="number"
                    step={0.1}
                    min={0.0}
                    max={2.0}
                    value={frequencyPenalty}
                    onChange={(e) => setFrequencyPenalty(parseFloat(e.target.value) || 0)}
                    disabled={isRunning}
                  />
                </div>
                <div className="research-field">
                  <label>Pres penalty</label>
                  <input
                    type="number"
                    step={0.1}
                    min={0.0}
                    max={2.0}
                    value={presencePenalty}
                    onChange={(e) => setPresencePenalty(parseFloat(e.target.value) || 0)}
                    disabled={isRunning}
                  />
                </div>
              </div>
              <div className="research-config-row" style={{ marginTop: '6px' }}>
                <div className="research-field">
                  <label>Seed</label>
                  <input
                    type="number"
                    min={0}
                    value={seed ?? ''}
                    placeholder="random"
                    onChange={(e) => setSeed(e.target.value === '' ? null : parseInt(e.target.value))}
                    disabled={isRunning}
                  />
                </div>
                <div className="research-field">
                  <label>Mirostat</label>
                  <select
                    value={mirostatMode}
                    onChange={(e) => setMirostatMode(parseInt(e.target.value))}
                    disabled={isRunning}
                    style={{ width: '100%', padding: '5px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'rgba(255,255,255,0.9)', fontSize: '12px' }}
                  >
                    <option value={0}>Off</option>
                    <option value={2}>v2</option>
                  </select>
                </div>
              </div>
              {mirostatMode === 2 && (
                <div className="research-config-row" style={{ marginTop: '6px' }}>
                  <div className="research-field">
                    <label>Tau (target)</label>
                    <input
                      type="number"
                      step={0.5}
                      min={1.0}
                      max={10.0}
                      value={mirostatTau}
                      onChange={(e) => setMirostatTau(parseFloat(e.target.value) || 5.0)}
                      disabled={isRunning}
                    />
                  </div>
                  <div className="research-field">
                    <label>Eta (rate)</label>
                    <input
                      type="number"
                      step={0.01}
                      min={0.01}
                      max={0.5}
                      value={mirostatEta}
                      onChange={(e) => setMirostatEta(parseFloat(e.target.value) || 0.1)}
                      disabled={isRunning}
                    />
                  </div>
                </div>
              )}
              {(temperature !== 0.8 || topP !== 1.0 || minP !== 0.0 || frequencyPenalty !== 0.0 || presencePenalty !== 0.0 || mirostatMode !== 0) && (
                <div className="research-warning">
                  Non-standard settings — thresholds may not apply
                </div>
              )}
            </div>
          )}
        </div>

        {/* ================================================================
            RUN CONTROL
            ================================================================ */}
        {isRunning && status.progress && (
          <div className="research-progress">
            <div className="research-progress-bar">
              <div
                className="research-progress-fill"
                style={{ width: `${(status.progress.current_sample / status.progress.total_samples) * 100}%` }}
              />
            </div>
            <div className="research-progress-text">
              Prompt {status.progress.current_prompt}/{status.progress.total_prompts},
              Run {status.progress.current_run}/{status.progress.total_runs}
            </div>
            <div className="research-progress-time">
              {formatTime(status.progress.elapsed_s)} elapsed
              {status.progress.eta_s > 0 && <> &middot; ~{formatTime(status.progress.eta_s)} remaining</>}
            </div>
          </div>
        )}

        {isRunning ? (
          <button className="research-cancel-btn" onClick={onCancelRun}>
            Cancel Run
          </button>
        ) : isFinished ? (
          <div className="research-finished">
            <div className={`research-finished-status state-${status.state}`}>
              {status.state === 'completed' ? 'Completed' : status.state === 'cancelled' ? 'Cancelled' : 'Failed'}
              {status.error && <span className="research-error"> — {status.error}</span>}
            </div>

            {/* Results summary */}
            {results?.summary && (
              <div className="research-results">
                <div className="research-results-grid">
                  <div><strong>{results.summary.total_samples}</strong> samples</div>
                  <div><strong>{results.summary.total_tokens}</strong> tokens</div>
                  <div><strong>{formatTime(results.summary.total_time_s)}</strong></div>
                  <div><strong>{results.summary.samples_per_second.toFixed(1)}</strong>/sec</div>
                </div>
                {Object.keys(results.summary.by_label).length > 0 && (
                  <div className="research-results-labels">
                    {Object.entries(results.summary.by_label).map(([label, info]) => (
                      <div key={label} className="research-result-label">
                        <span className={`state-${label}`}>{label}</span>: {info.count} ({info.total_size_mb.toFixed(1)} MB)
                      </div>
                    ))}
                  </div>
                )}
                {results.summary.errors.length > 0 && (
                  <div className="research-results-errors">
                    {results.summary.errors.length} error{results.summary.errors.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )}

            <div className="research-finished-actions">
              <button className="research-download-btn" onClick={() => onDownload()}>
                Download Corpus
              </button>
              <button className="research-new-btn" onClick={onReset}>
                New Run
              </button>
            </div>
          </div>
        ) : (
          <button
            className="research-start-btn"
            onClick={handleStart}
            disabled={activePrompts.length === 0}
          >
            Start Corpus Run ({totalSamples} samples)
          </button>
        )}

        {/* ================================================================
            RUN HISTORY
            ================================================================ */}
        <div className="research-history-section">
          <button
            className="research-history-toggle"
            onClick={() => setShowHistory(v => !v)}
          >
            {showHistory ? 'Hide' : 'Show'} run history
          </button>

          {showHistory && (
            <div className="research-history">
              {runHistory.length === 0 ? (
                <div className="research-empty">No previous runs</div>
              ) : (
                runHistory.map(run => (
                  <div key={run.run_id} className="research-history-item">
                    <div className="research-history-meta">
                      <span className={`research-history-state state-${run.state}`}>{run.state}</span>
                      <span className="research-history-id">{run.run_id}</span>
                    </div>
                    <div className="research-history-detail">
                      {run.prompts_count}p x {run.total_samples / Math.max(run.prompts_count, 1)}r = {run.total_samples}
                      &middot; {run.signal_preset}
                    </div>
                    {run.state === 'completed' && (
                      <button
                        className="research-history-download"
                        onClick={() => onDownload(run.run_id)}
                      >DL</button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
  );

  // Embedded mode: render content only
  if (embedded) return content;

  return (
    <div className="research-panel">
      <div className="research-header">
        <h3>Research Workbench</h3>
        {isRunning && <span className="research-running-badge">Running</span>}
      </div>
      {content}
    </div>
  );
}
