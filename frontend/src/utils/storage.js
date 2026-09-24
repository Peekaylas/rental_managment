/** Thin wrappers around localStorage for token management. */

const TOKEN_KEY = 'rental_access_token';

export const getStoredToken    = ()      => localStorage.getItem(TOKEN_KEY);
export const setStoredToken    = (token) => localStorage.setItem(TOKEN_KEY, token);
export const removeStoredToken = ()      => localStorage.removeItem(TOKEN_KEY);
