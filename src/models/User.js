const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  telegramId: {
    type: Number,
    required: true,
    unique: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: false,
    default: "",
  },
  phoneNumber: {
    type: String,
    required: false,
    default: "",
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  currentTest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Test",
  },
  currentQuestionIndex: {
    type: Number,
    default: 0,
  },
  testResults: [
    {
      testId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Test",
      },
      score: Number,
      totalQuestions: Number,
      writtenAnswers: [
        {
          questionNumber: Number,
          userAnswer: String,
          isCorrect: Boolean,
          correctAnswer: String,
        },
      ],
      completedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
