FROM my-worksite-builder:latest AS builder

WORKDIR /app
COPY . .


# 在deps基础上构建可执行代码
RUN npm install -g dotenv-cli   # 安装dotenv-cli，不知道为什么builder就是不安装
RUN dotenv -e .env.prod -- npx next build


FROM my-worksite-base:latest AS runner
WORKDIR /app

# 设置运行环境
ENV NODE_ENV production
ENV PY_ENV production

# RabbitMQ 消费者配置（可通过 docker run -e 覆盖）
ENV RABBITMQ_ENABLE_SERVER_CONSUMER=true
ENV RABBITMQ_AMQP_HOST=host.docker.internal
ENV RABBITMQ_AMQP_PORT=28007
ENV RABBITMQ_AMQP_USER=myworksite
ENV RABBITMQ_AMQP_PASSWD=nsds123456
ENV RABBITMQ_AMQP_VHOST=/

# 设置用户
# RUN addgroup --system --gid 1001 nodejs
# RUN adduser --system --uid 1001 nextjs

# 安装python依赖库 
# COPY ./docker/my-worksite/requirements.txt . 
# RUN pip install -r requirements.txt 

# 拷贝构建输出
COPY --from=builder /app/public ./public

# 拷贝nextjs框架本体
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 拷贝python脚本
COPY --from=builder /app/pyscript ./pyscript
COPY --from=builder /app/cron ./cron

# 切换user，降权（放弃，因为启动不了cron）
# USER nextjs

COPY ./launch.sh /app 

EXPOSE 3000
ENV PORT 3000
CMD cd /app && node server.js