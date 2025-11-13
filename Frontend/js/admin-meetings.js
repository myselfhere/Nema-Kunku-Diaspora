// Frontend/js/admin-meetings.js
// Meetings list page: KPIs, filters, table, CSV (dd-mm-yyyy date style)

import { api, activeNav } from "./nkd-bus.js";

// ---- DOM helpers ----
const el = (id) => document.getElementById(id);
const safe = (x) =>
  x ?? {
    value: "",
    innerText: "",
    disabled: false,
    addEventListener() {},
    classList: {},
    setAttribute() {},
    removeAttribute() {},
    appendChild() {},
    querySelector() {},
  };

const els = {
  // KPI cards
  kpiTotal: safe(el("kpiTotalMeetings")),
  kpiGeneral: safe(el("kpiGeneral")),
  kpiEmergency: safe(el("kpiEmergency")),
  kpiSpecial: safe(el("kpiSpecial")),

  // Filters
  q: safe(el("searchInput")),
  date: safe(el("dateFilter")),
  type: safe(el("typeFilter")),
  status: safe(el("statusFilter")),

  // Buttons
  addBtn: safe(el("addMeetingBtn")),
  exportBtn: safe(el("exportBtn")),

  // Table + pager
  tbody: safe(el("meetingsTbody")),
  pageInfo: safe(el("pageInfo")),
  prev: safe(el("pagerPrev")),
  next: safe(el("pagerNext")),
};

// ---- State ----
let all = [];
let filtered = [];
let page = 1;
const PAGE_SIZE = 20;

// ---- Helpers ----
const norm = (v) => (v || "").toString().trim().toLowerCase();

// Convert date → dd-mm-yyyy (local display)
function toDDMMYYYY(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d)) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
}

function computeKpis(list) {
  const total = list.length;
  const general = list.filter((m) =>
    ["general", "monthly", "regular"].includes(norm(m.type))
  ).length;
  const emergency = list.filter((m) => norm(m.type) === "emergency").length;
  const special = list.filter((m) => norm(m.type) === "special").length;

  els.kpiTotal.innerText = total;
  els.kpiGeneral.innerText = general;
  els.kpiEmergency.innerText = emergency;
  els.kpiSpecial.innerText = special;
}

function applyFilters() {
  const q = norm(els.q.value);
  const t = norm(els.type.value);
  const s = norm(els.status.value);
  const d = norm(els.date.value);

  filtered = all.filter((m) => {
    const txt = `${m.meetingId} ${m.topic} ${m.location} ${m.notes}`.toLowerCase();
    const okQ = !q || txt.includes(q);
    const okT = !t || t === "all" || norm(m.type) === t;
    const okS = !s || s === "all" || norm(m.status) === s;

    // date match (simple substring)
    const md = toDDMMYYYY(m.date).toLowerCase();
    const okD = !d || md.includes(d);

    return okQ && okT && okS && okD;
  });

  page = 1;
  render();
}

function render() {
  computeKpis(filtered);
  els.tbody.innerHTML = "";

  const start = (page - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, filtered.length);
  const rows = filtered.slice(start, end);

  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="8" class="muted">No meetings recorded.</td>`;
    els.tbody.appendChild(tr);
  } else {
    for (const m of rows) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${m.meetingId || m.id || "-"}</td>
        <td>${toDDMMYYYY(m.date)}</td>
        <td>${m.type || "-"}</td>
        <td>${m.topic || "-"}</td>
        <td>${m.location || "-"}</td>
        <td>${m.status || "-"}</td>
        <td>${m.attendees?.length ?? 0}</td>
        <td class="right">
          <a class="btn btn-small" href="admin-meeting-view.html?id=${encodeURIComponent(
            m._id || m.meetingId || ""
          )}">View</a>
        </td>
      `;
      els.tbody.appendChild(tr);
    }
  }

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  els.pageInfo.innerText = `Page ${page} of ${pages}`;
  els.prev.disabled = page <= 1;
  els.next.disabled = end >= filtered.length;
}

function exportCSV() {
  const headers = [
    "Meeting ID",
    "Date",
    "Type",
    "Topic",
    "Location",
    "Status",
    "Attendees",
  ];
  const rows = filtered.map((m) => [
    m.meetingId || m.id || "",
    toDDMMYYYY(m.date),
    m.type || "",
    m.topic || "",
    m.location || "",
    m.status || "",
    m.attendees?.length ?? 0,
  ]);

  const csv = [headers, ...rows]
    .map((r) => r.map((x) => `"${String(x).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "meetings.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---- Load ----
async function loadMeetings() {
  try {
    const data = await api.get("/meetings?page=1&limit=500");
    all = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Meetings load failed:", err);
    all = [];
  }
  filtered = all.slice();
  render();
}

// ---- Init ----
document.addEventListener("DOMContentLoaded", () => {
  activeNav("meetings");

  els.q.addEventListener?.("input", applyFilters);
  els.date.addEventListener?.("change", applyFilters);
  els.type.addEventListener?.("change", applyFilters);
  els.status.addEventListener?.("change", applyFilters);

  els.prev.addEventListener?.("click", () => {
    page = Math.max(1, page - 1);
    render();
  });
  els.next.addEventListener?.("click", () => {
    page += 1;
    render();
  });

  els.addBtn.addEventListener?.("click", () => (location.href = "admin-meeting-add.html"));
  els.exportBtn.addEventListener?.("click", exportCSV);

  loadMeetings();
});