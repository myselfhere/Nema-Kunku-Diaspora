// Frontend/js/admin-dashboard.js
// Populates KPIs + quick tables

import { api } from "./nkd-bus.js"; // keep it simple: only import what exists

// --- local formatters & utils (avoid depending on nkd-bus for these) ---
const n = v => Number(v || 0);
const fmtEUR = v => `€${n(v).toFixed(2)}`;
const fmtGMD = v => `D${n(v).toFixed(2)}`;
const toYYYYMMDD = (d) => {
  const dt = new Date(d);
  if (isNaN(dt)) return "-";
  const pad = x => String(x).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
};

const $ = (s) => document.querySelector(s);
const setText = (s, v) => { const el = $(s); if (el) el.textContent = v; };

// Count members with any arrears flags we store
const countMembersInArrears = (members=[]) =>
  members.filter(m => n(m.arrearsYears) > 0 || n(m.arrears) > 0).length;

async function loadDashboard(){
  try{
    // Pull everything in parallel (fallbacks to empty arrays)
    const [membersRes, contribsRes, meetingsRes] = await Promise.all([
      api.get("/members?page=1&limit=500").catch(()=>({ items:[] })),
      api.get("/contributions?page=1&limit=1000").catch(()=>({ items:[] })),
      api.get("/meetings?page=1&limit=100").catch(()=>({ items:[] })),
    ]);

    const members  = Array.isArray(membersRes?.items)  ? membersRes.items  : (Array.isArray(membersRes)  ? membersRes  : []);
    const contribs = Array.isArray(contribsRes?.items) ? contribsRes.items : (Array.isArray(contribsRes) ? contribsRes : []);
    const meetings = Array.isArray(meetingsRes?.items) ? meetingsRes.items : (Array.isArray(meetingsRes) ? meetingsRes : []);

    // KPIs
    const totalMembers = members.length;

    const totalEUR = contribs.reduce((sum,c)=>{
      if (c.amountEUR != null) return sum + n(c.amountEUR);
      if ((c.currency||"") === "EUR") return sum + n(c.amount);
      return sum;
    },0);

    const totalGMD = contribs.reduce((sum,c)=>{
      if (c.amountGMD != null) return sum + n(c.amountGMD);
      if ((c.currency||"") === "GMD") return sum + n(c.amount);
      return sum;
    },0);

    const totalMeet = meetings.length;
    const arrearsCount = countMembersInArrears(members);

    setText("#kpiMembers", String(totalMembers));
    setText("#kpiEUR", fmtEUR(totalEUR));
    setText("#kpiGMD", fmtGMD(totalGMD));
    setText("#kpiMeet", String(totalMeet));
    setText("#kpiArrears", `${arrearsCount} ${arrearsCount===1?"member":"members"}`);

    // Recent contributions (latest 5)
    const rcBody = $("#recentContribTbody");
    if (rcBody){
      rcBody.innerHTML = "";
      const recent = [...contribs].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).slice(0,5);
      if (recent.length===0){
        rcBody.innerHTML = `<tr><td colspan="5" class="muted">No contributions yet.</td></tr>`;
      } else {
        for (const c of recent){
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${c.receipt || c.id || "-"}</td>
            <td>${toYYYYMMDD(c.date) || "-"}</td>
            <td>${c.memberName || c.member || "-"}</td>
            <td>${n(c.amountEUR) ? fmtEUR(n(c.amountEUR)) : "—"}</td>
            <td>${n(c.amountGMD) ? fmtGMD(n(c.amountGMD)) : "—"}</td>
          `;
          rcBody.appendChild(tr);
        }
      }
    }

    // Meetings snapshot (latest 5)
    const mtBody = $("#meetingsTbody");
    if (mtBody){
      mtBody.innerHTML = "";
      const recentM = [...meetings].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).slice(0,5);
      if (recentM.length===0){
        mtBody.innerHTML = `<tr><td colspan="3" class="muted">No meetings recorded.</td></tr>`;
      } else {
        for (const m of recentM){
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${m.meetingId || m.id || "-"}</td>
            <td>${toYYYYMMDD(m.date) || "-"}</td>
            <td>${m.status || "logged"}</td>
          `;
          mtBody.appendChild(tr);
        }
      }
    }

    // Action links (these were fine—just never ran due to the crash)
    $("#viewAllContrib")?.addEventListener("click", ()=> location.href="admin-contributions.html");
    $("#viewMeetingsBtn")?.addEventListener("click", ()=> location.href="admin-meetings.html");
    $("#addProjectBtn")?.addEventListener("click", ()=> location.href="admin-projects-add.html");
    $("#recContribBtn")?.addEventListener("click", ()=> location.href="admin-contribution-add.html");
    $("#recExpBtn")?.addEventListener("click", ()=> location.href="admin-expenditure-add.html");
    $("#logMeetingBtn")?.addEventListener("click", ()=> location.href="admin-meeting-add.html");
    $("#manageMembersBtn")?.addEventListener("click", ()=> location.href="admin-members.html");
  }catch(err){
    console.error("Dashboard load failed:", err);
    setText("#kpiMembers","0");
    setText("#kpiEUR",fmtEUR(0));
    setText("#kpiGMD",fmtGMD(0));
    setText("#kpiMeet","0");
    setText("#kpiArrears","0 members");
    const f1 = $("#recentContribTbody"); if (f1) f1.innerHTML = `<tr><td colspan="5" class="muted">Unable to load.</td></tr>`;
    const f2 = $("#meetingsTbody"); if (f2) f2.innerHTML = `<tr><td colspan="3" class="muted">Unable to load.</td></tr>`;
  }
}

document.addEventListener("DOMContentLoaded", loadDashboard);