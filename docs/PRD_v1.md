# PRD_v1.md — 猫咪全生命周期营养顾问

**版本：** v1.1
**日期：** 2026-03-01
**状态：** 正式发布
**作者：** Requirement Agent × 用户共创

---

## 版本变更日志

| 版本 | 日期 | 主要内容 |
|------|------|---------|
| v1.0 | 2026-02-28 | 初始 PRD，覆盖推荐流程核心功能 |
| v1.1 | 2026-03-01 | 新增用户认证 + 推荐缓存优化（上线里程碑） |
| v1.2 | 2026-03-01 | 全站 AuthNav + 推荐流程猫咪档案记忆 |
| v1.3 | 2026-03-01 | 宠物健康日志系统 + AI 健康评估（localStorage 架构） |
| **v1.1 里程碑** | **2026-03-01** | **3 大 Bug 修复：推荐历史多宠物同步、账号 Redeploy 持久化、档案重复去重** |

---

## 一、产品定位

### 1.1 一句话定位

> **"一个记住你家猫全部健康状态的 AI 营养师，在每个生命阶段推荐最适合的猫粮和罐头。"**

### 1.2 核心差异化

| 维度 | 小红书/评论区 | 电商筛选器 | 本产品 |
|------|-------------|-----------|--------|
| 推荐依据 | 他人经验，不了解你的猫 | 品类标签，无健康上下文 | **基于你家猫的品种+年龄+健康状态** |
| 深度 | 碎片化 | 浅层筛选 | **成分解析 + 推荐理由** |
| 生命周期 | 无记忆 | 无记忆 | **可保存档案，跟随成长** |
| 商业逻辑 | 广告驱动 | 广告驱动 | **用户付费，推荐中立** |

---

## 二、目标用户

### 2.1 核心用户画像

- **主要人群：** 25-35岁城市养猫人群，有一定消费能力
- **典型场景：**
  - 猫咪确诊泌尿道疾病（尿闭/尿结石）后，急需选处方粮/低磷低镁粮
  - 猫咪从幼猫进入成猫阶段，需要更换猫粮
  - 猫咪体重超标，需要减重粮
  - 猫咪出现消化问题（呕吐/腹泻），需要排查食物敏感
- **用户痛点：** 信息分散、专业门槛高、怕买错伤害猫咪

### 2.2 MVP 范围

- ✅ 猫（仅猫，v1）
- ❌ 狗（v2 规划）

---

## 三、功能范围（MVP 轻量版）

### 3.1 功能优先级矩阵

| 功能模块 | 优先级 | MVP包含 | 备注 |
|---------|--------|---------|------|
| 猫咪信息录入 | P0 | ✅ | 核心输入 |
| 健康需求选择 | P0 | ✅ | 核心输入 |
| AI 推荐引擎 | P0 | ✅ | 核心输出 |
| 推荐结果展示 | P0 | ✅ | 核心输出 |
| 用户注册/登录 | P1 | ✅（用户名+密码） | 结果页触发，不强制 |
| 宠物档案保存 | P1 | ✅（需登录） | 登录后自动保存到账户 |
| 产品对比功能 | P1 | ✅（简单版） | 3个维度对比 |
| 购买链接 | P2 | 预留位置 | 上线后接入联盟 |
| 健康事件记录 | P2 | ❌ | v1.5 规划 |
| 用户评价/反馈 | P2 | ❌ | v2 规划 |

---

## 四、核心用户流程

```
[首页]
  ↓
[Step 1: 填写猫咪基本信息]
  品种 / 年龄 / 体重 / 性别 / 是否绝育
  ↓
[Step 2: 选择健康需求]
  预设标签（多选）+ 自定义输入
  ↓
[Step 3: AI 生成中（loading）]
  后台：LLM + 数据库匹配（智能缓存层，相同组合 5 分钟内命中缓存）
  ↓
[Step 4: 推荐结果页]
  主粮推荐 3-5 款 / 罐头推荐 2-3 款
  每款含：推荐理由 / 成分亮点 / 注意事项 / 价格区间 / 购买链接(预留)
  ↓
[可选：保存推荐] ← 用户最有动力的时刻触发注册
  未登录 → 点击"保存推荐"→ 弹出注册弹窗
  已登录 → 点击"保存推荐"→ 直接保存到账户
  ↓
[/profile 用户档案页]（需登录）
  查看历史推荐记录 / 跳转至任意历史结果页
```

---

## 五、详细功能说明

### 5.1 Step 1 — 猫咪基本信息

| 字段 | 类型 | 选项/说明 |
|------|------|-----------|
| 品种 | 下拉选择 + 搜索 | 常见20+品种 + "混血/不知道" |
| 年龄 | 选择器 | 幼猫(<1岁) / 成猫(1-7岁) / 老年猫(>7岁)，或输入具体月龄 |
| 体重 | 数字输入 | kg，配合年龄判断是否超重 |
| 性别 | 单选 | 公 / 母 |
| 绝育状态 | 单选 | 已绝育 / 未绝育（影响热量需求） |

**品种库（首批）：**
英短、美短、布偶、缅因、暹罗、波斯、橘猫（混血）、狸花猫、黑猫、白猫、金渐层、银渐层、无毛猫（斯芬克斯）、挪威森林、苏格兰折耳、其他/不知道

### 5.2 Step 2 — 健康需求选择

**预设标签（多选，常见健康场景）：**

```
🫧 泌尿道健康     — 低磷低镁，促进饮水
⚖️ 体重管理       — 低热量，高蛋白，增加饱腹感
🌾 消化敏感       — 单一蛋白，无谷物，益生菌
🐾 毛发护理       — Omega-3/6，生物素
🦴 关节健康       — 老年猫，含软骨素
🍼 幼猫发育       — 高蛋白高热量，DHA
👴 老年猫护理     — 低磷，易消化，关节支持
💊 术后/病后恢复  — 高蛋白，易消化
🌿 食物过敏       — 限制成分，低敏配方
😺 日常均衡       — 无特殊需求
```

**自定义输入：**
- 文本框："还有其他情况？（如：最近总是呕吐、喝水少、便秘等）"
- AI 解析用户自然语言 → 映射到内部健康标签 → 参与推荐逻辑

### 5.3 Step 3 — AI 推荐引擎（后端逻辑）

**推荐逻辑分两层：**

```
Layer 1：数据库硬筛选
  输入：年龄段 + 健康标签
  输出：符合条件的产品候选集（从30-50款库中筛选）

Layer 2：LLM 智能排序 + 理由生成
  输入：猫咪完整信息 + 候选集产品信息
  任务：
    1. 按用户具体情况排序（如：3kg超重绝育母猫，泌尿道问题）
    2. 生成个性化推荐理由（用通俗语言解释成分/功效）
    3. 标注注意事项（如：该粮磷含量偏高，泌尿道猫咪请先咨询兽医）
  模型：Claude claude-sonnet-4-6 / GPT-4o（可配置）
```

**幻觉防控机制：**
- LLM 只能从候选集内推荐，禁止自由发挥产品名称
- 所有产品成分数据来自数据库，LLM 不自行生成成分信息
- 推荐结果附带免责说明："本推荐仅供参考，不构成兽医诊断建议"

### 5.4 Step 4 — 推荐结果展示

**推荐卡片信息结构：**

```
[产品图片占位]  [品牌 Logo]
产品名称
─────────────────
🎯 推荐理由（2-3句，针对这只猫）
─────────────────
成分亮点：蛋白质来源 / 特殊功能成分
注意事项：⚠️ 如有注意事项则显示
─────────────────
💰 价格区间：XX-XX元/kg
⭐ 品牌力：★★★★☆
🏷️ 适用场景标签
─────────────────
[查看详情] [购买链接（预留）]
```

**对比维度（产品对比功能）：**
- 价格（性价比）
- 品牌力（市场口碑/历史）
- 功效匹配度（针对用户需求）

---

## 六、数据库设计（猫粮数据库 v1）

### 6.1 产品字段结构

```typescript
interface CatFood {
  id: string
  brand: string                    // 品牌名
  brandTier: 'premium' | 'mid' | 'budget'  // 品牌档位
  productName: string              // 产品名
  type: 'dry' | 'wet' | 'mixed'   // 主粮/罐头/混合
  lifeStage: LifeStage[]           // 适用阶段
  proteinSource: string[]          // 蛋白质来源（鸡/鱼/羊等）
  grainFree: boolean               // 是否无谷物
  keyIngredients: string[]         // 关键功能成分
  phosphorusLevel: 'low' | 'mid' | 'high'  // 磷含量（泌尿道关键）
  magnesiumLevel: 'low' | 'mid' | 'high'   // 镁含量（泌尿道关键）
  calories: number                 // 卡路里 kcal/100g
  functionalTags: HealthTag[]      // 适用健康场景标签
  priceRangeMin: number            // 价格区间下限（元/kg）
  priceRangeMax: number            // 价格区间上限（元/kg）
  buyLinks: BuyLink[]              // 购买链接（预留）
  availableInChina: boolean        // 国内是否易购买
  notes: string                    // 备注（特殊说明）
}
```

### 6.2 首批产品库范围（30-50款）

**国产品牌（约15款）：**
麦富迪、冠能（国产线）、渴望（中国代工版）、耐威克、卫仕、开饭了、比乐、网易严选宠物粮等

**进口品牌（约20款）：**
希尔斯（Hills）、皇家（Royal Canin）、爱慕斯（IAMS）、渴望（Orijen/Acana）、冠能进口线、Purina Pro Plan、Farmina、Now Fresh 等

**产品类型分布：**
- 主粮（干粮）：约30款
- 罐头/主食罐：约15款
- 半干粮：约5款

---

## 七、技术架构

### 7.1 技术选型

| 层次 | 技术选择 | 理由 |
|------|---------|------|
| 前端框架 | Next.js 16 (App Router) | 项目现有栈 |
| 语言 | TypeScript（strict 模式） | 项目规范 |
| 样式 | Tailwind CSS | 开发效率高 |
| UI 风格 | Minimalist / Bento Grid | DESIGN_v1.md 详细规范 |
| LLM（推荐引擎） | DeepSeek API | 成本低、中文理解强 |
| LLM（健康评估） | DeepSeek API | 同上，JSON 格式输出 |
| 用户数据存储 | localStorage（客户端持久化） | 零成本、无服务端状态丢失风险 |
| 猫粮数据库 | JSON 文件 + 内存索引（`lib/catFoodData.ts`） | 30-50款够用，零运维 |
| 认证 | JWT + bcryptjs（自研，无第三方库依赖） | 轻量、完全控制 |
| 部署 | Vercel（Serverless） | 免费额度够 MVP |
| 数据库（v2 规划） | Supabase / PostgreSQL | 用户增长后迁移 |

### 7.2 页面路由规划

```
/                              — 首页（产品介绍 + 开始按钮）
/recommend                     — 推荐流程（Step 0-3，单页多步骤）
/result/[id]                   — 推荐结果页（可分享）
/profile                       — 个人档案页（需登录，含我的猫咪列表）
/profile/pets/[petId]          — 单只宠物健康档案页
/api/recommend                 — 推荐接口（调用 DeepSeek + 猫粮数据库）
/api/auth/signup               — 用户注册
/api/auth/login                — 用户登录（支持 clientHash 无状态路径）
/api/auth/logout               — 登出
/api/pets/[petId]/assessment   — AI 健康评估（接受 pet+logs，DeepSeek 生成）
```

---

## 八、MVP 不包含（明确排除）

- ❌ 狗粮推荐（v2）
- ❌ 健康事件时间线记录（v1.5）
- ❌ 用户评价/晒图社区（v2）
- ❌ 商城/自营（不做）
- ❌ APP（先 Web）
- ❌ 付费墙（MVP 先免费验证，付费 v1.5）
- ❌ 广告投放后台（v2）

---

## 九、成功指标（MVP 阶段）

| 指标 | 目标值 | 衡量周期 |
|------|--------|---------|
| 完成推荐流程的用户 | > 100人/月 | 上线后第1个月 |
| 推荐结果页分享率 | > 15% | 持续监控 |
| 用户主动保存档案比例 | > 30% | 持续监控 |
| 用户反馈"推荐有帮助" | > 70% | 问卷调研 |

---

## 十、风险与应对

| 风险 | 概率 | 影响 | 应对方案 |
|------|------|------|---------|
| LLM 推荐不准确/幻觉 | 中 | 高 | 数据库硬约束 + 免责声明 |
| 产品停产/配方变更 | 高 | 中 | 数据库定期人工复核（季度） |
| 用户因推荐造成猫咪健康问题 | 低 | 高 | 免责声明 + "建议咨询兽医" |
| Vercel 免费额度 LLM 调用超限 | 中 | 中 | 设置 rate limit，早期人工审核 |

---

## 十一、下一步行动

- [x] **Design Agent** 输出 UI/UX 设计蓝图
- [x] **Dev Agent** 搭建 Next.js 项目基础框架
- [x] **数据整理** 完成首批 30-50 款猫粮数据录入
- [x] **Prompt 工程** 设计推荐 System Prompt

---

## 十二、用户认证系统（v1.1 新增）

**背景：** 用户反馈每次都要重新输入信息，缺乏档案记忆能力。

### 12.1 设计原则

- **推荐流程不打断** — 注册/登录不在推荐步骤中出现
- **最优时机触发** — 用户看到推荐结果后，主动点击"保存推荐"才弹出注册
- **轻量注册门槛** — 仅需用户名 + 邮箱 + 密码（昵称可选）

### 12.2 注册表单字段

| 字段 | 必需 | 约束 |
|------|------|------|
| username | ✅ | 3-20 字符，英数字下划线 |
| email | ✅ | 唯一性检查 |
| password | ✅ | 最少 6 字符，bcryptjs 加密存储 |
| nickname | ❌ | 最多 50 字符，展示在档案页 |

### 12.3 认证交互流程

```
结果页 → 用户点击"保存推荐"
  ├─ 未登录 → 弹出注册弹窗（SignupModal）
  │     ↓ 填写并注册成功
  │   自动保存当前推荐到账户 + 显示"✓ 已保存"
  │
  └─ 已登录 → 直接调用 /api/recommend/save → 显示"✓ 已保存"

弹窗内"已有账号？登录" → 切换为 LoginModal
登录成功 → 自动保存推荐
```

### 12.4 新增路由

| 路由 | 说明 |
|------|------|
| `POST /api/auth/signup` | 注册（唯一性检查 + bcryptjs 加密 + JWT 返回） |
| `POST /api/auth/login` | 登录（密码验证 + JWT 返回） |
| `POST /api/auth/logout` | 登出（客户端清除 token） |
| `POST /api/recommend/save` | 保存推荐到账户（需 JWT） |
| `/profile` | 用户档案页（查看历史推荐） |

### 12.5 Session 规范

- JWT 有效期：**7 天**
- 存储位置：`localStorage.sessionToken`
- 用户信息缓存：`localStorage.user`（username / nickname / email）

---

## 十三、性能优化（v1.1 新增）

**背景：** 用户反馈 AI 推荐响应时间 10-20 秒，影响留存。

### 13.1 推荐结果缓存

- **缓存维度：** MD5(品种 + 排序后健康标签) 作为缓存键
- **TTL：** 5 分钟自动过期
- **LRU 上限：** 100 条（超出时清理最旧记录）
- **预期命中率：** 30-40%（初期）
- **响应时间：** 命中 <1s，未命中 10-11s，加权平均 **7-8s**（较原 12.7s 提升 ~40%）

### 13.2 技术实现

| 组件 | 文件 | 说明 |
|------|------|------|
| 缓存管理 | `/lib/cache.ts` | RecommendCache 类，单例模式 |
| 缓存类型 | `/types/cache.ts` | CacheEntry / CacheKey |
| API 集成 | `/app/api/recommend/route.ts` | 请求前查缓存，生成后写缓存 |

---

---

## 十四、全站导航认证状态（v1.2 新增）

**背景：** 用户无法在首页和推荐页直接感知登录状态，登录/注册入口缺失。

### 14.1 AuthNav 组件规格

适用页面：**首页导航栏**、**推荐页顶部**

| 状态 | 显示内容 |
|------|---------|
| 未登录 | 单按钮 `[登录/注册]`（橙色描边样式） |
| 已登录 | `🐾 昵称/用户名`（链接至 /profile） + `退出` 文字按钮 |

**点击"登录/注册"：**
- 打开统一 Auth 弹窗，**默认展示登录表单**
- 弹窗内"还没有账号？注册"→ 切换注册表单
- 注册表单内"已有账号？登录"→ 切回登录表单

---

## 十五、推荐流程猫咪档案记忆（v1.2 新增）

**背景：** 用户每次推荐都需重新填写猫咪信息；已有历史时应提供快捷入口。

### 15.1 本地持久化数据结构

```
localStorage key: 'lastCatSession'

{
  // 第一阶段：Step 1 → Step 2 时写入
  name, breed, ageMonths, weightKg, gender, neutered,
  // 第二阶段：点击生成推荐时追加（保留历史健康上下文）
  healthTags: HealthTag[],
  customInput: string
}
```

写入时机：
- **猫咪信息**：Step 1 → Step 2 时，合并写入（保留已有 healthTags/customInput）
- **健康需求**：点击"生成推荐"前，追加写入 healthTags + customInput

### 15.2 推荐页完整状态机（v1.1 里程碑更新）

```
进入 /recommend（初始化读取 localStorage）
  ├─ 已登录用户（nutrapaw_pets_${username} 有宠物） → Step 0（多宠物模式）
  ├─ 未登录 + lastCatSession 有值 → Step 0（单宠物模式）
  └─ 无历史数据 → Step 1（直接开始填写）

Step 0  猫咪快捷选择（不显示进度条）
  ├─ 【已登录，多宠物模式】：
  │   H1：「为哪只猫咪生成推荐？」
  │   每只猫一张卡片（来自 nutrapaw_pets_${username}）
  │   卡片信息：猫名 · 品种 · 年龄 · 体重 · 性别（只读）
  │   点击卡片 → 预填 form → 跳 Step 2（selectSavedPet）
  │   [+ 为新猫咪推荐] → 清空所有状态 → Step 1
  │
  ├─ 【未登录 / 无档案，单宠物模式】：
  │   H1：「继续上次的推荐？」
  │   单卡片（lastCatSession）
  │   [继续推荐 →] → 预填 form/healthTags → Step 2
  │   [+ 添加新猫咪] → 清空 → Step 1
  │
  └─ 两种模式共有：底部"+ 为新猫咪推荐"按钮

Step 1  基本信息（进度条 Step 1）
  ├─ 若有 lastCatSession 或 savedPets：顶部显示"← 返回猫咪选择"→ Step 0
  └─ [下一步] → 写入 localStorage → Step 2

Step 2  健康需求（进度条 Step 2）
  ├─ 顶部只读猫咪摘要卡（品种/年龄/体重/性别）
  ├─ 来自 Step 0 + 同名猫有历史健康需求：
  │   提示「已加载上次的健康需求，请确认是否有变化」
  │   预填 healthTags + customInput（可增减/修改）
  ├─ [← 返回] → step2From === 'step0' ? Step 0 : Step 1
  └─ [✨ 生成推荐] → 写入 localStorage → 调用 API

Step 3  Loading（进度条 Step 3，现有逻辑不变）
```

### 15.3 多宠物模式数据来源

| 数据键 | 内容 | 写入时机 |
|--------|------|---------|
| `nutrapaw_pets_${username}` | `Pet[]`（完整档案列表） | 结果页「加入档案」时写入 |
| `lastCatSession` | 最后一次推荐的单猫信息 | Step 1→Step 2、点击「生成推荐」时写入 |

**优先级：** 已登录 + `nutrapaw_pets_${username}` 有数据 → 多宠物模式；否则回退到 `lastCatSession` 单宠物模式。

### 15.3 进度条规则

| Step | 进度条 | currentStep |
|------|--------|-------------|
| 0（猫咪选择） | ❌ 隐藏 | — |
| 1（基本信息） | ✅ | 1 |
| 2（健康需求） | ✅ | 2 |
| 3（生成中）   | ✅ | 3 |

### 15.4 UI 设计规范

与现有设计系统严格保持一致：

| 元素 | 样式规范 |
|------|---------|
| Step 0 历史猫咪卡片 | `bg-white border-2 border-[#E8E6E1]`，hover: `border-[#E8721A] bg-[#FFF8F3]`，`rounded-2xl` |
| Step 0 新猫咪按钮 | `border-2 border-dashed border-[#E8E6E1]`，hover: `border-[#FFB87A]` |
| Step 2 猫咪摘要卡 | `bg-[#FFF8F3] border border-[#FFD9B5] rounded-xl`（与已选标签汇总卡一致） |
| Step 2 历史需求提示 | `bg-[#FFF8F3] border border-[#FFD9B5] rounded-xl`，前缀 🔔 |
| AuthNav 未登录按钮 | `border border-[#E8721A] text-[#E8721A]`，hover 填充橙色 |
| AuthNav 已登录 | 头像 `bg-[#FFD9B5]` 圆圈，用户名 `text-[#78746C]`，退出 `text-[#A8A49C]` |

---

*v1.0 — 2026-02-28 初始发布*
*v1.1 — 2026-03-01 新增用户认证系统 + 推荐缓存优化*
*v1.2 — 2026-03-01 新增全站 AuthNav + 推荐流程猫咪档案记忆*
*v1.3 — 2026-03-01 新增宠物健康日志系统 + AI 健康评估*

---

## 十六、宠物健康日志系统（v1.3 新增）

**背景：** 单次推荐解决"现在买什么"，健康日志解决"长期方向对不对"。用户需要量化依据来判断猫咪健康趋势，支持喂养决策调整。

### 16.1 核心数据模型

#### Pet（宠物档案，持久实体）

```
Pet {
  id: UUID
  userId: string
  name, breed, gender, neutered, ageMonths, weightKg（基准）
  createdAt, updatedAt
}
```

#### PetHealthLog（周期性健康记录）

```
PetHealthLog {
  id: UUID
  petId, userId
  date: YYYY-MM-DD（同一天只允许一条）
  weightKg?: number（可选，非每次都称重）
  appetite: excellent|normal|poor
  energy: active|normal|lethargic
  drinking: lots|normal|little
  stool: normal|loose|hard|no_info
  vomiting: none|occasional|frequent
  notes?: string（自由文字备注）
  createdAt
}
```

#### HealthAssessment（AI 健康评估，带缓存）

```
HealthAssessment {
  id: UUID
  petId
  generatedAt, expiresAt（缓存 48h）
  basedOnLogs: number（使用了几条记录）
  overallStatus: excellent|good|attention|concern
  summary: string（一句话总结）
  keyFindings: string[]（2-3条）
  dietaryAdvice: string（饮食建议）
  careTips: string[]（护理注意事项）
}
```

### 16.2 用户交互流程

```
推荐结果页（已登录）
  → 出现「将 [猫名] 加入我的健康档案」横幅
  → 点击后一键创建 Pet，跳转至宠物档案页

个人档案页（/profile）新增「我的猫咪」区块
  → 显示每只猫状态卡：名字/品种/最近记录/健康状态色
  → [+ 添加猫咪] 入口

宠物健康档案页（/profile/pets/[petId]）
  ├─ 基本信息卡（只读）
  ├─ [+ 记录今日状况] 按钮 → 弹出 LogEntryModal
  ├─ AI 健康评估卡（用户点击「生成评估」触发，缓存 48h）
  └─ 历史日志时间线（倒序）
```

### 16.3 AI 评估规格

- **触发方式：** 用户主动点击「生成/刷新健康评估」按钮
- **最低数据量：** 1 条日志即可生成（提示「数据越多越准确」）
- **缓存策略：** 48h 有效，过期后需重新点击触发
- **模型：** DeepSeek API，JSON 格式返回
- **日志上限：** 最近 10 条记录参与评估

### 16.4 数据持久化架构（v1.3 实施：全 localStorage）

**背景：** Vercel Serverless 冷启动后内存 Map 被清空，导致宠物档案/日志/评估丢失。v1.3 将全部数据迁移至客户端 localStorage，与推荐结果 `result_${id}` 的现有模式保持一致。

| localStorage 键 | 类型 | 说明 |
|-----------------|------|------|
| `nutrapaw_pets_${username}` | `Pet[]` | 用户的全部宠物档案 |
| `nutrapaw_logs_${petId}` | `PetHealthLog[]` | 某只宠物的所有日志 |
| `nutrapaw_assessment_${petId}` | `HealthAssessment \| null` | AI 评估结果（含 48h expiresAt） |
| `nutrapaw_user_auth` | 认证凭证对象 | 见第十七章 |

工具函数：`lib/petLocalStore.ts`，导出 `getPets / savePet / getLogs / saveLog / getAssessment / saveAssessment / generateId`。

### 16.5 API 端点（v1.3 重构后）

```
POST /api/pets/[petId]/assessment
  — 接受请求体：{ pet: Pet, logs: PetHealthLog[] }
  — 调用 DeepSeek API 生成 JSON 评估
  — 返回 HealthAssessment 对象（客户端调用 saveAssessment() 缓存）
  — 仅需 JWT 验证，不查询服务端 Map
```

> **注意：** `/api/pets`、`/api/pets/[petId]/logs` 等读写路由不再被前端调用，数据改由 localStorage 管理。API 路由保留但废弃。

### 16.6 UI 设计规范（沿用设计系统）

| 元素 | 样式 |
|------|------|
| 宠物卡片（Profile 页） | `bg-white border border-[#E8E6E1] rounded-2xl`，hover 提升阴影 |
| 状态色：良好 | `text-green-600 bg-green-50` |
| 状态色：需关注 | `text-amber-600 bg-amber-50` |
| 状态色：建议就医 | `text-red-600 bg-red-50` |
| AI 评估卡 | `bg-[#FFF8F3] border border-[#FFD9B5] rounded-2xl` |
| 日志条目 | 左侧彩色圆点指示健康状态，右侧文字摘要 |
| LogEntryModal | 复用 Modal 设计规范（createPortal + z-9999 + 蒙版）|

---

## 十七、客户端持久化架构（v1.3 总结）

**核心决策：** 所有用户数据（宠物、日志、评估、认证凭证）存储于浏览器 localStorage，服务端保持完全无状态（Stateless）。

### 17.1 localStorage 完整键映射

| 键名 | 类型 | 写入场景 | 读取场景 |
|------|------|---------|---------|
| `result_${id}` | `RecommendResult` | 推荐 API 返回时 | 结果页加载时 |
| `lastCatSession` | `CatSession` | Step 1→2 + 点击生成推荐 | 推荐页 useEffect |
| `user` | `{ id, username, email, nickname }` | 注册/登录成功时 | AuthNav、各页面验权 |
| `sessionToken` | JWT string | 注册/登录成功时 | API 调用时 Authorization header |
| `nutrapaw_user_auth` | `{ id, username, email, nickname, passwordHash, createdAt }` | 注册成功时（SignupModal） | 登录时（LoginModal） |
| `nutrapaw_pets_${username}` | `Pet[]` | 结果页「加入档案」 | 推荐页 Step 0、档案页 |
| `nutrapaw_logs_${petId}` | `PetHealthLog[]` | 宠物档案页「记录今日」 | 宠物档案页历史列表 |
| `nutrapaw_assessment_${petId}` | `HealthAssessment \| null` | AI 评估返回后 | 宠物档案页评估卡片 |

### 17.2 架构优势与局限

| 优势 | 局限 |
|------|------|
| 零服务端存储成本 | 数据仅在本设备可见 |
| Vercel Redeploy 不影响用户数据 | 清除浏览器数据即丢失 |
| 无数据库维护成本 | 无法跨设备同步（v2 规划迁移 Supabase） |
| 与现有推荐结果持久化逻辑一致 | 无服务端备份 |

### 17.3 认证无状态路径（v1.1 里程碑新增）

传统认证需要服务端 Map 验证密码；Vercel Redeploy 后 Map 清空，导致用户无法登录。

**解决方案：** 注册时将 bcrypt hash 随响应返回，客户端存入 `nutrapaw_user_auth.passwordHash`。下次登录时附带 `clientHash`，服务端直接做 `bcrypt.compare()` 而无需查询 Map。

```
注册流程：
  客户端 POST /api/auth/signup → 服务端返回 { user, sessionToken, passwordHash }
  客户端写入 nutrapaw_user_auth = { ...user, passwordHash }

登录流程（clientHash 路径）：
  客户端读取 nutrapaw_user_auth → 找到同名用户 → 附带 clientHash
  POST /api/auth/login { username, password, clientHash, clientId, ... }
  服务端：bcrypt.compare(password, clientHash) → 验证通过 → 返回 sessionToken

登录流程（回退路径）：
  本地无 nutrapaw_user_auth → 走服务端 Map 路径（首次或旧设备）
```

**安全性：** bcrypt hash 不可逆，存在 localStorage 中无法被还原为明文密码。风险与 JWT 存储在 localStorage 相同级别（已知 MVP 可接受的安全姿态）。

---

## 十八、v1.1 里程碑 Bug Fix Round 2

**上线版本：** commit `7aed51d`，2026-03-01

### 18.1 Bug 清单与根因

| Bug ID | 现象 | 根本原因 | 修复方案 |
|--------|------|---------|---------|
| BUG-04 | 推荐历史页只显示 1 只猫，档案页有 2 只 | `recommend/page.tsx` 只读 `lastCatSession`（单 key），未读 `nutrapaw_pets_${username}`（多猫列表） | 已登录时读取完整宠物列表，Step 0 渲染所有宠物卡片 |
| BUG-05 | Vercel Redeploy 后账号消失，需重新注册 | `lib/resultStore.ts` 内存 Map 被清空，登录验证依赖服务端状态 | 认证无状态路径：bcrypt hash 持久化在 localStorage |
| BUG-06 | 同一只猫可重复加入档案 | `handleAddToPetProfile()` 每次创建新 UUID，无去重逻辑；刷新后 `petAddStatus` 重置 | 挂载时检查 `resultId` 是否已存在；创建前检查 `resultId` 或 `name` 重复 |

### 18.2 修改文件清单

| 文件 | 改动摘要 |
|------|---------|
| `app/result/[id]/page.tsx` | 新增挂载恢复 petAddStatus 的 useEffect；handleAddToPetProfile 添加去重检查 |
| `app/recommend/page.tsx` | 新增 savedPets state；useEffect 读取多宠物列表；新增 selectSavedPet 函数；Step 0 多卡片 JSX |
| `app/api/auth/login/route.ts` | 支持 clientHash 无状态路径，保留服务端 Map 回退 |
| `app/api/auth/signup/route.ts` | 响应中新增 passwordHash 字段 |
| `components/auth/LoginModal.tsx` | 登录时读取 nutrapaw_user_auth，附加 clientHash 到请求体 |
| `components/auth/SignupModal.tsx` | 注册成功后写入 nutrapaw_user_auth 到 localStorage |
| `types/auth.ts` | AuthResponse 新增可选字段 passwordHash |

### 18.3 已知局限（MVP 可接受）

- BUG-05 解决方案：新设备登录（无 localStorage）仍需重新注册，这是当前架构下的已知限制；v2 迁移数据库后可完全解决。
- BUG-06：按 `resultId` 和 `name` 去重（同名不同来源的猫咪视为同一只），适合 MVP；v2 可改为按 `petId` 严格去重。

---

*文档将随需求迭代持续更新，代码变更须先更新此文档。*

---
*v1.0 — 2026-02-28 初始发布*
*v1.1 — 2026-03-01 新增用户认证系统 + 推荐缓存优化*
*v1.2 — 2026-03-01 新增全站 AuthNav + 推荐流程猫咪档案记忆*
*v1.3 — 2026-03-01 新增宠物健康日志系统 + AI 健康评估（localStorage 架构）*
*v1.1 里程碑 — 2026-03-01 Bug Fix Round 2（3 大 Bug 修复），正式发布*
