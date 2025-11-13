// Builds the admin topbar and wires session safely
import { getUser, clearUser, activeNav } from './nkd-bus.js';

(function initTopbar(){
  const u = getUser();

  // HTML scaffold (no auto-redirect; just renders)
  const html = `
  <header class="admin-topbar">
    <div class="container row">
      <button class="menu-toggle" aria-label="Menu">☰</button>

      <nav class="admin-nav" id="adminNav">
        <a href="admin-dashboard.html" data-key="dashboard">Dashboard</a>
        <a href="admin-members.html" data-key="members">Members</a>
        <a href="admin-contributions.html" data-key="contributions">Contributions</a>
        <a href="admin-expenditures.html" data-key="expenditures">Expenditures</a>
        <a href="admin-projects.html" data-key="projects">Projects</a>
        <a href="admin-meetings.html" data-key="meetings">Meetings</a>
        <a href="admin-settings.html" data-key="settings">Settings</a>
      </nav>

      <div class="admin-user">
        <span data-user-slot>${u?.name || 'Member'} • <strong>${u?.role || 'member'}</strong></span>
        <a href="#" id="logoutLink">Logout</a>
      </div>
    </div>
  </header>`;

  // If page already has a topbar container, replace it; else prepend
  const existing = document.querySelector('.admin-topbar');
  if (existing) existing.outerHTML = html;
  else document.body.insertAdjacentHTML('afterbegin', html);

  // Mobile toggle
  const btn = document.querySelector('.menu-toggle');
  const nav = document.getElementById('adminNav');
  if (btn && nav) btn.addEventListener('click', () => nav.classList.toggle('active'));

  // Active item
  activeNav(location.pathname || location.href);

  // Role-based visibility (hide Members/Contrib/etc for non-admin if you want)
  if ((u?.role || '').toLowerCase() !== 'admin') {
    // Example: keep everything visible but you can disable:
    // ['admin-members.html','admin-contributions.html','admin-expenditures.html','admin-projects.html','admin-meetings.html','admin-settings.html']
    //   .forEach(h => [...document.querySelectorAll(`.admin-nav a[href="${h}"]`)].forEach(a=>a.remove()));
  }

  // Logout
  const l = document.getElementById('logoutLink');
  if (l) l.addEventListener('click', (e) => {
    e.preventDefault();
    clearUser();
    location.href = 'login.html';
  });

  // If you want HARD protection on admin pages, uncomment:
  // const needAdmin = /admin-/.test(location.pathname);
  // if (!u && needAdmin) location.href = 'login.html';
})();