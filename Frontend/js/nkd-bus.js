// Frontend/js/nkd-bus.js
// Unified helpers for NKD public, member, admin & president pages

/* ---------------- URL + Storage ---------------- */
const LS = {
  user: "nkd_user",
  api: "nkd_api_base",
};

function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function load(key, d = null) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : d;
  } catch {
    return d;
  }
}

/* ---------------- API Base ---------------- */
// ⬇️ IMPORTANT: use Render URL now, NOT localhost
const DEFAULT_API = "https://nema-kunku-diaspora.onrender.com/api";

export function setApiBase(url) { save(LS.api, url || DEFAULT_API); }
export function getApiBase() { return load(LS.api, DEFAULT_API); }

// Log for sanity
(() => console.log("[NKD] API base (saved):", getApiBase()))();

/* ---------------- Tiny fetch client ---------------- */
async function request(path, opts = {}) {
  const base = getApiBase();
  const url = path.startsWith("http")
    ? path
    : (base.replace(/\/$/, "") + "/" + path.replace(/^\//, ""));

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }

  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

export const api = {
  base: getApiBase,
  setBase: setApiBase,
  get: (p) => request(p),
  post: (p, body) => request(p, { method: "POST", body: JSON.stringify(body) }),
  put: (p, body) => request(p, { method: "PUT", body: JSON.stringify(body) }),
  del: (p) => request(p, { method: "DELETE" }),
  async getMembers() {
    const r = await request("/members").catch(() => ({ items: [] }));
    return Array.isArray(r) ? r : (r.items || []);
  },
  async getContributions() {
    const r = await request("/contributions").catch(() => ({ items: [] }));
    return Array.isArray(r) ? r : (r.items || []);
  },
  async getMeetings() {
    const r = await request("/meetings").catch(() => ({ items: [] }));
    return Array.isArray(r) ? r : (r.items || []);
  },
};

/* ---------------- User session ---------------- */
export function getUser() { return load(LS.user, null); }
export function setUser(u) { save(LS.user, u); }
export function clearUser() { localStorage.removeItem(LS.user); }

/* Role ➜ default home page */
export function roleHome(role = "member") {
  const r = (role || "").toLowerCase();

  // 🔸 President has own dashboard
  if (r === "president") {
    return "president-dashboard.html";
  }

  // 🔸 Admin & officers → admin dashboard
  if (["admin", "financial", "project-manager", "secretary"].includes(r)) {
    return "admin-dashboard.html";
  }

  // 🔸 Everyone else → member portal
  return "member-dashboard.html";
}

/* Guard for restricted pages */
export function requireRole(roles = []) {
  const u = getUser();
  if (!u) return go("login.html");
  if (!roles.length) return;

  const ok = roles
    .map(x => x.toLowerCase())
    .includes((u.role || "").toLowerCase());

  if (!ok) go(roleHome(u.role || "member"));
}

/* ---------------- Nav + routing ---------------- */
export function go(href) {
  if (!href) return;
  // Avoid accidental double /Frontend/Frontend/
  const clean = href.replace(/\/Frontend\/Frontend\//g, "/Frontend/");
  location.href = clean;
}

/**
 * Highlight the active nav item and show the user in the header.
 * Usage: activeNav("dashboard") or activeNav("members")
 * It matches against link[data-key] if present, else link text (lowercased).
 */
export function activeNav(key = "") {
  const want = String(key || "").toLowerCase();
  const links = Array.from(
    document.querySelectorAll("header a, .admin-topbar a, nav a, .navbar a")
  );

  links.forEach(a => {
    const k = (a.dataset.key || a.textContent || "").trim().toLowerCase();
    a.classList.toggle("active", want && k === want);
  });

  // Fill user pill if available
  const u = getUser();
  const pill = document.querySelector("[data-user-slot]");
  if (pill && u) {
    const who = u.name || u.memberId || u.email || "Member";
    const role = (u.role || "member").toLowerCase();
    pill.textContent = `${who} • ${role}`;
  }
}

/* ---------------- Formatting helpers ---------------- */
const euro = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2
});
const dalasi = new Intl.NumberFormat("en-GM", {
  style: "currency",
  currency: "GMD",
  minimumFractionDigits: 2
});

export const fmtEUR = (v) => euro.format(Number(v || 0));
export const fmtGMD = (v) => dalasi.format(Number(v || 0));

export function toYYYYMMDD(d) {
  if (!d) return "";
  const x = new Date(d);
  if (isNaN(x)) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}

export function toDDMMYYYY(d) {
  if (!d) return "";
  const x = new Date(d);
  if (isNaN(x)) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(x.getDate())}-${p(x.getMonth() + 1)}-${x.getFullYear()}`;
}

/* ---------------- DOM helpers ---------------- */
export const $  = (s) => document.querySelector(s);
export const $$ = (s) => Array.from(document.querySelectorAll(s));
export const text = (s, v) => {
  const el = $(s);
  if (el) el.textContent = v;
};

/* ---------------- Member resolving ---------------- */
export const norm = (v = "") => String(v || "").trim();

export async function resolveMemberByIdentifier(identifier = "") {
  const id = norm(identifier);
  if (!id) return null;

  try {
    const one = await api.get(`/members/${encodeURIComponent(id)}`);
    if (one && (one._id || one.memberId || one.email)) return one;
  } catch {}

  const list = await api.getMembers().catch(() => []);
  const needle = id.toLowerCase();

  return list.find(m =>
    (m?.memberId && String(m.memberId).toLowerCase() === needle) ||
    (m?.email    && String(m.email).toLowerCase()    === needle)
  ) || null;
}

/* ---------------- Offline role guess ---------------- */
export function offlineRoleFromEmail(email = "") {
  const e = (email || "").toLowerCase();

  // You (Salme) admin
  if (e.includes("salme") || e === "nkd001") return "admin";

  // President dashboard
  if (e.includes("president")) return "president";

  if (e.includes("secretary")) return "secretary";
  if (e.includes("financial")) return "financial";
  if (e.includes("project"))   return "project-manager";
  if (e.includes("viewer"))    return "viewer";

  return "member";
}