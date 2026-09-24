import apiClient from './apiClient';

export const getLeases = (params = {}) => apiClient.get('/leases', { params }).then(r => r.data);
export const createLease = (data) => apiClient.post('/leases', data).then(r => r.data);
export const updateLeaseStatus = (id, status) => apiClient.patch(`/leases/${id}/status`, { status }).then(r => r.data);
export const activateLease = (id) => apiClient.post(`/leases/${id}/activate`).then(r => r.data);
export const getMyLease = () => apiClient.get('/leases/my-lease').then(r => r.data);
