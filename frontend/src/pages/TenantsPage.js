import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getTenants, updateTenant, getMyTenantProfile } from '../services/tenantApi';
import apiClient from '../services/apiClient';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import '../assets/css/modules.css';

export default function TenantsPage() {
  const { user } = useAuth();
  const isLandlordOrAdmin = ['admin', 'landlord'].includes(user?.role);
  
  const [tenants, setTenants] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [inviteResult, setInviteResult] = useState(null); // holds the generated token after invite
  const [form, setForm] = useState({
    invite_name: '', invite_email: '', invite_phone: '',
    national_id: '', date_of_birth: '',
    employment_status: 'employed', employer_name: '', monthly_income: '',
    emergency_contact_name: '', emergency_contact_phone: '', notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isLandlordOrAdmin) {
        const data = await getTenants();
        setTenants(data);
      } else {
        const data = await getMyTenantProfile();
        setMyProfile(data);
      }
    } catch (err) {
      toast.error(err.friendlyMessage || 'Failed to fetch tenant data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isLandlordOrAdmin]);

  const openModal = (tenant = null) => {
    if (tenant) {
      setEditingTenant(tenant);
      setForm({
        invite_name: '', invite_email: '', invite_phone: '',
        national_id: tenant.national_id || '',
        date_of_birth: tenant.date_of_birth ? tenant.date_of_birth.split('T')[0] : '',
        employment_status: tenant.employment_status || 'employed',
        employer_name: tenant.employer_name || '',
        monthly_income: tenant.monthly_income || '',
        emergency_contact_name: tenant.emergency_contact_name || '',
        emergency_contact_phone: tenant.emergency_contact_phone || '',
        notes: tenant.notes || ''
      });
    } else {
      setEditingTenant(null);
      setInviteResult(null);
      setForm({
        invite_name: '', invite_email: '', invite_phone: '',
        national_id: '', date_of_birth: '',
        employment_status: 'employed', employer_name: '', monthly_income: '',
        emergency_contact_name: '', emergency_contact_phone: '', notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTenant) {
        // Editing existing profile — update fields only
        await updateTenant(editingTenant.id, {
          national_id: form.national_id,
          date_of_birth: form.date_of_birth || null,
          employment_status: form.employment_status,
          employer_name: form.employer_name,
          monthly_income: form.monthly_income ? parseFloat(form.monthly_income) : null,
          emergency_contact_name: form.emergency_contact_name,
          emergency_contact_phone: form.emergency_contact_phone,
          notes: form.notes,
        });
        toast.success('Tenant profile updated');
        setIsModalOpen(false);
        fetchData();
      } else {
        // New tenant — send an invite, then show the token
        if (!form.invite_name.trim() || !form.invite_email.trim()) {
          toast.error('Name and email are required to invite a tenant.');
          return;
        }
        const res = await apiClient.post('/invites/', {
          email: form.invite_email.trim().toLowerCase(),
          full_name: form.invite_name.trim(),
          phone_number: form.invite_phone || null,
        });
        setInviteResult(res.data);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || err.friendlyMessage || 'Error saving tenant');
    }
  };

  if (!isLandlordOrAdmin) {
    if (loading) return <div style={{textAlign: 'center'}}><span className="spinner" /></div>;
    if (!myProfile) return <EmptyState icon="👤" title="No Profile" description="Your tenant profile has not been created yet." />;
    
    return (
      <div className="page-content">
        <div className="page-header">
          <div className="page-header__left">
            <h2>My Profile</h2>
          </div>
          <button className="btn btn--outline" onClick={() => openModal(myProfile)}>Edit Profile</button>
        </div>
        <div className="card" style={{padding: 'var(--spacing-xl)'}}>
          <div className="form-grid">
            <div>
              <p className="form-label">National ID</p>
              <p>{myProfile.national_id || '-'}</p>
            </div>
            <div>
              <p className="form-label">Employment Status</p>
              <StatusBadge value={myProfile.employment_status} />
            </div>
            <div>
              <p className="form-label">Employer</p>
              <p>{myProfile.employer_name || '-'}</p>
            </div>
            <div>
              <p className="form-label">Emergency Contact</p>
              <p>{myProfile.emergency_contact_name} ({myProfile.emergency_contact_phone})</p>
            </div>
          </div>
        </div>
        
        {/* Same modal for editing own profile */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Edit Profile">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">National ID</label>
                <input className="form-control" value={form.national_id} onChange={e => setForm({...form, national_id: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input type="date" className="form-control" value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Employment Status</label>
                <select className="form-control" value={form.employment_status} onChange={e => setForm({...form, employment_status: e.target.value})}>
                  <option value="employed">Employed</option>
                  <option value="self_employed">Self Employed</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="student">Student</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Employer Name</label>
                <input className="form-control" value={form.employer_name} onChange={e => setForm({...form, employer_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Income (KES)</label>
                <input type="number" className="form-control" value={form.monthly_income} onChange={e => setForm({...form, monthly_income: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Emergency Contact Name</label>
                <input className="form-control" value={form.emergency_contact_name} onChange={e => setForm({...form, emergency_contact_name: e.target.value})} />
              </div>
              <div className="form-group col-span-2">
                <label className="form-label">Emergency Contact Phone</label>
                <input className="form-control" value={form.emergency_contact_phone} onChange={e => setForm({...form, emergency_contact_phone: e.target.value})} />
              </div>
            </div>
            <div style={{marginTop: 'var(--spacing-lg)', textAlign: 'right'}}>
              <button type="submit" className="btn btn--primary">Save</button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  const filteredTenants = tenants.filter(t => {
    const term = searchTerm.toLowerCase();
    return (t.user?.full_name || '').toLowerCase().includes(term) ||
           (t.user?.email || '').toLowerCase().includes(term) ||
           (t.national_id || '').toLowerCase().includes(term);
  });

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header__left">
          <h2>Tenants</h2>
        </div>
        <button className="btn btn--primary" onClick={() => openModal()}>+ Add Tenant</button>
      </div>

      <div className="filter-bar">
        <div className="filter-bar__search">
          <span className="filter-bar__search-icon">🔍</span>
          <input 
            className="form-control search-input" 
            placeholder="Search by name, email or ID..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card table-wrapper">
        {loading ? <div style={{padding: 'var(--spacing-xl)', textAlign: 'center'}}><span className="spinner" /></div> : (
          filteredTenants.length === 0 ? (
            <EmptyState icon="👥" title="No Tenants Found" />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>National ID</th>
                  <th>Employment</th>
                  <th>Income</th>
                  <th className="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map(tenant => (
                  <tr key={tenant.id}>
                    <td>
                      <div style={{fontWeight: 600}}>{tenant.user?.full_name}</div>
                      <div style={{fontSize: '12px', color: 'var(--color-text-muted)'}}>{tenant.user?.email}</div>
                    </td>
                    <td>{tenant.user?.phone_number || '-'}</td>
                    <td>{tenant.national_id || '-'}</td>
                    <td><StatusBadge value={tenant.employment_status} /></td>
                    <td>{tenant.monthly_income ? `KES ${parseFloat(tenant.monthly_income).toLocaleString()}` : '-'}</td>
                    <td className="actions-col">
                      <button className="btn btn--sm btn--outline" onClick={() => openModal(tenant)}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTenant ? "Edit Tenant Profile" : "Invite New Tenant"} size="wide">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {!editingTenant && (
              <div className="col-span-2" style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-md)',
                marginBottom: 'var(--spacing-md)'
              }}>
                <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 4 }}>
                  ✉️ How this works
                </p>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
                  Enter the tenant's name and email below. The system will create their account and generate a secure invite token. Share that token with them — they use it on the Register page to set their own password and activate their account.
                </p>
              </div>
            )}
            {!editingTenant && (
              <>
                <div className="form-group">
                  <label className="form-label">Tenant Full Name *</label>
                  <input required className="form-control" placeholder="e.g. Jane Mwangi"
                    value={form.invite_name || ''} onChange={e => setForm({...form, invite_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tenant Email *</label>
                  <input required type="email" className="form-control" placeholder="jane@example.com"
                    value={form.invite_email || ''} onChange={e => setForm({...form, invite_email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number (optional)</label>
                  <input className="form-control" placeholder="+254 7XX XXX XXX"
                    value={form.invite_phone || ''} onChange={e => setForm({...form, invite_phone: e.target.value})} />
                </div>
                <div className="form-group" />
              </>
            )}
            <div className="form-group">
              <label className="form-label">National ID</label>
              <input required className="form-control" value={form.national_id} onChange={e => setForm({...form, national_id: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input type="date" className="form-control" value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Employment Status</label>
              <select className="form-control" value={form.employment_status} onChange={e => setForm({...form, employment_status: e.target.value})}>
                <option value="employed">Employed</option>
                <option value="self_employed">Self Employed</option>
                <option value="unemployed">Unemployed</option>
                <option value="student">Student</option>
                <option value="retired">Retired</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Employer Name</label>
              <input className="form-control" value={form.employer_name} onChange={e => setForm({...form, employer_name: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Monthly Income (KES)</label>
              <input type="number" className="form-control" value={form.monthly_income} onChange={e => setForm({...form, monthly_income: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Emergency Contact Name</label>
              <input className="form-control" value={form.emergency_contact_name} onChange={e => setForm({...form, emergency_contact_name: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Emergency Contact Phone</label>
              <input className="form-control" value={form.emergency_contact_phone} onChange={e => setForm({...form, emergency_contact_phone: e.target.value})} />
            </div>
            <div className="form-group col-span-2">
              <label className="form-label">Notes</label>
              <textarea className="form-control" rows="2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}></textarea>
            </div>
          </div>

          {/* Show invite token result after successful invite creation */}
          {inviteResult ? (
            <div style={{
              background: '#e6f9ef', border: '1px solid #27ae60', borderRadius: 'var(--radius-md)',
              padding: 'var(--spacing-lg)', marginTop: 'var(--spacing-lg)'
            }}>
              <p style={{ fontWeight: 700, color: '#1a6b3c', marginBottom: 8 }}>
                ✅ Invite sent for {inviteResult.message.split('for ')[1]?.split('.')[0]}
              </p>
              <p style={{ fontSize: 'var(--font-size-sm)', color: '#2d6a4f', marginBottom: 12 }}>
                Share this token with the tenant. They paste it on the Register page under "I Have an Invite" to set their password and activate their account.
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <code style={{
                  flex: 1, background: 'white', border: '1px solid #27ae60',
                  borderRadius: 6, padding: '8px 12px', fontSize: 12,
                  wordBreak: 'break-all', fontFamily: 'monospace'
                }}>
                  {inviteResult.invite_token}
                </code>
                <button type="button" className="btn btn--outline btn--sm"
                  onClick={() => { navigator.clipboard.writeText(inviteResult.invite_token); toast.success('Token copied!'); }}>
                  Copy
                </button>
              </div>
              <button type="button" className="btn btn--primary" style={{ marginTop: 16, width: '100%' }}
                onClick={() => setIsModalOpen(false)}>
                Done
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 'var(--spacing-lg)', textAlign: 'right' }}>
              <button type="submit" className="btn btn--primary">
                {editingTenant ? 'Save Changes' : '✉️ Send Invite'}
              </button>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
