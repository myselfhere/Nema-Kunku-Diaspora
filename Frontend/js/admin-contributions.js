// Frontend/js/admin-contributions.js
// Contributions list page — fixed imports + full render/filter/pager/CSV/delete

import { api, activeNav } from "./nkd-bus.js";

/* ---------------- Helpers ---------------- */
const $ = (s) => document.querySelector(s);
const n = (v) => Number(v || 0);
const fmtEUR = (v) => `€${n(v).toFixed(2)}`;
const fmtGMD = (v) => `D${n(v).toFixed(2)}`;
const toYYYYMMDD = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};
const toDDMMYYYY = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

/* ---------------- State ---------------- */
let all = [];        // all contributions from API
let filtered = [];   // after filters
let page = 1;
const PAGE_SIZE = 25;

/* ---------------- DOM ---------------- */
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

/* ---------------- Core ---------------- */
function computeStats(list){
  const totalCount = list.length;
  const sumEUR = list.reduce((s,c)=> s + (n(c.amountEUR) || ((c.currency||"") === "EUR" ? n(c.amount) : 0)), 0);
  const sumGMD = list.reduce((s,c)=> s + (n(c.amountGMD) || ((c.currency||"") === "GMD" ? n(c.amount) : 0)), 0);
  const y = els.year?.value ? Number(els.year.value) : null;
  const yearCount = y ? list.filter(c => new Date(c.date).getFullYear() === y).length : 0;

  if (els.statCount) els.statCount.textContent = String(totalCount);
  if (els.statEUR) els.statEUR.textContent = fmtEUR(sumEUR);
  if (els.statGMD) els.statGMD.textContent = fmtGMD(sumGMD);
  if (els.statYearCount) els.statYearCount.textContent = String(yearCount);
}

function applyFilters(){
  const q = (els.q?.value || "").toLowerCase().trim();
  const yr = els.year?.value;
  const pl = (els.plan?.value || "").toLowerCase();
  const md = (els.method?.value || "").toLowerCase();

  filtered = all.filter(c => {
    const text = `${c.memberName||""} ${c.memberId||""} ${c.receipt||c.id||""}`.toLowerCase();
    const okQ = !q || text.includes(q);

    const okY = !yr || (new Date(c.date).getFullYear() === Number(yr));
    const okP = !pl || (String(c.plan||c.contributionPlan||"").toLowerCase().includes(pl));
    const okM = !md || (String(c.method||"").toLowerCase() === md);

    return okQ && okY && okP && okM;
  });

  page = 1;
  render();
}

function render(){
  computeStats(filtered);

  // table rows
  if (!els.tbody) return;
  els.tbody.innerHTML = "";
  const start = (page-1)*PAGE_SIZE;
  const end   = Math.min(start+PAGE_SIZE, filtered.length);
  const slice = filtered.slice(start, end);

  if (!slice.length){
    els.tbody.innerHTML = `<tr><td colspan="9" class="muted">No contributions yet.</td></tr>`;
  } else {
    for (const c of slice){
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${c.receipt || c.id || "-"}</td>
        <td>${toDDMMYYYY(c.date)}</td>
        <td>${c.memberName || "-"}</td>
        <td>${c.memberId || "-"}</td>
        <td>${c.plan || c.contributionPlan || "-"}</td>
        <td>${c.method || "-"}</td>
        <td>${n(c.amountEUR) ? fmtEUR(c.amountEUR) : "—"}</td>
        <td>${n(c.amountGMD) ? fmtGMD(c.amountGMD) : "—"}</td>
        <td class="right">
          <a class="btn btn-small" href="admin-contribution-view.html?id=${encodeURIComponent(c._id||c.id||"")}">View</a>
          <button class="btn btn-small btn-danger" data-del="${c._id||c.id||""}">Delete</button>
        </td>
      `;
      els.tbody.appendChild(tr);
    }
  }

  // pager
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (els.pageInfo) els.pageInfo.textContent = `Page ${Math.min(page,pages)} of ${pages}`;
  if (els.prev) els.prev.disabled = page <= 1;
  if (els.next) els.next.disabled = end >= filtered.length || filtered.length === 0;

  // wire delete buttons
  els.tbody.querySelectorAll("[data-del]").forEach(btn=>{
    btn.addEventListener("click", async (e)=>{
      const id = e.currentTarget.getAttribute("data-del");
      if (!id) return;
      if (!confirm("Delete this contribution?")) return;
      try{
        await api.del(`/contributions/${encodeURIComponent(id)}`);
        // remove from state + rerender fast
        all = all.filter(x => (x._id||x.id) !== id);
        applyFilters();
      }catch(err){
        console.error("Delete failed", err);
        alert("Failed to delete contribution.");
      }
    });
  });
}

/* -------------- CSV -------------- */
function exportCSV(){
  const headers = ["Receipt","Date","Member","Member ID","Plan","Method","EUR","GMD"];
  const rows = filtered.map(c => [
    c.receipt || c.id || "",
    toYYYYMMDD(c.date),
    c.memberName || "",
    c.memberId || "",
    c.plan || c.contributionPlan || "",
    c.method || "",
    n(c.amountEUR) ? n(c.amountEUR).toFixed(2) : "",
    n(c.amountGMD) ? n(c.amountGMD).toFixed(2) : "",
  ]);
  const csv = [headers, ...rows].map(r => r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "contributions.csv";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* -------------- Load -------------- */
async function load(){
  activeNav("contributions");

  try{
    const res = await api.get("/contributions?page=1&limit=1000");
    all = Array.isArray(res?.items) ? res.items : (Array.isArray(res)?res:[]);
  }catch(err){
    console.error("Load contributions failed:", err);
    all = [];
  }

  // Fill year dropdown from data
  if (els.year){
    const years = Array.from(
      new Set(all.map(c => new Date(c.date).getFullYear()).filter(y => !Number.isNaN(y)))
    ).sort((a,b)=>b-a);
    // keep "All years" first
    els.year.innerHTML = `<option value="">All years</option>` + years.map(y=>`<option>${y}</option>`).join("");
  }

  filtered = all.slice();
  render();
}

/* -------------- Events -------------- */
document.addEventListener("DOMContentLoaded", () => {
  els.q?.addEventListener("input", applyFilters);
  els.year?.addEventListener("change", applyFilters);
  els.plan?.addEventListener("change", applyFilters);
  els.method?.addEventListener("change", applyFilters);

  els.exportBtn?.addEventListener("click", exportCSV);

  els.prev?.addEventListener("click", ()=>{ page = Math.max(1, page-1); render(); });
  els.next?.addEventListener("click", ()=>{ page += 1; render(); });

  load();
});