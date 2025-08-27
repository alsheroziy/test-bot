const Test = require("../models/Test");
const User = require("../models/User");
const Subject = require("../models/Subject");
const {
  staticSubjectMenu,
  createSubjectMenu,
  testSelectionMenu,
  startTestMenu,
  answerKeyboard,
  afterTestMenu,
  mainMenu,
} = require("../utils/keyboards");

// Fan nomini tozalash funksiyasi
const cleanSubjectName = (subject) => {
  return subject.replace(/[^\w\s\u0400-\u04FF]/g, "").trim();
};

class TestController {
  // Test fani tanlash
  static async showSubjects(ctx) {
    try {
      const user = ctx.state.user;

      if (!user.phoneNumber) {
        await ctx.reply("Avval ro'yxatdan o'ting! /start buyrug'ini yuboring.");
        return;
      }

      // Clear any previous test-related session state
      if (ctx.session) {
        delete ctx.session.availableTests;
        delete ctx.session.selectedSubject;
        delete ctx.session.currentTest;
        delete ctx.session.currentQuestionIndex;
        delete ctx.session.userAnswers;
        delete ctx.session.testResults;
      }

      // Mavjud fanlarni bazadan olish
      const subjects = await Subject.find({ isActive: true }).sort({ name: 1 });

      console.log(
        "Mavjud fanlar:",
        subjects.map((s) => s.name)
      );

      if (subjects.length === 0) {
        await ctx.reply(
          "Hali hech qanday fan qo'shilmagan.\n" +
            "Iltimos, keyinroq urinib ko'ring.",
          mainMenu
        );
        return;
      }

      // Dinamik fan tugmalarini yaratish
      const subjectNames = subjects.map((s) => s.name);
      const subjectMenu = createSubjectMenu(subjectNames);

      await ctx.reply(
        "📚 Qaysi fan bo'yicha test yechmoqchisiz?\n\n" +
          "Fanlardan birini tanlang:",
        subjectMenu
      );
    } catch (error) {
      console.error("Show subjects error:", error);
      await ctx.reply("Xatolik yuz berdi.");
    }
  }

  // Testlar ro'yxatini ko'rsatish
  static async showTests(ctx) {
    try {
      const subject = ctx.message.text;
      console.log("Asl fan nomi:", subject);

      // Fan nomini tozalash - admin controller bilan bir xil
      const cleanSubject = subject.replace(/[^\w\s\u0400-\u04FF]/g, "").trim();
      console.log("Tozalangan fan nomi:", cleanSubject);

      // Bazadagi barcha testlarni ko'rish
      const allTests = await Test.find({ isActive: true });
      console.log(
        "Bazadagi barcha testlar:",
        allTests.map((t) => ({ title: t.title, subject: t.subject }))
      );

      const tests = await Test.find({
        subject: cleanSubject,
        isActive: true,
      });

      console.log("Topilgan testlar soni:", tests.length);
      console.log("Qidirilgan fan nomi:", cleanSubject);
      console.log(
        "Testlar:",
        tests.map((t) => ({ title: t.title, subject: t.subject }))
      );

      // Qo'shimcha debug - barcha testlarni fan nomi bo'yicha tekshirish
      const allTestsForSubject = allTests.filter(
        (t) =>
          t.subject.includes(cleanSubject) || cleanSubject.includes(t.subject)
      );
      console.log(
        "Fan nomi bilan mos keladigan testlar:",
        allTestsForSubject.map((t) => ({ title: t.title, subject: t.subject }))
      );

      if (tests.length === 0) {
        // Barcha fanlarni ko'rish uchun
        const allSubjects = await Subject.find({ isActive: true }).sort({
          name: 1,
        });
        console.log(
          "Barcha faol fanlar:",
          allSubjects.map((s) => ({ name: s.name }))
        );

        // Dinamik fan tugmalarini yaratish
        const availableSubjects = allSubjects.map((s) => s.name);
        const subjectMenu = createSubjectMenu(availableSubjects);

        await ctx.reply(
          `Bu fan bo'yicha hali testlar mavjud emas.\n` +
            `Qidirilgan fan: "${cleanSubject}"\n` +
            `Mavjud fanlar: ${availableSubjects.join(", ")}\n` +
            "Iltimos, boshqa fan tanlang yoki keyinroq urinib ko'ring.",
          subjectMenu
        );
        return;
      }

      if (!ctx.session) {
        ctx.session = {};
      }

      // Set session state for navigation
      ctx.session.selectedSubject = subject;
      ctx.session.availableTests = tests;
      // Clear test state when entering test selection
      delete ctx.session.currentTest;
      delete ctx.session.currentQuestionIndex;
      delete ctx.session.userAnswers;
      delete ctx.session.testResults;

      const testList = tests
        .map(
          (test, index) =>
            `${index + 1}. ${test.title}\n   📝 ${
              test.questions.length
            } savol\n   ⏱ ${test.timeLimit} daqiqa`
        )
        .join("\n\n");

      await ctx.reply(
        `📋 **${subject}** fanidagi testlar:\n\n${testList}\n\n` +
          "Testni tanlang:",
        testSelectionMenu(tests)
      );
    } catch (error) {
      console.error("Show tests error:", error);
      await ctx.reply("Xatolik yuz berdi.");
    }
  }

  // Testni boshlash
  static async startTest(ctx) {
    try {
      const testTitle = ctx.message.text;

      if (!ctx.session) {
        ctx.session = {};
      }

      const tests = ctx.session.availableTests;
      const selectedTest = tests.find((test) => test.title === testTitle);

      if (!selectedTest) {
        await ctx.reply("Test topilmadi. Iltimos, qaytadan tanlang.");
        return;
      }

      const user = ctx.state.user;

      // Foydalanuvchi ma\'lumotlarini yangilash
      user.currentTest = selectedTest._id;
      user.currentQuestionIndex = 0;
      await user.save();

      // Set session state for test taking
      ctx.session.currentTest = selectedTest;
      ctx.session.currentQuestionIndex = 0;
      ctx.session.userAnswers = [];
      // Keep availableTests for back navigation

      await ctx.reply(
        `📝 **${selectedTest.title}**\n\n` +
          `📚 Fan: ${selectedTest.subject}\n` +
          `❓ Savollar soni: ${selectedTest.questions.length}\n` +
          `⏱ Vaqt: ${selectedTest.timeLimit} daqiqa\n\n` +
          "📋 **Eslatma:** Savollarni qog'ozdan o'qing va javoblarni bot orqali belgilang.\n\n" +
          "Testni boshlashga tayyormisiz?",
        startTestMenu
      );
    } catch (error) {
      console.error("Start test error:", error);
      await ctx.reply("Xatolik yuz berdi.");
    }
  }

  // Testni boshlash
  static async beginTest(ctx) {
    try {
      console.log("beginTest chaqirildi");

      if (!ctx.session) {
        ctx.session = {};
      }

      // Validate session state
      if (!ctx.session.currentTest) {
        console.log("No current test in session");
        await ctx.reply(
          "Test ma'lumotlari topilmadi. Iltimos, qaytadan test tanlang."
        );
        return;
      }

      const test = ctx.session.currentTest;
      const currentIndex = ctx.session.currentQuestionIndex;

      // Validate question index
      if (
        currentIndex === undefined ||
        currentIndex < 0 ||
        currentIndex >= test.questions.length
      ) {
        console.log("Invalid question index:", currentIndex);
        await ctx.reply(
          "Savol indeksi noto'g'ri. Iltimos, qaytadan urinib ko'ring."
        );
        return;
      }

      const question = test.questions[currentIndex];

      console.log("Test ma'lumotlari:", {
        testTitle: test.title,
        currentIndex: currentIndex,
        totalQuestions: test.questions.length,
        questionNumber: question.questionNumber,
      });

      const questionText =
        `❓ **Savol ${question.questionNumber}/${test.questions.length}:**\n\n` +
        `📝 Qog'ozdagi savolni o'qing va javobni belgilang:\n\n` +
        "A) Birinchi variant\n" +
        "B) Ikkinchi variant\n" +
        "C) Uchinchi variant\n" +
        "D) To'rtinchi variant\n\n" +
        "Javobni tanlang:";

      // Tugmalarni to'g'ridan-to'g'ri yaratish
      const { Markup } = require("telegraf");
      const answerKeyboard = Markup.keyboard([
        ["A", "B"],
        ["C", "D"],
        ["⏭️ O'tkazib yuborish"],
      ]).resize();

      console.log("answerKeyboard yaratildi:", answerKeyboard);

      // Tugmalarni alohida yuborish
      await ctx.reply(questionText, { parse_mode: "Markdown" });
      console.log("Savol yuborildi");

      await ctx.reply("Javobni tanlang:", answerKeyboard);
      console.log("Tugmalar yuborildi");

      console.log("Savol va tugmalar yuborildi");
    } catch (error) {
      console.error("Begin test error:", error);
      await ctx.reply("Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
    }
  }

  // Javobni qabul qilish
  static async handleAnswer(ctx) {
    try {
      if (!ctx.session) {
        ctx.session = {};
      }

      // Validate that we're in a test
      if (!ctx.session.currentTest) {
        console.log("No current test in session, ignoring answer");
        return;
      }

      // Simple rate limiting - prevent multiple answers within 1 second
      const now = Date.now();
      if (
        ctx.session.lastAnswerTime &&
        now - ctx.session.lastAnswerTime < 1000
      ) {
        console.log("Rate limit hit, ignoring rapid answer");
        return;
      }
      ctx.session.lastAnswerTime = now;

      const answer = ctx.message.text.trim().toUpperCase();
      const test = ctx.session.currentTest;
      const currentIndex = ctx.session.currentQuestionIndex;

      // Validate current question index
      if (
        currentIndex === undefined ||
        currentIndex < 0 ||
        currentIndex >= test.questions.length
      ) {
        console.log("Invalid question index:", currentIndex);
        await ctx.reply(
          "Savol indeksi noto'g'ri. Iltimos, qaytadan urinib ko'ring."
        );
        return;
      }

      let selectedAnswer = -1;

      // Javob raqamini aniqlash
      if (answer === "A") selectedAnswer = 0;
      else if (answer === "B") selectedAnswer = 1;
      else if (answer === "C") selectedAnswer = 2;
      else if (answer === "D") selectedAnswer = 3;
      else if (answer === "⏭️ O'tkazib yuborish") selectedAnswer = -1;

      // Initialize userAnswers array if it doesn't exist
      if (!ctx.session.userAnswers) {
        ctx.session.userAnswers = [];
      }

      // Check if this question was already answered
      if (ctx.session.userAnswers[currentIndex] !== undefined) {
        console.log("Question already answered, ignoring duplicate answer");
        return;
      }

      // Javobni saqlash
      ctx.session.userAnswers[currentIndex] = selectedAnswer;

      // Keyingi savolga o'tish
      const nextIndex = currentIndex + 1;

      if (nextIndex < test.questions.length) {
        ctx.session.currentQuestionIndex = nextIndex;
        await this.beginTest(ctx);
      } else {
        // Test tugadi
        await this.finishTest(ctx);
      }
    } catch (error) {
      console.error("Handle answer error:", error);
      await ctx.reply("Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
    }
  }

  // Testni tugatish
  static async finishTest(ctx) {
    try {
      if (!ctx.session) {
        ctx.session = {};
      }

      const test = ctx.session.currentTest;
      const userAnswers = ctx.session.userAnswers || [];
      const user = ctx.state.user;

      // Validate test data
      if (!test || !test.questions) {
        console.log("Invalid test data in finishTest");
        await ctx.reply(
          "Test ma'lumotlari noto'g'ri. Iltimos, qaytadan urinib ko'ring."
        );
        return;
      }

      // Natijalarni hisoblash
      let correctAnswers = 0;
      const results = [];

      test.questions.forEach((question, index) => {
        const userAnswer = userAnswers[index] || -1;
        const isCorrect = userAnswer === question.correctAnswer;

        if (isCorrect) correctAnswers++;

        const answerLabels = ["A", "B", "C", "D"];
        results.push({
          questionNumber: question.questionNumber,
          userAnswer:
            userAnswer >= 0 ? answerLabels[userAnswer] : "Javob berilmagan",
          correctAnswer: answerLabels[question.correctAnswer],
          isCorrect,
        });
      });

      const score = Math.round((correctAnswers / test.questions.length) * 100);

      // Baholash tizimi
      const getGrade = (percentage) => {
        if (percentage >= 70)
          return { grade: "A+", description: "Eng yuqori daraja" };
        if (percentage >= 65)
          return { grade: "A", description: "Ikkinchi yuqori daraja" };
        if (percentage >= 60)
          return { grade: "B+", description: "Yaxshi daraja" };
        if (percentage >= 55)
          return { grade: "B", description: "O'rtacha yuqori daraja" };
        if (percentage >= 50)
          return { grade: "C+", description: "O'rtacha daraja" };
        if (percentage >= 46)
          return { grade: "C", description: "O'rtacha past daraja" };
        return { grade: "F", description: "Yiqilgan" };
      };

      const gradeInfo = getGrade(score);

      // Natijani saqlash
      const testResult = {
        testId: test._id,
        score: correctAnswers,
        totalQuestions: test.questions.length,
        percentage: score,
        grade: gradeInfo.grade,
        completedAt: new Date(),
      };

      user.testResults.push(testResult);
      user.currentTest = null;
      user.currentQuestionIndex = 0;
      await user.save();

      // Clear test state from session
      delete ctx.session.currentTest;
      delete ctx.session.currentQuestionIndex;
      delete ctx.session.userAnswers;

      // Natijani ko'rsatish
      const resultText =
        `🎉 **Test tugadi!**\n\n` +
        `📊 **Natijalar:**\n` +
        `✅ To'g'ri javoblar: ${correctAnswers}/${test.questions.length}\n` +
        `📈 Ball: ${score}\n` +
        `🏆 Baho: **${gradeInfo.grade}** (${gradeInfo.description})\n\n` +
        `📝 **Test:** ${test.title}\n` +
        `📚 **Fan:** ${test.subject}\n` +
        `⏱ **Vaqt:** ${test.timeLimit} daqiqa`;

      ctx.session.testResults = results;

      await ctx.reply(resultText, afterTestMenu);
    } catch (error) {
      console.error("Finish test error:", error);
      await ctx.reply("Xatolik yuz berdi.");
    }
  }

  // Natijani ko'rsatish
  static async showDetailedResults(ctx) {
    try {
      if (!ctx.session) {
        ctx.session = {};
      }

      const results = ctx.session.testResults;
      const test = ctx.session.currentTest;

      if (!results) {
        await ctx.reply("Natijalar mavjud emas.", afterTestMenu);
        return;
      }

      const correctAnswers = results.filter((r) => r.isCorrect).length;
      const totalQuestions = results.length;
      const percentage = Math.round((correctAnswers / totalQuestions) * 100);

      const getGrade = (percentage) => {
        if (percentage >= 70)
          return { grade: "A+", description: "Eng yuqori daraja" };
        if (percentage >= 65)
          return { grade: "A", description: "Ikkinchi yuqori daraja" };
        if (percentage >= 60)
          return { grade: "B+", description: "Yaxshi daraja" };
        if (percentage >= 55)
          return { grade: "B", description: "O'rtacha yuqori daraja" };
        if (percentage >= 50)
          return { grade: "C+", description: "O'rtacha daraja" };
        if (percentage >= 46)
          return { grade: "C", description: "O'rtacha past daraja" };
        return { grade: "F", description: "Yiqilgan" };
      };

      const gradeInfo = getGrade(percentage);

      let detailedText = "📊 **Batafsil natijalar:**\n\n";
      detailedText += `📝 **Test:** ${test?.title || "Noma'lum"}\n`;
      detailedText += `📚 **Fan:** ${test?.subject || "Noma'lum"}\n`;
      detailedText += `✅ **To'g'ri javoblar:** ${correctAnswers}/${totalQuestions}\n`;
      detailedText += `📈 **Ball:** ${percentage}\n`;
      detailedText += `🏆 **Baho:** **${gradeInfo.grade}** (${gradeInfo.description})\n\n`;
      detailedText += "📋 **Savol bo'yicha natijalar:**\n\n";

      results.forEach((result, index) => {
        const status = result.isCorrect ? "✅" : "❌";
        detailedText += `${status} **Savol ${result.questionNumber}:**\n`;
        detailedText += `👤 Sizning javob: ${result.userAnswer}\n`;
        detailedText += `✅ To'g'ri javob: ${result.correctAnswer}\n\n`;
      });

      await ctx.reply(detailedText, { parse_mode: "Markdown" });
      await ctx.reply("Keyingi amalni tanlang:", afterTestMenu);
    } catch (error) {
      console.error("Show detailed results error:", error);
      await ctx.reply("Xatolik yuz berdi.", afterTestMenu);
    }
  }

  // Foydalanuvchi natijalarini ko'rsatish
  static async showUserResults(ctx) {
    try {
      const user = ctx.state.user;

      if (user.testResults.length === 0) {
        await ctx.reply("Siz hali hech qanday test yechmagansiz.", mainMenu);
        return;
      }

      let resultsText = "📊 **Sizning natijalaringiz:**\n\n";

      for (const result of user.testResults.slice(-5)) {
        // Oxirgi 5 natija
        const test = await Test.findById(result.testId);
        if (test) {
          // Use saved grade if available, otherwise calculate
          let gradeInfo;
          if (result.grade) {
            // Baholash tizimi
            const getGradeDescription = (grade) => {
              switch (grade) {
                case "A+":
                  return "Eng yuqori daraja";
                case "A":
                  return "Ikkinchi yuqori daraja";
                case "B+":
                  return "Yaxshi daraja";
                case "B":
                  return "O'rtacha yuqori daraja";
                case "C+":
                  return "O'rtacha daraja";
                case "C":
                  return "O'rtacha past daraja";
                case "D":
                  return "Past daraja";
                case "F":
                  return "Yiqilgan";
                default:
                  return "Noma'lum";
              }
            };
            gradeInfo = {
              grade: result.grade,
              description: getGradeDescription(result.grade),
            };
          } else {
            // Fallback for old results without grades
            const percentage = Math.round(
              (result.score / result.totalQuestions) * 100
            );
            const getGrade = (percentage) => {
              if (percentage >= 70)
                return { grade: "A+", description: "Eng yuqori daraja" };
              if (percentage >= 65)
                return { grade: "A", description: "Ikkinchi yuqori daraja" };
              if (percentage >= 60)
                return { grade: "B+", description: "Yaxshi daraja" };
              if (percentage >= 55)
                return { grade: "B", description: "O'rtacha yuqori daraja" };
              if (percentage >= 50)
                return { grade: "C+", description: "O'rtacha daraja" };
              if (percentage >= 46)
                return { grade: "C", description: "O'rtacha past daraja" };
              return { grade: "F", description: "Yiqilgan" };
            };
            gradeInfo = getGrade(percentage);
          }

          const ball =
            result.percentage ||
            Math.round((result.score / result.totalQuestions) * 100);
          resultsText += `📝 **${test.title}**\n`;
          resultsText += `📚 ${test.subject}\n`;
          resultsText += `✅ To'g'ri javoblar: ${result.score}/${result.totalQuestions}\n`;
          resultsText += `📈 Ball: ${ball}\n`;
          resultsText += `🏆 Baho: **${gradeInfo.grade}** (${gradeInfo.description})\n`;
          resultsText += `📅 ${result.completedAt.toLocaleDateString(
            "uz-UZ"
          )}\n\n`;
        }
      }

      // Natijalar tugagandan keyin asosiy menyu bilan yuborish
      await ctx.reply(resultsText, { parse_mode: "Markdown" });
      await ctx.reply("Boshqa amallar uchun tanlang:", mainMenu);
    } catch (error) {
      console.error("Show user results error:", error);
      await ctx.reply("Xatolik yuz berdi.", mainMenu);
    }
  }
}

module.exports = TestController;
