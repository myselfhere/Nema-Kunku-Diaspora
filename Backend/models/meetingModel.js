// Backend/models/meetingModel.js
import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
  {
    meetingId: {
      type: String, // e.g. GM-20250427-01
      unique: true,
    },

    date: {
      type: Date,
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    notes: {
      type: String,
      default: "",
    },

    // IDs of members who attended
    attendees: {
      type: [String], // memberId array, e.g. ["NKD001", "NKD002"]
      default: [],
    },

    // Optional: those marked absent
    absentees: {
      type: [String],
      default: [],
    },

    createdBy: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Auto-generate GM-yyyymmdd-XX if not provided
meetingSchema.pre("save", async function (next) {
  if (this.meetingId) return next();

  try {
    const d = this.date || new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const base = `GM-${yyyy}${mm}${dd}-`;

    const last = await mongoose
      .model("Meeting")
      .findOne({ meetingId: { $regex: `^${base}\\d+$` } })
      .sort({ meetingId: -1 })
      .lean();

    let nextNum = 1;

    if (last && last.meetingId) {
      const m = last.meetingId.match(/-(\d+)$/);
      if (m && m[1]) {
        nextNum = parseInt(m[1], 10) + 1;
      }
    }

    const padded = String(nextNum).padStart(2, "0");
    this.meetingId = base + padded;

    next();
  } catch (err) {
    next(err);
  }
});

const Meeting = mongoose.model("Meeting", meetingSchema);
export default Meeting;