import apiClient from './apiClient';

export const getTickets = (params = {}) => apiClient.get('/maintenance', { params }).then(r => r.data);
export const createTicket = (data) => apiClient.post('/maintenance', data).then(r => r.data);
export const updateTicketStatus = (id, data) => apiClient.patch(`/maintenance/${id}/status`, data).then(r => r.data);
export const assignTicket = (id, assigneeId) => apiClient.post(`/maintenance/${id}/assign`, { assignee_id: assigneeId }).then(r => r.data);
export const getTicketStats = () => apiClient.get('/maintenance/stats').then(r => r.data);
export const getMyTickets = () => apiClient.get('/maintenance/my-tickets').then(r => r.data);
