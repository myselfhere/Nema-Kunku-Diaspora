// Frontend/js/admin-projects.js
// Projects list page: fetch, filter, render, CSV, delete

import { api, activeNav } from "./nkd-bus.js";

// ---------- DOM ----------
const els = {
  status: document.getElementById("statusFilter"),
  responsible: document.getElementById("responsibleFilter"),
  addBtn: document.getElementById("addProjectBtn"),
  exportBtn: document.getElementById("exportBtn"),

  tbody: document.getElementById("projectsTbody"),
  prev: document.getElementById("pagerPrev"),
  next: document.getElementById("pagerNext"),
  pageInfo: document.getElementById("pageInfo"),
};

// Fallback stubs so older HTML doesn't crash
Object.keys(els).forEach(k => {
  if (!els[k]) els[k] = {
    value: "", innerText: "", disabled: false,
    addEventListener(){}, setAttribute(){}, removeAttribute(){},
    appendChild(){}, querySelector(){}, classList: { add(){}, remove(){}, toggle(){} }
  };
});

// ---------- State ----------
let all = [];
let filtered = [];
let page = 1;
const PAGE_SIZE = 20;

// ---------- Helpers ----------
const n = v => Number(v || 0);
const toYYYYMMDD = v => {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d)) return "-";
  const pad = x => String(x).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
};

function applyFilters() {
  const s = (els.status.value || "").toLowerCase();
  const r = (els.responsible.value || "").toLowerCase();

  filtered = all.filter(p => {
    const okS = !s || s === "all" || (p.status || "").toLowerCase() === s;
    const okR = !r || r === "all" || (p.responsible || "").toLowerCase().includes(r);
    return okS && okR;
  });
  page = 1;
  render();
}

function render() {
  // Table
  const body = els.tbody;
  if (!body) return;
  body.innerHTML = "";

  const start = (page - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, filtered.length);
  const slice = filtered.slice(start, end);

  if (!slice.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="8" class="muted">No projects found.</td>`;
    body.appendChild(tr);
  } else {
    slice.forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.projectId || p.id || "-"}</td>
        <td>${p.name || "-"}</td>
        <td>${p.status || "-"}</td>
        <td>${n(p.budgetGMD).toLocaleString("en-GB")}</td>
        <td>${n(p.expenditureGMD).toLocaleString("en-GB")}</td>
        <td>${toYYYYMMDD(p.startDate)}</td>
        <td>${toYYYYMMDD(p.endDate)}</td>
        <td>${p.responsible || "-"}</td>
        <td class="right">
          <a class="btn btn-small" href="admin-project-view.html?id=${encodeURIComponent(p._id || p.id || p.projectId || "")}">View</a>
          <a class="btn btn-small" href="admin-project-edit.html?id=${encodeURIComponent(p._id || p.id || p.projectId || "")}">Edit</a>
          <button class="btn btn-small btn-danger" data-del="${p._id || p.id || p.projectId || ""}">Delete</button>
        </td>
      `;
      body.appendChild(tr);
    });
  }

  // Pager
  if (els.pageInfo) {
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    els.pageInfo.innerText = `Page ${page} of ${pages}`;
  }
  if (els.prev) els.prev.disabled = page <= 1;
  if (els.next) els.next.disabled = end >= filtered.length || filtered.length === 0;

  // Wire delete buttons after render
  body.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-del");
      if (!id) return;
      if (!confirm("Delete this project? This cannot be undone.")) return;

      try {
        // Prefer api.delete; fall back to api.del if present
        const doDelete = api.delete ? api.delete.bind(api) : (api.del ? api.del.bind(api) : null);
        if (!doDelete) throw new Error("Delete method not available on api helper.");

        await doDelete(`/projects/${encodeURIComponent(id)}`);
        // Remove from local state and re-render
        all = all.filter(p => (p._id || p.id || p.projectId) !== id);
        applyFilters();
      } catch (err) {
        console.error("Delete failed:", err);
        alert("Failed to delete project. Please try again.");
      }
    });
  });
}

// ---------- CSV ----------
function exportCSV() {
  const headers = ["Project ID","Name","Status","Budget GMD","Expenditure GMD","Start","End","Responsible"];
  const rows = filtered.map(p => [
    p.projectId || p.id || "",
    p.name || "",
    p.status || "",
    n(p.budgetGMD),
    n(p.expenditureGMD),
    toYYYYMMDD(p.startDate),
    toYYYYMMDD(p.endDate),
    p.responsible || "",
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(x => `"${String(x).replaceAll('"','""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "projects.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- Load ----------
async function loadProjects() {
  try {
    // Try paged endpoint first (consistent with members)
    const data = await api.get("/projects?page=1&limit=500");
    all = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
  } catch {
    // Fallback to helper if you have one like api.getProjects()
    try {
      all = await api.getProjects();
    } catch (err2) {
      console.error("Projects load failed:", err2);
      all = [];
    }
  }

  // Populate "responsible" filter list if present
  if (els.responsible && els.responsible.tagName === "SELECT") {
    const uniq = [...new Set(all.map(p => (p.responsible || "").trim()).filter(Boolean))].sort();
    els.responsible.innerHTML = `<option value="all">All responsible persons</option>` +
      uniq.map(v => `<option value="${v}">${v}</option>`).join("");
  }

  filtered = all.slice();
  render();
}

// ---------- Events ----------
document.addEventListener("DOMContentLoaded", () => {
  activeNav?.("projects");

  els.status?.addEventListener("change", applyFilters);
  els.responsible?.addEventListener("change", applyFilters);

  els.prev?.addEventListener("click", () => { page = Math.max(1, page - 1); render(); });
  els.next?.addEventListener("click", () => { page += 1; render(); });

  els.exportBtn?.addEventListener("click", exportCSV);
  els.addBtn?.addEventListener("click", () => location.href = "admin-project-add.html");

  loadProjects();
});