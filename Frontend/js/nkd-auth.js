/* =========================================================
   Nema Kunku Diaspora — Minimal Auth + RBAC Utilities
   Handles login session, role-based access, and redirects.
   ========================================================= */

// Key used in localStorage
const NKD_AUTH_KEY = 'nkd_user';

/* -------- Core getters and setters -------- */
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(NKD_AUTH_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setUser(user) {
  localStorage.setItem(NKD_AUTH_KEY, JSON.stringify(user || null));
}

export function clearUser() {
  localStorage.removeItem(NKD_AUTH_KEY);
}

export function isLoggedIn() {
  return !!getUser();
}

/* -------- Auth Guards -------- */
export function requireAuth() {
  if (!isLoggedIn()) {
    location.href = 'login.html';
  }
}

export function hasRole(...roles) {
  const u = getUser();
  if (!u) return false;
  return roles.includes(u.role);
}

export function requireRole(allowed) {
  const roles = Array.isArray(allowed) ? allowed : [allowed];
  if (!hasRole(...roles)) {
    location.href = 'unauthorized.html';
  }
}

/* -------- ACL Map (for finer permissions) -------- */
const ACL = {
  'meetings:view': ['admin', 'secretary'],
  'meetings:edit': ['admin', 'secretary'],
  'projects:view': ['admin', 'project-manager'],
  'projects:edit': ['admin', 'project-manager'],
  'finance:edit': ['admin', 'financial'],
  'members:manage': ['admin'],
};

export function can(action) {
  const u = getUser();
  if (!u) return false;
  const allowed = ACL[action] || [];
  return allowed.includes(u.role);
}

/* -------- Navbar Role Conditioning --------
   Add data-roles="admin,secretary" to elements to show only
   for those roles.  Add data-user-slot to show "Name • Role".
---------------------------------------------------------- */
export function conditionNav() {
  const u = getUser();

  // Hide restricted links
  document.querySelectorAll('[data-roles]').forEach(el => {
    const allowed = (el.dataset.roles || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (allowed.length && (!u || !allowed.includes(u.role))) {
      el.style.display = 'none';
    }
  });

  // Show name + role if slot exists
  const slot = document.querySelector('[data-user-slot]');
  if (slot && u) slot.textContent = `${u.name} • ${prettyRole(u.role)}`;
}

/* -------- Pretty Role Text -------- */
export function prettyRole(role) {
  return (role || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, m => m.toUpperCase());
}

/* -------- Role-Based Landing After Login -------- */
export function goHomeByRole(user) {
  switch (user.role) {
    case 'admin':
      location.href = 'admin-dashboard.html';
      break;
    case 'secretary':
      location.href = 'admin-secretary.html';
      break;
    case 'project-manager':
      location.href = 'projects-dashboard.html';
      break;
    case 'financial':
      location.href = 'admin-expenditures.html';
      break;
    case 'viewer':
      location.href = 'admin-projects.html'; // read-only area
      break;
    default:
      location.href = 'member-dashboard.html';
  }
}