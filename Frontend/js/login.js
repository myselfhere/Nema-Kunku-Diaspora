// Frontend/js/login.js
import { loginOffline, redirectAfterLogin, setSession } from "./auth.js";
import { setToken } from "./nkd-api.js";

async function backendLogin(identifier, password) {
  const body = identifier.includes("@")
    ? { email: identifier, password }
    : { memberId: identifier, password };

  const res = await fetch("http://localhost:4000/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Login failed");

  // Save minimal session for the frontend (navbar/guards)
  setSession({
    memberId: data.user.memberId,
    name: data.user.name,
    role: data.user.role,
    email: data.user.email || "",
  });

  // Save JWT for API calls
  if (data.token) setToken(data.token);

  return data.user;
}

const emailEl = document.getElementById("email");
const passEl  = document.getElementById("password");
const btn     = document.getElementById("loginBtn");
const form    = document.getElementById("loginForm");

async function doLogin() {
  const id = (emailEl?.value || "").trim();
  const pw = (passEl?.value || "").trim();

  if (!id || !pw) {
    alert("Enter your email/member ID and password.");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Logging in…";
  try {
    // Try backend first
    const user = await backendLogin(id, pw);
    redirectAfterLogin(user);
  } catch (e) {
    // If backend rejects or is offline, try local offline auth
    const off = loginOffline({ loginId: id, password: pw });
    if (!off.ok) throw e; // bubble original backend error
    redirectAfterLogin(off.user);
  } finally {
    btn.disabled = false;
    btn.textContent = "Login";
  }
}

btn?.addEventListener("click", doLogin);

// Allow pressing Enter to submit
form?.addEventListener("submit", (e) => {
  e.preventDefault();
  doLogin();
});