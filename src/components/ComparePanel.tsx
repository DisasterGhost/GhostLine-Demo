/**
 * ComparePanel — A/B prompt comparison with side-by-side signal visualization.
 * Supports comparing ANY parameter, not just prompts.
 */

import { useState, useCallback } from 'react';
import { MiniChart, type ChartSeries } from './MiniChart';
import { ResearchHistory } from './ResearchHistory';
import { buildAnalysisSignalGroups } from '../data/signalCatalog';
import './ComparePanel.css';

// ============================================================================
// Types
// ============================================================================

interface ComparePanelProps {
  isOpen: boolean;
  onRunCompare: (a: Record<string, unknown>, b: Record<string, unknown>, maxTokens?: number) => Promise<unknown>;
  loadHistory?: () => Promise<Array<{ run_id: string; type: string; summary: string; created_at: string }>>;
  loadRun?: (runId: string) => Promise<unknown>;
  embedded?: boolean;
}

interface TokenData {
  position: number;
  token_str: string;
  activation_eff_dim?: number;
  projected_velocity?: number;
  halluc_risk?: number;
  token_prob?: number;
  dt_state?: string;
}

interface CompareResult {
  a: { tokens: TokenData[]; token_count: number; prompt: string };
  b: { tokens: TokenData[]; token_count: number; prompt: string };
  a_prophecy?: { predicted_state: string; confidence: number; halluc_risk?: number };
  b_prophecy?: { predicted_state: string; confidence: number; halluc_risk?: number };
}

const COMPARE_SIGNAL_GROUPS = buildAnalysisSignalGroups();

/** Flat list for backward compatibility (label lookups) */
const ALL_COMPARE_SIGNALS = COMPARE_SIGNAL_GROUPS.flatMap(g => g.signals);

// ============================================================================
// Component
// ============================================================================

export function ComparePanel({ isOpen, onRunCompare, loadHistory, loadRun, embedded }: ComparePanelProps) {
  const [promptA, setPromptA] = useState('');
  const [promptB, setPromptB] = useState('');
  const [samePrompt, setSamePrompt] = useState(false);

  // Side A params
  const [tempA, setTempA] = useState(0.8);
  const [seedA, setSeedA] = useState<string>('42');
  const [topPa, setTopPa] = useState(1.0);
  const [minPa, setMinPa] = useState(0.0);
  const [freqPenA, setFreqPenA] = useState(0.0);
  const [presPenA, setPresPenA] = useState(0.0);
  const [miroModeA, setMiroModeA] = useState(0);
  const [miroTauA, setMiroTauA] = useState(5.0);
  const [miroEtaA, setMiroEtaA] = useState(0.1);

  // Side B params
  const [tempB, setTempB] = useState(0.8);
  const [seedB, setSeedB] = useState<string>('42');
  const [topPb, setTopPb] = useState(1.0);
  const [minPb, setMinPb] = useState(0.0);
  const [freqPenB, setFreqPenB] = useState(0.0);
  const [presPenB, setPresPenB] = useState(0.0);
  const [miroModeB, setMiroModeB] = useState(0);
  const [miroTauB, setMiroTauB] = useState(5.0);
  const [miroEtaB, setMiroEtaB] = useState(0.1);

  const [showParamsA, setShowParamsA] = useState(false);
  const [showParamsB, setShowParamsB] = useState(false);

  const [maxTokens, setMaxTokens] = useState(100);
  const [selectedSignal, setSelectedSignal] = useState<string>('activation_eff_dim');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = useCallback(async () => {
    const effectivePromptB = samePrompt ? promptA : promptB;
    if (!promptA.trim() || !effectivePromptB.trim()) return;
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const data = await onRunCompare(
        {
          prompt: promptA, temperature: tempA, seed: seedA ? parseInt(seedA) : null,
          top_p: topPa, min_p: minPa, frequency_penalty: freqPenA, presence_penalty: presPenA,
          mirostat_mode: miroModeA, mirostat_tau: miroTauA, mirostat_eta: miroEtaA,
        },
        {
          prompt: effectivePromptB, temperature: tempB, seed: seedB ? parseInt(seedB) : null,
          top_p: topPb, min_p: minPb, frequency_penalty: freqPenB, presence_penalty: presPenB,
          mirostat_mode: miroModeB, mirostat_tau: miroTauB, mirostat_eta: miroEtaB,
        },
        maxTokens,
      ) as CompareResult;

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
  }, [promptA, promptB, samePrompt, tempA, tempB, seedA, seedB, topPa, topPb, minPa, minPb, freqPenA, freqPenB, presPenA, presPenB, miroModeA, miroModeB, miroTauA, miroTauB, miroEtaA, miroEtaB, maxTokens, onRunCompare]);

  // Build chart series from results
  const chartSeries: ChartSeries[] = [];
  if (result) {
    const extractSignal = (tokens: TokenData[], key: string) =>
      tokens.map(t => ((t as unknown as Record<string, number>)[key]) ?? NaN);

    chartSeries.push({
      label: 'A',
      data: extractSignal(result.a.tokens, selectedSignal),
      color: '#00cccc',
    });
    chartSeries.push({
      label: 'B',
      data: extractSignal(result.b.tokens, selectedSignal),
      color: '#cc33cc',
      dashed: true,
    });
  }

  const maxLen = result ? Math.max(result.a.token_count, result.b.token_count) : 0;
  const xLabels = result ? Array.from({ length: maxLen }, (_, i) => String(i)) : [];

  // Compute summary stats
  const summaryA = result ? computeSummary(result.a.tokens) : null;
  const summaryB = result ? computeSummary(result.b.tokens) : null;

  if (!isOpen) return null;

  const chartWidth = embedded ? 370 : 308;
  const effectivePromptB = samePrompt ? promptA : promptB;

  // Helper for compact param inputs
  const paramInput = (label: string, value: number, onChange: (v: number) => void, step: number, min: number, max: number) => (
    <div className="cp-param-mini">
      <label>{label}</label>
      <input type="number" step={step} min={min} max={max} value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)} disabled={isRunning} />
    </div>
  );

  // Highlight winner in summary
  const winner = (a: number, b: number, lower_is_better = false) => {
    if (lower_is_better) return a < b ? 'cp-winner' : a > b ? 'cp-loser' : '';
    return a > b ? 'cp-winner' : a < b ? 'cp-loser' : '';
  };

  const content = (
    <div className="cp-content">
      {loadHistory && loadRun && (
        <ResearchHistory
          filterType="compare"
          loadHistory={loadHistory}
          loadRun={loadRun}
          onLoad={(data) => setResult(data as CompareResult)}
        />
      )}

      {/* Same prompt toggle */}
      <label className="cp-same-prompt">
        <input type="checkbox" checked={samePrompt} onChange={e => setSamePrompt(e.target.checked)} disabled={isRunning} />
        <span>Same prompt for both (compare parameters only)</span>
      </label>

      {/* Prompt inputs side by side */}
      <div className="cp-prompts">
        <div className="cp-prompt-col">
          <label className="cp-label" style={{ color: '#00cccc' }}>Prompt A</label>
          <textarea
            className="cp-textarea"
            value={promptA}
            onChange={e => setPromptA(e.target.value)}
            placeholder="Enter prompt A..."
            disabled={isRunning}
            rows={3}
          />
          <div className="cp-param-row">
            <div className="cp-param">
              <label>Temp</label>
              <input type="number" step={0.1} min={0} max={2} value={tempA}
                onChange={e => setTempA(parseFloat(e.target.value) || 0.8)} disabled={isRunning} />
            </div>
            <div className="cp-param">
              <label>Seed</label>
              <input type="text" value={seedA} placeholder="random"
                onChange={e => setSeedA(e.target.value)} disabled={isRunning} />
            </div>
          </div>
          <button className="cp-params-toggle" onClick={() => setShowParamsA(v => !v)}>
            {showParamsA ? 'Hide' : 'More'} params
          </button>
          {showParamsA && (
            <div className="cp-params-grid">
              {paramInput('top_p', topPa, setTopPa, 0.05, 0, 1)}
              {paramInput('min_p', minPa, setMinPa, 0.01, 0, 0.5)}
              {paramInput('freq_pen', freqPenA, setFreqPenA, 0.1, 0, 2)}
              {paramInput('pres_pen', presPenA, setPresPenA, 0.1, 0, 2)}
              <div className="cp-param-mini">
                <label>mirostat</label>
                <select value={miroModeA} onChange={e => setMiroModeA(parseInt(e.target.value))} disabled={isRunning}>
                  <option value={0}>Off</option>
                  <option value={2}>v2</option>
                </select>
              </div>
              {miroModeA === 2 && (
                <>
                  {paramInput('tau', miroTauA, setMiroTauA, 0.5, 1, 10)}
                  {paramInput('eta', miroEtaA, setMiroEtaA, 0.01, 0.01, 0.5)}
                </>
              )}
            </div>
          )}
        </div>
        <div className="cp-prompt-col">
          <label className="cp-label" style={{ color: '#cc33cc' }}>Prompt B</label>
          {samePrompt ? (
            <div className="cp-same-indicator">Using Prompt A</div>
          ) : (
            <textarea
              className="cp-textarea"
              value={promptB}
              onChange={e => setPromptB(e.target.value)}
              placeholder="Enter prompt B..."
              disabled={isRunning}
              rows={3}
            />
          )}
          <div className="cp-param-row">
            <div className="cp-param">
              <label>Temp</label>
              <input type="number" step={0.1} min={0} max={2} value={tempB}
                onChange={e => setTempB(parseFloat(e.target.value) || 0.8)} disabled={isRunning} />
            </div>
            <div className="cp-param">
              <label>Seed</label>
              <input type="text" value={seedB} placeholder="random"
                onChange={e => setSeedB(e.target.value)} disabled={isRunning} />
            </div>
          </div>
          <button className="cp-params-toggle" onClick={() => setShowParamsB(v => !v)}>
            {showParamsB ? 'Hide' : 'More'} params
          </button>
          {showParamsB && (
            <div className="cp-params-grid">
              {paramInput('top_p', topPb, setTopPb, 0.05, 0, 1)}
              {paramInput('min_p', minPb, setMinPb, 0.01, 0, 0.5)}
              {paramInput('freq_pen', freqPenB, setFreqPenB, 0.1, 0, 2)}
              {paramInput('pres_pen', presPenB, setPresPenB, 0.1, 0, 2)}
              <div className="cp-param-mini">
                <label>mirostat</label>
                <select value={miroModeB} onChange={e => setMiroModeB(parseInt(e.target.value))} disabled={isRunning}>
                  <option value={0}>Off</option>
                  <option value={2}>v2</option>
                </select>
              </div>
              {miroModeB === 2 && (
                <>
                  {paramInput('tau', miroTauB, setMiroTauB, 0.5, 1, 10)}
                  {paramInput('eta', miroEtaB, setMiroEtaB, 0.01, 0.01, 0.5)}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="cp-config-row">
        <div className="cp-param">
          <label>Max tokens</label>
          <input type="number" min={10} max={300} value={maxTokens}
            onChange={e => setMaxTokens(parseInt(e.target.value) || 100)} disabled={isRunning} />
        </div>
        <button className="cp-run-btn" onClick={handleRun}
          disabled={isRunning || !promptA.trim() || (!samePrompt && !effectivePromptB.trim())}>
          {isRunning ? 'Running...' : 'Run Both'}
        </button>
      </div>

      {error && <div className="cp-error">{error}</div>}

      {/* Results */}
      {result && (
        <div className="cp-results">
          {/* Prophecy comparison */}
          <div className="cp-prophecies">
            <div className="cp-prophecy cp-a">
              <span className={`state-${result.a_prophecy?.predicted_state || 'unknown'}`}>
                {result.a_prophecy?.predicted_state || '?'}
              </span>
              <span className="cp-conf">{((result.a_prophecy?.confidence ?? 0) * 100).toFixed(0)}%</span>
              {result.a_prophecy?.halluc_risk !== undefined && (
                <span className="cp-halluc">H: {(result.a_prophecy.halluc_risk * 100).toFixed(0)}%</span>
              )}
            </div>
            <div className="cp-prophecy cp-b">
              <span className={`state-${result.b_prophecy?.predicted_state || 'unknown'}`}>
                {result.b_prophecy?.predicted_state || '?'}
              </span>
              <span className="cp-conf">{((result.b_prophecy?.confidence ?? 0) * 100).toFixed(0)}%</span>
              {result.b_prophecy?.halluc_risk !== undefined && (
                <span className="cp-halluc">H: {(result.b_prophecy.halluc_risk * 100).toFixed(0)}%</span>
              )}
            </div>
          </div>

          {/* Summary stats with diff highlighting */}
          {summaryA && summaryB && (
            <div className="cp-summary">
              <div className="cp-summary-row">
                <span style={{ color: '#00cccc' }}>{summaryA.tokens} tok</span>
                <span className="cp-summary-label">Tokens</span>
                <span style={{ color: '#cc33cc' }}>{summaryB.tokens} tok</span>
              </div>
              <div className="cp-summary-row">
                <span className={winner(summaryA.meanEffDim, summaryB.meanEffDim)} style={{ color: '#00cccc' }}>{summaryA.meanEffDim.toFixed(1)}</span>
                <span className="cp-summary-label">Mean EffDim</span>
                <span className={winner(summaryB.meanEffDim, summaryA.meanEffDim)} style={{ color: '#cc33cc' }}>{summaryB.meanEffDim.toFixed(1)}</span>
              </div>
              <div className="cp-summary-row">
                <span className={winner(summaryA.meanHalluc, summaryB.meanHalluc, true)} style={{ color: '#00cccc' }}>{(summaryA.meanHalluc * 100).toFixed(1)}%</span>
                <span className="cp-summary-label">Mean Halluc</span>
                <span className={winner(summaryB.meanHalluc, summaryA.meanHalluc, true)} style={{ color: '#cc33cc' }}>{(summaryB.meanHalluc * 100).toFixed(1)}%</span>
              </div>
            </div>
          )}

          {/* Signal selector */}
          <div className="cp-signal-select">
            <label>Signal:</label>
            <select value={selectedSignal} onChange={e => setSelectedSignal(e.target.value)}>
              {COMPARE_SIGNAL_GROUPS.map(group => (
                <optgroup key={group.label} label={group.label}>
                  {group.signals.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Comparison chart */}
          <MiniChart
            series={chartSeries}
            xLabels={xLabels}
            width={chartWidth}
            height={180}
            title={`${ALL_COMPARE_SIGNALS.find(s => s.value === selectedSignal)?.label ?? selectedSignal} — A vs B`}
            xLabel="token"
            grid
            legend
          />

          {/* Generated text */}
          <div className="cp-texts">
            <div className="cp-text cp-a">
              <label>A output:</label>
              <div className="cp-text-content">
                {result.a.tokens.map(t => t.token_str).join('')}
              </div>
            </div>
            <div className="cp-text cp-b">
              <label>B output:</label>
              <div className="cp-text-content">
                {result.b.tokens.map(t => t.token_str).join('')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Embedded mode: render content only
  if (embedded) return content;

  return (
    <div className="compare-panel">
      <div className="cp-header">
        <h3>A/B Compare</h3>
      </div>
      {content}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function computeSummary(tokens: TokenData[]) {
  const effDims = tokens.map(t => t.activation_eff_dim).filter((v): v is number => v != null);
  const hallucs = tokens.map(t => t.halluc_risk).filter((v): v is number => v != null);
  return {
    tokens: tokens.length,
    meanEffDim: effDims.length > 0 ? effDims.reduce((a, b) => a + b, 0) / effDims.length : 0,
    meanHalluc: hallucs.length > 0 ? hallucs.reduce((a, b) => a + b, 0) / hallucs.length : 0,
  };
}
