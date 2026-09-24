import apiClient from './apiClient';

export const getProperties = () => apiClient.get('/properties').then(r => r.data);
export const createProperty = (data) => apiClient.post('/properties', data).then(r => r.data);
export const updateProperty = (id, data) => apiClient.put(`/properties/${id}`, data).then(r => r.data);
export const deleteProperty = (id) => apiClient.delete(`/properties/${id}`).then(r => r.data);
export const getPropertyUnits = (propertyId) => apiClient.get(`/properties/${propertyId}/units`).then(r => r.data);
export const createUnit = (propertyId, data) => apiClient.post(`/properties/${propertyId}/units`, data).then(r => r.data);
export const updateUnit = (propertyId, unitId, data) => apiClient.put(`/properties/${propertyId}/units/${unitId}`, data).then(r => r.data);
export const updateUnitStatus = (propertyId, unitId, status) => apiClient.patch(`/properties/${propertyId}/units/${unitId}/status`, { status }).then(r => r.data);
