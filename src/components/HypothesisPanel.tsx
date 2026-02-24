/**
 * HypothesisPanel — Define and test geometric hypotheses against prompts.
 * Supports compound conditions (AND/OR), expanded signals, and preset templates.
 */

import { useState, useCallback } from 'react';
import { ResearchHistory } from './ResearchHistory';
import { buildAnalysisSignalGroups, AGGREGATION_METHODS } from '../data/signalCatalog';
import './HypothesisPanel.css';

// ============================================================================
// Types
// ============================================================================

interface HypothesisPanelProps {
  isOpen: boolean;
  onRunHypothesis: (config: {
    rules: Array<{ signal: string; op: string; threshold: number }>;
    logic: string;
    expected: Record<string, unknown>;
    prompts: string[];
    runs_per_prompt: number;
    config: Record<string, unknown>;
  }) => Promise<unknown>;
  loadHistory?: () => Promise<Array<{ run_id: string; type: string; summary: string; created_at: string }>>;
  loadRun?: (runId: string) => Promise<unknown>;
  embedded?: boolean;
}

interface RuleEntry {
  signal: string;
  op: string;
  threshold: number;
  aggregation?: string;  // e.g., 'first', 'last', 'mean' — appended as suffix
}

interface HypothesisResult {
  rule?: { signal: string; op: string; threshold: number };
  rules?: Array<{ signal: string; op: string; threshold: number }>;
  logic?: string;
  expected: Record<string, unknown>;
  total_samples: number;
  confusion_matrix: { tp: number; fp: number; tn: number; fn: number };
  pass_rate: number;
  precision: number;
  recall: number;
  f1: number;
  cohens_d: number;
  p_value: number;
}

// ============================================================================
// Signal definitions — from shared catalog
// ============================================================================

const SIGNAL_GROUPS = buildAnalysisSignalGroups();

const OPERATORS = ['>', '<', '>=', '<=', '=='];

const EXPECTED_TYPES = [
  { value: 'halluc_risk_above', label: 'Halluc risk above' },
  { value: 'halluc_risk_below', label: 'Halluc risk below' },
  { value: 'state', label: 'State equals' },
  { value: 'state_not', label: 'State NOT' },
  { value: 'dt_confidence_above', label: 'DT confidence above' },
  { value: 'signal_in_range', label: 'Signal in range' },
];

const STATES = ['reasoning', 'retrieval', 'creativity', 'precision', 'uncertainty'];

// ============================================================================
// Preset templates
// ============================================================================

interface Preset {
  label: string;
  rules: RuleEntry[];
  logic: string;
  expectedType: string;
  expectedValue: string;
  expectedValue2?: string;
}

const PRESETS: Preset[] = [
  { label: 'Collapse: E1 < 5.0', rules: [{ signal: 'activation_eff_dim', op: '<', threshold: 5.0 }], logic: 'AND', expectedType: 'state', expectedValue: 'collapse' },
  { label: 'Hallucination: risk > 0.5', rules: [{ signal: 'halluc_risk', op: '>', threshold: 0.5 }], logic: 'AND', expectedType: 'halluc_risk_above', expectedValue: '0.5' },
  { label: 'Reasoning: eff_dim > 40', rules: [{ signal: 'activation_eff_dim', op: '>', threshold: 40 }], logic: 'AND', expectedType: 'state', expectedValue: 'reasoning' },
];

// ============================================================================
// Component
// ============================================================================

export function HypothesisPanel({ isOpen, onRunHypothesis, loadHistory, loadRun, embedded }: HypothesisPanelProps) {
  // Rule builder (compound)
  const [rules, setRules] = useState<RuleEntry[]>([{ signal: 'activation_eff_dim', op: '>', threshold: 40 }]);
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');

  // Expected outcome
  const [expectedType, setExpectedType] = useState('halluc_risk_above');
  const [expectedValue, setExpectedValue] = useState('0.5');
  const [expectedValue2, setExpectedValue2] = useState('');

  // Prompts
  const [promptsText, setPromptsText] = useState('');

  // Config
  const [runsPerPrompt, setRunsPerPrompt] = useState(3);
  const [maxTokens, setMaxTokens] = useState(100);
  const [seed, setSeed] = useState('42');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [temperature, setTemperature] = useState(0.8);
  const [topP, setTopP] = useState(1.0);
  const [minP, setMinP] = useState(0.0);

  // State
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<HypothesisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prompts = promptsText.split('\n').map(s => s.trim()).filter(Boolean);

  // Rule management
  const addRule = useCallback(() => {
    setRules(prev => [...prev, { signal: 'activation_eff_dim', op: '>', threshold: 0 }]);
  }, []);

  const removeRule = useCallback((idx: number) => {
    setRules(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  }, []);

  const updateRule = useCallback((idx: number, field: keyof RuleEntry, value: string | number) => {
    setRules(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }, []);

  // Apply preset
  const applyPreset = useCallback((preset: Preset) => {
    setRules(preset.rules);
    setLogic(preset.logic as 'AND' | 'OR');
    setExpectedType(preset.expectedType);
    setExpectedValue(preset.expectedValue);
    if (preset.expectedValue2) setExpectedValue2(preset.expectedValue2);
  }, []);

  const handleRun = useCallback(async () => {
    if (prompts.length === 0) return;

    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const expected: Record<string, unknown> = {};
      if (expectedType === 'halluc_risk_above') {
        expected.halluc_risk_above = parseFloat(expectedValue);
      } else if (expectedType === 'halluc_risk_below') {
        expected.halluc_risk_below = parseFloat(expectedValue);
      } else if (expectedType === 'state') {
        expected.state = expectedValue;
      } else if (expectedType === 'state_not') {
        expected.state_not = expectedValue;
      } else if (expectedType === 'dt_confidence_above') {
        expected.dt_confidence_above = parseFloat(expectedValue);
      } else if (expectedType === 'signal_in_range') {
        expected.signal_in_range = { min: parseFloat(expectedValue), max: parseFloat(expectedValue2) };
      }

      // Build rules with aggregation suffix applied to signal name
      const expandedRules = rules.map(r => ({
        signal: r.aggregation ? `${r.signal}_${r.aggregation}` : r.signal,
        op: r.op,
        threshold: r.threshold,
      }));

      const data = await onRunHypothesis({
        rules: expandedRules,
        logic,
        expected,
        prompts,
        runs_per_prompt: runsPerPrompt,
        config: {
          max_tokens: maxTokens,
          seed: seed ? parseInt(seed) : null,
          temperature,
          top_p: topP,
          min_p: minP,
        },
      }) as HypothesisResult;

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
  }, [rules, logic, expectedType, expectedValue, expectedValue2, prompts, runsPerPrompt, maxTokens, seed, temperature, topP, minP, onRunHypothesis]);

  if (!isOpen) return null;

  const content = (
    <div className="hp-content">
      {loadHistory && loadRun && (
        <ResearchHistory
          filterType="hypothesis"
          loadHistory={loadHistory}
          loadRun={loadRun}
          onLoad={(data) => setResult(data as HypothesisResult)}
        />
      )}

      {/* Preset templates */}
      <div className="hp-presets">
        {PRESETS.map((p, i) => (
          <button key={i} className="hp-preset-btn" onClick={() => applyPreset(p)} disabled={isRunning}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Rule builder (compound) */}
      <div className="hp-section">
        <label className="hp-label">IF</label>
        {rules.map((rule, idx) => (
          <div key={idx} className="hp-rule-row">
            {idx > 0 && <span className="hp-logic-label">{logic}</span>}
            <select value={rule.signal} onChange={e => updateRule(idx, 'signal', e.target.value)} disabled={isRunning}
              className="hp-select">
              {SIGNAL_GROUPS.map(group => (
                <optgroup key={group.label} label={group.label}>
                  {group.signals.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </optgroup>
              ))}
            </select>
            <select value={rule.aggregation ?? ''} onChange={e => updateRule(idx, 'aggregation', e.target.value)} disabled={isRunning}
              className="hp-select hp-agg" title="Aggregation method (suffix)">
              <option value="">raw</option>
              {AGGREGATION_METHODS.filter(a => a.id !== 'per_token' && a.id !== 'window').map(a => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
            <select value={rule.op} onChange={e => updateRule(idx, 'op', e.target.value)} disabled={isRunning}
              className="hp-select hp-op">
              {OPERATORS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <input type="number" step={0.1} value={rule.threshold}
              onChange={e => updateRule(idx, 'threshold', parseFloat(e.target.value) || 0)} disabled={isRunning}
              className="hp-threshold" />
            {rules.length > 1 && (
              <button className="hp-remove-rule" onClick={() => removeRule(idx)} disabled={isRunning} title="Remove condition">
                &times;
              </button>
            )}
          </div>
        ))}
        <div className="hp-rule-actions">
          <button className="hp-add-rule" onClick={addRule} disabled={isRunning}>+ Add condition</button>
          {rules.length > 1 && (
            <div className="hp-logic-toggle">
              <label>Logic:</label>
              <select value={logic} onChange={e => setLogic(e.target.value as 'AND' | 'OR')} disabled={isRunning}
                className="hp-select hp-logic-select">
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="hp-section">
        <label className="hp-label">THEN expect</label>
        <div className="hp-rule-row">
          <select value={expectedType} onChange={e => setExpectedType(e.target.value)} disabled={isRunning}
            className="hp-select">
            {EXPECTED_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {(expectedType === 'state' || expectedType === 'state_not') ? (
            <select value={expectedValue} onChange={e => setExpectedValue(e.target.value)} disabled={isRunning}
              className="hp-select">
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : expectedType === 'signal_in_range' ? (
            <>
              <input type="number" step={0.1} placeholder="min" value={expectedValue}
                onChange={e => setExpectedValue(e.target.value)} disabled={isRunning}
                className="hp-threshold" />
              <span className="hp-range-sep">to</span>
              <input type="number" step={0.1} placeholder="max" value={expectedValue2}
                onChange={e => setExpectedValue2(e.target.value)} disabled={isRunning}
                className="hp-threshold" />
            </>
          ) : (
            <input type="number" step={0.1} min={0} max={1} value={expectedValue}
              onChange={e => setExpectedValue(e.target.value)} disabled={isRunning}
              className="hp-threshold" />
          )}
        </div>
      </div>

      {/* Prompts */}
      <div className="hp-section">
        <label className="hp-label">Test prompts (one per line)</label>
        <textarea
          className="hp-textarea"
          value={promptsText}
          onChange={e => setPromptsText(e.target.value)}
          placeholder="What is the capital of France?\nExplain quantum entanglement\nTell me about the battle of Thermopylae..."
          disabled={isRunning}
          rows={4}
        />
        <div className="hp-prompt-count">{prompts.length} prompt{prompts.length !== 1 ? 's' : ''}</div>
      </div>

      {/* Config */}
      <div className="hp-config-row">
        <div className="hp-field">
          <label>Runs/prompt</label>
          <input type="number" min={1} max={10} value={runsPerPrompt}
            onChange={e => setRunsPerPrompt(parseInt(e.target.value) || 3)} disabled={isRunning} />
        </div>
        <div className="hp-field">
          <label>Max tokens</label>
          <input type="number" min={10} max={300} value={maxTokens}
            onChange={e => setMaxTokens(parseInt(e.target.value) || 100)} disabled={isRunning} />
        </div>
        <div className="hp-field">
          <label>Seed</label>
          <input type="text" value={seed} placeholder="random"
            onChange={e => setSeed(e.target.value)} disabled={isRunning} />
        </div>
      </div>

      {/* Advanced sampling config */}
      <button className="hp-advanced-toggle" onClick={() => setShowAdvanced(v => !v)}>
        {showAdvanced ? 'Hide' : 'Show'} sampling config
      </button>
      {showAdvanced && (
        <div className="hp-advanced">
          <div className="hp-config-row">
            <div className="hp-field">
              <label>Temperature</label>
              <input type="number" step={0.1} min={0} max={2} value={temperature}
                onChange={e => setTemperature(parseFloat(e.target.value) || 0.8)} disabled={isRunning} />
            </div>
            <div className="hp-field">
              <label>Top-p</label>
              <input type="number" step={0.05} min={0} max={1} value={topP}
                onChange={e => setTopP(parseFloat(e.target.value) || 1.0)} disabled={isRunning} />
            </div>
            <div className="hp-field">
              <label>Min-p</label>
              <input type="number" step={0.01} min={0} max={0.5} value={minP}
                onChange={e => setMinP(parseFloat(e.target.value) || 0)} disabled={isRunning} />
            </div>
          </div>
        </div>
      )}

      <div className="hp-summary">
        {prompts.length} prompts x {runsPerPrompt} runs = <strong>{prompts.length * runsPerPrompt} total</strong>
      </div>

      <button className="hp-run-btn" onClick={handleRun}
        disabled={isRunning || prompts.length === 0}>
        {isRunning ? 'Testing...' : 'Run Hypothesis Test'}
      </button>

      {error && <div className="hp-error">{error}</div>}

      {/* Results */}
      {result && (
        <div className="hp-results">
          <div className="hp-result-header">
            <span className="hp-rule-summary">
              {(result.rules || [result.rule!]).map((r, i) => (
                <span key={i}>
                  {i > 0 && <span className="hp-logic-inline"> {result.logic || 'AND'} </span>}
                  {r.signal} {r.op} {r.threshold}
                </span>
              ))}
            </span>
            <span className="hp-sample-count">{result.total_samples} samples</span>
          </div>

          {/* Key metrics */}
          <div className="hp-metrics-grid">
            <div className="hp-metric">
              <div className="hp-metric-value">{(result.pass_rate * 100).toFixed(1)}%</div>
              <div className="hp-metric-label">Pass Rate</div>
            </div>
            <div className="hp-metric">
              <div className="hp-metric-value">{(result.f1 * 100).toFixed(1)}%</div>
              <div className="hp-metric-label">F1</div>
            </div>
            <div className="hp-metric">
              <div className="hp-metric-value" style={{ color: Math.abs(result.cohens_d) > 0.8 ? '#00ff66' : Math.abs(result.cohens_d) > 0.5 ? '#ffcc33' : '#ff3366' }}>
                {result.cohens_d.toFixed(3)}
              </div>
              <div className="hp-metric-label">Cohen's d</div>
            </div>
            <div className="hp-metric">
              <div className="hp-metric-value" style={{ color: result.p_value < 0.05 ? '#00ff66' : '#ff3366' }}>
                {result.p_value < 0.001 ? '<0.001' : result.p_value.toFixed(4)}
              </div>
              <div className="hp-metric-label">p-value</div>
            </div>
          </div>

          {/* Confusion matrix */}
          <div className="hp-confusion">
            <div className="hp-confusion-title">Confusion Matrix</div>
            <div className="hp-confusion-grid">
              <div className="hp-cm-cell hp-cm-header"></div>
              <div className="hp-cm-cell hp-cm-header">Outcome+</div>
              <div className="hp-cm-cell hp-cm-header">Outcome-</div>
              <div className="hp-cm-cell hp-cm-header">Rule+</div>
              <div className="hp-cm-cell hp-cm-tp">{result.confusion_matrix.tp}</div>
              <div className="hp-cm-cell hp-cm-fp">{result.confusion_matrix.fp}</div>
              <div className="hp-cm-cell hp-cm-header">Rule-</div>
              <div className="hp-cm-cell hp-cm-fn">{result.confusion_matrix.fn}</div>
              <div className="hp-cm-cell hp-cm-tn">{result.confusion_matrix.tn}</div>
            </div>
          </div>

          {/* Precision/Recall */}
          <div className="hp-pr-row">
            <span>Precision: <strong>{(result.precision * 100).toFixed(1)}%</strong></span>
            <span>Recall: <strong>{(result.recall * 100).toFixed(1)}%</strong></span>
          </div>

          {/* Significance indicator */}
          <div className="hp-significance">
            {result.p_value < 0.001 ? (
              <span className="hp-sig hp-sig-strong">Highly significant (p &lt; 0.001)</span>
            ) : result.p_value < 0.05 ? (
              <span className="hp-sig hp-sig-mod">Significant (p &lt; 0.05)</span>
            ) : (
              <span className="hp-sig hp-sig-ns">Not significant (p = {result.p_value.toFixed(4)})</span>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Embedded mode: render content only
  if (embedded) return content;

  return (
    <div className="hypothesis-panel">
      <div className="hp-header">
        <h3>Hypothesis Test</h3>
      </div>
      {content}
    </div>
  );
}
