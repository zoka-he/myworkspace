FROM ubuntu:latest AS base

# 更换源为阿里云，并更新软件包信息
RUN sed -i s@/archive.ubuntu.com/@/mirrors.aliyun.com/@g /etc/apt/sources.list
RUN sed -i s@/security.ubuntu.com/@/mirrors.aliyun.com/@g /etc/apt/sources.list
RUN cat /etc/apt/sources.list
RUN apt-get clean
RUN apt-get -y update
  
# 安装node18、python3.9、cron及相关依赖  
RUN apt-get install -y python3.9 python3-pip nodejs npm 
RUN apt-get install cron
RUN apt-get install -y curl wget
RUN npm install -g n 
RUN n stable
RUN npm install -g yarn

# yarn、npm换源
RUN npm config set registry https://registry.npm.taobao.org
RUN yarn config set registry https://registry.npm.taobao.org
