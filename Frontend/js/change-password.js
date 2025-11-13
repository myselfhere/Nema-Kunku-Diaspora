// Auth helpers + guards for admin/member pages (offline/dev friendly)

import { getUser as _getUser, setUser as _setUser, clearUser as _clearUser } from './nkd-bus.js';

export function getUser(){ return _getUser(); }
export function setUser(u){ return _setUser(u); }
export function clearUser(){ return _clearUser(); }

/**
 * requireAuth({ role })
 * - Works even without token (for local/offline dev).
 * - If no user in LS → redirect to login.
 * - If role provided, checks role match.
 */
export function requireAuth({ role } = {}) {
  const user = getUser();
  if (!user) {
    window.location.href = 'login.html';
    throw new Error('Unauthorized: no user');
  }
  if (role) {
    const want = String(role).toLowerCase();
    const have = String(user.role || '').toLowerCase();
    if (want !== have) {
      alert('Access denied.');
      window.location.href = 'member-dashboard.html';
      throw new Error('Forbidden');
    }
  }
  return user;
}