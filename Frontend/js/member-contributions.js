// /Frontend/js/member-contributions.js
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

let MY_CONTRIBS = [];
let ME = {};

async function loadContributions() {
  ME = getUser() || {};
  let contribs = [];

  try {
    const res = await api.get(`/contributions?memberId=${ME.memberId}&limit=500`);
    contribs = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
  } catch (err) {
    console.error("Failed to load contributions:", err);
    contribs = [];
  }

  MY_CONTRIBS = contribs.slice();

  // Stats
  const totalEUR = contribs.reduce((sum, c) => sum + n(c.amountEUR), 0);
  const totalGMD = contribs.reduce((sum, c) => sum + n(c.amountGMD), 0);
  const totalCount = contribs.length;

  set("#statEUR", fmtEUR(totalEUR));
  set("#statGMD", fmtGMD(totalGMD));
  set("#statCount", String(totalCount));

  // Table
  const tbody = $("#contribTbody");
  tbody.innerHTML = "";

  if (!contribs.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="muted">No contributions yet.</td></tr>`;
    return;
  }

  contribs
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .forEach((c) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${c.receipt || "-"}</td>
        <td>${toDDMMYYYY(c.date)}</td>
        <td>${c.contributionPlan || "-"}</td>
        <td>${c.paymentMethod || "-"}</td>
        <td>${c.amountEUR ? fmtEUR(c.amountEUR) : "—"}</td>
        <td>${c.amountGMD ? fmtGMD(c.amountGMD) : "—"}</td>
      `;
      tbody.appendChild(tr);
    });
}

function downloadCSV() {
  const rows = [
    ["Receipt","Date","Plan","Method","Amount (EUR)","Amount (GMD)"],
    ...MY_CONTRIBS
      .sort((a,b)=>new Date(b.date||0)-new Date(a.date||0))
      .map(c => [
        c.receipt || "",
        toDDMMYYYY(c.date),
        c.contributionPlan || "",
        c.paymentMethod || "",
        (c.amountEUR ?? "") === "" ? "" : String(Number(c.amountEUR||0).toFixed(2)),
        (c.amountGMD ?? "") === "" ? "" : String(Number(c.amountGMD||0).toFixed(2)),
      ])
  ];
  const csv = rows.map(r => r.map(x => `"${String(x).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const id = ME?.memberId || "member";
  a.href = url;
  a.download = `${id}_contributions.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", () => {
  loadContributions();
  $("#downloadCsvBtn")?.addEventListener("click", downloadCSV);
});