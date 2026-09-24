import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getPayments, createPaymentEntry, recordPayment, getLedgerSummary, getOverduePayments, getMyPayments, submitPayment, reviewPayment } from '../services/paymentApi';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import '../assets/css/modules.css';

export default function PaymentsPage() {
  const { user } = useAuth();
  const isAdminOrLandlord = ['admin', 'landlord'].includes(user?.role);
  
  const [activeTab, setActiveTab] = useState('all');
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [recordForm, setRecordForm] = useState({
    amount_paid: '', payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'mpesa', transaction_reference: '', notes: ''
  });

  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    amount_paid: '', payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'mpesa', transaction_reference: '', receipt_url: '', notes: ''
  });
  const [chargeForm, setChargeForm] = useState({
    lease_id: '', amount_due: '', due_date: '', period_start: '', period_end: '', notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isAdminOrLandlord) {
        if (activeTab === 'all') {
          const [payData, sumData] = await Promise.all([getPayments(), getLedgerSummary()]);
          setPayments(payData);
          setSummary(sumData);
        } else if (activeTab === 'overdue') {
          const data = await getOverduePayments();
          setPayments(data);
        }
      } else {
        const data = await getMyPayments();
        setPayments(data);
      }
    } catch (err) {
      toast.error(err.friendlyMessage || 'Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, isAdminOrLandlord]);

  
  
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
      fetchData();
      toast.success("Payment reviewed successfully");
    } catch(err) {
      toast.error("Failed to review payment");
    }
  };

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
      fetchData();
    } catch(err) {
      toast.error("Failed to submit payment");
    }
  };

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    try {
      await recordPayment(selectedPaymentId, recordForm);
      toast.success('Payment recorded');
      setIsRecordModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.friendlyMessage || 'Error recording payment');
    }
  };

  const handleChargeSubmit = async (e) => {
    e.preventDefault();
    try {
      await createPaymentEntry(chargeForm);
      toast.success('Charge created');
      setIsChargeModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.friendlyMessage || 'Error creating charge');
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header__left">
          <h2>Payments</h2>
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

      {isAdminOrLandlord && (
          <button className="btn btn--primary" onClick={() => {
            setChargeForm({lease_id: '', amount_due: '', due_date: '', period_start: '', period_end: '', notes: ''});
            setIsChargeModalOpen(true);
          }}>+ New Charge</button>
        )}
      </div>

      {isAdminOrLandlord && summary && activeTab === 'all' && (
        <div className="ledger-summary">
          <div className="ledger-card">
            <div className="ledger-card__label">Total Billed</div>
            <div className="ledger-card__value">KES {parseFloat(summary.total_billed || 0).toLocaleString()}</div>
          </div>
          <div className="ledger-card ledger-card--collected">
            <div className="ledger-card__label">Collected</div>
            <div className="ledger-card__value">KES {parseFloat(summary.total_paid || 0).toLocaleString()}</div>
          </div>
          <div className="ledger-card ledger-card--outstanding">
            <div className="ledger-card__label">Outstanding</div>
            <div className="ledger-card__value">KES {parseFloat(summary.total_outstanding || 0).toLocaleString()}</div>
          </div>
          <div className="ledger-card">
            <div className="ledger-card__label">Overdue</div>
            <div className="ledger-card__value" style={{color: 'var(--color-danger)'}}>{summary.overdue_count || 0} bills</div>
          </div>
        </div>
      )}

      {isAdminOrLandlord && (
        <div className="tab-bar">
          <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All Payments</button>
          <button className={`tab-btn ${activeTab === 'overdue' ? 'active' : ''}`} onClick={() => setActiveTab('overdue')}>Overdue</button>
        </div>
      )}

      <div className="card table-wrapper">
        {loading ? <div style={{padding: 'var(--spacing-xl)', textAlign: 'center'}}><span className="spinner" /></div> : (
          payments.length === 0 ? (
            <EmptyState icon="💳" title="No Payments" description="No payment records found." />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period / Date</th>
                  <th>Due</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  {isAdminOrLandlord && <th className="actions-col">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{fontSize: '12px', fontWeight: 600}}>{new Date(p.period_start).toLocaleDateString()} - {new Date(p.period_end).toLocaleDateString()}</div>
                      <div style={{fontSize: '11px', color: 'var(--color-text-muted)'}}>Due: {new Date(p.due_date).toLocaleDateString()}</div>
                    </td>
                    <td>KES {parseFloat(p.amount_due).toLocaleString()}</td>
                    <td>KES {parseFloat(p.amount_paid).toLocaleString()}</td>
                    <td style={{fontWeight: 600, color: parseFloat(p.balance) > 0 ? 'var(--color-danger)' : 'var(--color-success)'}}>
                      KES {parseFloat(p.balance).toLocaleString()}
                    </td>
                    <td>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between'}}>
                        <StatusBadge value={p.status} />
                        {!isAdminOrLandlord && ['pending', 'partial', 'failed', 'overdue'].includes(p.status) && (
                          <button className="btn btn--primary btn--sm" onClick={() => openSubmitModal(p.id, p.balance)}>Pay Now</button>
                        )}
                      </div>
                    </td>
                    {isAdminOrLandlord && (
                      <td className="actions-col">
                        {p.status === 'under_review' ? (
                          selectedReview === p.id ? (
                            <div style={{display: 'flex', gap: '4px', justifyContent: 'flex-end', flexDirection: 'column'}}>
                              <input type="text" placeholder="Reason..." className="form-control" style={{padding: '4px', fontSize: '11px'}} value={reviewReason} onChange={e=>setReviewReason(e.target.value)} />
                              <div style={{display: 'flex', gap: '4px'}}>
                                <button className="btn btn--danger btn--sm" style={{flex: 1}} onClick={() => handleReviewAction(p.id, 'reject')}>Confirm</button>
                                <button className="btn btn--ghost btn--sm" onClick={() => setSelectedReview(null)}>X</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{display: 'flex', gap: '4px', justifyContent: 'flex-end'}}>
                              <button className="btn btn--success btn--sm" onClick={() => handleReviewAction(p.id, 'approve')}>Approve</button>
                              <button className="btn btn--outline btn--sm" onClick={() => handleReviewAction(p.id, 'reject')}>Reject</button>
                            </div>
                          )
                        ) : (
                          p.status !== 'completed' && (
                            <button className="btn btn--sm btn--outline" onClick={() => {
                              setSelectedPaymentId(p.id);
                              setRecordForm({...recordForm, amount_paid: p.balance});
                              setIsRecordModalOpen(true);
                            }}>Record Manual</button>
                          )
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {isAdminOrLandlord && (
        <>
          <Modal isOpen={isRecordModalOpen} onClose={() => setIsRecordModalOpen(false)} title="Record Payment">
            <form onSubmit={handleRecordSubmit}>
              <div className="form-group">
                <label className="form-label">Amount Paid</label>
                <input required type="number" className="form-control" value={recordForm.amount_paid} onChange={e => setRecordForm({...recordForm, amount_paid: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Date</label>
                <input required type="date" className="form-control" value={recordForm.payment_date} onChange={e => setRecordForm({...recordForm, payment_date: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-control" value={recordForm.payment_method} onChange={e => setRecordForm({...recordForm, payment_method: e.target.value})}>
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Transaction Ref</label>
                <input className="form-control" value={recordForm.transaction_reference} onChange={e => setRecordForm({...recordForm, transaction_reference: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows="2" value={recordForm.notes} onChange={e => setRecordForm({...recordForm, notes: e.target.value})}></textarea>
              </div>
              <div style={{marginTop: 'var(--spacing-lg)', textAlign: 'right'}}>
                <button type="submit" className="btn btn--primary">Save Payment</button>
              </div>
            </form>
          </Modal>

          <Modal isOpen={isChargeModalOpen} onClose={() => setIsChargeModalOpen(false)} title="New Charge">
            <form onSubmit={handleChargeSubmit}>
              <div className="form-group">
                <label className="form-label">Lease ID (UUID)</label>
                <input required className="form-control" value={chargeForm.lease_id} onChange={e => setChargeForm({...chargeForm, lease_id: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Amount Due</label>
                <input required type="number" className="form-control" value={chargeForm.amount_due} onChange={e => setChargeForm({...chargeForm, amount_due: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input required type="date" className="form-control" value={chargeForm.due_date} onChange={e => setChargeForm({...chargeForm, due_date: e.target.value})} />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Period Start</label>
                  <input required type="date" className="form-control" value={chargeForm.period_start} onChange={e => setChargeForm({...chargeForm, period_start: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Period End</label>
                  <input required type="date" className="form-control" value={chargeForm.period_end} onChange={e => setChargeForm({...chargeForm, period_end: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows="2" value={chargeForm.notes} onChange={e => setChargeForm({...chargeForm, notes: e.target.value})}></textarea>
              </div>
              <div style={{marginTop: 'var(--spacing-lg)', textAlign: 'right'}}>
                <button type="submit" className="btn btn--primary">Create Charge</button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </div>
  );
}
