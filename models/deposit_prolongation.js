import mongoose from 'mongoose';

const DepositProlongationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    linkToDeposit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deposit',
    },
    // действие для продления, которое выбрал
    actionToProlong: {
      type: String,
      enum: ['get_all_sum', 'get_part_sum', 'reinvest_all']
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
    isOperated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('DepositProlongation', DepositProlongationSchema);
