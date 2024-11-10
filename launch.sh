echo "starting cron"

# crontab /app/cron/my-worksite
# /etc/init.d/cron start

echo "starting server.js"
nohup node server.js > ./my-worksite.log 2>&1 &

