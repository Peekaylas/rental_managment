/**
 * Centralised axios instance.
 * All components import this rather than raw axios so that
 * base URL, timeouts, and interceptors are applied globally.
 */
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Response interceptor — centralised error normalisation ──────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    // Attach a friendly message to the error for use in components
    error.friendlyMessage = Array.isArray(message)
      ? message.map((e) => e.msg).join(', ')   // pydantic validation errors
      : String(message);

    return Promise.reject(error);
  }
);

export default apiClient;
