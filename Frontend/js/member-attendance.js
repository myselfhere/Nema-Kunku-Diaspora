// /Frontend/js/member-attendance.js
import { api, getUser } from "./nkd-bus.js";

console.log("[member-attendance] script loaded"); // quick sanity check

const $ = (s) => document.querySelector(s);
const set = (s, v) => { const el = $(s); if (el) el.textContent = v; };

const toDDMMYYYY = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
};

async function loadAttendance() {
  const me = getUser() || {};
  let meetings = [];
  try {
    const res = await api.get("/meetings?page=1&limit=500");
    meetings = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
  } catch (err) {
    console.error("Meeting load failed:", err);
    meetings = [];
  }

  // meetings that include this member in attendance list
  const list = meetings.filter((m) =>
    (m?.attendance || []).some((a) => a.memberId === me.memberId)
  );

  const total = list.length;
  const attended = list.filter((m) =>
    m.attendance?.some((a) => a.memberId === me.memberId && a.status === "Present")
  ).length;
  const percent = total ? Math.round((attended / total) * 100) : 0;

  set("#statTotal", String(total));
  set("#statAttended", String(attended));
  set("#statPercent", `${percent}%`);

  const tbody = $("#attendanceTbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="muted">No attendance records yet.</td></tr>`;
    return;
  }

  for (const m of list) {
    const a = m.attendance.find((x) => x.memberId === me.memberId);
    const status = a?.status || "Absent";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.meetingId || "-"}</td>
      <td>${toDDMMYYYY(m.date)}</td>
      <td>${m.title || m.notes || "—"}</td>
      <td class="${status === "Present" ? "status-present" : "status-absent"}">${status}</td>
    `;
    tbody.appendChild(tr);
  }
}

document.addEventListener("DOMContentLoaded", loadAttendance);