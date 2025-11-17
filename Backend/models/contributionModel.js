// Backend/models/contributionModel.js
const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      unique: true,
    },

    date: {
      type: Date,
      required: true,
    },

    memberId: {
      type: String,
      required: true,
    },

    memberName: {
      type: String,
      required: true,
    },

    contributionPlan: {
      type: String,
      enum: ['Annually', 'Semi-annually', 'Quarterly', 'Monthly', 'Other'],
      default: 'Annually',
    },

    paymentMethod: {
      type: String,
      enum: ['Cash', 'Bank', 'Wave', 'Bizum', 'Other'],
      default: 'Cash',
    },

    amountEUR: {
      type: Number,
      required: true,
      default: 0,
    },

    amountGMD: {
      type: Number,
      required: true,
      default: 0,
    },

    yearsCovered: {
      type: [Number], // e.g. [2018, 2019, 2020]
      default: [],
    },

    position: {
      type: String,
      default: '',
    },

    confirmedBy: {
      type: String,
      default: '',
    },

    remarks: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

/**
 * Auto-generate receiptNumber like REC-0001, REC-0002, ...
 */
contributionSchema.pre('save', async function (next) {
  if (this.receiptNumber) return next();

  try {
    const last = await mongoose
      .model('Contribution')
      .findOne({ receiptNumber: { $regex: /^REC-\d+$/ } })
      .sort({ receiptNumber: -1 })
      .lean();

    let nextNum = 1;

    if (last && last.receiptNumber) {
      const m = last.receiptNumber.match(/^REC-(\d+)$/);
      if (m && m[1]) {
        nextNum = parseInt(m[1], 10) + 1;
      }
    }

    const padded = String(nextNum).padStart(4, '0');
    this.receiptNumber = 'REC-' + padded;

    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Contribution', contributionSchema);