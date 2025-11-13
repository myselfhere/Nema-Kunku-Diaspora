// Manage Roles (offline-first)
import { requireAuth, loadUsers, saveUser } from "./auth.js";
import { buildTopbar, userBadge } from "./topbar.js";

requireAuth({ role: "admin" });
buildTopbar({ active: "roles" });

const STAFF_ROLES = new Set(["admin", "financial", "project-manager", "secretary", "viewer"]);
const $ = (s) => document.querySelector(s);
const lc = (s) => String(s ?? "").toLowerCase().trim();
const escape = (s="") => String(s).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));

// UI refs
const tbody = $("#tbody");
const searchInput = $("#searchInput");
const addStaffBtn = $("#addStaffBtn");
const addModal = $("#addModal");
const memberPicker = $("#memberPicker");
const rolePicker = $("#rolePicker");
const cancelAddBtn = $("#cancelAddBtn");
const confirmAddBtn = $("#confirmAddBtn");

// state
let FILTER = "";
let users = loadUsers();

// ---- helpers ----
function isStaff(u) {
  return STAFF_ROLES.has(lc(u.role));
}
function staffList() {
  return users.filter(isStaff);
}
function membersForPicker() {
  // let you pick anyone (admin can downgrade/upgrade)
  return users.slice().sort((a,b)=>lc(a.memberId).localeCompare(lc(b.memberId)));
}
function showModal(){ addModal?.showModal?.(); }
function closeModal(){ addModal?.close?.(); }

// ---- render table ----
function render() {
  users = loadUsers();
  const rows = staffList()
    .filter(u => {
      if (!FILTER) return true;
      const f = lc(FILTER);
      return [u.memberId, u.name, u.email, u.country, u.role].some(x => lc(x).includes(f));
    })
    .sort((a,b)=>lc(a.memberId).localeCompare(lc(b.memberId)))
    .map(u => {
      return `
        <tr data-id="${escape(u.memberId)}">
          <td><strong>${escape(u.memberId)}</strong></td>
          <td>${escape(u.name || "")}</td>
          <td>${escape(u.email || "")}</td>
          <td>${escape(u.country || "")}</td>
          <td><span class="chip chip--success">${escape(u.role || "member")}</span></td>
          <td>
            <div class="row-actions">
              <button class="btn btn--sm" data-act="edit">Change Role</button>
              <button class="btn btn--sm btn--danger" data-act="remove">Remove</button>
            </div>
          </td>
        </tr>`;
    })
    .join("");

  tbody.innerHTML = rows || `<tr><td colspan="6" style="text-align:center;color:#667085">No staff yet. Click <b>+ Add Staff</b>.</td></tr>`;

  // bind row actions
  tbody.querySelectorAll("button[data-act]").forEach(btn => {
    btn.addEventListener("click", () => {
      const tr = btn.closest("tr");
      const id = tr?.getAttribute("data-id");
      const u = users.find(x => lc(x.memberId) === lc(id));
      if (!u) return;

      const act = btn.getAttribute("data-act");
      if (act === "edit") {
        populatePicker(u.memberId, u.role || "viewer");
        showModal();
      } else if (act === "remove") {
        if (confirm(`Remove ${u.name || u.memberId} from staff?`)) {
          saveUser({ memberId: u.memberId, role: "member" });
          render();
        }
      }
    });
  });
}

// ---- populate member picker ----
function populatePicker(selectedId = "", selectedRole = "viewer") {
  const options = membersForPicker().map(u => {
    const sel = lc(u.memberId) === lc(selectedId) ? "selected" : "";
    return `<option ${sel} value="${escape(u.memberId)}">${escape(u.memberId)} — ${escape(u.name || "")}</option>`;
  }).join("");
  memberPicker.innerHTML = options;
  rolePicker.value = selectedRole;
}

// ---- events ----
addStaffBtn.addEventListener("click", () => {
  populatePicker("", "viewer");
  showModal();
});

cancelAddBtn.addEventListener("click", (e) => {
  e.preventDefault();
  closeModal();
});

confirmAddBtn.addEventListener("click", (e) => {
  e.preventDefault();
  const memberId = memberPicker.value;
  const role = rolePicker.value;
  if (!memberId || !role) { alert("Select a member and a role."); return; }

  saveUser({ memberId, role });
  closeModal();
  render();
});

searchInput.addEventListener("input", () => {
  FILTER = searchInput.value;
  render();
});

// initial
render();