// Frontend/js/member-settings.js
import { api, getUser, setUser, resolveMemberByIdentifier, text, $ } from "./nkd-bus.js";

async function loadMe() {
  let u = getUser();

  // Try recover from URL (?id=NKD002) or by email if cache is partial
  if (!u) {
    const urlId = new URLSearchParams(location.search).get("id");
    if (urlId) u = await resolveMemberByIdentifier(urlId);
  } else if (!u.memberId && u.email) {
    const found = await resolveMemberByIdentifier(u.email);
    if (found) u = found;
  }

  if (!u) return;

  // Re-save a full record for other pages
  setUser(u);

  text("#msMemberId", u.memberId || "—");
  text("#msName", u.name || "—");
  text("#msEmail", u.email || "—");
  text("#msPlan", u.contributionPlan || u.plan || "—");

  const pill = document.querySelector("[data-user-slot]");
  if (pill) pill.textContent = `${u.name || u.memberId || "Member"} • ${(u.role || "member")}`;
}

function val(id){ const el = document.querySelector(id); return el ? el.value.trim() : ""; }

async function bindPasswordChange(){
  const btn = $("#savePwBtn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const curr = val("#currPw");
    const next = val("#newPw");
    const conf = val("#confirmPw");
    const msg = $("#msMsg");

    msg.textContent = ""; msg.style.color = "";

    if (!next || !conf) return (msg.textContent = "Please enter and confirm your new password.");
    if (next !== conf) return (msg.textContent = "Passwords do not match.");
    if (next.length < 8) return (msg.textContent = "Password must be at least 8 characters long.");

    const me = getUser();
    if (!me) return (msg.textContent = "Please log in again.");

    try {
      const res = await api.post("/auth/change-password", {
        identifier: me.memberId || me.email,
        currentPassword: curr,
        newPassword: next,
      });
      if (res.ok) {
        msg.textContent = "✅ Password updated successfully!";
        msg.style.color = "green";
        ["currPw","newPw","confirmPw"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
      } else {
        msg.textContent = `⚠️ ${res.error || "Password update failed"}`;
        msg.style.color = "red";
      }
    } catch (e) {
      msg.textContent = `❌ ${e.message}`;
      msg.style.color = "red";
      console.error(e);
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadMe();
  await bindPasswordChange();
});