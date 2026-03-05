# CHANGELOG — NutraPaw 猫咪营养顾问

所有重大变更均记录于此文件，格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，版本号遵循 [Semantic Versioning](https://semver.org/)。

---

## [v1.2.1] — 2026-03-05 🎨 UI 精细化迭代

### ✨ 视觉 & 交互优化

#### 1. 体重滑块范围调整
- `app/recommend/page.tsx` 滑块范围由 `0.5–30 kg` 更新为 `0–20 kg`
- 刻度标签更新为 5 kg 等间距：`0 / 5 / 10 / 15 / 20`
- 进度渐变计算公式更新为 `(value / 20) * 100%`

#### 2. 健康需求页（Step 2）UI 全面升级（对齐 Figma 稿）
- **图标替换**：所有健康标签从 Emoji 升级为 `lucide-react` SVG 图标（Droplets / Scale / Leaf / Sparkles / Bone / Target / Shield / Dumbbell / HeartPulse / Baby / Sun）
- **布局重构**：标签卡片改为 2 列 Grid 布局，卡片内采用"图标 → 标题 → 描述"垂直堆叠排列
- **选中徽章**：选中状态右上角展示 22px 橙色圆形勾选徽章（`-top-2 -right-2`），与 Figma 设计完全一致
- **选中边框**：选中卡片切换为橙色边框 + 浅橙底色，未选中为灰色边框 + 白底，视觉层次清晰
- **摘要卡空状态**：已选摘要区新增未选时的意大利体灰色占位提示"尚未选择任何需求"

### 📦 依赖变更

| 包名 | 操作 | 版本 |
|------|------|------|
| `lucide-react` | 新增安装 | latest |

---

## [v1.2.0] — 2026-03-05 🎯 里程碑：智能营养引擎

### ✨ 新增功能

#### 1. 需求冲突智能纠偏系统（Conflict Detection Engine）
- 新增 `lib/breedWeights.ts`：内置 22 个猫咪品种的标准体重区间表，幼猫按年龄系数（0.3~1.0）动态计算目标体重
- 新增 `lib/conflictDetector.ts`：4 条纠偏规则
  - 实测超重 + 用户选"增重/营养" → 自动纠偏为"体重管理"
  - 实测偏轻 + 用户选"体重管理" → 自动纠偏为"增重/营养"
  - 幼猫（<12月）+ 用户选"老年猫护理" → 移除该标签
  - 老年猫（>7岁）+ 用户选"幼猫发育" → 移除该标签
- 纠偏结果通过 SSE `conflicts` 事件实时推送，生成中界面即时显示蓝色提示卡片
- 结果页猫咪信息摘要下方永久展示冲突说明卡（顾问口吻，温和解释型）
- 标签对比 UI：原标签划线 → 纠偏后标签高亮，直观展示调整前后变化

#### 2. 加载界面专业感优化
- 6 条专业轮播文案循环展示（2.8 秒/条），覆盖完整评估流程：
  > 正在解析健康档案 → 筛选数百款数据库 → 专业营养师模型分析 → 交叉验证12项指标 → 量身定制方案 → 品质可信度评分
- 彻底移除"已完成第 X 款配方分析"的计数文案，避免暴露分析总量
- 副标题升级为顾问语气："营养顾问正在为您的猫咪深度定制，请稍候 🐾"
- 文案与进度条解耦：轮播独立运行，`streamProgress` 仅控制进度条不影响显示文字

#### 3. 产品数据库 reason 字段迁移
- 将所有 45 款产品的 `reason`（推荐理由）从 LLM 动态生成迁移至 `data/catfoods.json` 静态存储
- LLM 仅负责生成 `personalNote`（个性化说明）和 `highlights`（亮点摘要），输出 token 减少 ~60%
- 前端通过 `hydrateSlimResult()` 将 slim 结构与静态数据库合并，恢复完整 `ProductRecommendation`

### 🐛 Bug 修复

#### 保存推荐失败（"保存失败"按钮）
- **根因**：前端存入 localStorage 的 `fullResult` 对象缺少 `id` 字段，后端 `/api/recommend/save` 校验 `!result.id` 返回 400
- **修复 1**：`app/recommend/page.tsx` 在 SSE `result` 事件处理中补加 `fullResult.id = resultId`
- **修复 2**：`app/api/recommend/save/route.ts` 校验逻辑由 `!result.id` 改为 `!result.catProfile`，并在 id 缺失时自动生成兜底 id，兼容历史 localStorage 数据

### 🔧 架构变更

| 模块 | 变更描述 |
|------|---------|
| `types/cat.ts` | `RecommendResult` 新增 `conflicts` 和 `originalHealthTags` 可选字段 |
| `lib/productMap.ts` | `SlimRecommendResult` 同步新增 `conflicts`/`originalHealthTags`；`hydrateSlimResult` 注入静态 `reason` |
| `app/api/recommend/route.ts` | 在 LLM 调用前执行 `detectConflicts()`，推送 SSE `conflicts` 事件，使用 `effectiveTags` 替代原始标签 |
| `app/recommend/page.tsx` | SSE 新增 `conflicts` 事件处理；移除产品计数进度文案；`fullResult.id` 注入修复 |
| `app/result/[id]/page.tsx` | 结果页猫咪信息卡下方新增永久冲突提示卡片渲染 |
| `components/recommend/LoadingState.tsx` | 轮播脱离 `streamProgress` 独立运行；文案全面升级 |

### 📦 新增文件

| 文件 | 说明 |
|------|------|
| `lib/breedWeights.ts` | 22个品种标准体重表 + `assessWeightStatus()` 函数 |
| `lib/conflictDetector.ts` | 冲突检测引擎，返回 `ConflictDetectionResult` |
| `CHANGELOG.md` | 版本变更记录（本文件） |

---

## [v1.1.0] — 2026-03-01 🎯 里程碑：用户系统 & 档案持久化

### ✨ 新增功能
- 用户注册/登录（用户名+密码，JWT 认证）
- 推荐结果保存到用户档案
- 宠物档案管理（多宠物支持）
- 推荐历史查看（`/profile` 页面）
- 全站 `AuthNav` 导航组件（登录状态感知）
- 推荐流程猫咪档案记忆（上次信息自动填充）
- 产品对比功能（3维度对比）

### 🐛 Bug 修复
- 推荐历史多宠物同步问题
- 账号 Redeploy 持久化问题（内存 Map 重建）
- 档案重复去重逻辑

---

## [v1.0.0] — 2026-02-28 🎯 里程碑：MVP 上线

### ✨ 新增功能
- 猫咪信息录入（品种/生日/体重/性别/绝育状态）
- 健康需求标签选择（10种需求）
- LLM 驱动的个性化推荐（干粮6款 + 湿粮3款）
- SSE 流式推荐生成（实时进度展示）
- 推荐结果页（产品卡片 + 喂食指南 + 免责声明）
- 45 款产品数据库（`data/catfoods.json`）
- 结果缓存（localStorage，输入 hash 去重）
