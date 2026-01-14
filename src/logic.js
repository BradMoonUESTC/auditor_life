import { PROTOCOLS, DIRECT_CLIENTS, PLATFORM_NAMES, COMPANIES, SHOP_ITEMS } from "./content.js?v=35";
import { clamp, pick, rnd, ri } from "./utils.js?v=35";
import { adjustAfterAction, gainAP, healthCap, log, refreshAP, spendAP } from "./state.js?v=35";
import { addCustomXPost } from "./xfeed.js?v=35";
import { pickClientName, pickPlatformName, t } from "./i18n.js?v=35";

function fmtCash(state, amount) {
  const loc = state?.settings?.lang === "en" ? "en-US" : "zh-CN";
  const n = Math.round(amount || 0);
  return `¥${n.toLocaleString(loc)}`;
}

function ensureProgress(state) {
  if (!state.progress) state.progress = { noOrderWeeks: 0, totalWeeks: 0, earnedTotal: 0, findingsTotal: 0 };
  if (typeof state.progress.earnedTotal !== "number") state.progress.earnedTotal = 0;
  if (typeof state.progress.findingsTotal !== "number") state.progress.findingsTotal = 0;
  return state.progress;
}

function paceFactor(project) {
  // 目标：4 周单子 2~3 周能审计到 100%，3~4 周能把报告/复测补齐
  // 做法：按 deadlineWeeks 动态加速推进（越短越快），并给整体一个偏快的基准
  const w = clamp(Math.round(project?.deadlineWeeks ?? 4), 1, 12);
  return clamp(6.5 / w, 1.35, 2.8); // 4w=>1.6, 3w=>2.17, 2w=>2.8(封顶)
}

function ensureLeaderboards(state) {
  if (!state.leaderboards) state.leaderboards = { playerPrev: { earnedTotal: 0, findingsTotal: 0 }, npcs: [] };
  if (!state.leaderboards.playerPrev) state.leaderboards.playerPrev = { earnedTotal: 0, findingsTotal: 0 };
  if (!state.leaderboards.playerWeek) state.leaderboards.playerWeek = { earnedWeek: 0, findingsWeek: 0 };
  if (!Array.isArray(state.leaderboards.npcs)) state.leaderboards.npcs = [];
  return state.leaderboards;
}

export function tickLeaderboards(state) {
  const prog = ensureProgress(state);
  const lb = ensureLeaderboards(state);

  const prevEarn = Math.max(0, Math.round(lb.playerPrev.earnedTotal || 0));
  const prevFind = Math.max(0, Math.round(lb.playerPrev.findingsTotal || 0));
  const curEarn = Math.max(0, Math.round(prog.earnedTotal || 0));
  const curFind = Math.max(0, Math.round(prog.findingsTotal || 0));

  const playerEarnWeek = Math.max(0, curEarn - prevEarn);
  const playerFindWeek = Math.max(0, curFind - prevFind);
  lb.playerWeek.earnedWeek = playerEarnWeek;
  lb.playerWeek.findingsWeek = playerFindWeek;

  // 用玩家“本周增量”做锚点，NPC 增速尽量贴近玩家
  const baseEarn = clamp(Math.round(playerEarnWeek > 0 ? playerEarnWeek : rnd(820, 1150)), 450, 1800);
  const baseFind = clamp(Math.round(playerFindWeek > 0 ? playerFindWeek : rnd(0.8, 1.4)), 0, 3);

  for (const n of lb.npcs || []) {
    if (!n) continue;
    if (typeof n.earnedTotal !== "number") n.earnedTotal = 0;
    if (typeof n.findingsTotal !== "number") n.findingsTotal = 0;

    let eg = Math.round(baseEarn * rnd(0.75, 1.25));
    // 偶尔“爆单/爆赏金”
    if (Math.random() < 0.08) eg += Math.round(baseEarn * rnd(1.2, 2.2));
    eg = clamp(eg, 200, 4200);

    let fg = Math.round(baseFind * rnd(0.65, 1.35) + rnd(-0.2, 0.9));
    // 偶尔“爆 finding”
    if (Math.random() < 0.06) fg += 1;
    fg = clamp(fg, 0, 5);

    n.earnedWeek = eg;
    n.findingsWeek = fg;
    n.earnedTotal = clamp(Math.round(n.earnedTotal + eg), 0, 999999999);
    n.findingsTotal = clamp(Math.round(n.findingsTotal + fg), 0, 999999999);
  }

  lb.playerPrev.earnedTotal = curEarn;
  lb.playerPrev.findingsTotal = curFind;
}

function levelPayMult(level) {
  const l = Math.round(level || 1);
  if (l <= 1) return 0.95;
  if (l === 2) return 1.05;
  return 1.2;
}

// 旧存档迁移：把“旧经济档（1k 周薪）”升级到“现实周薪（7k-13k）”，并补 workMode
export function migrateCompensation(state) {
  // job offers
  const offers = state.market?.jobs || [];
  for (const o of offers) {
    const c = companyByKey(o.companyKey);
    if (!o.workMode) o.workMode = c.workMode || "remote";
    const isLowPayCompany = (c.payBandWeekly?.[1] ?? 999999) < 3000;
    if (!isLowPayCompany && (typeof o.salaryWeekly !== "number" || o.salaryWeekly < 3000)) {
      const band = c.payBandWeekly || [7000, 9000];
      const mid = (band[0] + band[1]) / 2;
      o.salaryWeekly = Math.round(mid * levelPayMult(o.levelOffer || 1));
    }
  }

  // current employment
  const e = state.employment;
  if (e?.employed) {
    const ck = e.companyKey;
    if (ck) {
      const c = companyByKey(ck);
      if (!e.workMode) e.workMode = c.workMode || "remote";
      const isLowPayCompany = (c.payBandWeekly?.[1] ?? 999999) < 3000;
      if (!isLowPayCompany && (typeof e.salaryWeekly !== "number" || e.salaryWeekly < 3000)) {
        const band = c.payBandWeekly || [7000, 9000];
        const mid = (band[0] + band[1]) / 2;
        e.salaryWeekly = Math.round(mid * levelPayMult(e.level || 1));
      }
    }
  }
}

export function protocolName(protocolKey) {
  return (PROTOCOLS.find((x) => x.key === protocolKey) || PROTOCOLS[0]).name;
}

// UI 用：根据当前语言返回协议展示名（优先 i18n，其次回退到 content.js 的 name）
export function protocolLabel(state, protocolKey) {
  const key = `protocol.${protocolKey}`;
  const s = t(state, key);
  if (s && s !== key) return s;
  return protocolName(protocolKey);
}

export function protocolDiff(protocolKey) {
  return (PROTOCOLS.find((x) => x.key === protocolKey) || PROTOCOLS[0]).diff;
}

// 项目复杂度（影响动作消耗与推进速度）
export function complexityTier(project) {
  const diff = protocolDiff(project.protocol);
  const scope = project.scope || 0;
  const score = scope + diff * 1.2;
  if (score <= 65) return 1; // 简单
  if (score <= 120) return 2; // 中等
  return 3; // 复杂
}

export function actionCost(state, actionKey, target) {
  const owned = (k) => clamp(Math.round(state?.shop?.owned?.[k] ?? 0), 0, 999);
  const has = (k) => owned(k) > 0;
  if (!target) {
    if (actionKey === "model") return 3;
    if (actionKey === "audit") return 2;
    if (actionKey === "write") return 1;
    if (actionKey === "aiResearch") return 1;
    if (actionKey === "productizeAI") return 2;
    if (actionKey === "incidentAnalysis") return 1;
    if (actionKey === "fundTrace") return 1;
    if (actionKey === "writeBrief") return 1;
    if (actionKey === "postX") return 1;
    let base = 1;
    if (actionKey === "model") base = 3;
    if (actionKey === "audit") base = 2;
    if (actionKey === "write") base = 1;
    if (actionKey === "productizeAI") base = 2;
    // Shop modifiers
    if (has("tooling_suite") && ["audit", "model", "write"].includes(actionKey)) base -= 1;
    if (has("better_chair") && ["meeting", "companyWork"].includes(actionKey)) base -= 1;
    return clamp(base, 1, 8);
  }
  const tier = complexityTier(target);
  const backlog =
    target.kind === "direct"
      ? target.found?.length || 0
      : target.submissions?.filter((x) => x.status === "draft" || x.status === "submitted").length || 0;

  let base = 1;
  if (actionKey === "audit") base = tier === 1 ? 1 : tier === 2 ? 2 : 3;
  if (actionKey === "model") base = tier === 1 ? 2 : tier === 2 ? 3 : 4;
  if (actionKey === "retest") base = Math.max(1, (tier === 1 ? 1 : tier === 2 ? 2 : 3) - 1);
  if (actionKey === "write") base = backlog >= 10 || tier === 3 ? 2 : 1;
  if (actionKey === "companyWork") base = 2;
  if (actionKey === "meeting") base = 1;
  if (actionKey === "aiResearch") base = 1;
  if (actionKey === "productizeAI") base = 2;
  if (actionKey === "incidentAnalysis") base = 1;
  if (actionKey === "fundTrace") base = 1;
  if (actionKey === "writeBrief") base = 1;
  if (actionKey === "postX") base = 1;

  // Shop modifiers
  if (has("tooling_suite") && ["audit", "model", "write", "retest", "submit"].includes(actionKey)) base -= 1;
  if (has("better_chair") && ["meeting", "companyWork"].includes(actionKey)) base -= 1;
  return clamp(base, 1, 8);
}

export function writeProgressInc(stats, target) {
  // 更快：让 3~4 周能把报告/证据补齐
  const base = Math.round(8 + stats.writing / 9);
  if (!target) return base;
  const tier = complexityTier(target);
  const scope = target.scope || 0;
  const backlog = target.kind === "direct" ? target.found?.length || 0 : target.submissions?.length || 0;
  const speed = clamp(1.35 - backlog * 0.05 - scope * 0.0025 + (tier === 1 ? 0.12 : tier === 3 ? -0.12 : 0), 0.6, 1.55);
  return clamp(Math.round(base * speed), 4, 26);
}

export function severityPoints(sev) {
  if (sev === "S") return 10;
  if (sev === "H") return 6;
  if (sev === "M") return 3;
  if (sev === "L") return 1;
  return 0;
}

export function makeVulnPool(protocolKey, scope) {
  const diff = protocolDiff(protocolKey) + scope * 0.4;
  const severe = clamp(Math.round(rnd(0, diff / 40)), 0, 3);
  const high = clamp(Math.round(rnd(1, diff / 22)), 1, 6);
  const medium = clamp(Math.round(rnd(2, diff / 14)), 2, 10);
  const low = clamp(Math.round(rnd(2, diff / 10)), 2, 14);
  return { S: severe, H: high, M: medium, L: low };
}

export function makeDirectOrder(state, forceClientKey) {
  const proto = pick(PROTOCOLS);
  const scope = ri(18, 80);
  const deadline = ri(2, 5);
  const cooperation = ri(35, 85);
  const adversary = ri(15, 75);
  // client：加入一个“穷 DAO（web3dao）”的直客甲方：按周 ¥700 发单
  // 其它甲方：维持“单周收入≈1000、生活费700/周”有压力的区间
  const clientKey = forceClientKey ?? (Math.random() < 0.22 ? "web3dao" : clamp(Math.floor(Math.random() * 6) + 1, 1, 6));

  let fee = 0;
  if (clientKey === "web3dao") {
    fee = Math.round(700 * deadline);
  } else {
    // 大致：2~5 周项目，总价 ~2000~5000
    const baseFee = 700 + scope * 28 + proto.diff * 12;
    const rush = deadline <= 2 ? 1.25 : 1;
    fee = Math.round(baseFee * rush);
  }
  return {
    id: `D_${Date.now()}_${ri(100, 999)}`,
    kind: "direct",
    clientKey,
    title: t(state, "direct.title", { client: t(state, `client.${clientKey}`), protocol: t(state, `protocol.${proto.key}`) }),
    protocol: proto.key,
    scope,
    deadlineWeeks: deadline,
    cooperation,
    adversary,
    fee,
    notes: clientKey === "web3dao" ? t(state, "direct.notes.dao", { perWeek: fmtCash(state, 700) }) : t(state, deadline <= 2 ? "direct.notes.rush" : "direct.notes.normal"),
  };
}

export function makePlatformContest(state) {
  const proto = pick(PROTOCOLS);
  const scope = ri(20, 90);
  const duration = ri(1, 3);
  const popularity = ri(30, 95);
  // 奖池更“真实”：每场总奖池几万~几十万；去重/solo 会显著影响个人到手
  const basePrize = 22000 + scope * 1400 + proto.diff * 900; // ~3w 起步
  const hypeMul = 1 + popularity / 120; // 热度越高总池子越大
  const prizePool = clamp(Math.round(basePrize * hypeMul), 30000, 450000);
  // 氛围用：整场（有效）finding 总量，别比玩家离谱太多（结算时会再“按玩家成绩”约束 share）
  const totalFindingsHint = clamp(Math.round(4 + scope / 12 + proto.diff / 18 + popularity / 25), 6, 28);
  const platformKeys = ["sherlock", "code4rena", "cantina"];
  const platformKey = platformKeys[Math.floor(Math.random() * platformKeys.length)];
  const platform = t(state, `platform.${platformKey}`);

  return {
    id: `P_${Date.now()}_${ri(100, 999)}`,
    kind: "platform",
    platformKey,
    platform,
    title: t(state, "platform.title", { platform, protocol: t(state, `protocol.${proto.key}`) }),
    protocol: proto.key,
    scope,
    deadlineWeeks: duration,
    popularity,
    prizePool,
    totalFindingsHint,
    notes:
      popularity >= 75
        ? t(state, "platform.notes.hot")
        : t(state, "platform.notes.normal"),
  };
}

export function seedMarket(state, fresh = false) {
  const nDirect = 5;
  const nPlat = 3;
  if (fresh) {
    state.market.direct = [];
    state.market.platform = [];
    state.market.jobs = [];
  }
  while (state.market.direct.length < nDirect) state.market.direct.push(makeDirectOrder(state));
  // 保底：每周至少出现 1 个 web3dao 的“穷单子”（否则玩家可能刷不到）
  const hasDaoClient = state.market.direct.some((o) => o?.kind === "direct" && o.clientKey === "web3dao");
  if (!hasDaoClient && state.market.direct.length > 0) {
    state.market.direct[state.market.direct.length - 1] = makeDirectOrder(state, "web3dao");
  }
  while (state.market.platform.length < nPlat) state.market.platform.push(makePlatformContest(state));
  seedJobMarket(state, false);
}

export function itemCount(state, key) {
  return clamp(Math.round(state?.shop?.owned?.[key] ?? 0), 0, 999);
}

export function hasItem(state, key) {
  return itemCount(state, key) > 0;
}

export function buyItem(state, key) {
  const it = SHOP_ITEMS.find((x) => x.key === key);
  if (!it) return { ok: false, msg: state.settings?.lang === "en" ? "Unknown item." : "未知物品。" };
  const owned = itemCount(state, key);
  if (it.once && owned > 0) return { ok: false, msg: state.settings?.lang === "en" ? "Already owned." : "该物品已拥有。" };
  if (state.stats.cash < it.cost) return { ok: false, msg: state.settings?.lang === "en" ? "Not enough cash." : "现金不足。" };
  state.stats.cash -= it.cost;
  if (!state.shop) state.shop = { owned: {} };
  if (!state.shop.owned) state.shop.owned = {};
  state.shop.owned[key] = owned + 1;
  log(state, `${t(state, `shop.item.${key}.name`)} ${state.settings?.lang === "en" ? "purchased." : "已购买。"} `, "good");
  return { ok: true };
}

export function useItem(state, key) {
  const it = SHOP_ITEMS.find((x) => x.key === key);
  if (!it) return { ok: false, msg: state.settings?.lang === "en" ? "Unknown item." : "未知物品。" };
  if (it.kind !== "consumable") return { ok: false, msg: state.settings?.lang === "en" ? "Not consumable." : "该物品不是消耗品。" };
  const owned = itemCount(state, key);
  if (owned <= 0) return { ok: false, msg: state.settings?.lang === "en" ? "You don't have it." : "你没有这个物品。" };

  if (key === "therapy_session") {
    const cap = healthCap(state);
    adjustAfterAction(state, { mood: Math.round(cap * 0.18) });
    log(state, state.settings?.lang === "en" ? "Therapy session: mood restored." : "你做了一次心理咨询：心态回了一口。", "good");
  }
  if (key === "training_pack") {
    const gain = () => (Math.random() < 0.5 ? 1 : 2);
    adjustAfterAction(state, { skill: gain(), tooling: gain(), writing: gain(), comms: gain() });
    log(state, state.settings?.lang === "en" ? "Training pack: small stat gains." : "你刷完了一套训练营：属性小幅提升。", "good");
  }

  state.shop.owned[key] = owned - 1;
  return { ok: true };
}

function companyByKey(key) {
  return COMPANIES.find((c) => c.key === key) || COMPANIES[0];
}

export function seedJobMarket(state, fresh = false) {
  if (!state.market) state.market = { direct: [], platform: [], jobs: [] };
  if (!Array.isArray(state.market.jobs)) state.market.jobs = [];
  if (fresh) state.market.jobs = [];
  const want = 5;
  // 确保能刷到「磐石安全实验室 / the web3 dao」
  const hasDao = state.market.jobs.some((x) => x.companyKey === "web3dao");
  if (!hasDao) state.market.jobs.unshift(makeJobOffer(state, "web3dao"));

  // Yubit：用户希望更频繁出现（作为“非远程 + 租房成本”的典型公司），这里做一个保底
  const hasYubit = state.market.jobs.some((x) => x.companyKey === "yubit");
  if (!hasYubit) {
    // 尽量放在 dao 之后，避免把 dao 挤掉
    const idx = state.market.jobs[0]?.companyKey === "web3dao" ? 1 : 0;
    state.market.jobs.splice(idx, 0, makeJobOffer(state, "yubit"));
  }

  while (state.market.jobs.length > want) state.market.jobs.pop();
  while (state.market.jobs.length < want) state.market.jobs.push(makeJobOffer(state));
}

export function makeJobOffer(state, forceCompanyKey) {
  const c = forceCompanyKey ? companyByKey(forceCompanyKey) : pick(COMPANIES);
  const rep = state.stats.reputation || 0;
  const plat = state.stats.platformRating || 0;
  const net = state.stats.network || 0;
  const score = rep + plat + Math.round(net / 2);
  let levelOffer = 1;
  if (score >= 90) levelOffer = 3;
  else if (score >= 55) levelOffer = 2;

  // 交易所更挑人：合规风险高/冲突风险高时更容易给低档
  if (c.type === "exchange") {
    if ((state.stats.compliance || 0) > 45) levelOffer = Math.max(1, levelOffer - 1);
    if ((state.conflict?.risk || 0) > 35) levelOffer = Math.max(1, levelOffer - 1);
  }

  const [min, max] = c.payBandWeekly;
  const salaryWeekly = Math.round(rnd(min, max) * (levelOffer === 1 ? 0.95 : levelOffer === 2 ? 1.05 : 1.2));
  const id = `J_${Date.now()}_${ri(100, 999)}`;
  const notes = t(state, c.type === "exchange" ? "job.notes.exchange" : "job.notes.sec");

  return {
    id,
    kind: "job",
    companyKey: c.key,
    companyName: t(state, `company.${c.key}.name`),
    companyType: c.type,
    workMode: c.workMode || "remote",
    complianceStrict: c.complianceStrict,
    processMaturity: c.processMaturity,
    culture: c.culture,
    shipUrgency: c.shipUrgency,
    levelOffer,
    salaryWeekly,
    title: t(state, c.type === "exchange" ? "job.title.exchange" : "job.title.sec"),
    notes,
  };
}

export function acceptJob(state, offerId) {
  const offer = (state.market.jobs || []).find((x) => x.id === offerId);
  if (!offer) return { ok: false, msg: t(state, "msg.offerExpired") };
  const c = companyByKey(offer.companyKey);
  state.employment.employed = true;
  state.employment.companyKey = c.key;
  state.employment.companyName = t(state, `company.${c.key}.name`);
  state.employment.companyType = c.type;
  state.employment.workMode = offer.workMode || c.workMode || "remote";
  state.employment.level = offer.levelOffer;
  state.employment.salaryWeekly = offer.salaryWeekly;
  state.employment.weeksEmployed = 0;
  state.employment.promoProgress = 0;
  // YH 入职后 3 周内必定触发一次“恶心事件”
  state.employment.yhToxicTriggered = false;
  state.employment.performance = clamp(state.employment.performance ?? 50, 0, 100);
  state.employment.trust = clamp(state.employment.trust ?? 50, 0, 100);

  // 交易所更容易刷到“阿里味/恶心 KPI”
  if (c.type === "exchange") {
    state.employment.manager = { archetype: "pua", toxicity: ri(60, 90) };
    state.employment.vanityKpi = { mode: pick(["loc", "refactor"]), intensity: ri(55, 85) };
    state.employment.politics = clamp((state.employment.politics ?? 20) + ri(20, 35), 0, 100);
  } else {
    state.employment.manager = { archetype: "delivery", toxicity: ri(15, 45) };
    state.employment.vanityKpi = { mode: "none", intensity: 0 };
    state.employment.politics = clamp((state.employment.politics ?? 20) + ri(5, 15), 0, 100);
  }

  state.conflict.risk = clamp((state.conflict?.risk ?? 0) + (c.type === "exchange" ? 8 : 4), 0, 100);
  log(
    state,
    t(state, "log.job.accepted", {
      company: t(state, `company.${c.key}.name`),
      level: offer.levelOffer,
      salary: offer.salaryWeekly.toLocaleString(state.settings?.lang === "en" ? "en-US" : "zh-CN"),
    }),
    c.type === "exchange" ? "warn" : "good"
  );
  state.market.jobs = (state.market.jobs || []).filter((x) => x.id !== offerId);
  // 入职后立刻发一批 company tickets，避免“空窗”
  ensureCompanyTickets(state);
  ensureSelection(state);
  return { ok: true };
}

export function quitJob(state) {
  if (!state.employment?.employed) return { ok: false, msg: t(state, "msg.notEmployed") };
  const name = state.employment.companyName;
  state.employment.employed = false;
  state.employment.companyKey = null;
  state.employment.companyName = null;
  state.employment.companyType = null;
  state.employment.salaryWeekly = 0;
  state.employment.weeksEmployed = 0;
  state.employment.yhToxicTriggered = false;
  state.employment.promoProgress = 0;
  state.employment.politics = clamp((state.employment.politics ?? 20) - 25, 0, 100);
  adjustAfterAction(state, { mood: +2 });

  // 离职后：公司任务不应继续存在
  if (Array.isArray(state.active?.company)) state.active.company = [];
  // 如果当前选中的是公司任务，清掉并让系统重新选一个有效目标（直客/平台）
  if (state.selectedTarget?.kind === "company") state.selectedTarget = null;
  ensureSelection(state);

  log(state, t(state, "log.job.quit", { company: name }), "info");
  return { ok: true };
}

export function requestRemoteWork(state) {
  if (!state.employment?.employed) return { ok: false, msg: t(state, "msg.notEmployed") };
  if ((state.employment.workMode || "remote") === "remote") return { ok: false, msg: t(state, "msg.remote.already") };

  const ck = String(state.employment.companyKey || "");
  const companyName = state.employment.companyName || "";

  // Yubit：永远失败（讽刺一下）
  if (ck === "yubit") {
    state.employment.politics = clamp((state.employment.politics ?? 20) + ri(2, 6), 0, 100);
    state.employment.trust = clamp((state.employment.trust ?? 50) - ri(1, 4), 0, 100);
    log(state, t(state, "log.remote.yubit.fail", { company: companyName }), "bad");
    return { ok: true };
  }

  // 其它公司：看信任/政治，给一个偏容易的成功率
  const trust = clamp(state.employment.trust ?? 50, 0, 100);
  const politics = clamp(state.employment.politics ?? 20, 0, 100);
  const chance = clamp(0.7 + trust / 250 - politics / 400, 0.35, 0.92);

  if (Math.random() < chance) {
    state.employment.workMode = "remote";
    state.employment.trust = clamp(trust + ri(1, 4), 0, 100);
    state.employment.politics = clamp(politics - ri(1, 3), 0, 100);
    log(state, t(state, "log.remote.success", { company: companyName }), "good");
    return { ok: true };
  }

  state.employment.trust = clamp(trust - ri(1, 3), 0, 100);
  state.employment.politics = clamp(politics + ri(2, 5), 0, 100);
  log(state, t(state, "log.remote.fail", { company: companyName }), "warn");
  return { ok: true };
}

export function makeCompanyTicket(state) {
  const types = ["design_review", "pr_review", "monitoring", "incident", "training", "compliance", "security_tooling"];
  const tt = pick(types);
  const scope = ri(10, 70);
  const deadlineWeeks = ri(1, 3);
  const impact = ri(30, 90);
  return {
    id: `C_${Date.now()}_${ri(100, 999)}`,
    kind: "company",
    ticketType: tt,
    title: t(state, "project.company.title", { type: t(state, `company.ticketType.${tt}`), scope }),
    protocol: pick(PROTOCOLS).key,
    scope,
    deadlineWeeks,
    impact,
    risk: ri(20, 80),
    progress: 0,
  };
}

export function ensureCompanyTickets(state) {
  if (!state.employment?.employed) return;
  if (!Array.isArray(state.active.company)) state.active.company = [];
  const want = 2;
  while (state.active.company.length < want) state.active.company.push(makeCompanyTicket(state));
}

export function tickMajorIncident(state) {
  if (!state.world) state.world = { majorIncidentCooldown: 0 };
  if (state.world.majorIncidentCooldown > 0) state.world.majorIncidentCooldown -= 1;

  if (state.majorIncident?.active) {
    state.majorIncident.weeksLeft -= 1;
    if (state.majorIncident.weeksLeft < 0) {
      log(state, `重大事件窗口已过期：《${state.majorIncident.title}》。你错过了抢时效的红利。`, "warn");
      state.majorIncident = null;
      state.world.majorIncidentCooldown = ri(8, 18);
    }
    return;
  }

  if (!state.majorIncident && state.world.majorIncidentCooldown <= 0) {
    const p = 0.08;
    if (Math.random() < p) {
      const kinds = [
        { k: "bridge_hack", title: "跨链桥疑似被打：资金异常外流" },
        { k: "oracle_fail", title: "预言机异常：多协议连环清算" },
        { k: "governance_attack", title: "治理攻击：提案被疑似劫持" },
        { k: "key_leak", title: "私钥疑云：权限地址发生异常操作" },
      ];
      const pickOne = pick(kinds);
      state.majorIncident = {
        active: true,
        kind: pickOne.k,
        title: pickOne.title,
        spawnedAt: { ...state.now },
        weeksLeft: ri(1, 2),
        progress: { analysis: 0, tracing: 0, writeup: 0, xThread: 0 },
        published: { done: false, weekOffset: null },
      };
      log(state, `【重大事件】${pickOne.title}（窗口 ${state.majorIncident.weeksLeft} 周）。`, "warn");
    }
  }
}

export function careerAdvanceWeek(state) {
  if (state.employment?.employed) {
    const rentWeekly = 1000;
    state.employment.weeksEmployed = clamp(Math.round((state.employment.weeksEmployed || 0) + 1), 0, 5200);
    if (!state.progress) state.progress = { noOrderWeeks: 0, totalWeeks: 0, earnedTotal: 0, findingsTotal: 0 };
    const sal = Math.round(state.employment.salaryWeekly || 0);
    state.stats.cash += sal;
    state.progress.earnedTotal = (state.progress.earnedTotal || 0) + Math.max(0, sal);
    log(
      state,
      t(state, "log.salary.received", {
        amount: sal.toLocaleString(state.settings?.lang === "en" ? "en-US" : "zh-CN"),
      }),
      "good"
    );
    ensureCompanyTickets(state);

    // 非远程：租房成本（每周）
    if ((state.employment.workMode || "remote") !== "remote") {
      state.stats.cash -= rentWeekly;
      log(
        state,
        t(state, "log.rent.paid", {
          amount: Math.round(rentWeekly).toLocaleString(state.settings?.lang === "en" ? "en-US" : "zh-CN"),
        }),
        "warn"
      );
    }

    // 晋升：目标让玩家“10 周左右能升职”，并且声望/平台评级越高越快
    // base: 1/周；bonus: (rep+plat)/120 => 0~1；最终约 1~2/周
    const promoTarget = 10;
    const rep = clamp(state.stats.reputation ?? 0, 0, 100);
    const plat = clamp(state.stats.platformRating ?? 0, 0, 100);
    const bonus = clamp((rep + plat) / 120, 0, 1);
    const gain = clamp(1 + bonus, 1, 2);
    state.employment.promoProgress = clamp((state.employment.promoProgress ?? 0) + gain, 0, 999);

    // 目前先做 3 级上限（与 offer levelOffer 对齐）
    while (state.employment.level < 3 && state.employment.promoProgress >= promoTarget) {
      state.employment.promoProgress -= promoTarget;
      const from = state.employment.level;
      state.employment.level = clamp(from + 1, 1, 3);
      const oldSalary = Math.round(state.employment.salaryWeekly || 0);
      // 升一级：工资上调（安全公司更“涨得快”，交易所更慢但更稳定）
      const mul = state.employment.companyType === "exchange" ? 1.12 : 1.18;
      state.employment.salaryWeekly = Math.round(oldSalary * mul);
      state.employment.trust = clamp((state.employment.trust ?? 50) + 3, 0, 100);
      state.employment.performance = clamp((state.employment.performance ?? 50) + 2, 0, 100);
      log(
        state,
        t(state, "log.promo.up", {
          company: state.employment.companyName || "",
          from,
          to: state.employment.level,
          salary: state.employment.salaryWeekly.toLocaleString(state.settings?.lang === "en" ? "en-US" : "zh-CN"),
        }),
        "good"
      );
    }
  }
  seedJobMarket(state, false);
  tickMajorIncident(state);
}

export function ensureSelection(state) {
  if (!state.selectedTarget) {
    const d = state.active.direct[0];
    const p = state.active.platform[0];
    const c = state.active.company?.[0];
    if (d) state.selectedTarget = { kind: "direct", id: d.id };
    else if (p) state.selectedTarget = { kind: "platform", id: p.id };
    else if (c) state.selectedTarget = { kind: "company", id: c.id };
  }
}

export function findTarget(state, kind, id) {
  const list = kind === "direct" ? state.active.direct : kind === "platform" ? state.active.platform : state.active.company || [];
  return list.find((x) => x.id === id) || null;
}

export function activateDirect(state, order) {
  if (state.active.direct.length >= 2) return { ok: false, msg: t(state, "msg.limit.direct") };
  const depositPct = clamp(order.depositPct ?? 0.2, 0.1, 0.5);
  const project = {
    ...order,
    stage: "active",
    depositPct,
    coverage: 0,
    report: { draft: 0, delivered: false },
    fixRate: clamp(Math.round(rnd(35, 75) + (order.cooperation - 50) * 0.35), 0, 100),
    shipUrgency: clamp(ri(25, 90) + (order.deadlineWeeks <= 2 ? 8 : 0), 0, 100),
    retestScore: 0,
    pool: makeVulnPool(order.protocol, order.scope),
    found: [],
    undiscovered: null,
  };
  project.undiscovered = { ...project.pool };
  state.active.direct.push(project);
  state.market.direct = state.market.direct.filter((x) => x.id !== order.id);
  const deposit = Math.round(order.fee * depositPct);
  state.stats.cash += deposit; // 定金
  if (!state.progress) state.progress = { noOrderWeeks: 0, totalWeeks: 0, earnedTotal: 0, findingsTotal: 0 };
  state.progress.earnedTotal = (state.progress.earnedTotal || 0) + Math.max(0, deposit);
  state.stats.compliance = clamp(state.stats.compliance + (order.scope > 70 ? 1 : 0), 0, 100);
  log(
    state,
    t(state, "log.accept.direct", {
      title: order.title,
      deposit: deposit.toLocaleString(state.settings?.lang === "en" ? "en-US" : "zh-CN"),
    })
  );
  ensureSelection(state);
  return { ok: true };
}

export function activatePlatform(state, contest) {
  if (state.active.platform.length >= 1) return { ok: false, msg: t(state, "msg.limit.platform") };
  const project = {
    ...contest,
    stage: "active",
    coverage: 0,
    evidence: 0,
    submissions: [],
    pool: makeVulnPool(contest.protocol, contest.scope),
    undiscovered: null,
  };
  project.undiscovered = { ...project.pool };
  state.active.platform.push(project);
  state.market.platform = state.market.platform.filter((x) => x.id !== contest.id);
  log(state, t(state, "log.accept.platform", { title: contest.title, weeks: contest.deadlineWeeks }));
  ensureSelection(state);
  return { ok: true };
}

export function discover(state, project, mode) {
  const st = state.stats;
  const scopePenalty = project.scope / 140;
  const skill = st.skill / 100;
  const tooling = st.tooling / 100;
  const stamina = st.stamina / 100;
  const base = mode === "audit" ? 0.32 : mode === "model" ? 0.22 : 0.18;
  const p = clamp(base + skill * 0.25 + tooling * 0.12 + stamina * 0.1 - scopePenalty * 0.12, 0.06, 0.75);

  const found = [];
  const pool = project.undiscovered || {};
  const tries = mode === "model" ? 2 : 3;
  for (let i = 0; i < tries; i++) {
    if (Math.random() > p) continue;
    const keys = ["S", "H", "M", "L"].filter((k) => (pool[k] || 0) > 0);
    if (!keys.length) break;
    const sev = keys[ri(0, keys.length - 1)];
    pool[sev] -= 1;
    const points = severityPoints(sev);
    found.push({
      id: `${project.kind}_${Date.now()}_${ri(100, 999)}`,
      sev,
      points,
      status: project.kind === "platform" ? "draft" : "found",
    });
  }

  if (project.kind === "platform") {
    project.submissions.push(...found.map((x) => ({ ...x, status: "draft" })));
  } else {
    project.found.push(...found.map((x) => ({ id: x.id, sev: x.sev, points: x.points, status: "found" })));
  }
  if (!state.progress) state.progress = { noOrderWeeks: 0, totalWeeks: 0, earnedTotal: 0, findingsTotal: 0 };
  if (found.length > 0) state.progress.findingsTotal = (state.progress.findingsTotal || 0) + found.length;
  return found;
}

export function coverageGain(state, project, mode) {
  const st = state.stats;
  const skill = st.skill / 100;
  const tooling = st.tooling / 100;
  const stamina = st.stamina / 100;
  // 更快：审计/建模/复测整体再提速
  const base = mode === "audit" ? 16 : mode === "model" ? 11 : 10;
  const tier = complexityTier(project);
  const tierMul = tier === 1 ? 1.15 : tier === 3 ? 0.9 : 1;
  const pace = paceFactor(project);
  const gain = base * tierMul * pace * (0.7 + skill * 0.8 + tooling * 0.6) * (0.7 + stamina * 0.6) * (1 - project.scope / 220);
  return clamp(Math.round(gain), 6, mode === "audit" ? 34 : 28);
}

export function labelOfStat(k) {
  const map = {
    skill: "审计能力",
    comms: "沟通能力",
    writing: "写作能力",
    tooling: "工具链",
    stamina: "精力",
    mood: "心态",
    cash: "现金",
    reputation: "声望",
    brand: "名声",
    compliance: "合规风险",
    network: "关系网",
    platformRating: "平台评级",
  };
  return map[k] || k;
}

export function doAction(state, actionKey, toast) {
  const actionName = t(state, `action.${actionKey}.name`);
  if (!actionName) return;
  ensureSelection(state);
  const target = state.selectedTarget ? findTarget(state, state.selectedTarget.kind, state.selectedTarget.id) : null;
  const cost = actionCost(state, actionKey, target);

  if (!spendAP(state, cost)) {
    toast?.(t(state, "msg.apNotEnough", { cost }));
    return;
  }

  if (
    (actionKey === "audit" ||
      actionKey === "model" ||
      actionKey === "write" ||
      actionKey === "retest" ||
      actionKey === "comms" ||
      actionKey === "submit" ||
      actionKey === "companyWork" ||
      actionKey === "meeting") &&
    !target
  ) {
    toast?.(t(state, "msg.noActiveTarget"));
    gainAP(state, cost);
    return;
  }

  const st = state.stats;

  if (actionKey === "audit" || actionKey === "model" || actionKey === "retest") {
    const gain = coverageGain(state, target, actionKey === "audit" ? "audit" : actionKey === "model" ? "model" : "retest");
    target.coverage = clamp(target.coverage + gain, 0, 100);

    const found = discover(state, target, actionKey === "audit" ? "audit" : actionKey === "model" ? "model" : "retest");
    const sevText = found.length ? found.map((x) => x.sev).join("") : "";

    const tier = complexityTier(target);
    // 血厚一点：单次动作的精力/心态消耗整体下调（极端工时仍会靠周末惩罚“收回来”）
    const fatigue = actionKey === "model" ? -4 - (tier - 1) : -3 - (tier - 1);
    const moodCost = actionKey === "model" ? -2 - (tier - 1) : -1 - (tier - 1);
    adjustAfterAction(state, { stamina: fatigue, mood: moodCost });

    if (target.kind === "platform") {
      log(
        state,
        t(state, found.length ? "log.action.coverage.platform.found" : "log.action.coverage.platform.none", {
          title: target.title,
          action: actionName,
          gain,
          n: found.length,
          sev: sevText,
        })
      );
    } else {
      if (actionKey === "retest") {
        const rt = Math.round(16 * paceFactor(target));
        target.retestScore = clamp((target.retestScore || 0) + rt, 0, 100);
      }
      log(
        state,
        t(state, found.length ? "log.action.coverage.direct.found" : "log.action.coverage.direct.none", {
          title: target.title,
          action: actionName,
          gain,
          n: found.length,
          sev: sevText,
        })
      );
    }
  }

  if (actionKey === "write") {
    let inc = writeProgressInc(st, target);
    if (hasItem(state, "report_templates")) inc = clamp(Math.round(inc * 1.15), 1, 30);
    // 工期越短，写作/证据推进越快；整体也略加速（避免“4 周都写不完”）
    inc = clamp(Math.round(inc * paceFactor(target)), 2, 45);
    const tier = complexityTier(target);
    if (target.kind === "direct") {
      target.report.draft = clamp(target.report.draft + inc, 0, 100);
      adjustAfterAction(state, { stamina: -1 - (tier - 1), mood: 0 });
      log(state, t(state, "log.action.write.report", { title: target.title, inc }));
    } else {
      target.evidence = clamp((target.evidence || 0) + inc, 0, 100);
      target.coverage = clamp(target.coverage + 1, 0, 100);
      adjustAfterAction(state, { stamina: -1 - (tier - 1), mood: 0 });
      log(state, t(state, "log.action.platform.evidence", { title: target.title, inc }));
    }
  }

  if (actionKey === "submit") {
    if (target.kind !== "platform") {
      toast?.(t(state, "msg.submit.onlyPlatform"));
      gainAP(state, cost);
      return;
    }
    const drafts = target.submissions.filter((x) => x.status === "draft");
    if (drafts.length === 0) {
      toast?.(t(state, "msg.submit.noDraft"));
      gainAP(state, cost);
      return;
    }
    const submitCap = clamp(1 + Math.floor(st.writing / 40), 1, 3);
    const n = Math.min(submitCap, drafts.length);
    for (let i = 0; i < n; i++) drafts[i].status = "submitted";
    adjustAfterAction(state, { mood: -1 });
    log(state, t(state, "log.action.platform.submit", { n }));
  }

  if (actionKey === "comms") {
    if (target.kind === "direct") {
      // 更快：沟通推进更明显（配合度/修复率更容易拉起来）
      const up = Math.round(10 + st.comms / 8);
      target.cooperation = clamp(target.cooperation + up, 0, 100);
      target.fixRate = clamp((target.fixRate ?? 50) + Math.round(up * 0.6), 0, 100);
      adjustAfterAction(state, { mood: -1, stamina: -1 });
      log(state, t(state, "log.action.comms.direct", { title: target.title, up }));
    } else {
      adjustAfterAction(state, { mood: -1 });
      log(state, t(state, "log.action.comms.platform", { title: target.title }));
    }
  }

  if (actionKey === "blog") {
    const rep = ri(1, 3) + (st.writing > 55 ? 1 : 0);
    const net = ri(0, 2) + (st.comms > 55 ? 1 : 0);
    adjustAfterAction(state, { reputation: rep, network: net, mood: +1, stamina: -1 });
    log(state, t(state, "log.action.blog", { rep, net }));
  }

  if (actionKey === "learn") {
    const k = pick(["skill", "tooling", "writing", "comms"]);
    const inc = ri(1, 3);
    adjustAfterAction(state, { [k]: inc, stamina: -1, mood: -1 });
    log(state, t(state, "log.action.learn", { stat: t(state, `stat.${k}`), inc }));
  }

  if (actionKey === "rest") {
    // 休息更有效：让“本周大量休息/躺平还能苟住”
    const cap = healthCap(state);
    let sta = ri(Math.round(cap * 0.12), Math.round(cap * 0.20)); // 150 cap: 18~30
    let md = ri(Math.round(cap * 0.10), Math.round(cap * 0.16)); // 150 cap: 15~24
    if (hasItem(state, "gym_membership")) {
      sta = Math.round(sta * 1.15);
      md = Math.round(md * 1.15);
    }
    adjustAfterAction(state, { stamina: sta, mood: md });
    log(state, t(state, "log.action.rest", { sta, md }), "good");
  }

  if (actionKey === "compliance") {
    const down = ri(3, 7);
    adjustAfterAction(state, { compliance: -down, mood: -1 });
    log(state, t(state, "log.action.compliance", { down }));
  }

  // 公司任务推进（需要选中 company ticket）
  if (actionKey === "companyWork") {
    if (!target || target.kind !== "company") {
      toast?.(t(state, "msg.company.needTarget"));
      gainAP(state, cost);
      return;
    }
    if (!state.employment?.employed) {
      toast?.(t(state, "msg.company.needEmployment"));
      gainAP(state, cost);
      return;
    }
    const inc = clamp(Math.round(12 + st.comms / 15 + st.writing / 18), 8, 22);
    target.progress = clamp((target.progress || 0) + inc, 0, 100);

    const mode = state.employment.vanityKpi?.mode || "none";
    let perf = 1;
    let trust = 0;
    let postureGain = 0;
    if (mode === "loc") {
      perf = 2;
    } else if (mode === "refactor") {
      perf = 2;
      trust = 1;
    } else {
      perf = 1;
      postureGain = 1;
    }
    state.employment.performance = clamp((state.employment.performance || 50) + perf, 0, 100);
    state.employment.trust = clamp((state.employment.trust || 50) + trust, 0, 100);
    if (postureGain) state.posture.tests = clamp((state.posture.tests || 10) + postureGain, 0, 100);
    adjustAfterAction(state, { stamina: -2, mood: -1 });
    log(state, t(state, "log.action.company.progress", { title: target.title, inc }), "info");
    if (target.progress >= 100) {
      log(state, t(state, "log.action.company.done", { title: target.title, perf }), "good");
      state.active.company = (state.active.company || []).filter((x) => x.id !== target.id);
      state.employment.politics = clamp((state.employment.politics || 20) - 2, 0, 100);
    }
  }

  if (actionKey === "meeting") {
    if (!state.employment?.employed) {
      toast?.(t(state, "msg.meeting.needEmployment"));
      gainAP(state, cost);
      return;
    }
    state.employment.trust = clamp((state.employment.trust || 50) + 1, 0, 100);
    state.employment.performance = clamp((state.employment.performance || 50) + 1, 0, 100);
    state.posture.runbooks = clamp((state.posture.runbooks || 10) + 1, 0, 100);
    adjustAfterAction(state, { mood: -1, stamina: -1 });
    log(state, t(state, "log.action.meeting"), "info");
  }

  if (actionKey === "aiResearch") {
    const inc = clamp(Math.round(12 + st.writing / 12), 8, 20);
    state.research.progress.aiAudit = clamp((state.research.progress.aiAudit || 0) + inc, 0, 100);
    state.stats.brand = clamp((state.stats.brand || 0) + 2, 0, 100);
    adjustAfterAction(state, { stamina: -1, mood: -1 });

    if (state.employment?.employed && state.employment.companyType === "exchange") {
      state.employment.performance = clamp((state.employment.performance || 50) - 1, 0, 100);
      state.employment.politics = clamp((state.employment.politics || 20) + 2, 0, 100);
      log(state, t(state, "log.action.aiResearch.warn", { inc }), "warn");
    } else {
      log(state, t(state, "log.action.aiResearch.good", { inc }), "good");
    }

    if (state.research.progress.aiAudit >= 80 && (state.research.published.aiAudit || 0) < 1) {
      state.research.published.aiAudit = (state.research.published.aiAudit || 0) + 1;
      addCustomXPost(state, {
        author: `${state.player.name} @you`,
        text: "我做了个 AI 审计小实验：能抓到一些常见模式，但离“替代人类审计”还差得远。重点是：怎么把它接进流程。",
      });
      state.stats.reputation = clamp((state.stats.reputation || 0) + 2, 0, 100);
      log(state, `你发布了 AI 审计研究小结：外部反响不错（声望+2，名声+2）。`, "good");
    }
  }

  if (actionKey === "productizeAI") {
    const inc = clamp(Math.round(10 + st.tooling / 10), 8, 18);
    state.research.internalAdoption.aiAudit = clamp((state.research.internalAdoption.aiAudit || 0) + inc, 0, 100);
    state.posture.monitoring = clamp((state.posture.monitoring || 10) + 1, 0, 100);
    if (state.employment?.employed) {
      state.employment.performance = clamp((state.employment.performance || 50) + 2, 0, 100);
      state.employment.trust = clamp((state.employment.trust || 50) + 1, 0, 100);
    }
    adjustAfterAction(state, { stamina: -2, mood: -1 });
    log(state, `你把 AI 审计研究做成了“流程里的小工具”（内部采用度+${inc}%）。`, "good");
  }

  if (actionKey === "incidentAnalysis" || actionKey === "fundTrace" || actionKey === "writeBrief" || actionKey === "postX") {
    const mi = state.majorIncident;
    if (!mi || !mi.active) {
      toast?.("当前没有重大安全事件。");
      gainAP(state, cost);
      return;
    }
    const p = mi.progress || (mi.progress = { analysis: 0, tracing: 0, writeup: 0, xThread: 0 });
    if (actionKey === "incidentAnalysis") {
      p.analysis = clamp(p.analysis + ri(18, 30), 0, 100);
      adjustAfterAction(state, { stamina: -1, mood: -1 });
      log(state, `你在做事件分析：还原攻击路径（分析 ${p.analysis}%）。`, "info");
    }
    if (actionKey === "fundTrace") {
      p.tracing = clamp(p.tracing + ri(15, 28), 0, 100);
      adjustAfterAction(state, { stamina: -1, mood: -1 });
      log(state, `你在追踪资金：地址标注与流向整理（追踪 ${p.tracing}%）。`, "info");
    }
    if (actionKey === "writeBrief") {
      p.writeup = clamp(p.writeup + ri(16, 30) + Math.round(st.writing / 25), 0, 100);
      adjustAfterAction(state, { stamina: -1, mood: -1 });
      log(state, `你在写简报：把影响面与时间线写清楚（简报 ${p.writeup}%）。`, "info");
    }
    if (actionKey === "postX") {
      const quality = p.analysis + p.writeup + Math.round(p.tracing / 2);
      const early = quality < 120;
      if (early) {
        state.stats.reputation = clamp(state.stats.reputation - 2, 0, 100);
        state.stats.brand = clamp(state.stats.brand - 1, 0, 100);
        if (state.employment?.employed) {
          state.employment.trust = clamp((state.employment.trust || 50) - 3, 0, 100);
          state.employment.performance = clamp((state.employment.performance || 50) - 2, 0, 100);
        }
        addCustomXPost(state, { author: `${state.player.name} @you`, text: `（翻车）我太早发了对《${mi.title}》的判断，后续信息打脸。以后先写完再发。` });
        log(state, `你太早发 thread：被打脸（声望-2，名声-1）。`, "bad");
        // 一旦发出就算“结算”：避免刷帖反复薅/反复扣
        state.majorIncident = null;
        state.world.majorIncidentCooldown = ri(6, 14);
      } else {
        const offset = 2 - mi.weeksLeft; // 越早越小
        const repGain = offset <= 0 ? ri(3, 6) : ri(1, 4);
        const brandGain = offset <= 0 ? ri(3, 6) : ri(1, 4);
        state.stats.reputation = clamp(state.stats.reputation + repGain, 0, 100);
        state.stats.brand = clamp(state.stats.brand + brandGain, 0, 100);
        if (state.employment?.employed) {
          state.employment.performance = clamp((state.employment.performance || 50) + ri(1, 3), 0, 100);
          state.employment.trust = clamp((state.employment.trust || 50) + ri(0, 2), 0, 100);
        }
        addCustomXPost(state, { author: `${state.player.name} @you`, text: `《${mi.title}》简报：时间线/影响面/缓解建议（窗口剩余 ${mi.weeksLeft} 周）。` });
        log(state, `你发布了重大事件 thread：外部反响不错（声望+${repGain}，名声+${brandGain}）。`, "good");
        state.majorIncident = null;
        state.world.majorIncidentCooldown = ri(8, 18);
      }
      p.xThread = 100;
    }
  }

  // 工时锁定：由 UI 根据 ap.now<ap.max 判定（避免状态不同步）
  refreshAP(state);
}

export function deliverDirect(state, p) {
  const st = state.stats;
  const reportScore = clamp(p.report?.draft ?? 0, 0, 100);
  const foundPts = (p.found || []).reduce((a, x) => a + (x.points || 0), 0);
  const coverage = clamp(p.coverage ?? 0, 0, 100);

  const fixRate = clamp(p.fixRate ?? 50, 0, 100);
  const shipUrgency = clamp(p.shipUrgency ?? 50, 0, 100);
  const retestScore = clamp(p.retestScore ?? 0, 0, 100);

  let quality = 0.35 * coverage + 0.35 * reportScore + 0.2 * Math.min(100, foundPts * 2) + 0.1 * retestScore;
  quality = clamp(quality, 0, 100);
  const risk = clamp(shipUrgency * 0.55 + (100 - fixRate) * 0.45 - retestScore * 0.4, 0, 100);

  const depositPct = clamp(p.depositPct ?? 0.2, 0.1, 0.5);
  let payout = Math.round(p.fee * (1 - depositPct));
  payout = Math.round(payout * (0.85 + quality / 200));
  state.stats.cash += payout;
  if (!state.progress) state.progress = { noOrderWeeks: 0, totalWeeks: 0, earnedTotal: 0, findingsTotal: 0 };
  state.progress.earnedTotal = (state.progress.earnedTotal || 0) + Math.max(0, payout);

  const repDelta = Math.round(quality / 25 - risk / 30 - (reportScore < 60 ? 1 : 0));
  state.stats.reputation = clamp(state.stats.reputation + repDelta, 0, 100);

  log(
    state,
    t(state, "log.direct.delivered", {
      title: p.title,
      report: reportScore,
      coverage,
      quality: Math.round(quality),
      payout: fmtCash(state, payout),
      repDelta: `${repDelta >= 0 ? "+" : ""}${repDelta}`,
    }),
    repDelta >= 2 ? "good" : repDelta < 0 ? "warn" : "info"
  );

  // 翻车挂起：高风险 + 低复测更容易出事
  if (risk > 70 && retestScore < 40 && Math.random() < 0.35) {
    state.stats.reputation = clamp(state.stats.reputation - ri(2, 6), 0, 100);
    state.stats.compliance = clamp(state.stats.compliance + ri(2, 6), 0, 100);
    log(state, t(state, "log.direct.postShipIssue", { title: p.title }), "bad");
  }

  return { payout, repDelta, quality, risk };
}

export function finishContest(state, c) {
  const st = state.stats;
  const submitted = c.submissions.filter((x) => x.status === "submitted" || x.status === "accepted" || x.status === "duplicated" || x.status === "rejected");
  const evidence = clamp(c.evidence ?? 0, 0, 100);

  // 评审：提交才会进池子；evidence 越高，通过率更高
  let acceptedPts = 0;
  let acceptedN = 0;
  let duplicated = 0;
  let rejected = 0;
  for (const s of submitted) {
    const baseAcc = 0.35 + (evidence / 100) * 0.35 + (st.writing / 100) * 0.15;
    const popPenalty = (c.popularity || 50) / 200; // 热度越高越卷
    const acc = clamp(baseAcc - popPenalty, 0.05, 0.85);
    const dup = clamp(0.12 + (c.popularity || 50) / 180, 0.05, 0.6);
    const roll = Math.random();
    if (roll < acc) {
      if (Math.random() < dup) {
        s.status = "duplicated";
        duplicated += 1;
      } else {
        s.status = "accepted";
        acceptedN += 1;
        acceptedPts += s.points || 0;
      }
    } else {
      s.status = "rejected";
      rejected += 1;
    }
  }

  const score = acceptedPts + Math.round(evidence / 10);
  // 让“整场 finding 总量”不会比玩家离谱太多：用玩家 score 上限约束对手强度
  let fieldScore = Math.round(rnd(35, 120) + (c.popularity || 50) * 0.7 + (c.totalFindingsHint || 12) * 2);
  fieldScore = Math.min(fieldScore, score * 2.2 + 110);
  // share：基础按你贡献/证据算，再叠加“dup 多=>少拿”“solo 多=>多拿”
  const baseShare = acceptedPts > 0 ? score / (score + fieldScore) : 0;
  const share = acceptedPts > 0 ? clamp(baseShare, 0.03, 0.55) : 0;
  const dupRatio = duplicated / Math.max(1, submitted.length);
  const dupPenalty = clamp(1 - dupRatio * 0.85, 0.35, 1);
  const soloBonus = clamp(1 + acceptedN * 0.06 + Math.max(0, acceptedPts - 6) * 0.015, 1, 1.9);
  let payout = Math.round((c.prizePool || 0) * share * dupPenalty * soloBonus);
  payout = clamp(payout, 0, Math.round((c.prizePool || 0) * 0.65));
  state.stats.cash += payout;
  if (!state.progress) state.progress = { noOrderWeeks: 0, totalWeeks: 0, earnedTotal: 0, findingsTotal: 0 };
  state.progress.earnedTotal = (state.progress.earnedTotal || 0) + Math.max(0, payout);

  let ratingDelta = 0;
  if (submitted.length > 0) ratingDelta = Math.round(2 + acceptedPts / 6 - duplicated / 2 - rejected / 3);
  state.stats.platformRating = clamp(state.stats.platformRating + ratingDelta, 0, 100);

  const repDelta = acceptedPts > 0 ? Math.round(acceptedPts / 6 - rejected / 2) : 0;
  state.stats.reputation = clamp(state.stats.reputation + repDelta, 0, 100);

  const tone = acceptedPts >= 10 ? "good" : acceptedPts === 0 ? "bad" : "info";
  const note = submitted.length === 0 ? t(state, "log.contest.noSubmitNote") : "";
  log(
    state,
    t(state, "log.contest.settled", {
      title: c.title,
      submitted: submitted.length,
      acceptedPts,
      duplicated,
      rejected,
      payout: fmtCash(state, payout),
      ratingDelta: `${ratingDelta >= 0 ? "+" : ""}${ratingDelta}`,
      note,
    }),
    tone
  );

  return { payout, acceptedPts, duplicated, rejected, ratingDelta, repDelta };
}

export function settleProjects(state) {
  // 直客
  for (const p of [...state.active.direct]) {
    p.deadlineWeeks -= 1;
    if (p.deadlineWeeks <= 0 && !p.report.delivered) {
      const reportScore = clamp(p.report?.draft ?? 0, 0, 100);
      if (reportScore < 50) {
        p.deadlineWeeks = 1;
        adjustAfterAction(state, { mood: -2 });
        log(state, t(state, "log.direct.delayedNeedReport", { title: p.title, report: reportScore }), "warn");
        continue;
      }
      deliverDirect(state, p);
      p.report.delivered = true;
      p.stage = "done";
      state.active.direct = state.active.direct.filter((x) => x.id !== p.id);
    }
  }

  // 平台
  for (const c of [...state.active.platform]) {
    c.deadlineWeeks -= 1;
    if (c.deadlineWeeks <= 0) {
      finishContest(state, c);
      c.stage = "done";
      state.active.platform = state.active.platform.filter((x) => x.id !== c.id);
    }
  }

  // 公司任务（deadline miss 的“现实代价”）
  for (const tk of [...(state.active.company || [])]) {
    tk.deadlineWeeks -= 1;
    if (tk.deadlineWeeks <= 0 && (tk.progress || 0) < 100) {
      if (state.employment?.employed) {
        state.employment.performance = clamp((state.employment.performance || 50) - 3, 0, 100);
        state.employment.trust = clamp((state.employment.trust || 50) - 2, 0, 100);
        state.employment.politics = clamp((state.employment.politics || 20) + 4, 0, 100);
      }
      adjustAfterAction(state, { mood: -2 });
      log(state, t(state, "log.companyTicket.missedDeadline", { title: tk.title }), "warn");
      tk.deadlineWeeks = 1; // 给 1 周缓冲
    }
  }
}

