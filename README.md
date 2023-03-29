# 个人工作站

功能包括但不限于：
* 任务管理
* 联系人及账号等信息的管理
* 路书及编辑器（基于百度地图）

## 开发

1. 安装mysql，localhost暴露3306端口

2. 安装依赖包
    ```bash
    yarn
    # or
    npm i
    ```

3. 启动 development server:

    ```bash
    npm run dev
    # or
    yarn dev
    ```

4. 浏览器访问 [http://localhost:3000](http://localhost:3000).


## 部署到docker

1. 在git分支打上tag
2. 执行镜像构建
    ```bash
    ./docker-build.sh
    ```

3. 启动容器
    ```bash
    ./docker-run.sh
    ```
