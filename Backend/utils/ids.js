// utils/ids.js
// Helpers to generate sequential, human-friendly IDs

// Generic incrementer: finds last doc with the given prefix and
// returns prefix + next 4-digit number (e.g., REC-0001 → REC-0002)
async function nextSequentialId(Model, prefix, field = "reference") {
  const re = new RegExp(`^${prefix}-\\d{4}$`);
  const last = await Model.findOne({ [field]: re })
    .sort({ createdAt: -1 })
    .select(field)
    .lean();

  let n = 1;
  if (last && last[field]) {
    const m = last[field].match(/(\d{4})$/);
    if (m) n = parseInt(m[1], 10) + 1;
  }
  return `${prefix}-${String(n).padStart(4, "0")}`;
}

/* -------------------------------------------
 * Members  (NKD### e.g., NKD001)
 * ----------------------------------------- */
export async function nextMemberId(MemberModel) {
  const last = await MemberModel
    .findOne({ memberId: /^NKD\d{3}$/ })
    .sort({ createdAt: -1 })
    .select("memberId")
    .lean();

  let n = 1;
  if (last && last.memberId) {
    const m = last.memberId.match(/(\d{3})$/);
    if (m) n = parseInt(m[1], 10) + 1;
  }
  return `NKD${String(n).padStart(3, "0")}`;
}

/* -------------------------------------------
 * Contributions  (REC-0001, REC-0002, …)
 * ----------------------------------------- */
export async function nextReceiptId(ContributionModel) {
  return nextSequentialId(ContributionModel, "REC", "receiptNumber");
}

/* -------------------------------------------
 * Expenditures  (EXP-0001, EXP-0002, …)
 * ----------------------------------------- */
export async function nextExpenditureId(ExpenditureModel) {
  return nextSequentialId(ExpenditureModel, "EXP", "referenceNumber");
}

/* -------------------------------------------
 * Projects  (PRJ-0001, PRJ-0002, …)
 * ----------------------------------------- */
export async function nextProjectId(ProjectModel) {
  return nextSequentialId(ProjectModel, "PRJ", "projectId");
}

/* -------------------------------------------
 * Meetings  (GM-YYYYMMDD-01, -02, …)
 * ----------------------------------------- */
export async function nextMeetingId(MeetingModel, date = new Date()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const base = `GM-${y}${m}${day}-`;

  const last = await MeetingModel
    .findOne({ meetingId: new RegExp(`^${base}\\d{2}$`) })
    .sort({ createdAt: -1 })
    .select("meetingId")
    .lean();

  let n = 1;
  if (last && last.meetingId) {
    const m2 = last.meetingId.match(/(\d{2})$/);
    if (m2) n = parseInt(m2[1], 10) + 1;
  }
  return `${base}${String(n).padStart(2, "0")}`;
}