import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../assets/css/auth.css';

const TENANT_STATS = [
  { label: 'Monthly Rent',    value: 'KES —', icon: '💳', bg: '#eaf3fb' },
  { label: 'Balance Due',     value: 'KES —', icon: '⚠️', bg: '#fdf2f0' },
  { label: 'Lease Expires',   value: '—',     icon: '📅', bg: '#fef9e7' },
  { label: 'Open Tickets',    value: '—',     icon: '🔧', bg: '#f3e6fa' },
];

export default function TenantDashboard() {
  const { user } = useAuth();
  const first = user?.full_name?.split(' ')[0] ?? 'Tenant';

  return (
    <div className="role-dashboard">
      {/* Hero */}
      <div
        className="role-dashboard__hero role-dashboard__hero--tenant"
        data-emoji="🏠"
      >
        <h2 className="role-dashboard__greeting">Hi, {first} 👋</h2>
        <p className="role-dashboard__tagline">
          Track your rent, lease, and maintenance requests — all in one place.
        </p>
        <div className="role-dashboard__quick-actions">
          <Link to="/payments"    className="quick-action-btn">💳 Pay Rent</Link>
          <Link to="/maintenance" className="quick-action-btn">🔧 Report Issue</Link>
          <Link to="/leases"      className="quick-action-btn">📄 My Lease</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        {TENANT_STATS.map(({ label, value, icon, bg }) => (
          <div className="stat-card" key={label}>
            <div className="stat-card__icon" style={{ background: bg }}>{icon}</div>
            <div className="stat-card__label">{label}</div>
            <div className="stat-card__value">{value}</div>
          </div>
        ))}
      </div>

      {/* Action cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
        <div className="card">
          <div className="card__header">
            <span className="card__title">📄 My Lease Agreement</span>
            <Link to="/leases" className="btn btn--ghost btn--sm">View →</Link>
          </div>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
            Your active lease details and terms will appear here once connected to the API.
          </p>
        </div>
        <div className="card">
          <div className="card__header">
            <span className="card__title">🔧 My Maintenance Tickets</span>
            <Link to="/maintenance" className="btn btn--ghost btn--sm">View all →</Link>
          </div>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
            Your submitted maintenance requests will appear here.
          </p>
        </div>
      </div>

      {/* Payment history */}
      <div className="card" style={{ marginTop: 'var(--spacing-lg)' }}>
        <div className="card__header">
          <span className="card__title">💳 Payment History</span>
          <Link to="/payments" className="btn btn--ghost btn--sm">View all →</Link>
        </div>
        <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
          A record of all your rent payments will be shown here once the payments module is connected.
        </p>
      </div>
    </div>
  );
}
