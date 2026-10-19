import React from 'react';
import type { BadgeVariant } from '../../utils/statusUtils';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  icon,
  size = 'md',
  className = '',
}) => {
  return (
    <span className={`badge-pill badge-${variant} badge-size-${size} ${className}`}>
      {icon && <span className="badge-icon">{icon}</span>}
      <span className="badge-dot" />
      <span className="badge-text">{children}</span>
    </span>
  );
};
