import mongoose from 'mongoose';

const QuestionToSupportSchema = new mongoose.Schema(
  {
    user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
},
    question: {
      type: String,
    },
    isOperated: {
      type: Boolean,
      default: false
    }
       
    
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('QuestionToSupport', QuestionToSupportSchema);

