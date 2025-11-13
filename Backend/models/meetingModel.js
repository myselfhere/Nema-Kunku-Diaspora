// models/meetingModel.js
import mongoose from "mongoose";

const attendeeSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
    memberId: String,            // e.g., "NKD001" (denormalized for quick reads)
    name: String,                // denormalized name at time of meeting
    present: { type: Boolean, default: false },
    remarks: String,
  },
  { _id: false }
);

const meetingSchema = new mongoose.Schema(
  {
    meetingId: { type: String, unique: true, index: true }, // GM-YYYYMMDD-01
    date: { type: Date, required: true },
    type: {
      type: String,
      enum: ["general", "emergency", "special"],
      default: "general",
    },
    topic: { type: String, default: "" },
    location: { type: String, default: "" },
    status: {
      type: String,
      enum: ["scheduled", "held", "cancelled"],
      default: "scheduled",
    },
    notes: { type: String, default: "" },

    // attendance
    attendees: [attendeeSchema],

    // admin metadata
    createdBy: { type: String, default: "" }, // e.g., memberId / name
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Meeting", meetingSchema);