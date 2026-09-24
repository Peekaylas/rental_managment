import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../assets/css/auth.css';

const LANDLORD_STATS = [
  { label: 'My Properties',   value: '—', icon: '🏢', bg: '#e6f9ef' },
  { label: 'Total Units',     value: '—', icon: '🚪', bg: '#eaf3fb' },
  { label: 'Occupied Units',  value: '—', icon: '✅', bg: '#fef9e7' },
  { label: 'Vacant Units',    value: '—', icon: '🔑', bg: '#fdf2f0' },
  { label: 'Rent This Month', value: 'KES —', icon: '💳', bg: '#fff5e6' },
  { label: 'Open Tickets',    value: '—', icon: '🔧', bg: '#f3e6fa' },
];

const QUICK = [
  { to: '/properties', label: '+ New Property' },
  { to: '/tenants',    label: '+ Add Tenant' },
  { to: '/leases',     label: '+ Create Lease' },
  { to: '/payments',   label: 'Record Payment' },
];

export default function LandlordDashboard() {
  const { user } = useAuth();
  const first = user?.full_name?.split(' ')[0] ?? 'Landlord';

  return (
    <div className="role-dashboard">
      {/* Hero */}
      <div
        className="role-dashboard__hero role-dashboard__hero--landlord"
        data-emoji="🏢"
      >
        <h2 className="role-dashboard__greeting">Welcome, {first} 🏡</h2>
        <p className="role-dashboard__tagline">
          Manage your properties, tenants, and rental income from one place.
        </p>
        <div className="role-dashboard__quick-actions">
          {QUICK.map(({ to, label }) => (
            <Link key={to} to={to} className="quick-action-btn">{label}</Link>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        {LANDLORD_STATS.map(({ label, value, icon, bg }) => (
          <div className="stat-card" key={label}>
            <div className="stat-card__icon" style={{ background: bg }}>{icon}</div>
            <div className="stat-card__label">{label}</div>
            <div className="stat-card__value">{value}</div>
          </div>
        ))}
      </div>

      {/* Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
        <div className="card">
          <div className="card__header">
            <span className="card__title">💳 Recent Payments</span>
            <Link to="/payments" className="btn btn--ghost btn--sm">View all →</Link>
          </div>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
            Payment records will appear here once connected to the API in Step 3.
          </p>
        </div>
        <div className="card">
          <div className="card__header">
            <span className="card__title">🔧 Maintenance Requests</span>
            <Link to="/maintenance" className="btn btn--ghost btn--sm">View all →</Link>
          </div>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
            Active maintenance tickets will appear here once connected to the API in Step 3.
          </p>
        </div>
      </div>
    </div>
  );
}
