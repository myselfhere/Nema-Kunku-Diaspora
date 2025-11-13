// Frontend/js/admin-members.js
// Admin -> Members: list, View (peek), Edit, Delete

import { api, $, $$, getUser, requireRole, go } from "./nkd-bus.js";

console.log("[Admin Members] script loaded");

requireRole(["admin", "president", "financial", "project-manager", "secretary"]); // allowed staff

const LS_MEM = "nkd_members_cache"; // fallback cache (when API missing)
const saveCache = (arr) => localStorage.setItem(LS_MEM, JSON.stringify(arr || []));
const loadCache = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_MEM) || "[]");
  } catch {
    return [];
  }
};

const state = {
  all: [],
  page: 1,
  perPage: 25,
  editing: null,
  deleting: null,
};

const el = {
  tbody: $("#membersTbody") || document.querySelector("tbody"), // keep old html working
  search: $("#searchInput"),
  roleFilter: $("#roleFilter"),
  planFilter: $("#planFilter"),
  addBtn: $("#addMemberBtn"),
  pagerInfo: $("#pageInfo"),
  prev: $("#prevBtn"),
  next: $("#nextBtn"),
  exportBtn: $("#exportBtn"),

  // modals
  editModal: $("#editModal"),
  editForm: $("#editForm"),
  editTitle: $("#editTitle"),
  editMsg: $("#editMsg"),

  m_id: $("#m_id"),
  m_name: $("#m_name"),
  m_memberId: $("#m_memberId"),
  m_email: $("#m_email"),
  m_phone: $("#m_phone"),
  m_country: $("#m_country"),
  m_role: $("#m_role"),
  m_plan: $("#m_plan"),
  m_joined: $("#m_joined"),
  m_status: $("#m_status"),

  deleteModal: $("#deleteModal"),
  deleteText: $("#deleteText"),
  confirmDeleteBtn: $("#confirmDeleteBtn"),
};

// ---------- utils ----------
const by = (k) => (a, b) => String(a[k] || "").localeCompare(String(b[k] || ""));
const q = (s) => (s || "").toLowerCase().trim();
function show(elm) {
  elm?.classList?.remove("hidden");
  elm?.setAttribute?.("aria-hidden", "false");
}
function hide(elm) {
  elm?.classList?.add("hidden");
  elm?.setAttribute?.("aria-hidden", "true");
}
function toast(msg, ok = false) {
  if (el.editMsg) {
    el.editMsg.textContent = msg;
    el.editMsg.style.color = ok ? "#1b5e20" : "#b00020";
  }
}

// ---------- fetch members (API then cache) ----------
async function fetchMembers() {
  console.log("[Admin Members] fetchMembers() starting...");
  try {
    const list = await api.getMembers(); // returns [] or items[]
    state.all = Array.isArray(list) ? list : list.items || [];
    console.log("[Admin Members] API members:", state.all);
    saveCache(state.all);
  } catch (err) {
    console.error("[Members] API failed, using cache:", err);
    state.all = loadCache();
  }
  state.all.sort(by("memberId"));
  paintCounters();
  paintTable();
}

// ---------- counters (top summary cards) ----------
function paintCounters() {
  const total = state.all.length;
  const active = state.all.filter(
    (m) => (m.status || "").toLowerCase() === "active"
  ).length;
  const annual = state.all.filter(
    (m) => (m.contributionPlan || "") === "Annually"
  ).length;
  const semi = state.all.filter((m) =>
    (m.contributionPlan || "").toLowerCase().includes("semi")
  ).length;
  const put = (sel, v) => {
    const x = $(sel);
    if (x) x.textContent = v;
  };
  put("#k_total", total);
  put("#k_active", active);
  put("#k_annual", annual);
  put("#k_semi", semi);
}

// ---------- filters ----------
function applyFilters() {
  let rows = [...state.all];
  const text = q(el.search?.value);
  const role = el.roleFilter?.value || "";
  const plan = el.planFilter?.value || "";

  if (text) {
    rows = rows.filter(
      (m) =>
        q(m.name).includes(text) ||
        q(m.email).includes(text) ||
        q(m.memberId).includes(text) ||
        q(m.country).includes(text) ||
        q(m.phone).includes(text)
    );
  }
  if (role && role !== "All roles")
    rows = rows.filter(
      (m) => (m.role || "").toLowerCase() === role.toLowerCase()
    );
  if (plan && plan !== "All plans")
    rows = rows.filter((m) => (m.contributionPlan || "") === plan);
  return rows;
}

// ---------- table ----------
function paintTable() {
  console.log("[Admin Members] paintTable()");
  const rows = applyFilters();
  const start = (state.page - 1) * state.perPage;
  const pageRows = rows.slice(start, start + state.perPage);

  if (!el.tbody) {
    console.warn("[Admin Members] tbody not found");
    return;
  }

  el.tbody.innerHTML = "";
  if (!pageRows.length) {
    el.tbody.innerHTML = `<tr><td colspan="10" class="muted">No members found.</td></tr>`;
  } else {
    for (const m of pageRows) {
      const id = m._id || ""; // 🔑 always use _id for API
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${m.memberId || "—"}</td>
        <td>${m.name || "—"}</td>
        <td>${m.phone || m.contact || m.email || "—"}</td>
        <td>${m.country || "—"}</td>
        <td>${m.role || "member"}</td>
        <td>${m.contributionPlan || "—"}</td>
        <td>${
          m.memberSince
            ? new Date(m.memberSince).toLocaleDateString()
            : "—"
        }</td>
        <td>${m.status || "Active"}</td>
        <td class="num">
          <div class="row" style="gap:6px; justify-content:flex-end">
            <button class="btn" data-view="${id}">View</button>
            <button class="btn" data-edit="${id}">Edit</button>
            <button class="btn" data-del="${id}" style="background:#ffe9e9;color:#b00020">Delete</button>
          </div>
        </td>
      `;
      el.tbody.appendChild(tr);
    }
  }

  // pager
  const pages = Math.max(1, Math.ceil(rows.length / state.perPage));
  if (el.pagerInfo) el.pagerInfo.textContent = `Page ${state.page} of ${pages}`;
  el.prev?.toggleAttribute?.("disabled", state.page <= 1);
  el.next?.toggleAttribute?.("disabled", state.page >= pages);

  // actions
  $$("[data-view]").forEach((b) => b.addEventListener("click", onView));
  $$("[data-edit]").forEach((b) => b.addEventListener("click", onEditOpen));
  $$("[data-del]").forEach((b) => b.addEventListener("click", onDeleteOpen));
}

// ---------- view (peek) ----------
function onView(e) {
  const id = e.currentTarget.getAttribute("data-view");
  if (!id) return;
  go(`member-dashboard.html?id=${encodeURIComponent(id)}&peek=1`);
}

// ---------- edit ----------
function onEditOpen(e) {
  const id = e.currentTarget.getAttribute("data-edit");
  const m = state.all.find((x) => String(x._id) === String(id)) || {};
  state.editing = m;
  el.editTitle.textContent =
    m._id || m.memberId ? "Edit Member" : "Add Member";
  fillEditForm(m);
  toast("", true);
  show(el.editModal);
}

function fillEditForm(m) {
  el.m_id.value = m._id || "";
  el.m_name.value = m.name || "";
  el.m_memberId.value = m.memberId || "";
  el.m_email.value = m.email || "";
  el.m_phone.value = m.phone || m.contact || "";
  el.m_country.value = m.country || "";
  el.m_role.value = (m.role || "member").toLowerCase();
  el.m_plan.value = m.contributionPlan || "";
  el.m_joined.value = m.memberSince
    ? new Date(m.memberSince).toISOString().slice(0, 10)
    : "";
  el.m_status.value = m.status || "Active";
}

el.editForm?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const payload = {
    name: el.m_name.value.trim(),
    memberId: el.m_memberId.value.trim(),
    email: el.m_email.value.trim(),
    phone: el.m_phone.value.trim(),
    country: el.m_country.value.trim(),
    role: el.m_role.value.trim(),
    contributionPlan: el.m_plan.value.trim(),
    memberSince: el.m_joined.value
      ? new Date(el.m_joined.value).toISOString()
      : null,
    status: el.m_status.value.trim(),
  };

  try {
    const hasId = !!state.editing && !!state.editing._id;
    if (hasId) {
      const key = state.editing._id; // 🔑 backend expects _id in /:id
      try {
        await api.put(`/members/${encodeURIComponent(key)}`, payload);
      } catch {
        const i = state.all.findIndex((x) => String(x._id) === String(key));
        if (i >= 0) state.all[i] = { ...state.all[i], ...payload };
        saveCache(state.all);
      }
      toast("Member updated.", true);
    } else {
      // create
      let created = null;
      try {
        created = await api.post("/members", payload);
      } catch {
        created = { ...payload, _id: crypto.randomUUID() };
        state.all.push(created);
        saveCache(state.all);
      }
      toast("Member added.", true);
    }
    hide(el.editModal);
    fetchMembers();
  } catch (err) {
    console.error(err);
    toast("Save failed. Check fields and try again.");
  }
});

// close modal buttons
$$("[data-close]").forEach((b) =>
  b.addEventListener("click", () => {
    hide(el.editModal);
    hide(el.deleteModal);
  })
);

// ---------- delete ----------
function onDeleteOpen(e) {
  const id = e.currentTarget.getAttribute("data-del");
  const m = state.all.find((x) => String(x._id) === String(id));
  if (!m) return;
  state.deleting = m;
  el.deleteText.textContent = `Delete ${
    m.name || m.memberId || "this member"
  }? This cannot be undone.`;
  show(el.deleteModal);
}

el.confirmDeleteBtn?.addEventListener("click", async () => {
  const m = state.deleting;
  if (!m) return;
  const key = m._id; // 🔑 always _id
  try {
    try {
      await api.del(`/members/${encodeURIComponent(key)}`);
    } catch {
      state.all = state.all.filter((x) => String(x._id) !== String(key));
      saveCache(state.all);
    }
    hide(el.deleteModal);
    fetchMembers();
  } catch (err) {
    console.error(err);
    hide(el.deleteModal);
  }
});

// ---------- filters + paging + export ----------
el.search?.addEventListener("input", () => {
  state.page = 1;
  paintTable();
});
el.roleFilter?.addEventListener("change", () => {
  state.page = 1;
  paintTable();
});
el.planFilter?.addEventListener("change", () => {
  state.page = 1;
  paintTable();
});

el.prev?.addEventListener("click", () => {
  state.page = Math.max(1, state.page - 1);
  paintTable();
});
el.next?.addEventListener("click", () => {
  state.page = state.page + 1;
  paintTable();
});

el.exportBtn?.addEventListener("click", () => {
  const rows = applyFilters();
  const headers = [
    "ID",
    "Name",
    "Email",
    "Phone",
    "Country",
    "Role",
    "Plan",
    "Joined",
    "Status",
  ];
  const csvRows = rows.map((m) => [
    m.memberId || "",
    m.name || "",
    m.email || "",
    m.phone || m.contact || "",
    m.country || "",
    m.role || "",
    m.contributionPlan || "",
    m.memberSince
      ? new Date(m.memberSince).toISOString().slice(0, 10)
      : "",
    m.status || "",
  ]);
  const csv = [headers, ...csvRows]
    .map((r) =>
      r.map((x) => `"${String(x).replaceAll('"', '""')}"`).join(",")
    )
    .join("\n");
  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "members.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// ---------- init ----------
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", fetchMembers);
} else {
  // DOM already ready (script at bottom) → just run
  fetchMembers();
}