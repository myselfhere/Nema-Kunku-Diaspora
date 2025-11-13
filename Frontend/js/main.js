// main.js

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');

  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const emailOrMemberId = document.getElementById('emailOrMemberId').value;
    const password = document.getElementById('password').value;

    try {
      const response = await fetch('https://nema-kunku-diaspora.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrMemberId, password })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || 'Login failed');
        return;
      }

      alert('Login successful!');

      // Redirect based on role (admin/member)
      if (data.member.role === 'admin') {
        window.location.href = 'admin-dashboard.html';
      } else {
        window.location.href = 'member-dashboard.html';
      }

    } catch (error) {
      console.error('Login error:', error);
      alert('An error occurred. Please try again.');
    }
  });
});
