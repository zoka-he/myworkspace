# 世界态管理模块

## 概述

世界态管理模块用于记录和追踪世界观在特定时间点的宏观状态，包括世界大事件、天灾、阵营协约、阵营误判、人物协议和人物认知差等。

## 功能特性

- ✅ 世界态的CRUD操作
- ✅ 多条件筛选（类型、状态、影响级别）
- ✅ 列表视图展示
- ✅ 详情面板查看
- ✅ 引用关系管理
- ✅ Mock数据支持

## 路由

访问路径：`/novel/worldStateManage`

## 文件结构

```
worldStateManage/
├── index.tsx                    # 主页面组件
├── WorldStateManageContext.tsx  # Context状态管理
├── apiCalls.ts                  # API调用（Mock实现）
├── mockData.ts                  # Mock数据
└── components/
    ├── WorldStateList.tsx       # 列表组件
    ├── WorldStateDetailPanel.tsx # 详情面板组件
    ├── WorldStateFilterPanel.tsx # 筛选面板组件
    └── WorldStateEditModal.tsx  # 编辑模态框组件
```

## 使用说明

1. 选择世界观：在顶部工具栏选择要管理的世界观
2. 切换视图：可以在列表/时间线/关系图三种视图间切换
3. 筛选数据：使用左侧筛选面板进行多条件筛选
4. 查看详情：点击列表项查看右侧详情面板
5. 创建/编辑：点击"创建世界态"按钮或列表中的"编辑"按钮

## Mock数据

当前使用Mock数据，数据存储在 `mockData.ts` 中。后续可以替换为真实API调用。
