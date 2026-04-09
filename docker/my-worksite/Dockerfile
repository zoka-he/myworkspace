FROM my-worksite-builder:latest AS builder

WORKDIR /app
COPY . .

# 必须设为 production，next.config.js 才会启用 output: 'standalone' 并生成 .next/standalone
ENV NODE_ENV=production

# 若上游镜像的 deps 阶段用了 --ignore-scripts，postinstall 未跑：显式应用 patches/
RUN npx --yes patch-package

# 在deps基础上构建可执行代码
RUN npm install -g dotenv-cli   # 安装dotenv-cli，不知道为什么builder就是不安装
# patch-chroma-default-embed：裁剪 @chroma-core 避免 Turbopack 报 Unknown module type
RUN node scripts/patch-chroma-default-embed.js
# tailwind：生成 tailwind-generated.css 供 _app 引用
RUN npm run tailwind:build
# 必须在此处显式设置 NODE_ENV=production，否则 dotenv 加载 .env.prod 后可能覆盖 ENV，导致 next 不生成 .next/standalone
# Next.js 16 默认用 Turbopack，不生成 .next/standalone，必须用 --webpack 强制 Webpack 构建
RUN dotenv -e .env.prod -- env NODE_ENV=production npx next build --webpack

# 校验 standalone 已生成，若缺失则立即失败（避免使用旧缓存导致 COPY 时才报错）
RUN test -d /app/.next/standalone || (echo "ERROR: .next/standalone not found. Check next.config.js has output:'standalone'. Contents of .next:" && ls -la /app/.next/ && exit 1)

FROM my-worksite-base:latest AS runner
WORKDIR /app

# 设置运行环境
ENV NODE_ENV production
ENV PY_ENV production

ENV VITE_INFURA_API_KEY=
ENV ETHERSCAN_API_KEY=NHA2XREMZYNWJTA8KATB2JTSTVATTZH8Z8
ENV ALCHEMY_API_KEY=ErLfqJmkOlLvvv2a42SU2

# ENV CHROMA_HOST=192.168.0.179   # 应从前端获取
ENV CHROMA_PORT=28005
ENV DEEPSEEK_API_KEY=sk-793d020ab6bf46f38ef40d3f3d5d544c
ENV OPENROUTER_API_KEY=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
ENV SILICONFLOW_API_KEY=sk-ibxjepfovywzlqqormngkvqlygrzexumvcqosekbpagueqxd

# ENV RABBITMQ_STOMP_HOST=192.168.0.179   # 应从前端获取
ENV RABBITMQ_STOMP_PORT=28010
# 前端部分应从前端获取
ENV RABBITMQ_MANAGEMENT_URL=http://host.docker.internal:28008
ENV RABBITMQ_STOMP_USER=myworksite
ENV RABBITMQ_STOMP_PASSWD=nsds123456

# RabbitMQ 消费者配置（可通过 docker run -e 覆盖）
ENV RABBITMQ_ENABLE_SERVER_CONSUMER=true
ENV RABBITMQ_AMQP_HOST=host.docker.internal
ENV RABBITMQ_AMQP_PORT=28007
ENV RABBITMQ_AMQP_USER=myworksite
ENV RABBITMQ_AMQP_PASSWD=nsds123456
ENV RABBITMQ_AMQP_VHOST=/

# Nacos 客户端配置（可通过 docker run -e 覆盖）
ENV NACOS_ENABLE_CLIENT=true
ENV NACOS_SERVER_ADDR=host.docker.internal:28848
ENV NACOS_SERVER_LIST=
ENV NACOS_NAMESPACE=public
ENV NACOS_USERNAME=nacos
ENV NACOS_PASSWORD=l96sf7ur6@c
ENV NACOS_SSL=false
ENV NACOS_ENABLE_NAMING=false
ENV NACOS_NAMING_AUTO_REGISTER=false
ENV NACOS_SERVICE_NAME=myworksite
ENV NACOS_SERVICE_IP=host.docker.internal
ENV NACOS_SERVICE_PORT=28848
ENV NACOS_SERVICE_EPHEMERAL=true
ENV NACOS_SERVICE_ENABLED=true
ENV NACOS_SERVICE_WEIGHT=1
ENV NACOS_SERVICE_METADATA=

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