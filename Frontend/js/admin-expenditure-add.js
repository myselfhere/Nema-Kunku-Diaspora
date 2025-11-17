// Frontend/js/admin-expenditure-add.js
import {
  api,
  getUser,
  toYYYYMMDD,
  fmtEUR,
  fmtGMD,
  toast,
} from "./nkd-bus.js";

(() => {
  const u = getUser();

  // --- User pill + nav ---
  const slot = document.querySelector("[data-user-slot]");
  if (slot) {
    const name = u && u.name ? u.name : "Offline Admin";
    const role = u && u.role ? u.role : "admin";
    slot.textContent = name + " • " + role;
  }
  const btn = document.querySelector(".menu-toggle");
  const nav = document.getElementById("adminNav");
  if (btn && nav) {
    btn.addEventListener("click", () => nav.classList.toggle("active"));
  }

  // --- Form + fields (make sure IDs match your HTML) ---
  const form          = document.getElementById("expenditureForm") || document.querySelector("form");
  const dateInput     = document.getElementById("dateInput");
  const refInput      = document.getElementById("refInput");
  const payeeInput    = document.getElementById("payeeInput");
  const contactInput  = document.getElementById("contactInput");
  const categorySelect= document.getElementById("categorySelect");
  const methodSelect  = document.getElementById("methodSelect");
  const amountEur     = document.getElementById("amountEur");
  const amountGmd     = document.getElementById("amountGmd");
  const rateInput     = document.getElementById("rateInput");
  const paidByInput   = document.getElementById("paidByInput");
  const descInput     = document.getElementById("descriptionInput");
  const commentsInput = document.getElementById("commentsInput");
  const autoConvert   = document.getElementById("autoConvertCheckbox");

  // --- Defaults: today + rate 75 if empty ---
  if (dateInput && !dateInput.value) {
    // if it's a text dd/mm/yyyy, we just leave placeholder;
    // if it's type="date", fill with today in YYYY-MM-DD
    if (dateInput.type === "date") {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, "0");
      const d = String(today.getDate()).padStart(2, "0");
      dateInput.value = `${y}-${m}-${d}`;
    }
  }
  if (rateInput && !rateInput.value) {
    rateInput.value = "75";
  }
  if (refInput && !refInput.value) {
    refInput.value = "Auto";
  }

  // --- Auto convert between EUR and GMD ---
  function getRate() {
    const r = parseFloat(rateInput && rateInput.value ? rateInput.value : "75");
    return isNaN(r) || r <= 0 ? 75 : r;
  }

  function convertFromEur() {
    if (!autoConvert || !autoConvert.checked) return;
    if (!amountEur) return;
    const eur = parseFloat(amountEur.value || "0");
    if (isNaN(eur)) return;
    const gmd = eur * getRate();
    if (amountGmd) amountGmd.value = Math.round(gmd);
  }

  function convertFromGmd() {
    if (!autoConvert || !autoConvert.checked) return;
    if (!amountGmd) return;
    const gmd = parseFloat(amountGmd.value || "0");
    if (isNaN(gmd) || getRate() === 0) return;
    const eur = gmd / getRate();
    if (amountEur) amountEur.value = eur.toFixed(2);
  }

  if (amountEur) {
    amountEur.addEventListener("input", convertFromEur);
  }
  if (amountGmd) {
    amountGmd.addEventListener("input", convertFromGmd);
  }
  if (rateInput) {
    rateInput.addEventListener("input", () => {
      // re-run conversion when rate changes
      convertFromEur();
    });
  }

  // --- Build payload for backend ---
  function buildPayload() {
    // date may be dd/mm/yyyy or yyyy-mm-dd
    let rawDate = dateInput ? dateInput.value.trim() : "";
    let dateIso = "";

    if (rawDate) {
      if (rawDate.includes("/")) {
        // dd/mm/yyyy → yyyy-mm-dd
        const parts = rawDate.split("/");
        if (parts.length === 3) {
          const d = parts[0];
          const m = parts[1];
          const y = parts[2];
          rawDate = `${y}-${m}-${d}`;
        }
      }
      dateIso = toYYYYMMDD(rawDate);
    }

    const rate = getRate();

    const payload = {
      date: dateIso || null,
      referenceNumber: refInput ? refInput.value.trim() : "",
      payee: payeeInput ? payeeInput.value.trim() : "",
      payerContact: contactInput ? contactInput.value.trim() : "",
      category: categorySelect ? categorySelect.value : "",
      paymentMethod: methodSelect ? methodSelect.value : "",
      amountEUR: amountEur ? parseFloat(amountEur.value || "0") : 0,
      amountGMD: amountGmd ? parseFloat(amountGmd.value || "0") : 0,
      rate: rate,
      paidBy: paidByInput ? paidByInput.value.trim() : (u && (u.name || u.email)) || "",
      description: descInput ? descInput.value.trim() : "",
      comments: commentsInput ? commentsInput.value.trim() : "",
      createdBy: u && u.email ? u.email : "",
    };

    // If user left referenceNumber as "Auto", let backend auto-generate
    if (
      typeof payload.referenceNumber === "string" &&
      payload.referenceNumber.trim().toLowerCase() === "auto"
    ) {
      payload.referenceNumber = undefined;
    }

    return payload;
  }

  // --- Basic validation ---
  function validate(payload) {
    if (!payload.date) {
      alert("Please select a date.");
      return false;
    }
    if (!payload.payee) {
      alert("Please enter who was paid (Payee).");
      return false;
    }
    if (!payload.paymentMethod) {
      alert("Please select a payment method.");
      return false;
    }
    if (!payload.amountEUR && !payload.amountGMD) {
      alert("Please enter an amount (EUR or GMD).");
      return false;
    }
    return true;
  }

  // --- Submit handler ---
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = buildPayload();
      if (!validate(payload)) return;

      try {
        await api.post("expenditures", payload);
        toast("Expenditure recorded", "ok");
        // Back to list
        setTimeout(() => {
          window.location.href = "admin-expenditures.html";
        }, 600);
      } catch (err) {
        console.error("Save expenditure error:", err);
        toast("Failed to save expenditure", "error");
      }
    });
  }
})();