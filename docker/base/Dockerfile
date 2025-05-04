FROM alpine:latest AS base

# 更新软件包信息
RUN apk update

# 安装node18、python3.9、cron及相关依赖
RUN apk add --no-cache \
    python3 \
    py3-pip \
    nodejs \
    npm \
    dcron \
    curl \
    wget

# 安装yarn
RUN npm install -g yarn

# yarn、npm换源
RUN npm config set registry https://registry.npm.taobao.org
RUN yarn config set registry https://registry.npm.taobao.org
