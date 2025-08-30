const Test = require("../models/Test");
const User = require("../models/User");
const Subject = require("../models/Subject");
const RaschModel = require("../utils/raschModel");
const { adminMenu, mainMenu } = require("../utils/keyboards");
const { Markup } = require("telegraf");
const PDFGenerator = require("../utils/pdfGenerator");

class AdminController {
  // Admin menyusini ko'rsatish
  static async showAdminMenu(ctx) {
    try {
      // Ensure session exists
      if (!ctx.session) {
        ctx.session = {};
      }

      await ctx.reply(
        "🔧 **Admin paneli**\n\n" + "Quyidagi funksiyalardan birini tanlang:",
        adminMenu
      );
    } catch (error) {
      console.error("Show admin menu error:", error);
      await ctx.reply("Xatolik yuz berdi.");
    }
  }

  // Yangi test yaratish
  static async startCreateTest(ctx) {
    try {
      // Session ni tozalash va yangi test yaratish jarayonini boshlash
      ctx.session = {
        creatingTest: true,
        testData: {
          title: "",
          subject: "",
          description: "",
          timeLimit: 30,
          questions: [],
        },
        currentStep: "title",
      };

      console.log("Test yaratish jarayoni boshladi. Session state:", {
        creatingTest: ctx.session.creatingTest,
        currentStep: ctx.session.currentStep,
      });

      await ctx.reply(
        "➕ **Yangi test yaratish**\n\n" + "Iltimos, test nomini kiriting:"
      );
    } catch (error) {
      console.error("Start create test error:", error);
      await ctx.reply("Xatolik yuz berdi.");
    }
  }

  // Test nomini qabul qilish
  static async handleTestTitle(ctx) {
    try {
      const title = ctx.message.text.trim();

      console.log("Test nomi qabul qilindi:", title);
      console.log("Joriy session state:", {
        creatingTest: ctx.session.creatingTest,
        currentStep: ctx.session.currentStep,
        testData: ctx.session.testData,
      });

      if (title.length < 3) {
        await ctx.reply("Test nomi kamida 3 harf bo'lishi kerak:");
        return;
      }

      ctx.session.testData.title = title;
      ctx.session.currentStep = "subject";

      console.log("Test nomi saqlandi. Yangi session state:", {
        creatingTest: ctx.session.creatingTest,
        currentStep: ctx.session.currentStep,
        testData: ctx.session.testData,
      });

      // Mavjud fanlarni olish
      const subjects = await Subject.find({ isActive: true }).sort({ name: 1 });

      if (subjects.length === 0) {
        await ctx.reply(
          "Hali hech qanday fan qo'shilmagan. Avval fan qo'shing:\n\n" +
            "📚 Fan qo'shish uchun \"📚 Fan qo'shish\" tugmasini bosing."
        );
        return;
      }

      // Fan tanlash tugmalarini yaratish
      const subjectButtons = subjects.map((subject) => [
        Markup.button.callback(
          `📚 ${subject.name}`,
          `select_subject_${subject._id}`
        ),
      ]);

      subjectButtons.push([
        Markup.button.callback("❌ Bekor qilish", "cancel_test_creation"),
      ]);

      const subjectMenu = Markup.inlineKeyboard(subjectButtons);

      await ctx.reply(
        "Test fani nomini tanlang:\n\n" + "Quyidagi fanlardan birini tanlang:",
        { ...subjectMenu }
      );
    } catch (error) {
      console.error("Handle test title error:", error);
      await ctx.reply("Xatolik yuz berdi.");
    }
  }

  // Test fani qabul qilish
  static async handleTestSubject(ctx) {
    try {
      const subject = ctx.message.text.trim();

      // Fan nomini tozalash
      const cleanSubject = subject.replace(/[^\w\s\u0400-\u04FF]/g, "").trim();

      if (cleanSubject.length < 2) {
        await ctx.reply("Fan nomi kamida 2 harf bo'lishi kerak:");
        return;
      }

      ctx.session.testData.subject = cleanSubject;
      console.log("Test fani saqlandi:", cleanSubject);
      ctx.session.currentStep = "description";

      await ctx.reply(
        "Test haqida qisqacha ma'lumot kiriting (ixtiyoriy):\n\n" +
          "Agar ma'lumot bermoqchi bo'lmasangiz \"O'tkazib yuborish\" deb yozing."
      );
    } catch (error) {
      console.error("Handle test subject error:", error);
      await ctx.reply("Xatolik yuz berdi.");
    }
  }

  // Test tavsifini qabul qilish
  static async handleTestDescription(ctx) {
    try {
      const description = ctx.message.text.trim();

      if (description !== "O'tkazib yuborish") {
        ctx.session.testData.description = description;
      }

      ctx.session.currentStep = "timeLimit";

      await ctx.reply(
        "Test uchun vaqt chegarasini kiriting (daqiqada):\n\n" +
          "Masalan: 30 (30 daqiqa)\n" +
          "Standart: 30 daqiqa"
      );
    } catch (error) {
      console.error("Handle test description error:", error);
      await ctx.reply("Xatolik yuz berdi.");
    }
  }

  // Vaqt chegarasini qabul qilish
  static async handleTimeLimit(ctx) {
    try {
      const timeLimit = parseInt(ctx.message.text);

      if (isNaN(timeLimit) || timeLimit < 5 || timeLimit > 180) {
        await ctx.reply(
          "Vaqt chegarasi 5-180 daqiqa oralig'ida bo'lishi kerak:"
        );
        return;
      }

      ctx.session.testData.timeLimit = timeLimit;
      ctx.session.currentStep = "questions";
      ctx.session.questionIndex = 0;

      await ctx.reply(
        "✅ Test ma'lumotlari saqlandi!\n\n" +
          "Endi savollarni kiritishni boshlaymiz.\n\n" +
          "📝 **Eslatma:** Foydalanuvchilar savollarni qog'ozdan o'qadi.\n" +
          "Siz faqat to'g'ri javobni belgilaysiz.\n\n" +
          "Avtomatik ravishda birinchi savolni boshlaymiz:"
      );

      // Avtomatik ravishda birinchi savolni boshlash
      await AdminController.startNextQuestion(ctx);
    } catch (error) {
      console.error("Handle time limit error:", error);
      await ctx.reply("Xatolik yuz berdi.");
    }
  }

  // Keyingi savolni avtomatik boshlash
  static async startNextQuestion(ctx) {
    try {
      // Avtomatik ravishda keyingi savol raqamini hisoblash
      const nextQuestionNumber = ctx.session.testData.questions.length + 1;
      ctx.session.currentQuestionNumber = nextQuestionNumber;
      ctx.session.currentStep = "questionType";

      // Progress ko'rsatish
      const progressText = `📊 **Progress:** ${ctx.session.testData.questions.length} savol qo'shildi\n\n`;

      const questionText =
        progressText +
        `📝 **Savol ${nextQuestionNumber}**\n\n` +
        "Bu savol qanday turda bo'ladi?\n\n" +
        "Variantli savol yoki yozma savol tanlang:";

      const typeButtons = Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "📋 Variantli savol",
            `type_multiple_${nextQuestionNumber}`
          ),
          Markup.button.callback(
            "✍️ Yozma savol",
            `type_written_${nextQuestionNumber}`
          ),
        ],
      ]);

      await ctx.reply(questionText, typeButtons);
    } catch (error) {
      console.error("Start next question error:", error);
      await ctx.reply("Xatolik yuz berdi.");
    }
  }

  // Savol turini qabul qilish
  static async handleQuestionType(ctx) {
    try {
      const callbackData = ctx.callbackQuery.data;
      const [, type, questionNumber] = callbackData.split("_");

      ctx.session.currentQuestionType = type;
      ctx.session.currentQuestionNumber = parseInt(questionNumber);

      // Callback query ni javoblash
      await ctx.answerCbQuery(
        `✅ Savol turi tanlandi: ${type === "multiple" ? "Variantli" : "Yozma"}`
      );

      if (type === "multiple") {
        ctx.session.currentStep = "variantCount";

        const questionText =
          `📝 **Savol ${questionNumber} (Variantli)**\n\n` +
          "Bu savol uchun nechta javob varianti bo'ladi?\n\n" +
          "Variantlar sonini tanlang:";

        const variantButtons = Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "4 ta (A, B, C, D)",
              `variants_4_${questionNumber}`
            ),
            Markup.button.callback(
              "6 ta (A, B, C, D, E, F)",
              `variants_6_${questionNumber}`
            ),
          ],
          // [

          // ],
        ]);

        await ctx.reply(questionText, variantButtons);
      } else {
        ctx.session.currentStep = "writtenAnswer";

        await ctx.reply(
          `📝 **Savol ${questionNumber} (Yozma)**\n\n` +
            "Qog'ozdagi savolni o'qing va to'g'ri javobni yozing:\n\n" +
            "To'g'ri javobni matn ko'rinishida kiriting:"
        );
      }
    } catch (error) {
      console.error("Handle question type error:", error);
      await ctx.answerCbQuery("Xatolik yuz berdi!");
    }
  }

  // Variantlar sonini qabul qilish
  static async handleVariantCount(ctx) {
    try {
      const callbackData = ctx.callbackQuery.data;
      const [, count, questionNumber] = callbackData.split("_");
      const variantCount = parseInt(count);

      ctx.session.currentVariantCount = variantCount;
      ctx.session.currentStep = "correctAnswer";

      // Callback query ni javoblash
      await ctx.answerCbQuery(`✅ ${variantCount} ta variant tanlandi!`);

      // Variant harflarini yaratish
      const variantLetters = [];
      for (let i = 0; i < variantCount; i++) {
        variantLetters.push(String.fromCharCode(65 + i)); // A, B, C, D, E, F, G, H
      }

      const questionText =
        `📝 **Savol ${questionNumber} (${variantCount} ta variant)**\n\n` +
        "Qog'ozdagi savolni o'qing va to'g'ri javobni belgilang:\n\n" +
        variantLetters
          .map((letter) => `${letter}) ${letter} variant`)
          .join("\n") +
        "\n\nTo'g'ri javobni tanlang:";

      // Variant tugmalarini dinamik yaratish
      const answerButtons = [];
      const buttonsPerRow = 2;

      for (let i = 0; i < variantLetters.length; i += buttonsPerRow) {
        const row = variantLetters
          .slice(i, i + buttonsPerRow)
          .map((letter) =>
            Markup.button.callback(letter, `answer_${letter}_${questionNumber}`)
          );
        answerButtons.push(row);
      }

      const answerMenu = Markup.inlineKeyboard(answerButtons);

      await ctx.reply(questionText, answerMenu);
    } catch (error) {
      console.error("Handle variant count error:", error);
      await ctx.answerCbQuery("Xatolik yuz berdi!");
    }
  }

  // Yozma javobni qabul qilish
  static async handleWrittenAnswer(ctx) {
    try {
      const correctAnswer = ctx.message.text.trim();
      const questionNumber = ctx.session.currentQuestionNumber;

      if (correctAnswer.length < 1) {
        await ctx.reply("Iltimos, to'g'ri javobni kiriting:");
        return;
      }

      // Yozma savolni saqlash
      const questionData = {
        questionNumber: questionNumber,
        questionType: "written",
        correctWrittenAnswer: correctAnswer,
      };

      ctx.session.testData.questions.push(questionData);
      ctx.session.questionIndex++;

      const nextStepText =
        `✅ Yozma savol ${questionNumber} saqlandi!\n\n` +
        "To'g'ri javob: " +
        correctAnswer +
        "\n\n" +
        "Keyingi savolni qo'shish yoki testni tugatish uchun tanlang:";

      const nextStepButtons = Markup.inlineKeyboard([
        [
          Markup.button.callback("➕ Keyingi savol", "add_next_question"),
          Markup.button.callback("🏁 Testni tugatish", "finish_test"),
        ],
      ]);

      await ctx.reply(nextStepText, nextStepButtons);

      ctx.session.currentStep = "nextQuestion";
    } catch (error) {
      console.error("Handle written answer error:", error);
      await ctx.reply("Xatolik yuz berdi.");
    }
  }

  // To'g'ri javobni qabul qilish (callback orqali)
  static async handleCorrectAnswerCallback(ctx) {
    try {
      const callbackData = ctx.callbackQuery.data;
      const [, answer, questionNumber] = callbackData.split("_");

      // Javob raqamini aniqlash (A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7)
      const correctAnswer = answer.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7

      // Savolni saqlash
      const questionData = {
        questionNumber: parseInt(questionNumber),
        questionType: "multiple_choice",
        correctAnswer: correctAnswer,
        variantCount: ctx.session.currentVariantCount || 4, // Default 4 ta variant
      };

      ctx.session.testData.questions.push(questionData);
      ctx.session.questionIndex++;

      // Callback query ni javoblash
      await ctx.answerCbQuery(`✅ Variantli savol ${questionNumber} saqlandi!`);

      const nextStepText =
        `✅ Variantli savol ${questionNumber} saqlandi!\n\n` +
        `To'g'ri javob: ${answer}\n` +
        `Variantlar soni: ${ctx.session.currentVariantCount} ta\n\n` +
        "Keyingi savolni qo'shish yoki testni tugatish uchun tanlang:";

      const nextStepButtons = Markup.inlineKeyboard([
        [
          Markup.button.callback("➕ Keyingi savol", "add_next_question"),
          Markup.button.callback("🏁 Testni tugatish", "finish_test"),
        ],
      ]);

      await ctx.reply(nextStepText, nextStepButtons);

      ctx.session.currentStep = "nextQuestion";
    } catch (error) {
      console.error("Handle correct answer callback error:", error);
      await ctx.answerCbQuery("Xatolik yuz berdi!");
    }
  }

  // Testni tugatish
  static async finishTestCreation(ctx) {
    try {
      const testData = ctx.session.testData;
      const user = ctx.state.user;

      if (testData.questions.length < 1) {
        await ctx.reply(
          "Testda kamida 1 savol bo'lishi kerak.\n\n" +
            "Iltimos, avval savol qo'shing:"
        );

        // Avtomatik ravishda birinchi savolni boshlash
        await AdminController.startNextQuestion(ctx);
        return;
      }

      // Testni saqlash
      console.log("Test ma'lumotlari:", testData);
      const test = new Test({
        ...testData,
        createdBy: user._id,
      });

      await test.save();
      console.log("Test saqlandi:", test._id);

      // Session tozalash
      ctx.session = {};

      await ctx.reply(
        `🎉 **Test muvaffaqiyatli yaratildi!**\n\n` +
          `📝 **Nomi:** ${test.title}\n` +
          `📚 **Fan:** ${test.subject}\n` +
          `❓ **Savollar:** ${test.questions.length}\n` +
          `⏱ **Vaqt:** ${test.timeLimit} daqiqa\n\n` +
          "Test foydalanuvchilar uchun mavjud!",
        adminMenu
      );
    } catch (error) {
      console.error("Finish test creation error:", error);
      await ctx.reply("Xatolik yuz berdi.");
    }
  }

  // Keyingi savolni avtomatik boshlash
  static async startNextQuestion(ctx) {
    try {
      // Avtomatik ravishda keyingi savol raqamini hisoblash
      const nextQuestionNumber = ctx.session.testData.questions.length + 1;
      ctx.session.currentQuestionNumber = nextQuestionNumber;
      ctx.session.currentStep = "questionType";

      // Progress ko'rsatish
      const progressText = `📊 **Progress:** ${ctx.session.testData.questions.length} savol qo'shildi\n\n`;

      const questionText =
        progressText +
        `📝 **Savol ${nextQuestionNumber}**\n\n` +
        "Bu savol qanday turda bo'ladi?\n\n" +
        "Variantli savol yoki yozma savol tanlang:";

      const typeButtons = Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "📋 Variantli savol",
            `type_multiple_${nextQuestionNumber}`
          ),
          Markup.button.callback(
            "✍️ Yozma savol",
            `type_written_${nextQuestionNumber}`
          ),
        ],
      ]);

      await ctx.reply(questionText, typeButtons);
    } catch (error) {
      console.error("Start next question error:", error);
      await ctx.reply("Xatolik yuz berdi.");
    }
  }

  // Testlar ro'yxatini ko'rsatish
  static async showTestsList(ctx) {
    try {
      const tests = await Test.find().sort({ createdAt: -1 });

      console.log(
        "Barcha testlar:",
        tests.map((t) => ({
          title: t.title,
          subject: t.subject,
          isActive: t.isActive,
        }))
      );

      if (tests.length === 0) {
        await ctx.reply("Hali hech qanday test yaratilmagan.");
        return;
      }

      let testsText = "📋 **Mavjud testlar:**\n\n";

      tests.forEach((test, index) => {
        const status = test.isActive ? "✅" : "❌";
        testsText += `${status} **${index + 1}. ${test.title}**\n`;
        testsText += `📚 ${test.subject}\n`;
        testsText += `❓ ${test.questions.length} savol\n`;
        testsText += `⏱ ${test.timeLimit} daqiqa\n`;
        testsText += `📅 ${test.createdAt.toLocaleDateString("uz-UZ")}\n\n`;
      });

      await ctx.reply(testsText, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("Show tests list error:", error);
      await ctx.reply("Xatolik yuz berdi.");
    }
  }

  // Fanlar ro'yxatini ko'rsatish
  static async showSubjectsList(ctx) {
    try {
      console.log("showSubjectsList chaqirildi");

      const subjects = await Subject.find().sort({ name: 1 });
      console.log("Bazadan olingan fanlar soni:", subjects.length);

      console.log(
        "Barcha fanlar:",
        subjects.map((s) => ({
          name: s.name,
          isActive: s.isActive,
          id: s._id,
        }))
      );

      if (subjects.length === 0) {
        console.log("Hech qanday fan topilmadi");
        await ctx.reply("Hali hech qanday fan qo'shilmagan.");
        return;
      }

      // Store subjects in session for deletion
      if (!ctx.session) {
        ctx.session = {};
      }
      ctx.session.availableSubjects = subjects;

      // Send header message
      await ctx.reply("📚 **Mavjud fanlar:**", { parse_mode: "Markdown" });

      // Send each subject as a separate message with its own delete button
      for (let i = 0; i < subjects.length; i++) {
        const subject = subjects[i];
        const status = subject.isActive ? "✅" : "❌";

        let subjectText = `${status} **${i + 1}. ${subject.name}**\n`;
        if (subject.description) {
          subjectText += `📝 ${subject.description}\n`;
        }
        subjectText += `📅 ${subject.createdAt.toLocaleDateString("uz-UZ")}`;

        // Create delete button for this specific subject
        const deleteButton = Markup.inlineKeyboard([
          [
            Markup.button.callback(
              `🗑️ ${subject.name} ni o'chirish`,
              `delete_subject_${subject._id}`
            ),
          ],
        ]);

        await ctx.reply(subjectText, {
          parse_mode: "Markdown",
          ...deleteButton,
        });
      }

      // Send back button as separate message
      const backButton = Markup.inlineKeyboard([
        [Markup.button.callback("🔙 Orqaga", "back_to_admin")],
      ]);

      await ctx.reply("Boshqa amallar uchun:", { ...backButton });
      console.log("Fanlar ro'yxati muvaffaqiyatli yuborildi");
    } catch (error) {
      console.error("Show subjects list error:", error);
      await ctx.reply(
        "Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
        adminMenu
      );
    }
  }

  // Foydalanuvchilar ro'yxatini ko'rsatish
  static async showUsers(ctx) {
    try {
      const users = await User.find().sort({ createdAt: -1 });

      if (users.length === 0) {
        await ctx.reply("Hali hech qanday foydalanuvchi ro'yxatdan o'tmagan.");
        return;
      }

      let usersText = "👥 **Foydalanuvchilar:**\n\n";

      users.slice(0, 10).forEach((user, index) => {
        usersText += `**${index + 1}. ${user.firstName} ${user.lastName}**\n`;
        usersText += `📱 ${user.phoneNumber}\n`;
        usersText += `📊 ${user.testResults.length} test yechgan\n`;
        usersText += `📅 ${user.createdAt.toLocaleDateString("uz-UZ")}\n\n`;
      });

      if (users.length > 10) {
        usersText += `... va yana ${users.length - 10} foydalanuvchi`;
      }

      await ctx.reply(usersText, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("Show users error:", error);
      await ctx.reply("Xatolik yuz berdi.");
    }
  }

  // Umumiy statistika
  static async showStatistics(ctx) {
    try {
      const totalUsers = await User.countDocuments();
      const totalTests = await Test.countDocuments();
      const activeTests = await Test.countDocuments({ isActive: true });
      const totalResults = await User.aggregate([
        { $unwind: "$testResults" },
        { $count: "total" },
      ]);

      const totalResultsCount =
        totalResults.length > 0 ? totalResults[0].total : 0;

      const statsText =
        "📊 **Umumiy statistika:**\n\n" +
        `👥 **Foydalanuvchilar:** ${totalUsers}\n` +
        `📝 **Jami testlar:** ${totalTests}\n` +
        `✅ **Faol testlar:** ${activeTests}\n` +
        `📊 **Yechilgan testlar:** ${totalResultsCount}\n\n` +
        `📈 **O'rtacha:** ${
          totalUsers > 0 ? Math.round(totalResultsCount / totalUsers) : 0
        } test/foydalanuvchi`;

      await ctx.reply(statsText, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("Show statistics error:", error);
      await ctx.reply("Xatolik yuz berdi.");
    }
  }

  // Fan qo'shish
  static async startAddSubject(ctx) {
    try {
      if (!ctx.session) {
        ctx.session = {};
      }

      ctx.session.addingSubject = true;
      ctx.session.currentStep = "subjectName";

      await ctx.reply(
        "📚 **Yangi fan qo'shish**\n\n" +
          "Fan nomini kiriting (masalan: Matematika, Fizika, Kimyo):"
      );
    } catch (error) {
      console.error("Start add subject error:", error);
      await ctx.reply("Xatolik yuz berdi.");
    }
  }

  // Fan nomini qabul qilish
  static async handleSubjectName(ctx) {
    try {
      const subjectName = ctx.message.text.trim();

      // Fan nomini tozalash
      const cleanSubjectName = subjectName
        .replace(/[^\w\s\u0400-\u04FF]/g, "")
        .trim();

      if (cleanSubjectName.length < 2) {
        await ctx.reply("Fan nomi kamida 2 harf bo'lishi kerak:");
        return;
      }

      // Fan mavjudligini tekshirish
      const existingSubject = await Subject.findOne({ name: cleanSubjectName });
      if (existingSubject) {
        await ctx.reply(
          `❌ **"${cleanSubjectName}"** fan allaqachon mavjud!\n\n` +
            "Boshqa fan nomi kiriting yoki mavjud fanni ishlatish uchun test yarating.",
          { parse_mode: "Markdown" }
        );
        return;
      }

      // Fan ma'lumotlarini saqlash
      ctx.session.newSubject = cleanSubjectName;

      const confirmText = `✅ **"${cleanSubjectName}"** fanini qo'shish uchun tasdiqlang`;

      const confirmButtons = Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "✅ Tasdiqlash",
            `confirm_subject_${cleanSubjectName}`
          ),
        ],
        [Markup.button.callback("❌ Bekor qilish", "cancel_subject")],
      ]);

      await ctx.reply(confirmText, {
        parse_mode: "Markdown",
        ...confirmButtons,
      });
    } catch (error) {
      console.error("Handle subject name error:", error);
      await ctx.reply("Xatolik yuz berdi.");
    }
  }

  // Fan tasdiqlash
  static async handleSubjectConfirm(ctx) {
    try {
      const callbackData = ctx.callbackQuery.data;
      const subjectName = callbackData.replace("confirm_subject_", "");
      const user = ctx.state.user;

      // Callback query ni javoblash
      await ctx.answerCbQuery(`✅ "${subjectName}" fan tasdiqlandi!`);

      // Yangi fan yaratish
      const newSubject = new Subject({
        name: subjectName,
        description: "",
        createdBy: user._id,
      });

      await newSubject.save();
      console.log("Yangi fan yaratildi:", {
        name: subjectName,
        id: newSubject._id,
      });

      // Session tozalash
      ctx.session = {};

      const successText =
        `✅ **"${subjectName}"** fan muvaffaqiyatli qo'shildi!\n\n` +
        "Endi bu fan bo'yicha test yaratishingiz mumkin.";

      const testButton = Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "➕ Yangi test qo'shish",
            "create_test_after_subject"
          ),
        ],
      ]);

      await ctx.reply(successText, {
        parse_mode: "Markdown",
        ...testButton,
      });
    } catch (error) {
      console.error("Handle subject confirm error:", error);
      await ctx.answerCbQuery("Xatolik yuz berdi!");
    }
  }

  // Fan bekor qilish
  static async handleSubjectCancel(ctx) {
    try {
      // Callback query ni javoblash
      await ctx.answerCbQuery("❌ Fan qo'shish bekor qilindi!");

      // Session tozalash
      ctx.session = {};

      await ctx.reply(
        "❌ Fan qo'shish bekor qilindi.\n\n" +
          "Yangi fan qo'shish uchun \"📚 Fan qo'shish\" tugmasini bosing.",
        adminMenu
      );
    } catch (error) {
      console.error("Handle subject cancel error:", error);
      await ctx.answerCbQuery("Xatolik yuz berdi!");
    }
  }

  // Fan o'chirish
  static async handleSubjectDelete(ctx) {
    try {
      // Ensure session exists
      if (!ctx.session) {
        ctx.session = {};
      }

      const callbackData = ctx.callbackQuery.data;
      const subjectId = callbackData.replace("delete_subject_", "");

      // Fan ma'lumotlarini olish
      const subject = await Subject.findById(subjectId);

      if (!subject) {
        await ctx.answerCbQuery("❌ Fan topilmadi!");
        return;
      }

      // Bu fan bo'yicha testlar mavjudligini tekshirish
      const testsInSubject = await Test.find({ subject: subject.name });

      if (testsInSubject.length > 0) {
        await ctx.answerCbQuery(
          "❌ Bu fan bo'yicha testlar mavjud! Avval testlarni o'chiring."
        );
        return;
      }

      // Fan o'chirish
      await Subject.findByIdAndDelete(subjectId);

      // Callback query ni javoblash
      await ctx.answerCbQuery(`✅ "${subject.name}" fan o'chirildi!`);

      // Yangilangan fanlar ro'yxatini ko'rsatish
      await AdminController.showSubjectsList(ctx);
    } catch (error) {
      console.error("Handle subject delete error:", error);
      await ctx.answerCbQuery("❌ Fan o'chirishda xatolik yuz berdi!");
    }
  }

  // Test yaratish jarayonida fan tanlash
  static async handleSubjectSelection(ctx) {
    try {
      const callbackData = ctx.callbackQuery.data;
      const subjectId = callbackData.replace("select_subject_", "");

      // Fan ma'lumotlarini olish
      const subject = await Subject.findById(subjectId);

      if (!subject) {
        await ctx.answerCbQuery("❌ Fan topilmadi!");
        return;
      }

      // Test ma'lumotlariga fan nomini saqlash
      ctx.session.testData.subject = subject.name;
      ctx.session.currentStep = "description";

      // Callback query ni javoblash
      await ctx.answerCbQuery(`✅ "${subject.name}" fan tanlandi!`);

      await ctx.reply(
        "Test haqida qisqacha ma'lumot kiriting (ixtiyoriy):\n\n" +
          "Agar ma'lumot bermoqchi bo'lmasangiz \"O'tkazib yuborish\" deb yozing."
      );
    } catch (error) {
      console.error("Handle subject selection error:", error);
      await ctx.answerCbQuery("❌ Fan tanlashda xatolik yuz berdi!");
    }
  }

  // Test yaratishni bekor qilish
  static async cancelTestCreation(ctx) {
    try {
      // Callback query ni javoblash
      await ctx.answerCbQuery("❌ Test yaratish bekor qilindi!");

      // Session tozalash
      ctx.session = {};

      await ctx.reply(
        "❌ Test yaratish bekor qilindi.\n\n" +
          'Yangi test yaratish uchun "➕ Yangi test qo\'shish" tugmasini bosing.',
        adminMenu
      );
    } catch (error) {
      console.error("Cancel test creation error:", error);
      await ctx.answerCbQuery("❌ Xatolik yuz berdi!");
    }
  }

  // Test natijalarini PDF formatda yuklab olish
  static async downloadTestResultsPDF(ctx) {
    try {
      // Barcha test natijalarini olish
      const users = await User.find({
        "testResults.0": { $exists: true },
      }).populate("testResults.testId");

      if (users.length === 0) {
        await ctx.reply("Hali hech qanday test natijasi mavjud emas.");
        return;
      }

      // Test natijalarini formatlash - foydalanuvchilar bo'yicha guruhlash
      const testResults = [];
      const userResults = new Map(); // Foydalanuvchilar bo'yicha guruhlash uchun
      let testInfo = { title: "Barcha testlar", subject: "Umumiy" };

      users.forEach((user) => {
        user.testResults.forEach((result) => {
          if (result.testId) {
            const test = result.testId;
            testInfo = { title: test.title, subject: test.subject };

            // Rash modeli bo'yicha ball hisoblash
            const percentage =
              result.adjustedScore ||
              result.percentage ||
              Math.round((result.score / result.totalQuestions) * 100);

            // Baholash tizimi
            const getGrade = (percentage) => {
              if (percentage >= 70) return "A+";
              if (percentage >= 65) return "A";
              if (percentage >= 60) return "B+";
              if (percentage >= 55) return "B";
              if (percentage >= 50) return "C+";
              if (percentage >= 46) return "C";
              return "F";
            };

            const userName = `${user.firstName} ${user.lastName}`;

            // Foydalanuvchi bo'yicha guruhlash
            if (!userResults.has(userName)) {
              userResults.set(userName, {
                userName: userName,
                testsTaken: 0,
                totalScore: 0,
                bestScore: 0,
                bestGrade: "F",
                lastTestDate: null,
                averageScore: 0,
                totalAbility: 0,
                averageAbility: 0,
              });
            }

            const userData = userResults.get(userName);
            userData.testsTaken++;
            userData.totalScore += percentage;
            userData.averageScore = Math.round(
              userData.totalScore / userData.testsTaken
            );

            // Rash modeli qobiliyatini hisoblash
            const userAbility = result.userAbility || 0;
            if (!userData.totalAbility) userData.totalAbility = 0;
            userData.totalAbility += userAbility;
            userData.averageAbility =
              Math.round((userData.totalAbility / userData.testsTaken) * 100) /
              100;

            // Eng yaxshi natijani saqlash
            if (percentage > userData.bestScore) {
              userData.bestScore = percentage;
              userData.bestGrade = result.grade || getGrade(percentage);
            }

            // Eng so'nggi test sanasini saqlash
            if (
              !userData.lastTestDate ||
              result.completedAt > userData.lastTestDate
            ) {
              userData.lastTestDate = result.completedAt;
            }
          }
        });
      });

      // Guruhlangan natijalarni array ga o'tkazish
      userResults.forEach((userData) => {
        testResults.push({
          userName: userData.userName,
          testsTaken: userData.testsTaken,
          averageScore: userData.averageScore,
          bestScore: userData.bestScore,
          bestGrade: userData.bestGrade,
          lastTestDate: userData.lastTestDate,
          averageAbility: userData.averageAbility || 0,
        });
      });

      // Natijalarni eng yaxshi ball bo'yicha saralash (yuqoridan pastga)
      testResults.sort((a, b) => b.bestScore - a.bestScore);

      // PDF yaratish
      await ctx.reply("📊 PDF yaratilmoqda...");

      const { pdfBuffer } = await PDFGenerator.generateTestResultsPDF(
        testResults,
        testInfo
      );

      // PDF faylni yuborish (Telegram serveriga saqlash)
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `test_results_${timestamp}.pdf`;

      await ctx.replyWithDocument(
        { source: pdfBuffer, filename: filename },
        {
          caption:
            `📊 **Test natijalari**\n\n` +
            `📝 Test: ${testInfo.title}\n` +
            `📚 Fan: ${testInfo.subject}\n` +
            `👥 Jami foydalanuvchilar: ${testResults.length}\n` +
            `📅 Sana: ${new Date().toLocaleDateString("uz-UZ")}`,
        }
      );
    } catch (error) {
      console.error("Download PDF error:", error);
      await ctx.reply(
        "PDF yaratishda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring."
      );
    }
  }
}

module.exports = AdminController;
