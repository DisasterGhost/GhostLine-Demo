/**
 * ResearchHistory — Compact dropdown showing saved research runs.
 * Embeddable in ComparePanel, SweepPanel, HypothesisPanel.
 */

import { useState, useEffect, useCallback } from 'react';
import './ResearchHistory.css';

interface HistoryEntry {
  run_id: string;
  type: string;
  summary: string;
  created_at: string;
}

interface ResearchHistoryProps {
  /** Filter to show only runs of this type (compare, sweep, hypothesis) */
  filterType?: string;
  /** Load the full run history from backend */
  loadHistory: () => Promise<HistoryEntry[]>;
  /** Load a specific run's results */
  loadRun: (runId: string) => Promise<unknown>;
  /** Callback when a run is loaded */
  onLoad: (data: unknown) => void;
}

export function ResearchHistory({ filterType, loadHistory, loadRun, onLoad }: ResearchHistoryProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const all = await loadHistory();
    const filtered = filterType ? all.filter(e => e.type === filterType) : all;
    setEntries(filtered);
  }, [loadHistory, filterType]);

  useEffect(() => {
    if (isOpen && entries.length === 0) {
      refresh();
    }
  }, [isOpen, entries.length, refresh]);

  const handleLoad = async (runId: string) => {
    setLoading(true);
    try {
      const data = await loadRun(runId);
      if (data) onLoad(data);
    } finally {
      setLoading(false);
      setIsOpen(false);
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  return (
    <div className="rh-container">
      <button
        className="rh-toggle"
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) refresh(); }}
        disabled={loading}
      >
        {loading ? 'Loading...' : `History${entries.length > 0 ? ` (${entries.length})` : ''}`}
      </button>

      {isOpen && (
        <div className="rh-dropdown">
          {entries.length === 0 ? (
            <div className="rh-empty">No saved runs</div>
          ) : (
            entries.slice(0, 20).map(entry => (
              <button
                key={entry.run_id}
                className="rh-entry"
                onClick={() => handleLoad(entry.run_id)}
                disabled={loading}
              >
                <span className="rh-summary">{entry.summary || entry.run_id}</span>
                <span className="rh-time">{formatTime(entry.created_at)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
