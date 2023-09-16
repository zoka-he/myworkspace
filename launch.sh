echo "starting cron"

crontab /app/cron/my-worksite
/etc/init.d/cron start

echo "starting server.js"

cd /app
node server.js

