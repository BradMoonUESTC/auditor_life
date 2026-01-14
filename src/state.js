import { clamp, ri } from "./utils.js?v=35";
import { setLang, t } from "./i18n.js?v=35";

export function defaultState() {
  const s = {
    version: 1,
    settings: {
      lang: "en",
      healthCap: 150, // 精力/心态上限（血更厚）
      auto: {
        enabled: false,
        focus: "balanced", // balanced|direct|platform|company|incident|research|survival
        allowQuitJob: false,
        allowAcceptJob: false,
        autoEndWeek: true,
        stepMs: 2000,
        minStaminaPct: 35,
        minMoodPct: 30,
      },
    },
    now: { year: 1, week: 1 },
    player: {
      name: "马某某·审计师",
      title: "自由审计师（从零开荒）", // 默认中文；切换到英文时会由 setLang 自动替换为英文版默认 title
    },
    stats: {
      skill: 38,
      comms: 36,
      writing: 33,
      tooling: 30,
      stamina: 105,
      mood: 105,
      cash: 100000,
      reputation: 12,
      brand: 8,
      compliance: 6,
      network: 18,
      platformRating: 8,
    },
    // 现实生活：本周工时（影响行动点上限）
    schedule: { hoursPerDay: 8, locked: false },
    ap: { max: 0, now: 0 },
    market: { direct: [], platform: [], jobs: [] },
    active: { direct: [], platform: [], company: [] },
    selectedTarget: null,
    log: [],
    x: {
      // X（推特）时间线：纯文案氛围，不影响数值（后续可拓展为事件/舆情系统）
      feed: [],
    },
    employment: {
      employed: false,
      companyKey: null,
      companyName: null,
      companyType: null, // 'exchange'|'sec'
      workMode: "remote", // 'remote'|'onsite'
      level: 1,
      salaryWeekly: 0,
      weeksEmployed: 0, // 入职后已过周数（用于 YH 事件保底等）
      yhToxicTriggered: false, // YH（抽象）恶心事件：入职后 3 周必触发一次的标记
      promoProgress: 0, // 晋升进度：每周累积（基础 + 声望/平台评级加成），达到阈值自动升职
      performance: 50,
      trust: 50,
      politics: 20,
      manager: { archetype: "normal", toxicity: 15 },
      vanityKpi: { mode: "none", intensity: 0 }, // 'none'|'loc'|'refactor'
    },
    negotiation: null, // { kind:'direct', ... } 临时谈判状态（弹窗流程）
    conflict: { risk: 0, flags: { disclosed: false, approved: false } },
    posture: { monitoring: 10, tests: 10, runbooks: 10 },
    research: { topics: ["ai_audit"], progress: { aiAudit: 0 }, internalAdoption: { aiAudit: 0 }, published: { aiAudit: 0 } },
    majorIncident: null,
    world: { majorIncidentCooldown: 0, eventPityWeeks: 0 },
    flags: {
      tutorialShown: false,
      startFilled: false,
      gameOver: null,
    },
    progress: {
      noOrderWeeks: 0,
      totalWeeks: 0,
      earnedTotal: 0, // 累计“进账”（不含生活费/租房等支出）
      findingsTotal: 0, // 累计发现的 findings 数量
    },
    leaderboards: {
      // 每周会滚动更新的“同行榜”
      playerPrev: { earnedTotal: 0, findingsTotal: 0 },
      playerWeek: { earnedWeek: 0, findingsWeek: 0 },
      npcs: [
        { name: "bradmoon", earnedTotal: 0, findingsTotal: 0, earnedWeek: 0, findingsWeek: 0 },
        { name: "ret2basic", earnedTotal: 0, findingsTotal: 0, earnedWeek: 0, findingsWeek: 0 },
        { name: "pashov", earnedTotal: 0, findingsTotal: 0, earnedWeek: 0, findingsWeek: 0 },
        { name: "sahuang", earnedTotal: 0, findingsTotal: 0, earnedWeek: 0, findingsWeek: 0 },
        { name: "polaris", earnedTotal: 0, findingsTotal: 0, earnedWeek: 0, findingsWeek: 0 },
        { name: "jesjupyter", earnedTotal: 0, findingsTotal: 0, earnedWeek: 0, findingsWeek: 0 },
        { name: "icebear", earnedTotal: 0, findingsTotal: 0, earnedWeek: 0, findingsWeek: 0 },
        { name: "sunsec", earnedTotal: 0, findingsTotal: 0, earnedWeek: 0, findingsWeek: 0 },
        { name: "0x52", earnedTotal: 0, findingsTotal: 0, earnedWeek: 0, findingsWeek: 0 },
        { name: "simiao", earnedTotal: 0, findingsTotal: 0, earnedWeek: 0, findingsWeek: 0 },
      ],
    },
    shop: {
      owned: {}, // { [itemKey]: number }
    },
  };
  return s;
}

/** 老存档兼容：补齐字段 + clamp */
export function normalizeState(state) {
  if (!state.settings) state.settings = { lang: "en" };
  if (state.settings.lang !== "zh") state.settings.lang = "en";
  if (typeof state.settings.healthCap !== "number") state.settings.healthCap = 150;
  state.settings.healthCap = clamp(Math.round(state.settings.healthCap), 120, 260);

  // 默认 profile：仅对“默认名字/称号”做语言映射，避免英文界面残留中文
  if (!state.player) state.player = { name: "马某某·审计师", title: "自由审计师（从零开荒）" };
  if (state.settings.lang === "en") {
    if (state.player.name === "马某某·审计师") state.player.name = "Alex Auditor";
    if (state.player.title === "自由审计师（从零开荒）") state.player.title = "Independent Security Practitioner";
  } else {
    if (state.player.name === "Alex Auditor") state.player.name = "马某某·审计师";
    if (state.player.title === "Independent Security Practitioner") state.player.title = "自由审计师（从零开荒）";
  }
  if (!state.settings.auto) {
    state.settings.auto = {
      enabled: false,
      focus: "balanced",
      allowQuitJob: false,
      allowAcceptJob: false,
      autoEndWeek: true,
      stepMs: 2000,
      minStaminaPct: 35,
      minMoodPct: 30,
    };
  }
  if (typeof state.settings.auto.enabled !== "boolean") state.settings.auto.enabled = false;
  if (!["balanced", "direct", "platform", "company", "incident", "research", "survival"].includes(state.settings.auto.focus))
    state.settings.auto.focus = "balanced";
  if (typeof state.settings.auto.allowQuitJob !== "boolean") state.settings.auto.allowQuitJob = false;
  if (typeof state.settings.auto.allowAcceptJob !== "boolean") state.settings.auto.allowAcceptJob = false;
  if (typeof state.settings.auto.autoEndWeek !== "boolean") state.settings.auto.autoEndWeek = true;
  if (typeof state.settings.auto.stepMs !== "number") state.settings.auto.stepMs = 2000;
  state.settings.auto.stepMs = clamp(Math.round(state.settings.auto.stepMs), 500, 5000);
  if (typeof state.settings.auto.minStaminaPct !== "number") state.settings.auto.minStaminaPct = 35;
  if (typeof state.settings.auto.minMoodPct !== "number") state.settings.auto.minMoodPct = 30;
  state.settings.auto.minStaminaPct = clamp(Math.round(state.settings.auto.minStaminaPct), 5, 90);
  state.settings.auto.minMoodPct = clamp(Math.round(state.settings.auto.minMoodPct), 5, 90);

  if (!state.schedule) state.schedule = { hoursPerDay: 8, locked: false };
  if (typeof state.schedule.hoursPerDay !== "number") state.schedule.hoursPerDay = 8;
  state.schedule.hoursPerDay = clamp(Math.round(state.schedule.hoursPerDay), 6, 24);
  if (typeof state.schedule.locked !== "boolean") state.schedule.locked = false;

  if (!state.flags) state.flags = { tutorialShown: false, startFilled: false, gameOver: null };
  if (typeof state.flags.startFilled !== "boolean") state.flags.startFilled = false;

  if (!state.x) state.x = { feed: [] };
  if (!Array.isArray(state.x.feed)) state.x.feed = [];

  // brand
  if (!state.stats) state.stats = {};
  if (typeof state.stats.brand !== "number") state.stats.brand = 0;

  // market / active 扩展
  if (!state.market) state.market = { direct: [], platform: [], jobs: [] };
  if (!Array.isArray(state.market.direct)) state.market.direct = [];
  if (!Array.isArray(state.market.platform)) state.market.platform = [];
  if (!Array.isArray(state.market.jobs)) state.market.jobs = [];

  if (!state.active) state.active = { direct: [], platform: [], company: [] };
  if (!Array.isArray(state.active.direct)) state.active.direct = [];
  if (!Array.isArray(state.active.platform)) state.active.platform = [];
  if (!Array.isArray(state.active.company)) state.active.company = [];

  // 兼容旧存档：market/jobs 里可能还残留旧 companyKey
  if (Array.isArray(state.market?.jobs)) {
    const legacyYubitKey = ["bl", "ock", "sec"].join("");
    for (const j of state.market.jobs) {
      if (!j) continue;
      if (String(j.companyKey || "") === legacyYubitKey) j.companyKey = "yubit";
      if (typeof j.companyName === "string" && new RegExp(legacyYubitKey, "i").test(j.companyName)) j.companyName = "Yubit";
    }
  }

  // employment/conflict/posture/research/world
  if (!state.employment) {
    state.employment = {
      employed: false,
      companyKey: null,
      companyName: null,
      companyType: null,
      workMode: "remote",
      level: 1,
      salaryWeekly: 0,
      weeksEmployed: 0,
      yhToxicTriggered: false,
      promoProgress: 0,
      performance: 50,
      trust: 50,
      politics: 20,
      manager: { archetype: "normal", toxicity: 15 },
      vanityKpi: { mode: "none", intensity: 0 },
    };
  }
  if (!("workMode" in state.employment)) {
    const ck = String(state.employment.companyKey || "");
    state.employment.workMode = ["yubit", "yh", "binance", "certik"].includes(ck) ? "onsite" : "remote";
  }
  // 兼容旧存档：以前公司显示名可能写死为旧名
  const legacyYubitKey = ["bl", "ock", "sec"].join("");
  const ck0 = String(state.employment.companyKey || "");
  if (ck0 === legacyYubitKey) state.employment.companyKey = "yubit";
  if (String(state.employment.companyKey || "") === "yubit") state.employment.companyName = "Yubit";
  if (state.employment.workMode !== "onsite") state.employment.workMode = "remote";
  if (typeof state.employment.weeksEmployed !== "number") state.employment.weeksEmployed = 0;
  state.employment.weeksEmployed = clamp(Math.round(state.employment.weeksEmployed), 0, 5200);
  if (typeof state.employment.yhToxicTriggered !== "boolean") state.employment.yhToxicTriggered = false;
  if (typeof state.employment.promoProgress !== "number") state.employment.promoProgress = 0;
  state.employment.promoProgress = clamp(+state.employment.promoProgress, 0, 999);
  if (!state.conflict) state.conflict = { risk: 0, flags: { disclosed: false, approved: false } };
  if (!state.posture) state.posture = { monitoring: 10, tests: 10, runbooks: 10 };
  if (!state.research) state.research = { topics: ["ai_audit"], progress: { aiAudit: 0 }, internalAdoption: { aiAudit: 0 }, published: { aiAudit: 0 } };
  if (!state.world) state.world = { majorIncidentCooldown: 0 };
  if (typeof state.world.majorIncidentCooldown !== "number") state.world.majorIncidentCooldown = 0;
  if (typeof state.world.eventPityWeeks !== "number") state.world.eventPityWeeks = 0;
  state.world.eventPityWeeks = clamp(Math.round(state.world.eventPityWeeks), 0, 99);

  // shop/items
  if (!state.shop) state.shop = { owned: {} };
  if (!state.shop.owned || typeof state.shop.owned !== "object") state.shop.owned = {};

  // progress / leaderboards
  if (!state.progress) state.progress = { noOrderWeeks: 0, totalWeeks: 0, earnedTotal: 0, findingsTotal: 0 };
  if (typeof state.progress.noOrderWeeks !== "number") state.progress.noOrderWeeks = 0;
  if (typeof state.progress.totalWeeks !== "number") state.progress.totalWeeks = 0;
  if (typeof state.progress.earnedTotal !== "number") state.progress.earnedTotal = 0;
  if (typeof state.progress.findingsTotal !== "number") state.progress.findingsTotal = 0;
  state.progress.earnedTotal = clamp(Math.round(state.progress.earnedTotal), 0, 999999999);
  state.progress.findingsTotal = clamp(Math.round(state.progress.findingsTotal), 0, 999999999);

  if (!state.leaderboards) state.leaderboards = defaultState().leaderboards;
  if (!state.leaderboards.playerPrev) state.leaderboards.playerPrev = { earnedTotal: 0, findingsTotal: 0 };
  if (!state.leaderboards.playerWeek) state.leaderboards.playerWeek = { earnedWeek: 0, findingsWeek: 0 };
  if (typeof state.leaderboards.playerPrev.earnedTotal !== "number") state.leaderboards.playerPrev.earnedTotal = 0;
  if (typeof state.leaderboards.playerPrev.findingsTotal !== "number") state.leaderboards.playerPrev.findingsTotal = 0;
  if (typeof state.leaderboards.playerWeek.earnedWeek !== "number") state.leaderboards.playerWeek.earnedWeek = 0;
  if (typeof state.leaderboards.playerWeek.findingsWeek !== "number") state.leaderboards.playerWeek.findingsWeek = 0;
  if (!Array.isArray(state.leaderboards.npcs) || state.leaderboards.npcs.length === 0) {
    state.leaderboards.npcs = defaultState().leaderboards.npcs;
  } else {
    // 补齐字段
    for (const n of state.leaderboards.npcs) {
      if (!n) continue;
      if (typeof n.name !== "string") n.name = "anon";
      // 兼容旧存档：NPC 名称修正（避免源码中出现旧字面量）
      const legacyJ = ["jes", "16", "jupiter"].join("");
      if (n.name === legacyJ) n.name = "jesjupyter";
      if (typeof n.earnedTotal !== "number") n.earnedTotal = 0;
      if (typeof n.findingsTotal !== "number") n.findingsTotal = 0;
      if (typeof n.earnedWeek !== "number") n.earnedWeek = 0;
      if (typeof n.findingsWeek !== "number") n.findingsWeek = 0;
      n.earnedTotal = clamp(Math.round(n.earnedTotal), 0, 999999999);
      n.findingsTotal = clamp(Math.round(n.findingsTotal), 0, 999999999);
    }
  }

  if (!("negotiation" in state)) state.negotiation = null;

  // 关键：加载旧存档后也要按当前语言重贴标签（直客/平台/offer/company），否则会残留旧中文
  setLang(state, state.settings.lang);

  return state;
}

export function computeWeeklyAPMax(state) {
  const { stamina, mood } = state.stats;
  const h = clamp(Math.round(state.schedule?.hoursPerDay ?? 8), 6, 24);
  const cap = healthCap(state);
  // 行动点更贴近“现实可干很多事”
  // 8h/天 ≈ 7AP；12h/天 ≈ 11AP；22h/天 ≈ 19AP；24h/天 ≈ 21AP
  const base = clamp(Math.round((h / 8) * 7), 6, 22);
  const bonus = (stamina >= cap * 0.75 ? 1 : 0) + (mood >= cap * 0.75 ? 1 : 0);
  const penalty = (stamina <= cap * 0.25 ? 1 : 0) + (mood <= cap * 0.25 ? 1 : 0);
  return clamp(base + bonus - penalty, 4, 24);
}

export function refreshAP(state) {
  state.ap.max = computeWeeklyAPMax(state);
  state.ap.now = clamp(state.ap.now, 0, state.ap.max);
}

export function spendAP(state, n) {
  if (state.ap.now < n) return false;
  state.ap.now -= n;
  return true;
}

export function gainAP(state, n) {
  state.ap.now = clamp(state.ap.now + n, 0, state.ap.max);
}

export function weekLabel(state) {
  return t(state, "ui.time.weekLabel", { year: state.now.year, week: state.now.week });
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

// delta: { stamina, mood, cash, reputation, compliance, network, platformRating, skill, tooling, writing, comms }
export function adjustAfterAction(state, delta) {
  const keys = Object.keys(delta);
  for (const k of keys) {
    const max = statCap(state, k);
    state.stats[k] = clamp(state.stats[k] + delta[k], 0, max);
  }
  refreshAP(state);
}

export function healthCap(state) {
  return clamp(Math.round(state?.settings?.healthCap ?? 150), 120, 260);
}

export function statCap(state, key) {
  if (key === "cash") return 999999999;
  if (key === "stamina" || key === "mood") return healthCap(state);
  return 100;
}

