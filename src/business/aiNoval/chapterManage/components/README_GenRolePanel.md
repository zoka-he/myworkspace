# GenRolePanel 角色人设建议生成器

## 功能概述

`GenRolePanel` 是一个用于根据章节提示词生成角色人设建议的Modal组件。它提供了完整的角色生成工作流，包括输入章节提示词、设置命名风格、添加额外要求，以及生成和展示角色建议。

## 主要功能

### 1. 章节提示词范式提示
- 提供标准化的章节提示词编写范式
- 包含背景设定、事件描述、角色参与、世界观元素等指导
- 支持一键复制范式模板

### 2. 章节提示词输入
- 多行文本输入，支持自动尺寸调整（最少6行）
- 字符计数和长度限制（最大2000字符）
- 实时状态管理，无需Form验证

### 3. 命名风格设置
- 输入框用于指定角色命名风格
- 支持传统中文名、现代中文名、英文名、日式名等
- 提供示例和指导

### 4. 额外要求输入
- 多行文本输入，支持自动尺寸调整（3-6行）
- 字符计数和长度限制（最大500字符）
- 用于指定特殊的角色要求或设定

### 5. 操作按钮组
- **保存章节提示词**：保存当前输入的章节提示词
- **生成人物建议清单**：调用AI生成角色建议（需要世界观ID）

### 6. 生成结果展示
- 结构化的角色建议展示
- 包含主要角色建议、角色关系建议、命名风格建议等
- 支持复制功能

### 7. 结果操作按钮组
- **复制**：复制生成的角色建议到剪贴板
- **打开人物配置页**：跳转到角色配置页面（需要实现具体逻辑）

## 组件结构

```
GenRolePanel
├── ChapterPromptTemplate (章节提示词范式组件)
├── GenerationResult (生成结果展示组件)
└── 主Modal容器
    ├── 左侧输入区域
    │   ├── 章节提示词范式
    │   ├── 章节提示词输入
    │   ├── 命名风格设置
    │   ├── 额外要求输入
    │   └── 操作按钮组
    └── 右侧结果区域
        ├── 生成结果展示
        ├── 已保存的章节提示词
        └── 使用说明
```

## API 接口

### Props

```typescript
interface GenRolePanelProps {
  open?: boolean                    // Modal是否显示
  onCancel?: () => void            // 取消回调
  onOk?: (chapterPrompt: string, roleSuggestions: string) => void  // 确认回调
  worldviewId?: number | null      // 世界观ID（必需用于AI生成）
  title?: string                   // Modal标题
  width?: number | string          // Modal宽度
  rootPrompt?: string              // 根提示词，用于初始化组件
}
```

### 回调函数

- `onCancel`: 用户点击取消按钮时调用
- `onOk`: 用户确认时调用，返回章节提示词和角色建议

## 使用方法

### 基本使用

```tsx
import React, { useState } from 'react'
import { Button } from 'antd'
import GenRolePanel from './GenRolePanel'

function MyComponent() {
  const [isVisible, setIsVisible] = useState(false)
  const [worldviewId, setWorldviewId] = useState<number | null>(1)
  const [rootPrompt, setRootPrompt] = useState<string>('')

  const handleOk = (chapterPrompt: string, roleSuggestions: string) => {
    console.log('章节提示词:', chapterPrompt)
    console.log('角色建议:', roleSuggestions)
    setIsVisible(false)
  }

  return (
    <>
      <Button onClick={() => setIsVisible(true)}>
        打开角色生成器
      </Button>
      
      <GenRolePanel
        open={isVisible}
        onCancel={() => setIsVisible(false)}
        onOk={handleOk}
        worldviewId={worldviewId}
        width="80vw"
        rootPrompt={rootPrompt}
      />
    </>
  )
}
```

### 集成到现有页面

```tsx
// 在章节管理页面中添加角色生成功能
import GenRolePanel from './components/GenRolePanel'

// 在页面组件中
const [isGenRoleModalVisible, setIsGenRoleModalVisible] = useState(false)
const [rootPrompt, setRootPrompt] = useState<string>('')

// 在工具栏中添加按钮
<Button 
  icon={<RobotOutlined />} 
  onClick={() => setIsGenRoleModalVisible(true)}
>
  生成角色建议
</Button>

// 添加Modal组件
<GenRolePanel
  open={isGenRoleModalVisible}
  onCancel={() => setIsGenRoleModalVisible(false)}
  onOk={(chapterPrompt, roleSuggestions) => {
    // 处理生成结果
    handleRoleSuggestions(chapterPrompt, roleSuggestions)
    setIsGenRoleModalVisible(false)
  }}
  worldviewId={selectedChapter?.worldview_id}
  rootPrompt={rootPrompt}
/>
```

## 状态管理

组件使用React的useState进行状态管理，包括：

- `chapterPrompt`: 章节提示词
- `namingStyle`: 命名风格
- `extraRequirements`: 额外要求
- `generationResult`: 生成结果
- `savedChapterPrompt`: 已保存的章节提示词
- `isGenerating`: 生成状态
- `rootPrompt`: 根提示词

## 样式和布局

- 使用Ant Design的Modal、Card、Input等组件
- 左右分栏布局：左侧输入，右侧结果展示
- 响应式设计，支持不同屏幕尺寸
- 统一的视觉风格，符合项目设计规范

## 依赖项

- React 18+
- Ant Design 5.x
- TypeScript 4.x+

## 注意事项

1. **世界观ID必需**：生成角色建议需要有效的世界观ID
2. **AI API集成**：当前使用模拟数据，需要集成实际的AI生成API
3. **角色配置页面跳转**：需要实现具体的页面跳转逻辑
4. **错误处理**：组件包含基本的错误处理和用户提示
5. **性能优化**：大量文本输入时注意性能优化
6. **状态管理**：使用useState管理表单状态，无需Form组件

## 扩展功能

### 可扩展的功能点

1. **AI API集成**：替换模拟数据为真实的AI生成API
2. **角色配置页面跳转**：实现到角色管理页面的跳转
3. **历史记录**：保存和加载历史生成记录
4. **模板管理**：管理多个章节提示词模板
5. **批量生成**：支持批量生成多个角色的建议
6. **导出功能**：支持导出角色建议为不同格式
7. **根提示词集成**：将rootPrompt集成到生成逻辑中

### 自定义样式

可以通过CSS模块或内联样式自定义组件外观：

```scss
// 自定义样式示例
.gen-role-panel {
  .ant-modal-body {
    max-height: 80vh;
    overflow-y: auto;
  }
  
  .input-section {
    border-right: 1px solid #f0f0f0;
  }
  
  .result-section {
    background-color: #fafafa;
  }
}
```

## 更新日志

- v1.1.0: 移除Form结构，改为useState状态管理
- v1.0.0: 初始版本，包含基本功能
- 支持章节提示词输入和角色建议生成
- 提供完整的用户界面和交互体验
- 添加rootPrompt属性支持 