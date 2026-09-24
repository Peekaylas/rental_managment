import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// ── Navigation items per role ─────────────────────────────────────────────
const NAV_ITEMS = [
  // Shared dashboard links (role-specific, handled by DashboardRedirect)
  { path: '/dashboard',   label: 'Dashboard',    icon: '🏠', roles: ['admin', 'landlord', 'tenant'] },

  // Admin-only
  { path: '/users',       label: 'Users',        icon: '⚙️',  roles: ['admin'] },

  // Landlord + Admin
  { path: '/properties',  label: 'Properties',   icon: '🏢', roles: ['admin', 'landlord'] },
  { path: '/tenants',     label: 'Tenants',      icon: '👥', roles: ['admin', 'landlord'] },

  // All authenticated users
  { path: '/leases',      label: 'Leases',       icon: '📄', roles: ['admin', 'landlord', 'tenant'] },
  { path: '/payments',    label: 'Payments',     icon: '💳', roles: ['admin', 'landlord', 'tenant'] },
  { path: '/maintenance', label: 'Maintenance',  icon: '🔧', roles: ['admin', 'landlord', 'tenant'] },
];

const ROLE_COLORS = {
  admin:    '#8e44ad',
  landlord: '#1a6b3c',
  tenant:   '#2980b9',
};

/**
 * DashboardShell — persistent sidebar + topbar.
 * Navigation items are filtered based on the current user's role.
 */
export default function DashboardShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const visibleItems = NAV_ITEMS.filter(
    (item) => user?.role && item.roles.includes(user.role)
  );

  const roleColor = ROLE_COLORS[user?.role] ?? 'var(--color-primary)';

  return (
    <div className="shell">
      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside
        className="sidebar"
        style={{ width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)' }}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="sidebar__logo" style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>🏘️</span>
          {!collapsed && (
            <span className="sidebar__logo-text">Rental<br />Manager</span>
          )}
        </div>

        {/* Role chip */}
        {!collapsed && user && (
          <div style={{
            margin: '0 var(--spacing-md) var(--spacing-sm)',
            padding: '6px var(--spacing-md)',
            borderRadius: 'var(--radius-full)',
            background: `${roleColor}22`,
            border: `1px solid ${roleColor}44`,
            fontSize: 'var(--font-size-xs)',
            fontWeight: 700,
            color: roleColor,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            textAlign: 'center',
          }}>
            {user.role}
          </div>
        )}

        {/* Nav */}
        <nav className="sidebar__nav">
          {visibleItems.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `sidebar__nav-item${isActive ? ' active' : ''}`
              }
              style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
            >
              <span aria-hidden="true" style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
              {!collapsed && (
                <span className="sidebar__nav-label">{label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar__footer">
          {!collapsed && user && (
            <div style={{
              fontSize: 'var(--font-size-xs)',
              color: 'rgba(255,255,255,0.6)',
              marginBottom: 'var(--spacing-sm)',
              overflow: 'hidden',
            }}>
              <div style={{ color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.full_name}
              </div>
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
            {/* Collapse toggle */}
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => setCollapsed((v) => !v)}
              style={{ color: 'rgba(255,255,255,0.6)', flex: collapsed ? 1 : 0 }}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed ? '→' : '←'}
            </button>

            {!collapsed && (
              <button
                className="btn btn--ghost btn--sm"
                onClick={handleLogout}
                style={{ color: 'rgba(255,255,255,0.7)', flex: 1 }}
              >
                🚪 Sign out
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────────── */}
      <div
        className="main-area"
        style={{ marginLeft: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)' }}
      >
        {/* Topbar */}
        <header className="topbar">
          <h1 className="topbar__title">
            {process.env.REACT_APP_APP_NAME || 'Rental Management System'}
          </h1>

          <div className="topbar__actions">
            {user && (
              <>
                <span
                  className={`badge badge--${user.role}`}
                  title={`Logged in as ${user.role}`}
                >
                  {user.role}
                </span>
                <span style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-muted)',
                  maxWidth: 200,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {user.full_name}
                </span>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
