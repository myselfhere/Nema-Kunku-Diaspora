// List page controller: loads expenditures, filters, stats, CSV, pager
import { api, getUser } from './nkd-bus.js';

const q = document.getElementById('q');
const yearSel = document.getElementById('year');
const catSel = document.getElementById('category');
const methodSel = document.getElementById('method');
const exportBtn = document.getElementById('exportBtn');

const tbody = document.getElementById('expTbody');
const pageInfo = document.getElementById('pageInfo');

const statCount = document.getElementById('statCount');
const statEUR = document.getElementById('statEUR');
const statGMD = document.getElementById('statGMD');
const statYearCount = document.getElementById('statYearCount');

const prev = document.getElementById('prev');
const next = document.getElementById('next');

const PAGE_SIZE = 15;
let all = [];
let filtered = [];
let page = 1;

// utils
const pad2 = n => String(n).padStart(2, '0');
const toDDMMYYYY = v => {
  try { const d = new Date(v); return `${pad2(d.getDate())}-${pad2(d.getMonth()+1)}-${d.getFullYear()}`; }
  catch { return ''; }
};
const money = (v, cur) => (cur === 'EUR' ? `€${Number(v||0).toFixed(2)}` : `D${Number(v||0).toFixed(2)}`);

function computeStats(list){
  statCount.textContent = list.length.toString();
  const eur = list.reduce((s,x)=> s + Number(x.amountEUR||0), 0);
  const gmd = list.reduce((s,x)=> s + Number(x.amountGMD||0), 0);
  statEUR.textContent = `€${eur.toFixed(2)}`;
  statGMD.textContent = `D${gmd.toFixed(2)}`;

  const y = yearSel.value;
  const yearCount = y ? list.filter(x => (new Date(x.date)).getFullYear() === Number(y)).length : list.length;
  statYearCount.textContent = yearCount.toString();
}

function render(){
  // filters
  const term = (q.value||'').toLowerCase().trim();
  const fy = yearSel.value;
  const fc = catSel.value;
  const fm = methodSel.value;

  filtered = all.filter(x=>{
    if (fy && new Date(x.date).getFullYear() !== Number(fy)) return false;
    if (fc && (x.category||'') !== fc) return false;
    if (fm && (x.method||'') !== fm) return false;
    if (!term) return true;
    const blob = [
      x.ref, x.payee, x.description, x.category, x.method, x.paidBy, x.project
    ].join(' ').toLowerCase();
    return blob.includes(term);
  });

  computeStats(filtered);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  page = Math.min(page, pages);

  const start = (page-1)*PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  tbody.innerHTML = rows.length ? rows.map(x=>`
    <tr>
      <td>${x.ref || ''}</td>
      <td>${toDDMMYYYY(x.date)}</td>
      <td>${x.payee || ''}</td>
      <td>${x.description || ''}</td>
      <td>${x.category || ''}</td>
      <td>${x.method || ''}</td>
      <td>${money(x.amountEUR,'EUR')}</td>
      <td>${money(x.amountGMD,'GMD')}</td>
      <td class="right">
        <a class="link" href="admin-expenditure-add.html?edit=${encodeURIComponent(x._id||'')}">Edit</a>
      </td>
    </tr>`).join('') : `<tr><td colspan="9" class="muted">No expenditures found.</td></tr>`;

  pageInfo.textContent = `Page ${page} of ${pages}`;
  prev.disabled = page<=1; next.disabled = page>=pages;
}

async function load(){
  try{
    // load all records
    const res = await api.get('/api/expenditures');
    all = Array.isArray(res) ? res : (res?.items || []);
  }catch{
    all = [];
  }
  // build years
  const years = [...new Set(all.map(x=> new Date(x.date).getFullYear()))].sort((a,b)=>b-a);
  yearSel.innerHTML = `<option value="">All years</option>` + years.map(y=>`<option>${y}</option>`).join('');
  render();
}

[q, yearSel, catSel, methodSel].forEach(el => el && el.addEventListener('input', ()=>{ page=1; render(); }));
prev && prev.addEventListener('click', ()=>{ if(page>1){ page--; render(); }});
next && next.addEventListener('click', ()=>{ page++; render(); });

// CSV export
exportBtn?.addEventListener('click', ()=>{
  const rows = [['Ref','Date','Payee','Description','Category','Method','Amount EUR','Amount GMD','Paid By','Project']];
  filtered.forEach(x=>{
    rows.push([
      x.ref||'', toDDMMYYYY(x.date), x.payee||'', x.description||'', x.category||'',
      x.method||'', Number(x.amountEUR||0).toFixed(2), Number(x.amountGMD||0).toFixed(2),
      x.paidBy||'', x.project||''
    ]);
  });
  const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'expenditures.csv'; a.click();
  URL.revokeObjectURL(url);
});

load();