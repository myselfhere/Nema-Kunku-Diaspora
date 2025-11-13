const BASE = "http://localhost:4000";
const TOKEN_KEY = "nkd_token";

export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export async function api(path, { method="GET", headers={}, body=null } = {}) {
  const h = { "Content-Type": "application/json", ...headers };
  const tok = getToken();
  if (tok) h.Authorization = `Bearer ${tok}`;

  const res = await fetch(`${BASE}${path}`, {
    method, headers: h, body: body ? JSON.stringify(body) : null,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}