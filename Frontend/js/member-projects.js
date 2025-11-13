// Member projects (read-only list)
import { api, getUser } from "./nkd-bus.js";

const $ = (s) => document.querySelector(s);
const set = (s, v) => { const el = $(s); if (el) el.textContent = v; };

const toDDMMYYYY = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
};

const money = (v) => Number(v || 0).toLocaleString();

function isMineOrPublic(p, me) {
  const meId = me?._id || me?.memberId;
  const team = p?.team || p?.members || p?.assignedTo || [];
  const vis = (p?.visibility || "public").toLowerCase();
  const resp = p?.responsibleId || p?.responsible || "";
  const arr = Array.isArray(team) ? team.map(String) : [];
  return (
    vis === "public" ||
    String(resp) === String(meId) ||
    arr.includes(String(meId))
  );
}

async function load() {
  const me = getUser() || {};

  let items = [];
  try {
    // Use the generic GET to avoid depending on helper names
    // Expecting a shape like { items, total } or [] fallback
    const res = await api.get("/projects?page=1&limit=500");
    items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
  } catch (e) {
    console.error("Projects load failed:", e);
    items = [];
  }

  // Filter to member’s projects (or public)
  const myList = items.filter((p) => isMineOrPublic(p, me));

  // KPIs
  const total = myList.length;
  const active = myList.filter(p => (p.status || "").toLowerCase() === "active").length;
  const completed = myList.filter(p => (p.status || "").toLowerCase() === "completed").length;

  set("#kpiTotal", String(total));
  set("#kpiActive", String(active));
  set("#kpiCompleted", String(completed));

  // Table render
  const tbody = $("#memberProjectsTbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (myList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="muted">No projects to show.</td></tr>`;
    return;
  }

  for (const p of myList) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.projectId || p.id || "-"}</td>
      <td>${p.name || p.projectName || "-"}</td>
      <td>${p.status || "-"}</td>
      <td>${money(p.budgetGMD)}</td>
      <td>${money(p.expenditureGMD)}</td>
      <td>${toDDMMYYYY(p.startDate)}</td>
      <td>${toDDMMYYYY(p.endDate)}</td>
      <td>${p.responsiblePerson || p.responsible || "-"}</td>
    `;
    tbody.appendChild(tr);
  }
}

document.addEventListener("DOMContentLoaded", load);