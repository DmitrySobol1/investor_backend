import mongoose from 'mongoose';

const WalletAdressSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      
    },
    adress: {
      type: String,
    },
    
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('WalletAdress', WalletAdressSchema);

