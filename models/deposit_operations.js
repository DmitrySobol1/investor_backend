import mongoose from 'mongoose';

const DepositOperationsSchema = new mongoose.Schema(
  {
    user_link: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    deposit_link: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deposit',
    },
     next_operation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DepositOperations',
      default: null
    },
    week_date_start: {
      type: Date,
    },
    week_date_finish: {
      type: Date,
    },
    week_start_amount: {
      type: Number,
    },
    week_finish_amount: {
      type: Number,
    },
    number_of_week: {
      type: Number,
    },
    profit_percent: {
      type: Number,
      default: 0
    },
    isFilled: {
      type: Boolean,
      default: false,
    },
    isRefundOperation : {
      type: Boolean,
      default: false
    },
    refund_value: {
      type: Number      
    }
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('DepositOperations', DepositOperationsSchema);
