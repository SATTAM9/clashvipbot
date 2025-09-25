<h1 align="center">
  <br>
  <a href="https://github.com/SATTAM9/clashvipbot"><img src="https://i.imgur.com/ozfC7Gy.png" width="100" height="100" alt="Clash VIP"></a>
  <br>
  Clashvip Bot
  <br>
</h1>

<h4 align="center">🏆 The ultimate Clash of Clans Discord bot for stat tracking and clan management</h4>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#commands">Commands</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#support">Support</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18.x+-green.svg" alt="Node.js">
  <img src="https://img.shields.io/badge/Discord.js-14.x-blue.svg" alt="Discord.js">
  <img src="https://img.shields.io/badge/MongoDB-Atlas-green.svg" alt="MongoDB">
</p>

---

## 🌟 Features

### 👤 **Player Statistics**
- 📊 Detailed player profiles with comprehensive stats
- 🏆 Trophy tracking and league information  
- 📈 Progress tracking over time
- 🎖️ Achievements and accomplishments

### 🏰 **Clan Management**  
- 🛡️ Complete clan information and statistics
- ⚔️ War performance tracking
- 🏅 Clan member leaderboards
- 📋 Member management tools

### 🔐 **Verification System**
- ✅ Secure player-to-Discord linking
- 🎭 Automatic role assignment
- 🔄 Cross-server verification support
- 🛡️ Anti-fraud protection

### 🏆 **Competitions & Leaderboards**
- 🥇 Dynamic leaderboards
- 📊 Performance analytics
- 🎯 Competition tracking
- 📈 Statistical comparisons

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or higher
- MongoDB Atlas account (or local MongoDB)
- Discord Bot Token
- Clash of Clans API Token

### Installation

```bash
# Clone the repository
git clone https://github.com/SATTAM9/clashvipbot.git
cd clashvipbot

# Install dependencies
npm install

# Copy configuration files
cp .env.copy .env
cp config.json.copy config.json  
cp emojis.json.copy emojis.json

# Configure your environment variables
nano .env

# Deploy slash commands
node deploy-commands.js

# Start the bot
npm start
```

### Environment Setup

Create your `.env` file:
```env
DISCORD_TOKEN=your_discord_bot_token_here
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/clashvip
CLASH_TOKEN="Bearer your_clash_api_token_here"
NODE_ENV=production
```

Configure `config.json`:
```json
{
  "ownerGuildID": "your_server_id",
  "clientID": "your_bot_client_id", 
  "logChannels": {
    "newVerify": "verification_log_channel_id",
    "crossVerify": "cross_verify_channel_id"
  },
  "leaderboardContestID": "leaderboard_channel_id",
  "mediumPermRolesID": ["moderator_role_id"],
  "fullPermRolesID": ["admin_role_id"]
}
```

---

## 🎮 Commands

### Player Commands
- `/profile show [tag]` - Display player statistics and information
- `/profile save <tag>` - Set your default Clash of Clans profile
- `/verify <tag>` - Link your Discord account to Clash of Clans

### Clan Commands
- `/clan <tag>` - Show comprehensive clan information
- `/leaderboard` - Display clan member rankings

### Competition Commands  
- `/compete join` - Join clan competitions
- `/compete leave` - Leave ongoing competitions
- `/leaderboard contest` - View competition standings

### Utility Commands
- `/help` - Show all available commands and usage
- `/info` - Display bot information and statistics  
- `/ping` - Check bot response time
- `/userinfo [user]` - Get Discord user information

---

## 🛠️ Deployment

### Production Deployment (Recommended)

Using PM2 for process management:

```bash
# Install PM2 globally
npm install -g pm2

# Start bot with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration  
pm2 save
pm2 startup

# Monitor bot status
pm2 status
pm2 logs clashvip
```

### Manual Deployment
```bash
# Start the bot directly
node index.js

# With auto-restart on crash
while true; do node index.js; sleep 5; done
```

### Docker Deployment
```bash
# Build Docker image
docker build -t clashvip-bot .

# Run container
docker run -d \
  --name clashvip \
  --restart unless-stopped \
  -v $(pwd)/.env:/app/.env \
  clashvip-bot
```

---

## 📋 API Setup

### 🤖 Discord Bot Setup
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create new application → Bot
3. Copy Bot Token and Client ID
4. Invite bot with `Bot` + `applications.commands` scopes

**Bot Invite URL:**
```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

### ⚔️ Clash of Clans API  
1. Visit [COC Developer Portal](https://developer.clashofclans.com/)
2. Create account and login
3. Create new API key with your server IP
4. Copy token (include "Bearer " prefix)

### 🗄️ MongoDB Setup
**Option 1: MongoDB Atlas (Recommended)**
1. Create free account at [MongoDB Atlas](https://mongodb.com/atlas)
2. Create cluster and database user
3. Get connection string

**Option 2: Local MongoDB**
```bash
# Install MongoDB locally
sudo apt-get install mongodb-org
sudo systemctl start mongod
```

---

## 📁 Project Structure

```
clashvipbot/
├── 📂 dao/                 # Database access layer
│   ├── clash/             # Clash of Clans API integration  
│   ├── mongo/             # MongoDB operations
│   └── microservices/     # External service integrations
├── 📂 service/            # Bot core services
│   ├── commands/          # Slash command handlers
│   └── events/            # Discord event handlers  
├── 📂 utils/              # Utility functions
│   ├── embeds/            # Discord embed builders
│   ├── buttons/           # Interactive button handlers
│   └── arguments/         # Command argument parsers
├── 📂 logs/               # Application logs
├── 📄 index.js            # Main bot entry point
├── 📄 deploy-commands.js  # Command deployment script
└── 📄 ecosystem.config.js # PM2 configuration
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

### Development Setup
```bash
# Clone and install
git clone https://github.com/SATTAM9/clashvipbot.git
cd clashvipbot
npm install

# Install development dependencies  
npm install --dev

# Run in development mode
npm run dev
```

---

## 📞 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/SATTAM9/clashvipbot/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/SATTAM9/clashvipbot/discussions)  
- 📧 **Contact**: [Developer Profile](https://github.com/SATTAM9)

---

## 📄 License

This project is licensed under the ISC License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Original Inspiration**: Wizard Bot project by Azer & Hawk Eye
- **APIs**: Clash of Clans API by Supercell
- **Framework**: Discord.js library
- **Database**: MongoDB Atlas
- **Deployment**: PM2 Process Manager

---

<div align="center">

### 🏆 Built with ❤️ for the Clash of Clans community

**Developed by [Clashvip](https://github.com/SATTAM9) | Powered by Node.js & Discord.js**

</div>