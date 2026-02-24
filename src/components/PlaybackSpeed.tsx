import React from 'react';

interface PlaybackSpeedProps {
  currentRate: number;
  onRateChange: (rate: number) => void;
  disabled?: boolean;
}

const SPEED_OPTIONS = [
  { label: '1x', value: 2 },
  { label: '2x', value: 4 },
  { label: '4x', value: 8 },
  { label: '8x', value: 16 },
];

export function PlaybackSpeed({ currentRate, onRateChange, disabled }: PlaybackSpeedProps) {
  return (
    <div className="playback-speed">
      <span className="label">Speed:</span>
      <div className="speed-buttons">
        {SPEED_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={currentRate === opt.value ? 'active' : ''}
            onClick={() => onRateChange(opt.value)}
            disabled={disabled}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
