# 角色卡构思存储方案

## 存储位置

角色构思数据挂在脑洞（brainstorm）上，不单独建表。

- **role_seeds**：角色种子列表，JSON 存储。
- **role_drafts**：角色草稿列表，JSON 存储。

## 数据结构（与 `IAiNoval` 一致）

### 种子 `IRoleSeed[]`

- `id`: string，如 `seed_1`
- `content`: string，自然语言描述
- `edited?`: boolean，是否被用户改过

### 草稿 `IRoleDraft[]`

- `seed_id`: string，对应种子 id
- `card`: `IRoleDraftCard`，结构化角色卡（name, gender, age, race_or_species, faction_or_stance, appearance, strengths, weaknesses, resources, behavior_style, personality 等）
- `background`: string，角色背景长文本
- `status?`: 'generating'

## 数据库

若 `brainstorm` 表尚无这两列，可执行：

```sql
ALTER TABLE brainstorm
  ADD COLUMN role_seeds JSON NULL COMMENT '角色种子列表',
  ADD COLUMN role_drafts JSON NULL COMMENT '角色草稿列表';
```

后端在创建/更新脑洞时会把数组序列化为 JSON 写入；读取时反序列化并返回给前端。

## API

- `POST /api/web/aiNoval/brainstorm/roleSeeds/generate?id={brainstormId}`  
  Body: `{ count, randomness?, adhere_worldview? }`  
  返回: `{ seeds: IRoleSeed[] }`

- `POST /api/web/aiNoval/brainstorm/roleSeeds/reroll?id={brainstormId}&seedId={seedId}`  
  Body: `{ randomness?, adhere_worldview? }`  
  返回: `IRoleSeed`

- `POST /api/web/aiNoval/brainstorm/roleDrafts/generate?id={brainstormId}`  
  Body: `{ seed_ids: string[], seeds?: IRoleSeed[] }`  
  返回: `{ drafts: IRoleDraft[] }`

生成/重骰仅返回数据，不写库；持久化在用户点击「保存」时通过 `updateBrainstorm` 带上 `role_seeds`、`role_drafts` 完成。
