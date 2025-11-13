// admin-settings.js — Nema Kunku Diaspora System Settings
(() => {
  const $ = (s) => document.querySelector(s);
  const toast = (msg, type="ok") => {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.className = "toast" + (type === "error" ? " error" : "");
    el.style.display = "block";
    setTimeout(() => (el.style.display = "none"), 2500);
  };

  const DEFAULT_RATE = 75;

  async function loadRate() {
    try {
      // Try backend config
      const r = await fetch("/api/config");
      if (r.ok) {
        const j = await r.json();
        if (j?.eurToGmd) return Number(j.eurToGmd);
      }
    } catch {}
    // Try localStorage
    const stored = Number(localStorage.getItem("eurToGmd"));
    if (!isNaN(stored) && stored > 0) return stored;
    return DEFAULT_RATE;
  }

  async function saveRate(rate) {
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eurToGmd: rate }),
      });
    } catch {
      // Fallback: store locally
      localStorage.setItem("eurToGmd", String(rate));
    }
  }

  // ---- UI actions ----
  $("#saveBtn").addEventListener("click", async () => {
    const val = Number($("#eurToGmd").value);
    if (isNaN(val) || val <= 0) {
      toast("Please enter a valid rate.", "error");
      return;
    }
    await saveRate(val);
    toast(`Saved! €1 = D${val}`);
  });

  $("#resetBtn").addEventListener("click", async () => {
    $("#eurToGmd").value = DEFAULT_RATE;
    await saveRate(DEFAULT_RATE);
    toast(`Reset to default: €1 = D${DEFAULT_RATE}`);
  });

  // ---- Init ----
  (async () => {
    const rate = await loadRate();
    $("#eurToGmd").value = rate;
  })();
})();