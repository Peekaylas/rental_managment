import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';
import {
  getRoleDashboard,
  validatePasswordStrength,
  passwordStrengthScore,
} from '../utils/authUtils';
import '../assets/css/auth.css';

// ── Role choices (admin self-registration is blocked by backend) ───────────
const ROLE_OPTIONS = [
  {
    value: 'landlord',
    icon: '🏢',
    label: 'Landlord',
    desc: 'I own properties and rent them out',
  },
  {
    value: 'tenant',
    icon: '👤',
    label: 'Tenant',
    desc: 'I rent a unit from a landlord',
  },
];

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', 'var(--color-danger)', 'var(--color-warning)', 'var(--color-info)', 'var(--color-success)'];

function PasswordStrengthMeter({ score }) {
  if (score === 0) return null;
  return (
    <div className="password-strength">
      <div className="password-strength__bar" role="presentation">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`password-strength__segment${i <= score ? ' active' : ''}`}
            data-score={score}
            style={i <= score ? { background: STRENGTH_COLORS[score] } : {}}
          />
        ))}
      </div>
      <span
        className="password-strength__label"
        style={{ color: STRENGTH_COLORS[score] }}
      >
        {STRENGTH_LABELS[score]} password
      </span>
    </div>
  );
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    confirm_password: '',
    role: 'tenant',
  });
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [errors, setErrors]           = useState({});
  const [globalError, setGlobalError] = useState('');

  const passScore = passwordStrengthScore(form.password);

  // ── Field-level validation ─────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.full_name.trim() || form.full_name.trim().length < 2)
      e.full_name = 'Full name must be at least 2 characters.';
    if (!form.email) e.email = 'Email is required.';
    const passErr = validatePasswordStrength(form.password);
    if (passErr) e.password = passErr;
    if (form.password !== form.confirm_password)
      e.confirm_password = 'Passwords do not match.';
    if (form.phone_number && !/^\+?[\d\s\-]{7,20}$/.test(form.phone_number))
      e.phone_number = 'Enter a valid phone number.';
    return e;
  };

  const handleChange = (e) => {
    setGlobalError('');
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRoleSelect = (role) => {
    setForm((prev) => ({ ...prev, role }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    setGlobalError('');
    try {
      const { confirm_password, ...payload } = form; // strip confirm field
      const me = await register(payload);
      toast.success(`🎉 Welcome, ${me.full_name.split(' ')[0]}! Account created.`);
      navigate(getRoleDashboard(me.role), { replace: true });
    } catch (err) {
      setGlobalError(err.friendlyMessage || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* ── Brand panel ──────────────────────────────────────── */}
      <aside className="auth-page__brand" aria-hidden="true">
        <div className="auth-brand__logo">🏘️</div>
        <h1 className="auth-brand__title">Join Rental Manager</h1>
        <p className="auth-brand__subtitle">
          Create your account in under a minute and start managing your housing experience today.
        </p>

        <ul className="auth-brand__features" style={{ marginTop: 'var(--spacing-2xl)' }}>
          {[
            { icon: '✅', text: 'Free to create an account' },
            { icon: '🔒', text: 'Bank-grade encrypted passwords' },
            { icon: '📱', text: 'M-Pesa payment support' },
            { icon: '🌍', text: 'Built for Kenyan housing market' },
          ].map(({ icon, text }) => (
            <li key={text} className="auth-brand__feature">
              <span className="auth-brand__feature-icon">{icon}</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </aside>

      {/* ── Form panel ───────────────────────────────────────── */}
      <main className="auth-page__form-panel">
        <div className="auth-form-container auth-form-container--wide">
          <div className="auth-card">
            <div className="auth-card__header">
              <div className="auth-card__logo">✨</div>
              <h2 className="auth-card__title">Create your account</h2>
              <p className="auth-card__subtitle">Fill in the details below to get started</p>
            </div>

            {/* Global error */}
            {globalError && (
              <div className="auth-error-banner" role="alert">
                <span>⚠️</span>
                <span>{globalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* ── Role selector ─────────────────────────────── */}
              <div className="form-group">
                <label className="form-label">I am a…</label>
                <div className="role-selector">
                  {ROLE_OPTIONS.map(({ value, icon, label, desc }) => (
                    <button
                      key={value}
                      type="button"
                      className={`role-option${form.role === value ? ' role-option--selected' : ''}`}
                      onClick={() => handleRoleSelect(value)}
                      aria-pressed={form.role === value}
                    >
                      <span className="role-option__icon">{icon}</span>
                      <span className="role-option__label">{label}</span>
                      <span className="role-option__desc">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Name + Email row ──────────────────────────── */}
              <div className="auth-form__row">
                <div className="form-group">
                  <label className="form-label" htmlFor="full_name">Full name *</label>
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    className={`form-control${errors.full_name ? ' form-control--error' : ''}`}
                    placeholder="Jane Mwangi"
                    value={form.full_name}
                    onChange={handleChange}
                    autoComplete="name"
                    autoFocus
                  />
                  {errors.full_name && <p className="form-error">{errors.full_name}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="phone_number">
                    Phone <span className="text-muted">(optional)</span>
                  </label>
                  <input
                    id="phone_number"
                    name="phone_number"
                    type="tel"
                    className={`form-control${errors.phone_number ? ' form-control--error' : ''}`}
                    placeholder="+254 712 345 678"
                    value={form.phone_number}
                    onChange={handleChange}
                    autoComplete="tel"
                  />
                  {errors.phone_number && <p className="form-error">{errors.phone_number}</p>}
                </div>
              </div>

              {/* ── Email ─────────────────────────────────────── */}
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email address *</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className={`form-control${errors.email ? ' form-control--error' : ''}`}
                  placeholder="jane@example.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
                {errors.email && <p className="form-error">{errors.email}</p>}
              </div>

              {/* ── Password row ──────────────────────────────── */}
              <div className="auth-form__row">
                <div className="form-group">
                  <label className="form-label" htmlFor="password">Password *</label>
                  <div className="password-input-wrapper">
                    <input
                      id="password"
                      name="password"
                      type={showPass ? 'text' : 'password'}
                      className={`form-control${errors.password ? ' form-control--error' : ''}`}
                      placeholder="Min 8 chars"
                      value={form.password}
                      onChange={handleChange}
                      autoComplete="new-password"
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
                  <PasswordStrengthMeter score={passScore} />
                  {errors.password && <p className="form-error">{errors.password}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="confirm_password">Confirm password *</label>
                  <div className="password-input-wrapper">
                    <input
                      id="confirm_password"
                      name="confirm_password"
                      type={showConfirm ? 'text' : 'password'}
                      className={`form-control${errors.confirm_password ? ' form-control--error' : ''}`}
                      placeholder="Repeat password"
                      value={form.confirm_password}
                      onChange={handleChange}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? 'Hide' : 'Show'}
                      tabIndex={-1}
                    >
                      {showConfirm ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {form.confirm_password && form.password === form.confirm_password && (
                    <p className="form-hint" style={{ color: 'var(--color-success)' }}>✓ Passwords match</p>
                  )}
                  {errors.confirm_password && <p className="form-error">{errors.confirm_password}</p>}
                </div>
              </div>

              {/* ── Terms note ────────────────────────────────── */}
              <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginBottom: 0 }}>
                By creating an account you agree to our Terms of Service and Privacy Policy.
              </p>

              {/* ── Submit ────────────────────────────────────── */}
              <button
                type="submit"
                className="btn btn--primary auth-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <><span className="spinner" style={{ borderTopColor: '#fff', width: 18, height: 18 }} /> Creating account…</>
                ) : (
                  '🚀 Create account'
                )}
              </button>
            </form>
          </div>

          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
