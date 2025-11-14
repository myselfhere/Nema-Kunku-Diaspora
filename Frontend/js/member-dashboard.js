// Frontend/js/member-dashboard.js
// Member dashboard controller (stats, recent contributions, meetings, CSV)

import {
  api,
  fmtEUR,
  fmtGMD,
  toYYYYMMDD,
  $,
  text,
  getUser,
  setUser,
  normalizeMember,
} from "./nkd-bus.js";

const n = (v) => Number(v || 0);
const THIS_YEAR = new Date().getFullYear();
const params = new URLSearchParams(location.search);
const memberIdFromUrl = params.get("id");

/* ---------------- Helpers ---------------- */

function isThisYear(d) {
  if (!d) return false;
  const dt = new Date(d);
  const t = dt.getTime();
  if (Number.isNaN(t)) return false;
  return dt.getFullYear() === THIS_YEAR;
}

function pickStatusForMember(meeting, member) {
  const list = Array.isArray(meeting?.attendance) ? meeting.attendance : [];
  const found = list.find(
    (a) =>
      a.memberId === member?.memberId ||
      a.memberId === member?._id ||
      a.memberId === member?.email
  );
  return found?.status || meeting?.status || "logged";
}

async function resolveMember() {
  // 1) Try URL param (?id=...)
  if (memberIdFromUrl) {
    try {
      const m = await api.get(`/members/${encodeURIComponent(memberIdFromUrl)}`);
      if (m && m.name) return normalizeMember(m);
    } catch {
      // ignore and fall back
    }

    // If direct fetch failed, try list search
    try {
      const list = await api.getMembers();
      const found = list.find(
        (x) => x._id === memberIdFromUrl || x.memberId === memberIdFromUrl
      );
      if (found) return normalizeMember(found);
    } catch {
      // ignore and fall back
    }
  }

  // 2) Fall back to cached user
  const cached = getUser();
  return normalizeMember(cached || null);
}

function fillAccount(m) {
  const plan = m?.contributionPlan ?? m?.plan ?? "—";

  text("#myAccountName", m?.name || "—");
  text("#myAccountPlan", plan);
  text("#myAccountId", m?.memberId || m?.email || "—");

  const pill = document.querySelector("[data-user-slot]");
  if (pill) {
    pill.textContent = `${m?.name || "member"} • ${m?.role || "member"}`;
  }
}

/* ---------------- Main load ---------------- */

async function loadAll() {
  const me = await resolveMember();

  if (!me) {
    paintEmpty();
    return;
  }

  // Cache normalized member for other member pages
  setUser(me);
  fillAccount(me);

  let contribsAll = [];
  let meetingsAll = [];

  try {
    const [c, m] = await Promise.all([
      api.getContributions(),
      api.getMeetings(),
    ]);
    contribsAll = c;
    meetingsAll = m;
  } catch (err) {
    console.error("[Member Dashboard] Failed to load data", err);
  }

  const contribList = Array.isArray(contribsAll)
    ? contribsAll
    : contribsAll.items || [];
  const meetingsList = Array.isArray(meetingsAll)
    ? meetingsAll
    : meetingsAll.items || [];

  /* ---- Filter my contributions ---- */
  const myContribs = contribList.filter((c) => {
    const mid = c.memberId;
    const sameId =
      mid &&
      (mid === me.memberId || mid === me._id || mid === me.email);

    const nameMatch =
      typeof c.member === "string" &&
      me.name &&
      c.member.toLowerCase().includes(me.name.toLowerCase());

    return sameId || nameMatch;
  });

  const eurYTD = myContribs
    .filter((c) => isThisYear(c.date))
    .reduce((sum, c) => {
      if (c.amountEUR != null) return sum + n(c.amountEUR);
      if ((c.currency || "") === "EUR") return sum + n(c.amount);
      return sum;
    }, 0);

  const gmdYTD = myContribs
    .filter((c) => isThisYear(c.date))
    .reduce((sum, c) => {
      if (c.amountGMD != null) return sum + n(c.amountGMD);
      if ((c.currency || "") === "GMD") return sum + n(c.amount);
      return sum;
    }, 0);

  text("#kpiEUR", fmtEUR(eurYTD));
  text("#kpiGMD", fmtGMD(gmdYTD));

  /* ---- Recent contributions table ---- */
  const rcBody = document.querySelector("#recentContribTbody");
  if (rcBody) {
    rcBody.innerHTML = "";
    const recent = [...myContribs]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 5);

    if (!recent.length) {
      rcBody.innerHTML =
        '<tr><td colspan="6" class="muted">No contributions yet.</td></tr>';
    } else {
      for (const c of recent) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${c.receipt || c.id || "-"}</td>
          <td>${toYYYYMMDD(c.date) || "-"}</td>
          <td>${c.plan || c.contributionPlan || "-"}</td>
          <td>${c.method || c.paymentMethod || "-"}</td>
          <td>${n(c.amountEUR) ? fmtEUR(n(c.amountEUR)) : "—"}</td>
          <td>${n(c.amountGMD) ? fmtGMD(n(c.amountGMD)) : "—"}</td>
        `;
        rcBody.appendChild(tr);
      }
    }
  }

  /* ---- Filter my meetings ---- */
  const myMeetings = meetingsList.filter((m) => {
    const att = Array.isArray(m?.attendance) ? m.attendance : [];
    return att.some(
      (a) =>
        a.memberId === me.memberId ||
        a.memberId === me._id ||
        a.memberId === me.email
    );
  });

  const attendedCount = myMeetings.filter((m) => {
    const s = pickStatusForMember(m, me).toLowerCase();
    return s === "present" || s === "attended";
  }).length;

  const missedCount = Math.max(0, myMeetings.length - attendedCount);

  text("#kpiAttend", String(attendedCount));
  text("#kpiMissed", String(missedCount));

  /* ---- Recent meetings table ---- */
  const rmBody = document.querySelector("#recentMeetTbody");
  if (rmBody) {
    rmBody.innerHTML = "";
    const recentM = [...myMeetings]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 5);

    if (!recentM.length) {
      rmBody.innerHTML =
        '<tr><td colspan="4" class="muted">No meetings recorded.</td></tr>';
    } else {
      for (const m of recentM) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${m.meetingId || m.id || "-"}</td>
          <td>${toYYYYMMDD(m.date) || "-"}</td>
          <td>${m.topic || m.notes || "-"}</td>
          <td>${pickStatusForMember(m, me)}</td>
        `;
        rmBody.appendChild(tr);
      }
    }
  }

  /* ---- CSV export ---- */
  document
    .querySelector("#downloadCsvBtn")
    ?.addEventListener("click", () => {
      const headers = ["Receipt", "Date", "Plan", "Method", "EUR", "GMD"];
      const rows = [...myContribs]
        .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
        .map((c) => [
          c.receipt || c.id || "",
          toYYYYMMDD(c.date) || "",
          c.plan || c.contributionPlan || "",
          c.method || c.paymentMethod || "",
          n(c.amountEUR) ? String(n(c.amountEUR)) : "",
          n(c.amountGMD) ? String(n(c.amountGMD)) : "",
        ]);

      const csv = [headers, ...rows]
        .map((r) =>
          r.map((x) => `"${String(x).replaceAll('"', '""')}"`).join(",")
        )
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${me.memberId || me.email || "member"}-statement.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
}

/* ---------------- Empty state ---------------- */

function paintEmpty() {
  text("#kpiEUR", fmtEUR(0));
  text("#kpiGMD", fmtGMD(0));
  text("#kpiAttend", "0");
  text("#kpiMissed", "0");

  const rc = document.querySelector("#recentContribTbody");
  if (rc) {
    rc.innerHTML =
      '<tr><td colspan="6" class="muted">No contributions yet.</td></tr>';
  }

  const rm = document.querySelector("#recentMeetTbody");
  if (rm) {
    rm.innerHTML =
      '<tr><td colspan="4" class="muted">No meetings recorded.</td></tr>';
  }
}

/* ---------------- Init ---------------- */

document.addEventListener("DOMContentLoaded", loadAll);