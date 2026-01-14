# Web3 Auditor Simulator — 项目结构与修改指南

> 目标：这份文档不是“玩法介绍”，而是**方便你阅读与未来持续改代码**的“地图”。

## 目录结构（v0.2+ 拆分版）

当前入口已从单文件 `app.js` 迁移到模块化目录 `src/`（纯 HTML/CSS/JS，无依赖）。

- `index.html`
  - UI 骨架：左侧指标/行动点、右侧 tab 面板
  - 入口脚本：`<script type="module" src="./src/main.js"></script>`
- `styles.css`
  - 样式（MVP）
- `src/`
  - `main.js`
    - **游戏启动与主循环编排**：加载存档、结束本周、事件串行展示、推进周、结局判定
    - 把 UI 绑定到“业务 handler”（action/accept/endWeek 等）
  - `ui.js`
    - **渲染 & 交互绑定（不直接写业务规则）**
    - `render(state)`：把 `state` 渲染到页面
    - `bind(state, handlers)`：只负责把 DOM 事件转成 `handlers.*` 调用
  - `modal.js`
    - `openModal/closeModal/toast`：统一弹窗与提示
  - `events.js`
    - `rollEvents(state)`：随机事件池与抽取策略（事件频率在这里调）
  - `logic.js`
    - **所有“游戏规则/数值逻辑/项目生成”**（尽量不碰 DOM）
    - 订单/竞赛生成、行动消耗与推进、直客交付、平台结算等
  - `state.js`
    - **状态结构 + 通用状态操作**
    - `defaultState/normalizeState`
    - 行动点上限 `computeWeeklyAPMax` 与 `refreshAP`
    - `log/adjustAfterAction`
  - `storage.js`
    - `load/save/resetStorage`（localStorage）
  - `content.js`
    - 常量与静态内容：`PROTOCOLS / DIRECT_CLIENTS / PLATFORM_NAMES`
  - `utils.js`
    - `clamp/rnd/ri/pick/money/escapeHtml`
  - `dom.js`
    - `$ / $$`

## 核心数据结构（你改规则时最常看的）

### `state`（全局存档）

主要字段（简化）：
- `state.now`: `{ year, week }`
- `state.stats`: `skill/comms/writing/tooling/stamina/mood/cash/reputation/compliance/network/platformRating`
- `state.schedule`: `{ hoursPerDay }`（本周工时，影响行动点上限）
- `state.ap`: `{ now, max }`
- `state.market`: `{ direct: Order[], platform: Contest[] }`（订单池/竞赛池）
- `state.active`: `{ direct: Project[], platform: ContestProject[] }`（进行中）
- `state.selectedTarget`: `{ kind:'direct'|'platform', id } | null`
- `state.log`: 时间线
- `state.flags.gameOver`: 结局状态

### 直客项目（active.direct 的元素）

关键字段：
- `scope / deadlineWeeks / cooperation / adversary / fee`
- `coverage`：覆盖率
- `report.draft`：报告进度（强制交付门槛在 `logic.js` 的 `settleProjects`）
- `fixRate / shipUrgency / retestScore`：更贴近真实交付的“客户修复/上线冲动/复测跟进”
- `found[]`：发现的漏洞

### 平台竞赛（active.platform 的元素）

关键字段：
- `scope / deadlineWeeks / popularity / prizePool`
- `coverage`
- `evidence`：补材料/复现质量
- `submissions[]`：finding 列表（含 `status: draft/submitted/accepted/duplicated/rejected`）

## “我要改 X” → 改哪里？

### 调整“工时 → 行动点上限”（6~24h/天）
- **入口**：`src/state.js` → `computeWeeklyAPMax(state)`
- 你想让 22/24 给更多/更少 AP：改 `base` 的映射或上限 clamp

### 调整“22/24 的身体损害递增”
- **入口**：`src/main.js` → `advanceWeek(state)` 里 `if (h > 8)` 的非线性损耗曲线
- 想让 24h “不一定一周必死但极危险”：把 `sta/md` 的二次项或 22/24 额外加成调小

### 调整“项目简单/复杂 → 审计/建模/写报告快慢与消耗”
- **入口**：`src/logic.js`
  - `complexityTier(project)`：复杂度分层
  - `actionCost(state, actionKey, target)`：行动点消耗规则
  - `coverageGain(...)` / `writeProgressInc(...)`：推进速度规则

### 调整“事件频率/事件池”
- **入口**：`src/events.js` → `rollEvents(state)`
  - `baseCount/extra`：控制每周 0~2 个事件的概率
  - `POOL`：事件库本体（新增/删除/调整事件）

### 调整“平台结算：没提交就没奖金/没声望”
- **入口**：`src/logic.js` → `finishContest(state, contest)`

### 调整“直客交付门槛：报告进度不足就延期”
- **入口**：`src/logic.js` → `settleProjects(state)`

## 常见扩展点（建议按这个方式加功能）

### 新增一个动作按钮
- **UI**：`src/ui.js` → `renderActions(state)` 增加按钮定义（key/label/hint）
- **规则**：`src/logic.js` → `doAction(state, actionKey, toast)` 增加分支

### 新增一个事件
- **事件库**：`src/events.js` 的 `POOL` push 一个对象：
  - `when(state)`：触发条件
  - `desc(state)`：描述文案
  - `choices(state)`：选项数组，里面 `apply(stt)` 做状态变更

### 新增一种协议类型
- **入口**：`src/content.js` → `PROTOCOLS` 增加 `{key,name,diff}`
- 复杂度与订单价格会自动受到 `diff` 影响

## 运行方式（开发/调试）

推荐用本地静态服务器（因为使用 ES Modules）：

- `python3 -m http.server 5173`
- 浏览器打开：`http://localhost:5173/index.html`

## 迁移说明（历史）

旧版单文件逻辑仍保留在根目录 `app.js`（便于对照/回滚），但入口已切到 `src/main.js`。

