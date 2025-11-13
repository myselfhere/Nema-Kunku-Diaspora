// Admin Profile — load current admin + guard
import { requireAuth } from "./auth.js";

// 1) Guard: must be admin
const ses = requireAuth({ role: "admin" }); // redirects if not

// 2) Helpers
const $ = (s) => document.querySelector(s);
const set = (sel, val) => { const el = $(sel); if (el) el.value = val ?? ""; };
const setText = (sel, val) => { const el = $(sel); if (el) el.textContent = val ?? ""; };

// 3) Load full member record (API first, LS fallback)
async function loadMe() {
  // Try API by email or memberId
  try {
    // GET /api/members then find me (simpler than adding a /me route right now)
    const res = await fetch("/api/members");
    if (res.ok) {
      const all = await res.json();
      const me = all.find(
        m =>
          (m.memberId && m.memberId.toLowerCase() === (ses.memberId || "").toLowerCase()) ||
          (m.email && m.email.toLowerCase() === (ses.email || "").toLowerCase())
      );
      if (me) return me;
    }
  } catch (_) {}

  // Fallback: LocalStorage mirror
  try {
    const ls = JSON.parse(localStorage.getItem("nkd_members")) || [];
    const me = ls.find(
      m =>
        (m.memberId && m.memberId.toLowerCase() === (ses.memberId || "").toLowerCase()) ||
        (m.email && m.email.toLowerCase() === (ses.email || "").toLowerCase())
    );
    if (me) return me;
  } catch (_) {}

  // Minimal from session
  return {
    memberId: ses.memberId,
    name: ses.name,
    email: ses.email,
    role: ses.role,
  };
}

// 4) Render profile form
function render(me) {
  // Account
  set("#acc_memberId", me.memberId);
  set("#acc_role", (me.role || "member").toLowerCase());
  set("#acc_since", toDDMMYYYY(me.memberSince || me.joined || me.joinedOn));

  // Personal
  set("#p_name", me.name);
  set("#p_email", me.email);
  set("#p_phone", me.phone);
  set("#p_country", me.country);
  set("#p_position", me.position);
  set("#p_contact", me.contactMethod || me.preferredContact || "");

  // UI: top badge / header (optional)
  setText("#hdr_name", me.name || "—");
  setText("#hdr_id", me.memberId || "");
  setText("#hdr_role", (me.role || "member").toLowerCase());
}

// 5) Save handler (optional now — keeps it admin-only for today)
async function handleSave(e) {
  e?.preventDefault();

  // Build payload from the form (only safe fields)
  const payload = {
    name: $("#p_name")?.value?.trim(),
    email: $("#p_email")?.value?.trim().toLowerCase(),
    phone: $("#p_phone")?.value?.trim(),
    country: $("#p_country")?.value?.trim(),
    position: $("#p_position")?.value?.trim(),
    contactMethod: $("#p_contact")?.value || "",
  };

  // Try API first
  try {
    // Need the _id to PUT via API; if we don’t have it, fall back to LS write
    const resAll = await fetch("/api/members");
    if (resAll.ok) {
      const all = await resAll.json();
      const me = all.find(
        m =>
          (m.memberId && m.memberId.toLowerCase() === (ses.memberId || "").toLowerCase()) ||
          (m.email && m.email.toLowerCase() === (ses.email || "").toLowerCase())
      );
      if (me && me._id) {
        const res = await fetch(`/api/members/${me._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("API save failed");
        alert("Profile updated.");
        return;
      }
    }
  } catch (_) {}

  // Fallback: LocalStorage update
  try {
    const list = JSON.parse(localStorage.getItem("nkd_members")) || [];
    const i = list.findIndex(
      m =>
        (m.memberId && m.memberId.toLowerCase() === (ses.memberId || "").toLowerCase()) ||
        (m.email && m.email.toLowerCase() === (ses.email || "").toLowerCase())
    );
    if (i >= 0) {
      list[i] = { ...list[i], ...payload };
      localStorage.setItem("nkd_members", JSON.stringify(list));
      alert("Profile updated (offline).");
    } else {
      alert("Could not find your record to update.");
    }
  } catch {
    alert("Save failed (offline).");
  }
}

// 6) Utils
function toDDMMYYYY(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d)) return v;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

// 7) Init
(async () => {
  const me = await loadMe();
  render(me);

  // Wire save button if present
  document.getElementById("saveProfileBtn")?.addEventListener("click", handleSave);
})();