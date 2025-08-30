const User = require("../models/User");
const { mainMenu, phoneKeyboard } = require("../utils/keyboards");

class UserController {
  static async startRegistration(ctx) {
    try {
      const user = ctx.state.user;

      if (user.phoneNumber) {
        await ctx.reply("Siz allaqachon ro'yxatdan o'tgansiz!", mainMenu);
        return;
      }

      await ctx.reply(
        "Test botiga xush kelibsiz! 👋\n\n" +
          "Test yechish uchun avval ma'lumotlaringizni kiriting.\n\n" +
          "Iltimos, ismingizni kiriting:"
      );

      ctx.session = { registrationStep: "firstName" };
    } catch (error) {
      console.error("Start registration error:", error);
      await ctx.reply("Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
    }
  }

  // Ism kiritish
  static async handleFirstName(ctx) {
    try {
      const firstName = ctx.message.text.trim();

      if (firstName.length < 2) {
        await ctx.reply("Iltimos, to'g'ri ism kiriting (kamida 2 harf):");
        return;
      }

      ctx.session.firstName = firstName;
      ctx.session.registrationStep = "lastName";

      await ctx.reply("Endi familiyangizni kiriting:");
    } catch (error) {
      console.error("Handle first name error:", error);
      await ctx.reply("Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
    }
  }

  // Familiya kiritish
  static async handleLastName(ctx) {
    try {
      const lastName = ctx.message.text.trim();

      if (lastName.length < 2) {
        await ctx.reply("Iltimos, to'g'ri familiya kiriting (kamida 2 harf):");
        return;
      }

      ctx.session.lastName = lastName;
      ctx.session.registrationStep = "phoneNumber";

      await ctx.reply(
        "Endi telefon raqamingizni yuboring:\n\n" +
          "📱 Quyidagi tugmani bosing:",
        phoneKeyboard
      );
    } catch (error) {
      console.error("Handle last name error:", error);
      await ctx.reply("Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
    }
  }

  // Telefon raqam olish
  static async handlePhoneNumber(ctx) {
    try {
      let phoneNumber = "";

      // Contact orqali yuborilgan bo'lsa
      if (ctx.message.contact) {
        phoneNumber = ctx.message.contact.phone_number;
      }
      // Text orqali yuborilgan bo'lsa
      else if (ctx.message.text) {
        phoneNumber = ctx.message.text.trim();
      }

      if (!phoneNumber) {
        await ctx.reply(
          "Iltimos, telefon raqamingizni yuboring:",
          phoneKeyboard
        );
        return;
      }

      // Telefon raqamni validatsiya qilish
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phoneNumber.replace(/\s/g, ""))) {
        await ctx.reply(
          "Iltimos, to'g'ri telefon raqam kiriting (masalan: +998901234567):",
          phoneKeyboard
        );
        return;
      }

      // Foydalanuvchi ma\'lumotlarini yangilash
      const user = ctx.state.user;
      user.firstName = ctx.session.firstName;
      user.lastName = ctx.session.lastName;
      user.phoneNumber = phoneNumber;
      await user.save();

      // Session tozalash
      ctx.session = {};

      await ctx.reply(
        "✅ Ro'yxatdan o'tish muvaffaqiyatli yakunlandi!\n\n" +
          `👤 Ism: ${user.firstName}\n` +
          `📱 Telefon: ${user.phoneNumber}\n\n` +
          "Endi test yechishni boshlashingiz mumkin!",
        mainMenu
      );
    } catch (error) {
      console.error("Handle phone number error:", error);
      await ctx.reply("Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
    }
  }

  // Profil ma\'lumotlari
  static async showProfile(ctx) {
    try {
      const user = ctx.state.user;

      const profileText =
        "👤 **Profil ma'lumotlari:**\n\n" +
        `📝 **Ism:** ${user.firstName}\n` +
        `📝 **Familiya:** ${user.lastName}\n` +
        `📱 **Telefon:** ${user.phoneNumber}\n` +
        `📊 **Yechilgan testlar:** ${user.testResults.length}\n` +
        `📅 **Ro\'yxatdan o\'tgan sana:** ${user.createdAt.toLocaleDateString(
          "uz-UZ"
        )}`;

      await ctx.reply(profileText, { parse_mode: "Markdown" });
      await ctx.reply("Boshqa amallar uchun tanlang:", mainMenu);
    } catch (error) {
      console.error("Show profile error:", error);
      await ctx.reply("Xatolik yuz berdi.", mainMenu);
    }
  }

  // Yordam
  static async showHelp(ctx) {
    try {
      const helpText =
        "🤖 **Test Bot Yordam**\n\n" +
        "📝 **Test yechish:** Turli fanlar bo'yicha testlarni yeching\n" +
        "📊 **Natijalarim:** Yechgan testlaringiz natijalarini ko'ring\n" +
        "📱 **Profil:** Shaxsiy ma'lumotlaringizni ko'ring\n\n" +
        "💡 **Maslahatlar:**\n" +
        "• Test yechishda tinch o'tiring\n" +
        "• Har bir savolni diqqat bilan o'qing\n" +
        "• Vaqtingizni to'g'ri taqsimlang\n\n" +
        "❓ Savollaringiz bo'lsa, admin bilan bog'laning.";

      await ctx.reply(helpText, { parse_mode: "Markdown" });
      await ctx.reply("Boshqa amallar uchun tanlang:", mainMenu);
    } catch (error) {
      console.error("Show help error:", error);
      await ctx.reply("Xatolik yuz berdi.", mainMenu);
    }
  }
}

module.exports = UserController;
