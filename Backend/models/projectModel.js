// Backend/models/projectModel.js
import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      unique: true,
      required: true,
      match: /^PRJ-\d{4}$/,
    },
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["planned", "active", "on-hold", "completed", "cancelled"],
      default: "planned",
    },
    startDate: { type: Date },
    endDate: { type: Date },
    description: { type: String, trim: true },
    milestones: { type: String, trim: true },
    challenges: { type: String, trim: true },
    budget: {
      eur: { type: Number, default: 0 },
      gmd: { type: Number, default: 0 },
    },
    expenditure: {
      eur: { type: Number, default: 0 },
      gmd: { type: Number, default: 0 },
    },
    responsible: { type: String, trim: true },
    comments: { type: String, trim: true },
  },
  { timestamps: true }
);

const Project = mongoose.model("Project", projectSchema);
export default Project;