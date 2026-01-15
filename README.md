# Web3 Auditor 模拟器（网页版小游戏）

这是一个**纯前端（无依赖）**的数值+文案驱动小游戏：你扮演 Web3 审计师，按周推进，接直客项目或参加审计平台竞赛（Sherlock/Code4rena/Cantina 的玩法抽象），分配行动点、处理事件、攒声望与现金流，避免爆雷与合规翻车。

## 运行方式
### 方式 A：直接打开
- 双击打开 `index.html`

> 注：当前入口使用 ES Modules，`file://` 下一般会被浏览器拦截模块加载；请优先用方式 B。

### 方式 B：起一个本地静态服务器（推荐）
在项目根目录执行：

```bash
python3 -m http.server 5173
```

然后在浏览器打开：`http://localhost:5173`

## 关于 `?v=xx`（浏览器缓存）与一键同步
因为使用 ES Modules + `python3 -m http.server` 时，浏览器可能会**缓存模块文件**，改了代码但页面还在跑旧逻辑。

本仓库用 `?v=xx` 做 cache bust。为了避免每次手动改一堆文件，你只需要改一个地方：

- **方案 A（推荐）**：运行脚本自动批量更新

```bash
python3 tools/bump_version.py --inc
```

它会把 `tools/version.txt` 里的版本号自增 1，并把全仓库所有 `?v=` 同步成同一个值。

- **方案 B**：手动指定版本号

```bash
python3 tools/bump_version.py 38
```

## 文件说明
- `index.html`: 页面结构
- `styles.css`: UI 样式（偏“模拟器”卡片风）
- `src/`: **拆分后的模块化实现（当前入口）**
  - `src/main.js`: 启动与主循环编排
  - `src/ui.js`: 渲染与交互绑定
  - `src/logic.js`: 规则与数值逻辑
  - `src/events.js`: 事件系统
  - `src/state.js`: 状态结构与通用操作（AP、log、adjust）
  - `src/storage.js`: localStorage 存取
  - `src/content.js`: 常量（协议/平台名等）
  - `src/utils.js`: 工具函数
  - `src/dom.js`: DOM 小工具
- `app.js`: 旧版单文件实现（保留作对照/回滚）
- `WEB3_AUDITOR_SIMULATOR_GDD.md`: 游戏设计文档
- `PROJECT_ARCHITECTURE.md`: **项目结构与修改指南（给后续持续改规则用的“地图”）**

