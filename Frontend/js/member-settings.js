// Frontend/js/member-settings.js
// Member "My Settings" page: account info + change password

import {
  api,
  getUser,
  requireRole,
  toYYYYMMDD,
  $,
  text,
} from "./nkd-bus.js";

// Only logged-in members can be here
requireRole([]); // just ensure logged in; any role is allowed

document.addEventListener("DOMContentLoaded", init);

function init() {
  const u = getUser();
  if (!u) return;

  console.log("[Member Settings] init for", u.memberId || u.email);

  // ---- account info fields (top section) ----
  const idEl = $("#acct_memberId");
  const nameEl = $("#acct_name");
  const emailEl = $("#acct_email");
  const planEl = $("#acct_plan");
  const sinceEl = $("#acct_since");
  const statusEl = $("#acct_status");

  if (idEl) idEl.value = u.memberId || "";
  if (nameEl) nameEl.value = u.name || "";
  if (emailEl) emailEl.value = u.email || "";
  if (planEl) planEl.value = u.contributionPlan || "";
  if (sinceEl) sinceEl.value = u.memberSince ? toYYYYMMDD(u.memberSince) : "";
  if (statusEl) statusEl.value = u.status || "Active";

  // Also refresh from API using memberId for freshest data
  if (u.memberId) {
    api
      .get(`/members?memberId=${encodeURIComponent(u.memberId)}`)
      .then((raw) => {
        const item = Array.isArray(raw?.items) ? raw.items[0] : null;
        if (!item) return;
        console.log("[Member Settings] refreshed member from API", item);

        if (idEl) idEl.value = item.memberId || "";
        if (nameEl) nameEl.value = item.name || "";
        if (emailEl) emailEl.value = item.email || "";
        if (planEl) planEl.value = item.contributionPlan || "";
        if (sinceEl)
          sinceEl.value = item.memberSince
            ? toYYYYMMDD(item.memberSince)
            : "";
        if (statusEl) statusEl.value = item.status || "Active";
      })
      .catch((err) => console.warn("[Member Settings] refresh failed", err));
  }

  // ---- change password section ----
  const curEl = $("#pwd_current") || $("#currentPassword");
  const newEl = $("#pwd_new") || $("#newPassword");
  const cfmEl = $("#pwd_confirm") || $("#confirmPassword");
  const msgEl = $("#pwd_msg") || $("#passwordMsg");
  const btn = $("#pwd_saveBtn") || $("#savePasswordBtn");
  const form = $("#pwd_form") || $("#passwordForm");

  function showMsg(msg, ok = false) {
    if (!msgEl) {
      alert(msg);
      return;
    }
    msgEl.textContent = msg;
    msgEl.style.color = ok ? "#1b5e20" : "#b00020";
  }

  async function handleChangePassword(ev) {
    if (ev) ev.preventDefault();
    if (!curEl || !newEl || !cfmEl) return;

    const currentPassword = curEl.value.trim();
    const newPassword = newEl.value.trim();
    const confirm = cfmEl.value.trim();

    if (!currentPassword || !newPassword) {
      showMsg("Please enter current and new password.");
      return;
    }
    if (newPassword.length < 8) {
      showMsg("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      showMsg("New password and confirmation do not match.");
      return;
    }

    const userNow = getUser();
    if (!userNow) {
      showMsg("You are not logged in.", false);
      return;
    }

    // 🔑 THIS is the important part:
    // send identifier + currentPassword + newPassword
    const identifier = userNow.email || userNow.memberId;
    if (!identifier) {
      showMsg("Missing member identifier (email or ID).", false);
      return;
    }

    const body = { identifier, currentPassword, newPassword };

    console.log("[Member Settings] change-password payload", {
      identifier,
    });

    try {
      await api.post("/auth/change-password", body);
      showMsg("Password updated successfully ✔", true);
      curEl.value = "";
      newEl.value = "";
      cfmEl.value = "";
    } catch (err) {
      console.error("[Member Settings] change-password failed", err);
      showMsg(
        "Could not update password. Check your current password and try again."
      );
    }
  }

  if (form) form.addEventListener("submit", handleChangePassword);
  if (btn && !form) btn.addEventListener("click", handleChangePassword);
}