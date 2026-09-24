import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import StatusBadge from '../components/common/StatusBadge';

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get('/users/');
      setUsers(res.data);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;
    try {
      await apiClient.patch(`/users/${userId}/role?role=${newRole}`);
      toast.success('User role updated successfully');
      fetchUsers();
    } catch (err) {
      toast.error(err.friendlyMessage || 'Failed to update role');
    }
  };

  const handleStatusChange = async (userId, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
      await apiClient.patch(`/users/${userId}/status?active=${!currentStatus}`);
      toast.success(`User account ${action}d successfully`);
      fetchUsers();
    } catch (err) {
      toast.error(err.friendlyMessage || 'Failed to update status');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">⛔</div>
        <h3 className="empty-state__title">Access Denied</h3>
        <p className="empty-state__desc">You do not have permission to view the User Management module.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header__left">
          <h2>System Users</h2>
          <p className="page-header__subtitle">Manage accounts, roles, and system access</p>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <span className="spinner" /> Loading users...
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th className="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.full_name}</strong></td>
                    <td>{u.email}</td>
                    <td>{u.phone_number || 'N/A'}</td>
                    <td>
                      <select 
                        className="form-control" 
                        style={{ padding: '4px', fontSize: '13px' }}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={u.id === user.id}
                      >
                        <option value="admin">Admin</option>
                        <option value="landlord">Landlord</option>
                        <option value="tenant">Tenant</option>
                      </select>
                    </td>
                    <td>
                      <StatusBadge 
                        value={u.is_active ? 'success' : 'danger'} 
                        label={u.is_active ? 'Active' : 'Suspended'} 
                      />
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="actions-col">
                      <button 
                        className={`btn btn--sm ${u.is_active ? 'btn--danger' : 'btn--success'}`}
                        onClick={() => handleStatusChange(u.id, u.is_active)}
                        disabled={u.id === user.id}
                        title={u.is_active ? "Suspend User" : "Activate User"}
                      >
                        {u.is_active ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
