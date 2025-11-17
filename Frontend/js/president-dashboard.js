// Frontend/js/president-dashboard.js
import {
  api,
  getUser,
  clearUser,
  go,
  activeNav,
  fmtEUR,
  fmtGMD,
  toDDMMYYYY,
  requireRole,
} from "./nkd-bus.js";

const $ = (s) => document.querySelector(s);

function setupTopbar() {
  // Only president & admin can view this dashboard
  requireRole(["president", "admin"]);

  activeNav("dashboard");

  const u = getUser();
  const slot = document.querySelector("[data-user-slot]");
  if (slot && u) {
    const role = (u.role || "president").toLowerCase();
    slot.textContent = `${u.name || u.memberId || u.email || "President"} • ${role}`;
  }

  const btn = document.querySelector(".menu-toggle");
  const nav = document.getElementById("adminNav");
  if (btn && nav) btn.addEventListener("click", () => nav.classList.toggle("active"));

  $("#logoutLink")?.addEventListener("click", (e) => {
    e.preventDefault();
    clearUser();
    go("login.html");
  });
}

function yearFilter(row) {
  if (!row || !row.date) return false;
  const d = new Date(row.date);
  if (isNaN(d)) return false;
  return d.getFullYear() === new Date().getFullYear();
}

async function loadKPIsAndTables() {
  const year = new Date().getFullYear();
  $("#kpiYear").textContent = year;

  try {
    const [membersRaw, contribRaw, expRaw, projRaw, meetRaw] = await Promise.all([
      api.getMembers().catch(() => []),
      api.get("/contributions").catch(() => []),
      api.get("/expenditures").catch(() => []),
      api.get("/projects").catch(() => []),
      api.getMeetings().catch(() => []),
    ]);

    const members = Array.isArray(membersRaw) ? membersRaw : membersRaw.items || [];
    const contribList = Array.isArray(contribRaw) ? contribRaw : contribRaw.items || [];
    const expList = Array.isArray(expRaw) ? expRaw : expRaw.items || [];
    const projects = Array.isArray(projRaw) ? projRaw : projRaw.items || [];
    const meetings = Array.isArray(meetRaw) ? meetRaw : meetRaw.items || [];

    /* ----- KPIs ----- */
    $("#kpiMembers").textContent = members.length;
    $("#kpiMeetings").textContent = meetings.length;

    let cEUR = 0,
      cGMD = 0,
      eEUR = 0,
      eGMD = 0;

    contribList.filter(yearFilter).forEach((c) => {
      cEUR += Number(c.amountEUR || 0);
      cGMD += Number(c.amountGMD || 0);
    });
    expList.filter(yearFilter).forEach((x) => {
      eEUR += Number(x.amountEUR || 0);
      eGMD += Number(x.amountGMD || 0);
    });

    $("#kpiContribEUR").textContent = fmtEUR(cEUR);
    $("#kpiExpGMD").textContent = fmtGMD(eGMD);

    $("#kpiNetEUR").textContent = fmtEUR(cEUR - eEUR);
    $("#kpiNetGMD").textContent = fmtGMD(cGMD - eGMD);

    const activeProjects = projects.filter((p) =>
      String(p.status || "").toLowerCase().match(/active|ongoing|in progress/)
    );
    $("#kpiActiveProjects").textContent = activeProjects.length;
    $("#kpiTotalProjects").textContent = projects.length;

    /* ----- tables: contributions ----- */
    const contribSorted = contribList
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);

    const cBody = $("#tblContribBody");
    if (!contribSorted.length) {
      cBody.innerHTML =
        '<tr><td colspan="5" class="muted">No contributions recorded.</td></tr>';
    } else {
      cBody.innerHTML = contribSorted
        .map(
          (c) => `
          <tr>
            <td>${c.date ? toDDMMYYYY(c.date) : ""}</td>
            <td>${c.memberName || c.member || "-"}</td>
            <td>${c.receipt || c.receiptNumber || ""}</td>
            <td class="right">${fmtEUR(c.amountEUR || 0)}</td>
            <td class="right">${fmtGMD(c.amountGMD || 0)}</td>
          </tr>`
        )
        .join("");
    }

    /* ----- tables: expenditures / projects ----- */
    const expSorted = expList
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);

    const eBody = $("#tblExpBody");
    if (!expSorted.length) {
      eBody.innerHTML =
        '<tr><td colspan="5" class="muted">No expenditures recorded.</td></tr>';
    } else {
      eBody.innerHTML = expSorted
        .map((x) => {
          // try to link project by ID if available
          const ref = x.reference || x.refNumber || x.expRef || "";
          const projName =
            x.projectName ||
            (projects.find((p) => p.projectId === x.projectId)?.name || "");
          const label = projName ? `${ref || projName}` : ref;

          return `
            <tr>
              <td>${x.date ? toDDMMYYYY(x.date) : ""}</td>
              <td>${label || "-"}</td>
              <td>${x.category || x.payee || "-"}</td>
              <td class="right">${fmtEUR(x.amountEUR || 0)}</td>
              <td class="right">${fmtGMD(x.amountGMD || 0)}</td>
            </tr>`;
        })
        .join("");
    }
  } catch (err) {
    console.error("[President Dashboard] load error", err);
  }
}

function init() {
  setupTopbar();
  loadKPIsAndTables();
}

window.addEventListener("DOMContentLoaded", init);