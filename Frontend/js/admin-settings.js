// Frontend/js/admin-settings.js
// Admin Settings: connect to NKD backend + store FX rate

import { getApiBase, setApiBase, activeNav } from "./nkd-bus.js";

const FX_KEY = "nkd_fx_eur_to_gmd";

function loadFx() {
  try {
    const v = localStorage.getItem(FX_KEY);
    return v ? Number(v) : "";
  } catch {
    return "";
  }
}

function saveFx(rate) {
  localStorage.setItem(FX_KEY, String(rate));
}

document.addEventListener("DOMContentLoaded", () => {
  // Highlight Settings in nav
  activeNav("settings");

  const apiInput   = document.getElementById("apiBaseInput");
  const apiBtn     = document.getElementById("saveApiBaseBtn");
  const apiStatus  = document.getElementById("apiBaseStatus");

  const fxInput    = document.getElementById("eurToGmdInput");
  const fxSaveBtn  = document.getElementById("saveFxBtn");
  const fxResetBtn = document.getElementById("resetFxBtn");
  const fxStatus   = document.getElementById("fxStatus");

  // --- API BASE: load current value into input ---
  if (apiInput) {
    const currentBase = getApiBase();
    if (currentBase) apiInput.value = currentBase;
  }

  if (apiBtn && apiInput) {
    apiBtn.addEventListener("click", (e) => {
      e.preventDefault();

      const url = (apiInput.value || "").trim();
      if (!url) {
        alert("Please enter an API base URL first.");
        return;
      }

      // Very light validation
      if (!/^https?:\/\//i.test(url)) {
        if (!confirm("URL does not start with http/https. Save anyway?")) {
          return;
        }
      }

      setApiBase(url);

      console.log("[NKD] Saved API base:", url);
      if (apiStatus) {
        apiStatus.textContent = "API base URL saved ✅";
        apiStatus.className = "status-text ok";
      } else {
        alert("API base URL saved ✅");
      }
    });
  }

  // --- FX RATE: load saved rate ---
  if (fxInput) {
    const r = loadFx();
    if (r) fxInput.value = r;
  }

  if (fxSaveBtn && fxInput) {
    fxSaveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const val = Number(fxInput.value);
      if (!val || val <= 0) {
        alert("Please enter a valid EUR → GMD rate (number greater than 0).");
        return;
      }
      saveFx(val);
      console.log("[NKD] Saved FX rate EUR→GMD:", val);
      if (fxStatus) {
        fxStatus.textContent = "FX rate saved ✅";
        fxStatus.className = "status-text ok";
      } else {
        alert("FX rate saved ✅");
      }
    });
  }

  if (fxResetBtn && fxInput) {
    fxResetBtn.addEventListener("click", (e) => {
      e.preventDefault();
      fxInput.value = "";
      localStorage.removeItem(FX_KEY);
      if (fxStatus) {
        fxStatus.textContent = "FX rate cleared.";
        fxStatus.className = "status-text";
      } else {
        alert("FX rate cleared.");
      }
    });
  }
});