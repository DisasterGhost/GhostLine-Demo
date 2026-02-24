/**
 * SignalExplorer — Per-token signal inspection panel.
 * Shows time-series charts, signal table, and distribution views
 * using data from the live trajectory.
 */

import { useState, useMemo, useCallback } from 'react';
import { MiniChart, type ChartSeries } from './MiniChart';
import { WikiTooltip } from './WikiTooltip';
import type { TrajectoryPoint } from '../hooks/usePlaybackBuffer';
import { DEFAULT_CAPTURE_LAYERS } from '../data/signalCatalog';
import './SignalExplorer.css';

// ============================================================================
// Types
// ============================================================================

type ViewMode = 'charts' | 'table' | 'distribution';

interface SignalDef {
  key: string;
  label: string;
  color: string;
  extract: (t: TrajectoryPoint) => number | null;
  wikiId?: string;
}

interface SignalExplorerProps {
  trajectory: TrajectoryPoint[];
  selectedToken: number | null;
  onSelectToken: (position: number | null) => void;
  isOpen: boolean;
  embedded?: boolean;
  onOpenWiki?: (entryId: string) => void;
}

// ============================================================================
// Signal Definitions
// ============================================================================

const CAPTURE_LAYERS = DEFAULT_CAPTURE_LAYERS;

const BASE_SIGNALS: SignalDef[] = [
  { key: 'halluc_risk', label: 'Halluc Risk', color: '#ff3366', extract: t => t.hallucinationRisk ?? null, wikiId: 'halluc-ensemble' },
  { key: 'refuse_prob', label: 'Refusal Prob', color: '#9999ff', extract: t => t.refusalProb ?? null, wikiId: 'halluc-ensemble' },
  { key: 'token_prob', label: 'Token Prob', color: '#00ff66', extract: t => t.tokenProb, wikiId: 'token-prob' },
  { key: 'proj_velocity', label: 'Proj Velocity', color: '#00cccc', extract: t => t.projectedVelocity ?? null, wikiId: 'velocity' },
  { key: 'residual_norm', label: 'Residual Norm', color: '#ffcc33', extract: t => t.residualNorm, wikiId: 'residual-norm' },
  { key: 'dt_confidence', label: 'DT Confidence', color: '#9933cc', extract: t => t.dtConfidence ?? null, wikiId: 'lda-classifier' },
];

// Generate per-layer signals
function buildLayerSignals(): SignalDef[] {
  const signals: SignalDef[] = [];
  const layerColors: Record<number, string> = {
    0: '#ff6666', 4: '#ff9933', 8: '#ffcc33', 12: '#66ff66',
    16: '#33cccc', 20: '#3399ff', 24: '#6666ff', 28: '#9933cc', 31: '#cc33cc',
  };

  for (const layer of CAPTURE_LAYERS) {
    const color = layerColors[layer] || '#888888';
    signals.push({
      key: `L${layer}_eff_dim`,
      label: `L${layer} EffDim`,
      color,
      extract: t => t.layerEffDims?.[String(layer)] ?? null,
      wikiId: 'eff-dim',
    });
  }
  for (const layer of CAPTURE_LAYERS) {
    const color = layerColors[layer] || '#888888';
    signals.push({
      key: `L${layer}_velocity`,
      label: `L${layer} Velocity`,
      color,
      extract: t => t.layerVelocities?.[String(layer)] ?? null,
      wikiId: 'velocity',
    });
  }
  for (const layer of CAPTURE_LAYERS) {
    const color = layerColors[layer] || '#888888';
    signals.push({
      key: `L${layer}_norm`,
      label: `L${layer} Norm`,
      color,
      extract: t => t.layerNorms?.[String(layer)] ?? null,
      wikiId: 'residual-norm',
    });
  }
  return signals;
}

const LAYER_SIGNALS = buildLayerSignals();
const ALL_SIGNALS = [...BASE_SIGNALS, ...LAYER_SIGNALS];

// Signal groups for quick selection
const SIGNAL_GROUPS: Record<string, string[]> = {
  'Core': ['halluc_risk', 'refuse_prob', 'token_prob', 'proj_velocity', 'dt_confidence'],
  'EffDim': CAPTURE_LAYERS.map(l => `L${l}_eff_dim`),
  'Velocity': CAPTURE_LAYERS.map(l => `L${l}_velocity`),
  'Norms': CAPTURE_LAYERS.map(l => `L${l}_norm`),
};

// ============================================================================
// Component
// ============================================================================

export function SignalExplorer({ trajectory, selectedToken, onSelectToken, isOpen, embedded, onOpenWiki }: SignalExplorerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('charts');
  const [selectedSignals, setSelectedSignals] = useState<Set<string>>(new Set(['halluc_risk', 'token_prob', 'proj_velocity']));
  const [tableSortKey, setTableSortKey] = useState<string>('position');
  const [tableSortAsc, setTableSortAsc] = useState(true);

  // Filter to only generated tokens (not prompt tokens)
  const genTokens = useMemo(
    () => trajectory.filter(t => !t.isPrompt),
    [trajectory]
  );

  // Extract series data for selected signals
  const chartSeries = useMemo((): ChartSeries[] => {
    return Array.from(selectedSignals).map(key => {
      const def = ALL_SIGNALS.find(s => s.key === key);
      if (!def) return { label: key, data: [], color: '#888' };
      return {
        label: def.label,
        data: genTokens.map(t => def.extract(t) ?? NaN),
        color: def.color,
      };
    });
  }, [selectedSignals, genTokens]);

  // Token labels
  const xLabels = useMemo(() => genTokens.map(t => t.tokenStr.trim() || `#${t.position}`), [genTokens]);

  // Toggle signal
  const toggleSignal = useCallback((key: string) => {
    setSelectedSignals(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Select signal group
  const selectGroup = useCallback((groupName: string) => {
    const keys = SIGNAL_GROUPS[groupName];
    if (keys) setSelectedSignals(new Set(keys));
  }, []);

  // Handle chart hover
  const handleChartHover = useCallback((idx: number | null) => {
    if (idx !== null && genTokens[idx]) {
      onSelectToken(genTokens[idx].position);
    }
  }, [genTokens, onSelectToken]);

  // Distribution data
  const distributionData = useMemo(() => {
    if (viewMode !== 'distribution') return [];
    return Array.from(selectedSignals).map(key => {
      const def = ALL_SIGNALS.find(s => s.key === key);
      if (!def) return null;
      const values = genTokens.map(t => def.extract(t)).filter((v): v is number => v !== null && !isNaN(v));
      if (values.length === 0) return null;

      // Build histogram (10 bins)
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;
      const binCount = 10;
      const bins = new Array(binCount).fill(0);
      const binLabels: string[] = [];
      for (let i = 0; i < binCount; i++) {
        const lo = min + (i / binCount) * range;
        binLabels.push(lo.toFixed(1));
      }
      for (const v of values) {
        const bin = Math.min(Math.floor(((v - min) / range) * binCount), binCount - 1);
        bins[bin]++;
      }
      return { label: def.label, color: def.color, bins, binLabels, mean: values.reduce((a, b) => a + b, 0) / values.length, std: Math.sqrt(values.map(v => (v - values.reduce((a, b) => a + b, 0) / values.length) ** 2).reduce((a, b) => a + b, 0) / values.length) };
    }).filter(Boolean);
  }, [viewMode, selectedSignals, genTokens]);

  // Table data
  const tableData = useMemo(() => {
    if (viewMode !== 'table') return [];
    const rows = genTokens.map(t => {
      const row: Record<string, unknown> = {
        position: t.position,
        token: t.tokenStr,
        state: t.geometricState || t.dtState || '-',
      };
      for (const key of selectedSignals) {
        const def = ALL_SIGNALS.find(s => s.key === key);
        if (def) row[key] = def.extract(t);
      }
      return row;
    });

    // Sort
    rows.sort((a, b) => {
      const va = a[tableSortKey] as number ?? 0;
      const vb = b[tableSortKey] as number ?? 0;
      return tableSortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

    return rows;
  }, [viewMode, genTokens, selectedSignals, tableSortKey, tableSortAsc]);

  const handleSort = useCallback((key: string) => {
    if (tableSortKey === key) setTableSortAsc(v => !v);
    else { setTableSortKey(key); setTableSortAsc(true); }
  }, [tableSortKey]);

  if (!isOpen) return null;

  // Chart width adapts to embedded context (wider sidebar)
  const chartWidth = embedded ? 370 : 308;

  const content = (
    <>
      {/* View mode tabs */}
      <div className="se-view-tabs">
        <button className={`se-tab ${viewMode === 'charts' ? 'active' : ''}`} onClick={() => setViewMode('charts')}>Charts</button>
        <button className={`se-tab ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>Table</button>
        <button className={`se-tab ${viewMode === 'distribution' ? 'active' : ''}`} onClick={() => setViewMode('distribution')}>Distribution</button>
      </div>

      {/* Signal selector */}
      <div className="se-signal-selector">
        <div className="se-groups">
          {Object.keys(SIGNAL_GROUPS).map(g => (
            <button key={g} className="se-group-btn" onClick={() => selectGroup(g)}>{g}</button>
          ))}
        </div>
        <div className="se-signals-list">
          {BASE_SIGNALS.map(s => (
            <label key={s.key} className="se-signal-toggle">
              <input type="checkbox" checked={selectedSignals.has(s.key)} onChange={() => toggleSignal(s.key)} />
              {s.wikiId && onOpenWiki ? (
                <WikiTooltip wikiId={s.wikiId} onOpenWiki={onOpenWiki}>
                  <span style={{ color: s.color }} className="se-signal-label-linked">{s.label}</span>
                </WikiTooltip>
              ) : (
                <span style={{ color: s.color }}>{s.label}</span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className={embedded ? 'se-content-embedded' : 'se-content'}>
        {viewMode === 'charts' && genTokens.length > 0 && (
          <div className="se-charts">
            <MiniChart
              series={chartSeries}
              xLabels={xLabels}
              width={chartWidth}
              height={180}
              title="Signal Timeline"
              xLabel="token"
              grid
              legend
              onHover={handleChartHover}
              highlightIndex={selectedToken !== null ? genTokens.findIndex(t => t.position === selectedToken) : null}
            />
          </div>
        )}

        {viewMode === 'table' && (
          <div className="se-table-container">
            <table className="se-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('position')} className="se-th-sortable">
                    # {tableSortKey === 'position' ? (tableSortAsc ? '\u25B2' : '\u25BC') : ''}
                  </th>
                  <th>Token</th>
                  <th onClick={() => handleSort('state')} className="se-th-sortable">State</th>
                  {Array.from(selectedSignals).map(key => {
                    const def = ALL_SIGNALS.find(s => s.key === key);
                    const wikiId = def?.wikiId;
                    const label = def?.label.replace(/^L\d+\s/, '') || key;
                    return (
                      <th key={key} onClick={() => handleSort(key)} className="se-th-sortable" style={{ color: def?.color }}>
                        {wikiId && onOpenWiki ? (
                          <WikiTooltip wikiId={wikiId} onOpenWiki={onOpenWiki} position="below">
                            <span className="se-th-label-linked">{label}</span>
                          </WikiTooltip>
                        ) : (
                          label
                        )}
                        {' '}{tableSortKey === key ? (tableSortAsc ? '\u25B2' : '\u25BC') : ''}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, i) => (
                  <tr
                    key={i}
                    className={selectedToken === row.position ? 'se-row-selected' : ''}
                    onClick={() => onSelectToken(row.position as number)}
                  >
                    <td>{row.position as number}</td>
                    <td className="se-token-cell">{(row.token as string).trim() || '\u00A0'}</td>
                    <td className={`state-${row.state}`}>{row.state as string}</td>
                    {Array.from(selectedSignals).map(key => {
                      const v = row[key] as number | null;
                      return <td key={key}>{v !== null && v !== undefined ? (typeof v === 'number' ? v.toFixed(2) : '-') : '-'}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === 'distribution' && (
          <div className="se-distributions">
            {(distributionData as Array<{ label: string; color: string; bins: number[]; binLabels: string[]; mean: number; std: number }>).map((d, i) => (
              <div key={i} className="se-dist-item">
                <MiniChart
                  series={[{ label: d.label, data: d.bins, color: d.color }]}
                  xLabels={d.binLabels}
                  width={chartWidth}
                  height={120}
                  type="bar"
                  title={`${d.label} (\u03BC=${d.mean.toFixed(2)}, \u03C3=${d.std.toFixed(2)})`}
                  grid={false}
                  legend={false}
                />
              </div>
            ))}
          </div>
        )}

        {genTokens.length === 0 && (
          <div className="se-empty">Generate some tokens to explore signals.</div>
        )}
      </div>
    </>
  );

  // Embedded mode: render content only (no outer positioned container)
  if (embedded) {
    return <div className="signal-explorer-embedded">{content}</div>;
  }

  return (
    <div className="signal-explorer">
      <div className="se-header">
        <h3>Signal Explorer</h3>
        <span className="se-token-count">{genTokens.length} tokens</span>
      </div>
      {content}
    </div>
  );
}
