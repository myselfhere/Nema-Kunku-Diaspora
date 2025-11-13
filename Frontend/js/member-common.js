// Frontend/js/member-common.js
import { get } from "./nkd-bus.js";

export const $  = (sel) => document.querySelector(sel);

export function getParam(name, fallback = "") {
  const u = new URL(location.href);
  return u.searchParams.get(name) || fallback;
}

export function money(v, sym = "€") {
  return `${sym}${Number(v || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export async function fetchMember(memberId) {
  try {
    const r = await get(`/members?q=${encodeURIComponent(memberId)}&limit=1`);
    const item = (r?.items || r?.data || [])[0];
    if (item) return item;
  } catch {}
  return get(`/members/${encodeURIComponent(memberId)}`);
}

export async function fetchAttendance(memberId) {
  try {
    const r = await get(`/meetings/attendance?memberId=${encodeURIComponent(memberId)}`);
    if (Array.isArray(r)) return r;
    if (Array.isArray(r?.items)) return r.items;
  } catch {}
  try {
    const r = await get(`/attendance?memberId=${encodeURIComponent(memberId)}`);
    if (Array.isArray(r)) return r;
    if (Array.isArray(r?.items)) return r.items;
  } catch {}
  return [];
}

export async function fetchContributions(memberId) {
  try {
    const r = await get(`/contributions?memberId=${encodeURIComponent(memberId)}`);
    if (Array.isArray(r)) return r;
    if (Array.isArray(r?.items)) return r.items;
  } catch {}
  return [];
}