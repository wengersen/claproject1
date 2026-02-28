# DESIGN_v1.md — 猫咪营养顾问 UI/UX 设计规范

**版本：** v1.0
**日期：** 2026-02-28
**状态：** 已确认，指导开发
**关联文档：** PRD_v1.md

---

## 一、设计哲学

**暖色但不幼稚** — 砖橙 `#E8721A` 替代常见的卡哇伊粉，维持专业医学顾问质感。
**信息密度克制** — 每个产品卡片最多展示 4 个关键成分标签，过多信息折叠进详情。
**移动端优先** — 所有组件从 320px 起设计，逐步增强到桌面端体验。
**参考风格：** Linear.app 的克制感 + Notion 的温暖中性感。

---

## 二、色彩系统

### 品牌主色 — 砖橙色系

```
brand-50:  #FFF8F3   极浅暖白，主背景
brand-100: #FFEEDD   浅橙，卡片悬停背景
brand-200: #FFD9B5   浅橙，tag 背景
brand-300: #FFB87A   中橙，装饰色
brand-400: #FF9240   活跃橙，hover state
brand-500: #E8721A   主色，CTA 按钮 / 强调
brand-600: #C45C0A   深橙，按钮 pressed
brand-700: #9A4208   更深，文字链接
```

### 中性色 — 略带暖色调的灰

```
neutral-0:   #FFFFFF
neutral-50:  #FAFAF8   页面次级背景
neutral-100: #F4F3F0   卡片背景
neutral-200: #E8E6E1   分割线 / border
neutral-300: #D1CEC7   placeholder / disabled
neutral-400: #A8A49C   caption 文字
neutral-500: #78746C   secondary 文字
neutral-600: #4A4641   body 文字
neutral-700: #2E2B27   标题文字
neutral-800: #1A1815   主标题
neutral-900: #0D0C0A   极深，几乎不用
```

### 状态色

```
success: bg #F0FDF4 / text #166534 / border #BBF7D0 / icon #22C55E
warning: bg #FFFBEB / text #92400E / border #FDE68A / icon #F59E0B
error:   bg #FFF1F2 / text #9F1239 / border #FECDD3 / icon #F43F5E
```

### 健康标签专用色

```
tag-urinary: #EFF6FF   泌尿道 — 冷蓝
tag-weight:  #F0FDF4   减重 — 嫩绿
tag-digest:  #FFF7ED   消化 — 暖橙
tag-skin:    #FDF4FF   皮肤 — 淡紫
tag-joint:   #ECFDF5   关节 — 薄荷
```

### Tailwind 使用约定

```
背景层级：
  L0 主背景   bg-[#FFF8F3]
  L1 容器     bg-[#FAFAF8]
  L2 卡片     bg-white border border-[#E8E6E1]
  L3 强调卡片 bg-[#F4F3F0]

CTA 按钮：
  Primary:   bg-[#E8721A] hover:bg-[#C45C0A] text-white
  Secondary: bg-white border border-[#E8E6E1] hover:bg-[#F4F3F0] text-[#4A4641]
  Ghost:     text-[#E8721A] hover:bg-[#FFF8F3]
```

---

## 三、字体系统

### 字体家族

```
标题：Outfit (Google Fonts) — 现代几何感
正文：Inter (Google Fonts) — 高可读性
数字：font-mono — 价格/评分展示
中文 fallback：'PingFang SC', 'Microsoft YaHei', sans-serif
```

### 字号层级

```
Display  text-[52px] lg:text-[72px] font-bold leading-[1.1] tracking-tight  — 首页大标题
H1       text-[32px] lg:text-[40px] font-bold leading-[1.2] tracking-tight  — 页面主标题
H2       text-[22px] lg:text-[26px] font-semibold leading-[1.3]             — 区块标题
H3       text-[17px] lg:text-[19px] font-semibold leading-[1.4]             — 卡片标题
H4       text-[14px] font-semibold leading-[1.4] uppercase tracking-wide    — 小节标题 / 标签
Body     text-[15px] lg:text-[16px] font-normal leading-[1.6]               — 正文
Body-sm  text-[14px] font-normal leading-[1.5]                              — 次要正文
Small    text-[13px] font-normal leading-[1.4]                              — 辅助文字
Caption  text-[11px] font-medium leading-[1.3] tracking-wide uppercase      — 最小/标注
数字展示  font-mono text-[20px] font-bold text-[#E8721A]                     — 评分/价格
```

---

## 四、间距与形状系统

### 圆角

```
rounded-sm   4px  — 标签 tag
rounded-lg   8px  — 输入框
rounded-xl   12px — 小卡片
rounded-2xl  16px — 主卡片
rounded-3xl  24px — Hero 大卡片 / Bento item
rounded-full      — 头像 / 圆形按钮
```

### 阴影

```
shadow-sm  — 卡片默认状态
shadow-md  — 卡片 hover 状态
shadow-xl  — 浮层 / Modal
暖光阴影：  box-shadow: 0 4px 24px rgba(232, 114, 26, 0.12)  — CTA 按钮
```

### 容器宽度

```
max-w-[640px]   — 表单页面（推荐流程）
max-w-[900px]   — 结果页
max-w-[1280px]  — 首页 Bento Grid
px-4 md:px-8 lg:px-16  — 统一水平 padding
```

---

## 五、首页布局 — Bento Grid

### 网格规范

```
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-5
```

### Item 布局定义

```
┌─────────────────────────────────────────────────┐
│ Item A: Hero 主卡片                               │
│ lg:col-span-7 row-span-2  min-h-[380px]         │
│ bg-[#E8721A] rounded-3xl p-8                    │
│ 内容：badge + Display标题 + 说明文字 + CTA按钮     │
│ 装饰：右侧半透明猫咪 SVG                          │
└─────────────────────────────────────────────────┘

┌────────────────┐  ┌────────────────┐
│ Item B: 数据卡  │  │ Item C: 特性卡  │
│ lg:col-span-3  │  │ lg:col-span-2  │
│ min-h-[180px]  │  │ min-h-[180px]  │
│ bg-white       │  │ bg-neutral-100 │
│ 数字+"只猫受益" │  │ 图标+"兽医级依据"│
└────────────────┘  └────────────────┘

┌────────────────┐  ┌──────────────────────────────┐
│ Item D: 特性卡  │  │ Item E: 流程说明卡             │
│ lg:col-span-2  │  │ lg:col-span-5  min-h-[180px] │
│ bg-brand-100   │  │ bg-white                     │
│ 图标+"天然成分" │  │ 三步流程：填写→选择→获取方案   │
└────────────────┘  └──────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Item F: 品牌信任带（全宽）                        │
│ lg:col-span-12  bg-neutral-100                  │
│ 已收录品牌 + logo 横排                           │
└─────────────────────────────────────────────────┘

┌──────────────────────────┐  ┌──────────────────┐
│ Item G: 用户评价卡        │  │ Item H: 黑色CTA卡 │
│ lg:col-span-7            │  │ lg:col-span-5    │
│ bg-white                 │  │ bg-neutral-800   │
│ 引号+评价+用户信息         │  │ 白色文字 + CTA按钮│
└──────────────────────────┘  └──────────────────┘
```

---

## 六、推荐流程页 `/recommend`

### 步骤进度条（sticky top-16）

```
三步指示器，激活步骤有橙色光晕 ring-4 ring-[#E8721A]/20
完成步骤：bg-[#E8721A] text-white，连接线 bg-[#E8721A]
当前步骤：bg-[#E8721A] text-white ring-4 ring-[#E8721A]/20
未到达：  border-2 border-[#D1CEC7] text-[#A8A49C]
```

### Step 1 — 基本信息

```
猫咪名字：超大输入框，text-[28px] font-bold text-center，居中占位符
品种选择：搜索框+下拉列表，热门品种快捷标签（圆形chip）
年龄+体重：grid grid-cols-2 gap-4
性别+绝育：大卡片式单选（选中 border-2 border-[#E8721A] + 右上角 ✓）
```

### Step 2 — 健康需求

```
标签网格：grid-cols-2 md:grid-cols-3 gap-3
每个标签卡片：图标+名称+描述
选中：border-[#E8721A] bg-[#FFF8F3]，右上角橙色 ✓ badge
自定义输入：min-h-[80px] resize-y textarea
```

### Step 3 — AI 生成中 Loading

```
中央猫爪印动画（CSS，pulsing + floating）
动态文字轮播（每2秒切换）：
  "正在分析 [猫名] 的营养需求..."
  "匹配 50+ 款猫粮配方..."
  "评估蛋白质与脂肪比例..."
  "生成专属推荐方案..."
底部进度条：0→100% CSS动画，duration 3-4s
```

---

## 七、结果页 `/result/[id]`

### 顶部摘要栏

```
bg-white border rounded-2xl p-6
左：猫头像（圆形，bg-[#FFD9B5]）+ 猫名 + 基本信息
右：健康需求 chip 标签
右上角：重新评估 + 分享结果 按钮
```

### 产品卡片（主粮，全宽）

```
左：产品图片 w-20 h-20 bg-[#F4F3F0] rounded-xl
中：品牌名(caption) + 产品名(H3) + 推荐理由(bg-[#FFF8F3] border-l-4 border-[#E8721A])
   成分亮点标签 flex-wrap
右：价格 text-[22px] font-mono + 月均消费 + 查看详情按钮

最优推荐（第一张）：border-2 border-[#E8721A] + 左上角"✦ 最优推荐"badge
```

### 产品卡片（罐头，3列网格）

```
grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
竖向卡片：图片(w-full h-40) + 品牌+产品名+规格+价格+推荐理由
```

### 对比功能

```
入口：每张卡片右下角"+ 加入对比"
底部浮动栏：fixed bottom-0，已选产品chip + 查看对比按钮
对比 Modal：bg-white rounded-3xl max-w-[800px]，表格对比，最优值高亮橙色
```

---

## 八、交互状态规范

### 输入框

```
Default: border-[#E8E6E1]
Focus:   border-[#E8721A] ring-4 ring-[#E8721A]/10
Error:   border-[#F43F5E] ring-4 ring-[#F43F5E]/10
Disabled:bg-[#F4F3F0] cursor-not-allowed
过渡：transition-all duration-200
```

### 按钮

```
Primary:
  Default:  bg-[#E8721A] shadow-[0_4px_24px_rgba(232,114,26,0.25)]
  Hover:    bg-[#C45C0A] shadow-[0_6px_32px_rgba(232,114,26,0.35)] -translate-y-px
  Active:   bg-[#9A4208]
  Disabled: bg-[#D1CEC7] cursor-not-allowed

Secondary:
  Default:  bg-white border border-[#E8E6E1]
  Hover:    bg-[#F4F3F0]
  Disabled: bg-[#F4F3F0] text-[#A8A49C]

过渡：transition-all duration-150
```

### 标签卡片

```
Default:  border-[#E8E6E1] bg-white
Hover:    border-[#FFB87A] bg-[#FFF8F3] scale-[1.01]
Selected: border-[#E8721A] bg-[#FFF8F3] + 右上角 ✓ badge
过渡：transition-all duration-150
```

### 产品卡片

```
Default:  border-[#E8E6E1] shadow-sm
Hover:    border-[#FFB87A] shadow-md -translate-y-0.5
Selected（对比中）：ring-2 ring-[#E8721A]/20
最优推荐：border-2 border-[#E8721A]（常驻）
```

---

## 九、响应式策略

```
移动端 (< 768px)：  单列，按钮全宽，卡片垂直堆叠
平板端 (768-1023px)：Bento 2列，标签 3列
桌面端 (≥ 1024px)：  完整 12列 Bento，产品卡片横向，Modal 对比
```

---

## 十、组件文件结构

```
components/
  ui/
    Button.tsx        — primary/secondary/ghost variants
    Badge.tsx         — 状态 badge 和标签
    Card.tsx          — 基础卡片容器
    Input.tsx         — 输入框（带状态管理）
    Tag.tsx           — 可选中的健康需求标签
    ProgressSteps.tsx — 步骤进度条
  home/
    HeroGrid.tsx      — Bento Grid 首页
  recommend/
    BreedSelector.tsx — 品种选择器（搜索+下拉）
    HealthTagGrid.tsx — 健康需求标签网格
    LoadingState.tsx  — AI 生成中动画
  result/
    ProductCard.tsx   — 产品卡片（主粮/罐头）
    CompareBar.tsx    — 底部浮动对比栏
    CompareModal.tsx  — 对比弹窗
```

---

*本设计规范由 Design Agent 生成，是 Dev Agent 实现的唯一视觉依据。任何样式变更须先更新本文档。*
