import { useState } from 'react';
import type { CuratedRecording } from '../recordings/types';
import { RECORDING_CATALOG } from '../recordings/catalog';
import './RecordingSelector.css';

interface RecordingSelectorProps {
  currentRecordingId: string | null;
  onSelect: (recording: CuratedRecording) => void;
  isLoading: boolean;
}

export function RecordingSelector({ currentRecordingId, onSelect, isLoading }: RecordingSelectorProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`recording-selector ${expanded ? 'expanded' : ''}`}>
      <button
        className="recording-selector-toggle"
        onClick={() => setExpanded(e => !e)}
        title="Choose a recording"
      >
        <span className="selector-icon">{'\u25B6'}</span>
        <span className="selector-label">
          {isLoading
            ? 'Loading...'
            : currentRecordingId
              ? RECORDING_CATALOG.find(r => r.id === currentRecordingId)?.title ?? 'Recording'
              : 'Choose Recording'}
        </span>
        <span className={`selector-chevron ${expanded ? 'open' : ''}`}>{'\u25BE'}</span>
      </button>

      {expanded && (
        <div className="recording-selector-dropdown">
          {RECORDING_CATALOG.map(rec => (
            <button
              key={rec.id}
              className={`recording-option ${rec.id === currentRecordingId ? 'active' : ''}`}
              onClick={() => {
                onSelect(rec);
                setExpanded(false);
              }}
              disabled={isLoading}
            >
              <div className="recording-option-title">{rec.title}</div>
              <div className="recording-option-desc">{rec.description}</div>
              {rec.tags && (
                <div className="recording-option-tags">
                  {rec.tags.map(tag => (
                    <span key={tag} className="recording-tag">{tag}</span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
