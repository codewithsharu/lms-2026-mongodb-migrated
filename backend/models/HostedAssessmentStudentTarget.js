const mongoose = require('mongoose');

const hostedAssessmentStudentTargetSchema = new mongoose.Schema(
  {
    hosted_assessment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HostedAssessment',
      required: true,
    },
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

hostedAssessmentStudentTargetSchema.index(
  { hosted_assessment_id: 1, student_id: 1 },
  { unique: true }
);
hostedAssessmentStudentTargetSchema.index({ hosted_assessment_id: 1 });
hostedAssessmentStudentTargetSchema.index({ student_id: 1 });

module.exports = mongoose.model('HostedAssessmentStudentTarget', hostedAssessmentStudentTargetSchema);
