import { api } from "./nkd-bus.js";

const $ = (id) => document.getElementById(id);

// Normalize dates to YYYY-MM-DD
function ymd(v) {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : v;
}

async function saveMember() {
  const payload = {
    name: $("#fullName").value.trim(),
    email: $("#email").value.trim(),
    phone: $("#phone").value.trim(),
    country: $("#country").value.trim(),
    position: $("#position").value.trim(),
    contactMethod: $("#contactMethod").value,
    memberId: $("#memberId").value.trim(),
    status: $("#status").value,
    contributionPlan: $("#plan").value,
    memberSince: ymd($("#joined").value),
    role: $("#role").value,
    username: $("#username").value.trim() || $("#email").value.trim(),
    password: $("#tempPassword").value.trim(),
    mustChangePassword: $("#mustChange").checked,
    notes: $("#notes").value.trim(),
  };

  if (!payload.name || !payload.memberId) {
    alert("Please fill all required fields");
    return;
  }

  try {
    await api.post("/members", payload);
    alert("Member saved successfully");
    window.location.href = "admin-members.html";
  } catch (err) {
    console.error(err);
    alert("Error saving member.");
  }
}

// Generate password
$("#genPass")?.addEventListener("click", () => {
  const id = ($("#memberId").value || "NKD000").replace(/\s+/g, "");
  const y = new Date().getFullYear();
  $("#tempPassword").value = `${id}-${y}`;
});

// Copy login info
$("#copyLogin")?.addEventListener("click", () => {
  const user = ($("#username").value ||
                $("#email").value ||
                $("#memberId").value).trim();
  const pass = $("#tempPassword").value.trim();

  const msg = `Login details:\n\nUsername: ${user}\nPassword: ${pass}\nPortal: ${location.origin}/Frontend/login.html`;
  navigator.clipboard.writeText(msg);

  alert("Login details copied!");
});

// Save button
$("#saveMember")?.addEventListener("click", (e) => {
  e.preventDefault();
  saveMember();
});