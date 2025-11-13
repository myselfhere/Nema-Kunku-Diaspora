/* ===== OFFLINE AUTH (LocalStorage only) =====
 * Keys in LocalStorage:
 *  - nkd_members        : Array<Member>
 *  - nkd_session        : { memberId, name, role, email }
 *  - nkd_must_change    : memberId string (requires password change)
 *
 * Roles we recognise for staff access:
 *  - admin, financial, project-manager, secretary, viewer
 *  ("admin" is superuser → passes all role checks)
 */

const LS_USERS    = "nkd_members";
const LS_SESSION  = "nkd_session";
const LS_FORCE    = "nkd_must_change";

const lc = (s) => String(s ?? "").trim().toLowerCase();

/* ------------------------------------------------
 * Seeding (for first run / offline dev)
 * ------------------------------------------------ */
function loadUsers() {
  try { return JSON.parse(localStorage.getItem(LS_USERS)) || []; }
  catch { return []; }
}
function saveUsers(list) {
  localStorage.setItem(LS_USERS, JSON.stringify(list || []));
}
function ensureSeedAdmin() {
  const users = loadUsers();
  if (users.length) return;

  const admin = {
    memberId: "NKD001",
    name: "Salme Ture",
    email: "salmemture@gmail.com",
    role: "admin",
    country: "United Kingdom",
    position: "Administrator",
    memberSince: "2018-01-03",
    contributionPlan: "Annual €100",
    password: "admin",              // DEV ONLY (plain text)
    mustChangePassword: false,
    totalPaidEur: 0,
    totalPaidGmd: 0,
  };
  saveUsers([admin]);
}
ensureSeedAdmin();

/* ------------------------------------------------
 * Sessions
 * ------------------------------------------------ */
export function getSession() {
  try { return JSON.parse(localStorage.getItem(LS_SESSION)) || null; }
  catch { return null; }
}

export function setSession(user) {
  const payload = {
    memberId: user.memberId,
    name: user.name,
    role: user.role || "member",
    email: user.email || "",
  };
  localStorage.setItem(LS_SESSION, JSON.stringify(payload));
}

export function clearSession() {
  localStorage.removeItem(LS_SESSION);
}

export function logout() {
  clearSession();
  location.href = "login.html";
}

/* ------------------------------------------------
 * Users (offline)
 * ------------------------------------------------ */
export function allUsers() {
  return loadUsers();
}

export function saveUser(updated) {
  const users = loadUsers();
  const i = users.findIndex(u => lc(u.memberId) === lc(updated.memberId));
  if (i >= 0) users[i] = { ...users[i], ...updated };
  else users.push(updated);
  saveUsers(users);
  return updated;
}

export function findUserByLogin(loginId) {
  const key = lc(loginId);
  return loadUsers().find(u => lc(u.memberId) === key || lc(u.email) === key) || null;
}

export function findUserByMemberId(memberId) {
  const key = lc(memberId);
  return loadUsers().find(u => lc(u.memberId) === key) || null;
}

/* ------------------------------------------------
 * Password (offline dev)
 * ------------------------------------------------ */
function verifyPassword(user, password) {
  if (!("password" in user) || user.password == null) {
    return String(password || "").length > 0;
  }
  return String(user.password) === String(password);
}

export function setPassword(memberId, newPass) {
  const users = loadUsers();
  const i = users.findIndex(u => lc(u.memberId) === lc(memberId));
  if (i >= 0) {
    users[i].password = String(newPass);
    users[i].mustChangePassword = false;
    saveUsers(users);
  }
}

/* ------------------------------------------------
 * Must-change flag
 * ------------------------------------------------ */
export function mustChange(memberId) {
  localStorage.setItem(LS_FORCE, String(memberId || ""));
}
export function clearMustChange() {
  localStorage.removeItem(LS_FORCE);
}
export function readMustChange() {
  return localStorage.getItem(LS_FORCE) || "";
}

/* ------------------------------------------------
 * Login & Redirect helpers
 * ------------------------------------------------ */
export function loginOffline({ loginId, password }) {
  const user = findUserByLogin(loginId);
  if (!user) return { ok: false, error: "User not found." };

  if (!verifyPassword(user, password)) {
    return { ok: false, error: "Invalid credentials." };
  }

  if (user.mustChangePassword) {
    mustChange(user.memberId);
  } else {
    clearMustChange();
  }

  setSession(user);
  return { ok: true, user };
}

export function redirectAfterLogin(user) {
  const r = lc(user.role);
  const staff = ["admin", "financial", "project-manager", "secretary"];
  if (staff.includes(r)) {
    location.href = "admin-dashboard.html";
  } else {
    const q = new URLSearchParams({ memberId: user.memberId || "" });
    location.href = `member-dashboard.html?${q}`;
  }
}

/* ------------------------------------------------
 * Role helpers / Guards
 * ------------------------------------------------ */
function hasRole(user, wanted) {
  if (lc(user.role) === "admin") return true;
  if (!wanted) return true;
  if (Array.isArray(wanted)) return wanted.map(lc).includes(lc(user.role));
  return lc(user.role) === lc(wanted);
}

/** requireAuth({ role?: string, roles?: string[], forcePasswordChange?: boolean }) */
export function requireAuth(opts = {}) {
  const ses = getSession();
  if (!ses) { location.href = "login.html"; return; }

  const wanted = opts.roles ?? opts.role ?? null;
  if (!hasRole(ses, wanted)) {
    const q = new URLSearchParams({ memberId: ses.memberId || "" });
    location.href = `member-dashboard.html?${q}`;
    return;
  }

  if (opts.forcePasswordChange) {
    const must = readMustChange();
    if (must && lc(must) === lc(ses.memberId)) {
      location.href = "change-password.html";
      return;
    }
  }
  return ses;
}

/* ------------------------------------------------
 * Convenience (expose constants if needed)
 * ------------------------------------------------ */
export const AUTH_KEYS = { LS_USERS, LS_SESSION, LS_FORCE };