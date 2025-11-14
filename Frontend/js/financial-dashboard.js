// Frontend/js/financial-dashboard.js
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
  requireRole(["financial", "admin", "president"]);
  activeNav("dashboard");

  const u = getUser();
  const slot = document.querySelector("[data-user-slot]");
  if (slot && u) {
    slot.textContent = `${u.name || u.memberId || "User"} • ${u.role || "financial"}`;
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

async function loadKPIs() {
  try {
    const [contribRaw, expRaw] = await Promise.all([
      api.get("/contributions").catch(() => []),
      api.get("/expenditures").catch(() => []),
    ]);

    const contrib = Array.isArray(contribRaw) ? contribRaw : contribRaw.items || [];
    const exp = Array.isArray(expRaw) ? expRaw : expRaw.items || [];

    let incEUR = 0,
      incGMD = 0,
      expEUR = 0,
      expGMD = 0;

    contrib.filter(yearFilter).forEach((c) => {
      incEUR += Number(c.amountEUR || 0);
      incGMD += Number(c.amountGMD || 0);
    });

    exp.filter(yearFilter).forEach((x) => {
      expEUR += Number(x.amountEUR || 0);
      expGMD += Number(x.amountGMD || 0);
    });

    $("#kpiIncEUR").textContent = fmtEUR(incEUR);
    $("#kpiIncGMD").textContent = fmtGMD(incGMD);
    $("#kpiExp").textContent = `${fmtEUR(expEUR)} / ${fmtGMD(expGMD)}`;
    $("#kpiNet").textContent = `${fmtEUR(incEUR - expEUR)} / ${fmtGMD(
      incGMD - expGMD
    )}`;
  } catch (e) {
    console.error("[Finance] KPI error", e);
  }
}

function renderRows(bodySel, rows, mapper, emptyCols) {
  const body = $(bodySel);
  if (!body) return;
  if (!rows || !rows.length) {
    body.innerHTML = `<tr><td colspan="${emptyCols}" class="muted">No records found.</td></tr>`;
    return;
  }
  body.innerHTML = rows.map(mapper).join("");
}

async function loadTables() {
  try {
    const [contribRaw, expRaw] = await Promise.all([
      api.get("/contributions").catch(() => []),
      api.get("/expenditures").catch(() => []),
    ]);

    const contrib = (Array.isArray(contribRaw) ? contribRaw : contribRaw.items || [])
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    const exp = (Array.isArray(expRaw) ? expRaw : expRaw.items || [])
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    renderRows(
      "#tblContribBody",
      contrib,
      (r) => `
        <tr>
          <td>${r.date ? toDDMMYYYY(r.date) : ""}</td>
          <td>${r.receipt || r.receiptNumber || ""}</td>
          <td>${r.memberName || r.member || "-"}</td>
          <td class="right">${fmtEUR(r.amountEUR || 0)}</td>
          <td class="right">${fmtGMD(r.amountGMD || 0)}</td>
          <td>${r.paymentMethod || r.method || "-"}</td>
        </tr>
      `,
      6
    );

    renderRows(
      "#tblExpBody",
      exp,
      (r) => `
        <tr>
          <td>${r.date ? toDDMMYYYY(r.date) : ""}</td>
          <td>${r.reference || r.refNumber || r.expRef || ""}</td>
          <td>${r.payee || "-"}</td>
          <td>${r.category || "-"}</td>
          <td class="right">${fmtEUR(r.amountEUR || 0)}</td>
          <td class="right">${fmtGMD(r.amountGMD || 0)}</td>
        </tr>
      `,
      6
    );
  } catch (e) {
    console.error("[Finance] table load error", e);
  }
}

function init() {
  setupTopbar();
  loadKPIs();
  loadTables();
}

window.addEventListener("DOMContentLoaded", init);