import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/apiClient';
import StatusBadge from '../../components/common/StatusBadge';
import '../../assets/css/auth.css';

const QUICK_ACTIONS = [
  { to: '/properties', label: '+ Add Property', icon: '🏢' },
  { to: '/tenants',    label: '+ Onboard Tenant', icon: '👤' },
  { to: '/leases',     label: '+ Create Lease', icon: '📄' },
];

export default function LandlordDashboard() {
  const { user } = useAuth();
  const first = user?.full_name?.split(' ')[0] ?? 'Landlord';

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
      const fresh = await getLandlordDashboard();
      setData(fresh);
    } catch(err) {
      alert("Failed to review payment");
    }
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await apiClient.get('/dashboard/landlord');
        setData(res.data);
      } catch (err) {
        toast.error('Failed to load dashboard metrics.');
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
        <p style={{ marginTop: '16px', color: 'var(--color-text-muted)' }}>Loading your dashboard...</p>
      </div>
    );
  }

  if (!data) return null;

  const { metrics, recent_payments, recent_tickets, expiring_leases } = data;

  const STATS = [
    { label: 'Properties / Units', value: `${metrics.total_properties} / ${metrics.total_units}`, icon: '🏢', bg: '#e6f9ef' },
    { label: 'Occupancy Rate',     value: `${metrics.occupancy_rate}%`, icon: '✅', bg: '#eaf3fb' },
    { label: 'Monthly Revenue',    value: `KES ${metrics.monthly_revenue.toLocaleString()}`, icon: '💰', bg: '#e6f9ef' },
    { label: 'Pending Payments',   value: `KES ${metrics.pending_payments.toLocaleString()}`, icon: '⏳', bg: '#fff5e6' },
    { label: 'Overdue Amount',     value: `KES ${metrics.overdue_amount.toLocaleString()}`, icon: '⚠️', bg: '#fdf2f0' },
    { label: 'Open Tickets',       value: metrics.open_tickets, icon: '🔧', bg: '#f3e6fa' },
  ];

  return (
    <div className="role-dashboard">
      {/* ── Header & Quick Actions ── */}
      <div className="page-header" style={{ alignItems: 'center', marginBottom: '24px' }}>
        <div className="page-header__left">
          <h2>Welcome back, {first} 🏡</h2>
          <p className="page-header__subtitle">
            Here's what's happening with your properties today.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {QUICK_ACTIONS.map(({ to, label, icon }) => (
            <Link key={to} to={to} className="btn btn--primary">
              <span style={{ marginRight: '6px' }}>{icon}</span> {label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Summary Metrics ── */}
      <div className="stat-grid" style={{ marginBottom: '32px' }}>
        {STATS.map(({ label, value, icon, bg }) => (
          <div className="stat-card" key={label} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="stat-card__icon" style={{ background: bg, flexShrink: 0, width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', fontSize: '24px' }}>
              {icon}
            </div>
            <div>
              <div className="stat-card__label" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{label}</div>
              <div className="stat-card__value" style={{ fontSize: '20px' }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Grids ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
        
        {/* Financial Ledger */}
        <div className="card">
          <div className="card__header">
            <span className="card__title">💳 Recent Rent Payments</span>
            <Link to="/payments" className="btn btn--ghost btn--sm">View Ledger →</Link>
          </div>
          <div className="table-wrapper">
            <table className="data-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Tenant & Unit</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent_payments.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.tenant_name}</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>{p.unit}</div>
                    </td>
                    <td>KES {p.amount_due.toLocaleString()}</td>
                    <td>{new Date(p.due_date).toLocaleDateString()}</td>
                    <td><StatusBadge value={p.status} /></td>
                  </tr>
                ))}
                {recent_payments.length === 0 && (
                  <tr><td colSpan="4" style={{ textAlign: 'center' }}>No recent payments.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Maintenance Feed */}
        <div className="card">
          <div className="card__header">
            <span className="card__title">🔧 Active Maintenance</span>
            <Link to="/maintenance" className="btn btn--ghost btn--sm">View Board →</Link>
          </div>
          <div style={{ padding: 'var(--spacing-md)' }}>
            {recent_tickets.length === 0 ? (
              <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No active maintenance tickets.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recent_tickets.map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-primary)', marginBottom: '4px', fontWeight: 700 }}>{t.category ? t.category.replace('_', ' ') : 'OTHER'}</div>
                      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{t.title}</div><div style={{ fontSize: '12px', color: 'var(--color-text)', marginBottom: '8px', lineHeight: 1.4 }}>{t.description.length > 60 ? t.description.substring(0, 60) + '...' : t.description}</div>
                      <div className="text-muted" style={{ fontSize: '12px' }}>{t.unit} • <StatusBadge value={t.priority} /></div>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>STATUS: {t.status.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Lease Alerts ── */}
      <div className="card">
        <div className="card__header" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
          <span className="card__title">⚠️ Lease Alerts (Expiring in 60 days)</span>
          <Link to="/leases" className="btn btn--ghost btn--sm">Manage Leases →</Link>
        </div>
        <div style={{ padding: 'var(--spacing-md)' }}>
          {expiring_leases.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No leases expiring soon.</p>
          ) : (
            <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
              {expiring_leases.map(l => (
                <div key={l.id} style={{ flexShrink: 0, width: '250px', background: l.days_left < 15 ? '#fdf2f0' : '#fff9f0', border: `1px solid ${l.days_left < 15 ? 'var(--color-danger)' : 'var(--color-warning)'}`, borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontWeight: 600, marginBottom: '8px' }}>{l.tenant_name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>Unit: {l.unit}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: l.days_left < 15 ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                      {l.days_left} days left
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{new Date(l.end_date).toLocaleDateString()}</span>
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
