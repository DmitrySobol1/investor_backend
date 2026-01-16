import mongoose from 'mongoose';

const ChangePasswordRqstSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isOperated: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      default: 'new'
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('ChangePasswordRqst', ChangePasswordRqstSchema);
