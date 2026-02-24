/**
 * SweepPanel — Parameter grid search with result visualization.
 */

import { useState, useCallback } from 'react';
import { MiniChart, type ChartSeries } from './MiniChart';
import { ResearchHistory } from './ResearchHistory';
import { buildAnalysisSignalGroups } from '../data/signalCatalog';
import './SweepPanel.css';

// ============================================================================
// Types
// ============================================================================

interface SweepPanelProps {
  isOpen: boolean;
  onRunSweep: (config: {
    prompt: string;
    sweep_param: string;
    sweep_values: number[];
    runs_per_value: number;
    base_config: Record<string, unknown>;
  }) => Promise<unknown>;
  loadHistory?: () => Promise<Array<{ run_id: string; type: string; summary: string; created_at: string }>>;
  loadRun?: (runId: string) => Promise<unknown>;
  embedded?: boolean;
}

interface SweepRunResult {
  run_idx: number;
  token_count: number;
  mean_eff_dim: number;
  mean_velocity: number;
  mean_halluc_risk: number;
  mean_token_prob: number;
  text: string;
}

interface SweepValueResult {
  value: number;
  runs: SweepRunResult[];
  mean_eff_dim: number;
  std_eff_dim: number;
  mean_velocity: number;
  std_velocity: number;
  mean_halluc_risk: number;
  std_halluc_risk: number;
  mean_token_prob: number;
}

interface SweepResult {
  prompt: string;
  sweep_param: string;
  results: SweepValueResult[];
}

const SWEEP_PARAMS = [
  { value: 'temperature', label: 'Temperature' },
  { value: 'min_p', label: 'Min P' },
  { value: 'frequency_penalty', label: 'Freq Penalty' },
  { value: 'presence_penalty', label: 'Pres Penalty' },
  { value: 'mirostat_tau', label: 'Mirostat Tau' },
];

const SWEEP_SIGNAL_GROUPS = buildAnalysisSignalGroups();

/** Built-in metrics the backend always computes (backward compat) */
const BUILTIN_METRICS: { key: string; label: string; color: string }[] = [
  { key: 'mean_eff_dim',       label: 'Eff Dim',     color: '#00cccc' },
  { key: 'mean_velocity',      label: 'Velocity',    color: '#ffcc33' },
  { key: 'mean_halluc_risk',   label: 'Halluc Risk', color: '#ff3366' },
  { key: 'mean_token_prob',    label: 'Token Prob',   color: '#00ff66' },
];

/** All metric options: built-in + catalog signals with mean_ prefix */
const METRIC_OPTIONS: { key: string; label: string; color: string; group?: string }[] = [
  ...BUILTIN_METRICS,
  ...SWEEP_SIGNAL_GROUPS.flatMap(g => g.signals.map(s => ({
    key: `mean_${s.value}`,
    label: s.label,
    color: '#6699cc',
    group: g.label,
  }))),
];

// ============================================================================
// Component
// ============================================================================

export function SweepPanel({ isOpen, onRunSweep, loadHistory, loadRun, embedded }: SweepPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [sweepParam, setSweepParam] = useState('temperature');
  const [valuesText, setValuesText] = useState('0.0, 0.3, 0.5, 0.8, 1.0');
  const [runsPerValue, setRunsPerValue] = useState(3);
  const [seed, setSeed] = useState('42');
  const [maxTokens, setMaxTokens] = useState(100);
  const [selectedMetric, setSelectedMetric] = useState<string>('mean_eff_dim');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SweepResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseValues = useCallback((): number[] => {
    return valuesText.split(',')
      .map(s => parseFloat(s.trim()))
      .filter(v => !isNaN(v));
  }, [valuesText]);

  const handleRun = useCallback(async () => {
    const values = parseValues();
    if (!prompt.trim() || values.length === 0) return;

    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const data = await onRunSweep({
        prompt,
        sweep_param: sweepParam,
        sweep_values: values,
        runs_per_value: runsPerValue,
        base_config: {
          max_tokens: maxTokens,
          seed: seed ? parseInt(seed) : null,
        },
      }) as SweepResult;

      if ((data as unknown as Record<string, unknown>).error) {
        setError(String((data as unknown as Record<string, unknown>).error));
      } else {
        setResult(data);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setIsRunning(false);
    }
  }, [prompt, sweepParam, parseValues, runsPerValue, maxTokens, seed, onRunSweep]);

  // Build chart data
  const metric = METRIC_OPTIONS.find(m => m.key === selectedMetric) ?? BUILTIN_METRICS[0];
  const chartSeries: ChartSeries[] = [];
  const xLabels: string[] = [];
  const stdKey = selectedMetric.replace('mean_', 'std_');

  if (result) {
    xLabels.push(...result.results.map(r => String(r.value)));
    chartSeries.push({
      label: metric.label,
      data: result.results.map(r => (r as unknown as Record<string, number>)[selectedMetric] ?? 0),
      color: metric.color,
    });
    // Show std as a second series (mean + std) if available
    const stdData = result.results.map(r => (r as unknown as Record<string, number>)[stdKey] ?? 0);
    if (stdData.some(v => v > 0)) {
      chartSeries.push({
        label: `+1\u03C3`,
        data: result.results.map((r, i) => ((r as unknown as Record<string, number>)[selectedMetric] ?? 0) + stdData[i]),
        color: metric.color,
        dashed: true,
      });
    }
  }

  const totalRuns = parseValues().length * runsPerValue;
  const chartWidth = embedded ? 370 : 308;

  if (!isOpen) return null;

  const content = (
    <div className="sw-content">
      {loadHistory && loadRun && (
        <ResearchHistory
          filterType="sweep"
          loadHistory={loadHistory}
          loadRun={loadRun}
          onLoad={(data) => setResult(data as SweepResult)}
        />
      )}

      {/* Prompt */}
      <div className="sw-section">
        <label className="sw-label">Prompt</label>
        <textarea
          className="sw-textarea"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Single prompt to sweep..."
          disabled={isRunning}
          rows={3}
        />
      </div>

      {/* Sweep config */}
      <div className="sw-section">
        <div className="sw-config-row">
          <div className="sw-field">
            <label>Sweep</label>
            <select value={sweepParam} onChange={e => setSweepParam(e.target.value)} disabled={isRunning}
              style={{ width: '100%', padding: '5px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'rgba(255,255,255,0.9)', fontSize: '12px' }}>
              {SWEEP_PARAMS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="sw-field">
            <label>Runs/value</label>
            <input type="number" min={1} max={10} value={runsPerValue}
              onChange={e => setRunsPerValue(parseInt(e.target.value) || 3)} disabled={isRunning} />
          </div>
        </div>
        <div className="sw-field" style={{ marginTop: '6px' }}>
          <label>Values (comma-separated)</label>
          <input type="text" value={valuesText}
            onChange={e => setValuesText(e.target.value)} disabled={isRunning}
            style={{ width: '100%', padding: '5px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'rgba(255,255,255,0.9)', fontSize: '12px' }} />
        </div>
        <div className="sw-config-row" style={{ marginTop: '6px' }}>
          <div className="sw-field">
            <label>Seed</label>
            <input type="text" value={seed} placeholder="random"
              onChange={e => setSeed(e.target.value)} disabled={isRunning} />
          </div>
          <div className="sw-field">
            <label>Max tokens</label>
            <input type="number" min={10} max={300} value={maxTokens}
              onChange={e => setMaxTokens(parseInt(e.target.value) || 100)} disabled={isRunning} />
          </div>
        </div>
      </div>

      <div className="sw-summary">
        {parseValues().length} values x {runsPerValue} runs = <strong>{totalRuns} total runs</strong>
      </div>

      <button className="sw-run-btn" onClick={handleRun}
        disabled={isRunning || !prompt.trim() || parseValues().length === 0}>
        {isRunning ? 'Sweeping...' : `Run Sweep (${totalRuns} runs)`}
      </button>

      {error && <div className="sw-error">{error}</div>}

      {/* Results */}
      {result && (
        <div className="sw-results">
          <div className="sw-metric-select">
            <label>Metric:</label>
            <select value={selectedMetric} onChange={e => setSelectedMetric(e.target.value)}>
              <optgroup label="Built-in">
                {BUILTIN_METRICS.map(m => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </optgroup>
              {SWEEP_SIGNAL_GROUPS.map(g => (
                <optgroup key={g.label} label={g.label}>
                  {g.signals.map(s => (
                    <option key={`mean_${s.value}`} value={`mean_${s.value}`}>{s.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <MiniChart
            series={chartSeries}
            xLabels={xLabels}
            width={chartWidth}
            height={180}
            title={`${metric.label} vs ${SWEEP_PARAMS.find(p => p.value === result.sweep_param)?.label}`}
            xLabel={result.sweep_param}
            yLabel={metric.label}
            grid
            legend={chartSeries.length > 1}
          />

          {/* Data table */}
          <div className="sw-data-table">
            <table>
              <thead>
                <tr>
                  <th>Value</th>
                  <th>EffDim</th>
                  <th>Velocity</th>
                  <th>Halluc</th>
                  <th>Prob</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((r, i) => (
                  <tr key={i}>
                    <td>{r.value}</td>
                    <td>{r.mean_eff_dim.toFixed(1)}</td>
                    <td>{r.mean_velocity.toFixed(2)}</td>
                    <td>{(r.mean_halluc_risk * 100).toFixed(1)}%</td>
                    <td>{r.mean_token_prob.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // Embedded mode: render content only
  if (embedded) return content;

  return (
    <div className="sweep-panel">
      <div className="sw-header">
        <h3>Parameter Sweep</h3>
      </div>
      {content}
    </div>
  );
}
