const mongoose = require('mongoose');

const challengeOwnershipSchema = new mongoose.Schema(
  {
    challenge_id: {
      type: String,
      required: true,
      trim: true,
      index: true,
      unique: true,
    },
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    original_author_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    source_challenge_id: {
      type: String,
      default: null,
      trim: true,
    },
    is_public: {
      type: Boolean,
      default: false,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

challengeOwnershipSchema.index({ owner_id: 1, is_active: 1 });
challengeOwnershipSchema.index({ owner_id: 1, source_challenge_id: 1 });
challengeOwnershipSchema.index({ original_author_id: 1 });
challengeOwnershipSchema.index({ is_public: 1 });

module.exports = mongoose.model('ChallengeOwnership', challengeOwnershipSchema);
