# دليل تشغيل بوت Clashvip - إعداد كامل

## المتطلبات الأساسية

### 1. إعداد Discord Bot
1. اذهب إلى [Discord Developer Portal](https://discord.com/developers/applications)
2. أنشئ تطبيق جديد (New Application)
3. اذهب إلى تبويب "Bot" وأنشئ بوت جديد
4. احفظ الـ Token (سنحتاجه في `.env`)
5. من تبويب "OAuth2" > "General"، احفظ الـ Client ID

### 2. إعداد Clash of Clans API
1. اذهب إلى [Clash of Clans API](https://developer.clashofclans.com/)
2. سجل حساب جديد
3. أنشئ API Key جديد
4. أضف عنوان IP الخاص بالسيرفر

### 3. إعداد MongoDB
**خيار 1: MongoDB محلي**
```bash
# تثبيت MongoDB على Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

**خيار 2: MongoDB Atlas (مُوصى به)**
1. اذهب إلى [MongoDB Atlas](https://www.mongodb.com/atlas)
2. أنشئ حساب مجاني
3. أنشئ Cluster جديد
4. احصل على Connection String

## التثبيت على السيرفر

### 1. تثبيت Node.js و PM2
```bash
# تثبيت Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# تثبيت PM2 لإدارة العمليات
sudo npm install -g pm2
```

### 2. رفع ملفات البوت
```bash
# إنشاء مجلد للبوت
sudo mkdir -p /opt/clashvip
sudo chown $USER:$USER /opt/clashvip

# رفع الملفات (استخدم SCP أو Git)
cd /opt/clashvip
# رفع كل ملفات البوت هنا
```

### 3. تثبيت المتطلبات
```bash
cd /opt/clashvip
npm install --production
```

### 4. إعداد المتغيرات البيئية
أنشئ ملف `.env`:
```bash
nano .env
```

أضف المحتوى التالي:
```env
DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE
MONGO_URI=mongodb://localhost:27017/clashvip
# للـ MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/clashvip
CLASH_TOKEN="Bearer YOUR_CLASH_OF_CLANS_API_TOKEN_HERE"
NODE_ENV=production
```

### 5. إعداد config.json
عدّل ملف `config.json` بمعرفات Discord الصحيحة:
```json
{
    "ownerGuildID": "معرف السيرفر الخاص بك",
    "clientID": "معرف البوت (Client ID)",
    "logChannels": {
        "newVerify": "معرف قناة التحقق الجديد",
        "crossVerify": "معرف قناة التحقق المتقاطع"
    },
    "leaderboardContestID": "معرف مسابقة اللوحة",
    "mediumPermRolesID": ["معرف رول 1", "معرف رول 2"],
    "fullPermRolesID": ["معرف رول 1", "معرف رول 2", "معرف رول 3"]
}
```

## التشغيل والنشر

### 1. إنشاء ملف PM2
أنشئ ملف `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'clashvip',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 2. تشغيل البوت
```bash
# إنشاء مجلد السجلات
mkdir -p logs

# تشغيل البوت
pm2 start ecosystem.config.js

# حفظ قائمة العمليات
pm2 save

# تثبيت PM2 للتشغيل التلقائي عند إعادة التشغيل
pm2 startup
```

### 3. أوامر PM2 المفيدة
```bash
# عرض حالة البوت
pm2 status

# عرض السجلات الحية
pm2 logs clashvip

# إعادة تشغيل البوت
pm2 restart clashvip

# إيقاف البوت
pm2 stop clashvip

# حذف البوت من PM2
pm2 delete clashvip

# مراقبة استخدام الذاكرة والمعالج
pm2 monit
```

## إعداد أذونات البوت في Discord

### 1. دعوة البوت للسيرفر
استخدم هذا الرابط (استبدل CLIENT_ID بمعرف البوت):
```
https://discord.com/oauth2/authorize?client_id=CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

### 2. الأذونات المطلوبة
- Administrator (أو الأذونات التفصيلية التالية):
  - Manage Roles
  - Manage Channels
  - Send Messages
  - Use Slash Commands
  - Read Message History
  - Add Reactions

## نشر أوامر Slash Commands
```bash
# تشغيل سكريبت نشر الأوامر
node deploy-commands.js
```

## الصيانة والمراقبة

### 1. إعداد تنبيهات
```bash
# تثبيت أداة مراقبة
npm install -g pm2-logrotate

# إعداد تدوير السجلات
pm2 install pm2-logrotate
```

### 2. النسخ الاحتياطي لقاعدة البيانات
```bash
# إنشاء نسخة احتياطية من MongoDB
mongodump --db clashvip --out /backup/mongodb/$(date +%Y%m%d)

# أتمتة النسخ الاحتياطي (cron job)
# crontab -e
# أضف هذا السطر للنسخ الاحتياطي اليومي في 2:00 ص
# 0 2 * * * mongodump --db clashvip --out /backup/mongodb/$(date +\%Y\%m\%d)
```

### 3. تحديث البوت
```bash
# إيقاف البوت
pm2 stop clashvip

# تنزيل التحديثات
git pull # إذا كنت تستخدم Git

# تثبيت المتطلبات الجديدة
npm install

# إعادة تشغيل البوت
pm2 restart clashvip
```

## استكشاف الأخطاء

### 1. فحص السجلات
```bash
# عرض السجلات الأخيرة
pm2 logs clashvip --lines 50

# فحص سجل الأخطاء
tail -f logs/err.log
```

### 2. مشاكل شائعة
- **خطأ الاتصال بـ Discord**: تأكد من صحة DISCORD_TOKEN
- **خطأ الاتصال بـ MongoDB**: تأكد من تشغيل MongoDB وصحة MONGO_URI
- **خطأ Clash of Clans API**: تأكد من صحة CLASH_TOKEN وإضافة IP السيرفر

### 3. إعادة تشغيل النظام
```bash
# في حالة تعليق البوت
pm2 restart clashvip --update-env

# في حالة مشاكل الذاكرة
pm2 reload clashvip
```

---

## ملاحظات مهمة

1. **الأمان**: لا تشارك ملف `.env` مع أحد
2. **النسخ الاحتياطي**: اعمل نسخ احتياطي دوري لقاعدة البيانات
3. **المراقبة**: راقب استخدام الذاكرة والمعالج بانتظام
4. **التحديثات**: حدّث المتطلبات بانتظام للأمان

---
**وقت التشغيل المتوقع للإعداد الكامل: 3-4 ساعات**