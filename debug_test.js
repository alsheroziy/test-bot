// Debug script for testing session and answer handling
const mongoose = require("mongoose");
require("dotenv").config();

// Connect to database
mongoose.connect(process.env.MONGODB_URI);

// Import models
const Test = require("./src/models/Test");
const User = require("./src/models/User");

async function debugTest() {
  try {
    console.log("🔍 Debug test started...");

    // Check if there are any tests in the database
    const tests = await Test.find({ isActive: true });
    console.log("📊 Found tests:", tests.length);

    if (tests.length > 0) {
      const test = tests[0];
      console.log("📝 Test details:", {
        title: test.title,
        subject: test.subject,
        questionsCount: test.questions.length,
        questions: test.questions.map((q) => ({
          questionNumber: q.questionNumber,
          correctAnswer: q.correctAnswer,
        })),
      });
    }

    // Check users
    const users = await User.find();
    console.log("👥 Found users:", users.length);

    if (users.length > 0) {
      const user = users[0];
      console.log("👤 User details:", {
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        isAdmin: user.isAdmin,
        testResultsCount: user.testResults.length,
      });
    }

    console.log("✅ Debug test completed");
  } catch (error) {
    console.error("❌ Debug test error:", error);
  } finally {
    mongoose.disconnect();
  }
}

debugTest();
