const User = require('../models/User');

const authMiddleware = async (ctx, next) => {
  try {
    const telegramId = ctx.from.id;
    let user = await User.findOne({ telegramId });
    
    if (!user) {
      // Yangi foydalanuvchi
      user = new User({
        telegramId,
        firstName: ctx.from.first_name || '',
        lastName: ctx.from.last_name || '',
        phoneNumber: ''
      });
      await user.save();
    }
    
    ctx.state.user = user;
    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    await ctx.reply('Xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.');
  }
};

const adminMiddleware = async (ctx, next) => {
  try {
    const user = ctx.state.user;
    const adminId = parseInt(process.env.ADMIN_ID);
    
    if (user.telegramId === adminId || user.isAdmin) {
      await next();
    } else {
      await ctx.reply('Bu funksiya faqat admin uchun mavjud.');
    }
  } catch (error) {
    console.error('Admin middleware error:', error);
    await ctx.reply('Xatolik yuz berdi.');
  }
};

module.exports = {
  authMiddleware,
  adminMiddleware
};
