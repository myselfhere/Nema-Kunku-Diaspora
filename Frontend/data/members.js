// /Frontend/data/members.js  (offline store – plain IIFE, no imports)
(function () {
  const LS_KEY = "nkd_members";

  function toDMY(date) {
    if (!date) return "";
    if (date instanceof Date && !isNaN(date)) {
      const dd = String(date.getDate()).padStart(2, "0");
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const yyyy = date.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    }
    const s = String(date);
    const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymd) return `${ymd[3]}-${ymd[2]}-${ymd[1]}`;
    const dmy = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    return dmy ? s : s;
  }
  function isDMY(s) { return /^(\d{2})-(\d{2})-(\d{4})$/.test(String(s || "")); }

  function seedEmptyMembers() {
    const out = [];
    for (let i = 1; i <= 65; i++) {
      const id = "NKD" + String(i).padStart(3, "0");
      out.push({
        memberId: id, name:"", email:"", phone:"", country:"",
        position:"Member", role:"member", contributionPlan:"",
        memberSince:"", contactMethod:"", totalPaidGMD:0,
        mustChangePassword:true,
      });
    }
    return out;
  }

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) {
        const seeded = seedEmptyMembers();
        localStorage.setItem(LS_KEY, JSON.stringify(seeded));
        return seeded;
      }
      const parsed = JSON.parse(raw);
      parsed.forEach(m => m.memberSince = toDMY(m.memberSince));
      return parsed;
    } catch (e) {
      const seeded = seedEmptyMembers();
      localStorage.setItem(LS_KEY, JSON.stringify(seeded));
      return seeded;
    }
  }
  function save(list) { localStorage.setItem(LS_KEY, JSON.stringify(list)); cache.list = list; }

  const cache = { list: load() };

  function findById(memberId){ return cache.list.find(m=>m.memberId===memberId)||null; }
  function upsert(member){
    if (member.memberSince) member.memberSince = toDMY(member.memberSince);
    const i = cache.list.findIndex(m=>m.memberId===member.memberId);
    if (i>=0) cache.list[i] = { ...cache.list[i], ...member };
    else cache.list.push(member);
    save(cache.list);
  }
  function remove(memberId){ save(cache.list.filter(m=>m.memberId!==memberId)); }
  function nextMemberId(){
    let max=0;
    cache.list.forEach(m=>{
      const n = Number(String(m.memberId||"").replace("NKD",""));
      if(!Number.isNaN(n)) max=Math.max(max,n);
    });
    return "NKD"+String(max+1).padStart(3,"0");
  }
  function backfillEmptyMemberSince(defaultDate="03-01-2018"){
    const updated = cache.list.map(m=>{
      const empty = !m.memberSince || String(m.memberSince).trim()==="";
      return empty ? { ...m, memberSince: defaultDate } : m;
    });
    save(updated);
    return updated.filter(m=>m.memberSince===defaultDate).length;
  }
  function normalizeYMDToDMY(){
    const updated = cache.list.map(m=>{
      const prev = m.memberSince;
      const fixed = toDMY(prev);
      return fixed!==prev ? { ...m, memberSince: fixed } : m;
    });
    save(updated);
    return true;
  }

  window.NKDMembers = {
    get list(){ return cache.list; },
    save, findById, upsert, remove, nextMemberId,
    backfillEmptyMemberSince, normalizeYMDToDMY, isDMY, toDMY,
  };
})();