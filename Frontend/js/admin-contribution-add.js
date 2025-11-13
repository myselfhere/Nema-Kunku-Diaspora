// admin-contribution-add.js — final version
// Compatible with /Frontend/admin-contribution-add.html

const $ = (s, r = document) => r.querySelector(s);
const byId = id => document.getElementById(id);

// Quick post helper (adjust URL to your API)
async function post(url, data) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed");
  try { return await res.json(); } catch { return { ok: true }; }
}

// ===== INIT =====
(function init() {
  // Date default
  byId("date").valueAsDate = new Date();

  // Rate mirror in quick info
  const rate = byId("rate");
  const qiRate = byId("qiRate");
  rate.addEventListener("input", () => (qiRate.textContent = rate.value || "—"));

  // Populate year list (2015 -> next year)
  const yearsPaid = byId("yearsPaid");
  const nowY = new Date().getFullYear();
  for (let y = nowY + 1; y >= 2015; y--) {
    const opt = new Option(y, y);
    yearsPaid.add(opt);
  }

  // Add custom year
  byId("addYearBtn").addEventListener("click", () => {
    const v = byId("customYear").value.trim();
    if (!/^\d{4}$/.test(v)) return alert("Enter valid 4-digit year");
    const exists = [...yearsPaid.options].some(o => o.value === v);
    if (!exists) {
      const opt = new Option(v, v);
      yearsPaid.add(opt, 0);
    }
    [...yearsPaid.options].forEach(o => (o.selected = o.value === v || o.selected));
    byId("customYear").value = "";
  });

  // ===== Unregistered payer toggle =====
  const isUnreg = byId("isUnreg");
  const unregWrap = byId("unregWrap");
  isUnreg.addEventListener("change", () => {
    unregWrap.style.display = isUnreg.checked ? "grid" : "none";
    if (!isUnreg.checked) {
      byId("payerName").value = "";
      byId("payerContact").value = "";
    }
  });

  // ===== Penalty toggle (hides Period section) =====
  const penaltyApplied = byId("penaltyApplied");
  const penaltyWrap = byId("penaltyWrap");
  const periodSection = byId("yearsPaid").closest("section"); // Period card
  penaltyApplied.addEventListener("change", () => {
    const show = penaltyApplied.checked;
    penaltyWrap.style.display = show ? "grid" : "none";
    periodSection.style.display = show ? "none" : "block";
    if (!show) {
      byId("penaltyAmountGMD").value = "0";
      byId("penaltyReason").value = "";
    }
  });

  // ===== Auto convert currency =====
  const autoConvert = byId("autoConvert");
  const amountEUR = byId("amountEUR");
  const amountGMD = byId("amountGMD");

  const convert = (from) => {
    if (!autoConvert.checked) return;
    const r = Number(rate.value || 0);
    if (!r) return;
    if (from === "EUR" && Number(amountGMD.value || 0) === 0) {
      amountGMD.value = (Number(amountEUR.value || 0) * r).toFixed(2);
    } else if (from === "GMD" && Number(amountEUR.value || 0) === 0) {
      amountEUR.value = (Number(amountGMD.value || 0) / r).toFixed(2);
    }
  };

  amountEUR.addEventListener("blur", () => convert("EUR"));
  amountGMD.addEventListener("blur", () => convert("GMD"));

  // ===== Members list (placeholder demo — connect to backend) =====
  const memberSel = byId("memberSel");
  [
    { name: "Salme Ture", id: "NKD001", position: "Admin", plan: "Annually" },
    { name: "Lamin Kanyi", id: "NKD002", position: "Member", plan: "Annually" },
    { name: "Fatou Jatta", id: "NKD003", position: "Member", plan: "Quarterly" }
  ].forEach(m => {
    const opt = new Option(`${m.name} (${m.id})`, m.id);
    opt.dataset.position = m.position;
    opt.dataset.plan = m.plan;
    memberSel.add(opt);
  });

  memberSel.addEventListener("change", () => {
    const sel = memberSel.selectedOptions[0];
    if (!sel) return;
    byId("memberId").value = sel.value || "";
    byId("position").value = sel.dataset.position || "";
    byId("plan").value = sel.dataset.plan || "Annually";
  });

  // ===== Save actions =====
  byId("contribForm").addEventListener("submit", onSave);
  byId("savePrintBtn").addEventListener("click", () => onSave(null, { print: true }));
  byId("saveEmailBtn").addEventListener("click", () => onSave(null, { email: true }));
})();

// ====== SAVE FUNCTION ======
async function onSave(e, opts = {}) {
  e && e.preventDefault();
  const msg = byId("msg");
  const getMulti = sel => [...sel.selectedOptions].map(o => Number(o.value)).filter(Boolean);

  // Basic validation
  if (!byId("date").value) return alert("Date is required.");
  if (!byId("method").value) return alert("Payment method is required.");
  if (!byId("memberSel").value && !byId("isUnreg").checked)
    return alert("Select a member or tick 'not registered member'.");
  if (byId("isUnreg").checked && !byId("payerName").value.trim())
    return alert("Enter unregistered payer name.");
  if (byId("penaltyApplied").checked) {
    if (Number(byId("penaltyAmountGMD").value) <= 0) return alert("Enter penalty amount.");
    if (!byId("penaltyReason").value.trim()) return alert("Enter penalty reason.");
  }

  const payload = {
    // Core
    receipt: byId("receipt").value.trim(),
    date: byId("date").value,
    memberId: byId("memberId").value.trim(),
    memberName: byId("memberSel").selectedOptions[0]?.text?.replace(/\s*\(NKD.*\)$/, "") || "",
    isUnregistered: byId("isUnreg").checked,
    payerName: byId("isUnreg").checked ? byId("payerName").value.trim() : "",
    payerContact: byId("isUnreg").checked ? byId("payerContact").value.trim() : "",
    contributionPlan: byId("plan").value,
    paymentMethod: byId("method").value,
    amountEUR: Number(byId("amountEUR").value || 0),
    amountGMD: Number(byId("amountGMD").value || 0),
    rateGMDperEUR: Number(byId("rate").value || 0),
    autoConvert: byId("autoConvert").checked,
    position: byId("position").value.trim(),
    confirmedBy: byId("confirmedBy").value.trim(),

    // Period
    yearsPaid: getMulti(byId("yearsPaid")),
    remarks: byId("remarks").value.trim(),

    // Penalty
    penaltyApplied: byId("penaltyApplied").checked,
    penaltyAmountGMD: Number(byId("penaltyAmountGMD").value || 0),
    penaltyReason: byId("penaltyReason").value.trim()
  };

  // Normalize “Auto”
  if (!payload.receipt || /^auto$/i.test(payload.receipt)) delete payload.receipt;

  try {
    msg.textContent = "Saving...";
    const res = await post("/api/contributions", payload);
    msg.textContent = "Saved.";
    const saved = res?.data || res;
    const receiptId = saved?.receipt || payload.receipt;

    if (opts.print) {
      if (!receiptId) return alert("Saved, but no receipt to print.");
      const id = encodeURIComponent(receiptId);
      const w = window.open(`admin-contribution-view.html?id=${id}`, "_blank");
      if (w) w.onload = () => w.print();
      setTimeout(() => (window.location.href = "admin-contributions.html"), 600);
      return;
    }

    if (opts.email) {
      try {
        await post(`/api/contributions/${encodeURIComponent(receiptId)}/email`, {});
        alert("Saved. If mail configured, receipt sent.");
      } catch {}
      window.location.href = "admin-contributions.html";
      return;
    }

    window.location.href = "admin-contributions.html";
  } catch (err) {
    msg.textContent = err.message || "Failed to save.";
    alert(msg.textContent);
  }
}