import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';
import { getRoleDashboard } from '../utils/authUtils';
import '../assets/css/auth.css';

const BRAND_FEATURES = [
  { icon: '🏢', text: 'Manage properties & rental units' },
  { icon: '📄', text: 'Digital lease agreements' },
  { icon: '💳', text: 'M-Pesa & bank payment tracking' },
  { icon: '🔧', text: 'Maintenance ticket system' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [form, setForm]         = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleChange = (e) => {
    setError('');
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const me = await login(form.email, form.password);
      toast.success(`Welcome back, ${me.full_name.split(' ')[0]}!`);
      navigate(getRoleDashboard(me.role), { replace: true });
    } catch (err) {
      setError(err.friendlyMessage || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* ── Brand panel ─────────────────────────────────────── */}
      <aside className="auth-page__brand" aria-hidden="true">
        <div className="auth-brand__logo">🏘️</div>
        <h1 className="auth-brand__title">Rental Manager</h1>
        <p className="auth-brand__subtitle">
          Affordable housing management for landlords, tenants, and administrators — all in one place.
        </p>
        <ul className="auth-brand__features" aria-hidden="true">
          {BRAND_FEATURES.map(({ icon, text }) => (
            <li key={text} className="auth-brand__feature">
              <span className="auth-brand__feature-icon">{icon}</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </aside>

      {/* ── Form panel ──────────────────────────────────────── */}
      <main className="auth-page__form-panel">
        <div className="auth-form-container">
          <div className="auth-card">
            <div className="auth-card__header">
              <div className="auth-card__logo">👤</div>
              <h2 className="auth-card__title">Sign in to your account</h2>
              <p className="auth-card__subtitle">
                Enter your credentials to access the dashboard
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="auth-error-banner" role="alert">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="form-control"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    id="password"
                    name="password"
                    type={showPass ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="btn btn--primary auth-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <><span className="spinner" style={{ borderTopColor: '#fff', width: 18, height: 18 }} /> Signing in…</>
                ) : (
                  '→ Sign in'
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="auth-footer">
            Don't have an account?{' '}
            <Link to="/register">Create one now</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
