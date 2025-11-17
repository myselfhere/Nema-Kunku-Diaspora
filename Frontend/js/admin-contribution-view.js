// Frontend/js/admin-contribution-view.js
// Single contribution view page

import { api, fmtEUR, fmtGMD, toDDMMYYYY, go } from "./nkd-bus.js";

const $ = (s) => document.querySelector(s);
const n = (v) => Number(v || 0);

function getIdFromUrl() {
  const p = new URLSearchParams(location.search);
  return p.get("id") || "";
}

function paintContribution(c) {
  // Basic safe access
  const receipt = c.receiptNumber || c.receipt || c.id || "-";
  const date    = c.date ? toDDMMYYYY(c.date) : "-";
  const created = c.createdAt ? toDDMMYYYY(c.createdAt) : "-";
  const updated = c.updatedAt ? toDDMMYYYY(c.updatedAt) : "-";

  const memberName = c.memberName || c.payerName || "-";
  const memberId   = c.memberId || "-";

  const plan   = c.plan || c.contributionPlan || "-";
  const method = c.method || c.paymentMethod || "-";

  const eur = n(c.amountEUR);
  const gmd = n(c.amountGMD);
  const rate = c.rate != null ? String(c.rate) : "";

  // Fill fields if they exist in HTML
  $("#viewReceipt")     && ($("#viewReceipt").textContent     = receipt);
  $("#viewDate")        && ($("#viewDate").textContent        = date);
  $("#viewCreatedAt")   && ($("#viewCreatedAt").textContent   = created);
  $("#viewUpdatedAt")   && ($("#viewUpdatedAt").textContent   = updated);

  $("#viewMemberName")  && ($("#viewMemberName").textContent  = memberName);
  $("#viewMemberId")    && ($("#viewMemberId").textContent    = memberId);

  $("#viewPlan")        && ($("#viewPlan").textContent        = plan);
  $("#viewMethod")      && ($("#viewMethod").textContent      = method);

  $("#viewAmountEUR")   && ($("#viewAmountEUR").textContent   = eur ? fmtEUR(eur) : "—");
  $("#viewAmountGMD")   && ($("#viewAmountGMD").textContent   = gmd ? fmtGMD(gmd) : "—");

  $("#viewRate")        && ($("#viewRate").textContent        = rate ? `${rate} GMD / €` : "—");

  $("#viewPosition")    && ($("#viewPosition").textContent    = c.position || "—");
  $("#viewConfirmedBy") && ($("#viewConfirmedBy").textContent = c.confirmedBy || "—");
  $("#viewRemarks")     && ($("#viewRemarks").textContent     = c.remarks || "—");

  // If you added extra fields later (yearsPaid, penalty, etc.),
  // you can map them here safely:
  if (Array.isArray(c.yearsPaid) && c.yearsPaid.length && $("#viewYearsPaid")) {
    $("#viewYearsPaid").textContent = c.yearsPaid.join(", ");
  }

  if ($("#viewPenaltyInfo")) {
    if (c.penaltyApplied && n(c.penaltyAmountGMD) > 0) {
      $("#viewPenaltyInfo").textContent =
        `${fmtGMD(c.penaltyAmountGMD)} — ${c.penaltyReason || "Penalty applied"}`;
    } else {
      $("#viewPenaltyInfo").textContent = "No penalty for this receipt.";
    }
  }

  // Page title header if you have it
  const h = $("#pageTitle");
  if (h) {
    h.textContent = `Receipt ${receipt}`;
  }
}

async function loadContribution() {
  const id = getIdFromUrl();
  const msgEl = $("#viewMsg");

  if (!id) {
    if (msgEl) {
      msgEl.textContent = "Missing contribution ID in the URL.";
      msgEl.style.color = "#b00020";
    }
    return;
  }

  if (msgEl) {
    msgEl.textContent = "Loading contribution…";
    msgEl.style.color = "#555";
  }

  try {
    const c = await api.get(`/contributions/${encodeURIComponent(id)}`);
    paintContribution(c);
    if (msgEl) msgEl.textContent = "";
  } catch (err) {
    console.error("[Contribution View] load failed", err);
    if (msgEl) {
      msgEl.textContent = "Could not load this contribution.";
      msgEl.style.color = "#b00020";
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Back button if you have one with id="backBtn"
  $("#backBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    go("admin-contributions.html");
  });

  loadContribution();
});