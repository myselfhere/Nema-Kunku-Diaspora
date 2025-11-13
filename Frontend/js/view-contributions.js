/* NKD — View Contributions (API → LocalStorage fallback)
   Query string:
     - ?memberId=NKD###  (preferred)
     - ?member=NKD###
   LocalStorage keys used:
     - nkd_members
     - nkd_contributions
*/

import { api, getUser, clearUser } from './nkd-bus.js';

const LS_MEMBERS = 'nkd_members';
const LS_CONTRIB = 'nkd_contributions';

const $ = (id) => document.getElementById(id);
const pad2 = (n) => String(n).padStart(2, '0');

function ddmmyyyy(v) {
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

function loadLS(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}
function fmtEUR(v){ return `€${Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function fmtGMD(v){ return `D${Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`; }

function getMemberLabel(memberId) {
  const members = loadLS(LS_MEMBERS);
  const m = members.find(x => (x.memberId||'').toUpperCase() === memberId.toUpperCase());
  return m ? `${m.name} (${memberId})` : memberId;
}

function setHeader(memberId){
  $('memberTitle').textContent = `Member: ${getMemberLabel(memberId)}`;
}

/* Load contributions for a member (API first, then LS) */
async function loadContributions(memberId){
  let list = [];
  try {
    // do not auto-redirect on 401; allow LS mode
    const res = await api(`/contributions?memberId=${encodeURIComponent(memberId)}`, {}, { redirectOn401:false });
    if (!res.ok) throw new Error('api failed');
    const json = await res.json();
    list = Array.isArray(json) ? json : (json.items || []);
  } catch {
    const ls = loadLS(LS_CONTRIB);
    list = ls.filter(c => ((c.memberId || c.member || '').toUpperCase() === memberId.toUpperCase()));
  }

  // Normalize → sort desc by date
  list = list.map(c => ({
    date: ddmmyyyy(c.date || c.datePaid || c.paidOn),
    member: c.member || c.memberId || '',
    receipt: c.receipt || c.receiptNo || c.receiptNumber || '',
    amountEUR: Number(c.amountEUR ?? c.amount_eur ?? c.amountEur ?? c.amount ?? 0),
    amountGMD: Number(c.amountGMD ?? c.amount_gmd ?? c.amountGmd ?? 0),
    plan: c.plan || c.contributionPlan || '',
    method: c.paymentMethod || c.method || '',
    confirmedBy: c.confirmedBy || c.confirmed_by || '',
    remarks: c.note || c.remarks || c.remark || ''
  })).sort((a,b) => {
    const toIso = s => s ? `${s.slice(6,10)}-${s.slice(3,5)}-${s.slice(0,2)}` : '';
    return toIso(b.date).localeCompare(toIso(a.date));
  });

  renderTable(memberId, list);
}

function renderTable(memberId, rows){
  const tbody = $('contributionTableBody');

  if (!rows.length){
    tbody.innerHTML = `<tr><td colspan="9">No contributions found.</td></tr>`;
    return;
  }

  // Map member ID to display "Name (ID)"
  const memberLabel = getMemberLabel(memberId);

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.date || ''}</td>
      <td>${memberLabel}</td>
      <td>${r.receipt || ''}</td>
      <td class="num">${fmtEUR(r.amountEUR)}</td>
      <td class="num">${fmtGMD(r.amountGMD)}</td>
      <td>${r.plan || ''}</td>
      <td>${r.method || ''}</td>
      <td>${r.confirmedBy || ''}</td>
      <td>${r.remarks || ''}</td>
    </tr>
  `).join('');
}

/* CSV export of the visible table */
function exportCsv(){
  const table = $('contributionTableBody').closest('table');
  const rows = [...table.querySelectorAll('tr')];
  const extract = els => [...els].map(td => `"${(td.textContent||'').replace(/"/g,'""')}"`).join(',');

  const header = extract(table.querySelectorAll('thead th'));
  const body = rows.map(r => extract(r.querySelectorAll('td'))).join('\n');
  const csv = [header, body].filter(Boolean).join('\n');

  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'contribution-history.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* Init */
(function init(){
  const qs = new URLSearchParams(window.location.search);
  const memberId = (qs.get('memberId') || qs.get('member') || '').toUpperCase();

  if (!memberId){
    alert('Missing memberId');
    window.history.back();
    return;
  }

  setHeader(memberId);
  loadContributions(memberId);

  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink){
    logoutLink.addEventListener('click', (e)=>{
      e.preventDefault();
      clearUser();
      localStorage.removeItem('nkd_token');
      window.location.href = 'login.html';
    });
  }

  document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);

  if (!getUser()){
    // Local/demo mode (allowed): just log for clarity
    console.log('NKD view-contributions: running without login (LocalStorage mode).');
  }
})();