/**
 * UnifiedResearchPanel — Full-height sidebar that hosts all research tools as tabs.
 * Replaces 5 separate panels + 5 toolbar buttons with 1 sidebar + 1 button.
 */

import { useState, useCallback } from 'react';
import { ComparePanel } from './ComparePanel';
import { SweepPanel } from './SweepPanel';
import { HypothesisPanel } from './HypothesisPanel';
import { SignalExplorer } from './SignalExplorer';
import { ResearchPanel } from './ResearchPanel';
import type { TrajectoryPoint } from '../hooks/usePlaybackBuffer';
import type {
  ResearchStatus,
  ResearchResults,
  SignalPreset,
  PromptLibrary,
  RunListEntry,
  RunConfig,
} from '../hooks/useResearchWorkbench.ts';
import './UnifiedResearchPanel.css';

// ============================================================================
// Types
// ============================================================================

type ResearchTab = 'signals' | 'compare' | 'sweep' | 'hypothesis' | 'corpus';

interface UnifiedResearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWiki?: (entryId: string) => void;

  // Signal Explorer props
  trajectory: TrajectoryPoint[];
  selectedToken: number | null;
  onSelectToken: (position: number | null) => void;

  // Compare props
  onRunCompare: (a: Record<string, unknown>, b: Record<string, unknown>, maxTokens?: number) => Promise<unknown>;

  // Sweep props
  onRunSweep: (config: {
    prompt: string;
    sweep_param: string;
    sweep_values: number[];
    runs_per_value: number;
    base_config: Record<string, unknown>;
  }) => Promise<unknown>;

  // Hypothesis props
  onRunHypothesis: (config: {
    rules: Array<{ signal: string; op: string; threshold: number }>;
    logic: string;
    expected: Record<string, unknown>;
    prompts: string[];
    runs_per_prompt: number;
    config: Record<string, unknown>;
  }) => Promise<unknown>;

  // Research history (shared by compare/sweep/hypothesis)
  loadResearchHistory?: () => Promise<Array<{ run_id: string; type: string; summary: string; created_at: string }>>;
  loadResearchRun?: (runId: string) => Promise<unknown>;

  // Research Workbench (Corpus) props
  researchStatus: ResearchStatus;
  researchResults: ResearchResults | null;
  researchPresets: SignalPreset[];
  researchLibrary: PromptLibrary | null;
  researchRunHistory: RunListEntry[];
  onStartRun: (config: RunConfig) => void;
  onCancelRun: () => void;
  onDownload: (runId?: string) => void;
  onReset: () => void;
  onLoadLibrary: () => void;
  onLoadHistory: () => void;
}

const TAB_LABELS: Record<ResearchTab, string> = {
  signals: 'Signals',
  compare: 'Compare',
  sweep: 'Sweep',
  hypothesis: 'Hypothesis',
  corpus: 'Corpus',
};

const TAB_ORDER: ResearchTab[] = ['signals', 'compare', 'sweep', 'hypothesis', 'corpus'];

// ============================================================================
// Component
// ============================================================================

export function UnifiedResearchPanel({
  isOpen,
  onClose,
  onOpenWiki,
  trajectory,
  selectedToken,
  onSelectToken,
  onRunCompare,
  onRunSweep,
  onRunHypothesis,
  loadResearchHistory,
  loadResearchRun,
  researchStatus,
  researchResults,
  researchPresets,
  researchLibrary,
  researchRunHistory,
  onStartRun,
  onCancelRun,
  onDownload,
  onReset,
  onLoadLibrary,
  onLoadHistory,
}: UnifiedResearchPanelProps) {
  const [activeTab, setActiveTab] = useState<ResearchTab>('signals');

  const handleTabChange = useCallback((tab: ResearchTab) => {
    setActiveTab(tab);
  }, []);

  return (
    <div className={`research-sidebar ${isOpen ? 'open' : ''}`}>
      {/* Header */}
      <div className="rp-header">
        <h3>Research Lab</h3>
        <button className="rp-close" onClick={onClose}>&times;</button>
      </div>

      {/* Tab bar */}
      <div className="rp-tab-bar">
        {TAB_ORDER.map(tab => (
          <button
            key={tab}
            className={`rp-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => handleTabChange(tab)}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Content area — each tab renders its component's inner content */}
      <div className="rp-content">
        {activeTab === 'signals' && (
          <SignalExplorer
            trajectory={trajectory}
            selectedToken={selectedToken}
            onSelectToken={onSelectToken}
            isOpen={true}
            embedded
            onOpenWiki={onOpenWiki}
          />
        )}

        {activeTab === 'compare' && (
          <ComparePanel
            isOpen={true}
            onRunCompare={onRunCompare}
            loadHistory={loadResearchHistory}
            loadRun={loadResearchRun}
            embedded
          />
        )}

        {activeTab === 'sweep' && (
          <SweepPanel
            isOpen={true}
            onRunSweep={onRunSweep}
            loadHistory={loadResearchHistory}
            loadRun={loadResearchRun}
            embedded
          />
        )}

        {activeTab === 'hypothesis' && (
          <HypothesisPanel
            isOpen={true}
            onRunHypothesis={onRunHypothesis}
            loadHistory={loadResearchHistory}
            loadRun={loadResearchRun}
            embedded
          />
        )}

        {activeTab === 'corpus' && (
          <ResearchPanel
            isOpen={true}
            status={researchStatus}
            results={researchResults}
            presets={researchPresets}
            library={researchLibrary}
            runHistory={researchRunHistory}
            onStartRun={onStartRun}
            onCancelRun={onCancelRun}
            onDownload={onDownload}
            onReset={onReset}
            onLoadLibrary={onLoadLibrary}
            onLoadHistory={onLoadHistory}
            embedded
          />
        )}
      </div>
    </div>
  );
}
