FROM my-worksite-builder:latest AS builder

WORKDIR /app
COPY . .


# 在deps基础上构建可执行代码
RUN yarn build


FROM my-worksite-base:latest AS runner
WORKDIR /app

# 设置运行环境
ENV NODE_ENV production
ENV PY_ENV production

# 设置用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 安装python依赖库 
COPY ./docker/my-worksite/requirements.txt . 
RUN pip3 install -r requirements.txt 

# 拷贝构建输出
COPY --from=builder /app/public ./public

# 拷贝nextjs框架本体
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]