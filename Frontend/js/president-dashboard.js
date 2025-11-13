// Frontend/js/president-dashboard.js
// President overview dashboard

import { api, $, $$, getUser, requireRole } from "./nkd-bus.js";

// ✅ Allow both president and admin to view this page
requireRole(["president", "admin"]);

// -------- helpers --------
const fmtMoney = (v, cur) =>
  `${cur}${Number(v || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const put = (id, val) => {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
};

// -------- load data --------
async function loadMembers() {
  try {
    const list = await api.getMembers();
    const members = Array.isArray(list) ? list : (list.items || []);
    const total = members.length;
    const active = members.filter(
      (m) => (m.status || "").toLowerCase() === "active"
    ).length;
    const annual = members.filter(
      (m) => (m.contributionPlan || "").toLowerCase().includes("annual")
    ).length;
    const semi = members.filter(
      (m) => (m.contributionPlan || "").toLowerCase().includes("semi")
    ).length;

    put("k_members_total", total);
    put("k_members_active", active);
    put("k_members_annual", annual);
    put("k_members_semi", semi);
  } catch (err) {
    console.error("Members load failed", err);
  }
}

async function loadContributions() {
  try {
    const list = await api.getContributions?.();
    const rows = Array.isArray(list) ? list : (list.items || []);
    const now = new Date();
    const year = now.getFullYear();

    let eur = 0,
      gmd = 0,
      eurY = 0,
      gmdY = 0;

    for (const r of rows) {
      const d = r.date ? new Date(r.date) : null;
      const inYear = d && d.getFullYear() === year;
      const vE = Number(r.amountEUR || r.eur || 0);
      const vG = Number(r.amountGMD || r.gmd || 0);
      eur += vE;
      gmd += vG;
      if (inYear) {
        eurY += vE;
        gmdY += vG;
      }
    }

    put("k_contrib_eur", fmtMoney(eur, "€"));
    put("k_contrib_gmd", fmtMoney(gmd, "D"));
    put("k_contrib_eur_y", fmtMoney(eurY, "€"));
    put("k_contrib_gmd_y", fmtMoney(gmdY, "D"));
  } catch (err) {
    console.error("Contributions load failed", err);
  }
}

async function loadExpenditures() {
  try {
    const list = await api.getExpenditures?.();
    const rows = Array.isArray(list) ? list : (list.items || []);
    const now = new Date();
    const year = now.getFullYear();

    let eur = 0,
      gmd = 0,
      eurY = 0,
      gmdY = 0;

    for (const r of rows) {
      const d = r.date ? new Date(r.date) : null;
      const inYear = d && d.getFullYear() === year;
      const vE = Number(r.amountEUR || r.eur || 0);
      const vG = Number(r.amountGMD || r.gmd || 0);
      eur += vE;
      gmd += vG;
      if (inYear) {
        eurY += vE;
        gmdY += vG;
      }
    }

    put("k_exp_eur", fmtMoney(eur, "€"));
    put("k_exp_gmd", fmtMoney(gmd, "D"));
    put("k_exp_eur_y", fmtMoney(eurY, "€"));
    put("k_exp_gmd_y", fmtMoney(gmdY, "D"));
  } catch (err) {
    console.error("Expenditures load failed", err);
  }
}

async function loadProjects() {
  try {
    const list = await api.getProjects?.();
    const rows = Array.isArray(list) ? list : (list.items || []);
    const total = rows.length;
    const active = rows.filter(
      (p) => (p.status || "").toLowerCase() === "active"
    ).length;
    const completed = rows.filter(
      (p) => (p.status || "").toLowerCase() === "completed"
    ).length;

    put("k_proj_total", total);
    put("k_proj_active", active);
    put("k_proj_completed", completed);
  } catch (err) {
    console.error("Projects load failed", err);
  }
}

async function loadMeetings() {
  try {
    const list = await api.getMeetings?.();
    const rows = Array.isArray(list) ? list : (list.items || []);
    const total = rows.length;

    put("k_meet_total", total);
  } catch (err) {
    console.error("Meetings load failed", err);
  }
}

// -------- init --------
document.addEventListener("DOMContentLoaded", () => {
  // top user slot text
  const u = getUser();
  const slot = document.querySelector("[data-user-slot]");
  if (slot) slot.textContent = `${u?.name || "President"} • ${u?.role || "president"}`;

  loadMembers();
  loadContributions();
  loadExpenditures();
  loadProjects();
  loadMeetings();
});