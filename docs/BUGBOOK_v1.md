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
