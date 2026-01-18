import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    tlgid: {
      type: Number,
      required: true,
      unique: true,
    },
    jbid: {
      type: Number,
    },
    name: {
      type: String,
    },
    isSetPassword: {
      type: Boolean,
      default:false
    },
    password_hashed: {
      type : String
    },
    isFirstEnter : {
      type: Boolean,
      default : true
    },
    name: {
      type: String
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    username: {
      type: String,
      default: null
    },
    language: {
      type: String,
      default: 'de'
    }
    
    
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('User', UserSchema);

