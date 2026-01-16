import mongoose from 'mongoose';

const DepositRqstSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    valute: {
      type: String,
    },
    cryptoCashCurrency: {
      type: String,
    },
    amount: {
      type: Number,
    },
    period: {
      type: Number,
    },
    riskPercent: {
      type: Number,
    },
    isOperated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('DepositRqst', DepositRqstSchema);
