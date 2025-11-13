/* Meetings — localStorage only
   Also reads 'nkd_attendance' to show Present/Total badge per meeting row.
*/

(function () {
  const meetingForm  = document.getElementById('meetingForm');
  const editId       = document.getElementById('editId');
  const typeEl       = document.getElementById('meetingType');
  const dateEl       = document.getElementById('meetingDate');
  const titleEl      = document.getElementById('meetingTitle');
  const notesEl      = document.getElementById('meetingNotes');
  const formMsg      = document.getElementById('formMsg');
  const resetBtn     = document.getElementById('resetBtn');

  const searchBox    = document.getElementById('searchBox');
  const statTotal    = document.getElementById('statTotal');
  const tbody        = document.getElementById('meetingsTbody');
  const listMsg      = document.getElementById('listMsg');

  const readLS  = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const writeLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  const toDDMMYYYY = (iso) => {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const toYYYYMMDD = (iso) => {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yyyy = d.getFullYear();
    return `${yyyy}${mm}${dd}`;
  };

  let meetings = readLS('nkd_meetings', []);
  const attendanceMap = readLS('nkd_attendance', {}); // { meetingId: [{present:bool,...}] }

  function saveMeetings() {
    writeLS('nkd_meetings', meetings);
  }

  // Generate ID: {GM|SM}-YYYYMMDD-XX
  function nextMeetingId(type, dateISO) {
    const ymd = toYYYYMMDD(dateISO);
    const prefix = `${type}-${ymd}-`;
    const same = meetings.filter(m => m.meetingId.startsWith(prefix));
    const n = same.length + 1;
    return `${prefix}${String(n).padStart(2,'0')}`;
  }

  function clearForm() {
    editId.value = '';
    typeEl.value = 'GM';
    dateEl.value = '';
    titleEl.value = '';
    notesEl.value = '';
    formMsg.textContent = '';
  }

  function flash(el, text, ok) {
    el.textContent = text;
    el.style.padding = '8px 10px';
    el.style.borderRadius = '6px';
    el.style.marginTop = '8px';
    el.style.background = ok ? '#e7f6ed' : '#fff3f3';
    el.style.border = ok ? '1px solid #b9e0c6' : '1px solid #f0caca';
  }

  function onSubmit(e) {
    e.preventDefault();
    const type = typeEl.value || 'GM';
    const dateISO = dateEl.value;
    if (!dateISO) {
      flash(formMsg, 'Please select a date.', false);
      return;
    }
    const title = (titleEl.value || '').trim();
    const notes = (notesEl.value || '').trim();
    const now = new Date().toJSON();

    if (editId.value) {
      const idx = meetings.findIndex(m => m.meetingId === editId.value);
      if (idx === -1) { flash(formMsg, 'Meeting not found (edit).', false); return; }
      meetings[idx].type = type;
      meetings[idx].dateISO = dateISO;
      meetings[idx].title = title;
      meetings[idx].notes = notes;
      meetings[idx].updatedAt = now;

      saveMeetings();
      flash(formMsg, `Updated ${meetings[idx].meetingId}`, true);
      renderList();
      return;
    }

    const meetingId = nextMeetingId(type, dateISO);
    meetings.push({ meetingId, type, dateISO, title, notes, createdAt: now, updatedAt: now });
    saveMeetings();
    flash(formMsg, `Saved ${meetingId}`, true);
    clearForm();
    renderList();
  }

  function getAttendanceCounts(meetingId) {
    const rows = attendanceMap[meetingId] || [];
    const total = rows.length;
    const present = rows.filter(r => !!r.present).length;
    return { present, total };
  }

  function renderList() {
    // re-read attendance in case another tab saved it
    const freshAtt = readLS('nkd_attendance', {});
    meetings.sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO) || a.meetingId.localeCompare(b.meetingId));
    const q = (searchBox.value || '').toLowerCase().trim();

    tbody.innerHTML = '';
    let visible = 0;

    meetings.forEach(m => {
      const textBlob = `${m.meetingId} ${m.type} ${toDDMMYYYY(m.dateISO)} ${(m.title||'')} ${(m.notes||'')}`.toLowerCase();
      if (q && !textBlob.includes(q)) return;

      visible++;

      const tr = document.createElement('tr');

      // ID
      const tdId = document.createElement('td');
      tdId.textContent = m.meetingId;
      tr.appendChild(tdId);

      // Type
      const tdType = document.createElement('td');
      tdType.textContent = m.type;
      tr.appendChild(tdType);

      // Date
      const tdDate = document.createElement('td');
      tdDate.textContent = toDDMMYYYY(m.dateISO);
      tr.appendChild(tdDate);

      // Title
      const tdTitle = document.createElement('td');
      tdTitle.textContent = m.title || '—';
      tr.appendChild(tdTitle);

      // Notes
      const tdNotes = document.createElement('td');
      tdNotes.textContent = m.notes || '—';
      tr.appendChild(tdNotes);

      // Action
      const tdAction = document.createElement('td');

      // Attendance badge (present/total)
      const atRows = freshAtt[m.meetingId] || [];
      const present = atRows.filter(r => !!r.present).length;
      const total = atRows.length;
      const badge = document.createElement('span');
      badge.textContent = `Attendance: ${present}/${total || '—'}`;
      badge.style.marginRight = '8px';
      badge.style.padding = '4px 8px';
      badge.style.border = '1px solid #cfe9cf';
      badge.style.borderRadius = '6px';
      badge.style.background = '#f0fff0';

      // View Attendance
      const aAttend = document.createElement('a');
      aAttend.href = `meeting-attendance.html?meeting=${encodeURIComponent(m.meetingId)}`;
      aAttend.className = 'cta-button secondary';
      aAttend.textContent = 'View Attendance';

      // Edit
      const aEdit = document.createElement('button');
      aEdit.type = 'button';
      aEdit.className = 'cta-button';
      aEdit.style.marginLeft = '6px';
      aEdit.textContent = 'Edit';
      aEdit.addEventListener('click', () => loadToForm(m.meetingId));

      // Delete
      const aDel = document.createElement('button');
      aDel.type = 'button';
      aDel.className = 'cta-button secondary';
      aDel.style.marginLeft = '6px';
      aDel.textContent = 'Delete';
      aDel.addEventListener('click', () => delMeeting(m.meetingId));

      tdAction.appendChild(badge);
      tdAction.appendChild(aAttend);
      tdAction.appendChild(aEdit);
      tdAction.appendChild(aDel);
      tr.appendChild(tdAction);

      tbody.appendChild(tr);
    });

    statTotal.textContent = visible;
    listMsg.textContent = visible === 0 ? 'No meetings match your search.' : '';
  }

  function loadToForm(meetingId) {
    const m = meetings.find(x => x.meetingId === meetingId);
    if (!m) return;
    editId.value = m.meetingId;
    typeEl.value = m.type || 'GM';
    dateEl.value = m.dateISO || '';
    titleEl.value = m.title || '';
    notesEl.value = m.notes || '';
    flash(formMsg, `Editing ${m.meetingId}`, true);
  }

  function delMeeting(meetingId) {
    if (!confirm(`Delete ${meetingId}? This only removes the meeting record.`)) return;
    meetings = meetings.filter(m => m.meetingId !== meetingId);
    saveMeetings();
    renderList();
  }

  // Wire up
  meetingForm.addEventListener('submit', onSubmit);
  resetBtn.addEventListener('click', clearForm);
  searchBox.addEventListener('input', renderList);

  // First render
  renderList();
})();