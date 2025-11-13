// Backend/utils/validate.js
export function requireFields(obj, fields) {
  const missing = fields.filter((f) => obj[f] === undefined || obj[f] === null || String(obj[f]).trim() === "");
  if (missing.length) throw new Error(`Missing required field(s): ${missing.join(", ")}`);
}

export function cleanDate(input) {
  // Accept YYYY-MM-DD or ISO; reject invalid
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date for memberSince (use YYYY-MM-DD).");
  return d;
}