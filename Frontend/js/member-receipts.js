// /Frontend/js/member-receipts.js
import { api, getUser } from "./nkd-bus.js";

const $ = (s) => document.querySelector(s);
const set = (s, v) => { const el = $(s); if (el) el.textContent = v; };
const n = (v) => Number(v || 0);
const fmtEUR = (v) => `€${n(v).toFixed(2)}`;
const fmtGMD = (v) => `D${n(v).toFixed(2)}`;
const toDDMMYYYY = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
};

let MY_RECEIPTS = [];
let ME = {};

async function loadReceipts() {
  ME = getUser() || {};
  let receipts = [];

  try {
    const res = await api.get(`/contributions?memberId=${ME.memberId}&limit=500`);
    receipts = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
  } catch (err) {
    console.error("Failed to load receipts:", err);
    receipts = [];
  }

  MY_RECEIPTS = receipts.slice();

  // Stats
  const totalEUR = receipts.reduce((sum, r) => sum + n(r.amountEUR), 0);
  const totalGMD = receipts.reduce((sum, r) => sum + n(r.amountGMD), 0);
  const totalCount = receipts.length;

  set("#statEUR", fmtEUR(totalEUR));
  set("#statGMD", fmtGMD(totalGMD));
  set("#statCount", String(totalCount));

  // Table
  const tbody = $("#receiptsTbody");
  tbody.innerHTML = "";

  if (!receipts.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="muted">No receipts found.</td></tr>`;
    return;
  }

  receipts
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.receipt || "-"}</td>
        <td>${toDDMMYYYY(r.date)}</td>
        <td>${r.contributionPlan || "-"}</td>
        <td>${r.paymentMethod || "-"}</td>
        <td>${r.confirmedBy || "-"}</td>
        <td>${r.amountEUR ? fmtEUR(r.amountEUR) : "—"}</td>
        <td>${r.amountGMD ? fmtGMD(r.amountGMD) : "—"}</td>
      `;
      tbody.appendChild(tr);
    });
}

// CSV Download
function downloadCSV() {
  const rows = [
    ["Receipt","Date","Plan","Method","Confirmed By","Amount (EUR)","Amount (GMD)"],
    ...MY_RECEIPTS
      .sort((a,b)=>new Date(b.date||0)-new Date(a.date||0))
      .map(r => [
        r.receipt || "",
        toDDMMYYYY(r.date),
        r.contributionPlan || "",
        r.paymentMethod || "",
        r.confirmedBy || "",
        (r.amountEUR ?? "") === "" ? "" : String(Number(r.amountEUR||0).toFixed(2)),
        (r.amountGMD ?? "") === "" ? "" : String(Number(r.amountGMD||0).toFixed(2)),
      ])
  ];
  const csv = rows.map(r => r.map(x => `"${String(x).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const id = ME?.memberId || "member";
  a.href = url;
  a.download = `${id}_receipts.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", () => {
  loadReceipts();
  $("#downloadCsvBtn")?.addEventListener("click", downloadCSV);
});