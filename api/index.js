const { Telegraf, session } = require("telegraf");
require("dotenv").config();

// Bot yaratish
const bot = new Telegraf(process.env.BOT_TOKEN || "dummy-token");

// Session middleware
bot.use(session());

// Start command
bot.start(async (ctx) => {
  await ctx.reply("Bot ishlayapti! 🚀");
});

// Error handler
bot.catch((err, ctx) => {
  console.error(`Bot error:`, err);
});

// Vercel serverless function handler
module.exports = async (req, res) => {
  console.log("Request received:", req.method, req.url);
  
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle OPTIONS request
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Handle GET request for health check
  if (req.method === "GET") {
    res.status(200).json({
      status: "Bot is running",
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      hasBotToken: !!process.env.BOT_TOKEN,
      hasMongoUri: !!process.env.MONGODB_URI,
    });
    return;
  }

  try {
    // Bot webhook handler
    if (req.method === "POST") {
      console.log("Received webhook update:", req.body);
      
      if (!req.body) {
        console.log("No request body received");
        res.status(400).json({ error: "No request body" });
        return;
      }
      
      if (!process.env.BOT_TOKEN) {
        console.log("BOT_TOKEN not found");
        res.status(500).json({ error: "Bot token not configured" });
        return;
      }
      
      await bot.handleUpdate(req.body);
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
