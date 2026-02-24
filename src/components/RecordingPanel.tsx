import React, { useRef } from 'react';
import type { GhostwireSession } from '../recording';
import { getSessionStats } from '../recording';

interface RecordingPanelProps {
  isRecording: boolean;
  isReplaying: boolean;
  hasSession: boolean;
  lastSession: GhostwireSession | null;
  onSave: () => void;
  onLoad: (file: File) => void;
  disabled?: boolean;
}

export function RecordingPanel({
  isRecording,
  isReplaying,
  hasSession,
  lastSession,
  onSave,
  onLoad,
  disabled = false,
}: RecordingPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoad(file);
      // Reset input so same file can be loaded again
      e.target.value = '';
    }
  };

  const stats = lastSession ? getSessionStats(lastSession) : null;

  const getStatusIcon = () => {
    if (isRecording) return '🔴';
    if (isReplaying) return '↺';
    if (hasSession) return '✓';
    return '○';
  };

  const getStatusText = () => {
    if (isRecording) return 'Recording...';
    if (isReplaying) return 'Replay Mode';
    if (hasSession) return 'Session Ready';
    return 'No Session';
  };

  return (
    <div className="recording-panel">
      <div className="recording-header">
        <span className="recording-icon">
          {getStatusIcon()}
        </span>
        <span className="recording-status">
          {getStatusText()}
        </span>
      </div>

      <div className="recording-actions">
        {/* Save Button */}
        <button
          className="recording-btn save-btn"
          onClick={onSave}
          disabled={disabled || !hasSession || isRecording}
          title={hasSession ? 'Save session to .ghostline file' : 'No session to save'}
        >
          💾 Save
        </button>

        {/* Load Button */}
        <button
          className="recording-btn load-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isRecording}
          title="Load a .ghostline session file"
        >
          📂 Load
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".ghostline,.json"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {/* Session Info */}
      {stats && !isRecording && (
        <div className="session-stats">
          <div className="stat-row">
            <span className="stat-label">Prompt:</span>
            <span className="stat-value">{stats.promptTokens} tok</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Generated:</span>
            <span className="stat-value">{stats.generatedTokens} tok</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Avg Conf:</span>
            <span className="stat-value">{stats.avgConfidence}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Max Entropy:</span>
            <span className="stat-value">{stats.maxEntropy}</span>
          </div>
          {stats.duration !== 'unknown' && (
            <div className="stat-row">
              <span className="stat-label">Duration:</span>
              <span className="stat-value">{stats.duration}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
