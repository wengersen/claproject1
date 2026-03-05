# 🐾 NutraPaw — 猫咪专业营养顾问

> **"一个记住你家猫全部健康状态的 AI 营养师，在每个生命阶段推荐最适合的猫粮和罐头。"**

[![Version](https://img.shields.io/badge/version-v1.2.0-orange)](CHANGELOG.md)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

---

## ✨ 产品特色

| 能力 | 说明 |
|------|------|
| 🧬 **品种感知** | 基于 22 个品种标准体重表，精准判断超重/偏轻 |
| 🔍 **冲突纠偏** | 自动检测用户需求与客观健康数据的矛盾，温和说明并调整方案 |
| ⚡ **流式生成** | SSE 实时推流，产品卡片逐条呈现，进度透明可感知 |
| 🗃️ **离线缓存** | 相同输入秒级命中 localStorage 缓存，无需重复生成 |
| 👤 **多猫档案** | 登录后支持多只猫档案管理，跨设备可恢复历史推荐 |
| 🥗 **专业数据库** | 45 款精选猫粮/罐头，含完整成分解析与推荐理由 |

---

## 🗂️ 项目结构

```
nutrapaw/
├── app/
│   ├── page.tsx                  # 首页
│   ├── recommend/page.tsx        # 推荐流程（3步表单 + SSE加载）
│   ├── result/[id]/page.tsx      # 推荐结果展示
│   ├── profile/page.tsx          # 用户档案中心
│   └── api/
│       ├── recommend/route.ts    # 推荐引擎 SSE API
│       └── recommend/save/route.ts # 保存推荐 API
├── components/
│   ├── recommend/
│   │   ├── LoadingState.tsx      # 专业轮播加载界面
│   │   ├── BreedSelector.tsx     # 品种选择器
│   │   └── HealthTagGrid.tsx     # 健康需求标签网格
│   ├── result/
│   │   └── ProductCard.tsx       # 产品推荐卡片
│   └── auth/
│       └── AuthNav.tsx           # 全站登录状态导航
├── lib/
│   ├── breedWeights.ts           # 品种标准体重表（22个品种）★ v1.2
│   ├── conflictDetector.ts       # 需求冲突检测引擎（4条规则）★ v1.2
│   ├── productMap.ts             # 产品数据库索引 & hydration
│   ├── recommendLocalCache.ts    # 客户端推荐结果缓存
│   ├── petLocalStore.ts          # 宠物档案本地存储
│   └── resultStore.ts            # 服务端结果存储（内存+JSON）
├── types/
│   └── cat.ts                    # 核心类型定义（CatProfile, RecommendResult等）
├── data/
│   └── catfoods.json             # 45款产品数据库（含静态reason字段）
└── docs/
    ├── PRD_v1.md                 # 产品需求文档
    ├── DESIGN_v1.md              # 设计规范
    └── CHANGELOG.md              # 版本变更记录（根目录）
```

---

## 🧠 核心架构：推荐引擎流水线

```
用户提交表单
    │
    ▼
[1] detectConflicts()          ← lib/conflictDetector.ts
    品种体重 × 年龄系数 → 超重/偏轻/正常
    4条规则校验健康标签
    ↓ effectiveTags（纠偏后）+ ConflictItem[]
    │
    ▼
[2] SSE: "conflicts" 事件      ← 即时推送，LLM 前
    前端蓝色提示卡（生成中）
    结果页永久卡片
    │
    ▼
[3] 产品数据库筛选              ← data/catfoods.json
    tags 匹配 × 优先级排序
    │
    ▼
[4] LLM 生成（精简模式）        ← app/api/recommend/route.ts
    输出：productId + personalNote + highlights + feedingGuide
    （reason 已在数据库，token 减少 ~60%）
    │
    ▼
[5] SSE: dry-item / wet-item   ← 逐条推流
    前端增量渲染 ProductCard
    │
    ▼
[6] hydrateSlimResult()        ← lib/productMap.ts
    slim 结构 + 静态 DB → 完整 RecommendResult
    │
    ▼
[7] localStorage + 跳转        ← result_{id} + cache mapping
    result.id 注入，保存接口正常工作
```

---

## 🚀 快速启动

### 环境要求
- Node.js 18+
- pnpm / npm / yarn

### 安装与运行

```bash
# 克隆项目
git clone <repo-url>
cd nutrapaw

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 填入 OPENAI_API_KEY 或兼容的 LLM API Key

# 开发模式
npm run dev

# 生产构建
npm run build && npm start
```

### 环境变量

| 变量名 | 必须 | 说明 |
|--------|------|------|
| `OPENAI_API_KEY` | ✅ | LLM API 密钥 |
| `OPENAI_BASE_URL` | 可选 | 自定义 API 端点（支持国内代理） |
| `JWT_SECRET` | ✅ | JWT 签名密钥（生产环境必须设置） |

---

## 📋 版本历史

| 版本 | 日期 | 里程碑 |
|------|------|--------|
| **v1.2.0** | 2026-03-05 | 智能营养引擎：冲突纠偏 + 加载体验 + 保存修复 |
| v1.1.0 | 2026-03-01 | 用户系统 & 宠物档案持久化 |
| v1.0.0 | 2026-02-28 | MVP 上线：推荐流程完整闭环 |

完整变更记录见 → [CHANGELOG.md](./CHANGELOG.md)

---

## 🏗️ 技术栈

| 层级 | 技术选型 |
|------|---------|
| 框架 | Next.js 15 (App Router) |
| 语言 | TypeScript 5 |
| 样式 | Tailwind CSS v4 |
| LLM | OpenAI API（GPT-4o / 兼容接口） |
| 流式传输 | Server-Sent Events (SSE) |
| 存储 | localStorage（客户端）+ 内存 Map（服务端） |
| 认证 | JWT（jsonwebtoken，bcryptjs 加密） |
| 部署 | Vercel |
