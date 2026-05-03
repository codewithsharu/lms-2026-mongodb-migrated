const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password_hash: {
      type: String,
      default: null,
    },
    full_name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      default: null,
    },
    profile_photo: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'teacher', 'student'],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    last_login: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

userSchema.index({ email: 1, is_active: 1 });
userSchema.index({ role: 1, is_active: 1 });
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
