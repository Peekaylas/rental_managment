import apiClient from './apiClient';

export const getAdminDashboard = () => apiClient.get('/dashboard/admin').then(r => r.data);
export const getLandlordDashboard = () => apiClient.get('/dashboard/landlord').then(r => r.data);
export const getTenantDashboard = () => apiClient.get('/dashboard/tenant').then(r => r.data);
