// Backend/models/projectModel.js
import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    projectId: {
      type: String, // e.g. PRJ-0001
      unique: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["Planned", "Ongoing", "Completed", "On Hold", "Cancelled"],
      default: "Planned",
    },

    milestones: {
      type: String,
      default: "",
    },

    challenges: {
      type: String,
      default: "",
    },

    budgetEUR: {
      type: Number,
      default: 0,
    },

    budgetGMD: {
      type: Number,
      default: 0,
    },

    spentEUR: {
      type: Number,
      default: 0,
    },

    spentGMD: {
      type: Number,
      default: 0,
    },

    responsiblePerson: {
      type: String,
      default: "",
    },

    comments: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Auto-generate PRJ-0001, PRJ-0002, ...
projectSchema.pre("save", async function (next) {
  if (this.projectId) return next();

  try {
    const last = await mongoose
      .model("Project")
      .findOne({ projectId: { $regex: /^PRJ-\d+$/ } })
      .sort({ projectId: -1 })
      .lean();

    let nextNum = 1;

    if (last && last.projectId) {
      const m = last.projectId.match(/^PRJ-(\d+)$/);
      if (m && m[1]) {
        nextNum = parseInt(m[1], 10) + 1;
      }
    }

    const padded = String(nextNum).padStart(4, "0");
    this.projectId = "PRJ-" + padded;

    next();
  } catch (err) {
    next(err);
  }
});

const Project = mongoose.model("Project", projectSchema);
export default Project;