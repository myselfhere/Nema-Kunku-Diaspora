// Frontend/js/admin-members.js
import { api, normalizeMember } from "./nkd-bus.js";

console.log("[Admin Members] loaded");

let all = [];
let page = 1;
const LIMIT = 20;

// ---------- DOM ----------
const tbl = document.querySelector("#tblMembers tbody");
const pageInfo = document.getElementById("pageInfo");
const prev = document.getElementById("prevPage");
const next = document.getElementById("nextPage");

// Filters
const search = document.getElementById("search");
const filterRole = document.getElementById("filterRole");
const filterPlan = document.getElementById("filterPlan");

// Add member button
const btnAdd = document.getElementById("btnAdd");
if (btnAdd) {
  btnAdd.addEventListener("click", () => {
    location.href = "admin-add-member.html";
  });
}

// ---------- LOAD MEMBERS ----------
async function loadMembers() {
  try {
    const res = await api.get("/members?limit=5000");
    const raw = Array.isArray(res) ? res : res.items || [];
    all = raw.map((m) => normalizeMember(m));

    console.log("[Admin Members] API members:", all.length);
    updateStats();
    paintTable();
  } catch (err) {
    console.error("[Admin Members] loadMembers error", err);
    all = [];
    updateStats();
    paintTable();
    alert("Could not load members from the server.");
  }
}

// ---------- STATS ----------
function updateStats() {
  const totalEl = document.getElementById("statTotal");
  const activeEl = document.getElementById("statActive");
  const annualEl = document.getElementById("statAnnual");
  const semiEl = document.getElementById("statSemi");

  const active = all.filter(
    (m) => (m.status || "").toLowerCase() === "active"
  ).length;

  const annual = all.filter(
    (m) => (m.contributionPlan || "").toLowerCase() === "annually"
  ).length;

  const semi = all.filter(
    (m) => (m.contributionPlan || "").toLowerCase() === "semi-annual"
  ).length;

  if (totalEl) totalEl.textContent = all.length;
  if (activeEl) activeEl.textContent = active;
  if (annualEl) annualEl.textContent = annual;
  if (semiEl) semiEl.textContent = semi;
}

// ---------- FILTERING ----------
function filtered() {
  const q = (search?.value || "").toLowerCase().trim();
  const roleFilter = (filterRole?.value || "").toLowerCase();
  const planFilter = (filterPlan?.value || "").toLowerCase();

  return all.filter((m) => {
    const name = (m.name || "").toLowerCase();
    const email = (m.email || "").toLowerCase();
    const memberId = (m.memberId || "").toLowerCase();
    const country = (m.country || "").toLowerCase();
    const role = (m.role || "").toLowerCase();
    const plan = (m.contributionPlan || "").toLowerCase();

    if (
      q &&
      !(
        name.includes(q) ||
        email.includes(q) ||
        memberId.includes(q) ||
        country.includes(q)
      )
    ) {
      return false;
    }

    if (roleFilter && role !== roleFilter) return false;
    if (planFilter && plan !== planFilter) return false;

    return true;
  });
}

// ---------- TABLE PAINT ----------
function paintTable() {
  if (!tbl) return;

  const list = filtered();
  const totalPages = Math.max(1, Math.ceil(list.length / LIMIT));
  if (page > totalPages) page = totalPages;
  if (page < 1) page = 1;

  const start = (page - 1) * LIMIT;
  const rows = list.slice(start, start + LIMIT);

  if (!rows.length) {
    tbl.innerHTML =
      '<tr><td colspan="9" class="muted">No members found.</td></tr>';
  } else {
    tbl.innerHTML = rows
      .map(
        (m) => `
      <tr>
        <td>${m.memberId || ""}</td>
        <td>${m.name || ""}</td>
        <td>${m.phone || ""}</td>
        <td>${m.country || ""}</td>
        <td>${m.role || ""}</td>
        <td>${m.contributionPlan || ""}</td>
        <td>${
          m.memberSince
            ? new Date(m.memberSince).toLocaleDateString()
            : ""
        }</td>
        <td>${m.status || ""}</td>
        <td>
          <button class="btn btn-light" data-view="${m._id || m.memberId}">
            View
          </button>
          <button class="btn btn-primary" data-edit="${m._id || m.memberId}">
            Edit
          </button>
          <button class="btn btn-danger" data-del="${m._id || m.memberId}">
            Delete
          </button>
        </td>
      </tr>`
      )
      .join("");
  }

  if (pageInfo) pageInfo.textContent = `Page ${page} of ${totalPages}`;
  if (prev) prev.disabled = page === 1;
  if (next) next.disabled = page === totalPages;

  // Wire row buttons (event delegation)
  tbl.querySelectorAll("button[data-view]").forEach((btn) => {
    btn.onclick = () => viewMember(btn.getAttribute("data-view"));
  });
  tbl.querySelectorAll("button[data-edit]").forEach((btn) => {
    btn.onclick = () => editMember(btn.getAttribute("data-edit"));
  });
  tbl.querySelectorAll("button[data-del]").forEach((btn) => {
    btn.onclick = () => deleteMember(btn.getAttribute("data-del"));
  });
}

// ---------- ROW ACTIONS (GLOBAL) ----------
window.viewMember = (id) => {
  if (!id) return;
  location.href = "admin-profile.html?id=" + encodeURIComponent(id);
};

window.editMember = (id) => {
  if (!id) return;
  location.href = "admin-add-member.html?id=" + encodeURIComponent(id);
};

window.deleteMember = async (id) => {
  if (!id) return;
  if (!confirm("Delete this member?")) return;

  try {
    await api.del(`/members/${encodeURIComponent(id)}`);
    await loadMembers();
  } catch (err) {
    console.error("[Admin Members] delete error", err);
    alert("Could not delete member. Please try again.");
  }
};

// ---------- PAGINATION ----------
if (prev) {
  prev.addEventListener("click", () => {
    if (page > 1) {
      page--;
      paintTable();
    }
  });
}

if (next) {
  next.addEventListener("click", () => {
    page++;
    paintTable();
  });
}

// ---------- FILTER EVENTS ----------
[search, filterRole, filterPlan].forEach((el) => {
  if (!el) return;
  const evt = el.tagName === "SELECT" ? "change" : "input";
  el.addEventListener(evt, () => {
    page = 1;
    paintTable();
  });
});

// ---------- INIT ----------
loadMembers();