import mongoose from 'mongoose';

const CryptoRateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      
    },
    value: {
      type: Number,
    },
    
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('CryptoRate', CryptoRateSchema);

