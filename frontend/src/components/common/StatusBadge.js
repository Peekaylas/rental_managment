import React from 'react';
import '../../assets/css/modules.css';

const formatLabel = (value) => {
  if (!value) return '';
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function StatusBadge({ value, type = 'status' }) {
  if (!value) return null;
  const normalizedValue = value.toLowerCase();
  
  return (
    <span className={`badge badge--${normalizedValue}`}>
      {formatLabel(value)}
    </span>
  );
}
