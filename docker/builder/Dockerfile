FROM my-worksite-base:latest AS base

# 准备nextjs的工作路径，构建基础环境
FROM base AS deps
WORKDIR /app

# 创建 python 符号链接（Alpine 中 python3 需要链接为 python）
# node-gyp 需要 python 命令
RUN ln -sf /usr/bin/python3 /usr/bin/python || true

# 强制更新node-gyp，并忽略证书错误
RUN npm install --strict-ssl=false -g node-gyp@latest

# 设置 node-gyp 的 Python 路径（确保 node-gyp 能找到 Python）
ENV PYTHON=/usr/bin/python3

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --no-strict-ssl --frozen-lockfile --verbose; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# 复制依赖及项目文件
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules

