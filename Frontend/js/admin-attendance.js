/* Frontend-only Attendance logic (in-memory demo DB)
   Wire to your real API later. */

const $ = (s, d=document)=>d.querySelector(s);
const $$ = (s, d=document)=>Array.from(d.querySelectorAll(s));

/* ---- Demo DB bootstrap (replace with fetch to backend later) ---- */
const DB = (() => {
  // Try to read localStorage to persist during testing
  const read = (k, def) => JSON.parse(localStorage.getItem(k) || JSON.stringify(def));
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  const members = read('nkd_members', [
    { memberId:'NKD001', name:'Salme Ture', country:'UK' },
    { memberId:'NKD002', name:'Lamin Kanyi', country:'ES' },
    { memberId:'NKD003', name:'Sutay Joof', country:'GM' }
  ]);

  const meetings = read('nkd_meetings', [
    { id:'GM-20250126-01', date:'2025-01-26', type:'General Meeting', title:'January GM' },
    { id:'GM-20250223-01', date:'2025-02-23', type:'General Meeting', title:'February GM' }
  ]);

  const attendance = read('nkd_attendance', []); // flat rows

  const api = {
    members(){ return members; },
    meetings(){ return meetings; },
    attendance(){ return attendance; },
    saveAttendance(rows){ // rows array
      rows.forEach(r => attendance.push(r));
      write('nkd_attendance', attendance);
    },
    persist(){ write('nkd_members', members); write('nkd_meetings', meetings); write('nkd_attendance', attendance); }
  };
  return api;
})();

/* ---- State ---- */
let sheetMap = new Map();          // memberId -> {present, notes, reason}
let currentMeeting = null;

/* ---- Elements ---- */
const kMeetings = $('#k_meetings');
const kPresent  = $('#k_present');
const kAbsent   = $('#k_absent');
const kRate     = $('#k_rate');

const q        = $('#q');
const fType    = $('#fType');
const fFrom    = $('#fFrom');
const fTo      = $('#fTo');
const fStatus  = $('#fStatus');

const btnReset  = $('#btnReset');
const btnExport = $('#btnExport');

const meetingSelect = $('#meetingSelect');
const btnAllPresent = $('#btnAllPresent');
const btnClear      = $('#btnClear');
const btnSaveStay   = $('#btnSaveStay');
const btnSave       = $('#btnSave');

const sheetBody   = $('#sheetBody');
const recordsBody = $('#recordsBody');

/* ---- Init ---- */
init();
function init(){
  populateMeetings();
  wireFilters();
  renderRecords(); // initial
  updateRangeKPIs(); // initial
}

/* ---- Populate meetings dropdown ---- */
function populateMeetings(){
  const opts = ['<option value="">Select meeting…</option>']
    .concat(DB.meetings().map(m => `<option value="${m.id}">${m.date} • ${m.id} • ${m.type}</option>`));
  meetingSelect.innerHTML = opts.join('');
}

/* ---- Load sheet on meeting select ---- */
meetingSelect.addEventListener('change', () => {
  const id = meetingSelect.value;
  if(!id){ sheetBody.innerHTML = `<tr><td colspan="7">Select a meeting…</td></tr>`; currentMeeting=null; return; }

  currentMeeting = DB.meetings().find(m => m.id === id) || null;
  // initialize map with defaults
  sheetMap = new Map(DB.members().map(m => [m.memberId, {present:false, notes:'', reason:''}]));
  renderSheet();
});

/* ---- Render attendance sheet ---- */
function renderSheet(){
  const rows = DB.members().map((m, idx) => {
    const st = sheetMap.get(m.memberId) || { present:false, notes:'', reason:'' };
    return `
      <tr data-mid="${m.memberId}">
        <td>${idx+1}</td>
        <td class="muted">${m.memberId}</td>
        <td><button class="link js-history" data-member="${m.memberId}">${m.name}</button></td>
        <td>${m.country||''}</td>
        <td>
          <label class="switch">
            <input type="checkbox" ${st.present ? 'checked':''} class="js-present">
            <span></span>
          </label>
        </td>
        <td>
          <input type="text" class="js-reason" placeholder="Reason..." value="${esc(st.reason)}" ${st.present?'disabled':''}>
        </td>
        <td>
          <input type="text" class="js-notes" placeholder="Optional notes..." value="${esc(st.notes)}">
        </td>
      </tr>
    `;
  }).join('');
  sheetBody.innerHTML = rows || `<tr><td colspan="7">No members.</td></tr>`;
}

/* ---- Sheet interactions ---- */
sheetBody.addEventListener('change', (e) => {
  const row = e.target.closest('tr'); if(!row) return;
  const id = row.dataset.mid;
  const presentEl = row.querySelector('.js-present');
  const reasonEl  = row.querySelector('.js-reason');
  const notesEl   = row.querySelector('.js-notes');

  const present = !!presentEl?.checked;
  if(reasonEl) reasonEl.disabled = present;

  const reason = present ? '' : (reasonEl?.value || '');
  const notes  = notesEl?.value || '';
  sheetMap.set(id, {present, reason, notes});
});

sheetBody.addEventListener('input', (e) => {
  const row = e.target.closest('tr'); if(!row) return;
  const id = row.dataset.mid;
  const present = row.querySelector('.js-present')?.checked || false;
  const reason  = present ? '' : (row.querySelector('.js-reason')?.value || '');
  const notes   = row.querySelector('.js-notes')?.value || '';
  sheetMap.set(id, {present, reason, notes});
});

/* Member history open */
sheetBody.addEventListener('click', (e) => {
  const btn = e.target.closest('.js-history');
  if(!btn) return;
  openHistory(btn.dataset.member);
});

/* ---- Bulk buttons ---- */
btnAllPresent.addEventListener('click', () => {
  DB.members().forEach(m => sheetMap.set(m.memberId, {present:true, notes:'', reason:''}));
  renderSheet();
});
btnClear.addEventListener('click', () => {
  DB.members().forEach(m => sheetMap.set(m.memberId, {present:false, notes:'', reason:''}));
  renderSheet();
});

/* ---- Save ---- */
btnSave.addEventListener('click', saveAttendance);
btnSaveStay.addEventListener('click', saveAttendance);

function saveAttendance(){
  if(!currentMeeting){ alert('Please select a meeting first.'); return; }
  const rows = DB.members().map(m => {
    const st = sheetMap.get(m.memberId) || {present:false, notes:'', reason:''};
    return {
      date: currentMeeting.date,
      meetingId: currentMeeting.id,
      type: currentMeeting.type,
      memberId: m.memberId,
      member: m.name,
      country: m.country || '',
      present: !!st.present,
      reason: st.reason || '',
      notes: st.notes || ''
    };
  });
  DB.saveAttendance(rows);
  renderRecords();
  updateRangeKPIs();
  alert('Attendance saved.');
}

/* ---- Records & KPIs ---- */
function renderRecords(){
  const rows = filteredAttendance().map(r => `
    <tr>
      <td>${r.date}</td><td>${r.meetingId}</td><td>${r.type}</td>
      <td>${r.member}</td><td class="muted">${r.memberId}</td><td>${r.country}</td>
      <td>${r.present ? 'Yes' : 'No'}</td><td>${esc(r.reason||'')}</td><td>${esc(r.notes||'')}</td>
    </tr>`).join('');
  recordsBody.innerHTML = rows || `<tr><td colspan="9">No records.</td></tr>`;
}

function updateRangeKPIs(){
  const rows = filteredAttendance();
  const meetingIds = new Set(rows.map(r => r.meetingId));
  const present = rows.filter(r=>r.present).length;
  const absent  = rows.filter(r=>!r.present).length;
  const total   = present + absent;
  const rate = total ? Math.round((present/total)*100) : 0;

  kMeetings.textContent = meetingIds.size;
  kPresent.textContent  = present;
  kAbsent.textContent   = absent;
  kRate.textContent     = rate + '%';
}

/* ---- Filters & CSV ---- */
function wireFilters(){
  [q,fType,fFrom,fTo,fStatus].forEach(el => el.addEventListener('input', () => {
    renderRecords(); updateRangeKPIs();
  }));
  btnReset.addEventListener('click', () => {
    q.value=''; fType.value=''; fFrom.value=''; fTo.value=''; fStatus.value='';
    renderRecords(); updateRangeKPIs();
  });
  btnExport.addEventListener('click', () => {
    const rows = filteredAttendance();
    const header = ['Date','Meeting ID','Type','Member','Member ID','Country','Present','Reason','Notes'];
    const csv = [header].concat(rows.map(r => [
      r.date, r.meetingId, r.type, r.member, r.memberId, r.country, r.present?'Yes':'No', r.reason||'', r.notes||''
    ].map(csvCell).join(','))).join('\n');
    downloadFile('attendance.csv', 'text/csv', csv);
  });
}

function filteredAttendance(){
  const term = q.value.trim().toLowerCase();
  const t = fType.value;
  const s = fStatus.value;
  const from = fFrom.value ? new Date(fFrom.value) : null;
  const to   = fTo.value   ? new Date(fTo.value)   : null;

  return DB.attendance().filter(r => {
    if (term){
      const bag = (r.member + r.memberId + r.meetingId + r.country).toLowerCase();
      if (!bag.includes(term)) return false;
    }
    if (t && r.type !== t) return false;
    if (s){
      if (s==='present' && !r.present) return false;
      if (s==='absent'  &&  r.present) return false;
    }
    if (from && new Date(r.date) < from) return false;
    if (to   && new Date(r.date) > to)   return false;
    return true;
  });
}

/* ---- Member history drawer ---- */
const drawer = $('#historyDrawer');
const closeHistoryBtn = $('#closeHistory');

closeHistoryBtn.addEventListener('click', ()=> drawer.classList.remove('open'));

function openHistory(memberId){
  const m = DB.members().find(x => x.memberId===memberId);
  if(!m) return;

  $('#histTitle').textContent = `${m.name} — ${m.memberId}`;
  const rows = DB.attendance().filter(r => r.memberId===memberId)
    .sort((a,b)=> a.date.localeCompare(b.date));

  const present = rows.filter(r=>r.present).length;
  const absent  = rows.filter(r=>!r.present).length;
  const total   = present + absent;
  const rate    = total ? Math.round((present/total)*100) : 0;

  $('#h_present').textContent = present;
  $('#h_absent').textContent  = absent;
  $('#h_rate').textContent    = rate + '%';

  const body = rows.map(r=>`
    <tr>
      <td>${r.date}</td><td>${r.meetingId}</td><td>${r.type}</td>
      <td>${r.present?'Yes':'No'}</td><td>${esc(r.reason||'')}</td><td>${esc(r.notes||'')}</td>
    </tr>`).join('');
  $('#histBody').innerHTML = body || `<tr><td colspan="6">No history.</td></tr>`;

  drawer.classList.add('open');
}

/* ---- Utils ---- */
function csvCell(v){
  const s = (v==null?'':String(v)).replaceAll('"','""');
  return `"${s}"`;
}
function downloadFile(name, mime, content){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], {type:mime}));
  a.download = name;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 500);
}
function esc(s){ return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'); }