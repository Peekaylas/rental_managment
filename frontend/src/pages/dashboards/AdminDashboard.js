import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/apiClient';
import StatusBadge from '../../components/common/StatusBadge';
import '../../assets/css/auth.css';

const QUICK_ACTIONS = [
  { to: '/users',      label: 'Manage Users', icon: '👥' },
  { to: '/properties', label: 'Global Portfolio', icon: '🌍' },
  { to: '/payments',   label: 'Financial Ledger', icon: '📊' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const first = user?.full_name?.split(' ')[0] ?? 'Admin';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewReason, setReviewReason] = useState('');
  const [selectedReview, setSelectedReview] = useState(null);

  
  const handleReviewAction = async (id, action) => {
    if (action === 'reject' && !selectedReview) {
      setSelectedReview(id);
      return;
    }
    
    try {
      await reviewPayment(id, action, reviewReason);
      setReviewReason('');
      setSelectedReview(null);
      // reload dashboard
      const fresh = await getAdminDashboard();
      setData(fresh);
    } catch(err) {
      alert("Failed to review payment");
    }
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await apiClient.get('/dashboard/admin');
        setData(res.data);
      } catch (err) {
        toast.error('Failed to load system dashboard metrics.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <span className="spinner" style={{ width: 30, height: 30 }} />
        <p style={{ marginTop: '16px', color: 'var(--color-text-muted)' }}>Loading system overview...</p>
      </div>
    );
  }

  if (!data) return null;

  const { metrics, recent_users, recent_transactions, urgent_tickets } = data;

  const STATS = [
    { label: 'Total Users', value: metrics.total_users, subtext: `${metrics.admins} Admins | ${metrics.landlords} Landlords | ${metrics.tenants} Tenants`, icon: '👥', bg: '#e6f9ef' },
    { label: 'System Properties', value: `${metrics.total_properties} Properties`, subtext: `${metrics.total_units} Total Units`, icon: '🏢', bg: '#eaf3fb' },
    { label: 'Platform Occupancy', value: `${metrics.occupancy_rate}%`, subtext: 'System-wide average', icon: '📈', bg: '#fef9e7' },
    { label: 'Total Volume', value: `KES ${metrics.total_volume.toLocaleString()}`, subtext: 'Total revenue processed', icon: '💰', bg: '#fff5e6' },
    { label: 'Active Issues', value: metrics.open_tickets, subtext: 'Total open maintenance tickets', icon: '🚨', bg: '#fdf2f0' },
  ];

  return (
    <div className="role-dashboard">
      {/* ── Header & Quick Actions ── */}
      <div className="page-header" style={{ alignItems: 'center', marginBottom: '24px' }}>
        <div className="page-header__left">
          <h2>System Administrator Overview 🛡️</h2>
          <p className="page-header__subtitle">
            Global platform metrics and moderation tools.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {QUICK_ACTIONS.map(({ to, label, icon }) => (
            <Link key={to} to={to} className="btn btn--outline" style={{ background: 'white' }}>
              <span style={{ marginRight: '6px' }}>{icon}</span> {label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Summary Metrics ── */}
      <div className="stat-grid" style={{ marginBottom: '32px' }}>
        {STATS.map(({ label, value, subtext, icon, bg }) => (
          <div className="stat-card" key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '20px' }}>
            <div className="stat-card__icon" style={{ background: bg, flexShrink: 0, width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', fontSize: '24px' }}>
              {icon}
            </div>
            <div>
              <div className="stat-card__label" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{label}</div>
              <div className="stat-card__value" style={{ fontSize: '24px', marginBottom: '4px' }}>{value}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{subtext}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Grids ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
        
        {/* Recent Registrations */}
        <div className="card">
          <div className="card__header">
            <span className="card__title">👤 Recent Registrations</span>
            <Link to="/users" className="btn btn--ghost btn--sm">Manage Users →</Link>
          </div>
          <div className="table-wrapper">
            <table className="data-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent_users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>{u.email}</div>
                    </td>
                    <td>
                      <span style={{ textTransform: 'capitalize' }}>{u.role}</span>
                    </td>
                    <td><StatusBadge value={u.status === 'Active' ? 'success' : 'danger'} label={u.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Oversight */}
        <div className="card">
          <div className="card__header">
            <span className="card__title">💸 Platform Transactions</span>
            <Link to="/payments" className="btn btn--ghost btn--sm">Full Ledger →</Link>
          </div>
          <div className="table-wrapper">
            <table className="data-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent_transactions.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{t.tenant}</td>
                    <td>KES {t.amount.toLocaleString()}</td>
                    <td><span style={{ textTransform: 'capitalize' }}>{t.method}</span></td>
                    <td><span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>STATUS: {t.status.toUpperCase()}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ── Escalated Tickets ── */}
      <div className="card">
        <div className="card__header" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
          <span className="card__title">🚨 Recent Maintenance Issues</span>
          <Link to="/maintenance" className="btn btn--ghost btn--sm">View All Issues →</Link>
        </div>
        <div style={{ padding: 'var(--spacing-md)' }}>
          {urgent_tickets.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No urgent issues on the platform.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {urgent_tickets.map(t => (
                <div key={t.id} style={{ border: '1px solid var(--color-danger)', background: '#fff5f5', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <StatusBadge value="urgent" label="URGENT" />
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>STATUS: {t.status.toUpperCase()}</span>
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-primary)', marginBottom: '4px', fontWeight: 700 }}>
                    {t.category ? t.category.replace('_', ' ') : 'OTHER'}
                  </div>
                  
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{t.title}</div>
                  
                  <div style={{ fontSize: '12px', color: 'var(--color-text)', marginBottom: '8px', lineHeight: 1.4 }}>
                    {t.description && t.description.length > 80 ? t.description.substring(0, 80) + '...' : t.description}
                  </div>
                  
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Property: {t.property}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                    Logged: {new Date(t.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
