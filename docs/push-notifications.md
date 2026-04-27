# Real-Time Notifications: RTM + Slack Events API + ntfy

## Overview

BBSlack uses two notification mechanisms:

- **Foreground (app open):** Slack RTM WebSocket for instant message delivery
- **Background (app closed):** Slack Events API → Vercel serverless function → ntfy push notification → BB Q20

```
FOREGROUND (app open)
  BBSlack App ←──WebSocket──→ Slack RTM API

BACKGROUND (app closed)
  Slack Workspace
      │ Events API (webhook)
      ▼
  Vercel Serverless Function
      │ HTTP POST
      ▼
  ntfy.sh (or self-hosted)
      │ push
      ▼
  ntfy Android app on BB Q20
```

## Part 1: In-App RTM (automatic)

RTM connects automatically after login. No setup required. The Settings screen shows the RTM connection status under "About > Real-time".

When RTM is connected:
- Messages arrive instantly in open chats
- Channel polling slows to 5 minutes (safety net)
- Chat/thread polling slows to 60 seconds (safety net)

When RTM disconnects (network issues), the app automatically:
- Reverts to normal polling intervals
- Attempts reconnection with exponential backoff (1s → 2s → 4s → ... → 30s max)

On Android, RTM disconnects when the app goes to background and reconnects on foreground.

## Part 2: Background Push Notifications

### Step 1: Create a Slack App

1. Go to https://api.slack.com/apps and click **Create New App**
2. Choose **From scratch**, name it (e.g., "BBSlack Push"), select your workspace
3. Go to **Event Subscriptions** and toggle **Enable Events** on
4. For **Request URL**, you'll set this after deploying (Step 2)
5. Under **Subscribe to bot events**, add:
   - `message.channels` — messages in public channels
   - `message.groups` — messages in private channels
   - `message.im` — direct messages
   - `message.mpim` — group DMs
6. Go to **OAuth & Permissions** and add these **Bot Token Scopes**:
   - `channels:history`
   - `groups:history`
   - `im:history`
   - `mpim:history`
7. Install the app to your workspace
8. Note the **Signing Secret** from **Basic Information** page

### Step 2: Deploy Vercel Relay

```bash
cd server
npx vercel
```

Follow the prompts to set up the project.

Set environment variables in the Vercel dashboard or via CLI:

```bash
npx vercel env add SLACK_SIGNING_SECRET    # From Slack app > Basic Information
npx vercel env add NTFY_TOPIC              # Your ntfy topic name (e.g., bbslack-abc123)
npx vercel env add SLACK_USER_ID           # Your Slack user ID (found in profile)
```

Deploy to production:

```bash
npx vercel --prod
```

Copy the deployment URL (e.g., `https://bbslack-push.vercel.app`).

### Step 3: Connect Slack to Vercel

1. Go back to your Slack app's **Event Subscriptions**
2. Set the **Request URL** to: `https://<your-deployment>.vercel.app/api/slack/events`
3. Slack will send a challenge request — if the function is deployed correctly, it will verify automatically
4. Save changes

### Step 4: Set Up ntfy

**Option A: Use ntfy.sh (free, easiest)**

Choose a random topic name (e.g., `bbslack-<random-string>`). This is what you set as `NTFY_TOPIC` in Vercel.

**Option B: Self-host ntfy**

See https://docs.ntfy.sh/install/ for self-hosting instructions. Update the ntfy URL in `server/api/slack/events.ts` to point to your instance.

### Step 5: Install ntfy on BB Q20

1. Download the ntfy APK from https://ntfy.sh/docs/subscribe/phone/
2. Install via ADB: `adb install ntfy-*.apk`
3. Open ntfy app
4. Tap **+** to subscribe to a topic
5. Enter your topic name (same as `NTFY_TOPIC`)
6. Notifications will now appear as system notifications

## Troubleshooting

### Slack challenge failing
- Verify the Vercel function is deployed: visit `https://<deployment>.vercel.app/api/slack/events` — should return "Method Not Allowed" for GET
- Check Vercel logs for errors

### Notifications not arriving via ntfy
- Verify `NTFY_TOPIC` matches between Vercel env and ntfy app subscription
- Test manually: `curl -d "test message" ntfy.sh/<your-topic>`
- Check that `SLACK_USER_ID` is set correctly (messages from yourself are filtered)

### RTM not connecting
- RTM requires the `rtm:stream` scope — this is available on classic Slack apps
- If using a new-style Slack app, RTM may not be available; the app falls back to polling
- Check Settings > About > Real-time for connection status

### RTM keeps disconnecting
- This is normal on unreliable networks — the client reconnects automatically
- On Android, RTM intentionally disconnects in background to save battery
