import { clamp, ri } from "./utils.js?v=63";

export function defaultState() {
  const s = {
    version: 1,
    settings: {
      seasonWeeks: 52,
      layout: {
        colLeft: 420,
      },
    },
    now: { year: 2017, week: 1, day: 1 },
    time: { paused: true, speed: 1, elapsedHours: 0, lastTs: 0, resumeAfterStageModal: false },
    player: {
      name: "马某某·Builder",
      title: "Web3 项目开发大亨（从零开荒）",
    },
    company: {
      name: "独立 Builder 工作室",
      level: 1,
    },
    resources: {
      cash: 1000000,
      reputation: 10,
      community: 8,
      techPoints: 12,
      network: 10,
      securityRisk: 8,
      complianceRisk: 6,
      fans: 0,
    },
    market: {
      projects: [],
      hires: [],
    },
    active: {
      // in-development projects
      projects: [],
      // live products
      products: [],
    },
    team: {
      members: [
        {
          id: "m_you",
          name: "你",
          role: "founder",
          salaryWeekly: 0,
          skills: {
            product: 55,
            design: 35,
            protocol: 55,
            contract: 55,
            infra: 40,
            security: 45,
            growth: 35,
            compliance: 20,
          },
        },
      ],
    },
    selectedTarget: null,
    stageQueue: [],
    log: [],
    inbox: {
      // 每周刷新的“可选事件列表”：用户可以点开看、处理或忽略；不处理也不会卡住流程
      // items: { id, def, created:{year,week}, expiresInWeeks, payload? }
      items: [],
    },
    flags: {
      tutorialShown: false,
      startFilled: false,
      gameOver: null,
      // crisis cooldowns (avoid chain-trigger modals)
      securityCrisisNextAtDay: 0,
      complianceCrisisNextAtDay: 0,
    },
    progress: { totalWeeks: 0, earnedTotal: 0 },
    history: {
      // 已研发/交付的项目（含二次开发）
      projectsDone: [],
    },
    engine: {
      dev: { version: 1, slots: 1, modules: [] },
      sec: { version: 1, slots: 1, modules: [] },
      infra: { version: 1, slots: 1, modules: [] },
      eco: { version: 1, slots: 1, modules: [] },
    },
    research: {
      unlocked: [],
      task: null, // { kind?, nodeId?, engineKey, targetVersion, hoursTotal, hoursDone, assigneeId, costTech? }
    },
    ops: {
      // 全局默认运营策略（可按产品覆盖/继承）
      buybackPct: 0.0, // 0~0.5
      emissions: 0.0, // 0~1
      incentivesBudgetWeekly: 0, // ¥
      marketingBudgetWeekly: 0, // ¥（获客/投放）
      securityBudgetWeekly: 0, // ¥（安全/审计/赏金）
      infraBudgetWeekly: 0, // ¥（扩容/稳定性/性能）
      complianceBudgetWeekly: 0, // ¥（合规/法务）
      referralPct: 0.0, // 0~0.3（推荐返佣强度，按收入抽成）
      supportBudgetWeekly: 0, // ¥（客服/运营支持）
    },
    ui: {
      ratingQueue: [],
      // 科研树平移位置（scroll container）
      researchGraphScroll: { left: 0, top: 0 },
    },
    knowledge: {
      // “泽娜”提供的已知搭配：按 archetype 解锁（需要在科研里做复盘任务）
      zenaKnownArchetypes: [],
      // 已经做过“泽娜复盘”的具体产品（同一个产品不允许重复复盘）
      postmortemedProductIds: [],
    },
  };
  return s;
}

/** 老存档兼容：补齐字段 + clamp */
export function normalizeState(state) {
  if (!state || typeof state !== "object") state = defaultState();
  if (!state.settings) state.settings = {};
  if (typeof state.settings.seasonWeeks !== "number") state.settings.seasonWeeks = 52;
  // 只允许 UI 提供的档位（避免旧存档/手改导致奇怪体验）
  const sw = clamp(Math.round(state.settings.seasonWeeks), 8, 5200);
  state.settings.seasonWeeks = [12, 24, 36, 52].includes(sw) ? sw : 52;

  // layout settings (resizable panels)
  if (!state.settings.layout || typeof state.settings.layout !== "object") state.settings.layout = { colLeft: 420 };
  if (typeof state.settings.layout.colLeft !== "number") state.settings.layout.colLeft = 420;
  state.settings.layout.colLeft = clamp(Math.round(state.settings.layout.colLeft), 260, 560);

  if (!state.player) state.player = { name: "马某某·Builder", title: "Web3 项目开发大亨（从零开荒）" };
  if (!state.flags) state.flags = { tutorialShown: false, startFilled: false, gameOver: null, securityCrisisNextAtDay: 0, complianceCrisisNextAtDay: 0 };
  if (!state.time) state.time = { paused: true, speed: 1, elapsedHours: 0, lastTs: 0, resumeAfterStageModal: false };
  if (typeof state.time.paused !== "boolean") state.time.paused = true;
  if (typeof state.time.speed !== "number") state.time.speed = 1;
  if (typeof state.time.elapsedHours !== "number") state.time.elapsedHours = 0;
  if (typeof state.time.lastTs !== "number") state.time.lastTs = 0;
  if (typeof state.time.resumeAfterStageModal !== "boolean") state.time.resumeAfterStageModal = false;
  // 允许更快的时间档位（UI 提供到 x8）
  state.time.speed = clamp(state.time.speed, 0.5, 8);
  state.time.elapsedHours = clamp(state.time.elapsedHours, 0, 9999999);
  if (typeof state.flags.startFilled !== "boolean") state.flags.startFilled = false;
  if (typeof state.flags.securityCrisisNextAtDay !== "number") state.flags.securityCrisisNextAtDay = 0;
  state.flags.securityCrisisNextAtDay = clamp(Math.round(state.flags.securityCrisisNextAtDay), 0, 9999999);
  if (typeof state.flags.complianceCrisisNextAtDay !== "number") state.flags.complianceCrisisNextAtDay = 0;
  state.flags.complianceCrisisNextAtDay = clamp(Math.round(state.flags.complianceCrisisNextAtDay), 0, 9999999);

  if (!Array.isArray(state.stageQueue)) state.stageQueue = [];
  state.stageQueue = state.stageQueue
    .filter((x) => x && typeof x.kind === "string" && typeof x.id === "string")
    .slice(0, 30);

  if (!state.now) state.now = { year: 2017, week: 1, day: 1 };
  if (typeof state.now.year !== "number") state.now.year = 2017;
  if (typeof state.now.week !== "number") state.now.week = 1;
  if (typeof state.now.day !== "number") state.now.day = 1;
  state.now.week = clamp(Math.round(state.now.week), 1, 52);
  state.now.day = clamp(Math.round(state.now.day), 1, 7);
  if (typeof state.now.dateISO !== "string") state.now.dateISO = "2017-01-01";

  if (!state.company) state.company = { name: "独立 Builder 工作室", level: 1 };
  if (typeof state.company.name !== "string") state.company.name = "独立 Builder 工作室";
  if (typeof state.company.level !== "number") state.company.level = 1;
  state.company.level = clamp(Math.round(state.company.level), 1, 10);

  if (!state.resources) {
    state.resources = { cash: 1000000, reputation: 10, community: 8, techPoints: 12, network: 10, securityRisk: 8, complianceRisk: 6, fans: 0 };
  }
  const r = state.resources;
  for (const k of ["cash", "reputation", "community", "techPoints", "network", "securityRisk", "complianceRisk", "fans"]) {
    if (typeof r[k] !== "number") r[k] = 0;
  }
  r.cash = clamp(Math.round(r.cash), -999999999, 999999999);
  r.reputation = clamp(Math.round(r.reputation), 0, 100);
  r.community = clamp(Math.round(r.community), 0, 100);
  r.techPoints = clamp(Math.round(r.techPoints), 0, 999999);
  r.network = clamp(Math.round(r.network), 0, 100);
  r.securityRisk = clamp(Math.round(r.securityRisk), 0, 100);
  r.complianceRisk = clamp(Math.round(r.complianceRisk), 0, 100);
  r.fans = clamp(Math.round(r.fans), 0, 999999999);

  if (!state.market) state.market = { projects: [], hires: [] };
  if (!Array.isArray(state.market.projects)) state.market.projects = [];
  if (!Array.isArray(state.market.hires)) state.market.hires = [];

  if (!state.active) state.active = { projects: [], products: [] };
  if (!Array.isArray(state.active.projects)) state.active.projects = [];
  if (!Array.isArray(state.active.products)) state.active.products = [];

  if (!state.team) state.team = defaultState().team;
  if (!Array.isArray(state.team.members)) state.team.members = defaultState().team.members;
  // ensure perks exist for old saves
  for (const m of state.team.members) {
    if (!m || typeof m !== "object") continue;
    if (!("perk" in m)) m.perk = null;
  }

  if (!state.engine) state.engine = defaultState().engine;
  if (!state.research) state.research = { unlocked: [] };
  if (!Array.isArray(state.research.unlocked)) state.research.unlocked = [];
  if (!("task" in state.research)) state.research.task = null;
  if (state.research.task && typeof state.research.task !== "object") state.research.task = null;
  if (!state.ops) state.ops = defaultState().ops;
  // ops defaults & clamp
  const ops = state.ops;
  if (typeof ops.buybackPct !== "number") ops.buybackPct = 0;
  if (typeof ops.emissions !== "number") ops.emissions = 0;
  if (typeof ops.incentivesBudgetWeekly !== "number") ops.incentivesBudgetWeekly = 0;
  if (typeof ops.marketingBudgetWeekly !== "number") ops.marketingBudgetWeekly = 0;
  if (typeof ops.securityBudgetWeekly !== "number") ops.securityBudgetWeekly = 0;
  if (typeof ops.infraBudgetWeekly !== "number") ops.infraBudgetWeekly = 0;
  if (typeof ops.complianceBudgetWeekly !== "number") ops.complianceBudgetWeekly = 0;
  if (typeof ops.referralPct !== "number") ops.referralPct = 0;
  if (typeof ops.supportBudgetWeekly !== "number") ops.supportBudgetWeekly = 0;

  ops.buybackPct = clamp(Number(ops.buybackPct) || 0, 0, 0.5);
  ops.emissions = clamp(Number(ops.emissions) || 0, 0, 1);
  ops.referralPct = clamp(Number(ops.referralPct) || 0, 0, 0.3);
  for (const k of ["incentivesBudgetWeekly", "marketingBudgetWeekly", "securityBudgetWeekly", "infraBudgetWeekly", "complianceBudgetWeekly", "supportBudgetWeekly"]) {
    ops[k] = clamp(Math.round(Number(ops[k]) || 0), 0, 999999999);
  }

  // ui queues (modal queue, etc.)
  if (!state.ui || typeof state.ui !== "object") state.ui = { ratingQueue: [] };
  if (!Array.isArray(state.ui.ratingQueue)) state.ui.ratingQueue = [];
  state.ui.ratingQueue = state.ui.ratingQueue
    .filter((x) => x && typeof x === "object")
    .slice(0, 30);

  // research graph scroll (drag-to-pan)
  if (!state.ui.researchGraphScroll || typeof state.ui.researchGraphScroll !== "object") state.ui.researchGraphScroll = { left: 0, top: 0 };
  if (typeof state.ui.researchGraphScroll.left !== "number") state.ui.researchGraphScroll.left = 0;
  if (typeof state.ui.researchGraphScroll.top !== "number") state.ui.researchGraphScroll.top = 0;
  state.ui.researchGraphScroll.left = clamp(Math.round(state.ui.researchGraphScroll.left), 0, 999999);
  state.ui.researchGraphScroll.top = clamp(Math.round(state.ui.researchGraphScroll.top), 0, 999999);

  if (!state.knowledge || typeof state.knowledge !== "object") state.knowledge = { zenaKnownArchetypes: [], postmortemedProductIds: [] };
  if (!Array.isArray(state.knowledge.zenaKnownArchetypes)) state.knowledge.zenaKnownArchetypes = [];
  state.knowledge.zenaKnownArchetypes = state.knowledge.zenaKnownArchetypes
    .map((x) => String(x || ""))
    .filter(Boolean)
    .slice(0, 30);

  if (!Array.isArray(state.knowledge.postmortemedProductIds)) state.knowledge.postmortemedProductIds = [];
  state.knowledge.postmortemedProductIds = state.knowledge.postmortemedProductIds
    .map((x) => String(x || ""))
    .filter(Boolean)
    .slice(0, 200);

  // inbox（可选事件列表）
  if (!state.inbox) state.inbox = { items: [] };
  if (!Array.isArray(state.inbox.items)) state.inbox.items = [];
  // 清理无效项 & clamp
  state.inbox.items = state.inbox.items
    .filter((it) => it && typeof it.id === "string" && typeof it.def === "string")
    .map((it) => {
      if (!it.created || typeof it.created.year !== "number" || typeof it.created.week !== "number") it.created = { ...(state.now || { year: 1, week: 1 }) };
      it.created.year = clamp(Math.round(it.created.year), 0, 9999);
      it.created.week = clamp(Math.round(it.created.week), 1, 52);
      if (typeof it.expiresInWeeks !== "number") it.expiresInWeeks = 2;
      it.expiresInWeeks = clamp(Math.round(it.expiresInWeeks), 1, 8);
      if (typeof it.payload !== "object" || !it.payload) it.payload = {};
      return it;
    })
    .slice(0, 30);

  // shop/items
  if (!state.shop) state.shop = { owned: {} };
  if (!state.shop.owned || typeof state.shop.owned !== "object") state.shop.owned = {};

  // progress / leaderboards
  if (!state.progress) state.progress = { totalWeeks: 0, earnedTotal: 0 };
  if (typeof state.progress.totalWeeks !== "number") state.progress.totalWeeks = 0;
  if (typeof state.progress.earnedTotal !== "number") state.progress.earnedTotal = 0;
  state.progress.earnedTotal = clamp(Math.round(state.progress.earnedTotal), 0, 999999999);

  if (!state.history || typeof state.history !== "object") state.history = { projectsDone: [] };
  if (!Array.isArray(state.history.projectsDone)) state.history.projectsDone = [];
  state.history.projectsDone = state.history.projectsDone
    .filter((x) => x && typeof x === "object")
    .slice(0, 200);

  return state;
}

export function weekLabel(state) {
  const y = state?.now?.year ?? 0;
  const w = state?.now?.week ?? 0;
  const d = state?.now?.day ?? 0;
  const dayPart = typeof d === "number" && d > 0 ? ` · 第 ${d} 天` : "";
  const iso = state?.now?.dateISO ? ` · ${state.now.dateISO}` : "";
  return `第 ${y} 年 · 第 ${w} 周${dayPart}${iso}`;
}

export function log(state, text, tone = "info") {
  state.log.unshift({
    id: `log_${Date.now()}_${ri(1000, 9999)}`,
    t: weekLabel(state),
    tone,
    text,
  });
  state.log = state.log.slice(0, 120);
}

export function adjustAfterAction(state, delta) {
  const keys = Object.keys(delta);
  for (const k of keys) {
    if (!state.resources) continue;
    if (!(k in state.resources)) continue;
    const max = resourceCap(k);
    state.resources[k] = clamp(state.resources[k] + delta[k], 0, max);
  }
}

export function resourceCap(key) {
  if (key === "cash") return 999999999;
  if (key === "techPoints") return 999999;
  return 100;
}

export function clampPct(n) {
  return clamp(Math.round(n), 0, 100);
}

