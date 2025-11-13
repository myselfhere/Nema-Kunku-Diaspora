import { api } from './nkd-bus.js';

const qs  = s => document.querySelector(s);
const qsa = s => Array.from(document.querySelectorAll(s));

// ---------- Quick action: scroll to report
qs('#btnScrollReport')?.addEventListener('click', () => {
  qs('#reportCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ---------- KPIs
async function loadKPIs() {
  try {
    const [all, upcoming, completed, avg] = await Promise.all([
      api.get('/meetings/count'),
      api.get('/meetings/count?status=upcoming'),
      api.get('/meetings/count?status=completed'),
      api.get('/attendance/average'),
    ]);
    qs('#kpiAll').textContent       = all?.total ?? 0;
    qs('#kpiUpcoming').textContent  = upcoming?.total ?? 0;
    qs('#kpiCompleted').textContent = completed?.total ?? 0;
    qs('#kpiAvg').textContent       = `${Math.round((avg?.rate ?? 0) * 100)}%`;
  } catch (e) { console.warn(e); }
}

// ---------- Recent meetings
async function loadRecent() {
  try {
    const res = await api.get('/meetings?limit=5&sort=-date');
    const list = res?.data || res || [];
    const tb = qs('#recentTbl tbody');
    if (!list.length) {
      qs('#recentEmpty').style.display = 'block';
      tb.innerHTML = '';
      return;
    }
    tb.innerHTML = list.map(x => `
      <tr>
        <td>${x.date ? new Date(x.date).toLocaleDateString() : '-'}</td>
        <td>${x.meetingId ?? '-'}</td>
        <td>${x.type ?? '-'}</td>
        <td>${(x.agenda || []).slice(0, 2).join('; ')}</td>
        <td>${x.status ?? '-'}</td>
        <td>${x.attendancePct ? Math.round(x.attendancePct * 100) + '%' : '-'}</td>
      </tr>
    `).join('');
  } catch (e) { console.warn(e); }
}

// ---------- Attendance overview
async function loadAttendanceOverview() {
  try {
    const res = await api.get('/attendance/summary?limit=10');
    const list = res?.data || res || [];
    const tb = qs('#attTbl tbody');
    if (!list.length) {
      qs('#attEmpty').style.display = 'block';
      tb.innerHTML = '';
      return;
    }
    tb.innerHTML = list.map(m => `
      <tr>
        <td>${m.memberId ?? '-'}</td>
        <td>${m.name ?? '-'}</td>
        <td>${m.present ?? 0}</td>
        <td>${m.absent ?? 0}</td>
        <td>${Math.round((m.rate ?? 0) * 100)}%</td>
      </tr>
    `).join('');
  } catch (e) { console.warn(e); }
}

// ---------- Agenda (local only)
const agenda = [];
function renderAgenda() {
  qs('#agendaList').innerHTML = agenda
    .map((a, i) => `<span class="pill">${a}<button data-i="${i}" class="pill-x">×</button></span>`)
    .join('');
  qsa('.pill-x').forEach(b => b.onclick = () => { agenda.splice(b.dataset.i, 1); renderAgenda(); });
}
qs('#agendaAdd')?.addEventListener('click', () => {
  const v = qs('#agendaInput').value.trim();
  if (!v) return;
  agenda.push(v);
  qs('#agendaInput').value = '';
  renderAgenda();
});
qs('#agendaClear')?.addEventListener('click', () => { agenda.length = 0; renderAgenda(); });

// ---------- Actions (local table)
const actions = [];
function renderActions() {
  qs('#actTbl tbody').innerHTML = actions.map((a, i) => `
    <tr>
      <td>${a.topic}</td><td>${a.owner || '-'}</td><td>${a.due || '-'}</td><td>${a.status}</td>
      <td><button class="link" data-i="${i}">remove</button></td>
    </tr>
  `).join('');
  qsa('#actTbl .link').forEach(b => b.onclick = () => { actions.splice(b.dataset.i, 1); renderActions(); });
}
qs('#actAdd')?.addEventListener('click', () => {
  const topic = qs('#actTopic').value.trim();
  if (!topic) return;
  actions.push({
    topic,
    owner: qs('#actOwner').value.trim(),
    due:   qs('#actDue').value,
    status: qs('#actStatus').value
  });
  qs('#actTopic').value = '';
  qs('#actOwner').value = '';
  qs('#actDue').value = '';
  qs('#actStatus').value = 'Open';
  renderActions();
});
qs('#actClear')?.addEventListener('click', () => { actions.length = 0; renderActions(); });

// ---------- Populate “Select Meeting”
async function populateMeetingsForType() {
  const type = qs('#repType').value;
  const sel  = qs('#repMeeting');
  sel.innerHTML = '<option value="">Latest meeting of this type</option>';
  try {
    const r = await api.get(`/meetings?type=${encodeURIComponent(type)}&limit=10&sort=-date`);
    (r?.data || r || []).forEach(m => {
      const o = document.createElement('option');
      o.value = m.id || m.meetingId || '';
      o.textContent = `${m.meetingId || m.id || 'ID'} — ${m.date ? new Date(m.date).toLocaleDateString() : ''}`;
      sel.appendChild(o);
    });
  } catch { /* noop */ }
}
qs('#repType')?.addEventListener('change', populateMeetingsForType);

// ---------- Data bundle for report
async function fetchMeetingBundle(type, meetingId) {
  let meeting;
  if (meetingId) {
    meeting = await api.get(`/meetings/${meetingId}`);
  } else {
    const list = (await api.get(`/meetings?type=${encodeURIComponent(type)}&limit=1&sort=-date`))?.data || [];
    meeting = list[0] || {};
  }
  const id = meeting.meetingId || meeting.id || '';
  const attendance = (await api.get(`/attendance/by-meeting/${encodeURIComponent(id)}`))?.data || [];
  return { meeting, attendance, id };
}

// ---------- Printable report HTML (kept simple & safe)
function buildReportHTML({ meeting, attendance, id, agendas, remarks }) {
  const actRows = (actions.length
    ? actions.map((a, i) =>
        `<tr><td>${i + 1}</td><td>${a.topic}</td><td>${a.owner || '-'}</td><td>${a.due || '-'}</td><td>${a.status}</td></tr>`
      ).join('')
    : '<tr><td colspan="5">No actions recorded.</td></tr>');

  const agList = (agendas.length
    ? agendas.map((a, i) => `<li>${i + 1}. ${a}</li>`).join('')
    : '<li>—</li>');

  const attRows = attendance.map(m =>
    `<tr><td>${m.memberId || '-'}</td><td>${m.name || '-'}</td><td>${m.present ? '✓' : '—'}</td></tr>`
  ).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Meeting Report</title>
<style>
body{font-family:system-ui,Segoe UI,Arial;padding:24px;color:#222;}
h1,h2{margin:0 0 8px;}
table{width:100%;border-collapse:collapse;margin-top:6px;}
th,td{border:1px solid #ddd;padding:6px 8px;font-size:13px;}
th{background:#f5f7f4;text-align:left;}
ul{margin-left:18px;}
h2{margin-top:20px;}
</style>
</head>
<body>
  <h1>Nema Kunku Diaspora — Meeting Report</h1>
  <p><strong>Meeting ID:</strong> ${id || '—'} |
     <strong>Type:</strong> ${meeting?.type || '—'} |
     <strong>Date:</strong> ${meeting?.date ? new Date(meeting.date).toLocaleDateString() : '—'}</p>

  <h2>Agenda</h2>
  <ul>${agList}</ul>

  <h2>Attendance</h2>
  <table>
    <thead><tr><th>Member ID</th><th>Name</th><th>Present</th></tr></thead>
    <tbody>${attRows}</tbody>
  </table>

  <h2>Action Items / Follow-ups</h2>
  <table>
    <thead><tr><th>#</th><th>Action</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead>
    <tbody>${actRows}</tbody>
  </table>

  ${remarks ? `<h2>Secretary Remarks</h2><p>${remarks}</p>` : ''}

  <p style="margin-top:24px;font-size:12px;color:#555;">© 2025 Nema Kunku Diaspora</p>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;
}

// ---------- Generate report
async function generateReport() {
  const type    = qs('#repType').value;
  const chosen  = qs('#repMeeting').value || '';
  const remarks = qs('#repRemarks').value || '';
  try {
    const { meeting, attendance, id } = await fetchMeetingBundle(type, chosen);
    const html = buildReportHTML({ meeting, attendance, id, agendas: agenda, remarks });
    const w = window.open('', '_blank');
    w.document.open(); w.document.write(html); w.document.close();
  } catch (e) {
    alert('Could not generate report. Please check meetings/attendance endpoints.');
    console.warn(e);
  }
}
qs('#btnGenerate')?.addEventListener('click', generateReport);

// ---------- Init
loadKPIs();
loadRecent();
loadAttendanceOverview();
populateMeetingsForType();
renderAgenda();
renderActions();