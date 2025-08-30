const { Telegraf, session } = require("telegraf");
const { Markup } = require("telegraf");
require("dotenv").config();

const connectDB = require("./config/database");
const { authMiddleware, adminMiddleware } = require("./middleware/auth");
const UserController = require("./controllers/userController");
const TestController = require("./controllers/testController");
const AdminController = require("./controllers/adminController");
const { mainMenu } = require("./utils/keyboards");

// Bot yaratish
const bot = new Telegraf(process.env.BOT_TOKEN);

// Session middleware
bot.use(session());

// Auth middleware
bot.use(authMiddleware);

// Start command
bot.start(async (ctx) => {
  const user = ctx.state.user;

  if (!user.phoneNumber) {
    await UserController.startRegistration(ctx);
  } else {
    await ctx.reply(
      `Xush kelibsiz, ${user.firstName}! 👋\n\n` +
        "Test botiga xush kelibsiz. Quyidagi funksiyalardan birini tanlang:",
      mainMenu
    );
  }
});

// Admin command
bot.command("admin", adminMiddleware, async (ctx) => {
  await AdminController.showAdminMenu(ctx);
});

// Registration handlers
bot.on("text", async (ctx) => {
  const session = ctx.session;

  // Registration flow
  if (session?.registrationStep === "firstName") {
    await UserController.handleFirstName(ctx);
    return;
  }

  if (session?.registrationStep === "lastName") {
    await UserController.handleLastName(ctx);
    return;
  }

  if (session?.registrationStep === "phoneNumber") {
    await UserController.handlePhoneNumber(ctx);
    return;
  }

  // Admin test creation flow
  if (session?.creatingTest) {
    await handleAdminTestCreation(ctx);
    return;
  }

  // Admin fan qo'shish flow
  if (session?.addingSubject) {
    await AdminController.handleSubjectName(ctx);
    return;
  }

  // Test taking flow
  if (session?.currentTest) {
    console.log("Test flow triggered, session state:", {
      hasCurrentTest: !!session.currentTest,
      currentQuestionIndex: session.currentQuestionIndex,
      hasUserAnswers: !!session.userAnswers,
      userAnswersLength: session.userAnswers ? session.userAnswers.length : 0,
    });
    await handleTestFlow(ctx);
    return;
  }

  // Main menu handlers
  const text = ctx.message.text;

  switch (text) {
    case "📝 Test yechish":
      await TestController.showSubjects(ctx);
      break;

    case "📊 Natijalarim":
      await TestController.showUserResults(ctx);
      break;

    case "ℹ️ Yordam":
      await UserController.showHelp(ctx);
      break;

    case "🔙 Asosiy menyu":
      // Admin panelida asosiy menyuga qaytish
      if (ctx.state.user && ctx.state.user.isAdmin) {
        await AdminController.showAdminMenu(ctx);
      } else {
        await ctx.reply("Asosiy menyu:", mainMenu);
      }
      break;

    case "🔙 Orqaga":
      // Context-aware back button
      await handleBackButton(ctx);
      break;

    case "🏠 Bosh menyu":
      await ctx.reply("Asosiy menyu:", mainMenu);
      break;

    case "📚 Fanlar ro'yxati":
      await AdminController.showSubjectsList(ctx);
      break;

    case "📚 Fan qo'shish":
      await AdminController.startAddSubject(ctx);
      break;

    case "➕ Yangi test qo'shish":
      await AdminController.startCreateTest(ctx);
      break;

    case "📋 Testlar ro'yxati":
      await AdminController.showTestsList(ctx);
      break;

    case "👥 Foydalanuvchilar":
      await AdminController.showUsers(ctx);
      break;

    case "📊 Umumiy statistika":
      await AdminController.showStatistics(ctx);
      break;

    case "📄 Natijalarni yuklash":
      await AdminController.downloadTestResultsPDF(ctx);
      break;

    case "📊 Natijani ko'rish":
      await TestController.showDetailedResults(ctx);
      break;

    case "📊 Natijani ko'rish":
      await TestController.showDetailedResults(ctx);
      break;

    default:
      // Start test - bu eng yuqori darajada tekshirilishi kerak
      if (text === "✅ Testni boshlash") {
        await TestController.beginTest(ctx);
        return;
      }

      // Answer selection - test yechish jarayonida
      if (
        [
          "A",
          "B",
          "C",
          "D",
          "E",
          "F",
          "G",
          "H",
          "⏭️ O'tkazib yuborish",
        ].includes(text)
      ) {
        await TestController.handleAnswer(ctx);
        return;
      }

      // Yozma javob - test yechish jarayonida
      if (session?.currentTest && session?.currentQuestionIndex !== undefined) {
        await TestController.handleAnswer(ctx);
        return;
      }

      // Admin test creation - bu eng yuqori darajada tekshirilishi kerak
      if (session?.creatingTest) {
        await handleAdminTestCreation(ctx);
        return;
      }

      // Subject selection - dinamik fan tugmalari
      if (
        session?.availableTests === undefined &&
        !session?.currentTest &&
        !session?.addingSubject
      ) {
        // Bu fan tanlash bo'lishi mumkin
        await TestController.showTests(ctx);
        return;
      }

      // Test selection
      if (session?.availableTests) {
        const selectedTest = session.availableTests.find(
          (test) => test.title === text
        );
        if (selectedTest) {
          await TestController.startTest(ctx);
          return;
        }
      }

      // Unknown command
      await ctx.reply("Noma'lum buyruq. Iltimos, menyudan tanlang.");
  }
});

// Contact handler for phone number
bot.on("contact", async (ctx) => {
  const session = ctx.session;

  if (session?.registrationStep === "phoneNumber") {
    await UserController.handlePhoneNumber(ctx);
  }
});

// Callback query handler for admin answer selection
bot.on("callback_query", async (ctx) => {
  const callbackData = ctx.callbackQuery.data;

  if (callbackData.startsWith("answer_")) {
    await AdminController.handleCorrectAnswerCallback(ctx);
  } else if (callbackData.startsWith("type_")) {
    await AdminController.handleQuestionType(ctx);
  } else if (callbackData.startsWith("variants_")) {
    await AdminController.handleVariantCount(ctx);
  } else if (callbackData === "finish_test") {
    await AdminController.finishTestCreation(ctx);
  } else if (callbackData === "add_next_question") {
    await AdminController.startNextQuestion(ctx);
  } else if (callbackData.startsWith("confirm_subject_")) {
    await AdminController.handleSubjectConfirm(ctx);
  } else if (callbackData === "cancel_subject") {
    await AdminController.handleSubjectCancel(ctx);
  } else if (callbackData === "create_test_after_subject") {
    await AdminController.startCreateTest(ctx);
  } else if (callbackData.startsWith("delete_subject_")) {
    await AdminController.handleSubjectDelete(ctx);
  } else if (callbackData === "back_to_admin") {
    await AdminController.showAdminMenu(ctx);
  } else if (callbackData.startsWith("select_subject_")) {
    await AdminController.handleSubjectSelection(ctx);
  } else if (callbackData === "cancel_test_creation") {
    await AdminController.cancelTestCreation(ctx);
  }
});

// Admin test creation handler
async function handleAdminTestCreation(ctx) {
  const session = ctx.session;
  const text = ctx.message.text;

  switch (session.currentStep) {
    case "title":
      await AdminController.handleTestTitle(ctx);
      break;

    case "subject":
      await AdminController.handleTestSubject(ctx);
      break;

    case "description":
      await AdminController.handleTestDescription(ctx);
      break;

    case "timeLimit":
      await AdminController.handleTimeLimit(ctx);
      break;

    case "writtenAnswer":
      await AdminController.handleWrittenAnswer(ctx);
      break;

    case "nextQuestion":
      // This is now handled by callback buttons
      await ctx.reply("Iltimos, tugmalardan birini tanlang.");
      break;

    default:
      await ctx.reply("Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
  }
}

// Test flow handler
async function handleTestFlow(ctx) {
  const text = ctx.message.text;
  console.log("handleTestFlow chaqirildi, text:", text);

  if (text === "✅ Testni boshlash") {
    console.log("Testni boshlash tugmasi bosildi");
    await TestController.beginTest(ctx);
  } else if (
    ["A", "B", "C", "D", "E", "F", "G", "H", "⏭️ O'tkazib yuborish"].includes(
      text
    )
  ) {
    console.log("Javob tugmasi bosildi:", text);
    await TestController.handleAnswer(ctx);
  } else {
    // Yozma javob yoki boshqa matn
    console.log("Yozma javob yoki boshqa matn:", text);
    await TestController.handleAnswer(ctx);
  }
}

// Context-aware back button handler
async function handleBackButton(ctx) {
  try {
    const session = ctx.session;

    console.log("Back button pressed. Session state:", {
      availableTests: session?.availableTests?.length,
      currentTest: !!session?.currentTest,
      creatingTest: !!session?.creatingTest,
      addingSubject: !!session?.addingSubject,
      selectedSubject: session?.selectedSubject,
    });

    // If we're in test selection (availableTests exists), go back to subjects
    if (session?.availableTests) {
      console.log("Going back from test selection to subjects");
      // Clear test selection state
      delete session.availableTests;
      delete session.selectedSubject;
      await TestController.showSubjects(ctx);
      return;
    }

    // If we're in subject selection (no availableTests, no currentTest), go back to main menu
    if (
      !session?.currentTest &&
      !session?.creatingTest &&
      !session?.addingSubject
    ) {
      console.log("Going back from subject selection to main menu");
      await ctx.reply("Asosiy menyu:", mainMenu);
      return;
    }

    // If we're in test taking mode, go back to test selection
    if (session?.currentTest) {
      console.log("Going back from test taking to test selection");
      // Clear test state
      delete session.currentTest;
      delete session.currentQuestionIndex;
      delete session.userAnswers;
      delete session.testResults;

      // Go back to test selection
      if (session?.availableTests) {
        await TestController.showTests(ctx);
      } else {
        await TestController.showSubjects(ctx);
      }
      return;
    }

    // Default fallback to main menu
    console.log("Default fallback to main menu");
    await ctx.reply("Asosiy menyu:", mainMenu);
  } catch (error) {
    console.error("Back button error:", error);
    await ctx.reply(
      "Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
      mainMenu
    );
  }
}

// Error handler
bot.catch((err, ctx) => {
  console.error(`Bot error for ${ctx.updateType}:`, err);
  ctx.reply("Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
});

// Bot ishga tushirish
async function startBot() {
  try {
    // Database ulanish
    await connectDB();

    // Bot ishga tushirish
    await bot.launch();
    console.log("🤖 Bot muvaffaqiyatli ishga tushdi!");

    // Graceful stop
    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));
  } catch (error) {
    console.error("Bot ishga tushirishda xatolik:", error);
    process.exit(1);
  }
}

module.exports = { bot, startBot };


startBot();
