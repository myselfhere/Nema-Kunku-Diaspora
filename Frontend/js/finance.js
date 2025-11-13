// js/finance.js
import { api } from './nkd-bus.js';

const $ = s => document.querySelector(s);
const money = (v, prefix='') => prefix + Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});

// ---- State
let FX = 75; // default €1 -> D75 (can be replaced by /settings)
let trendChart;

// ---- FX & Settings
async function loadFx(){
  try{
    const s = await api.get('/settings');
    if(s?.fxRate){ FX = Number(s.fxRate); }
  }catch{}
  $('#fxLabel').textContent = `€1 → D${FX}`;
}
$('#editFx')?.addEventListener('click', async ()=>{
  const x = prompt('Enter new FX (EUR → GMD)', FX);
  if(x && !isNaN(x)){
    FX = Number(x);
    $('#fxLabel').textContent = `€1 → D${FX}`;
    try{ await api.post('/settings', { fxRate: FX }); }catch{}
    applyFilters(); // refresh numbers with new fx if backend returns only one currency sometimes
  }
});

// ---- Filters
function getFilters(){
  return {
    from: $('#fFrom')?.value || '',
    to: $('#fTo')?.value || '',
    q: ($('#fQ')?.value || '').trim(),
    method: $('#fMethod')?.value || '',
    category: $('#fCat')?.value || '',
  };
}
$('#btnReset')?.addEventListener('click', ()=>{
  ['fFrom','fTo','fQ','fMethod','fCat'].forEach(id=>{ const el = $('#'+id); if(el) el.value=''; });
  applyFilters();
});
$('#btnApply')?.addEventListener('click', applyFilters);

// ---- Render helpers
function fill(tableSel, rows, emptySel){
  const tb = document.querySelector(`${tableSel} tbody`);
  if(!rows?.length){
    if(emptySel) $(emptySel).style.display='block';
    tb.innerHTML='';
    return;
  }
  if(emptySel) $(emptySel).style.display='none';
  tb.innerHTML = rows.map(r=>r).join('');
}
function tdRight(v){ return `<td class="right">${v}</td>`; }

// ---- Charts
function drawTrend(labels, inEUR, outEUR, inGMD, outGMD){
  const ctx = document.getElementById('trendChart');
  if(!ctx) return;
  if(trendChart){ trendChart.destroy(); }
  trendChart = new Chart(ctx, {
    type:'line',
    data:{
      labels,
      datasets:[
        { label:'Contrib EUR', data:inEUR, borderWidth:2, tension:.25 },
        { label:'Exp EUR', data:outEUR, borderWidth:2, tension:.25 },
        { label:'Contrib GMD', data:inGMD, borderWidth:2, tension:.25 },
        { label:'Exp GMD', data:outGMD, borderWidth:2, tension:.25 }
      ]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      scales:{ y:{ beginAtZero:true } },
      plugins:{ legend:{ position:'bottom' } }
    }
  });
}

// ---- Loaders
async function loadKPIs(params){
  try{
    const res = await api.get('/finance/summary', { params });
    // expected: { contribEUR, contribGMD, expEUR, expGMD, netEUR, netGMD, avgInEUR, avgInGMD, avgOutEUR, avgOutGMD }
    const d = res?.data || res || {};
    $('#kContribEUR').textContent = money(d.contribEUR, '€');
    $('#kContribGMD').textContent = money(d.contribGMD, 'D');
    $('#kExpEUR').textContent = money(d.expEUR, '€');
    $('#kExpGMD').textContent = money(d.expGMD, 'D');

    $('#sumNetEUR').textContent = money(d.netEUR, '€');
    $('#sumNetGMD').textContent = money(d.netGMD, 'D');
    $('#avgInEUR').textContent = money(d.avgInEUR, '€');
    $('#avgInGMD').textContent = money(d.avgInGMD, 'D');
    $('#avgOutEUR').textContent = money(d.avgOutEUR, '€');
    $('#avgOutGMD').textContent = money(d.avgOutGMD, 'D');
  }catch(e){ console.warn('summary fail', e); }
}

async function loadTrend(params){
  try{
    const res = await api.get('/finance/trend', { params });
    // expected: { labels:[], inEUR:[], outEUR:[], inGMD:[], outGMD:[] }
    const d = res?.data || res || {};
    drawTrend(d.labels||[], d.inEUR||[], d.outEUR||[], d.inGMD||[], d.outGMD||[]);
  }catch(e){ console.warn('trend fail', e); }
}

async function loadTopPayees(params){
  try{
    const res = await api.get('/expenditures/top-payees?limit=5', { params });
    const rows = (res?.data || res || []).map(p=>(
      `<tr>
        <td>${p.payee||'—'}</td>
        ${tdRight('€'+money(p.eur||0,''))}
        ${tdRight('D'+money(p.gmd||0,''))}
      </tr>`
    ));
    fill('#tblPayees', rows);
  }catch(e){ console.warn('payees fail', e); }
}

async function loadTopMembers(params){
  try{
    const res = await api.get('/contributions/top-members?limit=5', { params });
    const rows = (res?.data || res || []).map(m=>(
      `<tr>
        <td>${m.name||m.member||'—'}</td>
        ${tdRight('€'+money(m.eur||0,''))}
        ${tdRight('D'+money(m.gmd||0,''))}
      </tr>`
    ));
    fill('#tblTopMembers', rows);
  }catch(e){ console.warn('members fail', e); }
}

async function loadRecent(params){
  try{
    const res = await api.get('/finance/activity?limit=12', { params });
    const list = res?.data || res || [];
    if(!list.length){
      $('#recentEmpty').style.display='block';
      $('#tblRecent tbody').innerHTML='';
      return;
    }
    $('#recentEmpty').style.display='none';
    $('#tblRecent tbody').innerHTML = list.map(i=>`
      <tr>
        <td>${new Date(i.date).toLocaleDateString()}</td>
        <td>${i.type}</td>
        <td>${i.detail||''}</td>
        ${tdRight(i.amountEUR!=null?'€'+money(i.amountEUR,''):'—')}
        ${tdRight(i.amountGMD!=null?'D'+money(i.amountGMD,''):'—')}
      </tr>
    `).join('');
  }catch(e){ console.warn('recent fail', e); }
}

async function loadCat(params){
  try{
    const res = await api.get('/expenditures/by-category', { params });
    const rows = (res?.data || res || []).map(c=>(
      `<tr>
        <td>${c.category||'—'}</td>
        ${tdRight('€'+money(c.eur||0,''))}
        ${tdRight('D'+money(c.gmd||0,''))}
      </tr>`
    ));
    fill('#tblCat', rows);
  }catch(e){ console.warn('cat fail', e); }
}

// ---- Apply
async function applyFilters(){
  const f = getFilters();
  await Promise.all([
    loadFx(),
    loadKPIs(f),
    loadTrend(f),
    loadTopPayees(f),
    loadTopMembers(f),
    loadRecent(f),
    loadCat(f),
  ]);
}

// ---- Init
applyFilters();