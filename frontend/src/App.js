import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { useAuth } from './context/AuthContext';
import { getRoleDashboard } from './utils/authUtils';
import DashboardShell from './components/common/DashboardShell';

// ── Auth pages ─────────────────────────────────────────────────────────────
const LoginPage    = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));

// ── Role-specific dashboards ───────────────────────────────────────────────
const AdminDashboard    = lazy(() => import('./pages/dashboards/AdminDashboard'));
const LandlordDashboard = lazy(() => import('./pages/dashboards/LandlordDashboard'));
const TenantDashboard   = lazy(() => import('./pages/dashboards/TenantDashboard'));

// ── Module pages (shared) ──────────────────────────────────────────────────
const PropertiesPage   = lazy(() => import('./pages/PropertiesPage'));
const TenantsPage      = lazy(() => import('./pages/TenantsPage'));
const LeasesPage       = lazy(() => import('./pages/LeasesPage'));
const PaymentsPage     = lazy(() => import('./pages/PaymentsPage'));
const MaintenancePage  = lazy(() => import('./pages/MaintenancePage'));
const UsersPage        = lazy(() => import('./pages/UsersPage'));

// ── Error pages ────────────────────────────────────────────────────────────
const ForbiddenPage = lazy(() => import('./pages/ForbiddenPage'));
const NotFoundPage  = lazy(() => import('./pages/NotFoundPage'));


// ── Loading fallback ───────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', flexDirection: 'column', gap: '12px',
    }}>
      <span className="spinner" style={{ width: 32, height: 32 }} />
      <span className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>Loading…</span>
    </div>
  );
}

// ── Full-page loader shown while the JWT is being re-hydrated ──────────────
function AppLoader() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--color-bg)',
      flexDirection: 'column', gap: '16px',
    }}>
      <div style={{ fontSize: 48 }}>🏘️</div>
      <span className="spinner" style={{ width: 32, height: 32 }} />
      <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>Initialising…</p>
    </div>
  );
}


// ── Route guards ───────────────────────────────────────────────────────────

/**
 * Block unauthenticated users — redirect to /login.
 * Also handles the initial hydration loading state.
 */
function PrivateRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <AppLoader />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

/**
 * Block already-authenticated users from seeing login/register.
 * Redirect them to their role dashboard.
 */
function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  if (isLoading) return <AppLoader />;
  if (isAuthenticated && user) {
    return <Navigate to={getRoleDashboard(user.role)} replace />;
  }
  return children;
}

/**
 * Role-gated route — renders children only if the user has one of the
 * allowed roles; otherwise shows the 403 Forbidden page.
 */
function RoleRoute({ allowedRoles, children }) {
  const { user } = useAuth();
  if (!user || !allowedRoles.includes(user.role)) {
    return <ForbiddenPageInline />;
  }
  return children;
}

// Inline import wrapper so ForbiddenPage is included in the Suspense boundary
const ForbiddenPageInline = lazy(() => import('./pages/ForbiddenPage'));


// ── Root redirect — send to correct role dashboard ─────────────────────────
function RootRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <AppLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleDashboard(user.role)} replace />;
}


// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Root ──────────────────────────────────────────── */}
        <Route path="/" element={<RootRedirect />} />

        {/* ── Public (unauthenticated) ───────────────────────── */}
        <Route
          path="/login"
          element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>}
        />
        <Route
          path="/register"
          element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>}
        />

        {/* ── Protected (authenticated shell) ───────────────── */}
        <Route
          path="/"
          element={<PrivateRoute><DashboardShell /></PrivateRoute>}
        >
          {/* Role-specific dashboards */}
          <Route
            path="dashboard/admin"
            element={
              <RoleRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="dashboard/landlord"
            element={
              <RoleRoute allowedRoles={['landlord', 'admin']}>
                <LandlordDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="dashboard/tenant"
            element={
              <RoleRoute allowedRoles={['tenant', 'admin']}>
                <TenantDashboard />
              </RoleRoute>
            }
          />

          {/* Generic /dashboard → role-aware redirect */}
          <Route path="dashboard" element={<DashboardRedirect />} />

          {/* Module pages — role-restricted */}
          <Route
            path="properties"
            element={
              <RoleRoute allowedRoles={['admin', 'landlord']}>
                <PropertiesPage />
              </RoleRoute>
            }
          />
          <Route
            path="tenants"
            element={
              <RoleRoute allowedRoles={['admin', 'landlord']}>
                <TenantsPage />
              </RoleRoute>
            }
          />
          <Route path="leases"      element={<LeasesPage />} />
          <Route path="payments"    element={<PaymentsPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route
            path="users"
            element={
              <RoleRoute allowedRoles={['admin']}>
                <UsersPage />
              </RoleRoute>
            }
          />

          {/* 403 catch */}
          <Route path="forbidden" element={<ForbiddenPage />} />
        </Route>

        {/* ── 404 ───────────────────────────────────────────── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

/** Redirect /dashboard → /dashboard/<role> */
function DashboardRedirect() {
  const { user } = useAuth();
  return <Navigate to={getRoleDashboard(user?.role)} replace />;
}
