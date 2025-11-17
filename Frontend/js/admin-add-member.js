// Frontend/js/admin-contribution-add.js
// New modern controller for Add Contribution page

import { api, getUser, fmtEUR, fmtGMD, toast } from "./nkd-bus.js";

console.log("[Admin Contrib Add] script loaded");

const $ = (id) => document.getElementById(id);

let memberMap = new Map(); // memberId -> member object

/* ---------- Small helpers ---------- */

function todayYMD() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// accept dd/mm/yyyy or yyyy-mm-dd, output yyyy-mm-dd
function normalizeDate(v) {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (!m) return v;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/* ---------- Members dropdown ---------- */

async function loadMembers() {
  const sel = $("memberSelectect");
  if (!sel) {
    console.warn("[Admin Contrib Add] memberSelectect not found in DOM");
    return;
  }

  try {
    const list = await api.getMembers();
    console.log("[Admin Contrib Add] members raw:", list);
    memberMap = new Map();

    sel.innerHTML = `<option value="">Select member…</option>`;

    (list || []).forEach((m) => {
      const id = m.memberId || m.memberID || "";
      const name = m.name || "";
      if (!id && !name) return;

      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = `${id} — ${name}`;
      sel.appendChild(opt);

      memberMap.set(id, m);
    });

    console.log("[Admin Contrib Add] members loaded:", memberMap.size);
  } catch (err) {
    console.error("[Admin Contrib Add] failed to load members", err);
    toast("Could not load members list.", "error");
  }
}

function hookmemberSelectect() {
  const sel = $("memberSelectect");
  if (!sel) return;

  sel.addEventListener("change", () => {
    const id = sel.value;
    const memberIdInput = $("memberId");
    const positionInput = $("position");
    const planSelect = $("plan");

    if (!id || !memberMap.has(id)) {
      if (memberIdInput) memberIdInput.value = "";
      return;
    }

    const m = memberMap.get(id);
    if (memberIdInput) memberIdInput.value = m.memberId || id;
    if (positionInput) positionInput.value = m.position || (m.role || "Member");
    if (planSelect && m.contributionPlan) planSelect.value = m.contributionPlan;
  });
}

/* ---------- Payer toggle (registered vs unregistered) ---------- */

function hookPayerToggle() {
  const cb = $("payerIsUnregistered");
  const block = $("unregisteredBlock");
  const memberSelect = $("memberSelectect");
  const memberId = $("memberId");

  if (!cb) return;

  const applyState = () => {
    const unreg = cb.checked;
    if (block) block.style.display = unreg ? "grid" : "none";

    if (memberSelect) {
      memberSelect.disabled = unreg;
      if (unreg) memberSelect.value = "";
    }
    if (memberId) {
      if (unreg) memberId.value = "";
      memberId.readOnly = !unreg ? false : false; // keep editable if you want
    }
  };

  cb.addEventListener("change", applyState);
  applyState(); // initial
}

/* ---------- Auto convert EUR/GMD ---------- */

function hookAutoConvert() {
  const eur = $("amountEUR");
  const gmd = $("amountGMD");
  const rateEl = $("rate");
  const chk = $("autoConvert");

  if (!eur || !gmd || !rateEl || !chk) return;

  function convertFromEUR() {
    if (!chk.checked) return;
    const rate = parseFloat(rateEl.value) || 0;
    const v = parseFloat(eur.value) || 0;
    if (!rate || !v) return;
    gmd.value = (v * rate).toFixed(2);
  }

  function convertFromGMD() {
    if (!chk.checked) return;
    const rate = parseFloat(rateEl.value) || 0;
    const v = parseFloat(gmd.value) || 0;
    if (!rate || !v) return;
    eur.value = (v / rate).toFixed(2);
  }

  eur.addEventListener("blur", convertFromEUR);
  gmd.addEventListener("blur", convertFromGMD);
}

/* ---------- Years list ---------- */

function initYears() {
  const sel = $("yearsPaid");
  if (!sel) return;

  sel.innerHTML = "";
  const start = 2018;
  const end = new Date().getFullYear() + 1;

  for (let y = start; y <= end; y++) {
    const o = document.createElement("option");
    o.value = String(y);
    o.textContent = String(y);
    sel.appendChild(o);
  }
}

function hookYearAdd() {
  const btn = $("addYearBtn");
  const input = $("customYear");
  const sel = $("yearsPaid");
  if (!btn || !input || !sel) return;

  btn.addEventListener("click", () => {
    const y = (input.value || "").trim();
    if (!/^\d{4}$/.test(y)) {
      toast("Enter year as 4 digits, e.g. 2024", "warn");
      return;
    }

    // add if not exists
    let exists = false;
    Array.from(sel.options).forEach((o) => {
      if (o.value === y) exists = true;
    });

    if (!exists) {
      const o = document.createElement("option");
      o.value = y;
      o.textContent = y;
      sel.appendChild(o);
    }

    // select it
    Array.from(sel.options).forEach((o) => {
      if (o.value === y) o.selected = true;
    });

    input.value = "";
  });
}

function getSelectedYears() {
  const sel = $("yearsPaid");
  if (!sel) return [];
  return Array.from(sel.selectedOptions || []).map((o) => o.value);
}

/* ---------- Penalty toggle ---------- */

function hookPenaltyToggle() {
  const cb = $("penaltyApply");
  const details = $("penaltyDetails");
  if (!cb || !details) return;

  const apply = () => {
    details.style.display = cb.checked ? "grid" : "none";
  };

  cb.addEventListener("change", apply);
  apply();
}

/* ---------- Build payload & save ---------- */

function buildPayload() {
  const isUnreg = $("payerIsUnregistered")?.checked || false;
  const memberId = ($("memberId")?.value || "").trim();
  const plan = $("plan")?.value || "Annually";
  const amountEUR = parseFloat($("amountEUR")?.value || "0") || 0;
  const amountGMD = parseFloat($("amountGMD")?.value || "0") || 0;

  let memberName = "";
  if (!isUnreg && memberId && memberMap.has(memberId)) {
    memberName = memberMap.get(memberId).name || "";
  }

  const receiptRaw = ($("receipt")?.value || "").trim();
  const receiptNumber =
    !receiptRaw || receiptRaw.toLowerCase() === "auto" ? undefined : receiptRaw;

  return {
    date: normalizeDate($("date")?.value || ""),
    receiptNumber,

    isMember: !isUnreg,
    memberId: memberId || null,
    memberName: memberName || null,

    payerName: isUnreg ? ($("payerName")?.value || "").trim() : memberName,
    payerContact: isUnreg ? ($("payerContact")?.value || "").trim() : "",

    contributionPlan: plan,
    paymentMethod: $("method")?.value || "",
    amountEUR,
    amountGMD,
    rate: parseFloat($("rate")?.value || "0") || 0,

    position: ($("position")?.value || "").trim(),
    confirmedBy: ($("confirmedBy")?.value || "").trim(),

    yearsPaid: getSelectedYears(),
    remarks: ($("remarks")?.value || "").trim(),

    penaltyApplied: $("penaltyApply")?.checked || false,
    penaltyAmountGMD: parseFloat($("penaltyAmountGMD")?.value || "0") || 0,
    penaltyReason: ($("penaltyReason")?.value || "").trim(),
  };
}

async function saveContribution(mode = "normal") {
  const msg = $("msg");
  const showMsg = (t, ok = false) => {
    if (!msg) return;
    msg.textContent = t;
    msg.style.color = ok ? "#1b5e20" : "#b00020";
  };

  const payload = buildPayload();

  if (!payload.date) {
    showMsg("Please select a date.");
    return;
  }
  if (!payload.paymentMethod) {
    showMsg("Please choose payment method.");
    return;
  }
  if (!payload.amountEUR && !payload.amountGMD) {
    showMsg("Please enter an amount in EUR or GMD.");
    return;
  }

  showMsg("Saving…", true);

  try {
    const res = await api.post("/contributions", payload);
    console.log("[Admin Contrib Add] saved:", res);
    toast("Contribution saved", "ok");
    showMsg(
      `Saved. EUR: ${fmtEUR(payload.amountEUR)} · GMD: ${fmtGMD(payload.amountGMD)}`,
      true
    );

    if (mode === "print") {
      setTimeout(() => window.print(), 400);
    } else if (mode === "email") {
      alert("Saved. Email sending can be handled later from financial reports.");
    } else {
      setTimeout(() => {
        window.location.href = "admin-contributions.html";
      }, 700);
    }
  } catch (err) {
    console.error("[Admin Contrib Add] save failed", err);
    toast("Error saving contribution", "error");
    showMsg("Error saving contribution. Please try again.");
  }
}

/* ---------- Buttons / init ---------- */

function setupButtons() {
  const form = $("contribForm");
  const saveBtn = $("saveBtn");
  const savePrintBtn = $("savePrintBtn");
  const saveEmailBtn = $("saveEmailBtn");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      saveContribution("normal");
    });
  }

  saveBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    saveContribution("normal");
  });

  savePrintBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    saveContribution("print");
  });

  saveEmailBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    saveContribution("email");
  });
}

function initTopUser() {
  const u = getUser() || { name: "Admin", role: "admin" };
  const slot = document.querySelector("[data-user-slot]");
  if (slot) slot.textContent = `${u.name || "Admin"} • ${u.role || "admin"}`;
}

function init() {
  console.log("[Admin Contrib Add] DOM ready");
  initTopUser();

  const dateEl = $("date");
  if (dateEl && !dateEl.value) dateEl.value = todayYMD();

  const rateEl = $("rate");
  const qiRate = $("qiRate");
  if (rateEl && qiRate) qiRate.textContent = rateEl.value || "75";

  hookAutoConvert();
  hookPayerToggle();
  hookPenaltyToggle();
  initYears();
  hookYearAdd();
  setupButtons();
  hookmemberSelectect();
  loadMembers();
}

window.addEventListener("DOMContentLoaded", init);