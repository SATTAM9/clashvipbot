#!/bin/bash

# سكريبت تثبيت البوت على Ubuntu/Debian
# تشغيل بصلاحيات sudo

echo "=== تثبيت Clashvip Bot ==="

# تحديث النظام
echo "تحديث النظام..."
apt-get update && apt-get upgrade -y

# تثبيت Node.js 18.x
echo "تثبيت Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# تثبيت MongoDB
echo "تثبيت MongoDB..."
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt-get update
apt-get install -y mongodb-org

# تشغيل MongoDB
systemctl start mongod
systemctl enable mongod

# تثبيت PM2
echo "تثبيت PM2..."
npm install -g pm2

# إنشاء مجلد البوت
echo "إنشاء مجلد البوت..."
mkdir -p /opt/clashvip
chown $SUDO_USER:$SUDO_USER /opt/clashvip

echo "=== التثبيت اكتمل! ==="
echo "الخطوات التالية:"
echo "1. ارفع ملفات البوت إلى /opt/clashvip"
echo "2. cd /opt/clashvip"
echo "3. npm install"
echo "4. أعدّ ملفي .env و config.json"
echo "5. pm2 start ecosystem.config.js"