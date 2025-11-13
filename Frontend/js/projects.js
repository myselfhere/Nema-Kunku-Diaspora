const token = localStorage.getItem("nkd_token");
if (!token) {
  alert("Please log in.");
  window.location.href = "login.html";
}

function logout() {
  localStorage.removeItem("nkd_token");
  window.location.href = "login.html";
}

const form = document.getElementById("projectForm");
const tableBody = document.getElementById("projectTableBody");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    name: document.getElementById("name").value,
    description: document.getElementById("description").value,
    status: document.getElementById("status").value,
    startDate: document.getElementById("startDate").value,
    endDate: document.getElementById("endDate").value,
    milestones: document.getElementById("milestones").value.split(",").map(m => m.trim()),
    challenges: document.getElementById("challenges").value.split(",").map(c => c.trim()),
    budgetGMD: parseFloat(document.getElementById("budgetGMD").value) || 0,
    budgetEUR: parseFloat(document.getElementById("budgetEUR").value) || 0,
    expenditureGMD: parseFloat(document.getElementById("expenditureGMD").value) || 0,
    expenditureEUR: parseFloat(document.getElementById("expenditureEUR").value) || 0,
    responsible: document.getElementById("responsible").value,
    comments: document.getElementById("comments").value
  };

  const res = await fetch("https://nema-kunku-diaspora.onrender.com/api/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  if (res.ok) {
    alert("Project saved");
    form.reset();
    loadProjects();
  } else {
    alert("Failed to save project");
  }
});

async function loadProjects() {
  const res = await fetch("https://nema-kunku-diaspora.onrender.com/api/projects", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await res.json();
  tableBody.innerHTML = "";

  data.forEach(p => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.projectId}</td>
      <td>${p.name}</td>
      <td>${p.status}</td>
      <td>${new Date(p.startDate).toLocaleDateString()}</td>
      <td>${new Date(p.endDate).toLocaleDateString()}</td>
      <td>${p.budgetGMD}</td>
      <td>${p.budgetEUR}</td>
      <td>${p.responsible}</td>
    `;
    tableBody.appendChild(row);
  });
}

loadProjects();
