import mongoose from 'mongoose';

const BitcoinPriceSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      unique: true,
    },
    priceUsd: {
      type: Number,
    },
    priceEur: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('BitcoinPrice', BitcoinPriceSchema);

