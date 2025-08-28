const Test = require("../models/Test");
const User = require("../models/User");
const Subject = require("../models/Subject");
const RaschModel = require("../utils/raschModel");
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

  // Session state validation method
  static validateSessionState(ctx) {
    if (!ctx.session) {
      ctx.session = {};
      console.log("Session created in validation");
    }

    if (!ctx.session.currentTest) {
      console.log("No current test in session");
      return false;
    }

    if (!Array.isArray(ctx.session.userAnswers)) {
      ctx.session.userAnswers = [];
      console.log("userAnswers converted to array in validation");
    }

    if (
      ctx.session.currentQuestionIndex === undefined ||
      ctx.session.currentQuestionIndex === null
    ) {
      ctx.session.currentQuestionIndex = 0;
      console.log("currentQuestionIndex reset to 0 in validation");
    }

    return true;
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
        questionType: question.questionType,
      });

      if (question.questionType === "written") {
        // Yozma savol
        const questionText =
          `❓ **Savol ${question.questionNumber}/${test.questions.length} (Yozma):**\n\n` +
          `📝 Qog'ozdagi savolni o'qing va javobni yozing:\n\n` +
          "Javobingizni matn ko'rinishida kiriting:";

        const { Markup } = require("telegraf");
        const writtenKeyboard = Markup.keyboard([
          ["⏭️ O'tkazib yuborish"],
        ]).resize();

        await ctx.reply(questionText, { parse_mode: "Markdown" });
        await ctx.reply("Javobingizni yozing:", writtenKeyboard);
      } else {
        // Variantli savol
        const variantCount = question.variantCount || 4; // Default 4 ta variant

        // Variant harflarini yaratish
        const variantLetters = [];
        for (let i = 0; i < variantCount; i++) {
          variantLetters.push(String.fromCharCode(65 + i)); // A, B, C, D, E, F, G, H
        }

        const questionText =
          `❓ **Savol ${question.questionNumber}/${test.questions.length} (${variantCount} ta variant):**\n\n` +
          `📝 Qog'ozdagi savolni o'qing va javobni belgilang:\n\n` +
          variantLetters
            .map((letter) => `${letter}) ${letter} variant`)
            .join("\n") +
          "\n\nJavobni tanlang:";

        // Dinamik tugmalarni yaratish
        const { Markup } = require("telegraf");
        const answerButtons = [];
        const buttonsPerRow = 2;

        for (let i = 0; i < variantLetters.length; i += buttonsPerRow) {
          const row = variantLetters.slice(i, i + buttonsPerRow);
          answerButtons.push(row);
        }

        // O'tkazib yuborish tugmasini qo'shish
        answerButtons.push(["⏭️ O'tkazib yuborish"]);

        const answerKeyboard = Markup.keyboard(answerButtons).resize();

        await ctx.reply(questionText, { parse_mode: "Markdown" });
        await ctx.reply("Javobni tanlang:", answerKeyboard);
      }

      console.log("Savol va tugmalar yuborildi");
    } catch (error) {
      console.error("Begin test error:", error);
      await ctx.reply("Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
    }
  }

  // Javobni qabul qilish
  static async handleAnswer(ctx) {
    try {
      console.log("handleAnswer chaqirildi, text:", ctx.message.text);

      // Validate session state
      if (!this.validateSessionState(ctx)) {
        await ctx.reply(
          "Test ma'lumotlari topilmadi. Iltimos, qaytadan test tanlang."
        );
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

      const answer = ctx.message.text.trim();
      const test = ctx.session.currentTest;
      const currentIndex = ctx.session.currentQuestionIndex;
      const question = test.questions[currentIndex];

      console.log("Answer processing:", {
        answer: answer,
        currentIndex: currentIndex,
        totalQuestions: test.questions.length,
        userAnswersLength: ctx.session.userAnswers.length,
        questionType: question.questionType,
      });

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

      // Check if this question was already answered
      if (ctx.session.userAnswers[currentIndex] !== undefined) {
        console.log("Question already answered, ignoring duplicate answer");
        await ctx.reply(
          "Bu savol allaqachon javob berilgan. Keyingi savolga o'ting."
        );
        return;
      }

      let selectedAnswer = -1;
      let writtenAnswer = null;

      if (question.questionType === "written") {
        // Yozma savol uchun
        if (answer === "⏭️ O'tkazib yuborish") {
          selectedAnswer = -1;
        } else {
          writtenAnswer = answer;
          selectedAnswer = -2; // Yozma javob belgisi
        }
      } else {
        // Variantli savol uchun
        const answerUpper = answer.toUpperCase();
        const variantCount = question.variantCount || 4;

        // Javob raqamini aniqlash (A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7)
        if (answerUpper === "⏭️ O'tkazib yuborish") {
          selectedAnswer = -1;
        } else {
          // Harf raqamini aniqlash (A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7)
          const letterCode = answerUpper.charCodeAt(0);
          if (letterCode >= 65 && letterCode <= 72) {
            // A-H harflari
            selectedAnswer = letterCode - 65;

            // Variantlar soniga mos kelishini tekshirish
            if (selectedAnswer >= variantCount) {
              console.log(
                "Invalid answer received:",
                answer,
                "for variant count:",
                variantCount
              );
              await ctx.reply(
                `Noto'g'ri javob tanlandi. Iltimos, A dan ${String.fromCharCode(
                  65 + variantCount - 1
                )} gacha tugmalardan birini tanlang.`
              );
              return;
            }
          } else {
            console.log("Invalid answer received:", answer);
            await ctx.reply(
              `Noto'g'ri javob tanlandi. Iltimos, A dan ${String.fromCharCode(
                65 + variantCount - 1
              )} gacha tugmalardan birini tanlang.`
            );
            return;
          }
        }
      }

      console.log("Answer mapping:", { answer, selectedAnswer, writtenAnswer });

      // Javobni saqlash
      if (question.questionType === "written") {
        ctx.session.userAnswers[currentIndex] = {
          type: "written",
          answer: writtenAnswer,
          skipped: selectedAnswer === -1,
        };
      } else {
        ctx.session.userAnswers[currentIndex] = {
          type: "multiple_choice",
          answer: selectedAnswer,
          skipped: selectedAnswer === -1,
        };
      }

      // Force session save
      ctx.session = { ...ctx.session };

      console.log("Answer saved:", {
        questionIndex: currentIndex,
        selectedAnswer: selectedAnswer,
        writtenAnswer: writtenAnswer,
        userAnswers: ctx.session.userAnswers,
        userAnswersLength: ctx.session.userAnswers.length,
      });

      // Confirm answer to user
      let answerText;
      if (question.questionType === "written") {
        if (selectedAnswer === -1) {
          answerText = "O'tkazib yuborildi";
        } else {
          answerText = `Yozma javob: ${writtenAnswer}`;
        }
      } else {
        const variantCount = question.variantCount || 4;
        const answerLabels = [];
        for (let i = 0; i < variantCount; i++) {
          answerLabels.push(String.fromCharCode(65 + i)); // A, B, C, D, E, F, G, H
        }
        answerText =
          selectedAnswer >= 0
            ? answerLabels[selectedAnswer]
            : "O'tkazib yuborildi";
      }

      await ctx.reply(`✅ Javob saqlandi: ${answerText}`);

      // Keyingi savolga o'tish
      const nextIndex = currentIndex + 1;

      if (nextIndex < test.questions.length) {
        ctx.session.currentQuestionIndex = nextIndex;
        console.log("Moving to next question:", nextIndex);

        // Small delay to ensure session is saved
        await new Promise((resolve) => setTimeout(resolve, 100));
        await this.beginTest(ctx);
      } else {
        // Test tugadi
        console.log("Test finished, calling finishTest");
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

      console.log("finishTest - Session state:", {
        userAnswers: userAnswers,
        userAnswersLength: userAnswers.length,
        userAnswersKeys: Object.keys(userAnswers),
        testQuestionsCount: test.questions.length,
        userAnswersType: typeof userAnswers,
        userAnswersIsArray: Array.isArray(userAnswers),
        userAnswersStringified: JSON.stringify(userAnswers),
      });

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
      const writtenAnswers = [];

      test.questions.forEach((question, index) => {
        // Ensure userAnswers is properly accessed
        let userAnswerData = null;

        if (Array.isArray(userAnswers) && userAnswers[index] !== undefined) {
          userAnswerData = userAnswers[index];
        } else if (
          typeof userAnswers === "object" &&
          userAnswers[index] !== undefined
        ) {
          userAnswerData = userAnswers[index];
        }

        let isCorrect = false;
        let userAnswerText = "Javob berilmagan";
        let correctAnswerText = "";

        if (question.questionType === "written") {
          // Yozma savol
          if (
            userAnswerData &&
            userAnswerData.type === "written" &&
            !userAnswerData.skipped
          ) {
            userAnswerText = userAnswerData.answer;
            correctAnswerText = question.correctWrittenAnswer;

            // Yozma javoblarni taqqoslash (katta-kichik harflarni hisobga olmasdan)
            isCorrect =
              userAnswerData.answer.toLowerCase().trim() ===
              question.correctWrittenAnswer.toLowerCase().trim();

            // Yozma javobni saqlash
            writtenAnswers.push({
              questionNumber: question.questionNumber,
              userAnswer: userAnswerData.answer,
              correctAnswer: question.correctWrittenAnswer,
              isCorrect: isCorrect,
            });
          }
        } else {
          // Variantli savol
          if (
            userAnswerData &&
            userAnswerData.type === "multiple_choice" &&
            !userAnswerData.skipped
          ) {
            const userAnswer = userAnswerData.answer;
            isCorrect = userAnswer === question.correctAnswer;

            const answerLabels = ["A", "B", "C", "D"];
            userAnswerText =
              userAnswer >= 0 ? answerLabels[userAnswer] : "Javob berilmagan";
            correctAnswerText = answerLabels[question.correctAnswer];
          }
        }

        console.log(`Question ${index + 1}:`, {
          questionNumber: question.questionNumber,
          questionType: question.questionType,
          userAnswer: userAnswerText,
          correctAnswer: correctAnswerText,
          isCorrect: isCorrect,
          userAnswersArray: userAnswers,
          userAnswersIndex: userAnswers[index],
          userAnswersType: typeof userAnswers,
          userAnswersIsArray: Array.isArray(userAnswers),
        });

        if (isCorrect) correctAnswers++;

        results.push({
          questionNumber: question.questionNumber,
          questionType: question.questionType,
          userAnswer: userAnswerText,
          correctAnswer: correctAnswerText,
          isCorrect,
        });
      });

      // Rash modeli bo'yicha ball hisoblash
      const questionDifficulty = test.questions.map((q) => q.difficulty || 0.5);

      const raschResult = RaschModel.calculateRaschScore(
        correctAnswers,
        test.questions.length,
        questionDifficulty,
        userAnswers,
        test.questions
      );

      const score = raschResult.adjustedScore; // Rash modeli bo'yicha tuzatilgan ball
      const rawScore = Math.round(
        (correctAnswers / test.questions.length) * 100
      ); // Oddiy ball

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
        rawPercentage: rawScore,
        raschScore: raschResult.raschScore,
        adjustedScore: raschResult.adjustedScore,
        userAbility: raschResult.userAbility,
        grade: gradeInfo.grade,
        writtenAnswers: writtenAnswers,
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
        `📈 Oddiy ball: ${rawScore}%\n` +
        `🎯 Rash modeli balli: ${score}%\n` +
        `🧠 Foydalanuvchi qobiliyati: ${raschResult.userAbility.toFixed(2)}\n` +
        `🏆 Baho: **${gradeInfo.grade}** (${gradeInfo.description})\n\n` +
        `📝 **Test:** ${test.title}\n` +
        `📚 **Fan:** ${test.subject}\n` +
        `⏱ **Vaqt:** ${test.timeLimit} daqiqa\n\n` +
        `ℹ️ **Rash modeli:** Qiyin savollarga ko'proq ball, oson savollarga kam ball beriladi.\n\n` +
        `📋 Keyingi amalni tanlang:`;

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
        const questionType =
          result.questionType === "written" ? "(Yozma)" : "(Variantli)";
        detailedText += `${status} **Savol ${result.questionNumber} ${questionType}:**\n`;
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
