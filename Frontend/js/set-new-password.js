// Frontend/js/nkd-bus.js
// Central API helper + auth storage (admin portal, offline-friendly)

// =======================================
// Prefer this if you know your API port:
window.NKD_API_BASE = window.NKD_API_BASE || ""; // e.g. "http://localhost:4000/api"
// =======================================

const LS_USER = "nkd_user";            // { memberId, name, role, email, token? }
const LS_SESSION_OLD = "nkd_session";  // legacy (no token)
const LS_API_BASE = "nkd_api_base";    // remembers the working base

// Probe list if NKD_API_BASE not provided:
const CANDIDATE_BASES = [
  "http://localhost:4000/api",
  "http://localhost:5000/api",
];

/* ---------------- Auth storage ---------------- */
export function getUser() {
  try {
    const raw = localStorage.getItem(LS_USER);
    if (raw) return JSON.parse(raw);

    // Upgrade legacy session (no token)
    const legacy = localStorage.getItem(LS_SESSION_OLD);
    if (legacy) {
      const u = JSON.parse(legacy);
      const up = { memberId: u.memberId, name: u.name, role: u.role, email: u.email };
      localStorage.setItem(LS_USER, JSON.stringify(up));
      return up;
    }
    return null;
  } catch {
    return null;
  }
}

export function setUser(u) {
  if (!u || typeof u !== "object") { localStorage.removeItem(LS_USER); return; }
  localStorage.setItem(LS_USER, JSON.stringify(u));
}

export function clearUser() {
  localStorage.removeItem(LS_USER);
  localStorage.removeItem(LS_SESSION_OLD);
}

/* ------------- Simple guard (dev-friendly) ------------- */
export function requireAuth({ role } = {}) {
  const u = getUser();
  if (!u || !u.memberId || !u.role) {
    window.location.href = "login.html";
    throw new Error("Unauthorized");
  }
  if (role && String(u.role).toLowerCase() !== String(role).toLowerCase()) {
    alert("Access denied.");
    window.location.href = "member-dashboard.html";
    throw new Error("Forbidden");
  }
  return u;
}

export function authHeaders() {
  const u = getUser();
  const h = { "Content-Type": "application/json" };
  if (u?.token) h.Authorization = `Bearer ${u.token}`;
  return h;
}

/* ---------------- Base URL discovery ---------------- */
function rememberedBase() {
  return localStorage.getItem(LS_API_BASE) || "";
}

function rememberBase(b) {
  localStorage.setItem(LS_API_BASE, b);
}

export function resetApiBase() {
  localStorage.removeItem(LS_API_BASE);
}

async function detectBase() {
  // If explicit global set, use it
  if (window.NKD_API_BASE) return window.NKD_API_BASE;

  // If we already remembered a working base, try it first
  const remembered = rememberedBase();
  const order = remembered ? [remembered, ...CANDIDATE_BASES.filter(b => b !== remembered)] : [...CANDIDATE_BASES];

  for (const base of order) {
    try {
      const ok = await fetch(`${base.replace(/\/+$/,'')}/health`, { method: "GET" });
      if (ok.ok) {
        rememberBase(base);
        return base;
      }
    } catch {/* ignore and try next */}
  }
  // fallback to first candidate
  const fallback = CANDIDATE_BASES[0];
  rememberBase(fallback);
  return fallback;
}

/* ---------------- Low-level request ---------------- */
async function request(method, path, body, flags = {}) {
  const base = (window.NKD_API_BASE && window.NKD_API_BASE.trim()) ? window.NKD_API_BASE.trim() : await detectBase();
  const url = String(path || "").startsWith("http") ? path : `${base}${path}`;

  const res = await fetch(url, {
    method,
    headers: { ...authHeaders() },
    // No cookies → keep CORS simple
    credentials: "omit",
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}

  if (!res.ok) {
    const msg = (json && (json.error || json.message)) || res.statusText || "Request failed";
    const err = new Error(msg);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

/* ---------------- API (object + named funcs) ---------------- */
const apiImpl = {
  async base() { return (window.NKD_API_BASE && window.NKD_API_BASE.trim()) ? window.NKD_API_BASE.trim() : (rememberedBase() || await detectBase()); },
  resetBase: resetApiBase,
  get:  (p, f)       => request("GET",    p, null, f),
  post: (p, body, f) => request("POST",   p, body, f),
  put:  (p, body, f) => request("PUT",    p, body, f),
  del:  (p, f)       => request("DELETE", p, null, f),
};

export default apiImpl;                    // supports: import api from "./nkd-bus.js";
export const api = apiImpl;                // supports: import { api } from "./nkd-bus.js";
export const get  = apiImpl.get;
export const post = apiImpl.post;
export const put  = apiImpl.put;
export const del  = apiImpl.del;

/* ---------------- Utilities ---------------- */
export async function ensureOnline() {
  try {
    const base = await apiImpl.base();
    const res = await fetch(`${base.replace(/\/+$/,'')}/health`, { method: "GET", credentials: "omit" });
    return res.ok;
  } catch { return false; }
}

export function saveLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadLocal(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}