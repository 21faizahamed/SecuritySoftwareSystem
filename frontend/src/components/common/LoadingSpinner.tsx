import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullHeight?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading data...',
  size = 'md',
  fullHeight = false,
}) => {
  return (
    <div className={`loading-spinner-wrapper ${fullHeight ? 'full-height' : ''}`}>
      <div className={`spinner-circle size-${size}`} role="status" aria-label="Loading">
        <span className="sr-only">Loading...</span>
      </div>
      {message && <p className="loading-spinner-text">{message}</p>}
    </div>
  );
};
