// Frontend/js/member-settings.js
// Member "My Settings" page – account info + change password

import {
  api,
  getUser,
  requireRole,
  activeNav,
  toast,
} from "./nkd-bus.js";

console.log("[Member Settings] script loaded");

const $ = (id) => document.getElementById(id);

// ----------------- INIT -----------------
window.addEventListener("DOMContentLoaded", () => {
  console.log("[Member Settings] DOM ready");

  // Any logged-in member can view their own settings
  requireRole([]);

  activeNav("settings");

  const user = getUser();
  if (!user) {
    console.warn("[Member Settings] No user in storage, sending to login");
    location.href = "login.html";
    return;
  }

  // Fill account info section (top card)
  fillAccountInfo(user);

  // Wire up password form
  const saveBtn = $("#savePasswordBtn") || $("#btnSavePassword");
  if (saveBtn) {
    console.log("[Member Settings] Save password button found");
    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleChangePassword(user);
    });
  } else {
    console.warn("[Member Settings] Save password button NOT found");
  }
});

// ----------------- UI: account info -----------------
function fillAccountInfo(u) {
  // These IDs should match your member-settings.html
  const idEl = $("#viewMemberId") || $("#memberId");
  const nameEl = $("#viewFullName") || $("#fullName");
  const emailEl = $("#viewEmail") || $("#email");
  const planEl = $("#viewPlan") || $("#contributionPlan");

  if (idEl) idEl.value = u.memberId || "";
  if (nameEl) nameEl.value = u.name || "";
  if (emailEl) emailEl.value = u.email || "";
  if (planEl) planEl.value = u.contributionPlan || "Annually";
}

// ----------------- Change password -----------------
async function handleChangePassword(user) {
  const currentPassword =
    ($("#currentPassword")?.value || $("#oldPassword")?.value || "").trim();
  const newPassword =
    ($("#newPassword")?.value || $("#passwordNew")?.value || "").trim();
  const confirmPassword =
    ($("#confirmPassword")?.value || $("#passwordConfirm")?.value || "").trim();

  if (!currentPassword || !newPassword || !confirmPassword) {
    toast("Please fill in all password fields.", "warn");
    return;
  }

  if (newPassword.length < 8) {
    toast("New password must be at least 8 characters.", "warn");
    return;
  }

  if (newPassword !== confirmPassword) {
    toast("New password and confirmation do not match.", "error");
    return;
  }

  // This is what the backend expects: identifier + newPassword (+ optional currentPassword)
  const identifier =
    user.email || user.memberId || user.username || user._id || "";

  if (!identifier) {
    toast("Cannot detect your account identifier. Please log in again.", "error");
    console.error("[Member Settings] No identifier on user object:", user);
    return;
  }

  const body = {
    identifier,
    currentPassword,
    newPassword,
  };

  console.log("[Member Settings] change-password payload", {
    identifier,
    hasCurrent: !!currentPassword,
    hasNew: !!newPassword,
  });

  try {
    await api.post("/auth/change-password", body);
    toast("Password updated successfully.", "ok");

    // Clear form fields
    if ($("#currentPassword")) $("#currentPassword").value = "";
    if ($("#newPassword")) $("#newPassword").value = "";
    if ($("#confirmPassword")) $("#confirmPassword").value = "";

    // Update local user: they no longer need to change password
    const updated = { ...user, mustChangePassword: false };
    localStorage.setItem("nkd_user", JSON.stringify(updated));
  } catch (err) {
    console.error("[Member Settings] change password failed", err);
    const msg =
      err?.message?.includes("identifier and newPassword are required")
        ? "Server did not receive identifier/new password – please try again."
        : err?.message || "Error updating password.";
    toast(msg, "error");
  }
}