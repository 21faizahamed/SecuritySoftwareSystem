import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  footer,
  onClick,
}) => {
  return (
    <div className={`enterprise-card ${onClick ? 'clickable' : ''} ${className}`} onClick={onClick}>
      {(title || subtitle || action) && (
        <div className="card-header-bar">
          <div>
            {title && <h3 className="card-main-title">{title}</h3>}
            {subtitle && <p className="card-sub-title">{subtitle}</p>}
          </div>
          {action && <div className="card-action-slot">{action}</div>}
        </div>
      )}
      <div className="card-body-content">{children}</div>
      {footer && <div className="card-footer-bar">{footer}</div>}
    </div>
  );
};
