import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { getStoredToken, setStoredToken, removeStoredToken } from '../utils/storage';

const AuthContext = createContext(null);

/**
 * AuthProvider — manages JWT auth state across the app.
 * Exposes: user, isAuthenticated, isLoading, login, register, logout.
 */
export function AuthProvider({ children }) {
  const [user, setUser]            = useState(null);
  const [isAuthenticated, setIsAuth] = useState(false);
  const [isLoading, setIsLoading]  = useState(true);

  // ── Re-hydrate session from persisted token ──────────────────────────
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      apiClient.get('/users/me')
        .then(({ data }) => { setUser(data); setIsAuth(true); })
        .catch(() => {
          removeStoredToken();
          delete apiClient.defaults.headers.common['Authorization'];
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  // ── Login (JSON body) ─────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const { data } = await apiClient.post('/auth/login/json', { email, password });
    const { access_token } = data;

    setStoredToken(access_token);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

    const { data: me } = await apiClient.get('/users/me');
    setUser(me);
    setIsAuth(true);
    return me;           // caller uses role for redirect
  }, []);

  // ── Register ──────────────────────────────────────────────────────────
  const register = useCallback(async (payload) => {
    // payload: { full_name, email, phone_number, password, role }
    const { data } = await apiClient.post('/auth/register', payload);
    const { access_token } = data;

    setStoredToken(access_token);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

    const { data: me } = await apiClient.get('/users/me');
    setUser(me);
    setIsAuth(true);
    return me;
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    removeStoredToken();
    delete apiClient.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuth(false);
  }, []);

  // ── Change password ───────────────────────────────────────────────────
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    await apiClient.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }, []);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
