import React from 'react';
import { Link } from 'react-router-dom';
import '../../assets/css/modules.css';

export default function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <h3 className="empty-state__title">{title}</h3>
      {description && <p className="empty-state__desc">{description}</p>}
      
      {action && (
        <div style={{ marginTop: 'var(--spacing-md)' }}>
          {action.to ? (
            <Link to={action.to} className="btn btn--primary">
              {action.label}
            </Link>
          ) : (
            <button onClick={action.onClick} className="btn btn--primary">
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
