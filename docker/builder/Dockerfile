FROM my-worksite-base:latest AS base

# 准备nextjs的工作路径，构建基础环境
FROM base AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# 复制依赖及项目文件
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules

