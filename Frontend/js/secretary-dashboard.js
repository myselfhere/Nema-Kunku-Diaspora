// Frontend/js/secretary-dashboard.js
import {
  api,
  getUser,
  clearUser,
  go,
  activeNav,
  toDDMMYYYY,
  requireRole,
} from "./nkd-bus.js";

const $ = (s) => document.querySelector(s);

function setupTopbar() {
  requireRole(["secretary", "admin", "president"]);
  activeNav("dashboard");

  const u = getUser();
  const slot = document.querySelector("[data-user-slot]");
  if (slot && u) {
    slot.textContent = `${u.name || u.memberId || "User"} • ${u.role || "secretary"}`;
  }

  const btn = document.querySelector(".menu-toggle");
  const nav = document.getElementById("adminNav");
  if (btn && nav) btn.addEventListener("click", () => nav.classList.toggle("active"));

  $("#logoutLink")?.addEventListener("click", (e) => {
    e.preventDefault();
    clearUser();
    go("login.html");
  });
}

function splitMeetings(list) {
  const now = new Date();
  const pastYearCut = new Date();
  pastYearCut.setFullYear(now.getFullYear() - 1);

  let total = 0,
    upcoming = [],
    pastYear = 0;

  (list || []).forEach((m) => {
    if (!m.date) return;
    const d = new Date(m.date);
    if (isNaN(d)) return;
    total++;
    if (d >= now) upcoming.push(m);
    if (d >= pastYearCut && d <= now) pastYear++;
  });

  return { total, upcoming, pastYear };
}

async function loadData() {
  try {
    const raw = await api.getMeetings().catch(() => []);
    const meetings = Array.isArray(raw) ? raw : raw.items || [];

    const { total, upcoming, pastYear } = splitMeetings(meetings);

    $("#kpiMeetings").textContent = total;
    $("#kpiUpcoming").textContent = upcoming.length;
    $("#kpiPastYear").textContent = pastYear;

    // If each meeting has an attendance array, count it, else 0
    let attendCount = 0;
    meetings.forEach((m) => {
      if (Array.isArray(m.attendance)) attendCount += m.attendance.length;
    });
    $("#kpiAttendance").textContent = attendCount;

    // Tables
    const upcomingSorted = upcoming
      .slice()
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 6);

    const recent = meetings
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6);

    const upBody = $("#tblUpcomingBody");
    const rBody = $("#tblRecentBody");

    if (!upcomingSorted.length) {
      upBody.innerHTML = `<tr><td colspan="3" class="muted">No upcoming meetings.</td></tr>`;
    } else {
      upBody.innerHTML = upcomingSorted
        .map(
          (m) => `
          <tr>
            <td>${m.meetingId || m.code || m.id || ""}</td>
            <td>${m.date ? toDDMMYYYY(m.date) : ""}</td>
            <td>${m.title || m.topic || "-"}</td>
          </tr>`
        )
        .join("");
    }

    if (!recent.length) {
      rBody.innerHTML = `<tr><td colspan="3" class="muted">No meetings found.</td></tr>`;
    } else {
      rBody.innerHTML = recent
        .map(
          (m) => `
          <tr>
            <td>${m.meetingId || m.code || m.id || ""}</td>
            <td>${m.date ? toDDMMYYYY(m.date) : ""}</td>
            <td>${m.notes || m.summary || m.title || "-"}</td>
          </tr>`
        )
        .join("");
    }
  } catch (e) {
    console.error("[Secretary] load error", e);
  }
}

function init() {
  setupTopbar();
  loadData();
}

window.addEventListener("DOMContentLoaded", init);