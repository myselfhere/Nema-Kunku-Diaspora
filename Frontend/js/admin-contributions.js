// Frontend/js/admin-contributions.js
// Contributions list page — render / filter / pager / CSV / delete

import { api, activeNav } from "./nkd-bus.js";

/* ---------------- Helpers ---------------- */
const $ = (s) => document.querySelector(s);
const n = (v) => Number(v || 0);

const fmtEUR = (v) => `€${n(v).toFixed(2)}`;
const fmtGMD = (v) => `D${n(v).toFixed(0)}`; // remove decimals from GMD

const toYYYYMMDD = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const toDDMMYYYY = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
};

/* ---------------- State ---------------- */
let all = [];
let filtered = [];
let page = 1;
const PAGE_SIZE = 25;

/* ---------------- DOM refs ---------------- */
const els = {
  statCount: $("#statCount"),
  statEUR: $("#statEUR"),
  statGMD: $("#statGMD"),
  statYearCount: $("#statYearCount"),

  q: $("#q"),
  year: $("#year"),
  plan: $("#plan"),
  method: $("#method"),
  exportBtn: $("#exportBtn"),

  tbody: $("#contribTbody"),
  prev: $("#prev"),
  next: $("#next"),
  pageInfo: $("#pageInfo"),
};

/* ---------------- Stats ---------------- */
function computeStats(list) {
  const total = list.length;

  const sumEUR = list.reduce((s, c) => s + n(c.amountEUR), 0);
  const sumGMD = list.reduce((s, c) => s + n(c.amountGMD), 0);

  const y = els.year?.value ? Number(els.year.value) : null;
  const yearCount = y
    ? list.filter((c) => new Date(c.date).getFullYear() === y).length
    : 0;

  if (els.statCount) els.statCount.textContent = total;
  if (els.statEUR) els.statEUR.textContent = fmtEUR(sumEUR);
  if (els.statGMD) els.statGMD.textContent = fmtGMD(sumGMD);
  if (els.statYearCount) els.statYearCount.textContent = yearCount;
}

/* ---------------- Filter + Render ---------------- */
function applyFilters() {
  const q = (els.q?.value || "").toLowerCase().trim();
  const yr = els.year?.value;
  const pl = (els.plan?.value || "").toLowerCase();
  const md = (els.method?.value || "").toLowerCase();

  filtered = all.filter((c) => {
    const text = `${c.memberName} ${c.memberId} ${c.receiptNumber}`.toLowerCase();

    if (q && !text.includes(q)) return false;

    if (yr) {
      const d = new Date(c.date);
      if (d.getFullYear() !== Number(yr)) return false;
    }

    if (pl && !(c.plan || "").toLowerCase().includes(pl)) return false;

    if (md && (c.method || "").toLowerCase() !== md) return false;

    return true;
  });

  page = 1;
  render();
}

function render() {
  computeStats(filtered);

  if (!els.tbody) return;
  els.tbody.innerHTML = "";

  const start = (page - 1) * PAGE_SIZE;
  const slice = filtered.slice(start, start + PAGE_SIZE);

  if (!slice.length) {
    els.tbody.innerHTML = `<tr><td colspan="9" class="muted">No contributions yet.</td></tr>`;
  } else {
    for (const c of slice) {
      const id = c._id || c.id || "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${c.receiptNumber}</td>
        <td>${toDDMMYYYY(c.date)}</td>
        <td>${c.memberName}</td>
        <td>${c.memberId}</td>
        <td>${c.plan}</td>
        <td>${c.method}</td>
        <td>${fmtEUR(c.amountEUR)}</td>
        <td>${fmtGMD(c.amountGMD)}</td>
        <td class="right">
          <a class="btn btn-small" href="admin-contribution-view.html?id=${id}">View</a>
          <button class="btn btn-small btn-danger" data-del="${id}">Delete</button>
        </td>
      `;
      els.tbody.appendChild(tr);
    }
  }

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  els.pageInfo.textContent = `Page ${page} of ${pages}`;
  els.prev.disabled = page <= 1;
  els.next.disabled = page >= pages;

  document.querySelectorAll("[data-del]").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.getAttribute("data-del");
      if (!confirm("Delete this contribution?")) return;
      await api.del(`/contributions/${id}`);
      all = all.filter((x) => x._id !== id);
      applyFilters();
    };
  });
}

/* ---------------- CSV export ---------------- */
function exportCSV() {
  const headers = [
    "Receipt",
    "Date",
    "Member",
    "Member ID",
    "Plan",
    "Method",
    "EUR",
    "GMD",
  ];

  const rows = filtered.map((c) => [
    c.receiptNumber,
    toYYYYMMDD(c.date),
    c.memberName,
    c.memberId,
    c.plan,
    c.method,
    c.amountEUR,
    c.amountGMD,
  ]);

  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "contributions.csv";
  a.click();
}

/* ---------------- Load ---------------- */
async function load() {
  activeNav("contributions");

  const res = await api.get("/contributions?page=1&limit=10000");
  all = res.items || res;

  const years = [...new Set(all.map((c) => new Date(c.date).getFullYear()))].sort(
    (a, b) => b - a
  );

  els.year.innerHTML =
    `<option value="">All years</option>` +
    years.map((y) => `<option>${y}</option>`).join("");

  filtered = all.slice();
  render();
}

/* ---------------- Events ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  els.q.addEventListener("input", applyFilters);
  els.year.addEventListener("change", applyFilters);
  els.plan.addEventListener("change", applyFilters);
  els.method.addEventListener("change", applyFilters);
  els.exportBtn.addEventListener("click", exportCSV);

  els.prev.addEventListener("click", () => {
    if (page > 1) page--;
    render();
  });

  els.next.addEventListener("click", () => {
    page++;
    render();
  });

  load();
});