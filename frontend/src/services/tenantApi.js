import apiClient from './apiClient';

export const getTenants = (params = {}) => apiClient.get('/tenants', { params }).then(r => r.data);
export const createTenant = (data) => apiClient.post('/tenants', data).then(r => r.data);
export const updateTenant = (id, data) => apiClient.patch(`/tenants/${id}`, data).then(r => r.data);
export const getMyTenantProfile = () => apiClient.get('/tenants/me').then(r => r.data);
