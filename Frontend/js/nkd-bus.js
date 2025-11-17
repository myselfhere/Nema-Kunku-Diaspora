// Frontend/js/nkd-bus.js
// Shared helpers for API calls, login state & navigation

const STORAGE_USER_KEY = "nkdUser";
const STORAGE_API_KEY = "nkdApiBase";

// Default backend API base
const DEFAULT_API_BASE = "https://nema-kunku-diaspora.onrender.com/api";

/* ================================
   API BASE HELPERS
================================ */
export function getApiBase() {
  try {
    const saved = localStorage.getItem(STORAGE_API_KEY);
    return saved || DEFAULT_API_BASE;
  } catch {
    return DEFAULT_API_BASE;
  }
}

export function setApiBase(base) {
  try {
    localStorage.setItem(STORAGE_API_KEY, base);
  } catch {
    // ignore
  }
}

/* ================================
   FETCH WRAPPER
================================ */
async function request(method, path, body) {
  const base = getApiBase();
  const url = base.replace(/\/+$/, "") + path;

  console.log(`[NKD] API base (saved):`, base);
  console.log(`[NKD] → request ${method} ${url}`);

  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (body != null && method !== "GET") {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = data && data.message ? data.message : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

// Simple shortcuts used in some pages
export const get = (path) => request("GET", path);
export const post = (path, body) => request("POST", path, body);
export const put = (path, body) => request("PUT", path, body);
export const del = (path) => request("DELETE", path);

// Grouped api object (used in login + dashboards)
export const api = { get, post, put, delete: del };

/* ================================
   USER STORAGE
================================ */
export function setUser(user) {
  try {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user || {}));
  } catch {
    // ignore
  }
}

export function getUser() {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearUser() {
  try {
    localStorage.removeItem(STORAGE_USER_KEY);
  } catch {
    // ignore
  }
}

/* ================================
   NAVIGATION HELPERS
================================ */
export function go(page) {
  if (!page) return;
  window.location.href = page;
}

/**
 * Decide which dashboard/home page based on role.
 */
export function roleHome(role = "member") {
  const r = (role || "").toLowerCase();

  if (r === "admin" || r === "superadmin") return "admin-dashboard.html";
  if (r === "financial" || r === "finance") return "financial-dashboard.html";
  if (r === "secretary") return "secretary-dashboard.html";
  if (r === "president") return "president-dashboard.html";
  if (r === "project-manager" || r === "projects") return "project-dashboard.html";

  // Default: member portal
  return "member-dashboard.html";
}

/**
 * Offline fallback role based on email / identity.
 * Used only when backend login fails but you still want
 * to browse dashboards locally.
 */
export function offlineRoleFromEmail(identity = "") {
  const id = identity.toLowerCase();

  if (id.includes("admin")) return "admin";
  if (id.includes("finance") || id.includes("financial")) return "financial";
  if (id.includes("secretary") || id.includes("sec")) return "secretary";
  if (id.includes("president") || id.includes("chair")) return "president";
  if (id.includes("project")) return "project-manager";

  return "member";
}

/* ================================
   SIMPLE LOGOUT (optional helper)
================================ */
export function logout() {
  clearUser();
  go("login.html");
}