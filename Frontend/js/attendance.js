/* Meeting Attendance — localStorage only
   Storage keys:
   - 'nkd_members'      : Array<Member>
   - 'nkd_meetings'     : Array<Meeting>
   - 'nkd_attendance'   : { [meetingId]: { [memberId]: { present: boolean, updatedAt: ISO } } }
*/

(function () {
  const meetingSelect = document.getElementById('meetingSelect');
  const meetingMeta   = document.getElementById('meetingMeta');
  const searchBox     = document.getElementById('searchBox');
  const membersTbody  = document.getElementById('membersTbody');
  const statTotal     = document.getElementById('statTotal');
  const statPresent   = document.getElementById('statPresent');
  const statAbsent    = document.getElementById('statAbsent');
  const msg           = document.getElementById('msg');

  const btnAllPresent = document.getElementById('markAllPresent');
  const btnAllAbsent  = document.getElementById('markAllAbsent');
  const btnSave       = document.getElementById('saveBtn');

  // Helpers
  const readLS  = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const writeLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  const toDDMMYYYY = (isoOrDate) => {
    if (!isoOrDate) return '—';
    const d = new Date(isoOrDate);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  let members   = readLS('nkd_members', []);     // expect objects with: memberId, name, country, position, etc.
  let meetings  = readLS('nkd_meetings', []);    // expect objects with: meetingId, type (GM/SM), dateISO, title, etc.
  let attendanceAll = readLS('nkd_attendance', {}); // keyed by meetingId

  // URL param ?meeting=MEETING_ID (optional deep link)
  const params = new URLSearchParams(window.location.search);
  const preselectMeetingId = params.get('meeting');

  // Populate meeting dropdown
  function renderMeetingOptions() {
    if (!Array.isArray(meetings)) meetings = [];
    meetingSelect.innerHTML = '';

    if (meetings.length === 0) {
      meetingSelect.innerHTML = `<option value="">No meetings found — create one in meeting.html</option>`;
      meetingMeta.textContent = '';
      return;
    }

    // Sort latest first by date
    meetings.sort((a, b) => new Date(b.dateISO || b.date) - new Date(a.dateISO || a.date));

    meetings.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.meetingId;
      const d = toDDMMYYYY(m.dateISO || m.date);
      opt.textContent = `${m.meetingId} — ${m.type || 'GM'} — ${d} ${m.title ? '— ' + m.title : ''}`;
      meetingSelect.appendChild(opt);
    });

    // Preselect if provided
    if (preselectMeetingId && meetings.some(m => m.meetingId === preselectMeetingId)) {
      meetingSelect.value = preselectMeetingId;
    }
    onMeetingChange();
  }

  function currentMeeting() {
    const id = meetingSelect.value;
    return meetings.find(m => m.meetingId === id);
  }

  function describeMeeting(m) {
    if (!m) return '';
    const when = toDDMMYYYY(m.dateISO || m.date);
    const t = (m.type || 'GM').toUpperCase();
    return `Type: ${t} · Date: ${when}${m.title ? ' · Title: ' + m.title : ''}`;
  }

  // Render members table for selected meeting
  function renderMembersTable() {
    membersTbody.innerHTML = '';
    const m = currentMeeting();
    if (!m) {
      updateStats();
      return;
    }

    const meetingId = m.meetingId;
    const aMap = attendanceAll[meetingId] || {};

    // Filter by search
    const q = (searchBox.value || '').trim().toLowerCase();
    const visible = members.filter(mem => {
      const name  = (mem.name || '').toLowerCase();
      const mid   = (mem.memberId || '').toLowerCase();
      const country = (mem.country || '').toLowerCase();
      return !q || name.includes(q) || mid.includes(q) || country.includes(q);
    });

    visible
      .sort((a, b) => (a.memberId || '').localeCompare(b.memberId || ''))
      .forEach(mem => {
        const tr = document.createElement('tr');

        const tdId = document.createElement('td');
        tdId.textContent = mem.memberId || '';
        tr.appendChild(tdId);

        const tdName = document.createElement('td');
        tdName.textContent = mem.name || '';
        tr.appendChild(tdName);

        const tdCountry = document.createElement('td');
        tdCountry.textContent = mem.country || '—';
        tr.appendChild(tdCountry);

        const tdPos = document.createElement('td');
        tdPos.textContent = mem.position || '—';
        tr.appendChild(tdPos);

        const tdPresent = document.createElement('td');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.dataset.memberId = mem.memberId;
        cb.checked = !!(aMap[mem.memberId]?.present);
        cb.addEventListener('change', updateStats);
        tdPresent.appendChild(cb);
        tr.appendChild(tdPresent);

        membersTbody.appendChild(tr);
      });

    updateStats();
  }

  function updateStats() {
    const checkboxes = membersTbody.querySelectorAll('input[type="checkbox"]');
    const total = checkboxes.length;
    let present = 0;
    checkboxes.forEach(cb => { if (cb.checked) present++; });
    const absent = total - present;

    statTotal.textContent = total;
    statPresent.textContent = present;
    statAbsent.textContent = absent;
  }

  function onMeetingChange() {
    const m = currentMeeting();
    meetingMeta.textContent = describeMeeting(m);
    renderMembersTable();
  }

  function markAll(val) {
    membersTbody.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = val);
    updateStats();
  }

  function saveAttendance() {
    const m = currentMeeting();
    if (!m) {
      flash('Please select a meeting first.', false);
      return;
    }
    const meetingId = m.meetingId;
    const aMap = attendanceAll[meetingId] || {};

    membersTbody.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      const id = cb.dataset.memberId;
      aMap[id] = { present: cb.checked, updatedAt: new Date().toJSON() };
    });

    attendanceAll[meetingId] = aMap;
    writeLS('nkd_attendance', attendanceAll);
    flash('Attendance saved successfully.', true);
  }

  function flash(text, ok) {
    msg.textContent = text;
    msg.style.padding = '10px 12px';
    msg.style.borderRadius = '6px';
    msg.style.marginTop = '10px';
    msg.style.background = ok ? '#e7f6ed' : '#fff3f3';
    msg.style.border = ok ? '1px solid #b9e0c6' : '1px solid #f0caca';
  }

  // Wire up
  meetingSelect.addEventListener('change', onMeetingChange);
  searchBox.addEventListener('input', renderMembersTable);
  btnAllPresent.addEventListener('click', () => markAll(true));
  btnAllAbsent.addEventListener('click',  () => markAll(false));
  btnSave.addEventListener('click', saveAttendance);

  // First load
  renderMeetingOptions();
})();