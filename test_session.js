// Simple session test
const { Telegraf, session } = require("telegraf");

// Create a test bot instance
const bot = new Telegraf("test_token");

// Add session middleware
bot.use(session());

// Test session functionality
bot.on("text", async (ctx) => {
  const text = ctx.message.text;

  if (text === "/test") {
    // Initialize test session
    ctx.session.testData = {
      currentQuestion: 1,
      answers: [],
    };

    await ctx.reply(
      "Test session initialized. Send /answer to test answer handling."
    );
  } else if (text === "/answer") {
    if (!ctx.session.testData) {
      await ctx.reply("No test session found. Send /test first.");
      return;
    }

    // Simulate answer handling
    const currentQuestion = ctx.session.testData.currentQuestion;
    const answers = ctx.session.testData.answers;

    // Add a test answer
    answers.push("A");

    await ctx.reply(
      `Answer saved for question ${currentQuestion}. Total answers: ${answers.length}`
    );

    // Move to next question
    ctx.session.testData.currentQuestion++;

    if (ctx.session.testData.currentQuestion > 3) {
      await ctx.reply("Test completed!");
      delete ctx.session.testData;
    }
  } else if (text === "/status") {
    await ctx.reply(`Session status: ${JSON.stringify(ctx.session, null, 2)}`);
  }
});

console.log("Session test bot created. This is for testing purposes only.");
