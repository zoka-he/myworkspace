# 脑洞管理模块

## 概述

脑洞管理模块用于记录创作过程中的灵感、想法、笔记，并使用LLM分析这些笔记对世界观和故事的影响。

## 功能特性

- ✅ 脑洞的CRUD操作
- ✅ 多条件筛选（类型、状态、优先级、分类）
- ✅ 全文搜索
- ✅ LLM分析功能（Mock）
- ✅ 分析结果展示
- ✅ Mock数据支持

## 路由

访问路径：`/novel/brainstormManage`

## 文件结构

```
brainstormManage/
├── index.tsx                    # 主页面组件
├── BrainstormManageContext.tsx  # Context状态管理
├── apiCalls.ts                  # API调用（Mock实现）
├── mockData.ts                  # Mock数据
└── components/
    ├── BrainstormList.tsx       # 列表组件
    ├── BrainstormDetailPanel.tsx # 详情面板组件
    ├── BrainstormFilterPanel.tsx # 筛选面板组件
    └── BrainstormEditModal.tsx  # 编辑模态框组件
```

## 使用说明

1. 选择世界观：在顶部工具栏选择要管理的世界观
2. 搜索脑洞：使用搜索框进行全文搜索
3. 筛选数据：使用左侧筛选面板进行多条件筛选
4. 查看详情：点击列表项查看右侧详情面板
5. LLM分析：点击"分析"按钮对脑洞进行LLM分析（Mock实现）
6. 创建/编辑：点击"创建脑洞"按钮或列表中的"编辑"按钮

## Mock数据

当前使用Mock数据，数据存储在 `mockData.ts` 中。LLM分析功能也是Mock实现，模拟2秒延迟后返回分析结果。

## 脑洞类型

- **灵感（Inspiration）**: 突发奇想、创意点子
- **问题（Problem）**: 发现的问题或矛盾
- **想法（Idea）**: 初步的想法和方案
- **笔记（Note）**: 一般性笔记和记录
- **待验证（To Verify）**: 需要验证的想法
