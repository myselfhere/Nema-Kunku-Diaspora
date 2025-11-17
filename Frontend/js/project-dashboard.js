// Frontend/js/project-dashboard.js
import {
  api,
  getUser,
  clearUser,
  go,
  activeNav,
  fmtEUR,
  toDDMMYYYY,
  requireRole,
} from "./nkd-bus.js";

const $ = (s) => document.querySelector(s);

function setupTopbar() {
  requireRole(["project-manager", "admin", "president"]);
  activeNav("dashboard");

  const u = getUser();
  const slot = document.querySelector("[data-user-slot]");
  if (slot && u) {
    slot.textContent = `${u.name || u.memberId || "User"} • ${u.role || "project-manager"}`;
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

function normaliseProject(p = {}) {
  return {
    id: p.projectId || p.code || p.id || "",
    name: p.name || p.projectName || "",
    status: (p.status || "Planned").toString(),
    start: p.startDate || p.start || p.beginDate,
    end: p.endDate || p.finishDate || p.completeDate,
    budgetEUR: Number(p.budgetEUR || p.budget_eur || 0),
    spentEUR: Number(p.spentEUR || p.expenditureEUR || 0),
  };
}

async function loadProjects() {
  try {
    const raw = await api.get("/projects").catch(() => []);
    const items = Array.isArray(raw) ? raw : raw.items || [];

    const projects = items.map(normaliseProject);

    const total = projects.length;
    const active = projects.filter((p) =>
      p.status.toLowerCase().includes("active") ||
      p.status.toLowerCase().includes("ongoing")
    ).length;
    const done = projects.filter((p) =>
      p.status.toLowerCase().includes("complete") ||
      p.status.toLowerCase().includes("finished")
    ).length;

    let budget = 0,
      spent = 0;
    projects
      .filter((p) =>
        p.status.toLowerCase().includes("active") ||
        p.status.toLowerCase().includes("ongoing")
      )
      .forEach((p) => {
        budget += p.budgetEUR;
        spent += p.spentEUR;
      });

    $("#kpiTotal").textContent = total;
    $("#kpiActive").textContent = active;
    $("#kpiDone").textContent = done;
    $("#kpiBudget").textContent = `${fmtEUR(spent)} / ${fmtEUR(budget)}`;

    const body = $("#tblProjBody");
    if (!projects.length) {
      body.innerHTML = `<tr><td colspan="7" class="muted">No projects recorded.</td></tr>`;
      return;
    }

    const sorted = projects
      .slice()
      .sort((a, b) => new Date(b.start || 0) - new Date(a.start || 0))
      .slice(0, 10);

    body.innerHTML = sorted
      .map(
        (p) => `
        <tr>
          <td>${p.id}</td>
          <td>${p.name}</td>
          <td>${p.status}</td>
          <td>${p.start ? toDDMMYYYY(p.start) : ""}</td>
          <td>${p.end ? toDDMMYYYY(p.end) : ""}</td>
          <td class="right">${fmtEUR(p.budgetEUR)}</td>
          <td class="right">${fmtEUR(p.spentEUR)}</td>
        </tr>`
      )
      .join("");
  } catch (e) {
    console.error("[Projects] load error", e);
  }
}

function init() {
  setupTopbar();
  loadProjects();
}

window.addEventListener("DOMContentLoaded", init);