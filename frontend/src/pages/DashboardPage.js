import React from 'react';
import { useAuth } from '../context/AuthContext';

const STATS = [
  { label: 'Total Properties', value: '—', icon: '🏢', color: '#e6f9ef' },
  { label: 'Total Units',      value: '—', icon: '🚪', color: '#eaf3fb' },
  { label: 'Active Leases',    value: '—', icon: '📄', color: '#fef9e7' },
  { label: 'Rent This Month',  value: 'KES —', icon: '💳', color: '#fdf2f0' },
  { label: 'Open Tickets',     value: '—', icon: '🔧', color: '#f3e6fa' },
  { label: 'Vacancies',        value: '—', icon: '🔑', color: '#fff5e6' },
];

/**
 * DashboardPage — summary overview.
 * Stat values are placeholders; connect to /api/v1/dashboard/stats in Step 2.
 */
export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h2>Good day, {user?.full_name?.split(' ')[0]} 👋</h2>
        <p className="text-muted">Here's what's happening across your portfolio.</p>
      </div>

      {/* ── Stats grid ─────────────────────────────────────── */}
      <div className="stat-grid">
        {STATS.map(({ label, value, icon, color }) => (
          <div className="stat-card" key={label}>
            <div className="stat-card__icon" style={{ background: color }}>{icon}</div>
            <div className="stat-card__label">{label}</div>
            <div className="stat-card__value">{value}</div>
          </div>
        ))}
      </div>

      {/* ── Placeholder panels ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
        <div className="card">
          <div className="card__header">
            <span className="card__title">Recent Payments</span>
          </div>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
            Payment activity will appear here once the payments module is connected.
          </p>
        </div>
        <div className="card">
          <div className="card__header">
            <span className="card__title">Open Maintenance Tickets</span>
          </div>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
            Maintenance requests will appear here once the tickets module is connected.
          </p>
        </div>
      </div>
    </div>
  );
}
