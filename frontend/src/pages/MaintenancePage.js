import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getTickets, createTicket, updateTicketStatus, assignTicket, getTicketStats, getMyTickets } from '../services/maintenanceApi';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import '../assets/css/modules.css';

export default function MaintenancePage() {
  const { user } = useAuth();
  const isAdminOrLandlord = ['admin', 'landlord'].includes(user?.role);
  
  const [viewMode, setViewMode] = useState('board');
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    unit_id: '', title: '', description: '', category: 'plumbing', priority: 'medium'
  });

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: '', resolution_notes: '', actual_cost: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isAdminOrLandlord) {
        const [tickData, statData] = await Promise.all([getTickets(), getTicketStats()]);
        setTickets(tickData);
        setStats(statData);
      } else {
        const data = await getMyTickets();
        setTickets(data);
      }
    } catch (err) {
      toast.error(err.friendlyMessage || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAdminOrLandlord]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createTicket(form);
      toast.success('Ticket created');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.friendlyMessage || 'Error creating ticket');
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    try {
      await updateTicketStatus(selectedTicket.id, statusForm);
      toast.success('Status updated');
      setIsDetailModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.friendlyMessage || 'Error updating status');
    }
  };

  const openDetail = (ticket) => {
    setSelectedTicket(ticket);
    setStatusForm({
      status: ticket.status,
      resolution_notes: ticket.resolution_notes || '',
      actual_cost: ticket.actual_cost || ''
    });
    setIsDetailModalOpen(true);
  };

  const columns = ['open', 'in_progress', 'resolved', 'closed'];

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header__left">
          <h2>Maintenance</h2>
        </div>
        {!isAdminOrLandlord && (
          <button className="btn btn--primary" onClick={() => {
            setForm({unit_id: '', title: '', description: '', category: 'plumbing', priority: 'medium'});
            setIsModalOpen(true);
          }}>+ New Ticket</button>
        )}
      </div>

      {isAdminOrLandlord && stats && (
        <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
          <div className="stat-card card"><div className="stat-card__label">Open</div><div className="stat-card__value">{stats.open_count || 0}</div></div>
          <div className="stat-card card"><div className="stat-card__label">In Progress</div><div className="stat-card__value" style={{color: 'var(--color-warning)'}}>{stats.in_progress_count || 0}</div></div>
          <div className="stat-card card"><div className="stat-card__label">Resolved</div><div className="stat-card__value" style={{color: 'var(--color-success)'}}>{stats.resolved_count || 0}</div></div>
          <div className="stat-card card"><div className="stat-card__label">Urgent</div><div className="stat-card__value" style={{color: 'var(--color-danger)'}}>{stats.urgent_count || 0}</div></div>
        </div>
      )}

      {isAdminOrLandlord && (
        <div className="filter-bar" style={{justifyContent: 'flex-end'}}>
          <div className="btn-group" style={{display: 'flex', gap: '4px'}}>
            <button className={`btn btn--sm ${viewMode === 'board' ? 'btn--primary' : 'btn--outline'}`} onClick={() => setViewMode('board')}>Board</button>
            <button className={`btn btn--sm ${viewMode === 'table' ? 'btn--primary' : 'btn--outline'}`} onClick={() => setViewMode('table')}>Table</button>
          </div>
        </div>
      )}

      {loading ? <div style={{textAlign: 'center'}}><span className="spinner" /></div> : (
        tickets.length === 0 ? (
          <EmptyState icon="🔧" title="No Tickets" description="No maintenance tickets found." />
        ) : (
          isAdminOrLandlord && viewMode === 'board' ? (
            <div className="ticket-board">
              {columns.map(col => {
                const colTickets = tickets.filter(t => t.status === col);
                return (
                  <div key={col} className="ticket-column">
                    <div className="ticket-column__header">
                      <div className="ticket-column__title" style={{textTransform: 'capitalize'}}>{col.replace('_', ' ')}</div>
                      <div className="ticket-column__count">{colTickets.length}</div>
                    </div>
                    {colTickets.map(t => (
                      <div key={t.id} className="ticket-card" onClick={() => openDetail(t)}>
                        <div className="ticket-card__title">{t.title}</div>
                        <div className="ticket-card__meta">{t.property_name} - {t.unit_number}</div>
                        <div className="ticket-card__footer">
                          <StatusBadge value={t.priority} type="priority" />
                          <span style={{fontSize: '11px', color: '#888'}}>{new Date(t.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Unit</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th className="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => (
                    <tr key={t.id}>
                      <td style={{fontWeight: 500}}>{t.title}</td>
                      <td>{t.property_name} {t.unit_number}</td>
                      <td style={{textTransform: 'capitalize'}}>{t.category}</td>
                      <td><StatusBadge value={t.priority} /></td>
                      <td><StatusBadge value={t.status} /></td>
                      <td>{new Date(t.created_at).toLocaleDateString()}</td>
                      <td className="actions-col">
                        <button className="btn btn--sm btn--outline" onClick={() => openDetail(t)}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Maintenance Ticket">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Unit ID (UUID)</label>
            <input required className="form-control" value={form.unit_id} onChange={e => setForm({...form, unit_id: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input required minLength={5} className="form-control" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-control" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="hvac">HVAC</option>
                <option value="structural">Structural</option>
                <option value="appliance">Appliance</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-control" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea required minLength={10} className="form-control" rows="3" value={form.description} onChange={e => setForm({...form, description: e.target.value})}></textarea>
          </div>
          <div style={{marginTop: 'var(--spacing-lg)', textAlign: 'right'}}>
            <button type="submit" className="btn btn--primary">Submit Ticket</button>
          </div>
        </form>
      </Modal>

      {selectedTicket && (
        <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Ticket Details">
          <div style={{marginBottom: 'var(--spacing-lg)'}}>
            <h4>{selectedTicket.title}</h4>
            <p style={{color: 'var(--color-text-muted)', fontSize: '14px'}}>{selectedTicket.description}</p>
          </div>
          
          {isAdminOrLandlord ? (
            <form onSubmit={handleUpdateStatus}>
              <div className="form-group">
                <label className="form-label">Update Status</label>
                <select className="form-control" value={statusForm.status} onChange={e => setStatusForm({...statusForm, status: e.target.value})}>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="on_hold">On Hold</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Resolution Notes</label>
                <textarea className="form-control" rows="2" value={statusForm.resolution_notes} onChange={e => setStatusForm({...statusForm, resolution_notes: e.target.value})}></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">Actual Cost (KES)</label>
                <input type="number" className="form-control" value={statusForm.actual_cost} onChange={e => setStatusForm({...statusForm, actual_cost: e.target.value})} />
              </div>
              <div style={{marginTop: 'var(--spacing-lg)', textAlign: 'right'}}>
                <button type="submit" className="btn btn--primary">Save Updates</button>
              </div>
            </form>
          ) : (
            <div>
              <p><strong>Status:</strong> <StatusBadge value={selectedTicket.status} /></p>
              {selectedTicket.resolution_notes && (
                <p><strong>Notes:</strong> {selectedTicket.resolution_notes}</p>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
