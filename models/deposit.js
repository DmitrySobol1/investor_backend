import mongoose from 'mongoose';

const DepositSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    depositRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DepositRqst',
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
     amountInEur: {
      type: Number,
    },
     exchangeRate: {
      type: Number,
    },
    period: {
      type: Number,
    },
    date_until: {
      type: Date,
    },
    riskPercent: {
      type: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isRefunded: {
      type: Boolean,
      default: false
    },
    refundHistory: {
      type: [{
        date: { type: Date },
        value: { type: Number }
      }],
      default: []
    },
    isTimeToProlong: {
      type: Boolean,
      default: false
    },
    // когда пользователь выбрал действие, для продления портфеля (или отмены продления)
    isMadeActionToProlong: {
      type: Boolean,
      default: false
    },
    linkToDepositProlongation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DepositProlongation',
      default: null
    }
    
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Deposit', DepositSchema);
