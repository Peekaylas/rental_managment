import React from 'react';
const Stub = ({ title }) => (
  <div>
    <h2>{title}</h2>
    <div className="card" style={{ marginTop: 'var(--spacing-lg)' }}>
      <p className="text-muted">This module will be implemented in the next step.</p>
    </div>
  </div>
);
export default function UsersPage()       { return <Stub title="⚙️ User Management" />; }
