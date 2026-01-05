FROM node:20-alpine AS base

# 更新软件包信息
RUN apk update

# 安装构建原生模块所需的工具（node-gyp 需要）
# python3: node-gyp 需要 Python
# make: 构建工具
# g++: C++ 编译器，用于编译原生模块
# libc6-compat: 提供 glibc 兼容层，某些原生模块需要
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

# 安装yarn
# RUN npm install -g yarn

# yarn、npm换源
# RUN npm config set registry https://registry.npm.taobao.org
# RUN yarn config set registry https://registry.npm.taobao.org
