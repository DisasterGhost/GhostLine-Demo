// ============================================================================
// WikiPanel - Right sidebar wiki/reference panel
// ============================================================================
// Searchable, categorized, linkable reference with model data toggle.
// Newcomers see concept-only entries; researchers toggle model numbers on.

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  wikiEntries,
  wikiById,
  searchEntries,
  CATEGORY_LABELS,
  type WikiCategory,
  type WikiEntry,
} from '../data/wikiContent';
import './WikiPanel.css';

interface WikiPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeEntryId: string | null;
  onClearActive: () => void;
}

const ALL_CATEGORIES: WikiCategory[] = ['basics', 'states', 'signals', 'methods', 'concepts', 'science'];

const STORAGE_KEY = 'ghostline-wiki-model-data';

/** Scope → color mapping for model data pills */
const SCOPE_COLORS: Record<string, string> = {
  'Qwen3-8B': '#ffcc33',
  'Llama 3.2 3B': '#00cccc',
  'Cross-architecture': '#cc99ff',
  'General': 'rgba(255, 255, 255, 0.5)',
};

function getScopeColor(scope: string): string {
  return SCOPE_COLORS[scope] || 'rgba(255, 255, 255, 0.4)';
}

export function WikiPanel({ isOpen, onClose, activeEntryId, onClearActive }: WikiPanelProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<WikiCategory | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModelData, setShowModelData] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  });
  const entryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Persist model data toggle
  const handleToggleModelData = useCallback(() => {
    setShowModelData(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* noop */ }
      return next;
    });
  }, []);

  // When activeEntryId changes (from inspector link), scroll to that entry
  useEffect(() => {
    if (activeEntryId && isOpen) {
      setExpandedId(activeEntryId);
      setSearch('');
      setSelectedCategory(null);
      requestAnimationFrame(() => {
        const el = entryRefs.current[activeEntryId];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }
  }, [activeEntryId, isOpen]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    let results: WikiEntry[];
    if (search.trim()) {
      results = searchEntries(search);
    } else {
      results = wikiEntries;
    }
    if (selectedCategory) {
      results = results.filter(e => e.category === selectedCategory);
    }
    return results;
  }, [search, selectedCategory]);

  const handleEntryClick = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      onClearActive();
    } else {
      setExpandedId(id);
    }
  };

  const handleRelatedClick = (id: string) => {
    setExpandedId(id);
    setSearch('');
    setSelectedCategory(null);
    requestAnimationFrame(() => {
      const el = entryRefs.current[id];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  };

  return (
    <div className={`wiki-panel ${isOpen ? 'open' : ''}`}>
      <div className="wiki-header">
        <h3>GhostLine Wiki</h3>
        <button className="wiki-close" onClick={onClose}>&times;</button>
      </div>

      {/* Search */}
      <div className="wiki-search">
        <input
          type="text"
          placeholder="Search entries..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Category chips + model data toggle */}
      <div className="wiki-toolbar">
        <div className="wiki-categories">
          <button
            className={`wiki-chip ${selectedCategory === null ? 'active' : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            All
          </button>
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`wiki-chip ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
        <label className="wiki-model-toggle" title="Show model-specific numbers and thresholds">
          <input
            type="checkbox"
            checked={showModelData}
            onChange={handleToggleModelData}
          />
          <span className="wiki-model-toggle-label">Model data</span>
        </label>
      </div>

      {/* Entry list */}
      <div className="wiki-entries">
        {filteredEntries.length === 0 ? (
          <div className="wiki-empty">No entries match your search.</div>
        ) : (
          filteredEntries.map(entry => {
            const isExpanded = expandedId === entry.id;
            const isHighlighted = activeEntryId === entry.id;
            const hasModelData = entry.modelData && entry.modelData.length > 0;
            return (
              <div
                key={entry.id}
                ref={el => { entryRefs.current[entry.id] = el; }}
                className={`wiki-entry ${isExpanded ? 'expanded' : ''} ${isHighlighted ? 'highlighted' : ''}`}
              >
                <div className="wiki-entry-header" onClick={() => handleEntryClick(entry.id)}>
                  <div className="wiki-entry-meta">
                    <span className={`wiki-entry-cat cat-${entry.category}`}>
                      {CATEGORY_LABELS[entry.category]}
                    </span>
                    <h4>
                      {entry.title}
                      {hasModelData && <span className="wiki-has-data-dot" title="Has model-specific data" />}
                    </h4>
                  </div>
                  <span className="wiki-entry-arrow">{isExpanded ? '\u25B4' : '\u25BE'}</span>
                </div>
                <p className="wiki-entry-short">{entry.short}</p>
                {isExpanded && (
                  <div className="wiki-entry-body">
                    {entry.body.split('\n\n').map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}

                    {/* Model-specific data blocks */}
                    {showModelData && hasModelData && (
                      <div className="wiki-model-data">
                        <div className="wiki-model-data-header">Model Data</div>
                        {entry.modelData!.map((block, i) => (
                          <div key={i} className="wiki-model-block">
                            <span
                              className="wiki-model-scope"
                              style={{ color: getScopeColor(block.scope) }}
                            >
                              {block.scope}
                            </span>
                            <span className="wiki-model-label">{block.label}:</span>
                            <span className="wiki-model-content">{block.content}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {entry.related && entry.related.length > 0 && (
                      <div className="wiki-entry-related">
                        <span className="wiki-related-label">Related:</span>
                        {entry.related.map(relId => {
                          const rel = wikiById[relId];
                          if (!rel) return null;
                          return (
                            <button
                              key={relId}
                              className="wiki-related-link"
                              onClick={() => handleRelatedClick(relId)}
                            >
                              {rel.title}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
