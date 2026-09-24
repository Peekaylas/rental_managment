/**
 * Role-based redirect helper.
 * Returns the default landing path for a given user role.
 */
export function getRoleDashboard(role) {
  switch (role) {
    case 'admin':    return '/dashboard/admin';
    case 'landlord': return '/dashboard/landlord';
    case 'tenant':   return '/dashboard/tenant';
    default:         return '/dashboard';
  }
}

/**
 * Validate password strength client-side (mirrors backend rules).
 * Returns an error string or null.
 */
export function validatePasswordStrength(password) {
  if (!password || password.length < 8)
    return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password))
    return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password))
    return 'Password must contain at least one lowercase letter.';
  if (!/\d/.test(password))
    return 'Password must contain at least one number.';
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password))
    return 'Password must contain at least one special character.';
  return null;
}

/**
 * Derive a password strength score 0-4 for the strength meter.
 */
export function passwordStrengthScore(password) {
  let score = 0;
  if (!password) return score;
  if (password.length >= 8)  score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password))   score++;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score++;
  return score;  // 0 = very weak … 4 = strong
}
