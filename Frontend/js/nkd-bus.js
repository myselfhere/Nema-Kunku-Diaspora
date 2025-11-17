// Frontend/js/nkd-bus.js
// Unified helpers for NKD public, member, admin & president pages

/* ---------------- URL + Storage ---------------- */
const LS = {
  user: "nkd_user",
  api: "nkd_api_base",
};

function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}
function load(key, d = null) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : d;
  } catch {
    return d;
  }
}

/* ---------------- API Base ---------------- */
<<<<<<< HEAD
// Render server API base
=======
// IMPORTANT: change this to localhost when testing locally if you want
>>>>>>> 1c25477 (Updated member filtering + contribution pages)
const DEFAULT_API = "https://nema-kunku-diaspora.onrender.com/api";

export function setApiBase(url) {
  save(LS.api, url || DEFAULT_API);
}
export function getApiBase() {
  return load(LS.api, DEFAULT_API);
}

(() => console.log("[NKD] API base (saved):", getApiBase()))();

/* ---------------- Tiny fetch client ---------------- */
async function request(path, opts = {}) {
  const base = getApiBase();
  const url = path.startsWith("http")
    ? path
    : base.replace(/\/$/, "") + "/" + path.replace(/^\//, "");

  console.log("[NKD] → request", opts.method || "GET", url);

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const msg = `${res.status} ${res.statusText}: ${text}`;
    console.error("[NKD] ← error", msg);
    throw new Error(msg);
  }

  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

/* ---- NEW: named HTTP helpers so `import { get }` works ---- */
export function get(path) {
  return request(path);
}
export function post(path, body) {
  return request(path, { method: "POST", body: JSON.stringify(body) });
}
export function put(path, body) {
  return request(path, { method: "PUT", body: JSON.stringify(body) });
}
export function del(path) {
  return request(path, { method: "DELETE" });
}

/* ---------------- API facade ---------------- */
export const api = {
  base: getApiBase,
  setBase: setApiBase,
  get,
  post,
  put,
  del,

  async getMembers() {
    const r = await request("/members").catch(() => ({ items: [] }));
    console.log("[NKD] getMembers OK, raw:", r);
    return Array.isArray(r) ? r : r.items || [];
  },
  async getContributions() {
    const r = await request("/contributions").catch(() => ({ items: [] }));
    return Array.isArray(r) ? r : r.items || [];
  },
  async getMeetings() {
    const r = await request("/meetings").catch(() => ({ items: [] }));
    return Array.isArray(r) ? r : r.items || [];
  },
};

/* ---------------- User session ---------------- */
export function getUser() {
  return load(LS.user, null);
}
export function setUser(u) {
  save(LS.user, u);
}
export function clearUser() {
  localStorage.removeItem(LS.user);
}

/* ----------------------------------------------------
   ROLE → HOME PAGE (UPDATED & CORRECTED)
----------------------------------------------------- */
export function roleHome(role = "member") {
  const r = (role || "").toLowerCase();

<<<<<<< HEAD
  switch (r) {
    case "admin":
    case "president":
      return "admin-dashboard.html";

    case "financial":
      return "financial-dashboard.html";

    case "project-manager":
      return "project-dashboard.html";

    case "secretary":
      return "secretary-dashboard.html";

    case "viewer":
      return "admin-members.html";

    default:
      return "member-dashboard.html";
  }
=======
  if (r === "president") return "president-dashboard.html";
  if (r === "admin") return "admin-dashboard.html";
  if (r === "financial") return "financial-dashboard.html";
  if (r === "project-manager") return "project-dashboard.html";
  if (r === "secretary") return "secretary-dashboard.html";
  if (r === "viewer") return "admin-members.html";

  return "member-dashboard.html";
>>>>>>> 1c25477 (Updated member filtering + contribution pages)
}

/* ---------------- Guard for restricted pages ---------------- */
export function requireRole(roles = []) {
  const u = getUser();
  if (!u) return go("login.html");
  if (!roles.length) return;

  const ok = roles.map(r => r.toLowerCase())
                  .includes((u.role || "").toLowerCase());

  if (!ok) go(roleHome(u.role || "member"));
}

/* ---------------- Navigation ---------------- */
export function go(href) {
  if (!href) return;
  const clean = href.replace(/\/Frontend\/Frontend\//g, "/Frontend/");
  location.href = clean;
}

<<<<<<< HEAD
=======
/**
 * Highlight the active nav item and show the user in the header.
 */
>>>>>>> 1c25477 (Updated member filtering + contribution pages)
export function activeNav(key = "") {
  const want = String(key || "").toLowerCase();
  const links = Array.from(
    document.querySelectorAll("header a, .admin-topbar a, nav a, .navbar a")
  );

  links.forEach((a) => {
    const k = (a.dataset.key || a.textContent || "")
      .trim()
      .toLowerCase();
    a.classList.toggle("active", want && k === want);
  });

  const u = getUser();
  const pill = document.querySelector("[data-user-slot]");
  if (pill && u) {
    const who = u.name || u.memberId || u.email || "Member";
    const role = (u.role || "member").toLowerCase();
    pill.textContent = `${who} • ${role}`;
  }
}

/* ---------------- Formatting ---------------- */
const euro = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});

const dalasi = new Intl.NumberFormat("en-GM", {
  style: "currency",
  currency: "GMD",
});

// EUR with 2 decimals
export const fmtEUR = (v) => euro.format(Number(v || 0));

// GMD with NO decimals: D3000, D150, etc.
export const fmtGMD = (v) => {
  const num = Number(v || 0);
  const rounded = Math.round(num);
  return `D${rounded}`;
};

export function toYYYYMMDD(d) {
  const x = new Date(d);
  if (isNaN(x)) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}

export function toDDMMYYYY(d) {
  const x = new Date(d);
  if (isNaN(x)) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(x.getDate())}-${p(x.getMonth() + 1)}-${x.getFullYear()}`;
}

/* ---------------- DOM helpers ---------------- */
export const $ = (s) => document.querySelector(s);
export const $$ = (s) => Array.from(document.querySelectorAll(s));
export const text = (s, v) => {
  const el = $(s);
  if (el) el.textContent = v;
};

/* ---------------- Member Normalisation ---------------- */
export const norm = (v = "") => String(v || "").trim();

export function normalizeMember(raw = {}) {
  if (!raw) return null;

  const memberId =
    raw.memberId || raw.memberID || raw.code || raw.id || "";

  const name =
    raw.name ||
    [raw.firstName, raw.lastName].filter(Boolean).join(" ") ||
    "";

  const email = raw.email || raw.username || "";
  const phone = raw.phone || raw.contact || raw.mobile || "";
  const country = raw.country || raw.location || "";
  const role = (raw.role || "member").toLowerCase();
  const contributionPlan = raw.contributionPlan || raw.plan || "Annually";
  const status = raw.status || "Active";

  const joinedRaw =
    raw.memberSince || raw.joined || raw.joinDate || raw.createdAt;
  const memberSince = joinedRaw ? toYYYYMMDD(joinedRaw) : "";

  return {
    ...raw,
    _id: raw._id || raw.id || null,
    memberId,
    name,
    email,
    phone,
    country,
    role,
    contributionPlan,
    status,
    memberSince,
  };
}

export async function resolveMemberByIdentifier(identifier = "") {
  const id = norm(identifier);
  if (!id) return null;

  try {
    const one = await api.get(`/members/${encodeURIComponent(id)}`);
    if (one && (one._id || one.memberId || one.email))
      return normalizeMember(one);
  } catch {}

  const list = await api.getMembers().catch(() => []);
  const needle = id.toLowerCase();

  const found =
    list.find(
      (m) =>
        (m.memberId &&
          String(m.memberId).toLowerCase() === needle) ||
        (m.email &&
          String(m.email).toLowerCase() === needle)
    ) || null;

  return found ? normalizeMember(found) : null;
}

/* ---------------- Offline role guess ---------------- */
export function offlineRoleFromEmail(email = "") {
  const e = (email || "").toLowerCase();

<<<<<<< HEAD
  if (e.includes("salme") || e.includes("nkd001")) return "admin";
=======
  if (e.includes("salme") || e === "nkd001") return "admin";
>>>>>>> 1c25477 (Updated member filtering + contribution pages)
  if (e.includes("president")) return "president";
  if (e.includes("secretary")) return "secretary";
  if (e.includes("financial")) return "financial";
  if (e.includes("project")) return "project-manager";
  if (e.includes("viewer")) return "viewer";

  return "member";
}

<<<<<<< HEAD
/* ---------------- Toast ---------------- */
=======
/* ---------------- Toast helper ---------------- */
>>>>>>> 1c25477 (Updated member filtering + contribution pages)
export function toast(message, type = "info") {
  if (!message) return;

  let box = document.getElementById("nkd-toast");
  if (!box) {
    box = document.createElement("div");
    box.id = "nkd-toast";
    box.style.position = "fixed";
    box.style.left = "50%";
    box.style.bottom = "24px";
    box.style.transform = "translateX(-50%)";
    box.style.padding = "10px 18px";
    box.style.borderRadius = "999px";
    box.style.fontSize = "14px";
    box.style.fontWeight = "600";
    box.style.background = "#2e7d32";
    box.style.color = "#fff";
    box.style.boxShadow = "0 8px 20px rgba(0,0,0,.18)";
    box.style.zIndex = "9999";
    box.style.opacity = "0";
    box.style.transition = "opacity .2s";
    document.body.appendChild(box);
  }

  box.textContent = message;

  if (type === "error") box.style.background = "#b00020";
  else if (type === "warn") box.style.background = "#f9a825";
  else box.style.background = "#2e7d32";

  box.style.opacity = "1";

  clearTimeout(box._hideTimer);
  box._hideTimer = setTimeout(() => {
    box.style.opacity = "0";
  }, 2500);
}