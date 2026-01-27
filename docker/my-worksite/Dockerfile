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

ENV VITE_INFURA_API_KEY=
ENV ETHERSCAN_API_KEY=NHA2XREMZYNWJTA8KATB2JTSTVATTZH8Z8
ENV ALCHEMY_API_KEY=ErLfqJmkOlLvvv2a42SU2

# ENV CHROMA_HOST=192.168.0.175   # 应从前端获取
ENV CHROMA_PORT=28005
ENV DEEPSEEK_API_KEY=sk-793d020ab6bf46f38ef40d3f3d5d544c
ENV OPENROUTER_API_KEY=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
ENV SILICONFLOW_API_KEY=sk-ibxjepfovywzlqqormngkvqlygrzexumvcqosekbpagueqxd

# ENV RABBITMQ_STOMP_HOST=192.168.0.175   # 应从前端获取
ENV RABBITMQ_STOMP_PORT=28010
ENV RABBITMQ_MANAGEMENT_URL=http://host.docker.internal:28008  # 前端部分应从前端获取
ENV RABBITMQ_STOMP_USER=myworksite
ENV RABBITMQ_STOMP_PASSWD=nsds123456

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