# INTERACTION_FLOW_v1.md — NutraPaw 完整交互流程文档

**版本：** v1.1 里程碑
**日期：** 2026-03-01
**状态：** 正式发布
**关联文档：** PRD_v1.md、DESIGN_v1.md

---

## 一、文档说明

本文档描述 NutraPaw 所有用户场景的完整交互流程，覆盖：
- 用户旅程（User Journey）逐步描述
- 页面跳转与状态变化
- localStorage 读写时机
- 认证状态转换
- 数据流向

---

## 二、用户场景总览

| 场景 ID | 场景名称 | 典型用户 | 关键路径 |
|---------|---------|---------|---------|
| F-01 | 首次访问 → 完成推荐 | 新用户 | 首页 → 推荐流程 → 结果页 |
| F-02 | 注册账号 | 推荐后想保存的用户 | 结果页 → SignupModal → 档案页 |
| F-03 | 登录账号 | 已注册用户 | 任意页面 → LoginModal → 当前页 |
| F-04 | 注册后再次推荐（多宠物） | 有档案的登录用户 | 推荐页 Step 0 → 选猫 → 推荐 |
| F-05 | 加入宠物档案 | 登录用户看到结果 | 结果页 → 一键加入 → 档案页 |
| F-06 | 记录健康日志 | 已有宠物档案的用户 | 宠物档案页 → LogEntryModal → 保存 |
| F-07 | 生成 AI 健康评估 | 有至少 1 条日志的用户 | 宠物档案页 → 点击生成 → 查看评估 |
| F-08 | 分享推荐结果 | 任意看到结果的用户 | 结果页 → 复制链接 → 他人访问 |
| F-09 | Vercel Redeploy 后登录 | 已注册用户（Redeploy 后） | LoginModal → clientHash 路径 → 成功 |

---

## 三、场景 F-01：首次访问 → 完成推荐

```
[首页 /]
  ↓ 点击「开始免费推荐」CTA 按钮
  ↓ 无 localStorage 历史数据

[推荐流程 /recommend — Step 1（基本信息）]
  用户填写：猫名 / 品种 / 月龄 / 体重 / 性别 / 绝育状态
  ↓ 点击「下一步」
  ↓ 写入 localStorage['lastCatSession'] = { name, breed, ageMonths, weightKg, gender, neutered }

[推荐流程 — Step 2（健康需求）]
  顶部：只读猫咪摘要卡（品种 · 年龄 · 体重 · 性别）
  用户选择：健康需求标签（多选）/ 自定义文字输入
  ↓ 点击「✨ 生成推荐」
  ↓ 追加写入 localStorage['lastCatSession'].healthTags + .customInput
  ↓ 显示 Step 3 Loading（进度条 + 猫爪动画 + 轮播文案）

[Step 3 — AI 生成中]
  前端 POST /api/recommend { catProfile, healthTags, customInput }
  ↓ 服务端：查询缓存（cache.get(key)）
        命中 → 直接返回（<1s）
        未命中 → 调用 DeepSeek API（8-12s）→ 写缓存
  ↓ 服务端返回 { id, catProfile, recommendations, createdAt }
  ↓ 客户端写入 localStorage['result_${id}'] = 完整结果
  ↓ 路由跳转 /result/${id}

[结果页 /result/[id]]
  读取 localStorage['result_${id}']（本地优先）
  展示：猫咪信息摘要栏 + 主粮推荐卡片 + 罐头推荐网格
  右上角：「分享结果」按钮（复制链接）
  底部（已登录时）：「将 [猫名] 加入我的健康档案」横幅
  底部（未登录时）：「保存这份推荐」→ 触发 SignupModal
```

**localStorage 变更：**
```
写入: lastCatSession（Step 1→2，点击生成时）
写入: result_${id}（推荐完成时）
```

---

## 四、场景 F-02：注册账号

**触发入口：** 结果页点击「保存推荐」/ 导航栏「登录/注册」

```
[SignupModal 弹出]
  用户填写：用户名（3-20位）/ 邮箱 / 密码（≥6位）/ 昵称（可选）
  ↓ 点击「立即注册并保存推荐」

[前端 POST /api/auth/signup { username, email, password, nickname }]
  服务端：
    1. 验证字段格式（validateSignupForm）
    2. 检查用户名/邮箱唯一性
    3. bcryptjs.hash(password, 10) → passwordHash
    4. 创建 User 对象存入内存 Map（短期）
    5. generateSessionToken(userId, username) → JWT（7天）
    6. 返回 { success, user, sessionToken, expiresIn, passwordHash }

[客户端处理成功响应]
  写入 localStorage['sessionToken'] = data.sessionToken
  写入 localStorage['user'] = JSON.stringify(data.user)
  写入 localStorage['nutrapaw_user_auth'] = {
    id, username, email, nickname, passwordHash, createdAt
  }

  ↓ 弹窗关闭
  ↓ 触发 onSuccess(data as AuthResponse)
  ↓ 页面更新：AuthNav 变为已登录状态

[若从结果页触发注册]
  注册成功后，结果页自动出现「加入档案」按钮（已登录状态）
```

**localStorage 变更：**
```
写入: sessionToken
写入: user
写入: nutrapaw_user_auth（含 passwordHash，用于 Redeploy 后登录）
```

---

## 五、场景 F-03：登录账号

**触发入口：** 导航栏「登录/注册」/ 弹窗内「已有账号？登录」

```
[LoginModal 弹出]
  用户填写：用户名 / 密码
  ↓ 点击「登录」

[前端读取本地凭证（挂载时执行）]
  读取 localStorage['nutrapaw_user_auth']
  若 auth.username === 当前输入用户名：
    authExtra = { clientHash, clientId, clientNickname, clientEmail, clientCreatedAt }
  否则：authExtra = {}

[前端 POST /api/auth/login { username, password, ...authExtra }]

  服务端路径 A（clientHash 存在）：
    bcrypt.compare(password, clientHash) → valid/invalid
    有效 → 生成 sessionToken → 返回 { success, user, sessionToken }
    无效 → 返回 401「用户名或密码错误」

  服务端路径 B（clientHash 不存在）：
    authenticateUser(username, password) → 查询内存 Map
    找到且密码匹配 → 生成 sessionToken → 返回
    未找到 → 返回 401

[客户端处理成功响应]
  写入 localStorage['sessionToken'] = data.sessionToken
  写入 localStorage['user'] = JSON.stringify(data.user)
  ↓ 弹窗关闭，触发 onSuccess → 页面更新认证状态
```

**注意：** 路径 B 在 Vercel Redeploy 后内存 Map 为空，会返回 401；路径 A 完全不依赖服务端状态，Redeploy 后仍可成功。

---

## 六、场景 F-04：再次推荐（多宠物 Step 0）

**前提：** 用户已登录 + `nutrapaw_pets_${username}` 中有 1 只或多只宠物

```
[进入 /recommend]
  useEffect 执行：
    读取 localStorage['user'] → 获取 username
    读取 localStorage['nutrapaw_pets_${username}'] → pets: Pet[]
    若 pets.length > 0：setSavedPets(pets) → 进入 Step 0
    同时读取 lastCatSession（保留，用于健康需求预填）
    setInitializing(false)

[Step 0 — 多宠物模式]
  H1：「为哪只猫咪生成推荐？」
  展示所有宠物卡片（品种 · 年龄 · 体重 · 性别）
  底部：「+ 为新猫咪生成推荐」虚线按钮

  ↓ 用户点击某只猫卡片 → selectSavedPet(pet)

[selectSavedPet 执行]
  setForm({ name, breed, ageMonths: String, weightKg: String, gender, neutered })
  读取 lastCatSession → 若同名猫：
    setHealthTags(lastCatSession.healthTags)
    setCustomInput(lastCatSession.customInput)
  否则：setHealthTags([]) / setCustomInput('')
  setStep2From('step0')
  setStep(2)  ← 直接跳 Step 2，不经过 Step 1

[Step 2 — 健康需求确认]
  顶部：猫咪摘要卡（自动预填）
  若有历史健康需求：显示「已加载上次的健康需求」提示横幅
  用户确认/修改 healthTags / customInput
  [← 返回] → Step 0（step2From === 'step0'）
  ↓ 点击「✨ 生成推荐」→ 后续流程同 F-01 Step 3

  ↓ 用户点击「+ 为新猫咪生成推荐」→ 清空 form/healthTags → Step 1
```

**localStorage 变更：**
```
读取: nutrapaw_pets_${username}
读取: lastCatSession（用于健康需求预填）
写入: lastCatSession（点击生成推荐时更新）
```

---

## 七、场景 F-05：加入宠物档案

**前提：** 用户已登录，正在查看某个推荐结果页

```
[结果页 /result/[id] 挂载]
  读取 localStorage['user'] → 获取 username
  读取 localStorage['nutrapaw_pets_${username}']
  找到 pet.resultId === result.id → setPetAddStatus('added')（已加入，防重复）

  未找到 → petAddStatus = 'idle'
  显示「将 [猫名] 加入我的健康档案」横幅（橙色 CTA）

[用户点击「加入档案」]
  handleAddToPetProfile() 执行：
    读取 localStorage['user'] → parsedUser.username
    读取 nutrapaw_pets_${username} → existingPets
    检查重复：existingPets.find(p => p.resultId === result.id || p.name === catProfile.name)
      → 已有 → setAddedPetId(duplicate.id) → setPetAddStatus('added') → return

    无重复 → 创建新 Pet：
      {
        id: generateId(),         // crypto.randomUUID()
        userId: parsedUser.username,
        name: catProfile.name,
        breed: catProfile.breed,
        gender: catProfile.gender,
        neutered: catProfile.neutered,
        ageMonths: catProfile.ageMonths,
        weightKg: catProfile.weightKg,
        resultId: result.id,      // 关联推荐来源
        createdAt, updatedAt: now,
      }
    savePet(parsedUser.username, newPet)  → 写入 localStorage
    setAddedPetId(newPet.id) → setPetAddStatus('added')

[UI 反馈]
  横幅变为「✓ 已加入档案 · 去查看 →」（链接至 /profile）
  刷新页面后，useEffect 重新检查 → 仍显示「已加入」（幂等）
```

**localStorage 变更：**
```
读取: nutrapaw_pets_${username}（去重检查）
写入: nutrapaw_pets_${username}（追加新 Pet）
```

---

## 八、场景 F-06：记录健康日志

**前提：** 用户已登录，在 `/profile/pets/[petId]` 页面

```
[宠物档案页挂载]
  读取 localStorage['user'] → username
  读取 nutrapaw_pets_${username} → 找到 petId 对应宠物
  读取 nutrapaw_logs_${petId} → 历史日志列表（倒序展示）
  读取 nutrapaw_assessment_${petId} → AI 评估缓存（判断是否过期）

[用户点击「+ 记录今日状况」]
  打开 LogEntryModal
  日期：自动填充今天 YYYY-MM-DD
  字段：体重(可选) / 食欲 / 精神 / 饮水 / 大便 / 呕吐 / 备注

[用户填写并点击「保存记录」]
  saveLog(log: PetHealthLog) 执行：
    读取 nutrapaw_logs_${petId}
    按 date 去重（同日期覆盖旧记录）
    追加/替换，按日期 DESC 排序
    写回 localStorage['nutrapaw_logs_${petId}']

  ↓ 弹窗关闭
  ↓ 日志列表实时刷新（重新读取 localStorage）
```

**localStorage 变更：**
```
读取: nutrapaw_logs_${petId}
写入: nutrapaw_logs_${petId}（新日志追加/当日覆盖）
```

---

## 九、场景 F-07：生成 AI 健康评估

**前提：** 用户已登录，宠物有至少 1 条日志

```
[宠物档案页 — 评估卡片区域]
  读取 nutrapaw_assessment_${petId} → assessment
  if assessment && new Date(assessment.expiresAt) > now：
    直接展示缓存评估（含「基于 N 次记录 · 约 Xh 后过期」提示）
  else：
    显示「生成健康评估」按钮（若无日志，按钮置灰 + 提示）

[用户点击「生成健康评估」]
  读取 nutrapaw_pets_${username} → pet
  读取 nutrapaw_logs_${petId} → logs（最近 10 条）
  若 logs.length === 0 → 提示「请先记录至少一次状态」→ return

  POST /api/pets/${petId}/assessment {
    Headers: Authorization: Bearer ${sessionToken}
    Body: { pet, logs }
  }
  UI：评估卡显示「AI 正在分析健康数据...」loading 状态

[服务端处理]
  verifyToken(token) → 验证 JWT（无需查询 Map）
  接收 body.pet + body.logs（无服务端存储依赖）
  构建 DeepSeek Prompt（猫咪信息 + 日志摘要）
  调用 DeepSeek API → 解析 JSON 返回
  生成 HealthAssessment：{ id, petId, generatedAt, expiresAt(+48h), ... }
  返回 { assessment }

[客户端处理成功响应]
  saveAssessment(petId, data.assessment)
  写入 localStorage['nutrapaw_assessment_${petId}'] = assessment
  ↓ 评估卡片实时更新（展示状态 + 关键发现 + 建议）
```

**localStorage 变更：**
```
读取: nutrapaw_assessment_${petId}（判断缓存有效性）
读取: nutrapaw_pets_${username}（获取宠物信息）
读取: nutrapaw_logs_${petId}（获取日志）
写入: nutrapaw_assessment_${petId}（存储新评估，48h 有效）
```

---

## 十、场景 F-08：分享推荐结果

```
[结果页 /result/[id]]
  右上角「分享结果」按钮（任何用户可见）
  ↓ 点击 → navigator.clipboard.writeText(window.location.href)
  ↓ 按钮变为「✓ 已复制链接」（2s 后恢复）

[他人点击分享链接 /result/[id]]
  结果页挂载 useEffect：
    1. 优先读取 localStorage['result_${id}']
    2. 若无 localStorage（新设备）→ 请求 GET /api/result/${id}（若有后端存储）
       当前 MVP：无后端持久化 → 显示「链接内容已过期，请重新生成推荐」
    3. 若有 localStorage → 正常展示结果

注：当前 MVP 阶段，分享链接仅在同浏览器（同 localStorage）内永久有效；
    跨设备分享链接在 v2 接入数据库后完全支持。
```

---

## 十一、场景 F-09：Vercel Redeploy 后登录

**背景：** Vercel Redeploy 清空服务端内存 Map，传统登录路径失效。

```
[用户在 Redeploy 后尝试登录]
  打开 LoginModal，输入用户名 + 密码

[LoginModal 执行]
  读取 localStorage['nutrapaw_user_auth']
  → 找到 auth.username === 输入用户名
  → authExtra = {
      clientHash: auth.passwordHash,
      clientId: auth.id,
      clientNickname: auth.nickname,
      clientEmail: auth.email,
      clientCreatedAt: auth.createdAt,
    }
  POST /api/auth/login { username, password, ...authExtra }

[服务端 clientHash 路径]
  if (clientHash) {
    bcrypt.compare(password, clientHash) → true（密码正确）
    生成新 sessionToken（JWT，无状态）
    返回 { success: true, user: { 从 client 参数重建 }, sessionToken }
    // 服务端 Map 为空，但完全不需要查询 Map
  }

[登录成功]
  写入 localStorage['sessionToken'] = new sessionToken
  写入 localStorage['user'] = user
  页面更新为已登录状态
  所有宠物档案/日志/评估均从 localStorage 读取（完整保留）
```

**结论：** Redeploy 对用户完全透明，所有本地数据保留，账号不丢失。

---

## 十二、认证状态机

```
状态：未登录（unauthenticated）
  ↓ 用户注册（SignupModal）
  写入 sessionToken + user + nutrapaw_user_auth
  → 状态：已登录（authenticated）

状态：已登录（authenticated）
  ↓ 用户点击「退出」
  清除 localStorage['sessionToken'] + localStorage['user']
  保留：nutrapaw_user_auth（下次登录使用 clientHash）
  保留：nutrapaw_pets_* / nutrapaw_logs_* / nutrapaw_assessment_*（宠物数据保留）
  → 状态：未登录

状态：已登录（authenticated）
  ↓ sessionToken 过期（7 天后）
  API 调用返回 401
  → 前端清除 token → 状态：未登录（需重新登录）

状态：未登录
  ↓ 用户登录（LoginModal，clientHash 路径）
  写入 sessionToken + user（nutrapaw_user_auth 已存在，不覆盖）
  → 状态：已登录
```

---

## 十三、数据流向总图

```
用户操作
  │
  ├─ 推荐流程 ──────────────────────────────────────────────────────┐
  │   Step 1→2: localStorage['lastCatSession']                      │
  │   Step 3: POST /api/recommend → localStorage['result_${id}']   │
  │                                                                  │
  ├─ 认证 ──────────────────────────────────────────────────────────┤
  │   注册: POST /api/auth/signup → localStorage['sessionToken']    │
  │                              → localStorage['user']             │
  │                              → localStorage['nutrapaw_user_auth']│
  │   登录: POST /api/auth/login → localStorage['sessionToken']     │
  │                              → localStorage['user']             │
  │                                                                  │
  ├─ 宠物档案 ──────────────────────────────────────────────────────┤
  │   加入档案: 客户端直接写 localStorage['nutrapaw_pets_${user}']   │
  │   读取档案: 客户端直接读 localStorage['nutrapaw_pets_${user}']   │
  │                                                                  │
  ├─ 健康日志 ──────────────────────────────────────────────────────┤
  │   记录日志: 客户端直接写 localStorage['nutrapaw_logs_${petId}']  │
  │   读取日志: 客户端直接读 localStorage['nutrapaw_logs_${petId}']  │
  │                                                                  │
  └─ AI 健康评估 ────────────────────────────────────────────────────┘
      请求: POST /api/pets/${petId}/assessment { pet, logs }
      （仅 JWT 验证，服务端无状态）
      响应: HealthAssessment 对象
      缓存: localStorage['nutrapaw_assessment_${petId}']（48h）
```

---

## 十四、完整 localStorage 键速查表

| 键名 | 类型 | 生命周期 | 说明 |
|------|------|---------|------|
| `result_${id}` | `RecommendResult` | 永久（手动清除前） | 推荐结果，支持分享链接 |
| `lastCatSession` | `CatSession` | 永久（被覆盖/清除前） | 最后一次推荐的猫咪信息 |
| `sessionToken` | `string`（JWT） | 7 天（JWT exp） | 用户会话 token |
| `user` | `{ id, username, email, nickname }` | 与 sessionToken 同步 | 用户基本信息缓存 |
| `nutrapaw_user_auth` | `AuthCredential` | 永久 | 认证凭证（含 bcrypt hash） |
| `nutrapaw_pets_${username}` | `Pet[]` | 永久 | 用户宠物档案列表 |
| `nutrapaw_logs_${petId}` | `PetHealthLog[]` | 永久 | 宠物健康日志 |
| `nutrapaw_assessment_${petId}` | `HealthAssessment \| null` | 48h（由 expiresAt 字段控制） | AI 评估缓存 |

---

## 十五、页面跳转关系图

```
[/] 首页
  ↓ 点击 CTA
[/recommend] 推荐流程
  Step 0（有历史）→ Step 2（选猫）
  Step 1（填写）  → Step 2（健康需求）
  Step 2          → Step 3（Loading）
  Step 3          → redirect [/result/${id}]

[/result/[id]] 结果页
  → 点击「去档案页」→ [/profile]
  → 点击「加入档案」（已登录）→ 留当前页（状态更新）
  → 点击「保存推荐」（未登录）→ 弹出 SignupModal（留当前页）
  → SignupModal 注册成功 → 留当前页（状态更新为已登录）

[/profile] 个人档案页
  → 点击宠物卡片 → [/profile/pets/[petId]]
  → 点击历史推荐 → [/result/[id]]
  → 点击「+ 添加猫咪」→ AddPetModal（留当前页）

[/profile/pets/[petId]] 宠物健康档案页
  → 点击「+ 记录今日」→ LogEntryModal（留当前页）
  → 点击「生成评估」→ API 调用（留当前页）
  → 点击推荐来源卡片 → [/result/[petResultId]]
  → 点击「← 返回」→ [/profile]

Modal（全局弹窗，不改变路由）：
  SignupModal → 注册成功 → 触发父组件 onSuccess 回调
  LoginModal  → 登录成功 → 触发父组件 onSuccess 回调
  LogEntryModal → 保存成功 → 触发父组件 onSave 回调
  AddPetModal   → 保存成功 → 触发父组件 onSuccess 回调
```

---

## 十六、错误处理规范

| 错误类型 | 发生场景 | 前端处理方式 |
|---------|---------|------------|
| 网络错误 | fetch 失败 | 显示「网络错误，请检查连接后重试」 |
| 401 未授权 | sessionToken 过期 | 清除 token，刷新认证状态，提示重新登录 |
| 409 冲突 | 注册时用户名/邮箱重复 | SignupModal 显示「用户名或邮箱已被注册」 |
| 400 参数错误 | 表单格式不合规 | 输入框旁显示具体错误说明 |
| 500 服务端错误 | DeepSeek API 超时等 | 提示「AI 服务繁忙，请稍后重试」 |
| localStorage 不可用 | 无痕模式/隐私浏览 | try-catch 兜底，降级为无持久化模式 |

---

*v1.0 — 2026-03-01 初始版本，覆盖 v1.1 里程碑所有交互流程*
*本文档是 NutraPaw 前端交互与数据流的权威参考，代码变更后须同步更新。*
