# Clashvip Bot - Configuration Guide

## Required Environment Variables (.env file)

```env
# Discord Bot Token (Required)
# Get from: https://discord.com/developers/applications
DISCORD_TOKEN=your_discord_bot_token_here

# MongoDB Connection URI (Required)
# Local: mongodb://localhost:27017/clashvip
# Atlas: mongodb+srv://username:password@cluster.mongodb.net/clashvip
MONGO_URI=your_mongodb_connection_string_here

# Clash of Clans API Token (Required)
# Get from: https://developer.clashofclans.com/
CLASH_TOKEN="Bearer your_clash_api_token_here"

# Node Environment (Optional)
NODE_ENV=production
```

## Discord Configuration (config.json)

```json
{
    "ownerGuildID": "your_main_discord_server_id",
    "clientID": "your_discord_bot_client_id",
    "logChannels": {
        "newVerify": "channel_id_for_new_verifications",
        "crossVerify": "channel_id_for_cross_verifications"
    },
    "leaderboardContestID": "channel_id_for_leaderboard_contests",
    "mediumPermRolesID": ["role_id_1", "role_id_2"],
    "fullPermRolesID": ["admin_role_id_1", "admin_role_id_2", "admin_role_id_3"]
}
```

## How to Get Required IDs

### Discord Server ID (Guild ID):
1. Enable Developer Mode in Discord settings
2. Right-click your server name → Copy ID

### Discord Channel IDs:
1. Right-click the channel → Copy ID

### Discord Role IDs:
1. Right-click the role in Server Settings → Copy ID

### Discord Bot Client ID:
1. Go to Discord Developer Portal
2. Select your application → OAuth2 → General
3. Copy Client ID

## Bot Permissions Required:
- Administrator (recommended) OR:
  - Manage Roles
  - Manage Channels  
  - Send Messages
  - Use Slash Commands
  - Read Message History
  - Add Reactions
  - View Channels

## Clash of Clans API Setup:
1. Visit https://developer.clashofclans.com/
2. Create account and login
3. Create new API key
4. Add your server's IP address
5. Copy the token (include "Bearer " prefix)

## MongoDB Setup Options:

### Option 1: Local MongoDB
```bash
# Ubuntu/Debian installation
sudo apt-get install mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Connection string
MONGO_URI=mongodb://localhost:27017/clashvip
```

### Option 2: MongoDB Atlas (Recommended)
1. Visit https://www.mongodb.com/atlas
2. Create free account
3. Create new cluster
4. Get connection string
5. Replace password and database name

## Installation Commands:
```bash
# Install dependencies
npm install

# Deploy slash commands
node deploy-commands.js

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

---
**Replace all placeholder values with your actual configuration before running the bot.**