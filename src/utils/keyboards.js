const { Markup } = require("telegraf");

// Asosiy menyu
const mainMenu = Markup.keyboard([
  ["📝 Test yechish", "📊 Natijalarim"],
  ["ℹ️ Yordam"],
]).resize();

// Admin menyu
const adminMenu = Markup.keyboard([
  ["➕ Yangi test qo'shish", "📚 Fan qo'shish"],
  ["📚 Fanlar ro'yxati", "📋 Testlar ro'yxati"],
  ["👥 Foydalanuvchilar", "📊 Umumiy statistika"],
  ["📄 Natijalarni yuklash"],
  ["🔙 Asosiy menyu"],
]).resize();

// Statik fan menyu (fallback uchun)
const staticSubjectMenu = Markup.keyboard([
  ["📚 Matematika", "🔬 Fizika"],
  ["🧪 Kimyo", "🌍 Geografiya"],
  ["📖 Tarix", "🔙 Orqaga"],
]).resize();

// Dinamik fan tugmalarini yaratish
const createSubjectMenu = (subjects) => {
  if (!subjects || subjects.length === 0) {
    return staticSubjectMenu;
  }

  const buttons = [];
  const maxButtonsPerRow = 2;

  for (let i = 0; i < subjects.length; i += maxButtonsPerRow) {
    const row = subjects.slice(i, i + maxButtonsPerRow);
    buttons.push(row);
  }

  // Orqaga tugmasi
  buttons.push(["🔙 Orqaga"]);

  return Markup.keyboard(buttons).resize();
};

// Test tanlash
const testSelectionMenu = (tests) => {
  const buttons = tests.map((test) => [test.title]);
  buttons.push(["🔙 Orqaga"]);
  return Markup.keyboard(buttons).resize();
};

// Testni boshlash
const startTestMenu = Markup.keyboard([
  ["✅ Testni boshlash"],
  ["🔙 Orqaga"],
]).resize();

// Javob variantlari tugmalari
const answerKeyboard = Markup.keyboard([
  ["A", "B"],
  ["C", "D"],
  ["⏭️ O'tkazib yuborish"],
]).resize();

// Test tugagandan keyin
const afterTestMenu = Markup.keyboard([
  ["📊 Natijani ko'rish"],
  ["🔄 Boshqa test"],
  ["🏠 Bosh menyu"],
]).resize();

// Telefon raqamni yuborish tugmasi
const phoneKeyboard = Markup.keyboard([
  [Markup.button.contactRequest("📱 Telefon raqamni yuborish")],
]).resize();

// Admin test yaratish
const adminTestCreationMenu = Markup.keyboard([
  ["✅ Testni saqlash"],
  ["❌ Bekor qilish"],
]).resize();

// Inline tugmalar
const inlineMainMenu = Markup.inlineKeyboard([
  [Markup.button.callback("📝 Test yechish", "take_test")],
  [Markup.button.callback("📊 Natijalarim", "my_results")],
  [Markup.button.callback("ℹ️ Yordam", "help")],
]);

const inlineAdminMenu = Markup.inlineKeyboard([
  [Markup.button.callback("➕ Yangi test", "create_test")],
  [Markup.button.callback("📋 Testlar", "list_tests")],
  [Markup.button.callback("👥 Foydalanuvchilar", "users")],
  [Markup.button.callback("📊 Statistika", "statistics")],
]);

module.exports = {
  mainMenu,
  adminMenu,
  staticSubjectMenu,
  createSubjectMenu,
  testSelectionMenu,
  startTestMenu,
  answerKeyboard,
  afterTestMenu,
  phoneKeyboard,
  adminTestCreationMenu,
  inlineMainMenu,
  inlineAdminMenu,
};
