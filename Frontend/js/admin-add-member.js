// Frontend/js/admin-add-member.js
import { api, getUser, getApiBase } from "./nkd-bus.js";

console.log("[Admin Add Member] script loaded");

const $ = (id) => document.getElementById(id);

// ---------- TOPBAR ----------
(function setupTopbar() {
  const u = getUser() || {};
  const slot = document.querySelector("[data-user-slot]");
  if (slot) {
    const roleLabel = u.role || "admin";
    slot.textContent = `${u.name || "Salme Ture"} • ${roleLabel}`;
  }

  const btn = document.querySelector(".menu-toggle");
  const nav = document.getElementById("adminNav");
  if (btn && nav) {
    btn.addEventListener("click", () => nav.classList.toggle("active"));
  }
})();

// ---------- HELPERS ----------
function ymd(v) {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; // yyyy-mm-dd
  const m = v.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/); // dd/mm/yyyy
  if (!m) return v;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function autoPassword() {
  const rawId = ($("#memberId")?.value || "NKD000").replace(/\s+/g, "");
  const year = new Date().getFullYear();
  return `${rawId}-${year}`;
}

// ---------- MAIN SETUP ----------
function setupPage() {
  console.log("[Admin Add Member] DOM ready");

  const API_BASE = getApiBase();
  console.log("[Admin Add Member] API_BASE =", API_BASE);

  // Buttons (by id – ids must match admin-add-member.html)
  const genBtn = $("#genPass");
  const copyBtn = $("#copyLogin");
  const saveBtn = $("#saveMember");

  console.log("[Admin Add Member] gen button found?", !!genBtn);
  console.log("[Admin Add Member] copy button found?", !!copyBtn);
  console.log("[Admin Add Member] save button found?", !!saveBtn);

  // Generate password
  if (genBtn) {
    genBtn.addEventListener("click", () => {
      const pw = autoPassword();
      const pwInput = $("#tempPassword");
      if (pwInput) pwInput.value = pw;
    });
  }

  // Copy login details
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const username =
        ($("#username")?.value ||
          $("#email")?.value ||
          $("#memberId")?.value ||
          "").trim();
      const password = ($("#tempPassword")?.value || "").trim();
      const portal = `${location.origin}/Frontend/login.html`;

      if (!username || !password) {
        alert("Please enter username and temporary password first.");
        return;
      }

      const msg =
        `Login details:\n\n` +
        `Username: ${username}\n` +
        `Password: ${password}\n` +
        `Portal: ${portal}`;

      navigator.clipboard.writeText(msg).then(
        () => alert("Login details copied to clipboard!"),
        () => alert("Could not copy to clipboard.")
      );
    });
  }

  // Save member
  if (saveBtn) {
    saveBtn.addEventListener("click", onSaveClick);
  } else {
    console.warn("[Admin Add Member] #saveMember not found in DOM");
  }
}

async function onSaveClick(e) {
  e.preventDefault();
  console.log("[Admin Add Member] Save clicked");

  const payload = {
    // basic info
    name: ($("#fullName")?.value || "").trim(),
    email: ($("#email")?.value || "").trim(),
    phone: ($("#phone")?.value || "").trim(),
    country: ($("#country")?.value || "").trim(),
    position: ($("#position")?.value || "").trim(),
    preferredContact: $("#contactMethod")?.value || "Not set",

    // membership
    memberId: ($("#memberId")?.value || "").trim(),
    status: $("#status")?.value || "Active",
    contributionPlan: $("#plan")?.value || "Annually",
    memberSince: ymd($("#joined")?.value),

    // login / access
    role: $("#role")?.value || "member",
    username:
      ($("#username")?.value || $("#email")?.value || "").trim() ||
      ($("#memberId")?.value || "").trim(),
    password: ($("#tempPassword")?.value || "").trim(),
    mustChangePassword: !!$("#mustChange")?.checked,

    // notes / finance
    notes: ($("#notes")?.value || "").trim(),
    totalPaidGMD: 0,
  };

  // validation
  if (!payload.name || !payload.memberId) {
    alert("Please fill in Full Name and Member ID.");
    return;
  }

  if (!payload.password) {
    const ok = confirm(
      "Temporary password is empty.\nDo you want to auto-generate one now?"
    );
    if (!ok) return;

    payload.password = autoPassword();
    const pwInput = $("#tempPassword");
    if (pwInput) pwInput.value = payload.password;
  }

  console.log("[Admin Add Member] payload", payload);

  try {
    await api("/members", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    alert("✅ Member saved successfully.");
    window.location.href = "admin-members.html";
  } catch (err) {
    console.error("[Admin Add Member] save failed", err);
    alert(
      "❌ Error saving member: " +
        (err?.message || err?.error || "Unknown error.")
    );
  }
}

// Ensure setup runs when the page is ready
window.addEventListener("DOMContentLoaded", setupPage);