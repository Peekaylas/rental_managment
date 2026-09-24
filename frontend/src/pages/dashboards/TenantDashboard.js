import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getTenantDashboard } from '../../services/dashboardApi';
import StatusBadge from '../../components/common/StatusBadge';
import { submitPayment } from '../../services/paymentApi';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';
import '../../assets/css/auth.css';

export default function TenantDashboard() {
  const { user } = useAuth();
  const first = user?.full_name?.split(' ')[0] ?? 'Tenant';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [submitForm, setSubmitForm] = useState({
    amount_paid: '', payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'mpesa', transaction_reference: '', receipt_url: '', notes: ''
  });
  
  const openSubmitModal = (id, amount) => {
    setSelectedPaymentId(id);
    setSubmitForm({ ...submitForm, amount_paid: amount });
    setIsSubmitModalOpen(true);
  };

  const handleTenantSubmit = async (e) => {
    e.preventDefault();
    try {
      await submitPayment(selectedPaymentId, {
        ...submitForm,
        amount_paid: parseFloat(submitForm.amount_paid)
      });
      toast.success("Payment submitted for review");
      setIsSubmitModalOpen(false);
      // reload
      const fresh = await getTenantDashboard();
      setData(fresh);
    } catch(err) {
      toast.error("Failed to submit payment");
    }
  };

  useEffect(() => {
    getTenantDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}><span className="spinner" /></div>;
  }

  const metrics = data?.metrics || {};
  const recentPayments = data?.recent_payments || [];
  const recentTickets = data?.recent_tickets || [];

  const TENANT_STATS = [
    { label: 'Monthly Rent',    value: metrics.monthly_rent ? `KES ${metrics.monthly_rent.toLocaleString()}` : 'KES —', icon: '💳', bg: '#eaf3fb' },
    { label: 'Balance Due',     value: metrics.balance_due ? `KES ${metrics.balance_due.toLocaleString()}` : 'KES 0', icon: '⚠️', bg: '#fdf2f0' },
    { label: 'Lease Expires',   value: metrics.lease_expires ? new Date(metrics.lease_expires).toLocaleDateString() : '—',     icon: '📅', bg: '#fef9e7' },
    { label: 'Open Tickets',    value: metrics.open_tickets ?? '—',     icon: '🔧', bg: '#f3e6fa' },
  ];

  return (
    <>
    <div className="role-dashboard">
      <div className="role-dashboard__hero role-dashboard__hero--tenant" data-emoji="🏠">
        <h2 className="role-dashboard__greeting">Hi, {first} 👋</h2>
        <p className="role-dashboard__tagline">
          Track your rent, lease, and maintenance requests — all in one place.
        </p>
        <div className="role-dashboard__quick-actions">
          <Link to="/payments" className="quick-action-btn">💳 Pay Rent</Link>
          <Link to="/maintenance" className="quick-action-btn">🔧 Report Issue</Link>
          <Link to="/leases" className="quick-action-btn">📄 My Lease</Link>
        </div>
      </div>

      <div className="stat-grid">
        {TENANT_STATS.map(({ label, value, icon, bg }) => (
          <div className="stat-card" key={label}>
            <div className="stat-card__icon" style={{ background: bg }}>{icon}</div>
            <div className="stat-card__label">{label}</div>
            <div className="stat-card__value">{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
        {/* Payments Card */}
        <div className="card">
          <div className="card__header">
            <span className="card__title">💳 Recent Payments</span>
            <Link to="/payments" className="btn btn--ghost btn--sm">View all →</Link>
          </div>
          {recentPayments.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>No recent payments found.</p>
          ) : (
            <table className="data-table" style={{ fontSize: 'var(--font-size-sm)' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map(p => (
                  <tr key={p.id}>
                    <td>{new Date(p.due_date).toLocaleDateString()}</td>
                    <td>KES {p.amount_due.toLocaleString()}</td>
                    <td>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between'}}>
                        <StatusBadge value={p.status} />
                        {['pending', 'partial', 'failed', 'overdue'].includes(p.status) && (
                          <button className="btn btn--primary btn--sm" onClick={() => openSubmitModal(p.id, p.balance)}>Pay</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Tickets Card */}
        <div className="card">
          <div className="card__header">
            <span className="card__title">🔧 Recent Maintenance</span>
            <Link to="/maintenance" className="btn btn--ghost btn--sm">View all →</Link>
          </div>
          {recentTickets.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>No recent maintenance tickets.</p>
          ) : (
            <table className="data-table" style={{ fontSize: 'var(--font-size-sm)' }}>
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTickets.map(t => (
                  <tr key={t.id}>
                    <td>{t.title}</td>
                    <td><StatusBadge value={t.priority} /></td>
                    <td><StatusBadge value={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>

      {/* Tenant Submit Payment Modal */}
      <Modal isOpen={isSubmitModalOpen} onClose={() => setIsSubmitModalOpen(false)} title="Submit Payment">
        <form onSubmit={handleTenantSubmit}>
          <div className="form-group">
            <label className="form-label">Amount Paid</label>
            <input required type="number" className="form-control" value={submitForm.amount_paid} onChange={e => setSubmitForm({...submitForm, amount_paid: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Payment Date</label>
            <input required type="date" className="form-control" value={submitForm.payment_date} onChange={e => setSubmitForm({...submitForm, payment_date: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Method</label>
            <select className="form-control" value={submitForm.payment_method} onChange={e => setSubmitForm({...submitForm, payment_method: e.target.value})}>
              <option value="mpesa">M-Pesa</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Transaction/Reference Code</label>
            <input required type="text" className="form-control" value={submitForm.transaction_reference} onChange={e => setSubmitForm({...submitForm, transaction_reference: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Receipt/Proof URL (Optional)</label>
            <input type="text" className="form-control" placeholder="https://..." value={submitForm.receipt_url} onChange={e => setSubmitForm({...submitForm, receipt_url: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes (Optional)</label>
            <textarea className="form-control" rows="2" value={submitForm.notes} onChange={e => setSubmitForm({...submitForm, notes: e.target.value})}></textarea>
          </div>
          <div style={{marginTop: 'var(--spacing-lg)', textAlign: 'right'}}>
            <button type="submit" className="btn btn--primary">Submit for Review</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
