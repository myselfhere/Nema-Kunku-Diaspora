// Frontend/js/admin-expenditures.js
import {
  get,
  del,
  fmtEUR,
  fmtGMD,
  toDDMMYYYY,
  getUser,
} from "./nkd-bus.js";

(() => {
  // ---- DOM references ----
  const tbody          = document.getElementById("expendituresTbody");
  const searchInput    = document.getElementById("searchInput");
  const yearFilter     = document.getElementById("yearFilter");
  const categoryFilter = document.getElementById("categoryFilter");
  const methodFilter   = document.getElementById("methodFilter");
  const pager          = document.getElementById("pager");
  const pageInfo       = document.getElementById("pageInfo");
  const exportBtn      = document.getElementById("exportBtn");

  const PAGE_SIZE = 15;

  let allItems   = [];
  let filtered   = [];
  let page       = 1;

  // ---- Helper: set header user pill ----
  (function initUserPill() {
    const u = getUser();
    const slot = document.querySelector("[data-user-slot]");
    if (slot) {
      const name = u && u.name ? u.name : "Offline Admin";
      const role = u && u.role ? u.role : "admin";
      slot.textContent = name + " • " + role;
    }
    const btn = document.querySelector(".menu-toggle");
    const nav = document.getElementById("adminNav");
    if (btn && nav) {
      btn.addEventListener("click", () => nav.classList.toggle("active"));
    }
  })();

  // ---- Fetch data from API ----
  async function loadExpenditures() {
    try {
      // baseURL already has /api in nkd-bus
      const res = await get("expenditures?limit=10000&page=1");

      // Support both shapes:
      // 1) { ok:true, items:[...] }
      // 2) [ ... ]
      let items;
      if (Array.isArray(res)) {
        items = res;
      } else if (res && Array.isArray(res.items)) {
        items = res.items;
      } else {
        items = [];
      }

      allItems = items;
      applyFilters();
    } catch (err) {
      console.error("loadExpenditures error:", err);
      if (tbody) {
        tbody.innerHTML =
          "<tr><td colspan='8' class='muted'>Failed to load expenditures.</td></tr>";
      }
    }
  }

  // ---- Apply search + filters ----
  function applyFilters() {
    const q       = (searchInput && searchInput.value || "").toLowerCase();
    const yearVal = yearFilter && yearFilter.value ? yearFilter.value : "";
    const catVal  = categoryFilter && categoryFilter.value ? categoryFilter.value : "";
    const methVal = methodFilter && methodFilter.value ? methodFilter.value : "";

    filtered = allItems.filter((row) => {
      // Search: reference, payee, description, category, method, paidBy
      const ref   = (row.referenceNumber || row.refNumber || row.ref || "").toLowerCase();
      const payee = (row.payee || row.vendor || "").toLowerCase();
      const desc  = (row.description || row.details || "").toLowerCase();
      const cat   = (row.category || row.type || "").toLowerCase();
      const meth  = (row.paymentMethod || row.method || "").toLowerCase();
      const paidBy = (row.paidBy || row.approvedBy || "").toLowerCase();

      if (q) {
        const hay = ref + " " + payee + " " + desc + " " + cat + " " + meth + " " + paidBy;
        if (!hay.includes(q)) return false;
      }

      // Year filter
      if (yearVal) {
        const d = row.date ? new Date(row.date) : null;
        const y = d && !isNaN(d) ? String(d.getFullYear()) : "";
        if (y !== yearVal) return false;
      }

      // Category filter
      if (catVal && cat !== catVal.toLowerCase()) return false;

      // Method filter
      if (methVal && meth !== methVal.toLowerCase()) return false;

      return true;
    });

    page = 1;
    renderTable();
  }

  // ---- Render table ----
  function renderTable() {
    if (!tbody) return;

    if (!filtered.length) {
      tbody.innerHTML =
        "<tr><td colspan='8' class='muted'>No expenditures found.</td></tr>";
      if (pageInfo) pageInfo.textContent = "Page 1 of 1";
      if (pager)   pager.querySelectorAll("button").forEach((b) => (b.disabled = true));
      return;
    }

    const start = (page - 1) * PAGE_SIZE;
    const end   = start + PAGE_SIZE;
    const slice = filtered.slice(start, end);

    tbody.innerHTML = slice
      .map((row) => {
        const id   = row._id || row.id;
        const ref  = row.referenceNumber || row.refNumber || row.ref || "";
        const dStr = toDDMMYYYY(row.date);
        const payee = row.payee || row.vendor || "";
        const cat   = row.category || row.type || "";
        const meth  = row.paymentMethod || row.method || "";
        const eur   = fmtEUR(row.amountEUR || 0);
        const gmd   = fmtGMD(row.amountGMD || 0);

        const viewUrl = "admin-expenditure-view.html?id=" + encodeURIComponent(id);

        return `
          <tr>
            <td>${ref}</td>
            <td>${dStr}</td>
            <td>${payee}</td>
            <td>${cat}</td>
            <td>${meth}</td>
            <td>${eur}</td>
            <td>${gmd}</td>
            <td class="table-actions">
              <a href="${viewUrl}" class="link">View</a>
              <button type="button"
                      class="btn btn-danger btn-sm"
                      data-del="${id}">Delete</button>
            </td>
          </tr>
        `;
      })
      .join("");

    // Pager
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (pageInfo) {
      pageInfo.textContent = "Page " + page + " of " + totalPages;
    }
    if (pager) {
      const prev = pager.querySelector("[data-prev]");
      const next = pager.querySelector("[data-next]");
      if (prev) prev.disabled = page <= 1;
      if (next) next.disabled = page >= totalPages;
    }
  }

  // ---- Delete handler ----
  async function handleDelete(id) {
    if (!id) return;
    const ok = window.confirm("Delete this expenditure? This cannot be undone.");
    if (!ok) return;

    try {
      await del("expenditures/" + encodeURIComponent(id));
      // Remove from local array and re-render
      allItems = allItems.filter((x) => (x._id || x.id) !== id);
      applyFilters();
    } catch (err) {
      console.error("Delete expenditure error:", err);
      alert("Failed to delete expenditure.");
    }
  }

  // ---- CSV export ----
  function exportCsv() {
    if (!filtered.length) {
      alert("No records to export.");
      return;
    }

    const header = [
      "Reference",
      "Date",
      "Payee",
      "Category",
      "Method",
      "Amount EUR",
      "Amount GMD",
      "Paid By",
      "Description",
      "Comments",
    ];

    const rows = filtered.map((row) => {
      const ref   = row.referenceNumber || row.refNumber || row.ref || "";
      const date  = toDDMMYYYY(row.date);
      const payee = row.payee || row.vendor || "";
      const cat   = row.category || row.type || "";
      const meth  = row.paymentMethod || row.method || "";
      const eur   = row.amountEUR || 0;
      const gmd   = row.amountGMD || 0;
      const paidBy = row.paidBy || row.approvedBy || "";
      const desc   = row.description || row.details || "";
      const comm   = row.comments || row.remarks || "";

      return [
        ref,
        date,
        payee,
        cat,
        meth,
        eur,
        gmd,
        paidBy,
        desc,
        comm,
      ];
    });

    const csv = [header]
      .concat(rows)
      .map((r) =>
        r
          .map((v) => {
            const s = String(v == null ? "" : v);
            // escape quotes
            if (s.includes('"') || s.includes(",") || s.includes("\n")) {
              return '"' + s.replace(/"/g, '""') + '"';
            }
            return s;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = "nkd-expenditures.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ---- Wire events ----
  if (searchInput) {
    searchInput.addEventListener("input", () => applyFilters());
  }
  if (yearFilter) {
    yearFilter.addEventListener("change", () => applyFilters());
  }
  if (categoryFilter) {
    categoryFilter.addEventListener("change", () => applyFilters());
  }
  if (methodFilter) {
    methodFilter.addEventListener("change", () => applyFilters());
  }
  if (pager) {
    const prev = pager.querySelector("[data-prev]");
    const next = pager.querySelector("[data-next]");
    if (prev) {
      prev.addEventListener("click", () => {
        if (page > 1) {
          page -= 1;
          renderTable();
        }
      });
    }
    if (next) {
      next.addEventListener("click", () => {
        const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
        if (page < totalPages) {
          page += 1;
          renderTable();
        }
      });
    }
  }

  if (tbody) {
    tbody.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-del]");
      if (!btn) return;
      const id = btn.getAttribute("data-del");
      handleDelete(id);
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", exportCsv);
  }

  // ---- Init ----
  loadExpenditures();
})();