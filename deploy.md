# Vercel Deployment Guide

## After deploying to Vercel, follow these steps:

### 1. Set Environment Variables in Vercel

Go to your Vercel project dashboard and add these environment variables:

- `BOT_TOKEN` - Your Telegram bot token from @BotFather
- `MONGODB_URI` - Your MongoDB connection string

### 2. Set the Webhook

After deployment, your bot will be available at: `https://your-project-name.vercel.app`

To set the webhook, make a POST request to:

```
https://your-project-name.vercel.app/set-webhook
```

You can do this using curl:

```bash
curl -X POST https://your-project-name.vercel.app/set-webhook
```

Or visit the URL in your browser and it will show the webhook status.

### 3. Test the Bot

Send a message to your bot on Telegram. It should respond properly.

### 4. Health Check

Visit `https://your-project-name.vercel.app` to see if the bot is running.

### 5. If you need to delete the webhook:

```bash
curl -X POST https://your-project-name.vercel.app/delete-webhook
```

## Troubleshooting

If you get a 500 error:

1. Check that all environment variables are set correctly
2. Verify your MongoDB connection string is valid
3. Check the Vercel function logs for specific error messages
4. Make sure your bot token is correct

## Local Development

For local development, you can still use:

```bash
npm run dev
```

This will run the bot in polling mode locally.
