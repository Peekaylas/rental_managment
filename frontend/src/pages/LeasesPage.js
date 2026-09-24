import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getLeases, createLease, updateLeaseStatus, activateLease, getMyLease } from '../services/leaseApi';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import '../assets/css/modules.css';

export default function LeasesPage() {
  const { user } = useAuth();
  const isAdminOrLandlord = ['admin', 'landlord'].includes(user?.role);
  
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    tenant_id: '', unit_id: '', start_date: '', end_date: '',
    monthly_rent: '', security_deposit: '', rent_due_day: 1, special_conditions: ''
  });

  const [confirmState, setConfirmState] = useState({ isOpen: false, leaseId: null, action: null });

  const fetchLeases = async () => {
    setLoading(true);
    try {
      if (isAdminOrLandlord) {
        const data = await getLeases(statusFilter ? { status: statusFilter } : {});
        setLeases(data);
      } else {
        const data = await getMyLease();
        setLeases(data ? [data] : []);
      }
    } catch (err) {
      toast.error(err.friendlyMessage || 'Failed to fetch leases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeases();
  }, [statusFilter, isAdminOrLandlord]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createLease(form);
      toast.success('Lease created');
      setIsModalOpen(false);
      fetchLeases();
    } catch (err) {
      toast.error(err.friendlyMessage || 'Error creating lease');
    }
  };

  const handleAction = async () => {
    const { leaseId, action } = confirmState;
    try {
      if (action === 'activate') {
        await activateLease(leaseId);
        toast.success('Lease activated');
      } else if (action === 'terminate') {
        await updateLeaseStatus(leaseId, 'terminated');
        toast.success('Lease terminated');
      }
      fetchLeases();
    } catch (err) {
      toast.error(err.friendlyMessage || 'Action failed');
    } finally {
      setConfirmState({ isOpen: false, leaseId: null, action: null });
    }
  };

  if (!isAdminOrLandlord) {
    if (loading) return <div style={{textAlign: 'center'}}><span className="spinner" /></div>;
    if (leases.length === 0) return <EmptyState icon="📄" title="No Active Lease" description="You do not have any active leases." />;
    
    const lease = leases[0];
    return (
      <div className="page-content">
        <div className="page-header">
          <div className="page-header__left">
            <h2>My Active Lease</h2>
          </div>
        </div>
        <div className="card" style={{padding: 'var(--spacing-xl)'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-lg)'}}>
            <h3>{lease.unit?.property_name} - Unit {lease.unit?.unit_number}</h3>
            <StatusBadge value={lease.status} />
          </div>
          <div className="form-grid">
            <div><p className="form-label">Start Date</p><p>{new Date(lease.start_date).toLocaleDateString()}</p></div>
            <div><p className="form-label">End Date</p><p>{new Date(lease.end_date).toLocaleDateString()}</p></div>
            <div><p className="form-label">Monthly Rent</p><p>KES {parseFloat(lease.monthly_rent).toLocaleString()}</p></div>
            <div><p className="form-label">Security Deposit</p><p>KES {parseFloat(lease.security_deposit).toLocaleString()}</p></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header__left">
          <h2>Lease Agreements</h2>
        </div>
        <button className="btn btn--primary" onClick={() => {
          setForm({tenant_id: '', unit_id: '', start_date: '', end_date: '', monthly_rent: '', security_deposit: '', rent_due_day: 1, special_conditions: ''});
          setIsModalOpen(true);
        }}>+ New Lease</button>
      </div>

      <div className="filter-bar">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="terminated">Terminated</option>
        </select>
      </div>

      <div className="card table-wrapper">
        {loading ? <div style={{padding: 'var(--spacing-xl)', textAlign: 'center'}}><span className="spinner" /></div> : (
          leases.length === 0 ? (
            <EmptyState icon="📄" title="No Leases Found" />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Unit</th>
                  <th>Period</th>
                  <th>Rent (KES)</th>
                  <th>Status</th>
                  <th className="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leases.map(lease => (
                  <tr key={lease.id}>
                    <td>{lease.tenant?.user?.full_name || "Unknown Tenant"}</td>
                    <td>{lease.unit?.property_name} - {lease.unit?.unit_number}</td>
                    <td>
                      <div style={{fontSize: '12px'}}>{new Date(lease.start_date).toLocaleDateString()} - {new Date(lease.end_date).toLocaleDateString()}</div>
                    </td>
                    <td>{parseFloat(lease.monthly_rent).toLocaleString()}</td>
                    <td><StatusBadge value={lease.status} /></td>
                    <td className="actions-col">
                      {lease.status === 'pending' && (
                        <button className="btn btn--sm btn--primary" onClick={() => setConfirmState({isOpen: true, leaseId: lease.id, action: 'activate'})}>Activate</button>
                      )}
                      {lease.status === 'active' && (
                        <button className="btn btn--sm btn--danger" onClick={() => setConfirmState({isOpen: true, leaseId: lease.id, action: 'terminate'})}>Terminate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Lease" size="wide">
        <form onSubmit={handleCreate}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Tenant ID (UUID)</label>
              <input required className="form-control" value={form.tenant_id} onChange={e => setForm({...form, tenant_id: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Unit ID (UUID)</label>
              <input required className="form-control" value={form.unit_id} onChange={e => setForm({...form, unit_id: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input required type="date" className="form-control" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input required type="date" className="form-control" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Monthly Rent (KES)</label>
              <input required type="number" className="form-control" value={form.monthly_rent} onChange={e => setForm({...form, monthly_rent: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Security Deposit (KES)</label>
              <input required type="number" className="form-control" value={form.security_deposit} onChange={e => setForm({...form, security_deposit: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Rent Due Day</label>
              <input required type="number" min="1" max="28" className="form-control" value={form.rent_due_day} onChange={e => setForm({...form, rent_due_day: e.target.value})} />
            </div>
            <div className="form-group col-span-2">
              <label className="form-label">Special Conditions</label>
              <textarea className="form-control" rows="2" value={form.special_conditions} onChange={e => setForm({...form, special_conditions: e.target.value})}></textarea>
            </div>
          </div>
          <div style={{marginTop: 'var(--spacing-lg)', textAlign: 'right'}}>
            <button type="submit" className="btn btn--primary">Create Lease</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({isOpen: false, leaseId: null, action: null})}
        onConfirm={handleAction}
        title={confirmState.action === 'activate' ? 'Activate Lease' : 'Terminate Lease'}
        message={`Are you sure you want to ${confirmState.action} this lease?`}
        danger={confirmState.action === 'terminate'}
        confirmLabel={confirmState.action === 'activate' ? 'Activate' : 'Terminate'}
      />
    </div>
  );
}
