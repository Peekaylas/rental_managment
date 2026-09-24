import apiClient from './apiClient';

export const getPayments = (params = {}) => apiClient.get('/payments', { params }).then(r => r.data);
export const createPaymentEntry = (data) => apiClient.post('/payments', data).then(r => r.data);
export const recordPayment = (id, data) => apiClient.post(`/payments/${id}/record`, data).then(r => r.data);
export const getLedgerSummary = () => apiClient.get('/payments/ledger/summary').then(r => r.data);
export const getOverduePayments = () => apiClient.get('/payments/overdue').then(r => r.data);
export const getMyPayments = () => apiClient.get('/payments/my-payments').then(r => r.data);

export const submitPayment = (id, data) => apiClient.post(`/payments/${id}/submit`, data).then(r => r.data);
export const reviewPayment = (id, action, rejection_reason = null) => apiClient.post(`/payments/${id}/review`, { action, rejection_reason }).then(r => r.data);
