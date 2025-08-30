# 🤖 Telegram Test Bot

Bu bot foydalanuvchilarga turli fanlar bo'yicha test yechish imkonini beradi. Admin faqat to'g'ri javoblarni belgilaydi, savollarni qog'ozdan o'qib bot orqali kiritadi.

## ✨ Xususiyatlar

### 👤 Foydalanuvchilar uchun:

- 📝 Turli fanlar bo'yicha testlar yechish
- 📊 Natijalarni ko'rish va tahlil qilish
- 📱 Qulay interfeys va tugmalar
- 📈 Shaxsiy statistika

### 🔧 Admin uchun:

- ➕ Yangi testlar yaratish
- 📋 Mavjud testlarni boshqarish
- 👥 Foydalanuvchilar ro'yxatini ko'rish
- 📊 Umumiy statistika

## 🚀 O'rnatish

### Lokal o'rnatish

#### 1. Loyihani klonlash

```bash
git clone <repository-url>
cd bot
```

#### 2. Kerakli paketlarni o'rnatish

```bash
npm install
```

#### 3. MongoDB o'rnatish va ishga tushirish

```bash
# macOS uchun (Homebrew orqali)
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian uchun
sudo apt update
sudo apt install mongodb
sudo systemctl start mongodb
```

#### 4. Environment faylini sozlash

`.env` faylini tahrirlang:

```env
BOT_TOKEN=your_telegram_bot_token_here
MONGODB_URI=mongodb://localhost:27017/test_bot
ADMIN_ID=your_admin_telegram_id_here
```

#### 5. Telegram bot tokenini olish

1. [@BotFather](https://t.me/botfather) ga yozing
2. `/newbot` buyrug'ini yuboring
3. Bot nomini va username ni kiriting
4. Olingan tokeni `.env` faylida `BOT_TOKEN` ga yozing

#### 6. Admin ID ni olish

1. [@userinfobot](https://t.me/userinfobot) ga yozing
2. Olingan ID ni `.env` faylida `ADMIN_ID` ga yozing

#### 7. Ishga tushirish

```bash
# Development rejimida
npm run dev

# Production rejimida
npm start
```

### Vercel ga joylash

#### 1. Vercel hisobingizga kirish

- [Vercel](https://vercel.com) ga o'ting
- GitHub hisobingiz bilan tizimga kiring

#### 2. Loyihani import qilish

- "New Project" tugmasini bosing
- GitHub repositoryingizni tanlang
- Import tugmasini bosing

#### 3. Environment variables sozlash

Vercel dashboard da "Settings" > "Environment Variables" ga o'ting va quyidagilarni qo'shing:

```
BOT_TOKEN=your_telegram_bot_token_here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name
ADMIN_ID=your_admin_telegram_id_here
```

#### 4. Deploy qilish

- "Deploy" tugmasini bosing
- Joylash tugagandan so'ng, URL ni saqlang

#### 5. Webhook sozlash

Telegram bot webhook ni sozlash uchun quyidagi URL ga so'rov yuboring:

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-vercel-app.vercel.app/api
```

**Eslatma:** `<YOUR_BOT_TOKEN>` va `your-vercel-app.vercel.app` ni o'zingizning ma'lumotlaringiz bilan almashtiring.

#### 6. Tekshirish

Bot ishlayotganini tekshirish uchun:

- `https://your-vercel-app.vercel.app/api` ga GET so'rov yuboring
- Javobda `{"status": "Bot is running"}` ko'rishingiz kerak

## 📁 Loyiha strukturasi

```
bot/
├── config/
│   └── database.js          # Database ulanish sozlamalari
├── src/
│   ├── models/
│   │   ├── User.js          # Foydalanuvchi modeli
│   │   └── Test.js          # Test modeli
│   ├── controllers/
│   │   ├── userController.js # Foydalanuvchi boshqaruvi
│   │   ├── testController.js # Test boshqaruvi
│   │   └── adminController.js # Admin boshqaruvi
│   ├── middleware/
│   │   └── auth.js          # Autentifikatsiya middleware
│   ├── utils/
│   │   └── keyboards.js     # Telegram tugmalari
│   └── bot.js              # Asosiy bot fayli
├── .env                    # Environment o'zgaruvchilari
├── index.js               # Kirish nuqtasi
├── package.json           # Paket ma'lumotlari
└── README.md             # Hujjat
```

## 🎯 Foydalanish

### Foydalanuvchi uchun:

1. `/start` buyrug'ini yuboring
2. Ism va familiyangizni kiriting
3. Telefon raqamingizni yuboring
4. Test fani tanlang
5. Testni boshlang va javob bering

### Admin uchun:

1. `/admin` buyrug'ini yuboring
2. "➕ Yangi test qo'shish" ni tanlang
3. Test ma'lumotlarini kiriting
4. Savollarni qog'ozdan o'qib, to'g'ri javoblarni belgilang

## 🔧 Sozlamalar

### Test yaratish jarayoni:

1. **Test nomi** - Test uchun nom
2. **Fan** - Test fani (Matematika, Fizika, va h.k.)
3. **Tavsif** - Test haqida ma'lumot (ixtiyoriy)
4. **Vaqt chegarasi** - Test uchun vaqt (5-180 daqiqa)
5. **Savollar** - Har bir savol uchun:
   - Savol matni
   - 4 ta javob varianti
   - To'g'ri javob raqami

## 📊 Ma'lumotlar bazasi

### Collections:

- **users** - Foydalanuvchilar ma'lumotlari
- **tests** - Testlar va savollar

### User modeli:

```javascript
{
  telegramId: Number,
  firstName: String,
  lastName: String,
  phoneNumber: String,
  isAdmin: Boolean,
  currentTest: ObjectId,
  currentQuestionIndex: Number,
  testResults: Array
}
```

### Test modeli:

```javascript
{
  title: String,
  subject: String,
  description: String,
  questions: Array,
  timeLimit: Number,
  isActive: Boolean,
  createdBy: ObjectId
}
```

## 🛠 Texnologiyalar

- **Node.js** - Server-side JavaScript
- **Telegraf** - Telegram Bot API
- **MongoDB** - NoSQL ma'lumotlar bazasi
- **Mongoose** - MongoDB ODM
- **dotenv** - Environment o'zgaruvchilari

## 📝 API Endpoints

Bot quyidagi buyruqlarni qabul qiladi:

- `/start` - Bot ishga tushirish
- `/admin` - Admin paneliga kirish

## 🔒 Xavfsizlik

- Foydalanuvchi ma'lumotlari MongoDB da saqlanadi
- Admin faqat belgilangan ID orqali kirish qiladi
- Barcha ma'lumotlar validatsiya qilinadi

## 🐛 Xatoliklarni tuzatish

Agar bot ishlamasa:

1. MongoDB ishlayotganini tekshiring
2. `.env` faylidagi ma'lumotlarni tekshiring
3. Bot token to'g'ri ekanligini tekshiring
4. Console da xatolik xabarlarini ko'ring

## 📞 Yordam

Savollaringiz bo'lsa:

- GitHub Issues oching
- Telegram: @your_username

## 📄 Litsenziya

MIT License

---

**Eslatma:** Bu bot faqat o'quv maqsadlarida yaratilgan. Production da ishlatishdan oldin qo'shimcha xavfsizlik choralarini ko'ring.
