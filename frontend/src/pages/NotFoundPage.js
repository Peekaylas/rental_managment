import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-lg)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 80 }}>🏚️</div>
      <h2>404 — Page not found</h2>
      <p className="text-muted">The page you're looking for doesn't exist.</p>
      <Link to="/dashboard" className="btn btn--primary">Go to Dashboard</Link>
    </div>
  );
}
