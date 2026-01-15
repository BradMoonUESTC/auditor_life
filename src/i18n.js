import { clamp } from "./utils.js?v=37";

// 轻量 i18n：不引入外部依赖（纯前端、可离线），所有英文集中在语言包里
const DICT = {
  zh: {
    "ui.workMode.remote": "远程",
    "ui.workMode.onsite": "非远程",
    "ui.career.workMode": "工作方式",

    "log.rent.paid": "租房成本：-{amount}。",
    // New game: custom name
    "ui.newGame.name.label": "你的名字",
    "ui.newGame.name.placeholder": "比如：老王 / Alice / 0xH4ck3r",
    "ui.newGame.name.hint": "留空则使用默认名字。",
    // UI chrome
    "ui.app.title": "Web3 Auditor 模拟器",
    "ui.tabs.aria": "主导航",
    "ui.langSwitch.aria": "语言切换",
    "ui.top.new": "新档",
    "ui.top.save": "保存",
    "ui.top.reset": "重置",
    "ui.lang.zh": "中文",
    "ui.lang.en": "English",
    "ui.tabs.workbench": "工作台",
    "ui.tabs.orders": "直客订单",
    "ui.tabs.platform": "平台竞赛",
    "ui.tabs.career": "职业/公司",
    "ui.tabs.shop": "商店",
    "ui.tabs.x": "X 时间线",
    "ui.tabs.help": "说明",
    "ui.orders.title": "直客订单池",
    "ui.orders.hint": "每周刷新一批新订单，你也可以留着慢慢选。",
    "ui.orders.active": "进行中的直客项目",
    "ui.platform.title": "平台竞赛池",
    "ui.platform.hint": "玩法抽象自 Sherlock / Code4rena / Cantina：时间盒、多方竞争、评审/去重/申诉。",
    "ui.platform.active": "进行中的平台竞赛",
    "ui.community.title": "新闻动态",
    "ui.community.hint": "所有行动与事件都会记录在这里（可当朋友圈/时间线）。",
    "ui.shop.title": "商店 / 物品",
    "ui.shop.hint": "用现金购买物品获得训练/加成（永久或消耗品）。",
    "ui.shop.owned": "已拥有",
    "ui.shop.buy": "购买",
    "ui.shop.use": "使用",
    "ui.shop.soldout": "已拥有（不可重复）",
    "shop.item.better_chair.name": "人体工学椅",
    "shop.item.better_chair.desc": "长期打工需要装备：会议/公司任务更省点（更稳一点）。",
    "shop.item.report_templates.name": "报告模板包",
    "shop.item.report_templates.desc": "写作更顺：写报告/整理更快一些。",
    "shop.item.tooling_suite.name": "高级工具链订阅",
    "shop.item.tooling_suite.desc": "效率提升：审计/建模/写作/复测/提交更省点。",
    "shop.item.gym_membership.name": "健身房会员",
    "shop.item.gym_membership.desc": "长期回血更强：休息行动回复更多。",
    "shop.item.therapy_session.name": "心理咨询（一次）",
    "shop.item.therapy_session.desc": "立即回复心态（消耗品）。",
    "shop.item.training_pack.name": "训练营礼包（一次）",
    "shop.item.training_pack.desc": "立即获得少量属性成长（消耗品）。",
    "ui.x.title": "X（推特）时间线 · Web3 Security 梗",
    "ui.x.hint": "纯娱乐氛围：每周自动刷几条安全圈梗（不影响数值）。",
    "ui.sidebar.ap": "本周行动点",
    "ui.sidebar.hours": "本周工时：",
    "ui.sidebar.lang": "语言：",
    "ui.sidebar.apHint": "行动会消耗行动点；结束本周会触发事件与结算。",
    "ui.time.weekLabel": "第 {year} 年 · 第 {week} 周",
    "ui.hours.locked": "本周已开始行动，工时已锁定（下周可改）。",
    "ui.hours.title": "选择本周工时（影响行动点上限，周末会更累）。",
    "ui.hours.opt.6": "6h/天（躺平）",
    "ui.hours.opt.8": "8h/天（正常）",
    "ui.hours.opt.10": "10h/天（加班）",
    "ui.hours.opt.12": "12h/天（爆肝）",
    "ui.hours.opt.14": "14h/天（重度加班）",
    "ui.hours.opt.16": "16h/天（高强度）",
    "ui.hours.opt.18": "18h/天（极高强度）",
    "ui.hours.opt.20": "20h/天（接近不睡）",
    "ui.hours.opt.22": "22h/天（几乎不睡，严重损害）",
    "ui.hours.opt.24": "24h/天（不睡觉，毁灭性损害）",
    "ui.btn.endWeek": "结束本周",
    "ui.workbench.currentTarget": "当前目标",
    "ui.workbench.quickActions": "快捷行动",
    "ui.workbench.noTargets": "你目前没有进行中的工作项。去「直客订单」/「平台竞赛」接单，或去「职业/公司」看看 offer 与公司任务。",
    "ui.workbench.currentPick": "当前选择：{title}",
    "ui.stats.header": "核心指标",
    "ui.card.player": "审计师名片",
    "ui.career.hint": "你可以入职公司拿工资，也可以继续直客/平台；但在职外部接单会引入利益冲突与政治成本。",
    "ui.career.offers": "Offer 列表（Job Market）",
    "ui.career.offers.empty": "暂无 offer。本周多社交/发输出，下周更容易刷到。",
    "ui.career.employment": "在职状态",
    "ui.career.employment.none": "你当前未入职。自由职业=更自由，但现金流更波动。",
    "ui.career.tasks": "公司任务（Tickets）",
    "ui.career.tasks.empty": "暂无公司任务。入职后每周会自动生成 tickets。",
    "ui.career.major": "重大安全事件（抢时效）",
    "ui.career.major.empty": "暂无。重大事件低频发生，但一旦出现，抢时效输出会大幅加名声/声望（也可能翻车）。",
    "ui.career.major.chip": "重大事件",
    "ui.career.major.tip": "提示：先分析/追踪/写简报，再发 X；太早太水可能被打脸。",
    "ui.career.btn.accept": "入职",
    "ui.career.btn.quit": "离职",
    "ui.career.btn.requestRemote": "申请远程办公",
    "msg.remote.already": "你已经是远程了。",
    "log.remote.success": "你向「{company}」申请远程办公：通过了。租房成本消失（暂时）。",
    "log.remote.fail": "你向「{company}」申请远程办公：被打回。建议先刷信任/政治。",
    "log.remote.yubit.fail": "你向「{company}」申请远程办公：失败。理由是“我们支持远程文化”，但只支持在 PPT 里。",
    "ui.career.salary": "周薪",
    "ui.career.level": "职级",
    "ui.career.complianceStrict": "合规严格",
    "ui.career.performance": "绩效",
    "ui.career.trust": "信任",
    "ui.career.politics": "政治",
    "ui.career.promo": "晋升",
    "ui.career.promoLine": "晋升进度：{now}/{target}（本周 +{gain}，受声望/平台评级加成）",
    "ui.career.managerToxicity": "上级毒性",
    "ui.career.kpi": "KPI",
    "ui.common.setAsTarget": "设为当前目标",
    "ui.common.none": "暂无。",
    "ui.log.empty": "暂无动态。",
    "ui.log.clear": "清空",
    "ui.log.langNote": "提示：动态是历史记录，不会在切换语言时自动翻译旧内容。",
    "ui.x.empty": "暂无。等下周看看又有什么“桥”要背锅。",
    "ui.market.accept.direct": "接单",
    "ui.market.accept.platform": "报名",

    // Negotiation (direct clients)
    "ui.nego.title": "报价谈判",
    "ui.nego.round": "回合 {now}/{max}",
    "ui.nego.opening": "项目方：我们预算比较紧，想在 {deadline} 周内做完，范围大概 {scope}（你开价 {fee}）。你怎么回？",
    "ui.nego.terms": "当前条款",
    "ui.nego.meters": "对方状态",
    "ui.nego.base": "基准",
    "ui.nego.term.fee": "总费用",
    "ui.nego.term.deadline": "工期（周）",
    "ui.nego.term.deposit": "定金比例",
    "ui.nego.term.scope": "范围",
    "ui.nego.term.scopeClarity": "范围清晰度",
    "ui.nego.m.patience": "耐心",
    "ui.nego.m.trust": "信任",
    "ui.nego.m.pressure": "进度压力",
    "ui.nego.tip": "提示：谈判越久越容易谈崩；但信任/压力到位时更容易拿到更好的价与工期。",
    "ui.nego.movesTitle": "选项说明（大致效果）",
    "ui.nego.explain.anchor": "提高总费用（≈+10%），但会消耗对方耐心/信任；适合先把锚点抬上去。",
    "ui.nego.explain.trade": "小幅降价（≈-3%）换更高定金（≈+5%）和更合理工期（现在更容易 +1 周）；偏稳的谈法。",
    "ui.nego.explain.freeze": "提高“范围清晰度”，后续更不容易被 scope creep；通常会提升信任。",
    "ui.nego.explain.wbs": "用工作量拆解 + 风险解释来支撑报价（≈+5%），通常提升信任但也会消耗一点耐心。",
    "ui.nego.explain.walk": "威胁走人：可能逼出让步（压力↑），也可能直接谈崩（高风险）。",
    "ui.nego.explain.sign": "接受当前条款并接单（会按定金比例收定金）。",
    "ui.nego.explain.cancel": "退出谈判，不接这单。",
    "ui.nego.move.anchor": "抬价锚定（先把价格抬上去）",
    "ui.nego.move.trade": "小让步换条款（加定金/加工期）",
    "ui.nego.move.freeze": "范围冻结（把边界写清楚）",
    "ui.nego.move.wbs": "工作量拆解（WBS + 风险说明）",
    "ui.nego.move.walk": "威胁走人（高风险）",
    "ui.nego.move.sign": "签约（按当前条款接单）",
    "ui.nego.move.cancel": "取消（不接这单）",
    "ui.nego.you.anchor": "你：这个报价低于市场价。按风险/范围，我们得按更合理的费率来。",
    "ui.nego.you.trade": "你：可以给一点优惠，但需要更高定金/更合理工期，避免上线翻车。",
    "ui.nego.you.freeze": "你：先把范围边界冻结写清楚，避免后期无限加 scope。",
    "ui.nego.you.wbs": "你：我给你拆一下工作量与风险点，为什么要这个价/工期。",
    "ui.nego.you.walk": "你：如果只按这个预算/工期，我建议你们找别家（或者延期/降范围）。",
    "ui.nego.react.accept": "项目方：行，我们可以接受你这个思路。",
    "ui.nego.react.counter": "项目方：可以谈，但我们要还个价/压一下定金。",
    "ui.nego.react.scopeAdd": "项目方：顺便把这块也帮我们看看（scope +）。",
    "ui.nego.react.stall": "项目方：我回去和老板/BD 对一下，再说。",
    "ui.nego.fail.patience": "项目方：算了，我们先不做了（对方耐心归零）。",
    "ui.nego.fail.trust": "项目方：我们不太信你能兜住风险，先不合作了。",
    "log.nego.start": "你开始与项目方谈判：{title}。",
    "log.nego.cancel": "你放弃了这单：{title}。",
    "log.nego.fail": "谈判谈崩：{title}（{reason}）。",
    "log.nego.success": "谈判达成：{title}（费用 {fee}，工期 {weeks} 周，定金 {depositPct}）。",

    "log.week.livingCost": "本周生活成本：-{amount}。",
    "ui.market.scope": "范围",
    "ui.market.hype": "热度",
    "ui.market.riskHint": "风险提示：黑客关注度 {v}/100。",
    "ui.market.contestHint": "提示：参赛人数越多，去重撞车概率越大。",
    "ui.bool.yes": "是",
    "ui.bool.no": "否",

    "direct.title": "{client}: {protocol}",
    "direct.notes.rush": "加急交付，漏报风险上升。",
    "direct.notes.normal": "常规节奏，可做复测与范围管理。",
    "direct.notes.dao": "DAO 项目方：按周 {perWeek} 的节奏付费（常见于社区/开源驱动项目）。",

    "platform.title": "{platform}: {protocol} 竞赛",
    "platform.notes.hot": "热度爆表：去重撞车高发，评审更严格。",
    "platform.notes.normal": "中等热度：拼深度与写作，申诉也能翻盘。",

    "job.title.exchange": "安全工程师（平台）",
    "job.title.sec": "审计/安全研究员",
    "job.notes.exchange": "更严格、更卷：外部接单/公开输出更容易触发合规/政治事件。",
    "job.notes.sec": "相对自由：更看重交付质量与声誉；公开研究可能更被认可。",

    "msg.offerExpired": "offer 已过期。",
    "msg.notEmployed": "你当前未入职。",
    "msg.limit.direct": "你同时最多推进 2 个直客项目。",
    "msg.limit.platform": "你本周只能同时参加 1 场平台竞赛。",
    "msg.apNotEnough": "行动点不够：需要 {cost} 点。",
    "msg.noActiveTarget": "你还没有进行中的项目/竞赛。先去接单或报名吧。",
    "msg.submit.onlyPlatform": "提交 finding 仅适用于平台竞赛。",
    "msg.submit.noDraft": "你当前没有草稿 finding 可提交。",
    "msg.company.needTarget": "做公司任务需要选择一个公司 ticket 作为当前目标。",
    "msg.company.needEmployment": "你当前未入职，无法推进公司任务。",
    "msg.meeting.needEmployment": "你当前未入职，会议/评审意义不大。",
    "log.job.accepted": "你入职了 {company}（L{level}，周薪 {salary}）。",

    // Logs (core)
    "log.week.newYear": "新的一年开始了。你活下来了。",
    "log.week.enter": "进入 {week}。行动点已恢复。",
    "log.salary.received": "工资到账：+{amount}。",
    "log.promo.up": "升职啦：{company} L{from} → L{to}（新周薪 {salary}）。",
    "log.target.switched": "已切换当前目标：{kind} {id}。",
    "log.target.kind.direct": "直客",
    "log.target.kind.platform": "平台",
    "log.target.kind.company": "公司",
    "log.accept.direct": "接下直客项目《{title}》，收到定金 {deposit}。",
    "log.accept.platform": "报名平台竞赛《{title}》，倒计时 {weeks} 周。",
    "log.welcome": "欢迎来到 Web3 审计圈。第 1 年第 1 周，你的“审计生涯”开始了。",
    "log.hours.set.normal": "你把本周工时设为 8h/天：正常节奏。",
    "log.hours.set.overtime": "你决定本周加班到 {h}h/天：行动点上限↑，但周末更累。",
    "log.hours.set.chill": "你决定本周只干 {h}h/天：行动点上限↓，但更能恢复。",

    // Logs (actions)
    "log.action.rest": "休息回血（精力+{sta}，心态+{md}）。",
    "log.action.learn": "抽时间学习训练：{stat} +{inc}。",
    "log.action.blog": "发了一篇安全科普小作文（声望+{rep}，关系网+{net}）。",
    "log.action.compliance": "做了一轮合规/法务自查（合规风险-{down}）。",
    "log.action.write.report": "整理《{title}》报告（进度+{inc}）。",
    "log.action.platform.evidence": "为《{title}》补充描述/复现（证据值+{inc}）。",
    "log.action.platform.submit": "向平台提交 finding {n} 条（进入评审/去重池）。",
    "log.action.comms.direct": "与客户沟通《{title}》范围与修复节奏（配合度+{up}，修复率↑）。",
    "log.action.comms.platform": "在《{title}》评论区与评审讨论（心理波动+1）。",
    "log.action.coverage.platform.found": "投入《{title}》：{action}（覆盖率+{gain}），产出草稿 finding {n} 条（{sev}）。",
    "log.action.coverage.platform.none": "投入《{title}》：{action}（覆盖率+{gain}），暂未产出有效 finding。",
    "log.action.coverage.direct.found": "推进《{title}》：{action}（覆盖率+{gain}），发现漏洞 {n} 条（{sev}）。",
    "log.action.coverage.direct.none": "推进《{title}》：{action}（覆盖率+{gain}），暂未发现新问题。",

    "log.direct.delivered": "直客交付《{title}》：报告 {report}%，覆盖 {coverage}%，质量 {quality}；收尾款 {payout}，声望{repDelta}。",
    "log.direct.postShipIssue": "《{title}》上线后被曝出遗漏问题，你被迫发说明并背锅。",
    "log.direct.delayedNeedReport": "直客《{title}》：客户表示“报告先写完再交付”，项目被迫延期 1 周（报告进度 {report}%）。",

    "log.companyTicket.missedDeadline": "公司任务延期：《{title}》没赶上 deadline，你被迫在群里解释。",

    "log.contest.noSubmitNote": "（未提交=不参与评审）",
    "log.contest.settled": "平台结算《{title}》：提交 {submitted} 条，通过 {acceptedPts} 分，去重 {duplicated}，驳回 {rejected}；奖金 {payout}，平台评级{ratingDelta}。{note}",

    "log.action.company.progress": "推进公司任务《{title}》（进度+{inc}%）。",
    "log.action.company.done": "公司任务完成：{title}（绩效+{perf}）。",
    "log.action.meeting": "参加了一轮评审会：减少了一些“扯皮不确定性”（信任/绩效小幅上升）。",
    "log.action.aiResearch.warn": "你研究 AI 审计（进度+{inc}%）：行业很火，但公司里有人觉得你“不务正业”。",
    "log.action.aiResearch.good": "你研究 AI 审计（进度+{inc}%）：外部名声在积累。",

    "log.job.quit": "你从 {company} 离职了：自由回来了，但现金流也开始波动。",

    "ui.career.major.windowLine": "窗口剩余：{weeks} 周｜分析 {analysis}%｜追踪 {tracing}%｜简报 {writeup}%｜X {x}%",
    "ui.career.ticket.line": "进度：{progress}% ｜ 影响：{impact}/100",
    "ui.marketCard.direct.rush": "加急",
    "ui.marketCard.direct.coop": "配合",
    "ui.marketCard.active.report": "报告",
    "ui.marketCard.active.findings": "发现",
    "ui.marketCard.active.fixRate": "修复率",
    "ui.marketCard.active.shipUrgency": "上线冲动",
    "ui.marketCard.active.draft": "草稿",
    "ui.marketCard.active.submitted": "已提交",
    "ui.marketCard.active.evidence": "证据值",
    "ui.active.direct.summary": "{report} {reportPct}%｜{findings} {found} {entry}｜{fixRate} {fixRatePct}%｜{shipUrgency} {shipUrgencyPct}%",
    "ui.active.platform.summary": "{draft} {draftN} {entry}｜{submitted} {submittedN} {entry}｜{evidence} {evidencePct}%",
    "ui.help.title": "玩法说明（MVP）",
    "ui.help.goalTitle": "目标",
    "ui.help.goalBody": "在按周推进的节奏里，平衡现金流、声望、精力/心态与合规风险。",
    "ui.help.directTitle": "直客",
    "ui.help.directBody": "重沟通与报告质量，稳定收款，但容易范围蔓延。",
    "ui.help.platformTitle": "平台",
    "ui.help.platformBody": "重速度与深度，奖励受去重/评审影响，能堆平台评级。",
    "ui.help.endWeekTitle": "结束本周",
    "ui.help.endWeekBody": "会结算项目进度、触发事件、刷新市场，并恢复少量行动点上限（取决于你的状态）。",
    "ui.help.disclaimer": "免责声明：纯属虚构，不构成安全/投资建议；平台机制为玩法抽象。",
    "ui.lb.title": "排行榜",
    "ui.lb.hint": "同行也在刷钱/刷 finding：每周滚动更新（尽量贴近你的增速）。",
    "ui.lb.earn": "赚钱榜",
    "ui.lb.find": "Finding 榜",
    "ui.lb.col.name": "名字",
    "ui.lb.col.week": "本周",
    "ui.lb.col.total": "总计",
    "player.title.freelance": "自由审计师（从零开荒）",
    "player.name.default": "马某某·审计师",
    "company.ticketType.design_review": "设计评审",
    "company.ticketType.pr_review": "代码评审",
    "company.ticketType.monitoring": "监控建设",
    "company.ticketType.incident": "事件响应",
    "company.ticketType.training": "安全培训",
    "company.ticketType.compliance": "合规审计",
    "company.ticketType.security_tooling": "安全工具开发",
    "project.company.title": "公司任务：{type}（范围 {scope}）",
    "ui.auto.title": "自动化模式",
    "ui.auto.enabled": "启用自动化（每 2 秒一步）",
    "ui.auto.focus": "偏好：",
    "ui.auto.focus.balanced": "均衡",
    "ui.auto.focus.survival": "生存优先（先休息）",
    "ui.auto.focus.direct": "直客优先",
    "ui.auto.focus.platform": "平台优先",
    "ui.auto.focus.company": "公司任务优先",
    "ui.auto.focus.incident": "重大事件优先",
    "ui.auto.focus.research": "研究优先",
    "ui.auto.allowAcceptJob": "允许自动入职",
    "ui.auto.allowQuitJob": "允许自动离职",
    "ui.auto.autoEndWeek": "行动点用完后自动结束本周",
    "ui.auto.minStaminaPct": "最低精力阈值(%)",
    "ui.auto.minMoodPct": "最低心态阈值(%)",

    // Stats labels
    "stat.stamina": "精力",
    "stat.mood": "心态",
    "stat.skill": "审计能力",
    "stat.tooling": "工具链",
    "stat.writing": "写作能力",
    "stat.comms": "沟通能力",
    "stat.reputation": "声望",
    "stat.brand": "名声",
    "stat.platformRating": "平台评级",
    "stat.compliance": "合规风险",
    "stat.cash": "现金",
    "stat.network": "关系网",

    // Actions
    "action.audit.name": "审计代码",
    "action.audit.label": "🧪 审计代码",
    "action.audit.hint": "覆盖率↑，有概率发现漏洞；简单项目更省点更快",
    "action.model.name": "推理/建模",
    "action.model.label": "🧠 推理/建模",
    "action.model.hint": "更容易挖到高危；复杂项目更烧脑更费点",
    "action.write.name": "写报告/整理",
    "action.write.label": "📝 写报告/整理",
    "action.write.hint": "漏洞少/范围小=写得快；堆积多/复杂=更慢更费点",
    "action.retest.name": "复测",
    "action.retest.label": "🔁 复测",
    "action.retest.hint": "降低上线后翻车概率（复杂项目需要更多跟进）",
    "action.comms.name": "沟通/范围",
    "action.comms.label": "📞 沟通/范围",
    "action.comms.hint": "直客配合度↑，修复率↑",
    "action.submit.name": "提交 finding",
    "action.submit.label": "📮 提交 finding",
    "action.submit.hint": "平台：把草稿提交到评审/去重池（不提交=不结算）",
    "action.companyWork.name": "做公司任务",
    "action.companyWork.label": "🏢 做公司任务",
    "action.companyWork.hint": "在职/公司任务：推进 ticket、攒绩效（也可能是形式主义）",
    "action.meeting.name": "参加会议/评审",
    "action.meeting.label": "🗓️ 参加会议/评审",
    "action.meeting.hint": "降低事故风险、提高对齐度（但消耗心态）",
    "action.aiResearch.name": "研究 AI 审计",
    "action.aiResearch.label": "🤖 研究 AI 审计",
    "action.aiResearch.hint": "公司外名声↑；公司内不一定加分（尤其交易所）",
    "action.productizeAI.name": "研究成果产品化",
    "action.productizeAI.label": "🧰 研究成果产品化",
    "action.productizeAI.hint": "把研究转成内部工具/流程：公司内评价↑，防守体系↑",
    "action.incidentAnalysis.name": "事件分析",
    "action.incidentAnalysis.label": "🧯 事件分析",
    "action.incidentAnalysis.hint": "重大事件：还原攻击路径（抢时效）",
    "action.fundTrace.name": "资金追踪",
    "action.fundTrace.label": "🧵 资金追踪",
    "action.fundTrace.hint": "重大事件：追踪资金流向（提高可信度）",
    "action.writeBrief.name": "写简报/报告",
    "action.writeBrief.label": "📝 写简报/报告",
    "action.writeBrief.hint": "重大事件：写得快且靠谱=外部名声↑、上级观感↑",
    "action.postX.name": "发 X thread",
    "action.postX.label": "𝕏 发 thread",
    "action.postX.hint": "重大事件：窗口期内发布收益最大；太早/太水会被打脸",
    "action.blog.name": "发动态",
    "action.blog.label": "📣 发动态",
    "action.blog.hint": "声望↑ 关系网↑（也可能引来舆情）",
    "action.learn.name": "学习",
    "action.learn.label": "📚 学习",
    "action.learn.hint": "随机属性小幅成长",
    "action.rest.name": "休息",
    "action.rest.label": "💆 休息",
    "action.rest.hint": "精力/心态恢复",
    "action.compliance.name": "合规",
    "action.compliance.label": "⚖️ 合规",
    "action.compliance.hint": "合规风险下降（短期不赚钱）",

    // Modal / toast
    "modal.toast.title": "提示",
    "modal.toast.ok": "知道了",
    "modal.endWeek.title": "结束本周",
    "modal.endWeek.body": "确认结束本周？将进行项目结算、触发事件并进入下一周。",
    "modal.common.cancel": "取消",
    "modal.common.confirm": "确认",
    "modal.reset.title": "重置存档",
    "modal.reset.body": "危险操作：将删除本地存档并重开。",
    "modal.reset.confirm": "删除并重开",
    "modal.new.title": "新档",
    "modal.new.body": "将创建一个全新存档（不会删除旧存档，除非你点“重置”）。",
    "modal.new.confirm": "创建新档",
    "toast.saved": "已保存到本地（localStorage）。",

    // Career chips
    "chip.exchange": "交易所",
    "chip.sec": "安全公司",
    "chip.direct": "直客",
    "chip.platform": "平台",
    "chip.company": "公司",
    "ui.unit.week": "周",
    "ui.unit.entry": "条",
    "ui.unit.point": "分",

    "ui.project.coverage": "覆盖率：",
    "ui.project.report": "报告：",
    "ui.project.fixRate": "修复率：",
    "ui.project.shipUrgency": "上线冲动：",
    "ui.project.retest": "复测：",
    "ui.project.draft": "草稿：",
    "ui.project.submitted": "已提交：",
    "ui.project.evidence": "证据值：",
    "ui.project.progress": "进度：",
    "ui.project.impact": "影响：",
    "ui.project.risk": "风险：",

    // Protocol names (zh)
    "protocol.erc20": "ERC20/代币经济",
    "protocol.dex": "AMM/DEX",
    "protocol.lending": "借贷协议",
    "protocol.bridge": "跨链桥",
    "protocol.perp": "衍生品/永续",
    "protocol.aa": "账户抽象/钱包",
    "protocol.rollup": "Rollup/链级系统",

    // Platform names (zh)
    "platform.sherlock": "Sherlock（抽象）",
    "platform.code4rena": "Code4rena（抽象）",
    "platform.cantina": "Cantina（抽象）",

    // Company names (zh)
    "company.cantina.name": "Cantina",
    "company.web3dao.name": "磐石安全实验室",
    "company.spearbit.name": "Spearbit",
    "company.hashlock.name": "Hashlock",
    "company.certik.name": "CertiK（抽象）",
    "company.yubit.name": "Yubit",
    "company.binance.name": "Binance（抽象）",
    "company.yh.name": "YH（抽象）",

    // Direct client (zh)
    "client.1": "某 DeFi 初创团队",
    "client.2": "某 VC 投后项目",
    "client.3": "某交易所孵化项目",
    "client.4": "某老牌 Web2 团队转型",
    "client.5": "匿名资方支持的神秘项目",
    "client.6": "朋友转介绍的“靠谱”项目",
    "client.web3dao": "磐石安全实验室（DAO）",

    // X feed memes (zh)
    "x.memes": [
      "GM. 今天也没有新的攻击面（骗你的）。",
      "“只是个小改动” —— 然后 scope 从 2 repo 变成 9 repo。",
      "看到 `delegatecall` 的那一刻：我不困了，我醒了。",
      "POC：本地过了；主网：不，我不认。",
      "审计报告写到 90%：突然发现核心流程还有个分支没看。",
      "Bridge again? 你说的是哪一座桥（。",
      "客户：能不能写一句“绝对安全”？我：能不能先不要。",
      "Code4rena：你是第 1 个发现的。也是第 17 个提交的。（duplicated）",
      "Sherlock：needs more evidence（你：我都贴了交易哈希了啊！）",
      "Cantina：范围内。范围外。范围内。范围外。（循环）",
      "找到一个 critical：心态 +10；想到要写复现：心态 -12。",
      "“gas 优化”把 `unchecked` 贴满了：我开始流汗。",
      "“这个函数只有 owner 能调”—— owner 是个可重入合约（。",
      "你以为是 reentrancy，结果是 rounding；你以为是 rounding，结果是 reentrancy。",
      "审计师的日常：写 PoC、写报告、写解释、写道歉（希望用不上）。",
      "把 `require(x)` 改成 `if (!x) return;`：安全感 -100。",
    ],

    // Events (zh)
    "event.exchange_report_kpi_hell.title": "日报/周报地狱",
    "event.exchange_report_kpi_hell.desc": "主管：“每天日报、每周周报，字数要够，体现加班和产出。年终就看这个。”",
    "event.exchange_report_kpi_hell.choice.honest": "讲真话写（认真但费时）",
    "event.exchange_report_kpi_hell.choice.kpi": "用 KPI 语言写（向上管理）",
    "event.exchange_report_kpi_hell.log.honest": "你写了份“讲人话”的周报：有用但不讨喜。",
    "event.exchange_report_kpi_hell.log.kpi.ok": "你把工作翻译成了 KPI 语言：上面很满意。",
    "event.exchange_report_kpi_hell.log.kpi.fail": "你写得太“实诚”，被说“不够积极”。",

    "event.exchange_postmortem_blame.title": "复盘会：找背锅的人",
    "event.exchange_postmortem_blame.desc": "你隐约感觉：这场复盘不太像“找 root cause”，更像“找一个人背锅”。",
    "event.exchange_postmortem_blame.choice.evidence": "整理证据链（自保）",
    "event.exchange_postmortem_blame.choice.take_blame": "背锅换平静（短期）",
    "event.exchange_postmortem_blame.log.evidence.ok": "你用证据对抗叙事：这次没人敢把锅扣你头上。",
    "event.exchange_postmortem_blame.log.evidence.fail": "你准备不够充分：会议上被反复追问，气氛很差。",
    "event.exchange_postmortem_blame.log.take_blame": "你把锅背了：会议很快结束，但你知道这会变成“习惯”。",

    "event.scope_creep.title": "范围蔓延",
    "event.scope_creep.desc": "客户：“顺便把另一个仓库也看一下吧？不多，就一点点。”",
    "event.scope_creep.choice.boundary": "明确边界：加钱/延时（沟通）",
    "event.scope_creep.choice.overtime": "先做了再说（加班）",
    "event.scope_creep.log.boundary": "你把范围钉死了，还顺手谈到了一点“变更费用”。",
    "event.scope_creep.log.overtime": "你默默加班把活接了，心里开始泛酸。",

    "event.endorsement.title": "背书式审计请求",
    "event.endorsement.desc": "客户希望你在公告里写：“已由顶级审计师全面审计，绝对安全”。",
    "event.endorsement.choice.refuse": "拒绝夸大（合规优先）",
    "event.endorsement.choice.ambiguous": "含糊其辞（埋雷）",
    "event.endorsement.log.refuse": "你坚持写了克制的表述：只陈述范围与发现。",
    "event.endorsement.log.ambiguous": "你写了句“基本安全”，收到了一点额外“感谢费”。",

    "event.platform_rejudge.title": "平台评审降级风波",
    "event.platform_rejudge.desc": "评审：你这条高危看起来更像中危。你要不要申诉补材料？",
    "event.platform_rejudge.choice.appeal": "补充 PoC/影响面（消耗行动点）",
    "event.platform_rejudge.choice.move_on": "算了，继续找洞",
    "event.platform_rejudge.log.noAp": "你想申诉，但本周行动点已经见底。",
    "event.platform_rejudge.log.win": "申诉成功：评审接受了你的补充材料。",
    "event.platform_rejudge.log.lose": "申诉失败：评审表示“感谢参与”。",
    "event.platform_rejudge.log.move_on": "你决定把时间留给更确定的产出。",

    "event.burnout.title": "透支警告",
    "event.burnout.desc": "你开始靠咖啡续命，代码在晃，世界也在晃。",
    "event.burnout.choice.rest": "强制休息一周",
    "event.burnout.choice.push": "继续硬扛（风险↑）",
    "event.burnout.log.rest": "你选择停一停：项目进度慢了点，但你活下来了。",
    "event.burnout.log.push": "你硬扛下去：产出也许没变，但你变脆了。",

    "event.bear.title": "市场转冷",
    "event.bear.desc": "熊市气息蔓延，客户压价、缩范围，平台竞赛也更卷了。",
    "event.bear.choice.tooling": "降本增效（工具链/流程）",
    "event.bear.choice.contests": "去平台冲奖金",
    "event.bear.log.tooling": "你花钱上了更顺手的工具/流程，效率更稳。",
    "event.bear.log.contests": "你决定把一部分精力转去平台赛道。",

    "event.bull.title": "牛市开闸",
    "event.bull.desc": "链上热钱回来了：新项目扎堆，大家都想“尽快上线”。",
    "event.bull.choice.raise_price": "趁势涨价（直客优先）",
    "event.bull.choice.workshop": "开公开课引流（社区优先）",
    "event.bull.log.raise_price": "你把报价抬了抬，客户居然还说“行”。",
    "event.bull.log.workshop": "你连发三条科普：点赞很多，精力也被吸走一些。",

    "event.payment_delay.title": "尾款拖延",
    "event.payment_delay.desc": "客户财务：“流程有点慢，下周一定打。”",
    "event.payment_delay.choice.formal": "发正式催款函（法务/合规）",
    "event.payment_delay.choice.wait": "先相信一次（心态）",
    "event.payment_delay.log.formal": "你把流程写得很清楚：对方也不敢再装死。",
    "event.payment_delay.log.wait": "你选择等等：希望别把“拖延”当成习惯。",

    "event.platform_dup_wave.title": "去重海啸",
    "event.platform_dup_wave.desc": "平台公告：本场竞赛重复提交率异常高，去重会更严格。",
    "event.platform_dup_wave.choice.niche": "立刻转攻冷门模块（策略）",
    "event.platform_dup_wave.choice.hot": "继续冲热门点位（硬刚）",
    "event.platform_dup_wave.log.niche": "你改了打法：不拼速度，拼深度。",
    "event.platform_dup_wave.log.hot": "你决定硬刚：成败都看这一波。",

    "event.health.title": "小病来袭",
    "event.health.desc": "你嗓子开始疼，脑子像在加载 2G 网。",
    "event.health.choice.rest": "买药+睡觉（休息）",
    "event.health.choice.coffee": "喝咖啡硬顶（风险）",
    "event.health.log.rest": "你终于像个人类一样照顾自己了。",
    "event.health.log.coffee": "咖啡把你推上去，又把你摔下来。",

    "event.exploit_rumor.title": "爆雷传闻",
    "event.exploit_rumor.desc": "社区里有人在传：“某项目审计没看出来，真能行吗？”（你被点名）",
    "event.exploit_rumor.choice.respond": "公开解释（写作+沟通）",
    "event.exploit_rumor.choice.ignore": "装死（心态优先）",
    "event.exploit_rumor.log.respond.ok": "你把范围、方法与限制讲清楚了，舆情缓和。",
    "event.exploit_rumor.log.respond.fail": "解释没打动人，反而引来更多阴阳怪气。",
    "event.exploit_rumor.log.ignore": "你选择不回：今天的网络，不值得。",

    "event.ambient_ping.title": "小插曲",
    "event.ambient_ping.desc": "没什么大事发生，但生活总会来点小波动：一条消息、一次误会、或一阵突然的疲惫。",
    "event.ambient_ping.choice.scroll": "刷会儿时间线，缓一下",
    "event.ambient_ping.choice.keep": "继续干活（当没发生）",
    "event.ambient_ping.log.scroll": "你随手刷了会儿时间线：心态稍微回了点。",
    "event.ambient_ping.log.keep": "你选择继续干：小事别影响节奏。",

    "event.yh_toxic_guarantee.title": "上级“阿里味”发作",
    "event.yh_toxic_guarantee.desc": "你刚入职不久，就感受到一股熟悉的“阿里味”：周报 KPI、复盘背锅、向上管理……总得先来一拳。",
    "event.yh_toxic_guarantee.choice.endure": "先忍（保住饭碗）",
    "event.yh_toxic_guarantee.choice.push_back": "硬刚讲道理（高风险）",
    "event.yh_toxic_guarantee.log.endure": "你选择先忍：嘴上说“收到”，心里说“我草”。",
    "event.yh_toxic_guarantee.log.push_back.ok": "你这次说服了对方：暂时没再追着你喷。",
    "event.yh_toxic_guarantee.log.push_back.fail": "你被贴上了“难管/不配合”的标签：接下来会更难受。",

    // Major incident (zh)
    "log.major.expired": "重大事件窗口已过期：《{title}》。你错过了抢时效的红利。",
    "log.major.spawned": "【重大事件】{title}（窗口 {weeks} 周）。",
    "major.title.bridge_hack": "跨链桥疑似被打：资金异常外流",
    "major.title.oracle_fail": "预言机异常：多协议连环清算",
    "major.title.governance_attack": "治理攻击：提案被疑似劫持",
    "major.title.key_leak": "私钥疑云：权限地址发生异常操作",
    "msg.major.none": "当前没有重大安全事件。",
    "log.major.action.analysis": "你在做事件分析：还原攻击路径（分析 {pct}%）。",
    "log.major.action.tracing": "你在追踪资金：地址标注与流向整理（追踪 {pct}%）。",
    "log.major.action.writeup": "你在写简报：把影响面与时间线写清楚（简报 {pct}%）。",
    "log.major.postX.early": "你太早发 thread：被打脸（声望-2，名声-1）。",
    "log.major.postX.good": "你发布了重大事件 thread：外部反响不错（声望+{repGain}，名声+{brandGain}）。",
    "xpost.major.early": "（翻车）我太早发了对《{title}》的判断，后续信息打脸。以后先写完再发。",
    "xpost.major.good": "《{title}》简报：时间线/影响面/缓解建议（窗口剩余 {weeks} 周）。",

    // AI research (zh)
    "xpost.aiResearch.publish": "我做了个 AI 审计小实验：能抓到一些常见模式，但离“替代人类审计”还差得远。重点是：怎么把它接进流程。",
    "log.aiResearch.publish": "你发布了 AI 审计研究小结：外部反响不错（声望+2，名声+2）。",
    "log.aiResearch.productized": "你把 AI 审计研究做成了“流程里的小工具”（内部采用度+{inc}%）。",
  },
  en: {
    "ui.workMode.remote": "Remote",
    "ui.workMode.onsite": "Onsite",
    "ui.career.workMode": "Work mode",

    "log.rent.paid": "Rent (onsite): -{amount}.",
    // New game: custom name
    "ui.newGame.name.label": "Your name",
    "ui.newGame.name.placeholder": "e.g. Alice / Bob / 0xH4ck3r",
    "ui.newGame.name.hint": "Leave blank to use the default name.",
    "ui.app.title": "Web3 Auditor Simulator",
    "ui.tabs.aria": "Main navigation",
    "ui.langSwitch.aria": "Language switch",
    "ui.top.new": "New",
    "ui.top.save": "Save",
    "ui.top.reset": "Reset",
    "ui.lang.zh": "中文",
    "ui.lang.en": "English",
    "ui.tabs.workbench": "Workbench",
    "ui.tabs.orders": "Direct Clients",
    "ui.tabs.platform": "Contests",
    "ui.tabs.career": "Career",
    "ui.tabs.shop": "Shop",
    "ui.tabs.x": "X Timeline",
    "ui.tabs.help": "Help",
    "ui.orders.title": "Direct Client Market",
    "ui.orders.hint": "New orders refresh weekly. You can also leave them and pick later.",
    "ui.orders.active": "Active Direct Projects",
    "ui.platform.title": "Contest Market",
    "ui.platform.hint": "Abstracted from Sherlock / Code4rena / Cantina: timebox, competition, review/duplicates/appeals.",
    "ui.platform.active": "Active Contests",
    "ui.community.title": "Activity Feed",
    "ui.community.hint": "All actions and events are recorded here.",
    "ui.shop.title": "Shop / Items",
    "ui.shop.hint": "Spend cash to buy items for training & bonuses (permanent or consumables).",
    "ui.shop.owned": "Owned",
    "ui.shop.buy": "Buy",
    "ui.shop.use": "Use",
    "ui.shop.soldout": "Owned (non-repeatable)",
    "shop.item.better_chair.name": "Ergonomic Chair",
    "shop.item.better_chair.desc": "For long-term work: meetings/company tickets cost less AP.",
    "shop.item.report_templates.name": "Report Templates",
    "shop.item.report_templates.desc": "Writing flows better: report/triage progresses faster.",
    "shop.item.tooling_suite.name": "Tooling Suite Subscription",
    "shop.item.tooling_suite.desc": "Efficiency boost: audit/model/write/retest/submit cost less AP.",
    "shop.item.gym_membership.name": "Gym Membership",
    "shop.item.gym_membership.desc": "Better recovery: rest heals more.",
    "shop.item.therapy_session.name": "Therapy Session (1x)",
    "shop.item.therapy_session.desc": "Instantly restore mood (consumable).",
    "shop.item.training_pack.name": "Training Pack (1x)",
    "shop.item.training_pack.desc": "Instantly gain small random stat growth (consumable).",
    "ui.x.title": "X Timeline · Web3 Security Memes",
    "ui.x.hint": "Just vibes: a few security memes each week (no stats impact).",
    "ui.sidebar.ap": "Action Points",
    "ui.sidebar.hours": "Hours/day:",
    "ui.sidebar.lang": "Language:",
    "ui.sidebar.apHint": "Actions consume AP. Ending the week triggers settlement and events.",
    "ui.time.weekLabel": "Year {year} · Week {week}",
    "ui.hours.locked": "You already worked this week. Hours are locked until next week.",
    "ui.hours.title": "Pick hours/day (affects AP max; higher hours hurt at week end).",
    "ui.hours.opt.6": "6h/day (chill)",
    "ui.hours.opt.8": "8h/day (normal)",
    "ui.hours.opt.10": "10h/day (overtime)",
    "ui.hours.opt.12": "12h/day (grind)",
    "ui.hours.opt.14": "14h/day (heavy overtime)",
    "ui.hours.opt.16": "16h/day (high intensity)",
    "ui.hours.opt.18": "18h/day (extreme)",
    "ui.hours.opt.20": "20h/day (almost no sleep)",
    "ui.hours.opt.22": "22h/day (severe damage)",
    "ui.hours.opt.24": "24h/day (no sleep, devastating)",
    "ui.btn.endWeek": "End Week",
    "ui.workbench.currentTarget": "Current Target",
    "ui.workbench.quickActions": "Quick Actions",
    "ui.workbench.noTargets": "No active work items. Go to Direct Clients / Contests, or check Career for job offers & tickets.",
    "ui.workbench.currentPick": "Selected: {title}",
    "ui.stats.header": "Stats",
    "ui.card.player": "Profile",
    "ui.career.hint": "You can take a job for a stable salary while still doing external work. Conflicts of interest and politics may follow.",
    "ui.career.offers": "Job Offers",
    "ui.career.offers.empty": "No offers yet. Do some networking / public output and check again next week.",
    "ui.career.employment": "Employment",
    "ui.career.employment.none": "You are not employed. Freedom is high; income is volatile.",
    "ui.career.tasks": "Company Tickets",
    "ui.career.tasks.empty": "No tickets. Once employed, tickets spawn weekly.",
    "ui.career.major": "Major Incident (Time Window)",
    "ui.career.major.empty": "None. Major incidents are rare but huge: fast, solid public output boosts your brand (or backfires).",
    "ui.career.major.chip": "Major",
    "ui.career.major.tip": "Tip: analyze → trace → write brief → post. Posting too early can backfire.",
    "ui.career.btn.accept": "Accept",
    "ui.career.btn.quit": "Quit",
    "ui.career.btn.requestRemote": "Request remote work",
    "msg.remote.already": "You're already remote.",
    "log.remote.success": "Remote work request to {company}: approved. Rent cost disappears (for now).",
    "log.remote.fail": "Remote work request to {company}: denied. Build trust / play politics first.",
    "log.remote.yubit.fail": "Remote work request to {company}: denied. Reason: “we support remote culture” — in slides only.",
    "ui.career.salary": "Salary/wk",
    "ui.career.level": "Level",
    "ui.career.complianceStrict": "Compliance",
    "ui.career.performance": "Performance",
    "ui.career.trust": "Trust",
    "ui.career.politics": "Politics",
    "ui.career.promo": "Promotion",
    "ui.career.promoLine": "Promotion progress: {now}/{target} (+{gain}/wk, boosted by reputation & platform rating)",
    "ui.career.managerToxicity": "Manager toxicity",
    "ui.career.kpi": "KPI",
    "ui.common.setAsTarget": "Set as target",
    "ui.common.none": "None.",
    "ui.log.empty": "No activity yet.",
    "ui.log.clear": "Clear",
    "ui.log.langNote": "Note: the feed is historical; old entries are not auto-translated when you switch language.",
    "ui.x.empty": "Nothing yet. Wait for the next bridge to take the blame.",
    "ui.market.accept.direct": "Accept",
    "ui.market.accept.platform": "Join",

    // Events (en)
    "event.exchange_report_kpi_hell.title": "Daily/Weekly Report Hell",
    "event.exchange_report_kpi_hell.desc": "Manager: “Daily report. Weekly report. Word count must look like overtime and output. Year-end depends on this.”",
    "event.exchange_report_kpi_hell.choice.honest": "Write plainly (useful but costly)",
    "event.exchange_report_kpi_hell.choice.kpi": "Write in KPI-speak (manage up)",
    "event.exchange_report_kpi_hell.log.honest": "You wrote a human-readable report: useful, but not flattering.",
    "event.exchange_report_kpi_hell.log.kpi.ok": "You translated your work into KPI language: leadership is pleased.",
    "event.exchange_report_kpi_hell.log.kpi.fail": "Too honest: you got labeled “not positive enough.”",

    "event.exchange_postmortem_blame.title": "Post-mortem: Find a Scapegoat",
    "event.exchange_postmortem_blame.desc": "This feels less like finding root cause—and more like finding someone to blame.",
    "event.exchange_postmortem_blame.choice.evidence": "Assemble an evidence trail (self-defense)",
    "event.exchange_postmortem_blame.choice.take_blame": "Take the blame for short-term peace",
    "event.exchange_postmortem_blame.log.evidence.ok": "You used evidence to fight the narrative: no one dared pin it on you this time.",
    "event.exchange_postmortem_blame.log.evidence.fail": "Not prepared enough: you got grilled repeatedly and the room turned hostile.",
    "event.exchange_postmortem_blame.log.take_blame": "You took the blame: the meeting ended quickly, but you know it becomes a habit.",

    "event.scope_creep.title": "Scope Creep",
    "event.scope_creep.desc": "Client: “Can you also take a quick look at another repo? It’s tiny. Just a bit.”",
    "event.scope_creep.choice.boundary": "Set boundaries: extra fee / extend timeline",
    "event.scope_creep.choice.overtime": "Just do it first (overtime)",
    "event.scope_creep.log.boundary": "You nailed down scope and even mentioned a small change fee.",
    "event.scope_creep.log.overtime": "You quietly took the extra work. Something in you sours a little.",

    "event.endorsement.title": "Endorsement-style Audit Request",
    "event.endorsement.desc": "Client wants you to claim: “Fully audited by a top auditor. Absolutely safe.”",
    "event.endorsement.choice.refuse": "Refuse exaggeration (compliance first)",
    "event.endorsement.choice.ambiguous": "Be vague (plant a mine)",
    "event.endorsement.log.refuse": "You insisted on restrained wording: scope and findings only.",
    "event.endorsement.log.ambiguous": "You wrote “basically safe” and received a little extra “thank-you fee.”",

    "event.platform_rejudge.title": "Contest Re-judge Drama",
    "event.platform_rejudge.desc": "Judge: “This High looks more like a Medium.” Do you want to appeal with more evidence?",
    "event.platform_rejudge.choice.appeal": "Add PoC/impact evidence (costs AP)",
    "event.platform_rejudge.choice.move_on": "Forget it—keep hunting",
    "event.platform_rejudge.log.noAp": "You want to appeal, but you're out of AP this week.",
    "event.platform_rejudge.log.win": "Appeal success: judges accepted your additional evidence.",
    "event.platform_rejudge.log.lose": "Appeal failed: judges said “thanks for participating.”",
    "event.platform_rejudge.log.move_on": "You decide to spend time on more certain output.",

    "event.burnout.title": "Burnout Warning",
    "event.burnout.desc": "You’re running on coffee. The code wobbles. The world wobbles too.",
    "event.burnout.choice.rest": "Force a week of rest",
    "event.burnout.choice.push": "Keep pushing (risk ↑)",
    "event.burnout.log.rest": "You paused: progress slowed, but you survived.",
    "event.burnout.log.push": "You pushed through: output may not change, but you got more fragile.",

    "event.bear.title": "Market Cools Off",
    "event.bear.desc": "Bear vibes: clients squeeze price and scope; contests get more crowded.",
    "event.bear.choice.tooling": "Cut costs / improve efficiency (tooling & process)",
    "event.bear.choice.contests": "Grind contests for prize money",
    "event.bear.log.tooling": "You paid for better tooling/process: steadier efficiency.",
    "event.bear.log.contests": "You shift some energy to the contest track.",

    "event.bull.title": "Bull Market Opens",
    "event.bull.desc": "Hot money is back: projects pile up and everyone wants to ship ASAP.",
    "event.bull.choice.raise_price": "Raise price (direct clients)",
    "event.bull.choice.workshop": "Run a public workshop (community)",
    "event.bull.log.raise_price": "You raised your quote—and the client still said “ok.”",
    "event.bull.log.workshop": "You posted multiple educational threads: lots of likes, some energy drained.",

    "event.payment_delay.title": "Payment Delay",
    "event.payment_delay.desc": "Finance: “Process is a bit slow. Next week for sure.”",
    "event.payment_delay.choice.formal": "Send a formal payment reminder (legal/compliance)",
    "event.payment_delay.choice.wait": "Trust once (mindset)",
    "event.payment_delay.log.formal": "You made the process crystal clear: they stopped playing dead.",
    "event.payment_delay.log.wait": "You decided to wait—hoping “delay” won't become a habit.",

    "event.platform_dup_wave.title": "Dedup Tsunami",
    "event.platform_dup_wave.desc": "Platform notice: unusually high duplicates this round; dedup will be stricter.",
    "event.platform_dup_wave.choice.niche": "Pivot to niche modules (strategy)",
    "event.platform_dup_wave.choice.hot": "Keep contesting hot areas (brute force)",
    "event.platform_dup_wave.log.niche": "You changed approach: less speed, more depth.",
    "event.platform_dup_wave.log.hot": "You decided to brute force it: win or lose on this wave.",

    "event.health.title": "Minor Illness",
    "event.health.desc": "Your throat hurts. Your brain feels like 2G loading.",
    "event.health.choice.rest": "Medicine + sleep",
    "event.health.choice.coffee": "Coffee and power through",
    "event.health.log.rest": "You finally treated yourself like a human.",
    "event.health.log.coffee": "Coffee lifts you up—then drops you.",

    "event.exploit_rumor.title": "Rumor of a Miss",
    "event.exploit_rumor.desc": "People whisper: “They audited it and still missed it—can they really audit?” (you got named)",
    "event.exploit_rumor.choice.respond": "Publicly explain (writing + comms)",
    "event.exploit_rumor.choice.ignore": "Ignore (mindset first)",
    "event.exploit_rumor.log.respond.ok": "You explained scope/method/limits clearly; the backlash cooled down.",
    "event.exploit_rumor.log.respond.fail": "Your explanation didn't convince; it attracted more sarcasm.",
    "event.exploit_rumor.log.ignore": "You didn’t reply. Today’s internet isn’t worth it.",

    "event.ambient_ping.title": "A Small Thing",
    "event.ambient_ping.desc": "Nothing major happened, but life always adds small ripples: a message, a misunderstanding, or sudden fatigue.",
    "event.ambient_ping.choice.scroll": "Scroll the timeline and breathe",
    "event.ambient_ping.choice.keep": "Keep working (as if nothing happened)",
    "event.ambient_ping.log.scroll": "You scrolled for a bit: your mindset recovered slightly.",
    "event.ambient_ping.log.keep": "You kept working: small things won't break your rhythm.",

    "event.yh_toxic_guarantee.title": "Your Manager Goes Full PUA",
    "event.yh_toxic_guarantee.desc": "You just joined and already feel the familiar punch: report KPIs, blame games, managing up… they had to hit first.",
    "event.yh_toxic_guarantee.choice.endure": "Endure (keep the job)",
    "event.yh_toxic_guarantee.choice.push_back": "Push back with logic (high risk)",
    "event.yh_toxic_guarantee.log.endure": "You endured: “Roger that” out loud, “oh f***” inside.",
    "event.yh_toxic_guarantee.log.push_back.ok": "You convinced them this time: they stopped chasing you—for now.",
    "event.yh_toxic_guarantee.log.push_back.fail": "You got labeled “hard to manage”: it’s going to get worse.",

    // Major incident (en)
    "log.major.expired": "Major incident window expired: “{title}”. You missed the timeliness premium.",
    "log.major.spawned": "[Major Incident] {title} (window: {weeks} weeks).",
    "major.title.bridge_hack": "Bridge exploit suspected: abnormal fund outflow",
    "major.title.oracle_fail": "Oracle anomaly: cascading liquidations across protocols",
    "major.title.governance_attack": "Governance attack: proposal suspected compromised",
    "major.title.key_leak": "Key leak suspicion: privileged address acted abnormally",
    "msg.major.none": "No major security incident is active right now.",
    "log.major.action.analysis": "Incident analysis: reconstructing the attack path (analysis {pct}%).",
    "log.major.action.tracing": "Fund tracing: labeling addresses and flows (tracing {pct}%).",
    "log.major.action.writeup": "Writing a brief: timeline, impact, mitigations (brief {pct}%).",
    "log.major.postX.early": "You posted too early and got corrected (rep -2, brand -1).",
    "log.major.postX.good": "You posted a major-incident thread: strong response (rep +{repGain}, brand +{brandGain}).",
    "xpost.major.early": "(L) I posted my take on “{title}” too early. New info proved me wrong. Next time: finish the writeup first.",
    "xpost.major.good": "“{title}” brief: timeline / impact / mitigations (window remaining: {weeks} weeks).",

    // AI research (en)
    "xpost.aiResearch.publish": "I ran a small AI-auditing experiment: it catches common patterns, but it's far from replacing human audits. The real question is how to plug it into the workflow.",
    "log.aiResearch.publish": "You published an AI-auditing write-up: good external reception (rep +2, brand +2).",
    "log.aiResearch.productized": "You productized your AI research into a workflow tool (internal adoption +{inc}%).",

    // Negotiation (direct clients)
    "ui.nego.title": "Fee Negotiation",
    "ui.nego.round": "Round {now}/{max}",
    "ui.nego.opening": "Client: Budget is tight. We want to finish in {deadline} weeks, scope ~{scope}. Your quote is {fee}. How do you respond?",
    "ui.nego.terms": "Current terms",
    "ui.nego.meters": "Client meters",
    "ui.nego.base": "Base",
    "ui.nego.term.fee": "Total fee",
    "ui.nego.term.deadline": "Deadline (weeks)",
    "ui.nego.term.deposit": "Deposit",
    "ui.nego.term.scope": "Scope",
    "ui.nego.term.scopeClarity": "Scope clarity",
    "ui.nego.m.patience": "Patience",
    "ui.nego.m.trust": "Trust",
    "ui.nego.m.pressure": "Schedule pressure",
    "ui.nego.tip": "Tip: the longer it drags on, the higher the chance it collapses. Build trust / leverage pressure to improve terms.",
    "ui.nego.movesTitle": "Moves (what they do)",
    "ui.nego.explain.anchor": "Raise the fee (≈+10%), but costs patience/trust. Good for setting a high anchor early.",
    "ui.nego.explain.trade": "Small discount (≈-3%) for higher deposit (≈+5%) and more time (now easier to get +1w). A safer, steady move.",
    "ui.nego.explain.freeze": "Increase scope clarity so future scope creep is less likely; usually improves trust.",
    "ui.nego.explain.wbs": "Break down work + risks to justify pricing (≈+5%); often improves trust but consumes some patience.",
    "ui.nego.explain.walk": "Threaten to walk: may force concessions (pressure↑) or collapse the deal (high risk).",
    "ui.nego.explain.sign": "Accept current terms and start the project (deposit is collected by deposit%).",
    "ui.nego.explain.cancel": "Exit negotiation and walk away.",
    "ui.nego.move.anchor": "Anchor high (raise the number first)",
    "ui.nego.move.trade": "Trade terms (higher deposit / more time)",
    "ui.nego.move.freeze": "Scope freeze (write boundaries)",
    "ui.nego.move.wbs": "Break down work (WBS + risks)",
    "ui.nego.move.walk": "Threaten to walk (risky)",
    "ui.nego.move.sign": "Sign (accept current terms)",
    "ui.nego.move.cancel": "Cancel (walk away)",
    "ui.nego.you.anchor": "You: This is below market. Given scope/risk, we need a realistic fee.",
    "ui.nego.you.trade": "You: Small discount is possible, but we need a higher deposit / realistic timeline to avoid a post-ship mess.",
    "ui.nego.you.freeze": "You: Let's freeze scope boundaries to prevent endless creep.",
    "ui.nego.you.wbs": "You: Here's a work/risk breakdown explaining the fee and schedule.",
    "ui.nego.you.walk": "You: With that budget/schedule, you should find someone else (or reduce scope / extend time).",
    "ui.nego.react.accept": "Client: OK, we can live with that.",
    "ui.nego.react.counter": "Client: We can discuss, but we want to counter / lower the deposit.",
    "ui.nego.react.scopeAdd": "Client: Also, can you take a quick look at this part too? (scope +)",
    "ui.nego.react.stall": "Client: Let me align internally and get back to you.",
    "ui.nego.fail.patience": "Client: Never mind. We'll pause for now (patience hit zero).",
    "ui.nego.fail.trust": "Client: We don't trust this will be handled well. We'll pass.",
    "log.nego.start": "You start negotiating: {title}.",
    "log.nego.cancel": "You walk away from the deal: {title}.",
    "log.nego.fail": "Negotiation collapsed: {title} ({reason}).",
    "log.nego.success": "Deal signed: {title} (fee {fee}, deadline {weeks}w, deposit {depositPct}).",

    "log.week.livingCost": "Weekly living cost: -{amount}.",
    "ui.market.scope": "Scope",
    "ui.market.hype": "Hype",
    "ui.market.riskHint": "Risk hint: hacker attention {v}/100.",
    "ui.market.contestHint": "Tip: more participants → higher dedup collision chance.",
    "ui.bool.yes": "Yes",
    "ui.bool.no": "No",
    "ui.lb.title": "Leaderboards",
    "ui.lb.hint": "Peers are grinding too: updated weekly (roughly matching your pace).",
    "ui.lb.earn": "Earnings",
    "ui.lb.find": "Findings",
    "ui.lb.col.name": "Name",
    "ui.lb.col.week": "This week",
    "ui.lb.col.total": "Total",

    "direct.title": "{client}: {protocol}",
    "direct.notes.rush": "Rush delivery; higher miss risk.",
    "direct.notes.normal": "Normal pace; room for retest and scope management.",
    "direct.notes.dao": "DAO client: pays {perWeek}/week (common for community/open-source driven projects).",

    "platform.title": "{platform}: {protocol} contest",
    "platform.notes.hot": "Hot contest: more collisions and stricter judging.",
    "platform.notes.normal": "Medium hype: depth + writing wins; appeals may work.",

    "job.title.exchange": "Security Engineer (Platform)",
    "job.title.sec": "Auditor / Security Researcher",
    "job.notes.exchange": "Stricter & grindier: external work/public output triggers more compliance/politics events.",
    "job.notes.sec": "More flexible: delivery quality + reputation matter; public research may be rewarded.",

    "msg.offerExpired": "Offer expired.",
    "msg.notEmployed": "You are not employed.",
    "msg.limit.direct": "You can only run up to 2 active direct projects.",
    "msg.limit.platform": "You can only join 1 contest at a time.",
    "msg.apNotEnough": "Not enough AP: need {cost}.",
    "msg.noActiveTarget": "No active project/contest yet. Go accept a job or join a contest first.",
    "msg.submit.onlyPlatform": "Submit is only available for contests.",
    "msg.submit.noDraft": "No draft findings to submit.",
    "msg.company.needTarget": "Pick a company ticket as target first.",
    "msg.company.needEmployment": "You are not employed; no company tickets to work on.",
    "msg.meeting.needEmployment": "Not employed; meetings/reviews won't do much.",
    "log.job.accepted": "You joined {company} (L{level}, salary/wk {salary}).",

    // Logs (core)
    "log.week.newYear": "A new year begins. You survived.",
    "log.week.enter": "Entered {week}. AP restored.",
    "log.salary.received": "Salary received: +{amount}.",
    "log.promo.up": "Promotion: {company} L{from} → L{to} (new salary/wk {salary}).",
    "log.target.switched": "Target switched: {kind} {id}.",
    "log.target.kind.direct": "Direct",
    "log.target.kind.platform": "Contests",
    "log.target.kind.company": "Company",
    "log.accept.direct": "Accepted direct project “{title}”, deposit received {deposit}.",
    "log.accept.platform": "Joined contest “{title}”, {weeks} weeks left.",
    "log.welcome": "Welcome to the Web3 security world. Year 1 · Week 1: your career begins.",
    "log.hours.set.normal": "Set hours to 8h/day: a normal pace.",
    "log.hours.set.overtime": "You chose {h}h/day: higher AP cap, but heavier week-end fatigue.",
    "log.hours.set.chill": "You chose {h}h/day: lower AP cap, but better recovery.",

    // Logs (actions)
    "log.action.rest": "Rested and recovered (stamina +{sta}, mood +{md}).",
    "log.action.learn": "Training: {stat} +{inc}.",
    "log.action.blog": "Posted an update (reputation +{rep}, network +{net}).",
    "log.action.compliance": "Compliance review (compliance risk -{down}).",
    "log.action.write.report": "Worked on report for “{title}” (+{inc}%).",
    "log.action.platform.evidence": "Added repro/evidence for “{title}” (evidence +{inc}).",
    "log.action.platform.submit": "Submitted {n} findings to the platform (into review/dedup).",
    "log.action.comms.direct": "Client comms on “{title}” (cooperation +{up}, fix rate up).",
    "log.action.comms.platform": "Discussed with judges in “{title}” (mood +1 swing).",
    "log.action.coverage.platform.found": "Worked on “{title}”: {action} (coverage +{gain}), produced {n} draft findings ({sev}).",
    "log.action.coverage.platform.none": "Worked on “{title}”: {action} (coverage +{gain}), no meaningful findings yet.",
    "log.action.coverage.direct.found": "Worked on “{title}”: {action} (coverage +{gain}), found {n} vulns ({sev}).",
    "log.action.coverage.direct.none": "Worked on “{title}”: {action} (coverage +{gain}), nothing new yet.",

    "log.direct.delivered": "Delivered direct project “{title}”: report {report}%, coverage {coverage}%, quality {quality}; payout {payout}, reputation {repDelta}.",
    "log.direct.postShipIssue": "Post-ship issue surfaced in “{title}”. You had to write a public explanation and take the blame.",
    "log.direct.delayedNeedReport": "Direct “{title}”: client insisted “finish the report before delivery”, deadline extended by 1 week (report {report}%).",

    "log.companyTicket.missedDeadline": "Company ticket slipped: “{title}” missed its deadline. You had to explain yourself in the group chat.",

    "log.contest.noSubmitNote": "(no submit = no judging)",
    "log.contest.settled": "Contest settled “{title}”: submitted {submitted}, accepted {acceptedPts} pts, dup {duplicated}, rejected {rejected}; payout {payout}, platform rating {ratingDelta}. {note}",

    "log.action.company.progress": "Worked on company ticket “{title}” (progress +{inc}%).",
    "log.action.company.done": "Company ticket completed: {title} (performance +{perf}).",
    "log.action.meeting": "Attended a review meeting: reduced uncertainty (small trust/performance gain).",
    "log.action.aiResearch.warn": "AI research (+{inc}%): hot in the industry, but internally people think you're slacking.",
    "log.action.aiResearch.good": "AI research (+{inc}%): your external brand is compounding.",

    "log.job.quit": "You quit {company}: freedom returns, but cash flow gets swingy.",

    "ui.career.major.windowLine": "Window: {weeks} {wk}｜Analysis {analysis}%｜Trace {tracing}%｜Brief {writeup}%｜X {x}%",
    "ui.career.ticket.line": "Progress: {progress}% ｜ Impact: {impact}/100",
    "ui.marketCard.direct.rush": "Rush",
    "ui.marketCard.direct.coop": "Coop",
    "ui.marketCard.active.report": "Report",
    "ui.marketCard.active.findings": "Findings",
    "ui.marketCard.active.fixRate": "Fix rate",
    "ui.marketCard.active.shipUrgency": "Ship urgency",
    "ui.marketCard.active.draft": "Draft",
    "ui.marketCard.active.submitted": "Submitted",
    "ui.marketCard.active.evidence": "Evidence",
    "ui.active.direct.summary": "{report} {reportPct}%｜{findings} {found} {entry}｜{fixRate} {fixRatePct}%｜{shipUrgency} {shipUrgencyPct}%",
    "ui.active.platform.summary": "{draft} {draftN} {entry}｜{submitted} {submittedN} {entry}｜{evidence} {evidencePct}%",
    "ui.help.title": "Help (MVP)",
    "ui.help.goalTitle": "Goal",
    "ui.help.goalBody": "Progress weekly and balance cash flow, reputation, stamina/mood, and compliance risk.",
    "ui.help.directTitle": "Direct",
    "ui.help.directBody": "Focus on comms + report quality. Stable pay, but scope creep is real.",
    "ui.help.platformTitle": "Contests",
    "ui.help.platformBody": "Speed + depth. Rewards depend on dedup/judging, but boosts platform rating.",
    "ui.help.endWeekTitle": "End Week",
    "ui.help.endWeekBody": "Settles work, triggers events, refreshes market, and restores AP (based on your state).",
    "ui.help.disclaimer": "Disclaimer: fictional. Not security/investment advice. Platform rules are abstracted.",
    "player.title.freelance": "Independent Security Practitioner",
    "player.name.default": "Alex Auditor",
    "company.ticketType.design_review": "Design Review",
    "company.ticketType.pr_review": "PR Review",
    "company.ticketType.monitoring": "Monitoring",
    "company.ticketType.incident": "Incident Response",
    "company.ticketType.training": "Security Training",
    "company.ticketType.compliance": "Compliance",
    "company.ticketType.security_tooling": "Security Tooling",
    "project.company.title": "Company Ticket: {type} (scope {scope})",
    "ui.auto.title": "Automation",
    "ui.auto.enabled": "Enable automation (one step every 2s)",
    "ui.auto.focus": "Focus:",
    "ui.auto.focus.balanced": "Balanced",
    "ui.auto.focus.survival": "Survival first (rest)",
    "ui.auto.focus.direct": "Direct clients",
    "ui.auto.focus.platform": "Contests",
    "ui.auto.focus.company": "Company tickets",
    "ui.auto.focus.incident": "Major incidents",
    "ui.auto.focus.research": "Research",
    "ui.auto.allowAcceptJob": "Allow auto-accept job",
    "ui.auto.allowQuitJob": "Allow auto-quit job",
    "ui.auto.autoEndWeek": "Auto end week when AP is low",
    "ui.auto.minStaminaPct": "Min stamina threshold (%)",
    "ui.auto.minMoodPct": "Min mood threshold (%)",

    "stat.stamina": "Stamina",
    "stat.mood": "Mood",
    "stat.skill": "Audit Skill",
    "stat.tooling": "Tooling",
    "stat.writing": "Writing",
    "stat.comms": "Comms",
    "stat.reputation": "Reputation",
    "stat.brand": "Brand",
    "stat.platformRating": "Platform Rating",
    "stat.compliance": "Compliance Risk",
    "stat.cash": "Cash",
    "stat.network": "Network",

    "action.audit.name": "Audit code",
    "action.audit.label": "🧪 Audit code",
    "action.audit.hint": "Coverage↑, chance to find vulns; simpler scopes are cheaper & faster",
    "action.model.name": "Model / Reason",
    "action.model.label": "🧠 Model / Reason",
    "action.model.hint": "Better odds for high severity; complex scopes cost more",
    "action.write.name": "Write / Triage",
    "action.write.label": "📝 Write / Triage",
    "action.write.hint": "Fewer findings + smaller scope = faster; big backlog = slower & costlier",
    "action.retest.name": "Retest",
    "action.retest.label": "🔁 Retest",
    "action.retest.hint": "Reduce post-ship blowups (complex scopes need more follow-up)",
    "action.comms.name": "Scope / Comms",
    "action.comms.label": "📞 Scope / Comms",
    "action.comms.hint": "Direct clients: cooperation↑, fix rate↑",
    "action.submit.name": "Submit findings",
    "action.submit.label": "📮 Submit findings",
    "action.submit.hint": "Contests: move drafts into review/dup pool (no submit = no payout)",
    "action.companyWork.name": "Work on ticket",
    "action.companyWork.label": "🏢 Work on ticket",
    "action.companyWork.hint": "Employment: push tickets, build performance (or feed vanity KPIs)",
    "action.meeting.name": "Meetings / Reviews",
    "action.meeting.label": "🗓️ Meetings / Reviews",
    "action.meeting.hint": "Align teams, reduce incident risk (costs mood)",
    "action.aiResearch.name": "AI auditing research",
    "action.aiResearch.label": "🤖 AI auditing research",
    "action.aiResearch.hint": "External brand↑; internal credit may be low (esp. exchanges)",
    "action.productizeAI.name": "Productize research",
    "action.productizeAI.label": "🧰 Productize research",
    "action.productizeAI.hint": "Turn research into tools/process: internal performance↑, defense posture↑",
    "action.incidentAnalysis.name": "Incident analysis",
    "action.incidentAnalysis.label": "🧯 Incident analysis",
    "action.incidentAnalysis.hint": "Major incident: reconstruct the attack (time window)",
    "action.fundTrace.name": "Fund tracing",
    "action.fundTrace.label": "🧵 Fund tracing",
    "action.fundTrace.hint": "Major incident: trace flows (credibility↑)",
    "action.writeBrief.name": "Write brief",
    "action.writeBrief.label": "📝 Write brief",
    "action.writeBrief.hint": "Major incident: fast + solid writeup boosts brand & internal credit",
    "action.postX.name": "Post thread",
    "action.postX.label": "𝕏 Post thread",
    "action.postX.hint": "Major incident: post within the window for max impact; too early gets you dunked",
    "action.blog.name": "Post update",
    "action.blog.label": "📣 Post update",
    "action.blog.hint": "Reputation↑, network↑ (may attract drama)",
    "action.learn.name": "Learn",
    "action.learn.label": "📚 Learn",
    "action.learn.hint": "Small random stat growth",
    "action.rest.name": "Rest",
    "action.rest.label": "💆 Rest",
    "action.rest.hint": "Recover stamina/mood",
    "action.compliance.name": "Compliance",
    "action.compliance.label": "⚖️ Compliance",
    "action.compliance.hint": "Reduce compliance risk (no money now)",

    "modal.toast.title": "Notice",
    "modal.toast.ok": "OK",
    "modal.endWeek.title": "End Week",
    "modal.endWeek.body": "End the week? Projects settle, events may trigger, and the next week begins.",
    "modal.common.cancel": "Cancel",
    "modal.common.confirm": "Confirm",
    "modal.reset.title": "Reset Save",
    "modal.reset.body": "Danger: this deletes your local save and restarts.",
    "modal.reset.confirm": "Delete & Restart",
    "modal.new.title": "New Save",
    "modal.new.body": "Create a new save (the old one stays unless you Reset).",
    "modal.new.confirm": "Create",
    "toast.saved": "Saved to localStorage.",

    "chip.exchange": "Exchange",
    "chip.sec": "Security Firm",
    "chip.direct": "Direct",
    "chip.platform": "Contest",
    "chip.company": "Company",
    "ui.unit.week": "wk",
    "ui.unit.entry": "entries",
    "ui.unit.point": "pts",

    "ui.project.coverage": "Coverage:",
    "ui.project.report": "Report:",
    "ui.project.fixRate": "Fix rate:",
    "ui.project.shipUrgency": "Ship urgency:",
    "ui.project.retest": "Retest:",
    "ui.project.draft": "Draft:",
    "ui.project.submitted": "Submitted:",
    "ui.project.evidence": "Evidence:",
    "ui.project.progress": "Progress:",
    "ui.project.impact": "Impact:",
    "ui.project.risk": "Risk:",

    "protocol.erc20": "ERC20 / Tokenomics",
    "protocol.dex": "AMM / DEX",
    "protocol.lending": "Lending",
    "protocol.bridge": "Bridge",
    "protocol.perp": "Derivatives / Perps",
    "protocol.aa": "Account Abstraction / Wallet",
    "protocol.rollup": "Rollup / L2 System",

    "platform.sherlock": "Sherlock (abstracted)",
    "platform.code4rena": "Code4rena (abstracted)",
    "platform.cantina": "Cantina (abstracted)",

    // Company names (en)
    "company.cantina.name": "Cantina",
    "company.web3dao.name": "the web3 dao",
    "company.spearbit.name": "Spearbit",
    "company.hashlock.name": "Hashlock",
    "company.certik.name": "CertiK (abstracted)",
    "company.yubit.name": "Yubit",
    "company.binance.name": "Binance (abstracted)",
    "company.yh.name": "YH (abstracted)",

    "client.1": "A DeFi startup team",
    "client.2": "A VC portfolio project",
    "client.3": "An exchange-incubated project",
    "client.4": "A legacy Web2 team going Web3",
    "client.5": "A mysterious, well-funded project",
    "client.6": "A 'trusted' referral from a friend",
    "client.web3dao": "the web3 dao",

    "x.memes": [
      "GM. No new attack surface today (just kidding).",
      "\"It's a tiny change.\" Then scope goes from 2 repos to 9 repos.",
      "The moment I see `delegatecall`: I'm wide awake.",
      "PoC works locally; mainnet says: nope.",
      "Report at 90%... then you realize there's a core branch you never looked at.",
      "Bridge again? Which bridge are we talking about?",
      "Client: can you say \"absolutely secure\"? Me: can you not.",
      "C4: you found it first. Also submitted 17th. (duplicated)",
      "Sherlock: needs more evidence. (you: I literally linked the tx hash...)",
      "Cantina: in-scope. out-of-scope. in-scope. out-of-scope. (loop)",
      "Found a critical: mood +10; realizing you must write a PoC: mood -12.",
      "\"Gas optimization\" turned everything into `unchecked`: I'm sweating.",
      "\"Only owner can call it\" — owner is a reentrant contract.",
      "You think it's reentrancy; it's rounding. You think it's rounding; it's reentrancy.",
      "Auditor life: write PoCs, write reports, write explanations, write apologies (hopefully not).",
      "Replacing `require(x)` with `if (!x) return;`: safety -100.",
    ],
  },
};

export function getLang(state) {
  const l = state?.settings?.lang;
  return l === "en" ? "en" : "zh";
}

export function setLang(state, lang) {
  if (!state.settings) state.settings = {};
  const prev = state.settings.lang === "en" ? "en" : "zh";
  const next = lang === "en" ? "en" : "zh";
  state.settings.lang = next;

  // 让“默认档”的 profile/title 能跟随语言切换（避免残留中文）
  if (state.player) {
    const zhTitle = DICT.zh["player.title.freelance"];
    const enTitle = DICT.en["player.title.freelance"];
    if (state.player.title === zhTitle && next === "en") state.player.title = enTitle;
    if (state.player.title === enTitle && next === "zh") state.player.title = zhTitle;

    const zhName = DICT.zh["player.name.default"];
    const enName = DICT.en["player.name.default"];
    if (state.player.name === zhName && next === "en") state.player.name = enName;
    if (state.player.name === enName && next === "zh") state.player.name = zhName;
  }

  // 公司任务：标题可由 ticketType 派生，切语言时重算，避免残留中文
  const relabelCompany = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const tk of arr) {
      if (!tk || tk.kind !== "company") continue;
      const tt = tk.ticketType;
      const scope = tk.scope ?? 0;
      if (tt) tk.title = t(state, "project.company.title", { type: t(state, `company.ticketType.${tt}`), scope });
    }
  };
  relabelCompany(state?.active?.company);

  // 直客/平台/offer：切语言时重算 title/notes（解决“从中文切到 EN 仍是中文”）
  const inferClientKey = (s) => {
    if (!s) return null;
    {
      const zh = DICT.zh["client.web3dao"];
      const en = DICT.en["client.web3dao"];
      if ((zh && s.includes(zh)) || (en && s.includes(en))) return "web3dao";
    }
    for (let i = 1; i <= 6; i++) {
      const zh = DICT.zh[`client.${i}`];
      const en = DICT.en[`client.${i}`];
      if ((zh && s.includes(zh)) || (en && s.includes(en))) return i;
    }
    return null;
  };
  const inferPlatformKey = (s) => {
    const keys = ["sherlock", "code4rena", "cantina"];
    if (!s) return null;
    for (const k of keys) {
      const zh = DICT.zh[`platform.${k}`];
      const en = DICT.en[`platform.${k}`];
      if (s === zh || s === en || (zh && s.includes(zh)) || (en && s.includes(en))) return k;
    }
    return null;
  };
  const relabelDirect = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const o of arr) {
      if (!o || o.kind !== "direct") continue;
      if (!o.clientKey) o.clientKey = inferClientKey(o.title) ?? 1;
      o.title = t(state, "direct.title", { client: t(state, `client.${o.clientKey}`), protocol: t(state, `protocol.${o.protocol}`) });
      o.notes =
        o.clientKey === "web3dao"
          ? t(state, "direct.notes.dao", { perWeek: "¥700" })
          : t(state, (o.deadlineWeeks ?? 99) <= 2 ? "direct.notes.rush" : "direct.notes.normal");
    }
  };
  const relabelPlatform = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const o of arr) {
      if (!o || o.kind !== "platform") continue;
      if (!o.platformKey) o.platformKey = inferPlatformKey(o.platform || o.title) ?? "sherlock";
      o.platform = t(state, `platform.${o.platformKey}`);
      o.title = t(state, "platform.title", { platform: o.platform, protocol: t(state, `protocol.${o.protocol}`) });
      o.notes = t(state, (o.popularity ?? 0) >= 75 ? "platform.notes.hot" : "platform.notes.normal");
    }
  };
  const relabelJobs = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const o of arr) {
      if (!o || o.kind !== "job") continue;
      if (o.companyKey) o.companyName = t(state, `company.${o.companyKey}.name`);
      o.title = t(state, o.companyType === "exchange" ? "job.title.exchange" : "job.title.sec");
      o.notes = t(state, o.companyType === "exchange" ? "job.notes.exchange" : "job.notes.sec");
    }
  };
  relabelDirect(state?.market?.direct);
  relabelPlatform(state?.market?.platform);
  relabelJobs(state?.market?.jobs);
  relabelDirect(state?.active?.direct);
  relabelPlatform(state?.active?.platform);

  if (state?.employment?.companyKey) state.employment.companyName = t(state, `company.${state.employment.companyKey}.name`);
}

export function t(state, key, vars) {
  const lang = getLang(state);
  const pack = DICT[lang] || DICT.zh;
  const base = pack[key] ?? DICT.zh[key] ?? key;
  if (Array.isArray(base)) return base;
  const s = String(base);
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined ? `{${k}}` : String(vars[k])));
}

// DOM: 用 data-i18n 标记静态节点
export function applyI18nDom(state, root = document) {
  const nodes = root.querySelectorAll("[data-i18n]");
  for (const el of nodes) {
    const key = el.getAttribute("data-i18n");
    if (!key) continue;
    el.textContent = t(state, key);
  }
  const ariaLabels = root.querySelectorAll("[data-i18n-aria-label]");
  for (const el of ariaLabels) {
    const key = el.getAttribute("data-i18n-aria-label");
    if (!key) continue;
    el.setAttribute("aria-label", t(state, key));
  }
  const titles = root.querySelectorAll("[data-i18n-title]");
  for (const el of titles) {
    const key = el.getAttribute("data-i18n-title");
    if (!key) continue;
    el.setAttribute("title", t(state, key));
  }
}

export function getXMemes(state) {
  const list = t(state, "x.memes");
  return Array.isArray(list) ? list : [];
}

export function pickClientName(state) {
  const i = clamp(Math.floor(Math.random() * 6) + 1, 1, 6);
  return t(state, `client.${i}`);
}

export function pickPlatformName(state) {
  const keys = ["sherlock", "code4rena", "cantina"];
  const k = keys[Math.floor(Math.random() * keys.length)];
  return t(state, `platform.${k}`);
}

