/**
 * SignalSelector — Granular signal / aggregation / layer picker.
 *
 * Reusable component for the Corpus tab (full mode) and other tabs (compact mode).
 * Reads signal definitions from signalCatalog.ts.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  SIGNAL_CATALOG,
  CATEGORY_ORDER,
  CATEGORY_INFO,
  AGGREGATION_METHODS,
  DEFAULT_CAPTURE_LAYERS,
  configFromPreset,
  detectPreset,
  signalsByCategory,
  countEnabled,
  estimateMemoryMb,
  type SignalConfig,
  type SignalCategory,
  type AggregationMethod,
} from '../data/signalCatalog';
import './SignalSelector.css';

// ============================================================================
// Types
// ============================================================================

interface SignalSelectorProps {
  value: SignalConfig;
  onChange: (config: SignalConfig) => void;
  disabled?: boolean;
  /** Compact mode: show just signal picker, no layers/aggregation */
  compact?: boolean;
}

const PRESET_LABELS: { id: string; label: string }[] = [
  { id: 'core', label: 'Core' },
  { id: 'standard', label: 'Standard' },
  { id: 'full', label: 'Full' },
];

const ALL_LAYERS_36 = Array.from({ length: 36 }, (_, i) => i);

// ============================================================================
// Component
// ============================================================================

export function SignalSelector({ value, onChange, disabled, compact }: SignalSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<SignalCategory>>(new Set());

  const grouped = useMemo(() => signalsByCategory(), []);

  // --- Preset click ---
  const handlePreset = useCallback((presetId: string) => {
    onChange(configFromPreset(presetId));
  }, [onChange]);

  // --- Toggle individual signal ---
  const toggleSignal = useCallback((key: string) => {
    const next = { ...value, signals: { ...value.signals, [key]: !value.signals[key] } };
    next.preset = detectPreset(next.signals);
    onChange(next);
  }, [value, onChange]);

  // --- Toggle entire category ---
  const toggleCategory = useCallback((category: SignalCategory) => {
    const catSignals = SIGNAL_CATALOG.filter(s => s.category === category);
    const allOn = catSignals.every(s => value.signals[s.key]);
    const newSignals = { ...value.signals };
    for (const s of catSignals) {
      newSignals[s.key] = !allOn;
    }
    const next = { ...value, signals: newSignals, preset: detectPreset(newSignals) };
    onChange(next);
  }, [value, onChange]);

  // --- Expand/collapse category ---
  const toggleExpand = useCallback((category: SignalCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  // --- Aggregation toggle ---
  const toggleAgg = useCallback((aggId: AggregationMethod) => {
    const aggs = value.aggregations.includes(aggId)
      ? value.aggregations.filter(a => a !== aggId)
      : [...value.aggregations, aggId];
    onChange({ ...value, aggregations: aggs });
  }, [value, onChange]);

  // --- Window size ---
  const setWindowSize = useCallback((size: number) => {
    onChange({ ...value, windowSize: Math.max(2, Math.min(50, size)) });
  }, [value, onChange]);

  // --- Layer selection ---
  const toggleLayerMode = useCallback(() => {
    onChange({ ...value, captureAllLayers: !value.captureAllLayers });
  }, [value, onChange]);

  const toggleLayer = useCallback((layer: number) => {
    const layers = value.captureLayers.includes(layer)
      ? value.captureLayers.filter(l => l !== layer)
      : [...value.captureLayers, layer].sort((a, b) => a - b);
    onChange({ ...value, captureLayers: layers });
  }, [value, onChange]);

  const resetLayers = useCallback(() => {
    onChange({ ...value, captureLayers: [...DEFAULT_CAPTURE_LAYERS] });
  }, [value, onChange]);

  // --- Computed ---
  const enabledCount = useMemo(
    () => Object.values(value.signals).filter(Boolean).length,
    [value.signals]
  );
  const totalCount = SIGNAL_CATALOG.length;
  const memoryMb = useMemo(
    () => estimateMemoryMb(value.signals, 100, value.captureAllLayers ? 36 : value.captureLayers.length),
    [value.signals, value.captureAllLayers, value.captureLayers]
  );
  const hasExpensive = useMemo(
    () => SIGNAL_CATALOG.some(s => s.expensive && value.signals[s.key]),
    [value.signals]
  );
  const hasUnimplemented = useMemo(
    () => value.signals.qkv_capture || value.signals.gradient_capture,
    [value.signals]
  );

  return (
    <div className={`ss-root ${compact ? 'ss-compact' : ''}`}>
      {/* Preset buttons */}
      <div className="ss-presets">
        {PRESET_LABELS.map(p => (
          <button
            key={p.id}
            className={`ss-preset-btn ${value.preset === p.id ? 'active' : ''}`}
            onClick={() => handlePreset(p.id)}
            disabled={disabled}
          >
            {p.label}
          </button>
        ))}
        <span className={`ss-custom-badge ${value.preset === null ? 'active' : ''}`}>
          {value.preset === null ? 'Custom' : ''}
        </span>
      </div>

      {/* Signal categories — collapsible */}
      <div className="ss-categories">
        {CATEGORY_ORDER.map(cat => {
          const catInfo = CATEGORY_INFO[cat];
          const signals = grouped[cat] || [];
          if (signals.length === 0) return null;
          const { enabled, total } = countEnabled(value.signals, cat);
          const isExpanded = expandedCategories.has(cat);
          const isExpensiveCat = cat === 'expensive';

          return (
            <div key={cat} className={`ss-category ${isExpensiveCat ? 'ss-expensive-cat' : ''}`}>
              <div className="ss-cat-header" onClick={() => toggleExpand(cat)}>
                <span className="ss-cat-arrow">{isExpanded ? '\u25BC' : '\u25B6'}</span>
                <span className="ss-cat-name">{catInfo.label}</span>
                <span className="ss-cat-count">({enabled}/{total})</span>
                <button
                  className="ss-cat-toggle-all"
                  onClick={(e) => { e.stopPropagation(); toggleCategory(cat); }}
                  disabled={disabled}
                  title={enabled === total ? 'Disable all' : 'Enable all'}
                >
                  {enabled === total ? 'none' : 'all'}
                </button>
              </div>
              {isExpanded && (
                <div className="ss-cat-signals">
                  {signals.map(s => (
                    <label key={s.key} className={`ss-signal-toggle ${s.expensive ? 'ss-expensive' : ''}`} title={s.description}>
                      <input
                        type="checkbox"
                        checked={!!value.signals[s.key]}
                        onChange={() => toggleSignal(s.key)}
                        disabled={disabled}
                      />
                      <span className="ss-signal-label">{s.label}</span>
                      {s.expensive && <span className="ss-expensive-badge">$</span>}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Aggregation (full mode only) */}
      {!compact && (
        <div className="ss-section">
          <div className="ss-section-title">Aggregation</div>
          <div className="ss-agg-grid">
            {AGGREGATION_METHODS.map(agg => (
              <label key={agg.id} className="ss-agg-toggle" title={agg.description}>
                <input
                  type="checkbox"
                  checked={value.aggregations.includes(agg.id)}
                  onChange={() => toggleAgg(agg.id)}
                  disabled={disabled}
                />
                <span>{agg.label}</span>
                {agg.id === 'mean' && <span className="ss-warn-dot" title="Mean destroys signal for some metrics">!</span>}
              </label>
            ))}
          </div>
          {value.aggregations.includes('window') && (
            <div className="ss-window-size">
              <label>Window size:</label>
              <input
                type="number"
                min={2}
                max={50}
                value={value.windowSize}
                onChange={e => setWindowSize(parseInt(e.target.value) || 8)}
                disabled={disabled}
              />
              <span>tokens</span>
            </div>
          )}
        </div>
      )}

      {/* Layer selection (full mode only) */}
      {!compact && (
        <div className="ss-section">
          <div className="ss-section-title">Layers</div>
          <div className="ss-layer-mode">
            <label className="ss-layer-radio">
              <input
                type="radio"
                checked={value.captureAllLayers}
                onChange={toggleLayerMode}
                disabled={disabled}
              />
              All layers (36)
            </label>
            <label className="ss-layer-radio">
              <input
                type="radio"
                checked={!value.captureAllLayers}
                onChange={toggleLayerMode}
                disabled={disabled}
              />
              Subset:
            </label>
          </div>
          {!value.captureAllLayers && (
            <div className="ss-layer-grid">
              {ALL_LAYERS_36.map(l => (
                <button
                  key={l}
                  className={`ss-layer-btn ${value.captureLayers.includes(l) ? 'active' : ''}`}
                  onClick={() => toggleLayer(l)}
                  disabled={disabled}
                >
                  {l}
                </button>
              ))}
              <button className="ss-layer-reset" onClick={resetLayers} disabled={disabled}>
                Reset
              </button>
            </div>
          )}
        </div>
      )}

      {/* Summary footer */}
      <div className="ss-footer">
        <span className="ss-signal-count">{enabledCount}/{totalCount} signals</span>
        <span className="ss-memory-est">~{memoryMb >= 1024 ? `${(memoryMb / 1024).toFixed(1)} GB` : `${Math.round(memoryMb)} MB`}/sample</span>
        {hasExpensive && !hasUnimplemented && <span className="ss-expensive-warn">$ expensive signals enabled</span>}
        {hasUnimplemented && <span className="ss-unimplemented-warn">QKV/Gradients not yet implemented — will be skipped</span>}
      </div>
    </div>
  );
}
