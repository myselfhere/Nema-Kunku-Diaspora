// Frontend/js/nkd-auth.js
// Auth helpers: login, change password (logged-in), reset (admin → member)

import { api } from "./nkd-bus.js";

/* ---------------- CHANGE PASSWORD (LOGGED-IN MEMBER) -------------- */
/**
 * changePassword
 *  - identifier: email OR memberId (e.g. "salmeture@gmail.com" or "NKD001")
 *  - currentPassword: the old password (for verification)
 *  - newPassword: new password string
 *
 * Backend: POST /api/auth/change-password
 * body: { identifier, currentPassword, newPassword }
 */
export async function changePassword(identifier, currentPassword, newPassword) {
  if (!identifier) throw new Error("identifier is required");
  if (!currentPassword) throw new Error("Current password required");
  if (!newPassword || newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters.");
  }

  const body = { identifier, currentPassword, newPassword };
  return api.post("/auth/change-password", body);
}

/* ---------------- START RESET (ADMIN TRIGGER) ---------------- */
/**
 * startReset
 *  Admin calls this with the member's **_id** or memberId (NKD001).
 *
 *  Example from admin UI:
 *    const r = await startReset(member._id);
 *    console.log(r.token); // send via WhatsApp
 *
 * Backend: POST /api/members/:id/reset
 * (route has been updated to accept either Mongo _id or memberId)
 */
export async function startReset(memberIdOrObjectId) {
  if (!memberIdOrObjectId) throw new Error("Member ID required");
  return api.post(
    `/members/${encodeURIComponent(memberIdOrObjectId)}/reset`,
    {}
  );
}

/* ---------------- FINISH RESET (MEMBER WITH TOKEN) ------------- */
/**
 * finishReset
 *  Member opens link: change-password.html?token=XYZ
 *  This sends token + new password to:
 *    POST /api/members/reset/confirm
 *  body: { token, newPassword }
 */
export async function finishReset(token, newPassword) {
  if (!token) throw new Error("Reset token missing");
  if (!newPassword || newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters.");
  }

  return api.post("/members/reset/confirm", { token, newPassword });
}