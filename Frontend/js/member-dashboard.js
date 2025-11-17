// Frontend/js/member-dashboard.js
// Member Dashboard logic (no jQuery, matches new HTML)

// Use namespace import so it works even if function names change a bit
import * as nkd from "./nkd-bus.js";

/* ---------- Helpers ---------- */

function safe(fn, fallback = undefined) {
  try { return fn(); } catch { return fallback; }
}

function fmtMoneyEUR(v) {
  const n = Number(v || 0);
  return `€${n.toFixed(2)}`;
}

function fmtMoneyGMD(v) {
  const n = Number(v || 0);
  return `D${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d) {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/* ---------- DOM refs ---------- */

const eurTotalEl        = document.getElementById("eurTotal");
const gmdTotalEl        = document.getElementById("gmdTotal");
const meetingsAttEl     = document.getElementById("meetingsAttended");
const meetingsMissedEl  = document.getElementById("meetingMissed");

const accNameEl = document.getElementById("accName");
const accIdEl   = document.getElementById("accId");
const accPlanEl = document.getElementById("accPlan");
const accRoleEl = document.getElementById("accRole");

const contribTableBody  = document.getElementById("contribTableBody");
const meetingsTableBody = document.getElementById("meetingsTableBody");

const downloadCsvBtn = document.getElementById("downloadCsvBtn");
const logoutBtn      = document.getElementById("logoutBtn");

// Optional navbar member label if you add one later
const navMemberSpan = document.getElementById("memberNameDisplay");

/* ---------- User + Auth ---------- */

const user = safe(() => nkd.getUser && nkd.getUser(), null);

if (!user) {
  // Not logged in – go back to login page
  if (nkd.go) nkd.go("login.html");
} else {
  initDashboard();
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (nkd.clearUser) nkd.clearUser();
    if (nkd.go) nkd.go("login.html");
  });
}

/* ---------- Main init ---------- */

async function initDashboard() {
  fillUserHeader(user);
  fillAccount(user);

  await Promise.all([
    loadContributions(user),
    loadMeetings(user)
  ]);

  if (downloadCsvBtn) {
    downloadCsvBtn.addEventListener("click", () => downloadStatementCsv(user));
  }
}

/* ---------- Fill header / account ---------- */

function fillUserHeader(u) {
  // Top-right label (optional)
  if (navMemberSpan) {
    navMemberSpan.textContent =
      u.memberId || u.name || u.email || "Member";
  }
}

function fillAccount(u) {
  if (accNameEl) accNameEl.textContent = u.name || u.memberName || "-";
  if (accIdEl)   accIdEl.textContent   = u.memberId || "-";
  if (accPlanEl) accPlanEl.textContent = u.contributionPlan || u.plan || "-";
  if (accRoleEl) accRoleEl.textContent = (u.role || "member").toLowerCase();
}

/* ---------- Contributions ---------- */

async function loadContributions(u) {
  const memberId = u.memberId;
  if (!memberId || !nkd.api) return;

  try {
    const res = await nkd.api.get(`/contributions?memberId=${encodeURIComponent(memberId)}&limit=5`);
    const items = res?.data || res?.contributions || [];

    let eurTotal = 0;
    let gmdTotal = 0;

    if (Array.isArray(items) && items.length) {
      if (contribTableBody) contribTableBody.innerHTML = "";

      items.forEach((c) => {
        eurTotal += Number(c.amountEUR || c.amountEur || 0);
        gmdTotal += Number(c.amountGMD || c.amountGmd || c.amount || 0);

        if (!contribTableBody) return;

        const tr = document.createElement("tr");

        const receipt = c.receiptNumber || c.receipt || "-";
        const date    = fmtDate(c.date || c.paymentDate);
        const plan    = c.contributionPlan || c.plan || "-";
        const method  = c.paymentMethod || c.method || "-";
        const eur     = fmtMoneyEUR(c.amountEUR || c.amountEur || 0);
        const gmd     = fmtMoneyGMD(c.amountGMD || c.amountGmd || c.amount || 0);

        tr.innerHTML = `
          <td>${receipt}</td>
          <td>${date}</td>
          <td>${plan}</td>
          <td>${method}</td>
          <td class="right">${eur}</td>
          <td class="right">${gmd}</td>
        `;
        contribTableBody.appendChild(tr);
      });
    } else {
      if (contribTableBody) {
        contribTableBody.innerHTML = `<tr><td colspan="6">No contributions recorded yet.</td></tr>`;
      }
    }

    if (eurTotalEl) eurTotalEl.textContent = fmtMoneyEUR(eurTotal);
    if (gmdTotalEl) gmdTotalEl.textContent = fmtMoneyGMD(gmdTotal);
  } catch (err) {
    console.error("[Member Dashboard] loadContributions error", err);
    if (contribTableBody) {
      contribTableBody.innerHTML = `<tr><td colspan="6">Could not load contributions.</td></tr>`;
    }
  }
}

/* ---------- Meetings ---------- */

async function loadMeetings(u) {
  const memberId = u.memberId;
  if (!memberId || !nkd.api) return;

  try {
    const res = await nkd.api.get(`/meetings?memberId=${encodeURIComponent(memberId)}&limit=5`);
    const items = res?.data || res?.meetings || [];

    let attended = 0;
    let missed   = 0;

    if (Array.isArray(items) && items.length) {
      if (meetingsTableBody) meetingsTableBody.innerHTML = "";

      items.forEach((m) => {
        const statusRaw =
          (m.status ||
           m.attendanceStatus ||
           m.memberStatus ||
           "").toString().toLowerCase();

        if (statusRaw === "present" || statusRaw === "attended") attended++;
        else if (statusRaw === "absent" || statusRaw === "missed") missed++;

        if (!meetingsTableBody) return;

        const tr = document.createElement("tr");
        const id    = m.meetingId || m.id || "-";
        const date  = fmtDate(m.date);
        const title = m.title || m.topic || "-";
        const status = statusRaw ? statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1) : "-";

        tr.innerHTML = `
          <td>${id}</td>
          <td>${date}</td>
          <td>${title}</td>
          <td>${status}</td>
        `;
        meetingsTableBody.appendChild(tr);
      });
    } else {
      if (meetingsTableBody) {
        meetingsTableBody.innerHTML = `<tr><td colspan="4">No meetings logged yet.</td></tr>`;
      }
    }

    if (meetingsAttEl)    meetingsAttEl.textContent    = attended;
    if (meetingsMissedEl) meetingsMissedEl.textContent = missed;
  } catch (err) {
    console.error("[Member Dashboard] loadMeetings error", err);
    if (meetingsTableBody) {
      meetingsTableBody.innerHTML = `<tr><td colspan="4">Could not load meetings.</td></tr>`;
    }
  }
}

/* ---------- CSV Download ---------- */

async function downloadStatementCsv(u) {
  const memberId = u.memberId;
  if (!memberId || !nkd.api) return;

  try {
    const res = await nkd.api.get(`/contributions?memberId=${encodeURIComponent(memberId)}&limit=500`);
    const items = res?.data || res?.contributions || [];

    if (!Array.isArray(items) || !items.length) {
      alert("No contributions found to download.");
      return;
    }

    const header = [
      "Receipt",
      "Date",
      "Member Name",
      "Member ID",
      "Plan",
      "Method",
      "Amount EUR",
      "Amount GMD"
    ];

    const rows = items.map(c => ([
      c.receiptNumber || c.receipt || "",
      fmtDate(c.date || c.paymentDate),
      c.memberName || u.name || "",
      memberId,
      c.contributionPlan || c.plan || "",
      c.paymentMethod || c.method || "",
      String(c.amountEUR || c.amountEur || 0),
      String(c.amountGMD || c.amountGmd || c.amount || 0)
    ]));

    const csvLines = [header, ...rows]
      .map(r => r.map(field => {
        const f = field == null ? "" : String(field);
        if (/[",\n]/.test(f)) {
          return `"${f.replace(/"/g, '""')}"`;
        }
        return f;
      }).join(","))
      .join("\n");

    const blob = new Blob([csvLines], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `nkd-contributions-${memberId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("[Member Dashboard] CSV download error", err);
    alert("Sorry, could not generate the statement right now.");
  }
}