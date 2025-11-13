// Frontend/js/admin-add-member.js
import { api } from "./nkd-bus.js";

const $ = (id) => document.getElementById(id);

// Normalize to YYYY-MM-DD
function ymd(v) {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/); // DD-MM-YYYY or DD/MM/YYYY
  return m ? `${m[3]}-${m[2]}-${m[1]}` : v;
}

async function saveMember() {
  const body = {
    name: $("#name")?.value.trim(),
    email: $("#email")?.value.trim(),
    phone: $("#phone")?.value.trim(),
    country: $("#country")?.value.trim(),
    position: $("#position")?.value.trim(),
    preferredContact: $("#preferredContact")?.value || "Not set",
    role: $("#role")?.value || "member",
    contributionPlan: $("#plan")?.value || "",
    memberSince: ymd($("#memberSince")?.value),
    status: $("#status")?.value || "Active",
    totalPaidGMD: Number($("#paidGmd")?.value || 0),
  };

  const pwd = ($("#password")?.value || "").trim();
  if (pwd) body.password = pwd;

  try {
    await api("/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });
    alert("✅ Member saved successfully.");
    location.href = "admin-members.html";
  } catch (e) {
    console.error("Save member failed:", e);
    alert("❌ Error saving member: " + (e?.message || "Unknown error."));
  }
}

// Wire up
$("#saveBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  saveMember();
});
$("#cancelBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  history.back();
});