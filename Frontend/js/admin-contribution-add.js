// Frontend/js/admin-contribution-add.js
import { api, getUser, setUser, fmtEUR, fmtGMD } from "./nkd-bus.js";

const $id = (x) => document.getElementById(x);
let memberMap = new Map();

const n = (v) => Number(v || 0);

function todayYMD() {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function initTopUser() {
  const u = getUser() || { name: "Admin", role: "admin" };
  const slot = document.querySelector("[data-user-slot]");
  if (slot) slot.textContent = `${u.name} • ${u.role}`;
}

function initYears() {
  const sel = $id("yearsPaid");
  if (!sel) return;
  sel.innerHTML = "";
  const end = new Date().getFullYear() + 1;
  for (let y = 2018; y <= end; y++) {
    const o = document.createElement("option");
    o.value = String(y);
    o.textContent = String(y);
    sel.appendChild(o);
  }
}

async function loadMembers() {
  try {
    const raw = await api.getMembers().catch(() => []);
    const list = raw.items || raw || [];
    const select = $id("memberSelect");

    console.log("[Admin Contrib Add] memberSelect on init:", select);

    if (!select) {
      console.warn("[Admin Contrib Add] loadMembers: #memberSelect not found in DOM");
      return;
    }

    select.innerHTML = `<option value="">Select member...</option>`;
    memberMap = new Map();

    list.forEach((m) => {
      const id = m.memberId || m.memberID;
      if (!id || !m.name) return;
      memberMap.set(id, m);
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = `${id} — ${m.name}`;
      select.appendChild(opt);
    });

    console.log("[Admin Contrib Add] members loaded:", memberMap.size);
  } catch (err) {
    console.error("[Admin Contrib Add] loadMembers failed", err);
  }
}

function setupToggles() {
  const cbUn = $id("isUnreg");
  const wrapUn = $id("unregWrap");
  const memberSelect = $id("memberSelect");

  if (cbUn && wrapUn) {
    cbUn.addEventListener("change", () => {
      const on = cbUn.checked;
      wrapUn.style.display = on ? "grid" : "none";
      if (on && memberSelect) {
        memberSelect.value = "";
        $id("memberId").value = "";
      }
    });
  }

  if (memberSelect) {
    memberSelect.addEventListener("change", () => {
      const id = memberSelect.value;
      if (!id) return;
      const m = memberMap.get(id);
      if (!m) return;
      $id("memberId").value = m.memberId || "";
    });
  }

  // Penalty toggle
  const penCB = $id("penaltyApplied");
  const penWrap = $id("penaltyWrap");
  if (penCB && penWrap) {
    penCB.addEventListener("change", () => {
      penWrap.style.display = penCB.checked ? "grid" : "none";
    });
  }
}

function hookAutoConvert() {
  const eur = $id("amountEUR");
  const gmd = $id("amountGMD");
  const rate = $id("rate");
  const chk = $id("autoConvert");
  if (!eur || !gmd || !rate || !chk) return;

  eur.addEventListener("blur", () => {
    if (!chk.checked) return;
    const r = parseFloat(rate.value) || 0;
    const v = parseFloat(eur.value) || 0;
    if (r && v) gmd.value = (v * r).toFixed(2);
  });

  gmd.addEventListener("blur", () => {
    if (!chk.checked) return;
    const r = parseFloat(rate.value) || 0;
    const v = parseFloat(gmd.value) || 0;
    if (r && v) eur.value = (v / r).toFixed(2);
  });
}

function setupYearAdd() {
  const btn = $id("addYearBtn");
  const field = $id("customYear");
  const list = $id("yearsPaid");
  if (!btn || !field || !list) return;

  btn.addEventListener("click", () => {
    const y = (field.value || "").trim();
    if (!/^\d{4}$/.test(y)) {
      alert("Enter year as 4 digits, e.g. 2024");
      return;
    }
    const exists = [...list.options].some((o) => o.value === y);
    if (!exists) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      list.appendChild(opt);
    }
    [...list.options].forEach((o) => {
      if (o.value === y) o.selected = true;
    });
    field.value = "";
  });
}

function getSelectedYears() {
  const sel = $id("yearsPaid");
  if (!sel) return [];
  return [...sel.selectedOptions].map((o) => o.value);
}

function buildPayload() {
  const isUnreg = $id("isUnreg").checked;
  const memberId = !isUnreg ? ($id("memberId").value || "").trim() : null;

  let memberName = null;
  if (!isUnreg && memberId && memberMap.has(memberId)) {
    memberName = memberMap.get(memberId).name || null;
  }

  const payerName = isUnreg
    ? ($id("payerName").value || "").trim()
    : memberName;

  const payload = {
    // Core
    date: $id("date").value,
    receiptNumber: ($id("receipt").value || "").trim() || undefined,

    isMember: !isUnreg,
    memberId: memberId,
    memberName: memberName,

    payerName: payerName || null,
    payerContact: isUnreg ? ($id("payerContact").value || "").trim() : "",

    contributionPlan: $id("plan").value || "Annually",
    paymentMethod: $id("method").value || "",
    amountEUR: n($id("amountEUR").value),
    amountGMD: n($id("amountGMD").value),
    rate: n($id("rate").value),

    position: "",        // kept for compatibility with backend
    confirmedBy: "",     // kept for compatibility with backend

    yearsPaid: getSelectedYears(),
    remarks: ($id("remarks").value || "").trim(),

    penaltyApplied: $id("penaltyApplied").checked,
    penaltyAmountGMD: n($id("penaltyAmountGMD").value),
    penaltyReason: ($id("penaltyReason").value || "").trim()
  };

  return payload;
}

async function save() {
  const payload = buildPayload();
  console.log("Saving:", payload);

  // Frontend validations
  if (!payload.date) {
    alert("Please select a date.");
    return;
  }
  if (!payload.paymentMethod) {
    alert("Please choose payment method.");
    return;
  }
  if (!payload.amountEUR && !payload.amountGMD) {
    alert("Please enter an amount (EUR or GMD).");
    return;
  }
  if (payload.isMember && !payload.memberId) {
    alert("Please select a member or tick 'Payer is NOT a registered member'.");
    return;
  }
  if (!payload.isMember && !payload.payerName) {
    alert("Please enter payer full name for unregistered payer.");
    return;
  }

  const msg = $id("msg");
  msg.textContent = "Saving…";

  try {
    await api.post("/contributions", payload);
    msg.textContent = `Saved. EUR: ${fmtEUR(payload.amountEUR)} · GMD: ${fmtGMD(
      payload.amountGMD
    )}`;
    setTimeout(() => {
      location.href = "admin-contributions.html";
    }, 700);
  } catch (err) {
    console.error("[Admin Contrib Add] save failed", err);
    msg.textContent = "Save failed: " + (err?.error || "Missing required fields");
  }
}

function initSubmit() {
  const form = $id("contribForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    save();
  });
}

function init() {
  console.log("[Admin Contrib Add] DOM ready");
  initTopUser();
  const dateEl = $id("date");
  if (dateEl && !dateEl.value) {
    dateEl.value = todayYMD();
  }
  initYears();
  loadMembers();
  setupToggles();
  hookAutoConvert();
  setupYearAdd();
  initSubmit();
}

document.addEventListener("DOMContentLoaded", init);