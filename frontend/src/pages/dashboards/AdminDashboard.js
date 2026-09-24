import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/apiClient';
import '../../assets/css/auth.css';

export default function AdminDashboard() {
  const { user } = useAuth();
  const first = user?.full_name?.split(' ')[0] ?? 'Admin';

  const [stats, setStats] = useState({ properties: 0, tenants: 0, leases: 0, tickets: 0 });
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      apiClient.get('/properties'),
      apiClient.get('/tenants'),
      apiClient.get('/leases'),
      apiClient.get('/maintenance/stats'),
      apiClient.get('/payments/ledger/summary'),
    ]).then(([props, ten, leases, maint, led]) => {
      setStats({
        properties: props.status === 'fulfilled' ? props.value.data.length : '—',
        tenants:    ten.status === 'fulfilled'   ? ten.value.data.length   : '—',
        leases:     leases.status === 'fulfilled'? leases.value.data.length: '—',
        tickets:    maint.status === 'fulfilled' ? maint.value.data.open_count : '—',
      });
      if (led.status === 'fulfilled') setLedger(led.value.data);
    }).finally(() => setLoading(false));
  }, []);

  const fmt = (n) => typeof n === 'number' ? `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 0 })}` : '—';

  const STAT_CARDS = [
    { label: 'Total Properties', value: stats.properties, icon: '🏢', bg: '#e6f9ef' },
    { label: 'Registered Tenants', value: stats.tenants, icon: '👥', bg: '#eaf3fb' },
    { label: 'Active Leases', value: stats.leases, icon: '📄', bg: '#fef9e7' },
    { label: 'Open Tickets', value: stats.tickets, icon: '🔧', bg: '#fdf2f0' },
    { label: 'Total Collected', value: ledger ? fmt(ledger.total_paid) : '—', icon: '💰', bg: '#f3e6fa' },
    { label: 'Outstanding', value: ledger ? fmt(ledger.total_outstanding) : '—', icon: '⚠️', bg: '#fff5e6' },
  ];

  const QUICK = [
    { to: '/users',       label: '+ Add User' },
    { to: '/properties',  label: '+ Add Property' },
    { to: '/leases',      label: 'View Leases' },
    { to: '/payments',    label: 'Payment Report' },
  ];

  return (
    <div className="role-dashboard">
      <div className="role-dashboard__hero role-dashboard__hero--admin" data-emoji="⚙️">
        <h2 className="role-dashboard__greeting">Hello, {first} 👋</h2>
        <p className="role-dashboard__tagline">
          Full system access — here's an overview of platform health and activity.
        </p>
        <div className="role-dashboard__quick-actions">
          {QUICK.map(({ to, label }) => (
            <Link key={to} to={to} className="quick-action-btn">{label}</Link>
          ))}
        </div>
      </div>

      <div className="stat-grid">
        {STAT_CARDS.map(({ label, value, icon, bg }) => (
          <div className="stat-card" key={label}>
            <div className="stat-card__icon" style={{ background: bg }}>{icon}</div>
            <div className="stat-card__label">{label}</div>
            <div className="stat-card__value">
              {loading ? <span className="spinner" style={{ width: 20, height: 20 }} /> : value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-lg)' }}>
        {[
          { title: '⚙️ User Management', path: '/users', desc: 'Manage Admin, Landlord, and Tenant accounts.' },
          { title: '🏢 Properties', path: '/properties', desc: 'Monitor all registered properties and units.' },
          { title: '🔧 Maintenance', path: '/maintenance', desc: 'Assign and resolve open repair tickets.' },
        ].map(({ title, path, desc }) => (
          <div className="card" key={path}>
            <div className="card__header">
              <span className="card__title" style={{ fontSize: 'var(--font-size-md)' }}>{title}</span>
              <Link to={path} className="btn btn--ghost btn--sm">View →</Link>
            </div>
            <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
