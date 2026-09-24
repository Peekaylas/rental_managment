import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import {
  getRoleDashboard,
  validatePasswordStrength,
  passwordStrengthScore,
} from '../utils/authUtils';
import '../assets/css/auth.css';

const BRAND_FEATURES = [
  { icon: '🏢', text: 'Manage properties & rental units' },
  { icon: '📄', text: 'Digital lease agreements' },
  { icon: '💳', text: 'M-Pesa & bank payment tracking' },
  { icon: '🔧', text: 'Maintenance ticket system' },
];

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', 'var(--color-danger)', 'var(--color-warning)', 'var(--color-info)', 'var(--color-success)'];

function PasswordStrengthMeter({ score }) {
  if (!score) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            height: 4, flex: 1, borderRadius: 4,
            background: i <= score ? STRENGTH_COLORS[score] : 'var(--color-border)',
            transition: 'background 0.2s'
          }} />
        ))}
      </div>
      <p style={{ fontSize: 12, color: STRENGTH_COLORS[score], marginTop: 4 }}>
        {STRENGTH_LABELS[score]}
      </p>
    </div>
  );
}

// ── Tab: Landlord self-registration ──────────────────────────────────────
function LandlordRegisterTab() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '', email: '', phone_number: '', password: '', confirm_password: '',
  });
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const passScore = passwordStrengthScore(form.password);

  const handleChange = (e) => {
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim() || form.full_name.trim().length < 2) errs.full_name = 'Name must be at least 2 characters.';
    if (!form.email.includes('@')) errs.email = 'Enter a valid email address.';
    const pwErr = validatePasswordStrength(form.password);
    if (pwErr) errs.password = pwErr;
    if (form.password !== form.confirm_password) errs.confirm_password = 'Passwords do not match.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const me = await register({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone_number: form.phone_number || null,
        password: form.password,
        role: 'landlord',
      });
      toast.success(`Welcome, ${me.full_name.split(' ')[0]}! Your landlord account is ready.`);
      navigate(getRoleDashboard(me.role), { replace: true });
    } catch (err) {
      toast.error(err.friendlyMessage || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="auth-form__row">
        <div className="form-group">
          <label className="form-label" htmlFor="full_name">Full name *</label>
          <input id="full_name" name="full_name" type="text"
            className={`form-control${errors.full_name ? ' form-control--error' : ''}`}
            placeholder="Jane Mwangi" value={form.full_name}
            onChange={handleChange} autoComplete="name" autoFocus />
          {errors.full_name && <p className="form-error">{errors.full_name}</p>}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="phone_number">Phone <span className="text-muted">(optional)</span></label>
          <input id="phone_number" name="phone_number" type="tel"
            className="form-control" placeholder="+254 712 345 678"
            value={form.phone_number} onChange={handleChange} autoComplete="tel" />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="email">Email address *</label>
        <input id="email" name="email" type="email"
          className={`form-control${errors.email ? ' form-control--error' : ''}`}
          placeholder="jane@example.com" value={form.email}
          onChange={handleChange} autoComplete="email" />
        {errors.email && <p className="form-error">{errors.email}</p>}
      </div>

      <div className="auth-form__row">
        <div className="form-group">
          <label className="form-label" htmlFor="password">Password *</label>
          <div className="password-input-wrapper">
            <input id="password" name="password" type={showPass ? 'text' : 'password'}
              className={`form-control${errors.password ? ' form-control--error' : ''}`}
              placeholder="Min 8 characters" value={form.password}
              onChange={handleChange} autoComplete="new-password" />
            <button type="button" className="password-toggle-btn"
              onClick={() => setShowPass(v => !v)} tabIndex={-1}>
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>
          <PasswordStrengthMeter score={passScore} />
          {errors.password && <p className="form-error">{errors.password}</p>}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="confirm_password">Confirm password *</label>
          <div className="password-input-wrapper">
            <input id="confirm_password" name="confirm_password" type={showConfirm ? 'text' : 'password'}
              className={`form-control${errors.confirm_password ? ' form-control--error' : ''}`}
              placeholder="Repeat password" value={form.confirm_password}
              onChange={handleChange} autoComplete="new-password" />
            <button type="button" className="password-toggle-btn"
              onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
              {showConfirm ? '🙈' : '👁️'}
            </button>
          </div>
          {form.confirm_password && form.password === form.confirm_password && (
            <p className="form-hint" style={{ color: 'var(--color-success)' }}>✓ Passwords match</p>
          )}
          {errors.confirm_password && <p className="form-error">{errors.confirm_password}</p>}
        </div>
      </div>

      <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginBottom: 0 }}>
        By creating an account you agree to our Terms of Service and Privacy Policy.
      </p>

      <button type="submit" className="btn btn--primary auth-submit-btn" disabled={loading}>
        {loading ? <><span className="spinner" style={{ borderTopColor: '#fff', width: 18, height: 18 }} /> Creating account…</> : '🚀 Create Landlord Account'}
      </button>
    </form>
  );
}

// ── Tab: Tenant accept invite & claim account ────────────────────────────
function TenantClaimTab() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ token: '', new_password: '', confirm_password: '' });
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const passScore = passwordStrengthScore(form.new_password);

  const handleChange = (e) => {
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.token.trim()) errs.token = 'Please paste your invite token.';
    const pwErr = validatePasswordStrength(form.new_password);
    if (pwErr) errs.new_password = pwErr;
    if (form.new_password !== form.confirm_password) errs.confirm_password = 'Passwords do not match.';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await apiClient.post('/invites/claim', { token: form.token.trim(), new_password: form.new_password });
      toast.success('Account activated! Please sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid or expired invite token.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-group">
        <label className="form-label" htmlFor="token">Invite Token *</label>
        <input id="token" name="token" type="text"
          className={`form-control${errors.token ? ' form-control--error' : ''}`}
          placeholder="Paste the token your landlord sent you"
          value={form.token} onChange={handleChange} />
        {errors.token && <p className="form-error">{errors.token}</p>}
        <p className="form-hint">Your landlord will share this with you via email or SMS.</p>
      </div>

      <div className="auth-form__row">
        <div className="form-group">
          <label className="form-label" htmlFor="new_password">Choose a Password *</label>
          <div className="password-input-wrapper">
            <input id="new_password" name="new_password" type={showPass ? 'text' : 'password'}
              className={`form-control${errors.new_password ? ' form-control--error' : ''}`}
              placeholder="Min 8 characters" value={form.new_password}
              onChange={handleChange} autoComplete="new-password" />
            <button type="button" className="password-toggle-btn"
              onClick={() => setShowPass(v => !v)} tabIndex={-1}>
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>
          <PasswordStrengthMeter score={passScore} />
          {errors.new_password && <p className="form-error">{errors.new_password}</p>}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="confirm_password">Confirm Password *</label>
          <input id="confirm_password" name="confirm_password" type="password"
            className={`form-control${errors.confirm_password ? ' form-control--error' : ''}`}
            placeholder="Repeat password" value={form.confirm_password}
            onChange={handleChange} autoComplete="new-password" />
          {form.confirm_password && form.new_password === form.confirm_password && (
            <p className="form-hint" style={{ color: 'var(--color-success)' }}>✓ Passwords match</p>
          )}
          {errors.confirm_password && <p className="form-error">{errors.confirm_password}</p>}
        </div>
      </div>

      <button type="submit" className="btn btn--primary auth-submit-btn" disabled={loading}>
        {loading ? <><span className="spinner" style={{ borderTopColor: '#fff', width: 18, height: 18 }} /> Activating…</> : '✅ Activate My Account'}
      </button>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const [activeTab, setActiveTab] = useState('landlord');

  return (
    <div className="auth-page">
      {/* Brand panel */}
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

      {/* Form panel */}
      <main className="auth-page__form-panel">
        <div className="auth-form-container">
          <div className="auth-card">
            <div className="auth-card__header">
              <div className="auth-card__logo">{activeTab === 'landlord' ? '🏢' : '🔑'}</div>
              <h2 className="auth-card__title">
                {activeTab === 'landlord' ? 'Create a Landlord Account' : 'Accept Your Invite'}
              </h2>
              <p className="auth-card__subtitle">
                {activeTab === 'landlord'
                  ? 'Register to manage your rental properties'
                  : 'Activate your tenant account using the token your landlord sent you'
                }
              </p>
            </div>

            {/* Tab switcher */}
            <div className="tab-bar" style={{ marginBottom: 'var(--spacing-lg)' }}>
              <button
                className={`tab-btn${activeTab === 'landlord' ? ' active' : ''}`}
                onClick={() => setActiveTab('landlord')}
              >
                🏢 I'm a Landlord
              </button>
              <button
                className={`tab-btn${activeTab === 'tenant' ? ' active' : ''}`}
                onClick={() => setActiveTab('tenant')}
              >
                🔑 I Have an Invite
              </button>
            </div>

            {activeTab === 'landlord' ? <LandlordRegisterTab /> : <TenantClaimTab />}
          </div>

          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
