/* NKD — View Meetings (LocalStorage-first; API-ready)
   Query: ?memberId=NKD###
   LocalStorage keys:
     - nkd_members     (array of members)
     - nkd_meetings    (array of meetings)
   Meeting shape (recommended):
     {
       id: 'GM-20250126-01',
       type: 'General'|'Executive'|'Special'|'Annual',
       date: '2025-01-26' or '26-01-2025',
       notes: '…',
       attendees: ['NKD001','NKD002', ...], // member IDs who were present
       recordedBy: 'NKD001'
     }
*/

import { getUser, clearUser, api } from './nkd-bus.js';

const LS_MEMBERS  = 'nkd_members';
const LS_MEETINGS = 'nkd_meetings';

const $ = (id) => document.getElementById(id);
const pad2 = (n) => String(n).padStart(2, '0');

function toDDMMYYYY(v) {
  try {
    if (!v) return '';
    if (typeof v === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(v)) return v;
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
      const [y, m, d] = v.slice(0,10).split('-');
      return `${pad2(d)}-${pad2(m)}-${y}`;
    }
    const d = new Date(v);
    return `${pad2(d.getDate())}-${pad2(d.getMonth()+1)}-${d.getFullYear()}`;
  } catch { return ''; }
}
function toISOFromDDMMYYYY(s) {
  if (!s || s.length < 10) return '';
  return `${s.slice(6,10)}-${s.slice(3,5)}-${s.slice(0,2)}`;
}
function loadLS(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}
function saveCSV(filename, rows) {
  const csv = rows.map(r => r.map(x => {
    const s = (x ?? '').toString().replace(/"/g,'""');
    return `"${s}"`;
  }).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ------- State ------- */
let allMembers = [];
let allMeetings = [];
let filtered = [];
let selectedMemberId = null;

/* ------- Init ------- */
(function init() {
  // read memberId from URL (optional)
  const params = new URLSearchParams(location.search);
  selectedMemberId = params.get('memberId') || '';

  // load members (LS)
  allMembers = loadLS(LS_MEMBERS);

  // build member dropdown
  const memberSelect = $('memberFilter');
  memberSelect.innerHTML = `<option value="">All Members</option>` +
    allMembers.map(m => `<option value="${m.memberId}">${m.name} (${m.memberId})</option>`).join('');
  if (selectedMemberId) memberSelect.value = selectedMemberId;

  // set context title if a member is pre-selected
  if (selectedMemberId) {
    const m = allMembers.find(x => x.memberId === selectedMemberId);
    $('contextTitle').textContent = m ? `${m.name} — Attendance` : `Member ${selectedMemberId} — Attendance`;
  }

  // load meetings (LS first; API optional)
  loadMeetings().then(applyFilters);

  // listeners
  $('typeFilter').addEventListener('change', applyFilters);
  memberSelect.addEventListener('change', () => {
    selectedMemberId = memberSelect.value || '';
    applyFilters();
  });
  $('fromDate').addEventListener('input', applyFilters);
  $('toDate').addEventListener('input', applyFilters);
  $('exportBtn').addEventListener('click', exportVisible);

  // logout link behavior (stay consistent)
  const logout = document.getElementById('logoutLink');
  if (logout) {
    logout.addEventListener('click', (e) => {
      e.preventDefault();
      clearUser();
      localStorage.removeItem('nkd_token');
      location.href = 'login.html';
    });
  }
})();

/* ------- Data loaders ------- */
async function loadMeetings() {
  // LocalStorage first (your current manual-entry flow)
  allMeetings = loadLS(LS_MEETINGS);

  // If you later have backend, uncomment the API attempt
  // try {
  //   const res = await api('/meetings');
  //   if (res.ok) {
  //     const json = await res.json();
  //     allMeetings = Array.isArray(json) ? json : (json.items || []);
  //   }
  // } catch { /* keep LS */ }
}

/* ------- Filter & render ------- */
function applyFilters() {
  const tFilter = $('typeFilter').value || '';
  const mFilter = selectedMemberId || '';
  const dFrom = $('fromDate').value.trim();
  const dTo   = $('toDate').value.trim();

  filtered = allMeetings
    .map(m => ({
      ...m,
      _dateISO: /^\d{2}-\d{2}-\d{4}$/.test(m.date) ? toISOFromDDMMYYYY(m.date) :
                (/^\d{4}-\d{2}-\d{2}/.test(m.date) ? m.date.slice(0,10) : ''),
      _dateDD: toDDMMYYYY(m.date),
      attendees: Array.isArray(m.attendees) ? m.attendees : []
    }))
    .filter(m => {
      if (tFilter && (m.type || '').toLowerCase() !== tFilter.toLowerCase()) return false;
      if (mFilter && !m.attendees.map(x => x.toUpperCase()).includes(mFilter.toUpperCase())) return false;
      if (dFrom) {
        const isoFrom = toISOFromDDMMYYYY(dFrom);
        if (isoFrom && m._dateISO && m._dateISO < isoFrom) return false;
      }
      if (dTo) {
        const isoTo = toISOFromDDMMYYYY(dTo);
        if (isoTo && m._dateISO && m._dateISO > isoTo) return false;
      }
      return true;
    })
    .sort((a,b) => (a._dateISO < b._dateISO ? 1 : -1));

  renderTable();
}

function renderTable() {
  const tbody = $('meetTbody');
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6">No meetings match the filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(m => {
    const present = selectedMemberId
      ? (m.attendees.map(x => x.toUpperCase()).includes(selectedMemberId.toUpperCase()))
      : null;

    const attendanceCell = selectedMemberId
      ? (present
          ? `<span class="chip chip--success">Present</span>`
          : `<span class="chip chip--warning">Absent</span>`)
      : `<span class="badge">Attendees: ${m.attendees.length}</span>`;

    const viewLink = `meeting-attendance.html?meetingId=${encodeURIComponent(m.id || '')}`;
    const editLink = `create-meeting.html?edit=${encodeURIComponent(m.id || '')}`;

    return `
      <tr>
        <td>${m.id || ''}</td>
        <td>${m.type || ''}</td>
        <td>${m._dateDD || ''}</td>
        <td>${m.notes || ''}</td>
        <td>${attendanceCell}</td>
        <td class="table-actions">
          <a class="icon-btn" href="${viewLink}">View</a>
          <a class="icon-btn" href="${editLink}">Edit</a>
        </td>
      </tr>
    `;
  }).join('');
}

/* ------- Export ------- */
function exportVisible() {
  const rows = [
    ['Meeting ID','Type','Date (dd-mm-yyyy)','Notes',
     selectedMemberId ? `Attendance (${selectedMemberId})` : 'Attendees Count',
     'Recorded By']
  ];
  filtered.forEach(m => {
    const present = selectedMemberId
      ? (m.attendees.map(x => x.toUpperCase()).includes(selectedMemberId.toUpperCase()) ? 'Present' : 'Absent')
      : String(m.attendees.length);

    rows.push([
      m.id || '',
      m.type || '',
      toDDMMYYYY(m.date),
      m.notes || '',
      present,
      m.recordedBy || ''
    ]);
  });
  const fname = selectedMemberId
    ? `meetings_${selectedMemberId}.csv`
    : 'meetings.csv';
  saveCSV(fname, rows);
}