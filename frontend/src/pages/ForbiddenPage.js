import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../assets/css/auth.css';

/**
 * Shown when a user accesses a route their role doesn't permit.
 */
export default function ForbiddenPage() {
  const { user } = useAuth();

  return (
    <div className="forbidden-page">
      <div className="forbidden-page__code">403</div>
      <h2 className="forbidden-page__title">Access Denied</h2>
      <p className="forbidden-page__message">
        You don't have permission to view this page.
        {user && (
          <> Your current role is <strong>{user.role}</strong>.</>
        )}
      </p>
      <Link to="/dashboard" className="btn btn--primary">
        ← Back to Dashboard
      </Link>
    </div>
  );
}
