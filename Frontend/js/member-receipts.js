// Frontend/js/member-receipts.js
import { api, getUser } from "./nkd-bus.js";

(async () => {
  console.log("[Member Receipts] Init…");

  const user = getUser();
  if (!user) {
    console.warn("No user logged in.");
    return;
  }

  const memberId = user.memberId;
  console.log("[Member Receipts] Logged member:", memberId);

  // UI elements
  const totalCountEl = document.getElementById("totalCount");
  const totalEurEl = document.getElementById("totalEur");
  const totalGmdEl = document.getElementById("totalGmd");
  const tbody = document.getElementById("receiptsTbody");

  try {
    // Fetch ONLY this member's receipts
    console.log(
      "[Member Receipts] → GET",
      `contributions?memberId=${memberId}&limit=500`
    );
    const res = await api.get(
      `contributions?memberId=${encodeURIComponent(memberId)}&limit=500`
    );

    const items = res?.items || [];
    console.log("[Member Receipts] Loaded:", items.length);

    // Totals
    let sumEUR = 0;
    let sumGMD = 0;

    items.forEach((c) => {
      sumEUR += Number(c.amountEUR || 0);
      sumGMD += Number(c.amountGMD || 0);
    });

    // Update totals
    totalCountEl.textContent = items.length;
    totalEurEl.textContent = `€${sumEUR.toFixed(2)}`;
    totalGmdEl.textContent = `D${sumGMD.toFixed(2)}`;

    // Populate table
    tbody.innerHTML = "";

    items.forEach((c) => {
      const tr = document.createElement("tr");

      const rec =
        c.receiptNumber && c.receiptNumber !== "Auto"
          ? c.receiptNumber
          : "-";

      const d = c.date ? new Date(c.date) : null;
      const dateStr = d
        ? `${String(d.getDate()).padStart(2, "0")}-${String(
            d.getMonth() + 1
          ).padStart(2, "0")}-${d.getFullYear()}`
        : "-";

      tr.innerHTML = `
        <td>${rec}</td>
        <td>${dateStr}</td>
        <td>${c.plan || "-"}</td>
        <td>${c.method || "-"}</td>
        <td>${c.confirmedBy || "-"}</td>
        <td>€${Number(c.amountEUR || 0).toFixed(2)}</td>
        <td>D${Number(c.amountGMD || 0).toFixed(2)}</td>
      `;

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("[Member Receipts] Error:", err);
  }
})();