const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  questionNumber: {
    type: Number,
    required: true,
  },
  questionType: {
    type: String,
    enum: ["multiple_choice", "written"],
    default: "multiple_choice",
    required: true,
  },
  correctAnswer: {
    type: Number,
    required: function () {
      return this.questionType === "multiple_choice";
    },
    min: 0,
    max: 7, // A-H harflari uchun (0-7)
  },
  variantCount: {
    type: Number,
    default: 4,
    min: 4,
    max: 8,
  },
  correctWrittenAnswer: {
    type: String,
    required: function () {
      return this.questionType === "written";
    },
    trim: true,
  },
  difficulty: {
    type: Number,
    default: 0.5, // 0-1 oralig'ida, 0.5 = o'rtacha qiyinlik
    min: 0,
    max: 1,
  },
});

const testSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  questions: [questionSchema],
  timeLimit: {
    type: Number, // minutes
    default: 30,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Test", testSchema);
