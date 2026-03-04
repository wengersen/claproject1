# NutraPaw 错题本 · BUGBOOK_v1

> 记录每次部署/编译失败的根因、修复方法和预防规则。  
> 每次新增条目追加在文件末尾，格式统一，方便 Code Review 和 AI 上下文检索。

---

## 命名约定

| 字段 | 格式 |
|------|------|
| 文件名 | `BUGBOOK_vN.md`（N 为版本号，内容超 200 行时升版） |
| 条目编号 | `BUG-NNNN`（四位数字，从 0001 递增） |
| 严重级别 | 🔴 Build-Blocker / 🟡 Runtime-Error / 🟢 UX-Issue |

---

## BUG-0001 · TypeScript 可选字段直接赋给必选字段导致构建失败

**日期**：2026-03-04  
**严重级别**：🔴 Build-Blocker（Vercel 构建中止，服务无法部署）  
**错误信息**：

```
./lib/resultStore.ts:134:5
Type error: Type 'string | undefined' is not assignable to type 'string'.
  Type 'undefined' is not assignable to type 'string'.
```

### 根因分析

`types/cat.ts` 中 `RecommendResult.id` 被定义为**可选字段**：

```ts
// types/cat.ts
export interface RecommendResult {
  id?: string   // ← 可选，类型为 string | undefined
  ...
}
```

而 `types/auth.ts` 中 `StoredRecommendation.resultId` 是**必选字段**：

```ts
// types/auth.ts
export interface StoredRecommendation {
  resultId: string  // ← 必选，只接受 string
  ...
}
```

在 `lib/resultStore.ts:134` 直接赋值时 TypeScript 严格模式拒绝了 `string | undefined → string` 的隐式转换：

```ts
resultId: result.id,   // ❌ 编译失败
```

### 为什么本地没报错？

- 本地开发用 `next dev`（Turbopack），**不执行完整 tsc 类型检查**；
- Vercel 生产构建执行 `next build`，其中包含 `tsc --noEmit` 全量检查，严格模式下此类错误会中止构建。

### 修复方案

**方案 A（采用）** — 非空断言 `!`：适用于调用方已保证值存在、但类型声明无法表达这一契约的场景。

```ts
// lib/resultStore.ts:134
resultId: result.id!,  // ✅ 告知编译器此处 id 必然有值
```

> 在注释中说明理由：`saveRecommendation` 的调用方（`/api/recommend/save/route.ts`）已从 URL 路径中拿到 resultId 并注入到 result 对象，因此 id 必然存在。

**方案 B（备选）** — 收窄类型声明：若 `id` 在业务上从未为 undefined，改为必选字段更彻底。

```ts
// types/cat.ts
export interface RecommendResult {
  id: string   // 去掉 ?，但需同步更新所有构造 RecommendResult 的地方
  ...
}
```

**方案 C（备选）** — 运行时 Guard：

```ts
if (!result.id) throw new Error('saveRecommendation: result.id is required')
resultId: result.id,
```

### 预防规则

1. **每次 commit 前本地执行 `npx tsc --noEmit`**，捕获 Vercel 会拦截的类型错误。
2. **可选字段（`field?`）赋给必选字段前，必须显式处理 `undefined`**：
   - 用 `!` 并附注释说明为何安全；
   - 或用 `?? defaultValue` 提供回退值；
   - 或用 `if (!x) throw` Guard 运行时保护。
3. **跨接口字段复用时核对可选性**：源接口 `id?` ≠ 目标接口 `resultId`，字段名变化容易掩盖类型不兼容。

### 涉及文件

| 文件 | 行 | 变更 |
|------|----|------|
| `lib/resultStore.ts` | 134 | `result.id` → `result.id!` + 注释 |

### Commit

```
40f6f90  fix(ts): resultStore.ts:134 — non-null assert result.id! to satisfy StoredRecommendation.resultId: string
```

---

## BUG-0002 · 本地开发调用 DeepSeek API 超时导致推荐服务 500

**日期**：2026-03-05  
**严重级别**：🟡 Runtime-Error（本地开发环境，生产环境不影响）  
**错误信息**：

```
推荐服务暂时不可用（500）
AbortError: This operation was aborted
  at AbortController.abort (node:internal/abort_controller:506:18)
  at Timeout._onTimeout ...  ← 30s AbortController 超时触发
```

### 根因分析

`/api/recommend/route.ts` 中对 DeepSeek API 的调用设有 **30 秒 AbortController 超时**。  
本地开发环境（中国大陆网络）**无法直连** `api.deepseek.com`，请求始终在 30 秒后被强制中止，触发 AbortError → 被外层 `catch` 捕获 → 返回 HTTP 500。

整条链路：
```
前端 → POST /api/recommend → DeepSeek fetch（超时30s）→ AbortError → catch → 500
```

### 为什么生产环境正常？

Vercel 部署在美国/新加坡节点，可直连 DeepSeek 国际 API，延迟 < 10s，30s 超时不触发。

### 修复方案

**开发/生产环境分离**：用 `process.env.NODE_ENV` 判断，开发环境直接生成 Mock 结果跳过网络调用：

```ts
if (process.env.NODE_ENV === 'development') {
  // DEV MOCK：按数据库顺序排列，标注 [DEV MOCK] 方便识别
  llmResult = { dryFood: [...], wetFood: [...] }
} else {
  // PRODUCTION：走真实 DeepSeek API + 30s AbortController
  message = await client.chat.completions.create(...)
}
```

Mock 数据包含完整结构（`feedingGuide`、`highlights`、`warnings`），确保前端所有 UI 组件都能正常渲染测试。

### 预防规则

1. **凡依赖外部网络的 API 调用，必须提供 `NODE_ENV=development` 下的 Mock 路径**，不能让本地开发因网络不通而 500。
2. **错误信息应暴露根因**：catch 块在开发环境应返回 `stack` 和 `raw`，方便快速定位（已实现）。
3. **本地测试外部 API 连通性**：新增外部依赖时，先用 `curl api.xxx.com` 确认本地可达，不可达则提前设计 mock。

### 涉及文件

| 文件 | 变更 |
|------|------|
| `app/api/recommend/route.ts` | 加 `NODE_ENV` 分支，`development` 走 Mock，`production` 走真实 DeepSeek |

---
