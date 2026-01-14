# Web3 Security Practitioner Simulator — 系统规格草案（可落地版 vNext）

> 这份文档是给“后续持续修改/实现”用的：尽量用**字段、结算顺序、触发条件、后果**来写，而不是纯叙述。

---

## 0. 核心决策（已确认）

- **允许在职做外部单/平台**：但会引入 `conflict`（利益冲突）与合规/公司信任事件链。
- **公司路线爽点双轨**：
  - **RPG 轨**：工资稳定、晋升与 title 提升
  - **模拟经营轨**：防守体系/事故响应带来即时成就与奖励

> 额外设计原则（新增）：**公司内评价**与**公司外名声**可以分叉。你能在行业内爆火，但在公司里“没加分甚至扣分”；反之亦然。

---

## 1. 统一概念：Work Item（工作项）

把“直客项目/平台竞赛/公司任务/bounty”统一成 `workItems`（不同类型有不同字段与结算）。

### 1.1 WorkItem 基础字段（所有类型通用）

- `id`: string
- `kind`: `"direct" | "platform" | "company" | "bounty"`
- `title`: string
- `protocol`: string（可为空，比如公司流程类任务）
- `scope`: number（复杂度/范围）
- `deadlineWeeks`: number
- `coverage`: number (0-100)（不适用可固定 0）
- `risk`: number (0-100)（上线压力/攻击面/事故敏感度的综合，可由各类型映射）

### 1.2 各类型扩展字段（建议）

#### Direct（直客）
- `fee`, `cooperation`, `adversary`
- `fixRate`, `shipUrgency`, `retestScore`
- `report.draft`
- `found[]`

#### Platform（平台）
- `platform`, `popularity`, `prizePool`
- `evidence`
- `submissions[]`：`draft/submitted/accepted/duplicated/rejected`

#### Company（公司任务 / OKR ticket）
- `companyId`
- `ticketType`: `"design_review"|"pr_review"|"security_tooling"|"monitoring"|"incident"|"training"|"compliance"`
- `okrTag`: string（可空）
- `impact`: number (0-100)（业务影响/晋升权重）
- `quality`: number (0-100)（写作/工程/沟通的综合结果）

#### Bounty（持续目标）
- `program`: string（平台/项目名）
- `rulesStrictness`: number (0-100)（越高越容易触发合规风险）
- `dupRate`: number (0-100)
- `rewardPool`: number（可变，非固定）
- `reports[]`：提交记录（类似平台但更强调“合规边界”）

---

## 2. Player State（新增字段建议）

沿用现有 stats，并新增三块：职业、利益冲突、防守体系。

### 2.1 Skills（建议逐步显性化）

- `skill`（协议/审计）
- `engineering`（工程）
- `research`（研究）
- `defense`（IR/防守）
- `formal`（形式化）
- `writing/comms/tooling`（现有）

### 2.2 Employment（在职状态）

`employment`：
- `employed: boolean`
- `companyId: string | null`
- `level: number`（1-5）
- `salaryWeekly: number`
- `equity: { total:number, vested:number, cliffWeeks:number }`（可选后续）
- `oncall: { active:boolean, intensity:number(0-100) }`
- `performance`: number (0-100)（绩效/内部评价）
- `trust`: number (0-100)（公司信任度：被抓到外包/泄露会掉）

补充建议字段（用于“公司政治/恶心 KPI”玩法）：
- `manager`: `{ archetype:string, toxicity:number(0-100) }`（上级画像与毒性）
- `vanityKpi`: `{ mode:"none"|"loc"|"refactor", intensity:number(0-100) }`（绩效邪教：代码行数/无用重构等）
- `politics`: number (0-100)（组织政治压力/扯皮程度）

### 2.3 Conflict of Interest（利益冲突风险）

`conflict`：
- `risk: number (0-100)`：风险值（越高越容易触发事件链）
- `flags`: `{ disclosed:boolean, approved:boolean }`

**增长来源（例）**
- 在职接外部直客：`+10~25`（视公司合规环境/项目敏感度）
- 在职参加平台：`+4~12`
- 在职写公开 PoC/研究：`+6~18`（取决于是否涉及公司业务）

**降低方式（例）**
- 做合规/法务：`-6~-14`
- 主动披露/申请批准：`-10` 但会降低自由度/带来绩效影响
- 选择“不接单/不公开”：自然每周 `-2~-4`

### 2.4 Defense Posture（防守体系成就）

`posture`：
- `monitoring: number (0-100)`（监控/告警成熟度）
- `tests: number (0-100)`（测试/CI 安全门槛）
- `runbooks: number (0-100)`（预案/流程）
- `meanTimeToDetect: number`（抽象指标，可用 posture 反推）

这块是“公司路线爽点（模拟经营轨）”的主要正反馈来源：
- posture ↑ → 事故概率 ↓ / 事故损失 ↓ / 内部评价 ↑ / 晋升更稳

### 2.5 Major Incident（全行业重大事件，给“抢时效输出”用）

> 这是“偶发但高影响”的全局事件，不等同于你自己项目爆雷。它提供一个抢时效窗口：越快产出高质量分析并公开，收益越大。

`majorIncident`（可空）：
- `active: boolean`
- `kind: "bridge_hack"|"oracle_fail"|"governance_attack"|"key_leak"|"exploit_rumor"`
- `title: string`
- `weekSpawned: { year:number, week:number }`
- `windowWeeks: number`（建议 1–2）
- `progress`: `{ analysis:number, tracing:number, writeup:number, xThread:number }`（0-100）
- `flags`: `{ published:boolean, publishedWeekOffset:number|null }`
- `qualityHint`: number（可选：用于判断“胡说/误导”的风险）

### 2.6 Personal Research（个人研究赛道：外部热 vs 内部冷）

> 例子：研究 AI 审计/LLM 安全工具。行业外部很火（brand/reputation 上升），但某些交易所内部 KPI 体系可能“没用”。

`research`：
- `topics`: string[]（例如 `["ai_audit"]`）
- `heat`: `{ aiAudit:number(0-100) }`（行业热度，可随事件变化）
- `progress`: `{ aiAudit:number(0-100) }`（你的研究进度）
- `published`: `{ aiAudit:number }`（累计发布次数/成果数）
- `internalAdoption`: `{ aiAudit:number(0-100) }`（公司内部采用度：把研究“产品化/流程化”才会上升）

---

## 2.7 公司内评价 vs 公司外名声（简化口径）

- **公司外名声**：主要看 `reputation/brand`（X 输出、研究输出、重大事件抢时效等）
- **公司内评价**：主要看 `employment.performance/trust`，并受 `manager/toxicity/vanityKpi/politics` 修正

> 这能自然表达你说的矛盾：外面很火，公司里可能“屁用没有”。

---

## 3. 每周结算顺序（关键：避免规则互相打架）

建议固定为四段：

1) **Work settlement**：结算所有 work item（deadline、交付、奖金、事故挂起）
2) **Event settlement**：抽取并处理事件（含利益冲突事件链、事故事件链）
3) **Career settlement**：工资、绩效、on-call 轮值、裁员风险、晋升检查
4) **Recovery & AP**：自然恢复 + 工时惩罚/恢复 → 刷新 AP → 新周开局满 AP

> 插入点（建议）：Major Incident 作为 Event settlement 的一种来源，但它的“窗口期”跨周存在，需要在每周结算时递减窗口并判断是否过期。

---

## 4. “公司路线爽点双轨”怎么同时成立（数值设计要点）

### 4.1 稳定现金流 + 晋升（RPG 轨）

- 每周固定入账：`cash += salaryWeekly`
- `performance` 由本周完成的 company work items 贡献
- 晋升检查（例）：每 12 周一次，满足：
  - `performance > 70`
  - `重大事故次数`低
  - `comms/writing`达到门槛
  - posture 达到门槛（给模拟经营轨也正反馈）

### 4.2 防守体系成就（模拟经营轨）

引入“事故强相关”回路：

- posture 越高：
  - 事故触发概率更低（尤其 on-call 周）
  - 事故发生时损失更低（现金/声誉/合规/心态）
  - 事故处置行动更高效（更少 AP 获得更好 outcome）

---

## 5. 利益冲突风险事件链（示例：3 段连续剧）

> 目标：让“允许外部接单”成为真实抉择，而不是白嫖。

### 链 1：外部直客被同事发现

- **触发**：`employment.employed=true` 且 `conflict.risk > 35`，随机
- **第 1 段（风声）**：有人在内部群提到你名字（“你是不是在外面接单？”）
  - A 披露：`conflict.risk -12`，`trust +2`，`performance -2`（被分走时间）
  - B 装死：`conflict.risk +8`，`trust -2`

- **第 2 段（约谈）**：合规/法务约谈（若第 1 段选 B 概率更高）
  - A 主动停止外部：`conflict.risk -15`，`cash -机会成本`，`trust +3`
  - B 申请批准：`conflict.risk -8`，`approved=true`，但外部收益打折（比如平台奖金/直客 fee *0.8）
  - C 继续偷偷做：`conflict.risk +12`，触发第 3 段概率上升

- **第 3 段（后果）**：被抓实/被举报
  - 轻：`trust -10`，`performance -8`，强制 4 周不能参加外部
  - 重：`trust -25`，`performance -20`，触发“被裁/劝退”结局分支

### 链 2：公开 PoC 触发“信息泄露”怀疑

- **触发**：在职 + blog/研究公开 + 某公司相关协议（或公司业务相近）
- 选项围绕“公开时机/措辞/协调披露/匿名”展开

---

## 6. 新增渠道：Job Offers（入职/跳槽）

新增一个市场池：`jobOffers[]`

Offer 字段建议：
- `company`: 名称/赛道
- `levelOffer`: 1-4
- `salaryWeekly`
- `culture`: 0-100（越低越容易 burnout）
- `processMaturity`: 0-100（越低事故越多）
- `complianceStrict`: 0-100（越高 conflict 更危险）
- `shipUrgency`: 0-100（越高上压力越大）

Offer 解锁条件建议：
- `platformRating` 与 `reputation`、`research`、`network` 的组合

### 6.1 Offer 生成（简化版，先好玩再精确）

> 目标：先做到“看起来像真实世界、选择有味道”，不引入复杂公式；后续再加细分。

#### 6.1.1 每周 offer 刷新（少量参数）

- 每周刷新 `1~3` 个 offer（默认 2）
- `network` 高：更容易刷到（+1 个 offer 的概率更高）
- `reputation/platformRating` 高：更容易刷到更好的公司/更高职级

#### 6.1.2 公司类型倾向（直觉规则）

- **安全公司**：更容易给面试/offer（入场门槛低一些）
  - 你平台表现好（`platformRating` 高）/写作好（`writing` 高）→ 更容易刷到
- **交易所**：更挑人（更看 `reputation`、`合规风险`）
  - 你合规风险低、声望高 → 更容易刷到
  - 你 `conflict.risk` 很高 → 交易所 offer 更少/条款更严

#### 6.1.3 职级与薪资（分段规则）

- `levelOffer` 用三档即可：L1/L2/L3+（先不细到 L4）
  - 新手：默认 L1；中期（声望或平台评级到一定阈值）→ L2；顶尖（声望+平台双高）→ L3+
- `salaryWeekly` 直接从公司画像 `payBandWeekly` 抽取：
  - L1 取下半段，L2 取中段，L3+ 取上半段

#### 6.1.4 Offer 条款（把“交易所更严格”写进玩法）

- **交易所**：更常出现“外部接单限制/披露要求/高强度 on-call”
- **安全公司**：更常出现“交付 KPI/客户满意度/公开研究需 PR”

---

## 7. UI（最小改动落地）

沿用现有 tabs，再加：

- **职业/公司**：offer、在职状态、OKR、on-call、信任/绩效
- **Bounty**：目标列表、提交记录、合规边界提示
- 现有：直客/平台/社区/X 时间线（保持）

---

## 8. 落地拆分建议（对应当前代码结构）

- `src/state.js`：补充 `employment/conflict/posture/jobOffers` 结构与兼容逻辑
- `src/logic.js`：新增 `makeJobOffer/makeBountyTarget/settleCompanyWork`
- `src/events.js`：新增“利益冲突事件链”与“事故事件链”
- `src/ui.js` + `index.html`：新增 tab 面板（职业/公司、bounty）

---

## 9. 下一步我建议你再选的 2 个参数（用来定调难度）

> ✅ 已由你拍板，写成默认设定（后续可做成“难度/世界参数”开局选项）。

1) **公司合规严格度默认水平**  
- **交易所/大型平台**：更严格（冲突风险高、处罚重）  
- **安全公司/研究团队**：相对更低（更自由，但也更看重声誉/交付）

2) **外部收入强度**  
- **工资 vs 外部收入 ≈ 50% / 50%**（默认期望值）
- 实现方式：公司工资稳定覆盖“底盘”，直客/平台/bounty 提供同等量级但更波动的收入

---

## 10. 公司池（Company Roster）与默认画像（中英混合）

> 说明：这里的公司名用于玩法抽象与氛围，非事实陈述；数值是“游戏画像”。

字段含义（0-100）：
- `complianceStrict`：合规严格度（越高越容易触发/放大利益冲突事件链）
- `processMaturity`：流程成熟度（越高越少事故、协作更顺）
- `culture`：文化/人性化（越高越不容易 burnout）
- `shipUrgency`：上线压力（越高越卷、事故概率上升）
- `payBandWeekly`：周薪区间（¥）

### 10.1 安全公司 / 审计团队（相对更自由）

| 公司 | 备注 | complianceStrict | processMaturity | culture | shipUrgency | payBandWeekly |
|---|---|---:|---:|---:|---:|---|
| Cantina | 英文品牌/审计平台生态（抽象为安全公司氛围） | 35 | 70 | 68 | 55 | 12k–28k |
| Spearbit | 英文品牌/高端审计团队氛围 | 40 | 78 | 62 | 58 | 15k–35k |
| Hashlock | 英文品牌/审计公司氛围 | 45 | 66 | 60 | 60 | 10k–26k |
| CertiK / 慢雾式大厂氛围（抽象） | 体量更大、流程更“企业化” | 55 | 75 | 55 | 62 | 12k–30k |
| Yubit | 中文/国际混合安全公司氛围 | 48 | 72 | 60 | 58 | 12k–30k |

### 10.2 交易所（更严格、更像“强合规+强上线压力”）

| 公司 | 备注 | complianceStrict | processMaturity | culture | shipUrgency | payBandWeekly |
|---|---|---:|---:|---:|---:|---|
| Binance | 交易所（抽象） | 80 | 80 | 45 | 78 | 16k–40k |
| YH | 交易所（抽象） | 78 | 78 | 48 | 76 | 15k–38k |

### 10.3 公司画像对玩法的直接映射（关键）

- **合规严格度高（交易所）**：
  - 在职接外部直客/平台：`conflict.risk` 增幅更大
  - 事件链触发概率更高、后果更重（强制停外部、降 trust、绩效受损、被裁风险）
- **流程成熟度高**：
  - 公司 ticket 推进更稳定（同 AP 产出更高/事故更少）
  - posture 建设更容易转化为“事故下降”的收益
- **上线压力高**：
  - on-call 周更常见，事故事件更容易触发
  - 但处理好会带来更大的绩效/奖金/声望回报

---

## 11. “工资 vs 外部收入 50/50”默认实现（数值口径）

为了让“既可以当审计师赚钱，也可以上班拿稳定钱”两条路线都成立：

- **在职**：每周工资提供稳定底盘（例如 14k–36k/周，随公司与职级波动）
- **外部**：
  - 直客：2–5 周周期，定金 + 尾款，平均摊到每周约 10k–30k（波动更大）
  - 平台：低概率高收益，期望值接近直客的一部分
  - bounty：小额高频补贴，但合规风险与重复率高

> 落地实现时，把“外部池刷新数量/项目定价/奖金池规模”与“工资区间”一起调参，确保期望值接近 50/50。

---

## 12. 利益冲突事件链：按公司类型分两套风格（更贴近现实）

### 12.1 交易所风格（硬合规、后果更硬）

**设计原则**：流程化、留痕、处罚明确；你可以“合规化地继续做外部”，但代价是收益打折/自由度降低。

事件链模板（简化示例）：

1) **合规培训/签署条款**（入职后 1–2 周内必出）
   - A 签署并披露副业：`conflict.flags.disclosed=true`，`conflict.risk -10`，但外部收益 *0.8
   - B 不披露：`conflict.risk +8`

2) **抽查**（`conflict.risk>30` 概率触发）
   - A 配合说明并停外部：`trust +3`，`cash -机会成本`，`performance +1`
   - B 申请例外（批准）：`approved=true`，`conflict.risk -6`，外部收益 *0.85
   - C 隐瞒：`trust -8`，进入第 3 段概率上升

3) **处罚/劝退**（高风险触发，后果更硬）
   - 轻：强制 4 周禁止外部 + 绩效扣分
   - 重：触发“被裁/劝退”分支（但可用 `network` 找下家）

### 12.2 安全公司风格（偏声誉/客户关系、后果更“软但伤名声”）

**设计原则**：不一定硬禁止，但更看重“你是否抢客户/是否影响交付/是否拉低团队声誉”。

事件链模板（简化示例）：

1) **客户撞车**：你接的外部直客与公司潜在客户重叠
   - A 主动回避（拒单/转介）：`reputation +2`，`conflict.risk -8`，`cash -机会成本`
   - B 继续接：`conflict.risk +10`，埋下“团队不满”

2) **交付受影响**：你爆肝外部导致公司项目延误
   - A 兜底加班（血换产出）：`stamina -X`，`performance +2`
   - B 解释并重新排期：`comms` 检定，成功则 `trust -1`，失败则 `trust -6`

3) **声誉事件**：外部项目爆雷，社区把你与公司绑定
   - A 公开说明（写作/沟通检定）：成功则 `brand +`，失败则 `reputation -`
   - B 公司发 PR：`trust +` 但 `brand -`（你个人被“收编”）

> 结果：交易所“硬处罚”，安全公司“软惩罚但伤名声/伤客户关系”；两者都能让“允许外部接单”变成真实抉择。

---

## 13. 重大安全事件（Major Incident）— 简化落地规则

### 13.1 触发频率（不定时、低频）

- 每周有小概率触发（例如 6–10%），触发后进入冷却（例如 8–20 周内不再触发）
- 牛市/高热度期可略提高概率（可与现有 bull/bear 事件联动）

### 13.2 可用动作（复用你已规划的动作库）

在事件窗口内，以下动作会对 `majorIncident.progress` 生效：

- **事件分析**：`analysis +`（提高“写对”的基础）
- **资金追踪**：`tracing +`（提高可信度，减少被打脸风险）
- **写简报/报告**：`writeup +`（决定最终质量）
- **发 X thread**：`xThread +`（决定传播与声望收益；如果太早/质量不足会反噬）

### 13.3 结算（核心：抢时效奖励）

在 `windowWeeks` 内完成并发布（`published=true`）：

- **个人声望奖励**：随“发布周偏移”衰减  
  - 第 0 周发布：`reputation +3~6`
  - 第 1 周发布：`reputation +1~4`
  - 过期后发布：`reputation +0~2`（甚至可能负面）

- **在职加成**（如果 `employment.employed=true`）：
  - `performance +1~4`（上级观感更好）
  - `trust +0~2`（你能及时对外解释/对内同步）

质量门槛（先简单）：
- 若 `analysis+writeup` 不足（例如 < 80），但你发了 X：触发“被打脸”风险（声望 -、信任 -）

> 这套规则足够先做 MVP：有“大事件”、有抢时效、能和声望/公司观感联动；后续再把质量计算细化到更丰富的变量（证据、引用、同行校验等）。

---

## 14. 交易所（YH 抽象）“恶心系统”与事件链设计（建议做成交易所公司专属）

> 说明：这是**玩法抽象**（更像“某交易所部门”），用于模拟组织政治与错误激励；不是对任何现实个体/组织的事实陈述。

### 14.1 系统变量（最少三条就够玩）

当你入职“交易所类公司”时启用（company画像里 `complianceStrict/shipUrgency` 高）：

- `manager.toxicity`：上级毒性（PUA/甩锅/向上管理强度）
- `employment.politics`：组织政治（扯皮、周报、甩锅成本）
- `employment.vanityKpi.mode`：
  - `"loc"`：按代码行数/提交量看绩效（典型恶心 KPI）
  - `"refactor"`：强推无意义重构当产出

### 14.2 事件链 A：阿里味 PUA 上级（向上管理/甩锅/push）

触发：在职（交易所）+ `manager.toxicity>60`，随机

1) **甩锅预热**：上级暗示“这个风险你负责一下”
   - A 记录证据/同步群（合规式自保）：`trust +1`，`politics -2`，`mood -1`
   - B 忍了：`politics +6`，后续更容易被甩锅

2) **push 你加班**：要你“今晚搞完”
   - A 爆肝：`stamina -`，短期 `performance +`，但 burnout 风险上升
   - B 拒绝并给计划：`comms` 检定；成功则 `trust +`，失败则 `performance -`

3) **抢功/甩锅结算**
   - A 你学会向上管理：`politics -`，`trust +`
   - B 你被恶心到：`mood -`，触发“想离职/跳槽”分支

### 14.3 事件链 B：按代码行数看绩效（LOC KPI）

触发：交易所 + `vanityKpi.mode="loc"`

- 事件：上级要求“周提交行数达标，否则绩效谈话”
  - A 产出“真实安全价值代码”（慢但扎实）：`performance +1`，`posture/tests +`，但短期行数不够易被喷
  - B 堆行数（无意义改动/format/refactor）：短期 `performance +2`，但 `事故概率 +` / `posture` 不涨，且心态下降
  - C 把研究成果包装成内部工具：`internalAdoption +`（把外部热转内部认可），但需要时间

### 14.4 事件链 C：无用重构 + 以“年会/奖金”威胁

触发：交易所 + `vanityKpi.mode="refactor"` + `shipUrgency` 高

- 事件：大主管要求“每天必须搞重构，不然不开年会/不发奖金”
  - A 表面重构、暗中补测试/监控：`posture +`，但 `politics +`（你得会“讲 KPI 语言”）
  - B 公开反对：短期爽，但 `trust/performance -`，政治压力上升
  - C 向上管理：给出“重构=提升稳定性/降低事故”的叙事（`comms` 检定），成功则把重构转成有用工作

### 14.5 与“个人研究（AI 审计）”的冲突/融合点（你要的那个矛盾）

当你在交易所做 `ai_audit`：

- **外部收益**：你写出好内容/工具 → `brand/reputation +`
- **内部冷**（默认）：`performance` 不加甚至 -（被认为“不务正业”）
- **转化路径**：如果你把研究做成“内部落地”（`internalAdoption` 上升），则开始转为内部加分：
  - 例：把 AI 审计变成“PR 安全检查/规则引擎/告警 triage” → `performance +`，`posture +`

> 这能同时满足你说的：行业很火但 YH 领导没兴趣；并给玩家一个“把外部热转内部认可”的解法，否则就只能走外部声誉路线/离职路线。

### 14.6 事件链 D：周报/日报写作地狱（字数 KPI / 形式主义）

触发：交易所 + `politics>50` 或 `manager.toxicity>60`，随机

- 事件：上级/主管要求“每天一份日报 + 每周一份周报，字数要够、要体现加班和产出”，并暗示“年终看这个”
  - A **认真写（讲真话）**：`writing +`，但 `performance` 提升有限；`mood -1`（被迫耗时）
  - B **向上管理写（KPI 语言）**：`comms` 检定；成功则 `performance +2`，失败则 `politics +4`（被认为“不配合”）
  - C **自动化/模板化**（把形式主义工程化）：消耗少量 `cash` 或 `tooling` 行动，之后每周减少该类事件触发概率（你用工具对抗无聊）
  - D **摆烂/敷衍**：短期省精力，但 `trust/performance -`，并提高后续“被盯上/被约谈”的概率

设计意图：
- 把“写作能力”变成双刃剑：写得好可以苟住政治；但也可能被迫把人生写进周报。

### 14.7 事件链 E：事故复盘被迫背锅（证据链对抗）

触发：交易所 +（你参与过 on-call/事故事件，或重大安全事件在公司内发酵）+ `manager.toxicity` 中高

1) **复盘会前夜**：你发现会议目标不是“找 root cause”，而是“找一个人背锅”
   - A **整理证据链**（聊天记录/变更记录/时间线）：消耗行动点或 `writing` 动作，本周 `mood -1`，但降低背锅概率
   - B **先睡觉保命**：`stamina +`，但背锅概率上升

2) **会议现场**：上级开始引导叙事（“为什么你没提前发现？”）
   - A **用证据对抗**：`writing/comms` 检定；成功则 `trust +2`、`politics -3`；失败则 `performance -4`
   - B **背锅换平静**：`mood +1`（短期解脱），但 `performance -6`、并触发“长期被当软柿子”事件链
   - C **把锅升级为流程问题**（策略性）：成功则 `posture/runbooks +`（推动流程改进），但会提高 `politics`（你动了别人的蛋糕）

3) **会后余波**
   - 若你赢了：你在公司内评价会上升（但可能招来更强政治斗争）
   - 若你输了：触发“想离职/跳槽”分支，并给外部名声路线一个理由（去更看重真实产出的环境）

