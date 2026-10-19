import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionText,
  onAction,
  actionIcon,
}) => {
  return (
    <div className="empty-state-container">
      <div className="empty-state-icon">
        {icon || <Inbox size={40} strokeWidth={1.5} />}
      </div>
      <h4 className="empty-state-title">{title}</h4>
      <p className="empty-state-desc">{description}</p>
      {actionText && onAction && (
        <div className="empty-state-action">
          <Button variant="primary" onClick={onAction} leftIcon={actionIcon}>
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
};
