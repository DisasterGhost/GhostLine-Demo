import React from 'react';
import './AlertBanner.css';

interface AlertBannerProps {
  type: 'collapse' | 'hallucination' | 'intervention';
  message: string;
  metric?: string;
  detail?: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ type, message, metric, detail }) => {
  const getIcon = () => {
    switch (type) {
      case 'collapse': return '🔴';
      case 'hallucination': return '⚠️';
      case 'intervention': return '⚡';
      default: return 'ℹ️';
    }
  };

  return (
    <div className={`alert-banner alert-${type}`}>
      <div className="alert-content">
        <span className="alert-icon">{getIcon()}</span>
        <div className="alert-text-group">
          <span className="alert-message">{message}</span>
          {detail && <span className="alert-detail">{detail}</span>}
        </div>
        {metric && <span className="alert-metric">{metric}</span>}
      </div>
    </div>
  );
};
