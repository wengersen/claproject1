# CodeMaker SOLO x 多智能体协作流水线 (Multi-Agent Pipeline)

## 1. 核心智能体矩阵 (The A-Team)

我们构建了一支由 **IDE 内置智能体 (Agents)** 组成的虚拟团队，通过 SOLO 模式进行调度。

| 角色 (Agent) | 对应工具 (Tool) | 模型配置 (Model Strategy) | 职责 | 核心交付物 | 人设特征 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **产品视界 (Product Visionary)** | `product-philosopher` | **Claude 4.6 Opus** | 拷问价值、第一性原理、PRD 撰写 | `docs/PRD_v1.md` | **"Stay Hungry, Stay Foolish"**<br>极致主义，关注 Why，敢于砍需求 |
| **设计总监 (Design Director)** | `ui-designer` | **Claude 4.6 Sonnet** | 视觉规范、组件设计、交互细节 | `docs/DESIGN_v1.md` | **"Simplicity is the ultimate sophistication"**<br>极简主义，像素级完美，关注 How it feels |
| **前端架构师 (Frontend Arch)** | `frontend-architect` | **Claude 4.6 Opus** | 组件划分、状态管理、路由规划 | 前端 CodeMaker 指令包 | **"Composition over Inheritance"**<br>关注性能、复用性、组件解耦 |
| **后端架构师 (Backend Arch)** | `backend-architect` | **Claude 4.6 Opus** | 数据模型、API 契约、鉴权逻辑 | 后端 CodeMaker 指令包 | **"Stateless & Scalable"**<br>关注安全、RESTful 规范、数据一致性 |
| **全栈交付 (Implementation)** | **CodeMaker 插件** | **DeepSeek V3/R1** | 代码编写、单元测试 | 源代码文件 | **"Talk is cheap, show me the code"**<br>高效执行者，利用长上下文一次性生成完整模块 |

---

## 2. 详细工作流规范 (Standard Operating Procedure)

### Phase 1: 愿景与定义 (Product Definition)
**Trigger**: 用户输入模糊需求（e.g. "做一个宠物健康大盘"）。

1. **SOLO 调度**：调用 `product-philosopher` 工具。
   - 审视需求价值，通过 3-5 轮追问挖掘核心痛点。
   - 撰写/更新 `docs/PRD_v1.md`。
   - **Check**: 确认需求逻辑闭环，是否有过度设计？
   - **Output**: 清晰的功能列表 (Feature List) 和用户故事 (User Stories)。

### Phase 2: 视觉与交互 (Visual & Interaction)
**Trigger**: PRD 更新完成。

1. **SOLO 调度**：调用 `ui-designer` 工具。
   - 解析 PRD 中的功能点。
   - 定义布局结构（Layout）、色彩系统（Color Palette）、交互状态（Hover/Active）。
   - 更新 `docs/DESIGN_v1.md`。
   - **Check**: 视觉是否符合 Design Token？是否优雅？
   - **Output**: 详细的 UI 描述，包括组件层级与间距规范。

### Phase 3: 技术架构 (Technical Architecture)
**Trigger**: Design 文档冻结。

1. **SOLO 调度**：根据需求类型调用 `frontend-architect` 或 `backend-architect`。
   - **拆解**：将页面拆解为原子组件树 (Component Tree)。
   - **契约**：定义 API 接口 (Request/Response) 和数据模型 (Schema)。
   - **指令**：输出 **CodeMaker 指令包 (Prompt)**。
   - **Output**: 结构化的 Prompt，包含文件路径、代码结构、依赖关系。

### Phase 4: 实施与交付 (Implementation)
**Trigger**: 获得架构指令包。

1. **User** 操作：
   - 将指令包复制给 CodeMaker 插件。
2. **CodeMaker** 执行：
   - 接收 Prompt，利用长上下文理解项目全貌。
   - 生成高质量、无错误的代码。
   - 用户 Review 并 Apply 代码。

### Phase 5: 闭环与同步 (Synchronization Loop)
**Trigger**: 代码开发完成并测试通过。
*这是关键的一步，确保文档永远反映代码现状（Code is Truth，Docs reflect Truth）。*

1. **触发指令 (Commands)**：
   - 用户发送：**"Code Done"** 或 **"Sync Docs"**。
   - 或者：**"代码已更新，请归档"**。

2. **SOLO 动作 (Actions)**：
   - **读取变更**：SOLO 扫描 CodeMaker 修改的关键文件（如 `page.tsx`, `components/`）。
   - **Diff Check (差异检查)**：
     - 如果开发过程中进行了临时修正（Ad-hoc fix）。
     - 或者架构师为了性能牺牲了部分 UI 效果。
   - **Back-Propagation (反向传播)**：
     - **Steve** 更新 `docs/PRD_v1.md`（标记为 "Implemented" 或修正逻辑）。
     - **Jony** 更新 `docs/DESIGN_v1.md`（修正视觉差异）。
     - **Doc Update**: 确保下一次迭代基于最新的真实状态。

---

## 3. CodeMaker 指令包模板 (Artifact Template)

架构师输出给 CodeMaker 的指令包必须遵循以下格式：

```markdown
# CodeMaker 开发任务：[功能名称]

## 1. 任务背景 (Context)
> [简述功能目标，引用 PRD 章节]

## 2. 涉及文件 (Scope)
- 新增：`app/dashboard/feature/page.tsx`
- 修改：`lib/types.ts`

## 3. 详细要求 (Specs)
### 前端 (Frontend)
- 组件结构：参考 `docs/DESIGN_v1.md` 第 X 节。
- 状态管理：使用 React Context 或 Zustand。
- 样式：Tailwind CSS，遵循 `primary-color` 变量。

### 后端 (Backend)
- API 路径：`/api/feature`
- 数据存储：localStorage Key `feature_data_${id}`
- 错误处理：统一使用 `NextResponse.json({ error }, { status: 400 })`

## 4. 接口定义 (Contract)
```typescript
interface FeatureData {
  id: string;
  // ...
}
```

## 5. 执行步骤 (Steps)
1. 定义类型。
2. 实现数据存取逻辑。
3. 编写 UI 组件。
4. 集成与调试。
```
